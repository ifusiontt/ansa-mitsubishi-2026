#!/usr/bin/env python3
"""
optimize-raw-images.py — optimize raw image assets for Directus CMS upload.

Walks the source tree (default: <project>/content-raw), processes images,
and mirrors the exact directory structure into <source>/optimized/.

Rules
-----
TIFF (.tif / .tiff):
    -> .webp (quality 82)  AND  .jpg (quality 85)
    -> max width 2560px (aspect ratio preserved)
    -> EXIF stripped (orientation baked in first)
JPEG (.jpg / .jpeg):
    -> resize to 2560px wide if wider
    -> re-encode JPEG quality 82 (EXIF stripped, progressive, optimized)
    -> matching .webp copy (quality 82) for Directus media
PNG (.png):
    -> resize to 2560px wide if wider, save optimized .png
    -> matching .webp copy (quality 82, alpha preserved)
Other files (PSD, PDF, PPTX, XLSX, MP4, MOV, SVG, ...):
    -> copied as-is (passthrough) so the mirror is complete
Symlinks:
    -> recreated as symlinks with the same target
Idempotency:
    -> existing non-empty output files are skipped (safe re-runs)

Usage:  python3 scripts/optimize-raw-images.py [source_dir]
"""

import os
import sys
import time
import shutil
from pathlib import Path

from PIL import Image, ImageOps

# ----------------------------- configuration ------------------------------
PROJECT_ROOT = Path(__file__).resolve().parent.parent
SOURCE = Path(sys.argv[1]) if len(sys.argv) > 1 else PROJECT_ROOT / "content-raw"
OUTPUT = SOURCE / "optimized"
REPORT = PROJECT_ROOT / "optimization-report.txt"
REPORT_NAME = "optimization-report.txt"  # generated artifact — never mirror it

MAX_WIDTH = 2560
JPEG_QUALITY = 82          # re-encoded JPEGs (and JPEG copies of JPEG/PNG)
TIFF_JPEG_QUALITY = 85     # high-quality JPEG derived from TIFF masters
WEBP_QUALITY = 82
WEBP_METHOD = 4            # 0..6 — 4 is a good speed/size balance

TIFF_EXTS = {".tif", ".tiff"}
JPEG_EXTS = {".jpg", ".jpeg"}
PNG_EXTS = {".png"}


def human(n: float) -> str:
    """Format bytes as human-readable string (B/KB/MB/GB/TB)."""
    for unit in ("B", "KB", "MB", "GB", "TB"):
        if abs(n) < 1024 or unit == "TB":
            return f"{n:,.0f} {unit}" if unit == "B" else f"{n:,.2f} {unit}"
        n /= 1024
    return f"{n:,.2f} TB"


def prep(im: Image.Image) -> Image.Image:
    """Bake in EXIF orientation, then cap width at MAX_WIDTH (LANCZOS)."""
    im = ImageOps.exif_transpose(im)  # no-op without orientation tag
    if im.width > MAX_WIDTH:
        ratio = MAX_WIDTH / im.width
        new_h = max(1, round(im.height * ratio))
        im = im.resize((MAX_WIDTH, new_h), Image.LANCZOS)
    return im


def to_jpeg_mode(im: Image.Image) -> Image.Image:
    """JPEG needs no alpha — composite RGBA over white if needed."""
    if im.mode in ("RGBA", "LA", "PA"):
        bg = Image.new("RGB", im.size, (255, 255, 255))
        rgba = im.convert("RGBA")
        bg.paste(rgba, mask=rgba.getchannel("A"))
        return bg
    if im.mode != "RGB":
        return im.convert("RGB")
    return im


def to_webp_mode(im: Image.Image) -> Image.Image:
    """WebP handles RGB/RGBA/L; normalize anything else."""
    if im.mode in ("RGB", "RGBA", "L"):
        return im
    if im.mode == "P":
        return im.convert("RGBA" if "transparency" in im.info else "RGB")
    if im.mode == "LA":
        return im.convert("RGBA")
    return im.convert("RGB" if im.mode == "CMYK" else im.mode)


def save_jpeg(im: Image.Image, path: Path, quality: int) -> None:
    im.save(path, "JPEG", quality=quality, optimize=True,
            progressive=True, subsampling=2)


def save_webp(im: Image.Image, path: Path, quality: int) -> None:
    im.save(path, "WEBP", quality=quality, method=WEBP_METHOD)


def save_png(im: Image.Image, path: Path) -> None:
    im.save(path, "PNG", optimize=True)


def ensure_out(rel: Path, src: Path) -> Path:
    """Mirror the directory structure under OUTPUT; create dirs as needed."""
    out_file = OUTPUT / rel
    out_file.parent.mkdir(parents=True, exist_ok=True)
    return out_file


def already_done(out_file: Path) -> bool:
    return out_file.exists() and out_file.stat().st_size > 0


def main() -> int:
    t0 = time.time()
    if not SOURCE.is_dir():
        print(f"ERROR: source directory not found: {SOURCE}")
        return 1
    if OUTPUT.exists():
        print(f"NOTE: {OUTPUT} already exists — existing outputs will be skipped.")

    # Mirror the directory skeleton first (so empty dirs are replicated too)
    for dirpath, dirnames, _ in os.walk(SOURCE):
        dirnames[:] = [d for d in dirnames if d != "optimized"]
        rel_dir = Path(dirpath).relative_to(SOURCE)
        (OUTPUT / rel_dir).mkdir(parents=True, exist_ok=True)

    stats = {
        "input_files": 0,
        "input_bytes": 0,
        "output_files": 0,
        "output_bytes": 0,
        "resized": 0,
        "skipped": 0,
        "errors": [],
        "by_ext": {},          # ext -> [count, bytes_in, bytes_out]
        "by_kind": {           # kind -> [src_count, out_count, bytes_out]
            "tiff": [0, 0, 0],
            "jpeg": [0, 0, 0],
            "png": [0, 0, 0],
            "passthrough": [0, 0, 0],
        },
    }
    passthrough_exts = {}

    def out_bytes(path: Path) -> int:
        try:
            return path.stat().st_size
        except OSError:
            return 0

    def track(rel_ext: str, kind: str, src_size: int, out_paths, src_count=1):
        stats["by_ext"].setdefault(rel_ext, [0, 0, 0, 0])
        stats["by_ext"][rel_ext][0] += src_count
        stats["by_ext"][rel_ext][1] += src_size
        b = sum(out_bytes(p) for p in out_paths)
        stats["by_ext"][rel_ext][2] += b
        stats["by_ext"][rel_ext][3] += len(out_paths)
        stats["by_kind"][kind][0] += src_count
        stats["by_kind"][kind][1] += len(out_paths)
        stats["by_kind"][kind][2] += b

    # ------------------------------ walk ----------------------------------
    for dirpath, dirnames, filenames in os.walk(SOURCE):
        dirnames[:] = sorted(d for d in dirnames if d != "optimized")
        for name in sorted(filenames):
            if name == REPORT_NAME and dirpath == str(SOURCE):
                continue  # don't mirror the generated report into optimized/
            src = Path(dirpath) / name
            rel = src.relative_to(SOURCE)
            ext = src.suffix.lower()
            size = 0
            try:
                if src.is_symlink():
                    # mirror symlinks without following them
                    out_file = ensure_out(rel, src)
                    if not (out_file.is_symlink() or out_file.exists()):
                        target = os.readlink(src)
                        os.symlink(target, out_file)
                    stats["input_files"] += 1
                    continue
                size = src.stat().st_size
            except OSError as e:
                stats["errors"].append(f"{rel}: {e}")
                continue

            stats["input_files"] += 1
            stats["input_bytes"] += size
            outputs = []

            try:
                if ext in TIFF_EXTS:
                    kind = "tiff"
                    jpg_out = ensure_out(rel.with_suffix(".jpg"), src)
                    webp_out = ensure_out(rel.with_suffix(".webp"), src)
                    outputs = [jpg_out, webp_out]
                    did_work = not all(already_done(p) for p in outputs)
                    with Image.open(src) as raw:  # lazy: header only
                        if raw.width > MAX_WIDTH:
                            stats["resized"] += 1
                        if did_work:
                            im = prep(raw)  # decodes + resizes only when needed
                            if not already_done(jpg_out):
                                save_jpeg(to_jpeg_mode(im), jpg_out, TIFF_JPEG_QUALITY)
                            if not already_done(webp_out):
                                save_webp(to_webp_mode(im), webp_out, WEBP_QUALITY)
                    if did_work:
                        print(f"[tiff ] {rel}  {human(size)} -> "
                              f"{jpg_out.name} {human(out_bytes(jpg_out))} + "
                              f"{webp_out.name} {human(out_bytes(webp_out))}")
                    else:
                        print(f"[skip ] {rel}  {human(size)} (outputs exist)")

                elif ext in JPEG_EXTS:
                    kind = "jpeg"
                    jpg_out = ensure_out(rel, src)
                    webp_out = ensure_out(rel.with_suffix(".webp"), src)
                    outputs = [jpg_out, webp_out]
                    did_work = not all(already_done(p) for p in outputs)
                    with Image.open(src) as raw:  # lazy: header only
                        if raw.width > MAX_WIDTH:
                            stats["resized"] += 1
                        if did_work:
                            im = prep(raw)
                            if not already_done(jpg_out):
                                save_jpeg(to_jpeg_mode(im), jpg_out, JPEG_QUALITY)
                            if not already_done(webp_out):
                                save_webp(to_webp_mode(im), webp_out, WEBP_QUALITY)
                    if did_work:
                        print(f"[jpeg ] {rel}  {human(size)} -> "
                              f"{jpg_out.name} {human(out_bytes(jpg_out))} + "
                              f"{webp_out.name} {human(out_bytes(webp_out))}")
                    else:
                        print(f"[skip ] {rel}  {human(size)} (outputs exist)")

                elif ext in PNG_EXTS:
                    kind = "png"
                    png_out = ensure_out(rel, src)
                    webp_out = ensure_out(rel.with_suffix(".webp"), src)
                    outputs = [png_out, webp_out]
                    did_work = not all(already_done(p) for p in outputs)
                    with Image.open(src) as raw:  # lazy: header only
                        if raw.width > MAX_WIDTH:
                            stats["resized"] += 1
                        if did_work:
                            im = prep(raw)
                            if not already_done(png_out):
                                save_png(im if im.mode in ("RGB", "RGBA", "L", "LA")
                                         else im.convert("RGBA"), png_out)
                            if not already_done(webp_out):
                                save_webp(to_webp_mode(im), webp_out, WEBP_QUALITY)
                    if did_work:
                        print(f"[png  ] {rel}  {human(size)} -> "
                              f"{png_out.name} {human(out_bytes(png_out))} + "
                              f"{webp_out.name} {human(out_bytes(webp_out))}")
                    else:
                        print(f"[skip ] {rel}  {human(size)} (outputs exist)")

                else:
                    # passthrough: keep the mirror complete
                    kind = "passthrough"
                    out_file = ensure_out(rel, src)
                    if not already_done(out_file):
                        shutil.copy2(src, out_file)
                    outputs = [out_file]
                    passthrough_exts[ext or "(none)"] = \
                        passthrough_exts.get(ext or "(none)", 0) + 1
                    print(f"[copy ] {rel}  {human(size)} (passthrough)")

                for p in outputs:
                    if p.exists() and p.stat().st_size > 0:
                        stats["output_files"] += 1
                        stats["output_bytes"] += p.stat().st_size
                    else:
                        stats["skipped"] += 1
                track(ext, kind, size, outputs)

            except Exception as e:
                stats["errors"].append(f"{rel}: {type(e).__name__}: {e}")
                print(f"[ERR  ] {rel}: {type(e).__name__}: {e}")

    # --------------------------- summary report ----------------------------
    img_kinds = ("tiff", "jpeg", "png")
    img_in_files = sum(stats["by_kind"][k][0] for k in img_kinds)
    img_in_bytes = sum(v[1] for k, v in stats["by_ext"].items()
                       if k in TIFF_EXTS | JPEG_EXTS | PNG_EXTS)
    img_out_bytes = sum(stats["by_kind"][k][2] for k in img_kinds)
    pt_bytes = stats["by_kind"]["passthrough"][2]
    saved = stats["input_bytes"] - stats["output_bytes"]
    pct = (saved / stats["input_bytes"] * 100) if stats["input_bytes"] else 0.0
    img_saved_pct = ((img_in_bytes - img_out_bytes) / img_in_bytes * 100
                     if img_in_bytes else 0.0)
    elapsed = time.time() - t0

    L = []
    L.append("=" * 72)
    L.append("IMAGE OPTIMIZATION REPORT")
    L.append("=" * 72)
    L.append(f"Source root : {SOURCE}")
    L.append(f"Output root : {OUTPUT}")
    L.append(f"Max width   : {MAX_WIDTH}px (aspect ratio preserved)")
    L.append(f"Quality     : JPEG {JPEG_QUALITY} (TIFF->JPEG {TIFF_JPEG_QUALITY}), "
             f"WebP {WEBP_QUALITY} (method {WEBP_METHOD})")
    L.append(f"Metadata    : EXIF/XMP stripped, EXIF orientation baked in")
    L.append("")
    L.append(f"Input files (source)     : {stats['input_files']:,}  "
             f"({human(stats['input_bytes'])})")
    L.append(f"Output files (optimized) : {stats['output_files']:,}  "
             f"({human(stats['output_bytes'])})")
    L.append(f"Resized to {MAX_WIDTH}px wide   : {stats['resized']}")
    L.append(f"Errors / skipped-out     : {len(stats['errors'])} / {stats['skipped']}")
    L.append(f"Elapsed                  : {elapsed / 60:.1f} min")
    L.append("")
    L.append("Per source format:")
    L.append(f"  {'ext':<8} {'in files':>9} {'in size':>12} {'out files':>10} "
             f"{'out size':>12}")
    for ext in sorted(stats["by_ext"], key=lambda e: -stats["by_ext"][e][1]):
        c, bi, bo, oc = stats["by_ext"][ext]
        L.append(f"  {('.' + ext.lstrip('.')):<8} {c:>9,} {human(bi):>12} "
                 f"{oc:>10,} {human(bo):>12}")
    L.append("")
    L.append("By processing kind:")
    for kind in img_kinds + ("passthrough",):
        c, oc, bo = stats["by_kind"][kind]
        L.append(f"  {kind:<12} {c:>5} src -> {oc:>5} out files  "
                 f"({human(bo)})")
    if passthrough_exts:
        L.append("  passthrough exts: " +
                 ", ".join(f"{e}x{c}" for e, c in sorted(passthrough_exts.items())))
    L.append("")
    L.append("-" * 72)
    L.append(f"ORIGINAL  total : {human(stats['input_bytes'])}")
    L.append(f"OPTIMIZED total : {human(stats['output_bytes'])}")
    L.append(f"SPACE SAVED     : {human(saved)}  ({pct:.1f}%)")
    L.append("")
    L.append(f"Images only:  {human(img_in_bytes)} -> {human(img_out_bytes)}  "
             f"(saved {img_saved_pct:.1f}%)")
    L.append(f"Non-image passthrough: {human(pt_bytes)} (unchanged)")
    if stats["errors"]:
        L.append("")
        L.append("ERRORS:")
        L.extend(f"  - {e}" for e in stats["errors"])
    report = "\n".join(L)
    print("\n" + report)
    REPORT.write_text(report + "\n")
    print(f"\nReport written to: {REPORT}")
    return 1 if stats["errors"] else 0


if __name__ == "__main__":
    sys.exit(main())

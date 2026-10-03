#!/usr/bin/env python3
"""
clean-color-images.py

Removes the red "PSD layer" warning banner baked into the top strip of the
Triton / Xpander Cross press renders.

Per file (.jpg / .jpeg / .webp, recursively under the two vehicle roots):
  1. DETECT — sample the top 12% of the canvas; a banner is flagged when
     > RED_FRACTION_THRESHOLD of sampled pixels are strongly red-dominant
     (calibrated on this asset set: banners measure ~0.24, clean images ~0.00).
  2. FILL   — paint the full top 12% strip solid #FFFFFF and re-encode the
     file IN PLACE, preserving the original filename and format
     (JPEG in -> JPEG out, WebP in -> WebP out).
  3. Files with no banner are left untouched (byte-identical).

Idempotent: a second run finds 0 banners (the strip is now white).

Usage:
    python3 directus/seeds/clean-color-images.py [--dry-run]
"""

import os
import sys
import tempfile
from PIL import Image

# ---------------------------------------------------------------- constants

BASE = "/home/ifusion/development/Mitsubishi_Ansa_Mitsubishi_2026"
ROOTS = [
    os.path.join(BASE, "content-raw/optimized/02_Showroom_Models/Triton"),
    os.path.join(BASE, "content-raw/optimized/02_Showroom_Models/Xpander_Cross"),
]
EXTS = (".jpg", ".jpeg", ".webp")

BANNER_FRACTION = 0.12          # top 12% of canvas height
RED_FRACTION_THRESHOLD = 0.05   # >5% red-dominant pixels => banner present
SAMPLE_CAP = 20000              # max pixels sampled per region
WHITE = (255, 255, 255)
JPEG_QUALITY = 90
WEBP_QUALITY = 90


# ---------------------------------------------------------------- helpers

def is_banner(img: Image.Image) -> float:
    """Return the fraction of red-dominant pixels in the top strip."""
    w, h = img.size
    top = max(1, int(h * BANNER_FRACTION))
    region = img.crop((0, 0, w, top))
    px = region.load()
    step = max(1, (w * top) // SAMPLE_CAP)
    red = tot = 0
    for y in range(0, top, step):
        for x in range(0, w, step):
            r, g, b = px[x, y][:3]
            tot += 1
            if r > 120 and r - max(g, b) > 50:
                red += 1
    return red / max(tot, 1)


def save_in_place(img: Image.Image, path: str, fmt: str) -> None:
    """Re-encode to a temp file, then atomically replace the original."""
    ext = os.path.splitext(path)[1].lower()
    dirname = os.path.dirname(path)
    fd, tmp = tempfile.mkstemp(suffix=ext, dir=dirname)
    os.close(fd)
    try:
        save_kwargs = {}
        if fmt in ("JPEG",):
            # JPEG cannot store alpha; banner strip is opaque anyway.
            if img.mode not in ("RGB", "L"):
                img = img.convert("RGB")
            save_kwargs = {"quality": JPEG_QUALITY, "optimize": True}
            if img.info.get("icc_profile"):
                save_kwargs["icc_profile"] = img.info["icc_profile"]
        elif fmt == "WEBP":
            save_kwargs = {"quality": WEBP_QUALITY, "method": 4}
        img.save(tmp, format=fmt, **save_kwargs)
        os.replace(tmp, path)  # atomic on the same filesystem
    except BaseException:
        if os.path.exists(tmp):
            os.unlink(tmp)
        raise


# ---------------------------------------------------------------- main

def main() -> int:
    dry_run = "--dry-run" in sys.argv[1:]
    fmt_map = {".jpg": "JPEG", ".jpeg": "JPEG", ".webp": "WEBP"}

    files = []
    for root in ROOTS:
        if not os.path.isdir(root):
            print(f"ERROR: root not found: {root}", file=sys.stderr)
            return 1
        for dirpath, _dirs, filenames in os.walk(root):
            for fn in sorted(filenames):
                if fn.lower().endswith(EXTS):
                    files.append(os.path.join(dirpath, fn))
    files.sort()

    filled = skipped = errors = 0
    for path in files:
        rel = os.path.relpath(path, BASE)
        ext = os.path.splitext(path)[1].lower()
        fmt = fmt_map[ext]
        try:
            with Image.open(path) as im:
                im.load()
                if im.mode not in ("RGB", "RGBA"):
                    im = im.convert("RGB")
                frac = is_banner(im)
                if frac < RED_FRACTION_THRESHOLD:
                    skipped += 1
                    print(f"  clean  ({frac:.3f})  {rel}")
                    continue
                w, h = im.size
                top = max(1, int(h * BANNER_FRACTION))
                if dry_run:
                    filled += 1
                    print(f"  WOULD  ({frac:.3f})  {rel}  -> fill top {top}px")
                    continue
                im.paste(WHITE, (0, 0, w, top))
                save_in_place(im, path, fmt)
                filled += 1
                print(f"  filled ({frac:.3f})  {rel}  (top {top}px of {h})")
        except Exception as exc:  # keep going; report at the end
            errors += 1
            print(f"  ERROR  {rel}: {exc}", file=sys.stderr)

    verb = "would be filled" if dry_run else "filled"
    print(
        f"\nDone ({'DRY RUN' if dry_run else 'applied'}): "
        f"{len(files)} files scanned, {filled} {verb}, "
        f"{skipped} clean/untouched, {errors} errors"
    )
    return 1 if errors else 0


if __name__ == "__main__":
    sys.exit(main())

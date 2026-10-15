#!/usr/bin/env python3
"""
normalize-render-canvas.py — place transparent vehicle renders on the shared studio canvas.

The colour configurator stage (VehicleColorStage.vue) contains each render by its whole
canvas, so renders must share one framing to appear at matching proportions. The
Outlander Sport and Triton press renders use a 4000x2800 studio canvas with the car
~2770px wide, horizontally centred, wheels on a ground line ~2080px down. Renders exported
tight to the car (e.g. the Xpander Cross set, 1920x966) are padded onto that canvas here.

Padding only — the render is scaled to the car width and placed, never cropped, so the
camera perspective and ground plane are untouched.

Rules
-----
- every *.webp in <src_dir> must carry alpha (RGBA); its non-transparent bounding box is
  scaled to CAR_WIDTH and centred on the canvas, its bottom edge on GROUND_Y
- output: real WebP with alpha (quality 90), same filename, in <dst_dir>
- source files are never modified

Usage:  python3 -I scripts/normalize-render-canvas.py <src_dir> <dst_dir>
"""

import sys
from pathlib import Path

from PIL import Image

CANVAS = (4000, 2800)
CAR_WIDTH = 2770  # Outlander 2776px, Triton 2763px
GROUND_Y = 2080  # Outlander wheels at 2117px, Triton at 2047px
QUALITY = 90


def normalize(src: Path, dst: Path) -> str:
    with Image.open(src) as im:
        if im.mode != "RGBA":
            raise SystemExit(f"{src.name}: expected an RGBA render, got {im.mode}")
        car = im.crop(im.getchannel("A").getbbox())
    scale = CAR_WIDTH / car.width
    car = car.resize((CAR_WIDTH, round(car.height * scale)), Image.LANCZOS)
    canvas = Image.new("RGBA", CANVAS, (0, 0, 0, 0))
    left = (CANVAS[0] - car.width) // 2
    top = GROUND_Y - car.height
    if top < 0:
        raise SystemExit(f"{src.name}: car taller than the space above the ground line")
    canvas.alpha_composite(car, (left, top))
    canvas.save(dst, "WEBP", quality=QUALITY, alpha_quality=100, method=6)
    return f"{src.name}: car {car.width}x{car.height} at +{left}+{top} on {CANVAS[0]}x{CANVAS[1]}"


def main() -> None:
    if len(sys.argv) != 3:
        raise SystemExit(__doc__)
    src_dir, dst_dir = Path(sys.argv[1]), Path(sys.argv[2])
    renders = sorted(src_dir.glob("*.webp"))
    if not renders:
        raise SystemExit(f"no .webp renders in {src_dir}")
    dst_dir.mkdir(parents=True, exist_ok=True)
    for src in renders:
        print(normalize(src, dst_dir / src.name))


if __name__ == "__main__":
    main()

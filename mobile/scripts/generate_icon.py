"""Generate Helios mobile app icons from the web SunMark silhouette.

Usage:
    uv run --with pillow python mobile/scripts/generate_icon.py

Outputs:
    mobile/assets/icon.png           (1024x1024, iOS main icon)
    mobile/assets/adaptive-icon.png  (1024x1024, Android adaptive foreground)

The silhouette is three concentric gold rings centered on a dark background,
with a solid gold center dot plus a radial glow layer. Matches the web
``SunMark`` component (web/components/Header.tsx) as a static raster.
"""

from __future__ import annotations

import math
from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter

SIZE = 1024
CENTER = SIZE // 2

# Palette (mirrors web @theme + mobile modeA/theme.ts).
BG_DEEP = (15, 15, 16, 255)          # #0f0f10
GOLD = (245, 215, 110)               # #f5d76e
GOLD_WARM = (255, 169, 64)           # #ffa940 for the glow gradient

# Geometry tuned so the silhouette lives inside iOS' ~10% safe inset.
OUTER_RADIUS = 400
OUTER_STROKE = 20
MIDDLE_RADIUS = 330
MIDDLE_STROKE = 10
CORE_RADIUS = 170
GLOW_RADIUS = 330  # radial glow reaches beyond the core but stays inside mid-ring


def _ring(draw: ImageDraw.ImageDraw, radius: int, stroke: int, color) -> None:
    """Stroke a full circle centered on the canvas."""
    bbox = (
        CENTER - radius,
        CENTER - radius,
        CENTER + radius,
        CENTER + radius,
    )
    draw.ellipse(bbox, outline=color, width=stroke)


def _dashed_ring(
    draw: ImageDraw.ImageDraw,
    radius: int,
    stroke: int,
    color,
    *,
    dashes: int = 48,
    duty: float = 0.55,
) -> None:
    """Stroke a dashed ring by drawing ``dashes`` short arcs.

    `duty` is the visible fraction of each dash segment (0 < duty < 1).
    """
    step = 360.0 / dashes
    half_duty = (step * duty) / 2.0
    bbox = (
        CENTER - radius,
        CENTER - radius,
        CENTER + radius,
        CENTER + radius,
    )
    for i in range(dashes):
        mid = i * step
        draw.arc(bbox, start=mid - half_duty, end=mid + half_duty, fill=color, width=stroke)


def _radial_glow() -> Image.Image:
    """Soft gold radial glow around the center, returned as an RGBA layer."""
    layer = Image.new("RGBA", (SIZE, SIZE), (0, 0, 0, 0))
    draw = ImageDraw.Draw(layer)
    steps = 48
    for i in range(steps, 0, -1):
        t = i / steps  # 1 -> outer edge, 0 -> center
        radius = int(GLOW_RADIUS * t)
        # Opacity stronger near the center; tinted warmer toward the core.
        alpha = int(120 * (1 - t) ** 2)
        if alpha <= 0:
            continue
        bbox = (
            CENTER - radius,
            CENTER - radius,
            CENTER + radius,
            CENTER + radius,
        )
        draw.ellipse(bbox, fill=(*GOLD_WARM, alpha))
    # Blur so the ring-stepping fades into a smooth gradient.
    return layer.filter(ImageFilter.GaussianBlur(radius=18))


def render_icon() -> Image.Image:
    base = Image.new("RGBA", (SIZE, SIZE), BG_DEEP)

    # 1. Radial glow, composited under the rings.
    base = Image.alpha_composite(base, _radial_glow())

    draw = ImageDraw.Draw(base)

    # 2. Outer dashed ring (~50% alpha).
    _dashed_ring(draw, OUTER_RADIUS, OUTER_STROKE, (*GOLD, 128))

    # 3. Middle thin solid ring (~35% alpha).
    _ring(draw, MIDDLE_RADIUS, MIDDLE_STROKE, (*GOLD, 90))

    # 4. Core solid dot with a second soft glow ring hugging its edge.
    core_halo = Image.new("RGBA", (SIZE, SIZE), (0, 0, 0, 0))
    halo_draw = ImageDraw.Draw(core_halo)
    halo_bbox = (
        CENTER - (CORE_RADIUS + 40),
        CENTER - (CORE_RADIUS + 40),
        CENTER + (CORE_RADIUS + 40),
        CENTER + (CORE_RADIUS + 40),
    )
    halo_draw.ellipse(halo_bbox, fill=(*GOLD, 80))
    core_halo = core_halo.filter(ImageFilter.GaussianBlur(radius=24))
    base = Image.alpha_composite(base, core_halo)

    core_layer = Image.new("RGBA", (SIZE, SIZE), (0, 0, 0, 0))
    core_draw = ImageDraw.Draw(core_layer)
    core_bbox = (
        CENTER - CORE_RADIUS,
        CENTER - CORE_RADIUS,
        CENTER + CORE_RADIUS,
        CENTER + CORE_RADIUS,
    )
    core_draw.ellipse(core_bbox, fill=(*GOLD, 255))
    base = Image.alpha_composite(base, core_layer)

    return base


def render_adaptive_foreground() -> Image.Image:
    """Android adaptive icon foreground layer.

    Android masks adaptive icons with a circle/squircle, so we keep the
    silhouette centered inside the inner 66% safe zone — simpler than the
    iOS version, rendered on a transparent bg.
    """
    layer = Image.new("RGBA", (SIZE, SIZE), (0, 0, 0, 0))
    layer = Image.alpha_composite(layer, _radial_glow())

    draw = ImageDraw.Draw(layer)
    scale = 0.75  # shrink so the silhouette fits the 66% safe zone with margin
    _dashed_ring(draw, int(OUTER_RADIUS * scale), OUTER_STROKE, (*GOLD, 128))
    _ring(draw, int(MIDDLE_RADIUS * scale), MIDDLE_STROKE, (*GOLD, 90))

    core_layer = Image.new("RGBA", (SIZE, SIZE), (0, 0, 0, 0))
    core_draw = ImageDraw.Draw(core_layer)
    core_r = int(CORE_RADIUS * scale)
    core_draw.ellipse(
        (CENTER - core_r, CENTER - core_r, CENTER + core_r, CENTER + core_r),
        fill=(*GOLD, 255),
    )
    return Image.alpha_composite(layer, core_layer)


def main() -> None:
    out_dir = Path(__file__).resolve().parent.parent / "assets"
    out_dir.mkdir(parents=True, exist_ok=True)

    icon_path = out_dir / "icon.png"
    adaptive_path = out_dir / "adaptive-icon.png"

    render_icon().save(icon_path, format="PNG")
    render_adaptive_foreground().save(adaptive_path, format="PNG")

    print(f"wrote {icon_path}")
    print(f"wrote {adaptive_path}")


if __name__ == "__main__":
    main()

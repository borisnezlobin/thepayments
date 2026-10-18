"""Rasterize The Payments logo from components/ui/logoGeometry.ts.

ImageMagick's SVG renderer drops the stroked arc of the T's hook, so the bars and
letters go through ImageMagick and the hook is drawn here with PIL.
"""
import re
import subprocess
import tempfile
from dataclasses import dataclass
from pathlib import Path

from PIL import Image, ImageDraw

REPO = Path(__file__).resolve().parents[3]
GEOMETRY_FILE = REPO / "components" / "ui" / "logoGeometry.ts"

VIEW_LEFT, VIEW_TOP, VIEW_WIDTH, VIEW_HEIGHT = -20, -737, 7937, 977
THE_LEFT_UNITS, THE_RIGHT_UNITS = 20, 2013
INK_LEFT_UNITS, INK_RIGHT_UNITS, CAP_HEIGHT_UNITS = 20, 7877, 647
FIRST_PAYMENTS_GLYPH_X = 2200
HOOK_STROKE_UNITS = 111
SUPERSAMPLE = 2

ACCENT_HEX = "#00bca8"
INK_HEX = "#000000"


@dataclass(frozen=True)
class LogoRaster:
    image: Image.Image
    units_to_pixels: float

    def point(self, x_units: float, y_units: float) -> tuple[float, float]:
        return ((x_units - VIEW_LEFT) * self.units_to_pixels, (-y_units - VIEW_TOP) * self.units_to_pixels)


def read_geometry() -> dict[str, str]:
    source = GEOMETRY_FILE.read_text()
    return {key: re.search(rf'{key}:\s*"([^"]+)"', source).group(1) for key in ("tBars", "letters")}


def split_subpaths(path: str) -> list[str]:
    return [part for part in re.split(r"(?=M)", path) if part.strip()]


def first_x(subpath: str) -> float:
    return float(re.match(r"M\s*(-?[\d.]+)", subpath).group(1))


def letters_for(letters: str, include_payments: bool) -> str:
    if include_payments:
        return letters
    return "".join(part for part in split_subpaths(letters) if first_x(part) < FIRST_PAYMENTS_GLYPH_X)


def build_svg(width: int, height: int, letters: str, bars: str) -> str:
    view_box = f"{VIEW_LEFT} {VIEW_TOP} {VIEW_WIDTH} {VIEW_HEIGHT}"
    return (
        f'<svg xmlns="http://www.w3.org/2000/svg" width="{width}" height="{height}" viewBox="{view_box}">'
        f'<g transform="scale(1 -1)"><path fill="{INK_HEX}" d="{letters}"/>'
        f'<path fill="{ACCENT_HEX}" d="{bars}"/></g></svg>'
    )


def rasterize(svg: str, size: tuple[int, int]) -> Image.Image:
    """ImageMagick reads the SVG's width as CSS pixels at 96 dpi, so render at 96 and snap to the exact size."""
    with tempfile.TemporaryDirectory() as folder:
        svg_path, png_path = Path(folder) / "logo.svg", Path(folder) / "logo.png"
        svg_path.write_text(svg)
        subprocess.run(["magick", "-background", "none", "-density", "96", str(svg_path), str(png_path)], check=True)
        image = Image.open(png_path).convert("RGBA")
        return image if image.size == size else image.resize(size, Image.Resampling.LANCZOS)


def draw_hook(raster: LogoRaster) -> None:
    """Fills the hook's stroke outline: a vertical bar, a quarter ring and a horizontal bar, all with butt ends."""
    half = HOOK_STROKE_UNITS / 2
    center_x, center_y, radius = 195, 400, 70
    mask = Image.new("L", raster.image.size, 0)
    draw = ImageDraw.Draw(mask)
    draw.rectangle([raster.point(125 - half, 556), raster.point(125 + half, center_y)], fill=255)
    draw.rectangle([raster.point(center_x, 330 + half), raster.point(315, 330 - half)], fill=255)
    outer, inner = radius + half, radius - half
    draw.pieslice([raster.point(center_x - outer, center_y + outer), raster.point(center_x + outer, center_y - outer)], 90, 180, fill=255)
    draw.pieslice([raster.point(center_x - inner, center_y + inner), raster.point(center_x + inner, center_y - inner)], 90, 180, fill=0)
    raster.image.paste(Image.new("RGBA", raster.image.size, ACCENT_HEX), mask=mask)


def render_logo(ink_width_px: float, include_payments: bool) -> LogoRaster:
    units_to_pixels = ink_width_px / (INK_RIGHT_UNITS - INK_LEFT_UNITS)
    big_scale = units_to_pixels * SUPERSAMPLE
    size = (round(VIEW_WIDTH * big_scale), round(VIEW_HEIGHT * big_scale))
    geometry = read_geometry()
    svg = build_svg(*size, letters_for(geometry["letters"], include_payments), geometry["tBars"])
    big = LogoRaster(rasterize(svg, size), big_scale)
    draw_hook(big)
    final_size = (round(size[0] / SUPERSAMPLE), round(size[1] / SUPERSAMPLE))
    return LogoRaster(big.image.resize(final_size, Image.Resampling.LANCZOS), units_to_pixels)

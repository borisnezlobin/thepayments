"""YouTube thumbnail: a wall of the montage's greyscale "The"s, with the logo on a ticket over it."""
import sys
from pathlib import Path

from PIL import Image, ImageEnhance

sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "the-montage" / "tools"))

import graphics  # noqa: E402
from logo import render_logo  # noqa: E402

DEMO = Path(__file__).resolve().parent.parent
PLATE_FRAMES = [0, 12, 20, 26, 32, 36, 40, 44, 48, 50, 52, 54, 56, 58, 60, 36]
THE_CROP = (102, 330, 742, 690)
SIZE = (1280, 720)
COLUMNS, ROWS = 4, 4


def plate_wall() -> Image.Image:
    tile_size = (SIZE[0] // COLUMNS, SIZE[1] // ROWS)
    wall = Image.new("RGB", SIZE)
    frames = DEMO / "the-montage" / "out" / "frames"
    for index, frame_number in enumerate(PLATE_FRAMES):
        plate = Image.open(frames / f"{frame_number:04d}.png").crop(THE_CROP).resize(tile_size, Image.Resampling.LANCZOS)
        wall.paste(plate, ((index % COLUMNS) * tile_size[0], (index // COLUMNS) * tile_size[1]))
    return ImageEnhance.Brightness(wall).enhance(0.62)


def main() -> None:
    thumbnail = plate_wall()
    ticket = graphics.Box(150, 215, 1130, 505)
    graphics.draw_shadowed_polygon(thumbnail, graphics.zigzag_polygon(ticket), graphics.SURFACE)
    logo = render_logo(860, include_payments=True)
    left = round((SIZE[0] - logo.image.width) / 2)
    top = round((ticket.top + ticket.bottom) / 2 - logo.point(0, 323)[1])
    thumbnail.paste(logo.image, (left, top), logo.image)
    thumbnail.save(DEMO / "edit" / "out" / "thumbnail.png", optimize=True)
    thumbnail.save(DEMO / "edit" / "out" / "thumbnail.jpg", quality=92)


if __name__ == "__main__":
    main()

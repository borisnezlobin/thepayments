"""Crop a source image and overlay a labelled pixel grid, for locating the word "The" by eye."""
import sys
from PIL import Image, ImageDraw, ImageFont

def nice_step(span: float) -> int:
    for step in (5, 10, 20, 25, 50, 100, 200, 250, 500, 1000):
        if span / step <= 12:
            return step
    return 2000

def draw_grid(path: str, box: tuple[int, int, int, int], out: str, width: int = 1100) -> None:
    image = Image.open(path).convert("RGB")
    x0, y0, x1, y1 = box
    crop = image.crop(box)
    scale = width / crop.width
    crop = crop.resize((width, round(crop.height * scale)))
    draw = ImageDraw.Draw(crop)
    font = ImageFont.load_default(size=14)
    step = nice_step(max(x1 - x0, y1 - y0))
    for x in range((x0 // step + 1) * step, x1, step):
        px = (x - x0) * scale
        draw.line([(px, 0), (px, crop.height)], fill=(255, 0, 90), width=1)
        draw.text((px + 2, 2), str(x), fill=(255, 0, 90), font=font)
    for y in range((y0 // step + 1) * step, y1, step):
        py = (y - y0) * scale
        draw.line([(0, py), (crop.width, py)], fill=(0, 140, 255), width=1)
        draw.text((2, py + 2), str(y), fill=(0, 140, 255), font=font)
    crop.save(out, quality=90)

if __name__ == "__main__":
    source, x0, y0, x1, y1, destination = sys.argv[1:7]
    draw_grid(source, (int(x0), int(y0), int(x1), int(y1)), destination)

"""Contact sheet of a video: frames every N seconds, each labelled with its timestamp.

Usage: python3 sheet.py <video> <out.jpg> <every_seconds> [start] [end] [tile_height] [columns]
"""
import subprocess
import sys
import tempfile
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont


def duration_of(video: str) -> float:
    output = subprocess.run(
        ["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", video],
        capture_output=True, text=True, check=True,
    )
    return float(output.stdout.strip())


def grab(video: str, seconds: float, height: int, folder: Path) -> Image.Image:
    path = folder / f"{seconds:09.3f}.jpg"
    subprocess.run(
        ["ffmpeg", "-v", "error", "-y", "-ss", f"{seconds:.3f}", "-i", video, "-frames:v", "1",
         "-vf", f"scale=-2:{height}", str(path)],
        check=True,
    )
    return Image.open(path).convert("RGB")


def label(tile: Image.Image, text: str) -> Image.Image:
    draw = ImageDraw.Draw(tile)
    font = ImageFont.load_default(size=max(12, tile.height // 14))
    box = draw.textbbox((4, 4), text, font=font)
    draw.rectangle(box, fill=(0, 0, 0))
    draw.text((4, 4), text, fill=(255, 220, 0), font=font)
    return tile


def make_sheet(video: str, out: str, every: float, start: float, end: float, height: int, columns: int) -> None:
    times = []
    moment = start
    while moment < end - 0.05:
        times.append(moment)
        moment += every
    with tempfile.TemporaryDirectory() as folder:
        tiles = [label(grab(video, t, height, Path(folder)), f"{t:.2f}s") for t in times]
    width = max(tile.width for tile in tiles)
    rows = (len(tiles) + columns - 1) // columns
    sheet = Image.new("RGB", (width * columns, height * rows), (20, 20, 20))
    for index, tile in enumerate(tiles):
        sheet.paste(tile, ((index % columns) * width, (index // columns) * height))
    sheet.save(out, quality=85)


if __name__ == "__main__":
    video, out, every = sys.argv[1], sys.argv[2], float(sys.argv[3])
    start = float(sys.argv[4]) if len(sys.argv) > 4 else 0.0
    end = float(sys.argv[5]) if len(sys.argv) > 5 else duration_of(video) - 0.05
    height = int(sys.argv[6]) if len(sys.argv) > 6 else 216
    columns = int(sys.argv[7]) if len(sys.argv) > 7 else 6
    make_sheet(video, out, every, start, end, height, columns)

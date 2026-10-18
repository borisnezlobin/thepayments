"""Render the "The" montage.

Each plate's "The" is mapped onto the "The" of The Payments logo on the end card using two baseline
points from plates.json: the left edge of the word and the right edge of its "e".
"""
import json
import math
import subprocess
import sys
import wave
from dataclasses import dataclass
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFont, ImageOps

from logo import CAP_HEIGHT_UNITS, INK_LEFT_UNITS, THE_LEFT_UNITS, THE_RIGHT_UNITS, LogoRaster, render_logo

ROOT = Path(__file__).resolve().parent.parent
SOURCES = ROOT / "sources"
OUT = ROOT / "out"
SAMPLE_RATE = 48_000

INK = (0, 0, 0)
INK_MUTED = (77, 95, 91)
SURFACE = (255, 255, 255)
OUTSIDE_PLATE = 14


@dataclass(frozen=True)
class Baseline:
    left: tuple[float, float]
    right: tuple[float, float]


@dataclass(frozen=True)
class Lockup:
    the_only: LogoRaster
    full: LogoRaster
    origin: tuple[int, int]
    the_baseline: Baseline
    ink_bottom: float


def load_font(name: str, size: int) -> ImageFont.FreeTypeFont:
    return ImageFont.truetype(str(SOURCES / "fonts" / name), size)


def layout_lockup(end_card: dict, frame_size: tuple[int, int]) -> Lockup:
    ink_width = end_card["logoWidth"]
    the_only = render_logo(ink_width, include_payments=False)
    full = render_logo(ink_width, include_payments=True)
    scale = full.units_to_pixels
    ink_left, baseline = full.point(INK_LEFT_UNITS, 0)
    origin_x = round(frame_size[0] / 2 - ink_width / 2 - ink_left)
    origin_y = round(frame_size[1] / 2 + CAP_HEIGHT_UNITS * scale / 2 - 30 - baseline)
    the_left, _ = full.point(THE_LEFT_UNITS, 0)
    the_right, _ = full.point(THE_RIGHT_UNITS, 0)
    the_baseline = Baseline((origin_x + the_left, origin_y + baseline), (origin_x + the_right, origin_y + baseline))
    return Lockup(the_only, full, (origin_x, origin_y), the_baseline, origin_y + baseline)


def similarity_matrix(source: Baseline, target: Baseline) -> np.ndarray:
    (lx, ly), (rx, ry) = source.left, source.right
    (ax, ay), (bx, by) = target.left, target.right
    turn = math.atan2(by - ay, bx - ax) - math.atan2(ry - ly, rx - lx)
    scale = math.hypot(bx - ax, by - ay) / math.hypot(rx - lx, ry - ly)
    cos, sin = scale * math.cos(turn), scale * math.sin(turn)
    return np.array([[cos, -sin, ax - cos * lx + sin * ly], [sin, cos, ay - sin * lx - cos * ly], [0, 0, 1]])


def shear_matrix(source: Baseline, target: Baseline) -> np.ndarray:
    """Levels a sloped baseline while keeping vertical strokes vertical, for signs shot at an angle."""
    (lx, ly), (rx, ry) = source.left, source.right
    (ax, ay), (bx, _) = target.left, target.right
    scale = (bx - ax) / (rx - lx)
    slope = (ry - ly) / (rx - lx)
    return np.array(
        [[scale, 0, ax - scale * lx], [-scale * slope, scale, ay - scale * ly + scale * slope * lx], [0, 0, 1]]
    )


def prescale(image: Image.Image, source: Baseline, matrix: np.ndarray) -> tuple[Image.Image, Baseline]:
    """Shrinks big sources by an integer factor first, so the affine resample doesn't alias."""
    scale = math.sqrt(abs(np.linalg.det(matrix[:2, :2])))
    factor = max(1, int(1 / scale / 1.5))
    if factor == 1:
        return image, source
    shrunk = image.reduce(factor)
    left = (source.left[0] / factor, source.left[1] / factor)
    right = (source.right[0] / factor, source.right[1] / factor)
    return shrunk, Baseline(left, right)


def plate_matrix(plate: dict, source: Baseline, target: Baseline) -> np.ndarray:
    if plate.get("mode") == "shear":
        return shear_matrix(source, target)
    return similarity_matrix(source, target)


def align_plate(plate: dict, target: Baseline, frame_size: tuple[int, int]) -> Image.Image:
    image = Image.open(SOURCES / plate["file"]).convert("L")
    image = ImageOps.autocontrast(image, cutoff=1)
    source = Baseline(tuple(plate["left"]), tuple(plate["right"]))
    image, source = prescale(image, source, plate_matrix(plate, source, target))
    inverse = np.linalg.inv(plate_matrix(plate, source, target))
    coefficients = tuple(inverse[:2].flatten())
    resample = Image.Resampling.BICUBIC
    aligned = image.transform(frame_size, Image.Transform.AFFINE, coefficients, resample, fillcolor=OUTSIDE_PLATE)
    return aligned


def add_grain(image: Image.Image, rng: np.random.Generator, strength: float = 9.0) -> Image.Image:
    pixels = np.asarray(image, dtype=np.float32)
    noise = rng.normal(0, strength, pixels.shape[:2])
    if pixels.ndim == 3:
        noise = noise[..., None]
    return Image.fromarray(np.clip(pixels + noise, 0, 255).astype(np.uint8))


def end_card_frame(lockup: Lockup, end_card: dict, frame_size: tuple[int, int], show_rest: bool) -> Image.Image:
    frame = Image.new("RGB", frame_size, SURFACE)
    logo = lockup.full if show_rest else lockup.the_only
    frame.paste(logo.image, lockup.origin, logo.image)
    if show_rest:
        slogan_font = load_font("CooperHewitt-Medium.ttf", 46)
        position = (frame_size[0] / 2, lockup.ink_bottom + 120)
        ImageDraw.Draw(frame).text(position, end_card["slogan"], font=slogan_font, fill=INK_MUTED, anchor="ms")
    return frame


def build_frames(config: dict) -> tuple[list[Image.Image], list[int], int]:
    frame_size = tuple(config["size"])
    end_card = config["endCard"]
    lockup = layout_lockup(end_card, frame_size)
    rng = np.random.default_rng(7)
    frames: list[Image.Image] = []
    cut_frames: list[int] = []
    for plate in config["plates"]:
        aligned = align_plate(plate, lockup.the_baseline, frame_size)
        cut_frames.append(len(frames))
        frames += [add_grain(aligned, rng).convert("RGB") for _ in range(plate["frames"])]
    the_alone = end_card_frame(lockup, end_card, frame_size, show_rest=False)
    full = end_card_frame(lockup, end_card, frame_size, show_rest=True)
    frames += [the_alone] * end_card["theAloneFrames"]
    payoff_frame = len(frames)
    frames += [full] * end_card["holdFrames"]
    return frames, cut_frames, payoff_frame


def printer_tick(rng: np.random.Generator) -> np.ndarray:
    length = int(SAMPLE_RATE * 0.012)
    envelope = np.exp(-np.linspace(0, 9, length))
    return np.diff(rng.normal(0, 0.5, length + 1)) * envelope


def low_thump() -> np.ndarray:
    time = np.linspace(0, 0.6, int(SAMPLE_RATE * 0.6), endpoint=False)
    return 0.8 * np.sin(2 * math.pi * 62 * time) * np.exp(-time * 7)


def build_audio(total_frames: int, fps: int, cut_frames: list[int], payoff_frame: int) -> np.ndarray:
    track = np.zeros(int(SAMPLE_RATE * total_frames / fps) + SAMPLE_RATE)
    rng = np.random.default_rng(11)
    for frame in cut_frames:
        start = int(SAMPLE_RATE * frame / fps)
        tick = printer_tick(rng)
        track[start : start + len(tick)] += tick
    start = int(SAMPLE_RATE * payoff_frame / fps)
    thump = low_thump()
    track[start : start + len(thump)] += thump
    return np.clip(track[: int(SAMPLE_RATE * total_frames / fps)], -1, 1)


def write_wav(path: Path, samples: np.ndarray) -> None:
    with wave.open(str(path), "wb") as output:
        output.setnchannels(1)
        output.setsampwidth(2)
        output.setframerate(SAMPLE_RATE)
        output.writeframes((samples * 32767).astype(np.int16).tobytes())


def encode(frames_dir: Path, audio: Path, fps: int, destination: Path) -> None:
    command = [
        "ffmpeg", "-y", "-loglevel", "error", "-framerate", str(fps), "-i", str(frames_dir / "%04d.png"),
        "-i", str(audio), "-c:v", "libx264", "-crf", "14", "-pix_fmt", "yuv420p", "-c:a", "aac", "-shortest",
        str(destination),
    ]
    subprocess.run(command, check=True)


def main() -> None:
    config = json.loads((ROOT / "plates.json").read_text())
    frames, cut_frames, payoff_frame = build_frames(config)
    frames_dir = OUT / "frames"
    frames_dir.mkdir(parents=True, exist_ok=True)
    for stale in frames_dir.glob("*.png"):
        stale.unlink()
    for index, frame in enumerate(frames):
        frame.save(frames_dir / f"{index:04d}.png")
    audio_path = OUT / "clicks.wav"
    write_wav(audio_path, build_audio(len(frames), config["fps"], cut_frames, payoff_frame))
    encode(frames_dir, audio_path, config["fps"], OUT / "the-montage.mp4")
    print(f"{len(frames)} frames, cuts at {cut_frames}, payoff at {payoff_frame}", file=sys.stderr)


if __name__ == "__main__":
    main()

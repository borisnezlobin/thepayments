"""Build the full demo video: cues timed to the voiceover's words, rendered segment by segment, then mixed and joined."""
import json
import subprocess
import sys
import wave
from collections.abc import Iterator
from dataclasses import dataclass, field
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFilter

import graphics
from graphics import FPS, SIZE, SURFACE_SUNKEN, ease_in_out

DEMO = Path(__file__).resolve().parent.parent
FOOTAGE = DEMO / "footage"
SITE = FOOTAGE / "site"
VOICE = DEMO / "voiceover"
MONTAGE_FRAMES = DEMO / "the-montage" / "out" / "frames"
MONTAGE_CLICKS = DEMO / "the-montage" / "out" / "clicks.wav"
OUT = DEMO / "edit" / "out"
RATE = 48_000
VOICE_SPEED = 1.05
CLOSING_TRIM = (1.7, 10.6)
MONTAGE_PAYOFF_FRAME = 70
END = 120.0
COLOR_TAGS = ["-colorspace", "bt709", "-color_primaries", "bt709", "-color_trc", "bt709", "-color_range", "tv"]
TO_BT709 = "scale=out_color_matrix=bt709:out_range=tv"

PART_STARTS = {"a": 0.6, "b": 61.25, "c": 78.0}
CLOSING_START = 107.5
DROP_START = 74.75


@dataclass
class Segment:
    kind: str
    source: str = ""
    start: float = 0.0
    speed: float = 1.0
    ambience: float = 0.08
    options: dict = field(default_factory=dict)


class Voice:
    """Looks up when a word is spoken, in final-video seconds."""

    def __init__(self) -> None:
        self.timings = json.loads((VOICE / "final-timings.json").read_text())

    def words(self, part: str) -> list[tuple[str, float]]:
        key = "rec15.wav" if part == "closing" else f"vo-part-{part}-final.wav"
        return [(word.strip(" ,.").lower(), start) for segment in self.timings[key] for word, start, _ in segment["words"]]

    def sentence(self, part: str, index: int) -> float:
        return PART_STARTS[part] + self.timings[f"vo-part-{part}-final.wav"][index]["start"]

    def word(self, part: str, text: str, occurrence: int = 0) -> float:
        matches = [start for word, start in self.words(part) if word == text.lower()]
        start = matches[occurrence]
        if part == "closing":
            return CLOSING_START + (start - CLOSING_TRIM[0]) / VOICE_SPEED
        return PART_STARTS[part] + start


def clip(source: str, start: float, speed: float = 1.0, ambience: float = 0.08, crop: tuple | None = None) -> Segment:
    return Segment("clip", source, start, speed, ambience, options={"crop": crop} if crop else {})


def phone(source: str, start: float, speed: float = 1.0) -> Segment:
    return Segment("phone", source, start, speed, ambience=0.0)


def still(source: str, start_box: tuple, end_box: tuple) -> Segment:
    return Segment("still", source, ambience=0.0, options={"from": start_box, "to": end_box})


def graphic(name: str, **options) -> Segment:
    return Segment("graphic", name, ambience=0.0, options=options)


def cue_list(voice: Voice) -> list[tuple[float, Segment]]:
    a, b, c = (lambda *w: voice.word("a", *w)), (lambda *w: voice.word("b", *w)), (lambda *w: voice.word("c", *w))
    montage_start = voice.word("closing", "world") + 0.45 - MONTAGE_PAYOFF_FRAME / FPS
    return [
        (0.0, clip("IMG_1336.MOV", 0.3, ambience=0.18)),
        (a("mind"), clip("IMG_1339.MOV", 5.5)),
        (a("north"), clip("IMG_1333.MOV", 2.5)),
        (a("when"), graphic("fee", tear_at=a("stripe") - a("when"))),
        (a("person") - 0.25, clip("IMG_1346.mov", 0.0)),
        (a("more") - 0.3, graphic("number", target=9, prefix="", suffix="%", label="of every cup")),
        (a("first") - 0.2, graphic("number", target=200000, prefix="$", suffix="", label="a year in card fees")),
        (a("so") - 0.1, clip("IMG_1344.mov", 0.6)),
        (a("cheaper"), clip("IMG_1345.mov", 3.5)),
        (a("more", 1), clip("IMG_1349.mov", 0.2)),
        (a("what") - 0.3, clip("IMG_1363.mov", 0.5)),
        (a("using") - 0.1, graphic("bars", savings_at=a("cheaper", 1) - a("using") + 0.1,
                                   shop_at=a("businesses") - a("using") + 0.1, fee_at=a("thousandth") - a("using") + 0.1)),
        (a("made") - 0.2, clip("import-mind-coffee.mp4", 2.6, ambience=0.0, crop=(280, 250, 960, 540))),
        (a("context") - 0.6, clip("import-mind-coffee.mp4", 7.4, speed=9.0, ambience=0.0, crop=(280, 250, 960, 540))),
        (a("context") + 1.9, clip("import-mind-coffee.mp4", 29.6, ambience=0.0, crop=(160, 0, 1600, 900))),
        (PART_STARTS["b"], clip("IMG_1346.mov", 2.2)),
        (b("customer"), clip("IMG_1361.mov", 0.0)),
        (b("find"), phone("screen-16-31-32-import.mov", 66.0, speed=12.0)),
        (b("places") - 0.3, clip("IMG_1359.mov", 2.0)),
        (b("digital"), phone("screen-16-31-32-import.mov", 140.0, speed=1.4)),
        (DROP_START, clip("IMG_9465.mov", 7.6, ambience=0.9)),
        (PART_STARTS["c"] + 0.3, graphic("payoff")),
        (c("additional") - 0.3, graphic("number", target=114000, prefix="$", suffix="", label="more for the shop, every year")),
        (c("everyone") - 0.2, clip("IMG_1353.mov", 0.3)),
        (c("community"), clip("IMG_1350.mov", 1.4)),
        (c("made") - 0.2, clip("IMG_9465.mov", 21.0, speed=1.5, ambience=0.05)),
        (c("when") - 0.2, clip("IMG_9465.mov", 40.0, speed=1.11, ambience=0.05)),
        (CLOSING_START, clip("IMG_1355.mov", 2.0)),
        (voice.word("closing", "better") - 0.3, clip("IMG_1338.MOV", 2.0)),
        (montage_start, Segment("montage", ambience=0.0)),
    ]


def ffmpeg_writer(path: Path) -> subprocess.Popen:
    command = [
        "ffmpeg", "-v", "error", "-y", "-f", "rawvideo", "-pix_fmt", "rgb24", "-s", f"{SIZE[0]}x{SIZE[1]}",
        "-r", str(FPS), "-i", "-", "-vf", TO_BT709, "-c:v", "libx264", "-crf", "17", "-preset", "medium",
        "-pix_fmt", "yuv420p", *COLOR_TAGS, str(path),
    ]
    return subprocess.Popen(command, stdin=subprocess.PIPE)


def write_frames(frames: Iterator[Image.Image], count: int, path: Path) -> None:
    writer = ffmpeg_writer(path)
    last, written = Image.new("RGB", SIZE), 0
    for frame in frames:
        if written >= count:
            break
        last = frame.convert("RGB")
        writer.stdin.write(last.tobytes())
        written += 1
    for _ in range(count - written):
        writer.stdin.write(last.tobytes())
    writer.stdin.close()
    writer.wait()


def render_clip(segment: Segment, count: int, path: Path) -> None:
    seconds = count / FPS * segment.speed + 0.5
    crop = segment.options.get("crop")
    punch_in = f"crop={crop[2]}:{crop[3]}:{crop[0]}:{crop[1]}," if crop else ""
    filters = (
        f"{punch_in}setpts=PTS/{segment.speed},fps={FPS},scale={SIZE[0]}:{SIZE[1]}:force_original_aspect_ratio=increase,"
        f"crop={SIZE[0]}:{SIZE[1]},tpad=stop_mode=clone:stop_duration=20"
    )
    command = [
        "ffmpeg", "-v", "error", "-y", "-ss", str(segment.start), "-t", str(seconds), "-i", str(FOOTAGE / segment.source),
        "-vf", filters, "-frames:v", str(count), "-an", "-c:v", "libx264", "-crf", "17", "-pix_fmt", "yuv420p", *COLOR_TAGS, str(path),
    ]
    subprocess.run(command, check=True)


def source_frames(path: Path, start: float, seconds: float, speed: float, size: tuple[int, int]) -> Iterator[Image.Image]:
    command = [
        "ffmpeg", "-v", "error", "-ss", str(start), "-t", str(seconds * speed), "-i", str(path),
        "-vf", f"setpts=PTS/{speed},fps={FPS},scale={size[0]}:{size[1]}:flags=lanczos", "-f", "rawvideo", "-pix_fmt", "rgb24", "-",
    ]
    reader = subprocess.Popen(command, stdout=subprocess.PIPE)
    frame_bytes = size[0] * size[1] * 3
    while chunk := reader.stdout.read(frame_bytes):
        if len(chunk) < frame_bytes:
            break
        yield Image.frombytes("RGB", size, chunk)
    reader.wait()


def phone_frames(segment: Segment, count: int) -> Iterator[Image.Image]:
    screen_size = (440, 960)
    left, top = (SIZE[0] - screen_size[0]) // 2, (SIZE[1] - screen_size[1]) // 2
    mask = Image.new("L", screen_size, 0)
    ImageDraw.Draw(mask).rounded_rectangle([0, 0, screen_size[0] - 1, screen_size[1] - 1], radius=52, fill=255)
    backdrop = Image.new("RGB", SIZE, SURFACE_SUNKEN)
    shadow = Image.new("L", SIZE, 0)
    shadow.paste(mask.point(lambda value: value // 4), (left, top + 18))
    backdrop.paste(graphics.SHADOW, mask=shadow.filter(ImageFilter.GaussianBlur(28)))
    for screen in source_frames(FOOTAGE / segment.source, segment.start, count / FPS, segment.speed, screen_size):
        frame = backdrop.copy()
        frame.paste(screen, (left, top), mask)
        yield frame


def interpolate_box(start: tuple, end: tuple, progress: float) -> tuple[float, float, float]:
    return tuple(a + (b - a) * progress for a, b in zip(start, end))


def still_frames(segment: Segment, count: int) -> Iterator[Image.Image]:
    image = Image.open(SITE / segment.source).convert("RGB")
    for index in range(count):
        x, y, width = interpolate_box(segment.options["from"], segment.options["to"], ease_in_out(index / max(1, count - 1)))
        height = width * SIZE[1] / SIZE[0]
        yield image.crop((round(x), round(y), round(x + width), round(y + height))).resize(SIZE, Image.Resampling.LANCZOS)


def graphic_frames(segment: Segment, count: int) -> Iterator[Image.Image]:
    seconds = count / FPS + 1
    options = segment.options
    if segment.source == "fee":
        return graphics.fee_ticket(seconds, segment.options["tear_at"], 600, 46, "Stripe's card fee")
    if segment.source == "bars":
        stages = graphics.BarStages(options["savings_at"], options["shop_at"], options["fee_at"])
        return graphics.price_bars(seconds, stages)
    if segment.source == "payoff":
        return graphics.payoff_tickets(seconds, 600, 46, 19)
    return graphics.big_number(seconds, options["target"], options["prefix"], options["suffix"], options["label"])


def montage_frames(count: int) -> Iterator[Image.Image]:
    paths = sorted(MONTAGE_FRAMES.glob("*.png"))
    for index in range(count):
        yield Image.open(paths[min(index, len(paths) - 1)])


FRAME_SOURCES = {
    "phone": phone_frames,
    "still": still_frames,
    "graphic": graphic_frames,
}


def render_segment(segment: Segment, count: int, path: Path) -> None:
    if segment.kind == "clip":
        render_clip(segment, count, path)
        return
    frames = montage_frames(count) if segment.kind == "montage" else FRAME_SOURCES[segment.kind](segment, count)
    write_frames(frames, count, path)


def read_audio(path: Path, start: float = 0.0, seconds: float | None = None, speed: float = 1.0) -> np.ndarray:
    command = ["ffmpeg", "-v", "error", "-ss", str(start)]
    if seconds is not None:
        command += ["-t", str(seconds * speed)]
    command += ["-i", str(path), "-ac", "1", "-ar", str(RATE)]
    if speed != 1.0:
        command += ["-af", f"atempo={speed}"]
    command += ["-f", "f32le", "-"]
    output = subprocess.run(command, capture_output=True, check=True).stdout
    return np.frombuffer(output, np.float32)


def place(track: np.ndarray, samples: np.ndarray, at: float, gain: float) -> None:
    start = int(at * RATE)
    end = min(len(track), start + len(samples))
    if end > start:
        track[start:end] += samples[: end - start] * gain


def voice_track(total: float) -> np.ndarray:
    track = np.zeros(int(total * RATE), np.float32)
    for part, start in PART_STARTS.items():
        place(track, read_audio(VOICE / f"vo-part-{part}-final.wav"), start, 1.0)
    closing_seconds = CLOSING_TRIM[1] - CLOSING_TRIM[0]
    closing = read_audio(VOICE / "rec15.wav", CLOSING_TRIM[0], closing_seconds / VOICE_SPEED, VOICE_SPEED)
    place(track, closing, CLOSING_START, 1.0)
    return track / max(1e-6, np.abs(track).max()) * 0.85


def ambience_track(total: float, timeline: list[tuple[float, float, Segment]]) -> np.ndarray:
    track = np.zeros(int(total * RATE), np.float32)
    for at, seconds, segment in timeline:
        if segment.kind == "clip" and segment.ambience > 0 and 0.5 <= segment.speed <= 2:
            audio = read_audio(FOOTAGE / segment.source, segment.start, seconds, segment.speed)
            fade = np.minimum(1, np.minimum(np.arange(len(audio)), np.arange(len(audio))[::-1]) / (0.05 * RATE))
            place(track, audio * fade, at, segment.ambience)
        if segment.kind == "montage":
            place(track, read_audio(MONTAGE_CLICKS), at, 0.3)
    return track


def mix(total: float, timeline: list[tuple[float, float, Segment]], path: Path) -> None:
    track = voice_track(total) + ambience_track(total, timeline)
    raw = path.with_suffix(".raw.wav")
    with wave.open(str(raw), "wb") as output:
        output.setnchannels(1)
        output.setsampwidth(2)
        output.setframerate(RATE)
        output.writeframes((np.clip(track, -1, 1) * 32767).astype(np.int16).tobytes())
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", str(raw), "-af", "loudnorm=I=-16:TP=-1.5:LRA=11", "-ar", str(RATE), str(path)], check=True)


def build_timeline(voice: Voice) -> list[tuple[float, float, Segment]]:
    cues = sorted(cue_list(voice), key=lambda cue: cue[0])
    ends = [start for start, _ in cues[1:]] + [END]
    return [(start, end - start, segment) for (start, segment), end in zip(cues, ends)]


def frame_counts(timeline: list[tuple[float, float, Segment]]) -> list[int]:
    boundaries = [round(start * FPS) for start, _, _ in timeline] + [round(END * FPS)]
    return [later - earlier for earlier, later in zip(boundaries, boundaries[1:])]


def main() -> None:
    only = set(sys.argv[1:])
    segments_dir = OUT / "segments"
    segments_dir.mkdir(parents=True, exist_ok=True)
    timeline = build_timeline(Voice())
    counts = frame_counts(timeline)
    for index, ((start, _, segment), count) in enumerate(zip(timeline, counts)):
        path = segments_dir / f"{index:02d}.mp4"
        print(f"{index:02d} {start:7.2f}s {count:4d}f {segment.kind:8s} {segment.source}", file=sys.stderr)
        if not only or str(index) in only or not path.exists():
            render_segment(segment, count, path)
    (OUT / "segments.txt").write_text("".join(f"file 'segments/{i:02d}.mp4'\n" for i in range(len(timeline))))
    mix(END, timeline, OUT / "mix.wav")
    subprocess.run(
        ["ffmpeg", "-v", "error", "-y", "-f", "concat", "-safe", "0", "-i", str(OUT / "segments.txt"), "-i", str(OUT / "mix.wav"),
         "-c:v", "copy", "-c:a", "aac", "-b:a", "192k", "-shortest", str(OUT / "the-payments-demo.mp4")],
        check=True,
    )


if __name__ == "__main__":
    main()

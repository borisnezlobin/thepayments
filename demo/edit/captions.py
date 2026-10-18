"""Captions for the demo: an .srt for YouTube and an on-brand burned-in version of the video."""
import json
import re
import subprocess
from dataclasses import dataclass
from pathlib import Path

from PIL import Image, ImageDraw

import graphics
from build import CLOSING_START, CLOSING_TRIM, COLOR_TAGS, FPS, OUT, PART_STARTS, TO_BT709, VOICE, VOICE_SPEED

MAX_CHARS = 44
MAX_SECONDS = 3.6
CHIP_FILL = (11, 31, 28, 225)
CHIP_PADDING = (34, 20)
CHIP_RADIUS = 18
BOTTOM_MARGIN = 70
PUNCTUATION = ".,!?"

# Whisper's mishearings and lowercase brand names, fixed word by word. Earlier rules win at the same position.
CORRECTIONS = [
    (["of", "the", "payments"], ["of", "the", "payments"]),
    (["the", "payments"], ["The", "Payments"]),
    (["in", "first"], ["For", "a"]),
    (["contextdev"], ["Context.dev"]),
    (["pays", "an"], ["pays", "in"]),
    (["the", "base", "network"], ["the", "Base", "network"]),
    (["the", "basis", "of", "poa"], ["Base", "Sepolia"]),
    (["instinct"], ["Instinct"]),
    (["mastercard"], ["Mastercard"]),
    (["cafe"], ["café"]),
]


@dataclass
class Word:
    text: str
    start: float
    end: float


@dataclass
class Cue:
    words: list[Word]

    @property
    def text(self) -> str:
        return " ".join(word.text for word in self.words)

    @property
    def start(self) -> float:
        return self.words[0].start

    @property
    def end(self) -> float:
        return self.words[-1].end


def key(token: str) -> str:
    return re.sub(r"[^\w']", "", token.lower())


def absolute(part: str, seconds: float) -> float:
    if part == "closing":
        return CLOSING_START + (seconds - CLOSING_TRIM[0]) / VOICE_SPEED
    return PART_STARTS[part] + seconds


def load_words() -> list[Word]:
    timings = json.loads((VOICE / "final-timings.json").read_text())
    files = {"a": "vo-part-a-final.wav", "b": "vo-part-b-final.wav", "c": "vo-part-c-final.wav", "closing": "rec15.wav"}
    words = []
    for part, name in files.items():
        for segment in timings[name]:
            words += [Word(text.strip(), absolute(part, start), absolute(part, end)) for text, start, end in segment["words"]]
    return [word for word in words if word.text]


def matching_rule(words: list[Word], index: int) -> tuple[list[str], list[str]] | None:
    for pattern, replacement in CORRECTIONS:
        window = [key(word.text) for word in words[index : index + len(pattern)]]
        if window == pattern:
            return pattern, replacement
    return None


def replaced(originals: list[Word], replacement: list[str]) -> list[Word]:
    trailing = re.search(rf"[{re.escape(PUNCTUATION)}]+$", originals[-1].text)
    texts = list(replacement)
    if trailing and not texts[-1].endswith(trailing.group()):
        texts[-1] += trailing.group()
    step = (originals[-1].end - originals[0].start) / len(texts)
    return [Word(text, originals[0].start + i * step, originals[0].start + (i + 1) * step) for i, text in enumerate(texts)]


def corrected(words: list[Word]) -> list[Word]:
    result, index = [], 0
    while index < len(words):
        rule = matching_rule(words, index)
        if rule is None:
            result.append(words[index])
            index += 1
            continue
        pattern, replacement = rule
        result += replaced(words[index : index + len(pattern)], replacement)
        index += len(pattern)
    return result


def merge_split_tokens(words: list[Word]) -> list[Word]:
    """Whisper splits tokens like "$114" ",000" and "off" "-chain"; glue pieces that start with punctuation back on."""
    merged: list[Word] = []
    for word in words:
        if merged and re.match(r"^(%|[,.\-'%]\w)", word.text):
            merged[-1] = Word(merged[-1].text + word.text, merged[-1].start, word.end)
        else:
            merged.append(word)
    return merged


def sentences(words: list[Word]) -> list[list[Word]]:
    groups, current = [], []
    for word in words:
        current.append(word)
        if word.text.endswith((".", "!", "?")):
            groups.append(current)
            current = []
    return groups + ([current] if current else [])


def text_length(words: list[Word]) -> int:
    return len(" ".join(word.text for word in words))


def best_break(words: list[Word]) -> int:
    """Index to split at: lines as even as possible, with a pull toward breaking after a comma."""
    def cost(index: int) -> float:
        left, right = text_length(words[:index]), text_length(words[index:])
        comma_bonus = 10 if words[index - 1].text.endswith(",") else 0
        return abs(left - right) - comma_bonus
    return min(range(1, len(words)), key=cost)


def split_lines(words: list[Word]) -> list[list[Word]]:
    too_long = text_length(words) > MAX_CHARS or words[-1].end - words[0].start > MAX_SECONDS * 1.4
    if len(words) < 2 or not too_long:
        return [words]
    index = best_break(words)
    return split_lines(words[:index]) + split_lines(words[index:])


def build_cues(words: list[Word]) -> list[Cue]:
    return [Cue(line) for sentence in sentences(words) for line in split_lines(sentence)]


def cue_end(cues: list[Cue], index: int) -> float:
    end = cues[index].end + 0.25
    return min(end, cues[index + 1].start - 0.02) if index + 1 < len(cues) else end


def timestamp(seconds: float) -> str:
    milliseconds = round(seconds * 1000)
    hours, rest = divmod(milliseconds, 3_600_000)
    minutes, rest = divmod(rest, 60_000)
    secs, millis = divmod(rest, 1000)
    return f"{hours:02d}:{minutes:02d}:{secs:02d},{millis:03d}"


def write_srt(cues: list[Cue], path: Path) -> None:
    blocks = [f"{i + 1}\n{timestamp(cue.start)} --> {timestamp(cue_end(cues, i))}\n{cue.text}\n" for i, cue in enumerate(cues)]
    path.write_text("\n".join(blocks))


def chip_image(text: str) -> Image.Image:
    font = graphics.body_font(46, medium=True)
    measure = ImageDraw.Draw(Image.new("RGBA", (1, 1)))
    left, top, right, bottom = measure.textbbox((0, 0), text, font=font, anchor="ls")
    width, height = right - left + CHIP_PADDING[0] * 2, 46 + CHIP_PADDING[1] * 2
    chip = Image.new("RGBA", (width, height), (0, 0, 0, 0))
    draw = ImageDraw.Draw(chip)
    draw.rounded_rectangle([0, 0, width - 1, height - 1], radius=CHIP_RADIUS, fill=CHIP_FILL)
    draw.text((CHIP_PADDING[0] - left, CHIP_PADDING[1] + 36), text, font=font, fill=(255, 255, 255, 255), anchor="ls")
    return chip


def chip_layer(cue: Cue) -> tuple[Image.Image, tuple[int, int]]:
    chip = chip_image(cue.text)
    position = ((graphics.SIZE[0] - chip.width) // 2, graphics.SIZE[1] - BOTTOM_MARGIN - chip.height)
    return chip, position


def active_cue(cues: list[Cue], seconds: float) -> int | None:
    for index, cue in enumerate(cues):
        if cue.start <= seconds <= cue_end(cues, index):
            return index
    return None


def burn_in(cues: list[Cue], video: Path, destination: Path) -> None:
    """Pastes each caption chip onto the frames it covers, decoding and encoding with the BT.709 matrix."""
    width, height = graphics.SIZE
    layers = [chip_layer(cue) for cue in cues]
    reader = subprocess.Popen(
        ["ffmpeg", "-v", "error", "-i", str(video), "-vf", "scale=in_color_matrix=bt709:in_range=tv",
         "-f", "rawvideo", "-pix_fmt", "rgb24", "-"],
        stdout=subprocess.PIPE,
    )
    writer = subprocess.Popen(
        ["ffmpeg", "-v", "error", "-y", "-f", "rawvideo", "-pix_fmt", "rgb24", "-s", f"{width}x{height}", "-r", str(FPS),
         "-i", "-", "-i", str(video), "-map", "0:v", "-map", "1:a", "-vf", TO_BT709, "-c:v", "libx264", "-crf", "18",
         "-preset", "veryfast", "-pix_fmt", "yuv420p", *COLOR_TAGS, "-c:a", "copy", str(destination)],
        stdin=subprocess.PIPE,
    )
    frame_bytes, index = width * height * 3, 0
    while chunk := reader.stdout.read(frame_bytes):
        cue = active_cue(cues, index / FPS)
        if cue is not None:
            frame = Image.frombytes("RGB", graphics.SIZE, chunk)
            chip, position = layers[cue]
            frame.paste(chip, position, chip)
            chunk = frame.tobytes()
        writer.stdin.write(chunk)
        index += 1
    writer.stdin.close()
    reader.wait()
    writer.wait()


def main() -> None:
    cues = build_cues(corrected(merge_split_tokens(load_words())))
    write_srt(cues, OUT / "the-payments-demo.srt")
    for index, cue in enumerate(cues):
        print(f"{cue.start:7.2f}-{cue_end(cues, index):7.2f}  {cue.text}")
    burn_in(cues, OUT / "the-payments-demo.mp4", OUT / "the-payments-demo-captioned.mp4")


if __name__ == "__main__":
    main()

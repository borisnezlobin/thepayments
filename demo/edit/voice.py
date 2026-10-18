"""Tighten the voiceover: shrink every pause longer than MAX_PAUSE down to KEEP_PAUSE, without touching words."""
import sys
import wave
from pathlib import Path

import numpy as np

VOICE = Path(__file__).resolve().parent.parent / "voiceover"
HOP_SECONDS = 0.01
SILENCE_DB = -36.0
MAX_PAUSE = 0.45
KEEP_PAUSE = 0.28


def read_wav(path: Path) -> tuple[np.ndarray, int]:
    with wave.open(str(path)) as source:
        rate = source.getframerate()
        samples = np.frombuffer(source.readframes(source.getnframes()), np.int16).astype(np.float32)
    return samples, rate


def write_wav(path: Path, samples: np.ndarray, rate: int) -> None:
    with wave.open(str(path), "wb") as output:
        output.setnchannels(1)
        output.setsampwidth(2)
        output.setframerate(rate)
        output.writeframes(np.clip(samples, -32768, 32767).astype(np.int16).tobytes())


def loudness(samples: np.ndarray, rate: int) -> np.ndarray:
    hop = int(rate * HOP_SECONDS)
    frames = samples[: len(samples) // hop * hop].reshape(-1, hop) / 32768
    return 20 * np.log10(np.sqrt((frames**2).mean(axis=1)) + 1e-6)


def silent_runs(levels: np.ndarray) -> list[tuple[int, int]]:
    quiet = levels < SILENCE_DB
    runs, start = [], None
    for index, is_quiet in enumerate(quiet):
        if is_quiet and start is None:
            start = index
        if not is_quiet and start is not None:
            runs.append((start, index))
            start = None
    return runs


def tighten(samples: np.ndarray, rate: int) -> np.ndarray:
    hop = int(rate * HOP_SECONDS)
    keep_half = int(KEEP_PAUSE / 2 / HOP_SECONDS)
    pieces, cursor = [], 0
    for start, end in silent_runs(loudness(samples, rate)):
        if (end - start) * HOP_SECONDS <= MAX_PAUSE or start == 0:
            continue
        pieces.append(samples[cursor * hop : (start + keep_half) * hop])
        cursor = end - keep_half
    pieces.append(samples[cursor * hop :])
    return np.concatenate(pieces)


if __name__ == "__main__":
    for name in sys.argv[1:]:
        samples, rate = read_wav(VOICE / f"{name}.wav")
        tightened = tighten(samples, rate)
        write_wav(VOICE / f"{name}-tight.wav", tightened, rate)
        print(name, round(len(samples) / rate, 2), "->", round(len(tightened) / rate, 2))

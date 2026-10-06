"""Spike: does Edge TTS give usable word-level timings? Writes spikes/out/."""
import asyncio
import json
import re
import subprocess
import sys
from pathlib import Path

import edge_tts

TEXT = (
    "Between 2007 and 2009, the S&P 500 lost more than half of its value. "
    "Then it climbed for eleven straight years."
)
OUT = Path(__file__).parent / "out"
TICKS_PER_MS = 10_000  # Edge reports offsets in 100ns ticks


async def synth(voice: str):
    comm = edge_tts.Communicate(TEXT, voice, boundary="WordBoundary")
    audio, words = bytearray(), []
    async for chunk in comm.stream():
        if chunk["type"] == "audio":
            audio += chunk["data"]
        elif chunk["type"] == "WordBoundary":
            words.append({
                "text": chunk["text"],
                "startMs": chunk["offset"] / TICKS_PER_MS,
                "endMs": (chunk["offset"] + chunk["duration"]) / TICKS_PER_MS,
            })
    return bytes(audio), words


def audio_duration_ms(path: Path) -> float:
    out = subprocess.check_output([
        "ffprobe", "-v", "error", "-show_entries", "format=duration",
        "-of", "default=nw=1:nk=1", str(path),
    ])
    return float(out) * 1000


def verdict(words, audio_ms: float) -> list[str]:
    problems = []
    expected = len(re.findall(r"\S+", TEXT))
    if len(words) < expected * 0.9:
        problems.append(f"only {len(words)} word events for ~{expected} words")
    starts = [w["startMs"] for w in words]
    if starts != sorted(starts):
        problems.append("start offsets are not monotonic")
    if words and abs(words[-1]["endMs"] - audio_ms) > 400:
        problems.append(f"last word ends {words[-1]['endMs']:.0f}ms vs audio {audio_ms:.0f}ms")
    return problems


async def main(voice: str) -> int:
    OUT.mkdir(exist_ok=True)
    try:
        audio, words = await synth(voice)
    except Exception as exc:  # report, do not hide: this is the spike's answer
        print(f"FAIL: {type(exc).__name__}: {exc}")
        return 1
    mp3 = OUT / "narration.mp3"
    mp3.write_bytes(audio)
    (OUT / "words.json").write_text(json.dumps(words, indent=2))
    problems = verdict(words, audio_duration_ms(mp3))
    print(f"voice={voice} words={len(words)} sample={words[:3]}")
    print("PASS" if not problems else "FAIL: " + "; ".join(problems))
    return 0 if not problems else 1


if __name__ == "__main__":
    sys.exit(asyncio.run(main(sys.argv[1] if len(sys.argv) > 1 else "en-US-AndrewNeural")))

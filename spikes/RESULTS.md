# Spike Results

## A. Word-level TTS timings (date: 2026-10-06)
- Method tried: edge-tts 7.x with `boundary="WordBoundary"` (free, no key), voices en-US-AndrewNeural and en-US-AriaNeural.
- Verdict: PARTIAL. Word boundaries are returned and accurate for plain words (monotonic, last word within 400ms of audio for Andrew; Aria ends ~865ms before audio end, i.e. trailing silence). But any phrase containing digits is MERGED into a single event:
  - "Between 2007 and 2009" -> 1 event (2.5s long)
  - "$1.5 trillion to $700 billion" -> 1 event
  - "In 2008" -> 1 event; "March 2009" -> 1 event; "56.8 percent" -> 1 event
  - Standalone "57%", "12", "1,200", "S&P", "500" came back as their own event.
  - Numbers written out as words ("two thousand seven") -> one event per word, no merging.
- Words returned vs expected: 18 / 21 on the test sentence (the script's 90% threshold flagged it).
- Voice quality: not judged by the agent; user to listen to `spikes/out/narration.mp3` (Andrew) and compare Aria.
- Decision for the pipeline: use Edge TTS WordBoundary. Add a normalizer in the voice step (Plan 2) that splits merged events into per-token timings, distributing the event's duration by token character length. Cues on numbers inside merged phrases will be approximate (error bounded by the merged event's length). If that proves too imprecise on real charts, switch to spoken-form pre-normalization (numbers -> words before TTS, mapped back to display tokens) or whisper.cpp alignment. Not needed for Plan 1.

## B. Render speed (date: 2026-10-06)
- Machine: Intel Mac, 8 cores, 16 GB, macOS 12.6.3
- RenderStress, 300 frames, 1080x1920@30, JPEG image sequence, default concurrency: ~29 s wall including bundling (~0.1 s/frame)
- Estimated 60s video (1800 frames): ~3 min (frames) plus ~50 s of system-ffmpeg libx264 encoding (measured 8.6 s per 300 frames)
- Blocker found and worked around: Remotion's bundled ffmpeg (`@remotion/compositor-darwin-x64`) aborts on macOS 12 (`Symbol not found: AVCaptureDeviceTypeContinuityCamera`), so `remotion render` to MP4 fails at the stitch step. Workaround: render with `--sequence` (image frames) and encode with the system ffmpeg 9.0.2. Verified below.
- Also: Remotion requires zod exactly 4.5.4 (pinned).
- Verdict: acceptable (<10 min).

## Inputs for Plan 2 (charts)
- Timing method to build the voice step on: Edge TTS WordBoundary plus a normalizer that splits merged number-phrase events per token (TDD it with the exact cases in section A: "Between 2007 and 2009", "$1.5 trillion to $700 billion", "56.8 percent").
- Measured render budget: ~0.1 s/frame, so a 60s video costs ~3 min of frame rendering plus ~50 s encoding. Chart scenes with a few hundred SVG nodes are in budget (the stress test had 60 springing circles plus a path).
- Encoding: system ffmpeg only (`src/pipeline/encode.ts`); Remotion's bundled ffmpeg does not run on macOS 12.
- Version pins that matter: all `remotion*` at 4.0.533, zod exactly 4.5.4.
- Visual notes from the hello render: motion reads well (staggered pops, count-up with no overshoot, callout on cue word). Things to improve in the design pass: the title headline wraps awkwardly ("500 in" split from "S&P") so add balanced wrapping; scenes cut hard with no transition (milestone 4); number card right edge sits ~52px from the edge (gutter target is 60px) because of the offset block; content sits high because the bottom safe zone is 20%.
- Scene library next: line-chart, bar-race (spec milestone 3).

## C. FinanceDemo render (date: 2026-10-06)
- Frames: 752 (25.07 s), wall time 46.8 s including bundling and system-ffmpeg encode, about 0.062 s/frame (4 scene types; line charts rebuild their SVG path every frame)
- Estimated 60s video (1800 frames): about 2 min
- Verdict: acceptable (<10 min)

## Inputs for Plan 3 (voice, captions, audio finish)
- Replace `fixtures/synthWords.ts` with the real voice step: Edge TTS WordBoundary plus the splitting normalizer (cases in section A, plus the cue-token collision where "$1.5" and "15" normalize to the same token).
- Encoding is system-ffmpeg only (`src/pipeline/encode.ts`); audio mux and loudness normalization go through the same path.
- FinanceDemo render budget: about 0.062 s/frame (about 2 min for 60 s). Line charts rebuild their SVG path every frame; still comfortably in budget.
- Visual follow-ups seen while reviewing the chart renders and not fixed: a callout can cover a y tick label ("1,000" under the 2008 badge) and the line start can hide the "0%" tick; bar-race name labels overlap neighbouring bars briefly mid-swap; the line-chart area fill ends in a hard vertical edge at the cursor; no scene transitions or camera push yet.
- Known gaps: callout text and chart titles are not traced to facts; numbers inside title headlines are not traced.
- Scene library still missing from the spec: kinetic-text, timeline, map, compare, quote.

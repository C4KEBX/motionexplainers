# Motion Explainers: Design Spec

Date: 2026-10-05
Status: Draft, awaiting user review

## 1. Goal

Automate 60-second vertical explainer videos on finance, investing and history, with top-notch, fully animated motion graphics, produced at $0 marginal cost on a local machine.

The core of the project is the **motion-graphics rendering engine**. Script writing, fact-checking and review are comparatively easy and are handled by a Claude Code skill around the engine.

### Success criteria
- A 60s (55-60s), 1080x1920, 30fps MP4 renders locally with no paid services.
- Charts are truly animated (data-driven motion), never static images.
- Visuals land on spoken words (word-synced cues).
- The look is consistent and hand-designed: one token-driven design system, no template feel.
- Every number on screen traces to a sourced fact.

### Decisions already made (user-confirmed)
| Decision | Choice |
|---|---|
| Output format | Vertical 9:16 only (v1) |
| Visual direction | Bold flat motion design |
| Engine | Remotion (React). Revideo (MIT) is the fallback if licensing becomes a problem |
| Voice | Free TTS (Edge TTS / Kokoro) |
| Project location | `/Users/justinmason/Claude Code/motion-explainers/` |

## 2. Non-goals (v1)
16:9 output, multiple themes, auto-publishing, stock footage, AI image or video generation, any web UI.

## 3. Pipeline

```
topic -> [1 Script]     LLM -> script.md + facts.json (sourced)
      -> [2 Storyboard] LLM -> storyboard.json (typed scenes, schema-validated)
      -> [3 Voice]      TTS -> narration.wav + word timings
      -> [4 Compose]    Remotion renders scenes timed to word timings
      -> [5 Finish]     music ducking + loudness (ffmpeg) -> final.mp4
```

Steps 1-2 are the "brain" (LLM). Steps 3-5 are the "renderer". They communicate only through `storyboard.json` and `facts.json`.

### Boundary: storyboard contract
`storyboard.json` is a strict, versioned, Zod-validated contract.

- Top level: `meta` (title, theme, voice), `scenes[]`, `audio` (music choice).
- Scene: `{ id, type, narration, props, cues[] }`.
- **Duration is derived from narration audio**, never specified.
- **Cues key off words**: `{ atWord, do, ... }` resolves to a timestamp from word timings. Re-recording with another voice re-times everything.
- Validation rules:
  - Total narration length 55-60s.
  - Chart series have >= 2 points and no NaN.
  - Every number rendered on screen references a `facts.json` entry with a source; the renderer refuses unsourced numbers.
  - Variety check: no 3 identical scene types in a row.

Consequences: the renderer is buildable and testable with hand-written storyboards and no LLM; the LLM cannot invent layouts.

## 4. Motion design system

All tokens live in `src/design/`.

- **Palette**: one deep ground color per video plus 3-4 saturated flat colors with fixed semantic roles (positive, negative, neutral, highlight). Gains and losses are never decorative.
- **Type**: one heavy display grotesk (headlines, numerals) and one clean sans (labels), both free Google Fonts via `@remotion/google-fonts`. Numerals are the hero element.
- **Depth without gradients**: hard offset shadows, overlapping color blocks, parallax layers.
- **Safe zones**: top ~8% and bottom ~20% clear of platform UI; captions in a fixed lane.

### Motion rules (enforced via shared primitives)
1. Springs (light overshoot) for objects; precise ease-out with **no overshoot** for data values.
2. Nothing is static: every scene has entrance, sustain motion (drift, pulse or camera push) and exit.
3. Staggered entrances, 3-5 frames apart.
4. Continuity between scenes: shape wipes and matched elements carried across cuts.

### Dynamic charts
Charts are pure functions of `(data, frame)`, built with SVG and d3 math (`d3-scale`, `d3-shape`, `d3-geo`).
- Lines draw on with a leading dot; the Y axis rescales smoothly as data appears.
- Bars grow and re-sort (bar race); values count up via interpolation.
- Callout annotations pop in exactly on their cue word.
- Camera pushes in on the key segment.

### Scene library (v1)
`line-chart`, `bar-chart` / `bar-race`, `big-number`, `kinetic-text`, `timeline`, `map` (history; free `world-atlas` data), `compare`, `quote`, `title` / `outro`. Nothing beyond this until real videos demand it.

### Performance constraint
Target machine is an Intel Mac (8 cores, 16 GB). Remotion renders each frame in headless Chrome, so avoid heavy blur/filter effects; use flat shapes and transforms. Render 1080x1920 at 30fps.

## 5. Voice, timing and captions

Synced visuals require word-level timestamps.

- First choice: **Edge TTS** (free, no key) if word boundaries are usable.
- Fallback: **Kokoro** (local, free) plus **whisper.cpp** forced alignment.
- **Spike result (2026-10-06, see `spikes/RESULTS.md`)**: Edge TTS `WordBoundary` works and is accurate for plain words, but any phrase containing digits is merged into a single event (e.g. "$1.5 trillion to $700 billion"). Decision: use Edge TTS and add a normalizer that splits merged events per token (duration distributed by character length). If cue accuracy on numbers proves too coarse, fall back to spoken-form pre-normalization or whisper.cpp alignment. The schema is unaffected.

Captions render inside Remotion (`@remotion/captions`), share the design tokens, animate word by word with the active word highlighted, and sit in the safe-zone lane.

## 6. Audio finish

ffmpeg: music bed ducked under narration, loudness-normalized to -14 LUFS. Music comes from a small bundled royalty-free library with each track's license recorded. No API needed.

## 7. Claude Code skill (`skill/`)

1. Topic -> research notes -> `facts.json` with sources.
2. Facts -> script (~150 words for 60s) -> storyboard JSON, using the template catalog and curated example storyboards as few-shot context.
3. Schema validation with automatic repair loop.
4. Render, then hand over the MP4 plus a review sheet (stills of every scene and the fact list).

A **human review gate** sits before the final render, since the content is finance and investing.

## 8. Build order

Each milestone ends in something watchable.

1. **Spike**: word timings from Edge TTS or Kokoro; Remotion render-time measurement on this Mac.
2. **Foundation**: design tokens, motion primitives, schema, 10s hello-world render.
3. **Charts first**: `line-chart`, `bar-race`, `big-number`. The animation quality bar is proven here before any breadth.
4. **Text and layout scenes**: `kinetic-text`, `compare`, `quote`, scene transitions.
5. **History scenes**: `timeline`, `map`.
6. **Audio finish**: captions, music ducking, loudness.
7. **Skill**, then first real 60s videos: one finance, one investing, one history.

## 9. Project structure

Organized by feature; files under 800 lines.

```
src/design/      tokens, motion primitives
src/scenes/      one folder per template
src/schema/      storyboard + facts contracts
src/pipeline/    voice, captions, ffmpeg steps
skill/           Claude Code skill
docs/superpowers/specs/
```

## 10. Testing (TDD, 80% coverage on non-visual logic)

- Schema tests on valid and invalid storyboards.
- Timing tests: `atWord` resolves correctly against fixture word timings.
- Still-frame snapshot per scene template at key frames (style regressions fail the build).
- Golden end-to-end render of a hand-written storyboard: assert duration, resolution, audio presence, loudness.

## 11. Risks

| Risk | Mitigation |
|---|---|
| Edge TTS merges number phrases into one word event | Splitting normalizer (Plan 2); fallbacks: spoken-form pre-normalization, whisper.cpp alignment |
| Render time on Intel CPU | Measured: ~0.1 s/frame, so a 60s video renders in ~3 min plus ~50 s encode. Acceptable |
| Remotion's bundled ffmpeg crashes on macOS 12 | Render JPEG image sequences (`--sequence` / `renderFrames`) and encode with system ffmpeg (`src/pipeline/encode.ts`). Moving to macOS 13+ would remove the need |
| LLM storyboards look repetitive | Curated examples; variety check in schema |
| Wrong numbers in finance content | `facts.json` traceability; human review gate |
| Remotion license | Free for individuals and small teams; re-check terms before commercial scale-up; Revideo as fallback |

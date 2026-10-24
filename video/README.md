# Opener clips

Each chapter with `intro.clip` lines in its registry entry (`src/content/<module>/module.ts`) has a short silent clip, shown above step 1 (`src/components/story/ChapterClip.tsx`). This folder holds the HyperFrames project for each one; the rendered files live in `public/video/<module>/<chapter>.{mp4,jpg,vtt}` and are committed.

**Do not edit the projects here.** `pnpm clips` generates them:

1. `src/dev/clip.astro` draws each clip's keyframes with the site's own scene code, one keyframe per clip line.
2. `scripts/clips.mjs` builds the site with the dev pages, writes `video/<module>/<chapter>/index.html` (one beat per line: the keyframe fades in, the line under it), writes the captions (`.vtt`), runs `hyperframes check`, renders the MP4 and cuts the poster with ffmpeg.

Change a clip by changing its lines in the registry or its keyframes in the dev page, then run `pnpm clips <chapter-id>` (several ids, or none for every clip; `--no-build` reuses the last build) and commit the outputs.

| Setting | Value |
|---|---|
| HyperFrames CLI | `hyperframes@0.8.191`, through `npx` (not a dependency) |
| Size, rate | 1280 × 720, 30 fps, H.264 |
| CRF | 30: a 20 s clip is about 0.5 MB; the cap is 1 MB a clip, 6 MB a module |
| Lines | at most 10 words; each holds 1.4 s plus 0.32 s a word (at least 2.8 s) |
| Poster | the frame 0.4 s after the last line ends: the whole picture, no line under the player's controls |

Rendering needs FFmpeg and Chrome. CI never renders; `tests/unit/clips.test.ts` checks the committed files.

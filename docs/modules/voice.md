# Voice (`/voice/`)

Decisions for this module only; the shared rules are in `AGENTS.md`.

## Picture

- **The phone desk** (`src/components/scenes/phoneScene.ts`): a telephone (the caller's line) in front, an ear (speech-to-text) behind it, the model (RAG's LLM block, composed) at the back and a mouth (text-to-speech) in front of the model, joined in a loop by Tool calling's belts (`beltAt`). What is said rides the belts: the caller's voice as a sound bubble to the ear, the transcript as a paper card to the model (flagged when speech-to-text was unsure), the reply as a card to the mouth and the spoken reply as a bubble back to the phone; the busy station is lit, and a stopwatch in the middle shows the wait. A caller cutting in rides beside the reply (TALKING OVER), and with barge-in the mouth reads STOPPED. Speech-to-speech folds the ear and the mouth into one model on one belt, sound both ways. `VoiceStage` (`src/content/voice/kit.tsx`) puts it one tab from the Timeline (`callTimeline.ts`: a lane each for the caller and the assistant, each turn drawn from its clip's envelope, the end of turn and the assistant's stop marked; arrow keys read each turn and the gap before it). Chapters 2–4 and 7 keep the tab in the step state; on phones the pills keep short names and the caption carries the times.
- **Hero object:** the ear as a gramophone whose brass horn listens toward the phone, and the mouth as a horn loudspeaker on a cobalt amplifier (its lip turns tomato when stopped); the phone is a desk telephone with a dial and a curly cord, and the stopwatch has a crown, bow and pusher.

## Engine (`src/lib/voice/`)

- **Speech generated once, turn detection live, transcripts and replies recorded** (KTD11). Every line of Larkspur's calls is in `data/voice/script.json`. The clips in `public/data/voice/` (21, mono MP3) and their envelopes in `data/voice/envelopes.json` are committed one-time assets: generated once by `scripts/record-voice.mjs`, which reads its key from the environment only, held within 800 KB by `tests/unit/voice-engine.test.ts`, and never regenerated in CI.
- **Envelopes are 20 ms frames** (`turns.ts`): each clip's RMS energy × 1000 per frame, and where each part's speech starts and ends, read off the clean speech before any line hum is mixed in, so where the caller really stopped is known exactly.
- **End-of-turn detection runs live over the envelopes** (`detect()`): a frame at or above the energy threshold is speech; once the caller has spoken, a run of quiet frames as long as the silence setting ends the turn; a line that never goes quiet ends when the host gives up (`giveUpMs`). Thresholds and silences step over finite lists (`THRESHOLDS`, `SILENCES`).
- **Transcripts and replies are recorded** (`data/voice/transcripts.json`, written for this site), keyed by the call and by what the model heard: how many parts of the caller's turn were finished when the detector fired, then the call's own detail (where the caller cut in and whether the host stopped, or the read-back policy). Every chapter control has a finite domain (`DOMAINS`, and `WORKBENCH_DOMAINS` for chapter 7), and `tests/unit/voice-coverage.test.ts` fails on a missing or unreachable recording, a key twice, or past the budget of 20.
- **Waits are summed, not measured** (`latency.ts`): speech-to-text, the model's first token, its tokens (the site's BPE, live) and text-to-speech, with or without streaming, from Larkspur's planning numbers in `data/voice/calls.json` `host`. The stage times and the 2 s dead-air limit are Larkspur's illustrative numbers, not any provider's; the copy says so wherever a wait is shown.
- **One clip player** (`audio.ts`, `src/components/story/ClipPlayer.tsx`): one shared audio element for the page, made on the first press. Nothing ever autoplays; starting a clip stops any other; the stage stops it when the step changes and a button stops its clip when it unmounts. Every clip button shows its words as a caption, always, so the sound is optional; a clip that can't load falls back to its words with "Sound unavailable".
- **Chapter 7's workbench** (`workbench.ts`): a line setting (threshold, silence, streaming, barge-in, read-back) run over every call. The puzzle accepts every plan with the fewest problems at the least total wait (`WINNERS`), not one hand-picked answer.
- **Facts about voice agents** come from `data/voice/facts.json` with source and access date; the human turn gap (Stivers et al., 2009) is read from the paper's full text on PMC. Every chapter shows at least one. Provider settings and ElevenLabs's vendor-reported waits are moving facts: re-check them whenever the module changes.

## Toy vs real

The stage times stay Larkspur's planning numbers (labelled by `PlanNote`): the workbench's `WINNERS` and every recorded wait are summed from them, and no single provider's figures describe all four stages. Chapter 2 sets ElevenLabs's vendor-reported waits and the human gap beside them. Transcripts and replies are recorded and labelled by `RecordedNote`; they are never re-recorded.

| Chapter | Number shown | Real figure (fact id) | Matched, labelled or real |
| --- | --- | --- | --- |
| 1 Phone line | none (recorded transcript and reply only) | `openai-chained` | labelled (`RecordedNote`) |
| 2 Latency budget | wait for silence (from the live detector) | – | real (detector over the clip) |
| 2 Latency budget | speech-to-text 200 ms, model's first word piece 350 ms, 15 ms per word piece, text-to-speech start 150 ms, its speed 0.3 × real time; Dana's total wait, streaming's saving, when writing ends | `elevenlabs-latency`, `stivers` | labelled (`PlanNote`, `host` in `calls.json`) |
| 2 Latency budget | word pieces in the reply and its first sentence | – | real (the site's BPE, live) |
| 3 Whose turn | silence settings 300/500/800/1200 ms, energy thresholds 10/30/50 (site units, 20 ms frames) | `openai-vad-settings`, `gemini-silence` | labelled (finite toy lists; units named in the copy) |
| 3 Whose turn | Larkspur's pick, 800 ms | `gemini-silence` (`value`) | matched (`NOISY_SILENCE`) |
| 3 Whose turn | how far before or after Ravi's last word the turn ended | – | real (detector over the clip) |
| 3 Whose turn | 2 s dead-air limit, 3 s give-up | `stivers` | labelled (`PlanNote`) |
| 4 Interrupted | where Dana cuts in (clip times on the Timeline) | `gemini-interrupt` | real (clip envelopes) |
| 5 Mishearing | the misheard order number | `earnings21-names` | labelled (`RecordedNote`) |
| 5 Mishearing | read-back's cost | – | labelled (planning numbers plus clip lengths, `PlanNote`) |
| 6 One or three | none | `openai-chained` / `openai-s2s`, `gemini-transcripts`, `openai-vad-default`, `gemini-audio` | – |
| 7 Workbench | problems per line, total and per-call wait, the number of best lines | `maier-eot` | labelled (summed from planning numbers; `WINNERS` computed) |
| Intro | Ravi's wait, 300 ms, five calls, 208 ms | `stivers` (`value`) | labelled, except 208 ms (real) and the call count (data) |

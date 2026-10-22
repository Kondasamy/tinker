---
format: 1080x1080
duration: 15s
message: "Don't read about it. Play it."
arc: Demo loop — predict → feed → see → type → count → CTA
audience: Product managers, engineers and analysts scrolling X / LinkedIn
mode: autonomous
music: none
---

## Video direction

- **palette / type** (frame.md): overlays only — ink cursor, orange (`#EF6A4C`) click ripple, yellow (`#FFB627`) label chips and stamps with 5px ink borders and hard offset shadows, Archivo Black uppercase labels, JetBrains Mono for the URL pill. The footage itself is the real site and is never restyled.
- **motion grammar**: everything lands on the click. Cursor glides in on `power3.out` and settles ~0.1s before each click; the press is a quick scale 1 → 0.85 → 1; the ripple ring expands and fades in ~0.35s; label chips snap in (one small overshoot allowed per chip) on the click or the cut. Footage cuts are already in the video (hard cuts on half-beats) — never animate the video element itself.
- **negative list**: no narration text, no captions, no gradients, no blurred shadows, no breathing loops; overlays never cover the footage's action (the button being clicked, the tile row).

## Frame 1 — Play the chapter

- scene: The real Tokens chapter being played — predict, feed the sentence, open the Tokens row (21 tiles), type "Tinker turns jargon into pictures", count it (19 tiles) — with a drawn cursor, click ripples and label chips
- voiceover: ""
- duration: 11.5s
- transition_in: cut
- status: animated
- src: compositions/frames/01-play.html
- type: feature_showcase
- persuasion: Show-don't-tell proof
- beat: curiosity → delight
- blueprint: cursor-ui-demo (Adapt)
- focal: assets/footage.mp4
- roles: footage.mp4 = [video] background, full-frame, undimmed (declare it as the approved frame video: data-frame-video="approved", x 0, y 0, width 1080, height 1080, fit cover, data-start 0, data-duration 11.5)
- sfx: host clicks at each click time + typing (already in audio_meta)
- asset_candidates: assets/footage.mp4 — [video] the edited real recording of the live Tokens chapter 1, 11.5s

Adapt: keep the custom cursor driving a real UI; the UI is real footage (already cut and punched in), so the cursor and every overlay sit on top at the measured click points below (frame coordinates, 1080² canvas, times in seconds from frame start). Cursor: a drawn ink arrow (cream fill, 5px ink outline, hard ink offset shadow), ~56px tall, tip at the click point. It is visible only around each click: appears 0.45s before at (click + 140, +110), glides to the click, presses at the click time, lingers 0.3s, then fades. One orange ripple ring per click, centred on the point.
Scene 1 (0.0–1.5s): footage of the prediction card. Yellow chip "PREDICT FIRST" snaps in top-left at 0.2s. Click "predict" at t=1.105 (x 806, y 886).
Scene 2 (1.5–2.0s): click "feed" at t=1.885 (x 782, y 941); chip swaps to "FEED IT IN" on the click.
Scene 3 (2.0–4.5s): the press cuts the sentence into tiles (footage, picture punch-in). Chip holds "FEED IT IN"; nothing else — let the press play.
Scene 4 (4.5–7.0s): click the Tokens tab at t=4.789 (x 310, y 199); the tile row appears; on 5.1s a big yellow stamp "21 TOKENS" slams into the empty paper lower-centre (rotated −4°, ~y 600–760). Chip clears at the cut.
Scene 5 (7.0–9.0s): click the text box at t=7.098 (x 806, y 865); the text types itself (footage). Chip "TYPE YOUR OWN" snaps in top-left at 7.2s. Cursor fades during typing.
Scene 6 (9.0–9.5s): click "Count my text" at t=9.299 (x 698, y 941).
Scene 7 (9.5–11.5s): the new row, 19 tiles; on 9.7s the stamp "19 TOKENS" slams in at the same spot as "21 TOKENS" (rotated +3°), and a small ink pill "YOUR WORDS, LIVE" snaps under it at 10.2s; hold.

## Frame 2 — CTA

- scene: The green cube logo springs in, TINKER, "PLAY WITH HOW TECH WORKS", Free · No sign-up chips, tinker.kondasamy.com
- voiceover: ""
- duration: 3.5s
- transition_in: zoom-through
- status: animated
- src: compositions/frames/02-cta.html
- type: cta
- persuasion: Risk reversal (free, no sign-up)
- beat: confidence + urgency-to-act
- blueprint: logo-assemble-lockup (Adapt)
- focal: assets/favicon.svg
- roles: favicon.svg = hero mark, centred top
- asset_candidates: assets/favicon.svg — Tinker logo, green isometric cube with a yellow circle on top

Adapt: the series end card. Start from ../tinker-launch/compositions/frames/06-cta.html (same lockup), rename ids to 02-cta, compress to 3.5s; chrome pill reads "02 / 02".
Scene 1 (0.0–0.6s): cube springs in; TINKER rises letter by letter.
Scene 2 (0.6–1.4s): ink tagline bar wipes open: "PLAY WITH HOW TECH WORKS".
Scene 3 (1.4–2.0s): FREE then NO SIGN-UP chips pop on the beat (1.5s, 2.0s).
Scene 4 (2.0–3.5s): URL pill fades up at 2.2s; hold to the end.

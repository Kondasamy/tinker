---
format: 1920x1080
duration: 15s
message: "Don't read about it. Play it."
arc: Demo loop — predict → feed → see → type → count → CTA
audience: Product managers, engineers and analysts
mode: autonomous
music: none
---

## Video direction

- **world**: Tinker's chapter page, redrawn as a poster-style stage at 1920×1080 — NOT a screenshot. Cream ground; ink 5–6px borders and hard ink offset shadows; Archivo Black for labels/stamps, JetBrains Mono for UI copy (the site is all mono), Space Grotesk only for the typed text. Accents rationed: yellow (`#FFB627`) = the primary button + chips/stamps; ink-filled = a chosen option; orange (`#EF6A4C`) = click ripple. Token tiles use the site's cycle: yellow `#F4B829`, blue `#76A0E2`, green `#93D3B0`, pink `#F3A6BB`, tomato `#EF6A4C` (tile i gets colour i mod 5 in that order), ink border, piece on top (a leading space shown as "␣"), id under it in small mono.
- **one continuous stage** across frame 1: the press stays on the left, the step card on the right; nothing cuts — content inside the card swaps (hard cut on the click) and the tile rows grow in place. Camera moves are gentle push-ins only (≤ 1.15×) and settle; no pans in the back half.
- **cursor**: a drawn ink arrow (cream fill, 5px ink outline, hard ink shadow), ~64px; it glides on `power3.out`, settles ~0.1s before each click, presses (scale 1 → 0.85 → 1); one orange ripple per click. Click times are FIXED by the audio (sfx already placed): 1.105, 1.885, 4.789, 7.098, 9.299 s — each click must land exactly then, on its target.
- **negative list**: no screenshots, no real browser chrome, no emoji, no gradients, no blurred shadows, no breathing loops, nothing below y = 1000.

## Frame 1 — Play the chapter

- scene: The Tokens chapter played on a drawn stage — predict, feed the sentence to the press, the tiles land (21), open the Tokens row, type your own text, count it (19) — with a cursor, ripples and label chips
- voiceover: ""
- duration: 11.5s
- transition_in: cut
- status: animated
- src: compositions/frames/01-play.html
- type: feature_showcase
- persuasion: Show-don't-tell proof
- beat: curiosity → delight
- blueprint: cursor-ui-demo (Adapt)
- focal: assets/logo-fef9bb9f.svg
- roles: logo-fef9bb9f.svg = cutout, the press, left half (~x 60–900, y 160–760); the step card (HTML) = right half (~x 1000–1860, y 140–900)
- asset_candidates: assets/logo-fef9bb9f.svg — Tinker's TOKENIZER press: a TEXT strip feeding a press that drops coloured token tiles onto a belt

Adapt: keep a custom cursor driving a UI through clicks; the UI is a poster-style rebuild of the real chapter (copy below is the site's own). Layout: top-left a small mono crumb "TINKER / TOKENS · CH 1 — WHAT THE MODEL READS"; top-right a yellow chip that carries the beat label (PREDICT FIRST → FEED IT IN → TYPE YOUR OWN). Left: the press drawing, big. Right: the step card (cream-2, 6px ink border, hard shadow) with a mono "STEP N OF 4" kicker.
Scene 1 (0.0–1.5s): card = STEP 1 OF 4, the question "How many tokens will the tokenizer cut “Your order of 12 shelves arrives on Friday.” into? It has 8 words." and three option buttons: "Fewer than 8: one token can hold several words", "Exactly 8: one token per word", "More than 8: some words are cut into pieces". Chip "PREDICT FIRST" snaps in at 0.15s. Cursor glides in from the lower right and clicks "More than 8" at t=1.105 → it fills ink (cream text), a green mono stamp "LOCKED IN" appears under the options.
Scene 2 (1.5–2.0s): the yellow primary button "Feed the sentence to the tokenizer" is under the options (visible from 1.2s); cursor moves to it and clicks at t=1.885; chip swaps to "FEED IT IN".
Scene 3 (2.0–4.5s): the press works — a paper strip with the sentence slides into the press (an HTML strip over the drawing's TEXT end), and on the beat (2.2s onward) the 21 tiles drop out in order onto a belt row that runs along the bottom of the stage (y ~800–900, full width, tiles ~64px tall showing piece + id), staggered fast (~0.09s each). A count pill "21 TOKENS · 8 WORDS" appears at the row's right end at 4.2s. Card swaps to STEP 3 OF 4 ("8 words became 21 tokens.") at 2.1s.
Scene 4 (4.5–7.0s): a tab pair "Picture | Tokens (21)" sits on the press area's top edge (visible from 4.2s); cursor clicks "Tokens (21)" at t=4.789 → the left area swaps from the press to the big Tokens view: the same 21 tiles, large (~110px), wrapped in two rows on the left half; at 5.1s a big yellow stamp "21 TOKENS" slams in below them (rotated −4°, the one overshoot). The bottom belt row stays.
Scene 5 (7.0–9.0s): card = "Your text" with a mono text box (holding the sample sentence, selected) and a yellow "Count my text" button. Cursor clicks the box at t=7.098; the box clears and "Tinker turns jargon into pictures" types in 7.12–8.95 (≈ 18 chars/s, caret visible). Chip "TYPE YOUR OWN".
Scene 6 (9.0–9.5s): cursor moves to "Count my text" and clicks at t=9.299.
Scene 7 (9.5–11.5s): the big Tokens view rebuilds with the 19 new tiles (fast stagger), "Tokens (19)" on the tab, the stamp swaps to "19 TOKENS" (rotated +3°), and an ink pill "YOUR WORDS, LIVE" snaps under it at 10.1s; the card shows "Your text: 19 tokens for 5 words and 33 characters." Hold.
tiles_21 (piece:id, in order): Y:89 our:411 ␣order:377 ␣of:319 ␣1:530 2:50 ␣shel:633 v:118 es:266 ␣a:257 r:114 r:114 i:105 v:118 es:266 ␣on:305 ␣F:501 r:114 id:337 ay:299 .:46
tiles_19 (piece:id, in order): T:84 in:260 k:107 er:258 ␣t:256 urn:471 s:115 ␣:32 j:106 ar:271 g:103 on:267 ␣int:729 o:111 ␣p:268 ic:291 t:116 ure:766 s:115

## Frame 2 — CTA

- scene: The cube logo springs in, TINKER, "PLAY WITH HOW TECH WORKS", Free · No sign-up, tinker.kondasamy.com — the series end card at 16:9
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
- roles: favicon.svg = hero mark
- asset_candidates: assets/favicon.svg — Tinker logo, green isometric cube with a yellow circle on top

Adapt: start from ../tinker-clicks/compositions/frames/02-cta.html (the 1:1 version, same timings) and re-lay it for 1920×1080: cube left of a big TINKER wordmark (one row), tagline bar, chips and URL pill centred beneath. Same Scene timings: cube + letters 0–0.6s, tagline wipe 0.62s, chips 1.5s / 2.0s, URL 2.2s, hold.

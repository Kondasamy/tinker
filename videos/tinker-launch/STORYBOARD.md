---
format: 1080x1080
duration: 35s
message: "Tech concepts you can play with. Free, no sign-up."
arc: Demo Loop — question (jargon) → answer (pictures) → demo cycle (predict → reveal) → breadth (workshop) → CTA
audience: Product managers, engineers and analysts at companies adopting new tech
mode: collaborative
music: none
---

## Video direction

- **palette system** (frame.md): cream ground; ink for all type, borders and hard offset shadows; accents rationed per frame — yellow (`#FFB627`) the hero block, green (`#71B693`) "done / go", pink (`#F3A6BB`) secondary, orange (`#EF6A4C`) the one alarm (?, strike, +80% stamp), blue (`#76A0E2`) only inside token tiles. Token tiles cycle yellow · green · blue · orange · pink, the Tinker Tokens colours.
- **type**: display = Archivo Black uppercase; chrome / labels = JetBrains Mono; sentences = Space Grotesk; Hindi = Noto Sans Devanagari (shipped in assets/fonts). Every frame keeps the mono chrome (TINKER left, NN / 06 pill right) static — it is the one constant.
- **motion grammar + reveal model**: punchy but clean — fast arrivals on `expo.out` / `power3.out`, hard-cut word swaps, hard offset shadows that "land" (shadow grows from 0 to full offset as the block settles). Every piece reveals on its spoken word (timings are frame-relative word starts from audio_meta); nothing dumps at t=0. No bounce / elastic; the only overshoot allowed is a small playful stamp slam (+80%, ?, 17 card) — max one per frame.
- **rhythm / holds**: frames 1–2 fast (a reveal every ~0.4–1s); frame 3 tension (countdown ticks, then a held beat); frame 4 payoff; frame 5 the one big camera move (zoom-out); frame 6 calm held end card (the only real exit — none, it just holds).
- **negative list**: no gradients, no blurred shadows, no rounded cards (pills only), no floating bokeh / AI glow, no breathing loops, no slow back-half pans, no visible narration sentences, nothing below y = 896 (caption band). No slideshow (front-load then freeze), no screensaver (many things drifting at once).

## Frame 1 — Jargon hook

- scene: Three buzzwords slam onto warm paper one at a time, then a line asks if you've ever seen one
- voiceover: "RAG. KV cache. Prompt injection. You've heard them. Ever seen one work?"
- duration: 4.405s
- transition_in: cut
- status: animated
- src: compositions/frames/01-jargon-hook.html
- type: hook
- persuasion: Pain validation (jargon fatigue)
- beat: curiosity + mild frustration
- blueprint: kinetic-type-beats (Adapt)
- focal: none (typography-only)
- roles: none
- asset_candidates:

narrativeRole: stop the scroll with words the audience hears in every meeting but can't picture.
keyMessage: you know the words, not the mechanics.

Adapt: keep the beat-slam (each word its own percussive entrance, `kinetic-beat-slam`); three blocks stack instead of swapping in place, the "?" is the finale.
Scene 1 (0.0–0.38s): bare cream + chrome; the yellow "RAG." block scale-slams in from 1.4→1 with its hard shadow landing — upper-left, ~35% of frame.
Scene 2 (0.38–1.34s): on "KV", the green "KV CACHE." block side-snaps in from the right, tilted, below RAG.
Scene 3 (1.34–2.38s): on "Prompt", the pink "PROMPT INJECTION." block rise-rotates in from below, lower-left — the stack now fills the frame, asymmetric zig-zag.
Scene 4 (2.38–3.8s): "you've heard them" — the three blocks get a quick ink shake (one short positional ink-shake, 2 cycles, no glitch) like a nervous nod; nothing new enters.
Scene 5 (3.8–4.4s): on "work?", the orange "?" circle slams in upper-right (the one playful overshoot) and holds.

## Frame 2 — Jargon → picture

- scene: Each buzzword gets struck through and the hand-drawn Tinker picture that explains it crashes in to replace it — RAG, KV cache, prompt injection
- voiceover: "RAG? It looks things up before it answers. KV cache? Notes the model keeps, so it never re-reads your prompt. Prompt injection? An email that tricks your assistant."
- duration: 10.594s
- transition_in: crossfade
- status: animated
- src: compositions/frames/02-jargon-picture.html
- type: product_intro
- persuasion: Show-don't-tell proof
- beat: curiosity → clarity
- blueprint: ticker-takeover (Adapt)
- focal: assets/logo-c7a72d0c.svg → assets/logo-a6693fec.svg → assets/logo-07376ed8.svg (one per pair)
- roles: each SVG = cutout, the hero inside the picture card; no background
- asset_candidates: assets/logo-c7a72d0c.svg — RAG pipeline: DOCS → RETRIEVER · TOP 3 → LLM; assets/logo-a6693fec.svg — server block with KV shelf of three blue boxes, SERVER pill; assets/logo-07376ed8.svg — mail room: INBOX, MAIL ROOM, HOST APP, MODEL, ORDER SYSTEM, OUT

narrativeRole: the promise lands — each abstract term becomes a picture you can read in a second.
keyMessage: Tinker turns jargon into pictures.

Adapt: keep the signature "option cycles, then the hero crashes in and replaces it": here the cycling slot is the jargon word, the hero is its drawing; three rounds, the chip row on top tracks progress.
Layout (all rounds, as the confirmed sketch): chip row top (RAG · KV CACHE · PROMPT INJECTION), the word as a display headline under it, the yellow gloss badge right, the big ink-bordered picture card 70–1010 × 330–870.
Scene 1 (0.0–0.9s): chip "RAG" goes ink-filled; headline "RAG" hard-cuts in; the card is empty cream.
Scene 2 (0.9–2.8s): on "looks things up", the orange strike draws across "RAG" (`css-marker-patterns` strike/scribble) and the RAG pipeline drawing crashes into the card (scale 0.6→1, expo.out, slight -2° rotate settle); gloss badge "= LOOK IT UP FIRST" snaps in.
Scene 3 (2.8–4.1s): on "KV", hard-cut swap (`discrete-text-sequence`): RAG chip goes done (struck, 45% opacity), KV CACHE chip lights, headline swaps to "KV CACHE", the previous drawing zoom-throughs out (cut-catalog) leaving the card empty for a beat.
Scene 4 (4.1–7.3s): on "Notes", the KV server drawing crashes in; strike draws; gloss "= THE MODEL'S NOTES".
Scene 5 (7.3–8.6s): on "Prompt", swap again — chips advance, headline "PROMPT INJECTION", card empties.
Scene 6 (8.6–10.6s): on "email", the mail-room drawing crashes in; strike draws; gloss "= A TRAP IN THE MAIL"; then on "tricks" the mail room's INBOX corner gets one orange hand-drawn circle (`css-marker-patterns` circle) and holds.

## Frame 3 — Predict

- scene: A quiz card: the same order message in English and in Hindi, the question "Which costs the model more tokens?", two pick buttons, a 3-2-1 countdown
- voiceover: "Quick test. Same message, English or Hindi. Which costs the model more tokens?"
- duration: 5.638s
- transition_in: zoom-through
- status: animated
- src: compositions/frames/03-predict.html
- type: feature_showcase
- persuasion: Active participation (commit before reveal)
- beat: tension
- blueprint: compose
- focal: the two option cards
- roles: assets/logo-fef9bb9f.svg = supporting (the tokenizer press, bottom centre, shown large and cropped to its board — fix the sketch's rough crop: no hard cut edge visible, fade or fit the whole board)
- handoff_out: option cards — card A left 70 top 300 w 940, card B left 70 top 530 w 940, scale 1, opacity 1, static (no motion) at the cut; kicker block left 56 top 122, static.
- asset_candidates: assets/logo-fef9bb9f.svg — TOKENIZER press turning white text into a row of coloured token tiles

narrativeRole: the viewer plays a chapter — they commit to a guess before the answer.
keyMessage: you learn by predicting first.
facts: English "Your order of 12 shelves arrives on Friday." = 10 GPT-4o tokens; Hindi "आपका 12 शेल्फ़ का ऑर्डर शुक्रवार को पहुँचेगा।" = 18 GPT-4o tokens (data/tokens/encodings.json, recorded o200k_base).

Scene 1 (0.0–0.9s): "Quick test" — the ink kicker "PREDICT" snaps in, then the "MORE TOKENS?" headline per-word reveals (`dynamic-content-sequencing`).
Scene 2 (0.9–3.1s): on "Same message", card A (ENGLISH) slides up into place with its shadow landing; on "Hindi" (3.09) card B follows.
Scene 3 (3.1–4.7s): on "Which costs", the tokenizer press rises in at the bottom; the yellow countdown circle pops in upper-right showing 3.
Scene 4 (4.7–5.64s): countdown hard-cuts 3 → 2 → 1 (`discrete-text-sequence`), each tick with a small press (`press-release-spring`); both cards' A/B tags pulse once in turn as if being considered; hold on 1 at the cut.

## Frame 4 — Reveal

- scene: The two sentences break into coloured token tiles; counters tick to 10 and 18; a REVEAL stamp lands on Hindi; "That's every chapter." 
- voiceover: "Hindi. Eighteen tokens to English's ten. Guess first, then see why. That's every chapter."
- duration: 5.531s
- transition_in: cut
- status: animated
- src: compositions/frames/04-reveal.html
- type: benefit_highlight
- persuasion: Surprise + Show-don't-tell proof
- beat: surprise → clarity
- blueprint: dataviz-countup (Adapt)
- focal: the two count numbers (10, 18)
- roles: none beyond the cards (the tokenizer press is gone — the tiles ARE the tokenizer's output)
- handoff_in: option cards — card A left 70 top 300 w 940, card B left 70 top 530 w 940, scale 1, opacity 1, static at the cut; kicker block left 56 top 122, static. (Card heights may grow as tiles wrap — grow downward only.)
- asset_candidates: assets/logo-fef9bb9f.svg — TOKENIZER press with coloured token tiles

narrativeRole: the payoff of the guess, and the reveal that this is how the whole site teaches.
keyMessage: guess, then see why — every chapter works like this.

Adapt: keep the count-up as the payoff; two counters race instead of one, the tiles are the "chart".
Scene 1 (0.0–0.55s): hard cut from frame 3: kicker swaps PREDICT → REVEAL, headline swaps to "HINDI." (`discrete-text-sequence`); card B's fill warms to cream-yellow.
Scene 2 (0.55–1.9s): on "Eighteen", card B's sentence splits into its 18 coloured token tiles left→right (staggered tile colour wipe, capped ~0.5s) while the "18 TOKENS" counter counts 0→18 (`counting-dynamic-scale`).
Scene 3 (1.36–2.4s): on "English's ten", card A splits into its 10 tiles and counts 0→10 (smaller, faster).
Scene 4 (2.4–4.2s): on "Guess first", the orange "+80%" stamp slams across the seam between the cards (the frame's one overshoot) — the number is derived: 18/10 = +80%.
Scene 5 (4.2–5.53s): on "every chapter", the green "GUESS FIRST → SEE WHY" block snaps in bottom-left and holds; everything else still.

## Frame 5 — The workshop

- scene: Open tight on one plot, zoom out to the whole hand-drawn workshop board, plots hopping in turn while a counter ticks to 17 and "…and growing" stamps on
- voiceover: "Seventeen modules. Hand-drawn. Build it, break it, fix it. And more on the way."
- duration: 5.031s
- transition_in: crossfade
- status: animated
- src: compositions/frames/05-workshop.html
- type: feature_showcase
- persuasion: Value stacking (breadth)
- beat: awe + excitement
- blueprint: zoom-out-workspace-reveal (Reproduce)
- focal: assets/logo-aaab9ef1.svg (the workshop board)
- roles: logo-aaab9ef1.svg = hero, full composition; assets/og-image.jpg = unused (backup only)
- asset_candidates: assets/logo-aaab9ef1.svg — the full workshop board, one plot per module (AGENTS, RAG, TOKEN, FINE TUNING, MULTIMODAL…); assets/og-image.jpg — the home share image with the workshop

narrativeRole: show breadth — this is one chapter of a whole, growing workshop.
keyMessage: 17 modules, and growing.

Scene 1 (0.0–1.1s): open TIGHT (~2.6×) on the RAG plot of the board (its pill reads RAG); on "Seventeen" the yellow "17 MODULES" card slams in upper-left and its number counts up 1→17 across the zoom (`counting-dynamic-scale`).
Scene 2 (1.1–3.8s): on "Hand-drawn", ONE continuous decelerating zoom-out (`viewport-change`, power3.out / expo.out) to the full board as in the sketch; as it opens, on "Build / break / fix" three plots in turn do a small hop (y −14 → 0, the site's own `hop()` gesture) — RAG, GUARDRAILS, AGENTS.
Scene 3 (3.8–5.03s): on "And more on the way", the pink "& GROWING" badge snaps in beside the 17 card and holds; board locked, no drift.

## Frame 6 — CTA

- scene: The green cube logo springs in, "Tinker" lockup, the tagline and "Free · No sign-up", URL tinker.kondasamy.com holds
- voiceover: "Tinker. Tech concepts you can play with. Free. No sign-up."
- duration: 5.758s
- transition_in: zoom-through
- status: animated
- src: compositions/frames/06-cta.html
- type: cta
- persuasion: Risk reversal (free, no sign-up)
- beat: confidence + urgency-to-act
- blueprint: logo-assemble-lockup (Adapt)
- focal: assets/favicon.svg (the Tinker cube)
- roles: favicon.svg = hero mark, centred top
- asset_candidates: assets/favicon.svg — Tinker logo, green isometric cube with a yellow circle on top

narrativeRole: name it, remove the friction, give the URL.
keyMessage: free, no sign-up, tinker.kondasamy.com.

Adapt: keep "the mark comes to exist, then extends to the URL"; the cube springs whole from zero on a cleared stage, no parts.
Scene 1 (0.0–0.7s): on "Tinker", the cube springs in from scale 0 with a small rotation settle; "TINKER" wordmark rises in under it per-letter (`waterfall-entry`).
Scene 2 (0.7–2.76s): on "Tech concepts", the ink tagline bar wipes open left→right (scaleX, origin left) revealing "TECH CONCEPTS YOU CAN PLAY WITH".
Scene 3 (2.76–3.36s): on "Free", the green FREE chip pops in.
Scene 4 (3.36–4.2s): on "No sign-up", the yellow NO SIGN-UP chip pops in.
Scene 5 (4.2–5.76s): the URL pill "tinker.kondasamy.com" fades up and the whole card holds still to the end (final frame: hold, no exit).

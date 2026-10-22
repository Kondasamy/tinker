---
format: 1080x1080
duration: 40s
message: "Every buzzword in your next meeting is a picture you can play with on Tinker."
arc: Demo Loop — hook (the meeting) → buzzword cycle ×4 (freeze → picture) → breadth → CTA
audience: Product managers and analysts sitting in AI meetings
mode: collaborative
music: none
---

## Video direction

- **palette system** (frame.md): cream ground; ink for type, borders and hard offset shadows; the chat window is cream-2 with an ink header bar. Yellow (`#FFB627`) = the buzzword highlight and the gloss badge (always the same role); blue (`#76A0E2`) = the FREEZE stamp only; avatars carry one accent each (PM yellow, ENG LEAD green, ANALYST blue, CTO pink, YOU orange). Orange (`#EF6A4C`) only for the LIVE dot and YOU.
- **type**: display = Archivo Black uppercase (stamps, glosses, wordmark); chrome / names / header = JetBrains Mono; chat text = Space Grotesk. Mono chrome (TINKER left, NN / 07 pill right) is static in every frame.
- **chat continuity contract (frames 1–5)**: the chat card is ONE object across these cuts — card left 56 top 100 width 956 height 780, header bar 72px, rows inside the card at top 110 / 270 / 430, scale 1, opacity 1, never moves. Only its rows scroll (translateY inside the card, clipped by it). The freeze kit (dim layer over the card body, FREEZE stamp right of the header, the ink stem, the callout card left 96 top 370 w 880 h 480, the yellow gloss badge right of the callout's top edge) lands in the SAME place in frames 2–5.
- **motion grammar**: chat messages arrive like a real chat — the row slides up 24px and fades in on `power3.out`, the rows above push up with it; the freeze is a hard snap (dim + stamp in one beat, stamp slams with the frame's one small overshoot); the callout pops out of the word (scale from the word's position, `expo.out`), the stem draws down first. Unfreeze (frames 3–5 opening): the freeze kit snaps away in ~0.25s as a hard cut. No bounce elsewhere.
- **rhythm / holds**: frame 1 builds; 2–5 accelerate (each freeze faster than the last); frame 6 the one camera move; frame 7 a calm held end card.
- **negative list**: no emoji (no emoji font on the renderer — reactions are "+1 · 3" ink chips), no gradients, no blurred shadows, no rounded cards (pills only), no breathing loops, no slow back-half pans, no narration sentences as visible text (chat messages and glosses are content, not narration), nothing below y = 896.

## Frame 1 — The meeting

- scene: A meeting chat in Tinker's ink style; a typing indicator, then the PM's message lands: "Let's just add an agent for refunds." Everyone else reacts with a 👍 count ticking up
- voiceover: "Your PM just said, let's add an agent. Do you nod along?"
- duration: 3.94s
- transition_in: cut
- status: animated
- src: compositions/frames/01-meeting.html
- type: hook
- persuasion: Pain validation (meeting jargon anxiety)
- beat: anxiety + recognition
- blueprint: typewriter-reveal (Adapt)
- focal: the chat card
- roles: none (typography + UI)
- handoff_out: chat card left 56 top 100 w 956 h 780, scale 1, opacity 1, static; rows at top 110 (ANALYST), 270 (ENG LEAD), 430 (PM, with its +1 · 3 chip) inside the card; "ENG LEAD IS TYPING" row at top 600, its three dots static.
- asset_candidates:

narrativeRole: drop the viewer into a meeting they've sat in.
keyMessage: you've nodded along to words you couldn't picture.

Adapt: keep "someone is typing this" — the PM's line types in live in its bubble with a caret, then sends.
Scene 1 (0.0–0.4s): the chat card is already there with the ANALYST and ENG LEAD rows (a real ongoing meeting); LIVE dot lit; a PM typing row appears at row 3.
Scene 2 (0.4–1.9s): on "just said", the PM's message types in character by character (`discrete-text-sequence` + caret), landing "agent" on the VO's "agent" (1.78s); the caret disappears and the row settles as sent.
Scene 3 (1.9–3.94s): on "Do you nod along", the "+1 · 3" chip pops under the message and its count ticks 1 → 2 → 3 (`discrete-text-sequence`), then "ENG LEAD IS TYPING" fades in with its three dots stepping (finite, index-stepped).

## Frame 2 — Freeze: agent

- scene: The chat freezes (desaturates, a FREEZE stamp), "agent" in the PM's message lights yellow, and a callout card pops out of it holding the agents drawing (desk, host app, model, order system) with the gloss "= A MODEL ON A LOOP"
- voiceover: "An agent is a model on a loop. It plans, calls a tool, checks the result, and goes again."
- duration: 5.986s
- transition_in: cut
- status: animated
- src: compositions/frames/02-agent.html
- type: product_intro
- persuasion: Show-don't-tell proof
- beat: relief + clarity
- blueprint: ticker-takeover (Adapt)
- focal: assets/logo-ab0c3df4.svg
- roles: logo-ab0c3df4.svg = cutout, the hero inside the callout card
- handoff_in: frame 1's landed chat — chat card left 56 top 100 w 956 h 780, scale 1, opacity 1, static; rows at top 110 / 270 / 430 inside the card, typing row at 600; no freeze kit.
- handoff_out: chat card left 56 top 100 w 956 h 780, scale 1, opacity 1, static; the active message at row 1 (top 110 inside the card); the freeze kit fully present and static at the cut.
- asset_candidates: assets/logo-ab0c3df4.svg — agents module card: EMPLOYEE desk, HOST APP, ORDER SYSTEM cabinet, MODEL block on belts

narrativeRole: the first buzzword becomes a picture; the format is set.
keyMessage: an agent is a model on a loop.

Adapt: keep "the hero crashes in and replaces it": the frozen buzzword is the cycling slot, its Tinker drawing the hero that crashes in.
Scene 1 (0.0–0.55s): (this frame's handoff_in is frame 1's landed chat, not the freeze kit — the freeze kit is NOT present at t=0 here) on "An agent", the rows scroll up inside the card so the PM row lands at row 1 and the older rows exit up; the typing row clears.
Scene 2 (0.55–1.42s): on "a model on a loop", FREEZE: the dim layer snaps over the card body, the blue FREEZE stamp slams in, "agent" lights in its yellow box above the dim; the stem draws down from the word; the callout card pops out of the word and the agents drawing settles inside; the yellow gloss "= A MODEL ON A LOOP" snaps in on "loop".
Scene 3 (2.0–4.52s): the loop is walked on the drawing as the VO names it — "plans" → an ink ring on the EMPLOYEE desk, "calls a tool" → ring on HOST APP, "checks the result" → ring on MODEL, "goes again" → ring back on HOST APP (`css-marker-patterns` circle; one ring at a time, each replacing the last).
Scene 4 (4.52–5.99s): hold, still.

## Frame 3 — Freeze: evals

- scene: Chat unfreezes, scrolls; the eng lead writes "Fine, but only with evals." — freeze, "evals" lights, callout pops with the evals grader drawing (v2 · PASSED 7/12), gloss "= TESTS YOUR AI MUST PASS"
- voiceover: "Evals? The test your AI has to pass before it ships."
- duration: 4.134s
- transition_in: cut
- status: animated
- src: compositions/frames/03-evals.html
- type: feature_showcase
- persuasion: Feature-to-benefit translation
- beat: clarity
- blueprint: ticker-takeover (Adapt)
- focal: assets/logo-a3f067c2.svg
- roles: logo-a3f067c2.svg = cutout, the hero inside the callout card
- handoff_in: chat card left 56 top 100 w 956 h 780, scale 1, opacity 1, static; the previous active message sits at row 1 (top 110 inside the card) dimmed; the freeze kit (dim, FREEZE stamp, stem, callout card left 96 top 370 w 880 h 480, gloss badge) is fully present at t=0, static.
- handoff_out: chat card left 56 top 100 w 956 h 780, scale 1, opacity 1, static; the active message at row 1 (top 110 inside the card); the freeze kit fully present and static at the cut.
- asset_candidates: assets/logo-a3f067c2.svg — evals bench: DOCS, RETRIEVER · TOP 3, LLM, grader console "v2 · PASSED 7/12"

narrativeRole: second buzzword, faster.
keyMessage: evals are tests for AI.

Adapt: keep "the hero crashes in and replaces it": the frozen buzzword is the cycling slot, its Tinker drawing the hero that crashes in.
Scene 1 (0.0–0.3s): unfreeze — the freeze kit snaps away (hard cut), the PM row brightens.
Scene 2 (0.3–1.1s): on "Evals?", the ENG LEAD message "Fine, but only with evals." arrives at row 2 and the rows push up so it lands at row 1, the PM row exiting up.
Scene 3 (1.1–2.0s): on "The test", FREEZE (same kit, same place): dim, stamp, "evals" lit, stem, callout with the evals bench drawing, gloss "= TESTS YOUR AI MUST PASS".
Scene 4 (2.0–4.13s): on "pass", an ink ring lands on the "v2 · PASSED 7/12" pill; hold. Nudge so the gloss badge does not cover the drawing's top pill.

## Frame 4 — Freeze: context window

- scene: The analyst writes "Our context window is already full." — freeze, "context window" lights, callout pops with the glass-case window drawing (WINDOW, CACHE), gloss "= ALL IT CAN SEE AT ONCE"
- voiceover: "Context window? Everything the model can see at once. Stuff it full, and answers get worse."
- duration: 5.819s
- transition_in: cut
- status: animated
- src: compositions/frames/04-context.html
- type: feature_showcase
- persuasion: Feature-to-benefit translation
- beat: clarity + surprise
- blueprint: ticker-takeover (Adapt)
- focal: assets/logo-18114ab3.svg
- roles: logo-18114ab3.svg = cutout, the hero inside the callout card
- handoff_in: chat card left 56 top 100 w 956 h 780, scale 1, opacity 1, static; the previous active message sits at row 1 (top 110 inside the card) dimmed; the freeze kit (dim, FREEZE stamp, stem, callout card left 96 top 370 w 880 h 480, gloss badge) is fully present at t=0, static.
- handoff_out: chat card left 56 top 100 w 956 h 780, scale 1, opacity 1, static; the active message at row 1 (top 110 inside the card); the freeze kit fully present and static at the cut.
- asset_candidates: assets/logo-18114ab3.svg — context module: a glass WINDOW case on a desk with a CACHE shelf

narrativeRole: third buzzword, with a counter-intuitive twist (more isn't better).
keyMessage: the window is all it sees — and more isn't better.

Adapt: keep "the hero crashes in and replaces it": the frozen buzzword is the cycling slot, its Tinker drawing the hero that crashes in.
Scene 1 (0.0–0.3s): unfreeze, hard snap.
Scene 2 (0.3–1.2s): on "Context window?", the ANALYST message "Our context window is already full." arrives and pushes up to row 1.
Scene 3 (1.2–2.4s): on "Everything the model can see", FREEZE: dim, stamp, "context window" lit, stem, callout with the glass-case window drawing, gloss "= ALL IT CAN SEE AT ONCE". Nudge so the gloss does not cover the CACHE pill.
Scene 4 (2.72–4.3s): on "Stuff it full", a stack of thin paper slips (cream cards with ink borders, drawn in HTML over the drawing's glass case) piles up inside the case past its rim; on "answers get worse" a small orange "WORSE" stamp lands on the case.
Scene 5 (4.3–5.82s): hold, still.

## Frame 5 — Freeze: fine-tune

- scene: The CTO writes "Can't we just fine-tune it?" — freeze, "fine-tune" lights, callout pops with the training-bench drawing (BASE + ADAPTER, WEIGHTS lever), gloss "= CHANGE THE MODEL ITSELF"
- voiceover: "Fine-tune? Change the model itself, not just the prompt."
- duration: 3.96s
- transition_in: cut
- status: animated
- src: compositions/frames/05-finetune.html
- type: feature_showcase
- persuasion: Rule of four (escalating cadence)
- beat: confidence
- blueprint: ticker-takeover (Adapt)
- focal: assets/logo-f71008c8.svg
- roles: logo-f71008c8.svg = cutout, the hero inside the callout card
- handoff_in: chat card left 56 top 100 w 956 h 780, scale 1, opacity 1, static; the previous active message sits at row 1 (top 110 inside the card) dimmed; the freeze kit (dim, FREEZE stamp, stem, callout card left 96 top 370 w 880 h 480, gloss badge) is fully present at t=0, static.
- asset_candidates: assets/logo-f71008c8.svg — fine-tuning bench: BASE + ADAPTER model wired to three lever stations, WEIGHTS lit

narrativeRole: the last buzzword; the viewer now follows the whole meeting.
keyMessage: fine-tuning changes the model, not the prompt.

Adapt: keep "the hero crashes in and replaces it": the frozen buzzword is the cycling slot, its Tinker drawing the hero that crashes in.
Scene 1 (0.0–0.25s): unfreeze, hard snap.
Scene 2 (0.25–0.9s): on "Fine-tune?", the CTO message "Can't we just fine-tune it?" arrives and pushes up to row 1 — faster than before.
Scene 3 (0.9–1.6s): on "Change the model itself", FREEZE: dim, stamp, "fine-tune" lit, stem, callout with the training bench, gloss "= CHANGE THE MODEL ITSELF".
Scene 4 (1.6–2.7s): on "not just the prompt", an ink ring lands on the WEIGHTS station; hold to the cut.

## Frame 6 — The whole workshop

- scene: The four callouts fly back and dock onto the hand-drawn workshop board, which zooms out to show all 17 plots; "17 MODULES" counts up, "& GROWING" stamps on
- voiceover: "Every one of these is a picture you can play with. Seventeen modules, and growing."
- duration: 5.029s
- transition_in: zoom-through
- status: animated
- src: compositions/frames/06-workshop.html
- type: feature_showcase
- persuasion: Value stacking (breadth)
- beat: awe + confidence
- blueprint: zoom-out-workspace-reveal (Adapt)
- focal: assets/logo-aaab9ef1.svg (the workshop board)
- roles: logo-aaab9ef1.svg = hero, full composition
- asset_candidates: assets/logo-aaab9ef1.svg — the full workshop board, one plot per module

narrativeRole: these four were a corner of the whole workshop.
keyMessage: 17 modules, and growing.

Adapt: keep the one continuous decelerating zoom-out; the frame opens on the four buzzword chips (AGENT, EVALS, CONTEXT WINDOW, FINE-TUNE) in the centre, which then dock beside their modules' pills as the board opens. You may start from ../tinker-launch/compositions/frames/05-workshop.html (video 1's built version of this shot, same board, same layout) and re-time it to this voiceover.
Scene 1 (0.0–0.84s): on "Every one of these", the four yellow chips sit stacked centre-frame (the four buzzwords), board tight behind them.
Scene 2 (0.84–2.42s): on "is a picture you can play with", ONE continuous zoom-out (`viewport-change`) to the full board while each chip flies to its landed spot beside its module pill (AGENTS, EVALS, CONTEXT, FINE TUNING), staggered.
Scene 3 (2.45–3.39s): on "Seventeen modules", the yellow 17 MODULES card slams in upper-left, counting up to 17 (`counting-dynamic-scale`).
Scene 4 (3.39–5.03s): on "and growing", the pink "& GROWING" badge snaps in; hold, board locked.

## Frame 7 — CTA

- scene: The chat returns for one beat: you type "Got it 👍" and it sends; then the cube logo, TINKER, "Free · No sign-up", tinker.kondasamy.com
- voiceover: "Tinker. Walk into your next meeting knowing. Free. No sign-up."
- duration: 5.499s
- transition_in: zoom-through
- status: animated
- src: compositions/frames/07-cta.html
- type: cta
- persuasion: Status seeking + risk reversal
- beat: confidence + urgency-to-act
- blueprint: logo-assemble-lockup (Adapt)
- focal: assets/favicon.svg (the Tinker cube)
- roles: favicon.svg = hero mark, centred top
- asset_candidates: assets/favicon.svg — Tinker logo, green isometric cube with a yellow circle on top

narrativeRole: close the loop on the meeting — now you get it — and give the URL.
keyMessage: free, no sign-up, tinker.kondasamy.com.

Adapt: keep "the mark comes to exist, then extends to the URL". You may start from ../tinker-launch/compositions/frames/06-cta.html (video 1's end card, same lockup) and re-time it; add the YOU reply row.
Scene 1 (0.0–0.46s): on "Tinker", the cube springs in from zero with a small rotation settle; TINKER rises in letter by letter (`waterfall-entry`).
Scene 2 (0.46–1.9s): on "walk into your next meeting knowing", the YOU reply row (orange YO avatar + bubble "Got it. Next meeting's mine.") slides up and sends like a chat message.
Scene 3 (2.68–2.98s): on "Free", the green FREE chip pops in.
Scene 4 (2.98–3.6s): on "No sign-up", the yellow NO SIGN-UP chip pops in.
Scene 5 (3.6–5.5s): the URL pill fades up; the whole card holds still to the end (final frame: hold, no exit).

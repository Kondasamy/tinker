---
workflow: product-launch-video
flow: automation
storyboard: yes
message: "Tech concepts you can play with. Free, no sign-up."
destination: x-feed
aspect: 1080x1080
language: en
audience: "Product managers, engineers and analysts at companies adopting new tech"
length: 35s
angle: "jargon-to-picture + predict-reveal + workshop-board (mix of pitches 1, 2, 4)"
---

## Intent

Launch video for Tinker (https://tinker.kondasamy.com): hand-drawn, interactive
explanations of tech concepts. Punchy and fast. "Learning things in a practical
way." Not just AI: Tinker is about any tech concept; today's modules happen to be
AI, and more will be added, so the count is "17, and growing", never final.

Arc (~35s, square):
- 0–3s hook: jargon slams on ("RAG." "KV cache." "Prompt injection.") → "Heard them. Never *seen* them?" (pitch 2)
- 3–12s jargon → picture: 3–4 rapid pairs, the word struck out and replaced by the hand-drawn picture that explains it (pitch 2)
- 12–24s predict → reveal: one real chapter question, 3-second countdown, the drawn answer; "That's how every module works." (pitch 4)
- 24–31s the workshop board comes alive, each plot hopping, a counter ticking to 17 "…and growing" (pitch 1)
- 31–35s close: "Tinker. Tech concepts you can play with. Free, no sign-up." · tinker.kondasamy.com

## Assets

- Logo: the site's own (`public/favicon.svg` in the Tinker repo / captured from the site).

## Customizations

- Captions burned in (both feeds autoplay muted).
- Voice and music from ElevenLabs (key via env var `ELEVENLABS_API_KEY` only; never written to files).
- Look from the site's own tokens (warm paper, ink, Tinker palette and fonts).
- Chapter pictures captured on their own / at phone width, not full desktop pages squashed into a square.

## Notes

- Destinations: X and LinkedIn feeds (both 1:1).
- No author credit in the video (the creator is the poster). The Colorfigures by April Zhu credit goes in the post text, not on screen.
- Questions, answers and pictures come from the site's real data/captures; no invented numbers.

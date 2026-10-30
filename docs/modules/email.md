# How email arrives (`/email/`)

Decisions for this module only; the shared rules are in `AGENTS.md`.

## Picture

- **The post room** (`src/components/scenes/postScene.ts`): the customer's (Hollis's) mail room. Along the back wall, one server cabinet per hop (at most six, a `+N` in the pill for the rest), lit mint once its postmark is peeled. On the sorting desk, the envelope with its postmarks (cobalt stamps; a peeled one leaves a pale ring). Behind the desk the checks: SPF's list board, DKIM's seal, DMARC's sign (each lamp mint pass, tomato fail, metal none), and the spam gauge filled to the score. In front, three trays (inbox, junk, bounced); the letter lies in the one it ended in. `postOf` reads it off a verdict; `postPlot` is ready for the home hero's `DRAW`. `EmailStage` (`src/content/email/kit.tsx`) puts it one tab from **Headers**, the raw message as React text.
- **Hero object: Hollis's pigeonhole frame**, a tall wooden case of cubbies standing at the left wall with a postal worker reaching into it (tool calling's host is a pigeonhole-fronted machine on a desk; this one is furniture). Hops are small sorting offices, the spam gauge a needle dial, the trays wire trays, and a pillar box stands by the desk.
- **The mechanic (KTD13): peel the postmarks.** A list of buttons under the picture, in time order: only the next (bottom-most unpeeled) one is enabled, each peel shows that hop's server, sender, IP and time, focus moves to the next button (so Enter alone peels them all), and **Peel all** does the rest. Motion (a stamp lifting, a cabinet lighting) lives only behind `prefers-reduced-motion: no-preference` in `email.css`; with reduced motion each press lists the hop at once. Chapters hand the stage `onPeel` only after the prediction, so a peel can't answer it.
- **One read-out.** A single polite `role="status"` under the stage says the reader's last peel, or the chapter's verdict line (chapter 5: the live DKIM result) when that changes.

## Engine (`src/lib/email/`)

- **Real mechanisms over fixture mail** (KTD6). `data/email/messages/*.eml` are RFC 5322 texts on fictional `.example` names and documentation IPs; `data/email/dns.json` is the made-up DNS. Larkspur's own SPF and DMARC records are the reader's settings (`Records`), never in the fixture.
- **parse.ts** unfolds headers and reads `Received` bottom-up into hops. The IP SPF checks is the one that handed the message to the recipient's MX (`ipOf`), as a real receiver sees it.
- **spf.ts**: `ip4`, `include` and `all` with qualifiers; more than ten includes is a `permerror` (RFC 7208 §4.6.4), which also ends a loop.
- **dkim.ts**: relaxed/relaxed canonicalisation, `rsa-sha256`, verified by Web Crypto against the key at `demo2026._domainkey.larkspur.example`. The signatures were made once by `scripts/sign-email.mjs` (which repeats the canonicalisation in plain JS; verifying proves they agree) with a labelled demo RSA key in JWK form (`data/email/demo-dkim.json`, public on purpose, so secret scanning finds no PEM). PKCS#1 v1.5 signatures are deterministic, so a rerun rewrites the same bytes. The page verifies live only in chapter 5; elsewhere DKIM's verdicts come from `pinned.json`, which the engine test verifies again.
- **dmarc.ts** (`judge`): SPF, DKIM, then DMARC alignment (relaxed; the organisational domain is the last two labels, right for `.example`), the policy, then the receiver's own rule (mail nothing vouches for goes to junk, a labelled stand-in in `story.json`), then the spam score.
- **spam.ts**: naive Bayes over word presence in a hand-written labelled set (`spam-set.json`), counted on load. Its chances sit near 0 or 1, so the page shows "under 1%" / "over 99%".
- **The story's arc** is pinned (`verdicts` in `pinned.json`): with no records Larkspur's mail is junk and the forger (own envelope domain, SPF pass for itself) gets in; SPF fails the spoof that uses Larkspur's envelope; forwarding breaks SPF and keeps DKIM, so DMARC passes; reject bounces both fakes.
- **Chapter 7's workbench** (`workbench.ts`): SPF record (5) × DKIM × policy (3), 30 settings over a hand-written day. The rule: every real message in an inbox and no fake in front of a customer (junk counts). `WINNERS` (include of Sendwell with `~all` or `-all`, DKIM on, reject) is pinned and `email-workbench.test.ts` solves it again.
- **Facts** (RFC 5321/5322, 7208, 6376, 7489, 7960 on mailing lists, and the 2024 Gmail and Yahoo bulk-sender rules as dated facts) come from `data/email/facts.json`. Chapter 2 links to Opening a web page's DNS chapter, chapter 5 to Locks and keys' signature chapter (R17).

## Toy vs real

The mail, domains, IPs and DNS are made up (`.example`, documentation ranges) and labelled by `DemoNote`; the checks that judge them are the real algorithms. Hop counts, IPs, times and every pass/fail are read off the fixture messages by the engine, so they are real results over made-up mail.

| Chapter | Number shown | Real figure (fact id) | Matched, labelled or real |
| --- | --- | --- | --- |
| 1 | Junk for mail nothing vouches for (the receiver's rule, `story.json`) | Gmail requires SPF or DKIM of every sender (`gmail-all`) | Labelled: "a stand-in rule, modelled on Gmail's", fact beside it |
| 2 | 3 postmarks on the confirmation, 5 on the forward; hop IPs and times | Every server adds a Received line (`received`); MX picks the next server (`mx`) | Real over the fixture mail |
| 3 | 2 postmarks on the fake; its first IP | SMTP can't authenticate a sender (`spoofing`) | Real over the fixture mail |
| 4 | IPs SPF checked; pass/fail/softfail per record | RFC 7208's 10-lookup cap (`spf`, value 10) | Matched: `LOOKUP_LIMIT` reads `fact('spf').value` |
| 5 | 1880.00 changed to 1980.00; the extra spaces | Key at `<selector>._domainkey.<domain>` (`dkim`), relaxed rules (`relaxed`) | Real: DKIM verified live with a labelled demo key |
| 6 | Spam score "over 99%" for the prize draw; threshold 0.5 (`story.json`) | Gmail's 0.3% reported-spam line (`spam-rate`); Yahoo's bulk rules and 0.3% (`yahoo-2024`) | Labelled: "a toy spam filter … 24 hand-written messages"; copy says real filters also watch reports |
| 7 | Counts 40, 12, 4, 30, 6, 6 (98 a day); real in inboxes, fakes seen; 2 winning settings | Gmail's bulk line of 5,000 a day (`gmail-2024`, value 5000); enforcement from November 2025 (`gmail-2025`) | Labelled: "Hand-written counts … far under Gmail's bulk line", the line read from the fact (a test pins the day under a tenth of it); WINNERS solved by the test |
| Intro | 7 messages, 5 postmarks, 98 messages, 2 settings | — | Read from the fixture and the solved workbench |

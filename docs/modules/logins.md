# Logins and passwords (`/logins/`)

Decisions for this module only; the shared rules are in `AGENTS.md`.

## Picture

- **The cloakroom** (`src/components/scenes/cloakScene.ts`): a key cabinet at the back, one drawer per trade account, holding what the site keeps: a sticky note (as written) or a fingerprint card, coloured by stored form (mustard, cobalt, blush salted, mint slow); a cracked drawer turns tomato and pops out. The desk in front hands out the ticket (the session cookie). A thief to the right holds what she took (the table, a copied ticket, a code). In chapter 6 the Guild's booth sits at the end of a belt (officeScene's `beltAt`, composed) that carries the code and the ID token. At most 12 drawers, then a count pill. Parts: `cabinet`, `desk`, `thief`, `guild`.
- **The precise view, one tab away** (`LoginsStage`, `src/content/logins/kit.tsx`): the accounts table read off the same drawers; in chapter 6 the sign-in steps as `FlatStage` lanes (browser, Larkspur, Guild, thief) with PASS/DENIED/FAIL stamps.
- **The mechanic (KTD13): the cracking race.** A radio group for the stored form, a native range for the PBKDF2 work factor, Play and Step. Each tick is a time on a log scale (1 second to 1 year); the board at any tick is `boardAt()`. One polite `role="status"` line speaks on each press and when an account cracks, never per tick. With reduced motion, Play shows the final board at once and drawers don't pop.

## Engine (`src/lib/logins/`)

- **Accounts and the leaked list** are hand-written demo data (`data/logins/accounts.json`, `leaked.json`), labelled; no real credentials. Salts are fixed per account so every fingerprint is pinned.
- **Hashing reuses Locks and keys** (`sha256.ts`, sync). Salted = SHA-256 of salt then password. PBKDF2-HMAC-SHA256 runs in Web Crypto, pinned for one account at each work factor and checked against Node's PBKDF2.
- **The race** (`race.ts`): guesses for a password are its place on the leaked list, or the whole list plus its brute-force space (character kinds ^ length; a planning estimate, labelled). Rates are one benchmark's figures (Chick3nman's hashcat 6.2.6 on an RTX 4090, October 2022): SHA-256 as measured; PBKDF2 scaled from its 999-iteration figure. Unsalted, one guess tests every account; salted, the rate is shared across accounts. Work factors are NIST SP 800-132's 1,000, 100,000 and OWASP's 600,000. **Slow hashing never saves a leaked-list password**: those crack in the first second at every factor (tested).
- **TOTP** (`totp.ts`): RFC 6238 over HMAC-SHA1 in Web Crypto, tested against RFC 6238's and RFC 4226's vectors; the demo secret and time give a pinned code.
- **Sign in with another site** (`oidc.ts`): state, PKCE S256 (base64url SHA-256 of the verifier, checked against RFC 7636's own example), and an ES256 ID token signed once with Locks and keys' demo ECDSA key and committed; verified live. A one-letter change fails the signature, a token for another app the audience, a forged state the state, a wrong verifier PKCE, each alone.
- **Chapter 7's workbench** (`workbench.ts`): a store (6) and, per account type, a second factor (2) and a session length (3): 216 plans against a breach dump (the race's maths for 30 days), a guesser at the form (NIST's 100 failed tries), a staff-cookie thief and a phishing page. TOTP's secret sits in the same database, so it doesn't stop the breach; the phishing page relays codes live, so nothing in the bench stops it, and its row cites NIST's phishing-resistance (passkeys) as the fix. `WINNERS` (fewest break-ins, then least sign-in friction) is pinned in `data/logins/pinned.json` and recomputed by a test. Timings and sign-in counts are planning numbers, labelled.
- **Facts** come from `data/logins/facts.json` with source and access date; the guess rates name whose figure and when.

## Toy vs real

Ten demo accounts, a 20-password stand-in for a leaked list and the race's tick scale (1 second to 1 year) are hand-set; the kit's race note (`RaceControls`) and chapter 7's bench note say so. Fingerprints, PBKDF2 outputs, the PKCE challenge, the signatures and the TOTP code are computed for real in the browser from demo inputs.

| Chapter | Number shown | Real figure (fact id) | Matched, labelled or real |
| --- | --- | --- | --- |
| 1 | 10 accounts, 10 of 10 read | NIST's storage rule (`nist-storage`) | Labelled (demo accounts) |
| 2 | Guesses made by each tick | 21,975.5 million SHA-256 a second (`gpu-sha256`) | Matched: `rateOf('sha256')` reads it |
| 2 | Accounts cracked in a second, in a year | Benchmark rate (`gpu-sha256`); off-list passwords are an every-combination estimate | Labelled (demo accounts, stand-in list) |
| 2 | SHA-256 fingerprint prefixes | Computed SHA-256 | Real |
| 3 | "Each 10 times slower" | Cracking time grows in proportion to the number of hashes (`owasp-salt`) | Matched: the race divides the rate by the account count |
| 3 | Twins' salted fingerprint prefixes | Computed SHA-256 | Real |
| 4 | 1,000 rounds | NIST SP 800-132's floor (`sp800-132`) | Matched: `WORK[0]` reads it |
| 4 | 100,000 rounds | None: a middle step for the slider | Labelled (no fact names it; the slider's ends are cited) |
| 4 | 600,000 rounds | OWASP's PBKDF2-HMAC-SHA256 figure (`owasp-pbkdf2`) | Matched: `WORK[2]` reads it |
| 4 | Guesses made at each work factor | 8,865.7 thousand a second at 999 iterations (`gpu-pbkdf2`) | Matched, scaled linearly to the work factor (labelled as from one benchmark) |
| 4 | Leaked-list accounts that still fall | NIST's blocklist rule (`nist-blocklist`) | Labelled (demo accounts) |
| 4 | PBKDF2 output run here | Web Crypto, pinned against Node | Real |
| 5 | Session id in the cookie line | HttpOnly and Secure (`rfc6265`) | Labelled ("A demo session id") |
| 6 | State, challenge and verifier hashes | PKCE S256 (`rfc7636`) | Real (demo values, computed) |
| 7 | 100 failed tries | NIST's lockout limit (`nist-rate-limit`) | Matched: `LIMIT` reads it |
| 7 | Sessions of 1 hour, 1 day, 30 days | NIST's sign-in-again limits (`nist-reauth`) | Labelled as matching NIST; pinned by `logins-workbench.test.ts` |
| 7 | 30-day breach window, 2-hour cookie replay, sign-ins a month | None | Labelled (planning numbers, bench note) |
| 7 | Break-ins, sign-in steps, best plans | Computed from the bench | Real (of the toy); `WINNERS` pinned and recomputed |
| 7 | TOTP code | RFC 6238's 30-second step (`rfc6238`) | Real (demo secret and time, computed) |
| Intro | 22 billion, 600,000, leaked-list accounts of 10, best-plan count | `gpu-sha256`, `owasp-pbkdf2`; the rest computed | Matched or computed, as above |

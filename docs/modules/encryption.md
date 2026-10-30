# Locks and keys (`/encryption/`)

Decisions for this module only; the shared rules are in `AGENTS.md`.

## Picture

- **The paint shop counter** (`src/components/scenes/paintScene.ts`): Larkspur at the left end, the supplier at the right, and the open middle of the counter where an eavesdropper behind it sees whatever crosses (her pill says what). On it stand paint pots, padlocks open or shut, keys, the order crate (a wax seal when signed, a padlock when locked) and cards (a certificate, a fingerprint). A pot's pill is filled with its own paint and carries its toy number; on phones pills keep short names and the caption carries the numbers. `paintAt(pigment, stage)` reads the Diffie–Hellman mix at each stage; each chapter's `sceneOf` reads its own state. The home card, the intro hero and chapter 2's share image are the mix finished (`PAINT_CARD`); the hero plot is `paintPlot`.
- **Paint mixing is linear-light sRGB**: a pot is the even average of its pigments in linear light, so order never matters and both ends' final pots are one colour for every pair of secrets (`tests/unit/paint-scene.test.ts`).
- **Hero object: open paint tins with wire bail handles** on the counter (a steel can seen over the paint inside, a label band in its own computed paint), a mixing paddle standing in each fresh mix, and shelves of closed tins along the back wall. Larkspur's shopkeeper (cobalt) and Brightwater's (mint) stand behind the counter's ends; Eve (CAST `eve`, trench coat and hat) peers from behind a stone pillar.
- **"Who sees what", one tab away** (`EncryptionStage`, `src/content/encryption/kit.tsx`): what each party holds and what crossed, read off the same picture. React text.
- **The mechanic (KTD15)**: the secret colour is one native radio group (`SecretPicker`); the mix is computed, never hand-painted.

## Engine (`src/lib/encryption/`)

- **Toy maths in BigInt** (`toy.ts`): Diffie–Hellman and RSA over the small primes in `data/encryption/toy.json`, small enough to check by hand; every toy number is labelled "toy size" in the copy.
- **SHA-256 computed here, synchronously** (`sha256.ts`), so every picture stays a pure function; a test checks it against Web Crypto.
- **Certificates** (`certs.ts`, `data/encryption/certs.json`, `.example` names) are signed with the toy RSA over the SHA-256 of their `|`-joined fields (subject, issuer, dates, key). Chapter 6 checks root, signature, name and date. One link only (root to supplier): no intermediates or revocation.
- **The real algorithms** (`real.ts`): the browser's Web Crypto runs AES-GCM and ECDSA P-256 with fixed demo keys (`data/encryption/demo-keys.json`), labelled demo on screen and used nowhere else; their outputs are pinned in `data/encryption/pinned.json`.
- **Chapter 7's workbench** (`workbench.ts`): lock, sign, both or neither for each of four messages, against an eavesdropper, a tamperer and an impostor (`data/encryption/workbench.json`). `WINNERS` (every plan that loses nothing) is pinned and recomputed by a test.
- **Facts** (AES-GCM, Diffie–Hellman, X25519, RSA, key sizes, ECDSA, SHA-256, TLS 1.3, ML-KEM, NIST IR 8547) come from `data/encryption/facts.json` with source and access date; key sizes and post-quantum dates name whose figure and when.

## Toy vs real

Toy-size maths can't be matched to real key sizes without breaking the engine decision (numbers small enough to check by hand), so every toy number is labelled: the caption says "Toy-size numbers; real keys are hundreds or thousands of bits", and a real fact sits on the same chapter's reveal. The real algorithms (AES-GCM, ECDSA P-256, SHA-256) run for real in the browser.

| Chapter | Number shown | Real figure (fact id) | Matched, labelled or real |
| --- | --- | --- | --- |
| 1 | AES-GCM ciphertext (hex) | AES-GCM, demo key (`aes-gcm`) | Real (Web Crypto, pinned in `pinned.json`) |
| 2 | Base 5, remainder after 23, secrets 6/9/13/15, public and shared numbers | 32-byte X25519 secrets (`x25519`) | Labelled (toy size) |
| 3 | n = 3233, lock power 17, private power, order number and locked box | 2048-bit RSA = 112-bit security, 3072 = 128 (`key-sizes`) | Labelled; narration: "Real keys run to thousands of bits" |
| 4 | Toy seal over the invoice | ECDSA P-256 check, demo key (`ecdsa`) | Labelled toy; ECDSA result real |
| 5 | 256 bits, 64 hex characters, bits flipped | SHA-256 is 256 bits (`sha256`) | Real (computed SHA-256; flipped count pinned in `encryption-engine.test.ts`) |
| 6 | Certificate dates, "checked on" date, toy signature | TLS 1.3 certificate check (`tls13`) | Labelled (story dates, toy-size signature) |
| 7 | 4 messages, 3 attackers, number of winning plans | ML-KEM (`ml-kem`), quantum phase-out 2030/2035 (`ir8547`) | Real count (WINNERS recomputed by `encryption-workbench.test.ts`); messages and attackers are the story's |

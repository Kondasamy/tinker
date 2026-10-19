# Visual RAG Playground: Forensic Noir Specification & Implementation Blueprint

> **Narrative Theme:** The Amnesiac Detective & The Archive (Forensic Noir)  
> **Audience:** Hybrid Intuitive-to-Technical (Beginners through Software Engineers)  
> **Simulation Engine:** Hybrid (Deterministic Core + In-Browser Transformers.js Web Worker)  
> **Visual Aesthetic:** Evidence Room / Forensic Dossier (Immersive Noir)

---

## 1. The Noir Worldbuilding & Narrative Framework

### 1.1 Characters & System Roles

In the foggy metropolis of **Synthetica City**, crime never sleeps, and the truth is buried under mountains of shredded paper:

```text
+-----------------------------------------------------------------------------------+
| THE EVIDENCE BOARD ROSTER                                                         |
+-----------------------------------------------------------------------------------+
|  [CHARACTER]             | [RAG SYSTEM ROLE]        | [BEHAVIORAL PROFILE]        |
|--------------------------|--------------------------|-----------------------------|
|  Detective Vance         | Generative LLM           | Brilliant deductive mind,   |
|                          | (Parametric Model)       | but total amnesia of recent |
|                          |                          | events. When unprompted, he |
|                          |                          | confabulates smooth lies.   |
|--------------------------|--------------------------|-----------------------------|
|  Archivist Finch         | Chunking & Dense Vector  | Meticulous filing clerk.    |
|                          | Index (Vector DB)        | Shreds police logs into     |
|                          |                          | index cards, pins them on a |
|                          |                          | semantic star-chart wall.   |
|--------------------------|--------------------------|-----------------------------|
|  Inspector Morales       | Cross-Encoder Reranker   | Suspicious veteran skeptic. |
|                          |                          | Re-reads cards against the  |
|                          |                          | detective's question, throws|
|                          |                          | out irrelevant decoys.      |
|--------------------------|--------------------------|-----------------------------|
|  The Corkboard Dossier   | Context Window & Prompt  | A leather folder clipped    |
|                          | Assembly                 | with the top cards in rank  |
|                          |                          | order, handed to Vance.     |
+-----------------------------------------------------------------------------------+
```

---

## 2. Interactive Chapters & Story Script

### Chapter 1: The Heist at Grand Continental (The Confabulation Trap)
- **The Crime:** A diamond safe was cracked at 03:14 AM. 
- **The Interrogation:** The user asks Vance: *"Who cracked the safe, and what code did they use?"*
- **The Raw Generative Trap:** Without the archive enabled, Vance pours a glass of rye and responds smoothly:
  > *"It was obvious from the beginning. Jimmy 'Two-Fingers' pulled the job using backdoor bypass cipher DELTA-9."*
- **The Forensic Reveal:** Jimmy Two-Fingers has been in federal custody since 2021. Vance has zero access to yesterday's police log. He generated words based on literary probability.
- **The Fix:** The user unlocks the Archive Door.

### Chapter 2: The Shredder Room (Document Ingestion & Chunking)
- **The Artifact:** A 6-page typewritten incident report from Officer Higgins.
- **The Interactive Shredder:**
  - Sliders: `Chunk Size (words/tokens)`: 20 to 500 | `Overlap`: 0% to 50% | `Splitting Mode`: Fixed-Width vs Sentence vs Semantic.
  - Interactive Text View: A yellow legal pad where scissors cut the text into colored slips.
- **The Trap (Boundary Mutilation):**
  - Higgins wrote: *"The suspect was definitely not wearing gloves; instead, his bare fingerprints were lifted from the mahogany sill."*
  - With `Chunk Size = 20` and `Overlap = 0`, the cut falls between *"definitely"* and *"not wearing gloves"*.
  - Chunk #1 reads: *"The suspect was definitely"*
  - Chunk #2 reads: *"not wearing gloves..."*
  - The negation is lost or separated, causing downstream confusion!

### Chapter 3: The Constellation Wall (Vector Embedding Space)
- **The Artifact:** An interactive chalkboard/corkboard with glowing pins in 2D space (projected from 384-D via PCA/UMAP).
- **The Semantic Geometry:**
  - Words with similar meanings cluster together naturally.
  - Proximity demo: Pin *"getaway vehicle"* clusters near *"stolen sedan"*, *"black coupe"*, and *"motorcycle"*, while *"financial vehicle"* is flung toward the banking corner.
- **Forensic Lens (Projection Warning):**
  - Hovering over any card displays its true 384-D cosine distance vs its 2D screen distance. A visual "Distortion Gauge" warns the learner: *"Don't trust visual distance alone—the math lives in 384 dimensions!"*

### Chapter 4: Casting the Dragnet (Vector Search & Top-K)
- **The Action:** The user types Vance's case question: *"What color was the getaway car spotted near 4th Avenue?"*
- **The Dragnet Ring:**
  - A glowing magnetic circle expands from the query pin across the constellation.
  - Sliders: `Top-K (1 to 10)` | `Distance Metric (Cosine Similarity vs Euclidean)`.
- **The Diagnostic Tradeoff:**
  - If $k=1$: Captures a card talking about a red traffic light near 4th Avenue. Vance misses the actual witness report ranked at $k=2$.
  - If $k=8$: Captures the real clue, but also captures cards about red coats, red brick buildings, and ruby necklaces.

### Chapter 5: Morales' Interrogation (Reranking)
- **The Action:** Inspector Morales takes the top-8 retrieved cards and re-scores each one by running a cross-encoder evaluation:
  $$\text{Score}(\text{Query}, \text{Chunk}) = \text{CrossEncoder}(\text{Query} \circ \text{Chunk})$$
- **The Visual Shift:**
  - The cards physically slide and reorder on the corkboard.
  - The irrelevant "red brick building" card drops from rank #2 down to rank #8.
  - The quiet testimony *"Saw an azure roadster speeding toward the docks"* jumps from rank #5 to rank #1.

### Chapter 6: The Verdict Dossier (Context Window & Grounded Answer)
- **The Action:** The top-3 verified cards are paperclipped into a manila folder with timestamps.
- **The Grounded Synthesis:** Vance reads only the clipped cards, producing a bulletproof forensic brief:
  > *"According to Officer Higgins' incident log [Exhibit A], an azure roadster fled east at 03:22 AM. The safe was unlocked with master keycard #412 [Exhibit B]."*
- **The Citation Highlighter:** Hovering over any claim in Vance's verdict illuminates the exact sentence in the attached exhibit cards with matching color codes.

---

## 3. UI/UX Aesthetic: The Forensic Dossier Design System

```text
+----------------------------------------------------------------------------------------+
| [CASE #104: THE GRAND CONTINENTAL HEIST]           [MODE: DETERMINISTIC] [RESET LAB]   |
+----------------------------------------------------------------------------------------+
|                                                                                        |
|  +---------------------------+  +----------------------------------------------------+  |
|  | EVIDENCE ARCHIVE          |  | THE CRIME MAP (EMBEDDING SPACE 2D PROJECTION)     |  |
|  | - Incident Report (03:14) |  |                                                    |  |
|  | - Witness Statement #1    |  |       * [Exhibit C: Bank Vault Specs]              |  |
|  | - Vault Blueprint         |  |                                                    |  |
|  | - Janitor Interview       |  |                 (Q) [Vance's Query]                |  |
|  |                           |  |                   \                                |  |
|  | [ + Upload Custom Case ]  |  |           * [Exhibit A: Getaway Car]               |  |
|  +---------------------------+  |                                                    |  |
|                                 |       * [Exhibit B: Red Traffic Light (Decoy)]     |  |
|  +---------------------------+  +----------------------------------------------------+  |
|  | FORENSIC CONTROLS         |                                                          |
|  | Chunk Size: [====|===] 120|  +----------------------------------------------------+  |
|  | Overlap:    [==|=====] 15%|  | VANCE'S BRIEFING ROOM (CONTEXT & VERDICT)          |  |
|  | Top-K:      [===|====] 3  |  |                                                    |  |
|  | Reranker:   [ ACTIVE v ]  |  | "Based on Exhibit A (score: 0.89), the vehicle was |  |
|  | Model:      [ Vance-7B ]  |  | an azure roadster heading toward dock 4..."        |  |
|  +---------------------------+  +----------------------------------------------------+  |
+----------------------------------------------------------------------------------------+
```

### Visual Tokens:
- **Palette:** Deep asphalt black (`#121316`), corkboard slate (`#1a1c23`), aged paper manila (`#f4ecd8`), forensic crimson (`#e63946`), glowing evidence amber (`#f4a261`), cyan vector pulse (`#2a9d8f`).
- **Typography:** Courier / Space Mono for typewritten logs, police badges, and metadata; crisp sans-serif (Inter/Geist) for controls and mathematical callouts.
- **Micro-interactions:**
  - Red string animations connecting related chunks in vector space.
  - Ink-stamp animations (`[GROUNDED]`, `[HALLUCINATED]`, `[DISCARDED BY RERANKER]`).
  - Scrubber timeline at the bottom allowing step-by-step frame scrubbing.

---

## 4. Technical Engine Implementation Plan

### 4.1 Dual-Engine Architecture

1. **Tier 1: Pre-Baked Case Files (Deterministic Core)**
   - Shipped as lightweight static JSON files (`cases/heist.json`, `cases/cold-case.json`).
   - Contains:
     - Full document text.
     - Pre-chunked variations (fixed, sentence, semantic).
     - Pre-computed 384-dimensional embeddings (using `all-MiniLM-L6-v2`).
     - Pre-calculated 2D PCA and UMAP coordinate projections.
     - Deterministic model completions and cross-encoder scores.
   - **Performance:** Instantaneous (<5ms), zero network calls, 100% offline, zero setup required.

2. **Tier 2: In-Browser Web Worker (Transformers.js)**
   - When user clicks *"Upload Custom Case File"* or types a novel query:
   - Spawns `pipeline-worker.js` loading `@xenova/transformers`.
   - Model: `Xenova/all-MiniLM-L6-v2` (quantized q8, 23MB, cached via browser CacheStorage API).
   - Generates live 384-dimensional Float32 vectors directly in browser memory.
   - Runs in-browser PCA projection to position the user's custom text onto the corkboard star-chart in real time.

3. **In-Memory Vector Math:**
   ```typescript
   export function cosineSimilarity(a: Float32Array, b: Float32Array): number {
     let dot = 0.0;
     let normA = 0.0;
     let normB = 0.0;
     for (let i = 0; i < a.length; i++) {
       dot += a[i] * b[i];
       normA += a[i] * a[i];
       normB += b[i] * b[i];
     }
     return dot / (Math.sqrt(normA) * Math.sqrt(normB) + 1e-9);
   }
   ```

4. **URL Hash Serialization:**
   - Every experiment state is encoded into the URL:
     `#case=heist&chunk_size=120&overlap=15&k=3&rerank=true&dist=cosine`
   - Teachers, learners, and researchers can share one-click links to reproduce exact failure and success scenarios.

---

## 5. Next Steps for Implementation

1. **Scaffold the Next.js / Vite project:**
   - Setup React 19 + TypeScript + Tailwind CSS.
   - Setup Canvas / D3 / Three.js component for the 2D constellation evidence board.
2. **Implement the Pipeline State Machine:**
   - Pipeline stages: `INGEST` $\rightarrow$ `CHUNK` $\rightarrow$ `EMBED` $\rightarrow$ `RETRIEVE` $\rightarrow$ `RERANK` $\rightarrow$ `ASSEMBLE` $\rightarrow$ `GENERATE`.
3. **Build the Chapter Walkthrough & Sandbox Mode:**
   - Chapter 1 through 6 guided story progression.
   - Free-form Evidence Room sandbox.

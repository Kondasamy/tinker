# Visual RAG Playground

> An interactive, visual, story-driven learning playground and simulation engine for Generative AI and Retrieval-Augmented Generation (RAG).

---

## 📚 Research & Curriculum Specifications

Comprehensive research and architectural blueprints generated via Perplexity Deep Research (`sonar-deep-research`):

1. **[Master Blueprint & Curriculum](research/00_master_blueprint_and_curriculum.md)**
   - Core narrative framework: *"The Amnesiac Detective & The Archive"*
   - The "Martini Glass" learning progression (Linear Story $\rightarrow$ Guided Explorables $\rightarrow$ Debugging Puzzles $\rightarrow$ Open Sandbox)
   - 4-level progressive disclosure (Metaphor $\rightarrow$ System Diagram $\rightarrow$ Algorithmic Operation $\rightarrow$ Mathematical Truth)
   - Dual-engine architecture (Deterministic offline mock engine + live in-browser Transformers.js / WebGPU)

2. **[01. Visual RAG Storytelling & Pedagogy](research/01_visual_rag_storytelling_and_pedagogy.md)**
   - Analysis of best-in-class educational visualizers (*Transformer Explainer*, *CNN Explainer*, *Diffusion Explainer*, Google PAIR)
   - Effective metaphors for GenAI hallucination and external retrieval
   - Scaffolding novices to practitioners through counterfactual experimentation

3. **[02. Simulation Technical Architecture](research/02_simulation_technical_architecture.md)**
   - Browser-based execution patterns: deterministic JSON caches vs client-side ONNX Runtime Web / WebGPU vs BYOK APIs
   - In-browser vector search, high-D float32 math, and 2D/3D projection trade-offs (PCA, UMAP, t-SNE)
   - Decoupled DOM control plane, Canvas/WebGL rendering plane, and Web Worker compute plane
   - State machine, step scrubber, and shareable immutable run manifests

4. **[03. RAG Failure Modes & Interactive Puzzles](research/03_rag_failure_modes_and_interactive_puzzles.md)**
   - Comprehensive 33-point failure taxonomy across ingestion, representation, retrieval, context assembly, and generation
   - Hands-on puzzle designs: *The False Alibi* (chunk boundary mutilation), *The Hidden Needle* (lost-in-the-middle), *The Stale Blueprint* (recency decay & metadata filtering), and *The Poisoned Clue* (adversarial distractors)

5. **[04. Forensic Noir Playground Specification](research/04_noir_forensic_playground_spec.md)**
   - Tailored specification based on interview decisions:
     - **Narrative Theme:** The Amnesiac Detective & The Archive (Forensic Noir)
     - **Target Audience:** Hybrid Intuitive-to-Technical (Novices to Engineers)
     - **Engine Model:** Hybrid (Deterministic Core + Transformers.js Web Worker)
     - **UI Aesthetic:** Evidence Room / Forensic Dossier (Immersive Noir with Corkboard, Red String, Typewriter typography)

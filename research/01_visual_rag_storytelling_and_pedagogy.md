# State of the Art in Interactive Visual Explainers, Educational Playgrounds, and Storytelling Metaphors for Generative AI and RAG

**Research date:** October 19, 2026

## Executive summary

The strongest design for teaching generative AI and Retrieval-Augmented Generation is **not a single animation, metaphor, or unconstrained sandbox**. It is a layered experience combining:

1. **An evidence-investigation narrative**—preferably detective, archivist, or legal-discovery framing.
2. **An author-guided “martini glass” progression**: linear story first, constrained experiments second, open sandbox last.
3. **A persistent end-to-end pipeline view** connecting documents → chunks → embeddings/indexes → retrieval → reranking → context → generation → citations.
4. **Progressive disclosure across four representational levels**: story metaphor, system diagram, algorithmic operation, and actual numerical computation.
5. **Counterfactual experimentation with real data**, including deliberately engineered failure cases.
6. **Separate views for retrieval and generation quality**, because RAG can fail before or after the correct evidence reaches the model.
7. **Original-space metrics alongside every 2D/3D embedding projection**, so visual proximity is never mistaken for the actual retrieval score.

This approach is supported by the best evaluated educational systems. Transformer Explainer combines a token-centered flow overview, smooth transitions, live GPT-2 inference, custom text, guided learning, and progressively disclosed mathematics. In a controlled study of 90 non-experts, its users averaged 73.3% across seven quiz questions and significantly outperformed both a blog and a video; guided learning, animated flow, and custom input were its most valued features. [303] Diffusion Explainer similarly uses overview-to-detail transitions, timestep navigation, prompt comparison, and hyperparameter manipulation; 44 of 56 study participants preferred it to a leading static explainer. [321] CNN Explainer established many of the reusable patterns—focus-plus-context, animated intermediate computation, linked formulas, and user-provided inputs—though its original 16-person evaluation was primarily qualitative. [1]

For RAG specifically, no single research-validated explainer yet matches Transformer Explainer’s combination of pedagogical evaluation, live computation, polish, and progressive disclosure. The current frontier is fragmented:

- **Research-grade educational explainers** excel at model internals but rarely cover retrieval.
- **RAG playgrounds** expose chunking and ranking but are generally young projects without controlled learning studies.
- **Production observability tools** expose traces and metrics but assume practitioner expertise.
- **Embedding projectors** provide sophisticated spatial exploration but can encourage false geometric interpretations if projection distortion is not made explicit.

The recommended product is therefore a **new integrated explainer**, not a reskin of one existing tool. Its organizing metaphor should be **“evidence investigation”**, with optional detective, archivist, legal-discovery, and space-log story skins over the same technically accurate pipeline.

---

## 1. Background and conceptual scope

### 1.1 What must be explained

A useful GenAI/RAG explainer must distinguish three related but different systems:

| Layer | What the learner must understand | Typical misconception |
|---|---|---|
| Generative model | Predicts continuations from learned parameters and supplied context | “It searches a database for every answer” |
| Retrieval system | Selects potentially relevant external passages | “The closest vector is necessarily correct” |
| RAG composition | Places retrieved passages into the generator’s prompt and asks it to synthesize an answer | “If a source was retrieved, the answer must be grounded” |

The original RAG formulation combines a parametric sequence model with a non-parametric dense index, with variants that condition on one passage set for the generated sequence or allow passage selection to vary by token. It improved specificity, diversity, and factuality relative to a parametric-only baseline, but it did not establish that retrieval eliminates factual errors. [80]

A rigorous explainer should therefore teach:

\[
\text{Answer quality}
\neq
\text{retrieval quality alone}
\]

A more useful decomposition is:

\[
P(\text{correct grounded answer})
\approx
P(\text{evidence retrieved})
\times
P(\text{evidence retained})
\times
P(\text{evidence correctly used})
\times
P(\text{claims correctly cited})
\]

This is pedagogically important because retrieved evidence can be irrelevant, incomplete, stale, poisoned, misranked, ignored, or misinterpreted.

### 1.2 “Hallucination” should be operationalized

Avoid depicting hallucination as a model “seeing things” or consciously lying. For instruction, define it operationally as one or more of:

- a factual claim contradicted by the relevant world or source;
- a claim unsupported by supplied evidence;
- a citation that exists but does not support the attached proposition;
- an invented source;
- an answer that improperly resolves ambiguity or evidential conflict.

The distinction between **ungrounded** and **misgrounded** is especially valuable. In a Stanford evaluation of legal research systems, Lexis+ AI hallucinated on 17% of queries, Thomson Reuters Ask Practical Law AI on 19%, and closed-book GPT-4 on 43%. Many failures arose from naive retrieval, inapplicable authority, or reasoning errors; a real citation did not guarantee that the cited authority supported the claim. [391]

**Pedagogical implication:** show at least four outcomes separately:

1. Correct evidence, correct answer.
2. Correct evidence, incorrect synthesis.
3. Incorrect evidence, plausible synthesis.
4. No sufficient evidence, appropriate abstention.

---

## 2. Pedagogical and narrative foundations

## 2.1 Explorable explanations rather than decorated articles

Bret Victor’s central distinction remains foundational: a reactive document lets readers alter assumptions and see consequences; an explorable example makes an abstraction concrete; contextual information supports just-in-time checking. The goal is to turn text from information to consume into an environment in which to think. Importantly, the prose must remain understandable without interaction—the explorable should extend an authored argument, not abandon the learner inside a sandbox. [92]

That yields six design rules:

| Principle | Application to GenAI/RAG |
|---|---|
| Authorial path | Explain one complete query before exposing all controls |
| Visible assumptions | Show chunk size, overlap, model, metric, top-*k*, thresholds, and corpus state |
| Immediate consequences | Recompute chunks, rankings, context, and answer when a control changes |
| Editable examples | Let the learner replace the query and corpus after guided examples |
| Context in place | Open source passages and metadata without navigating away |
| Contestability | Let users challenge relevance labels, citations, and system conclusions |

### Evidence-based scaffolding

Multimedia-learning research supports learner-paced segmentation and pretraining on the names and characteristics of core components before presenting the full process. [106] Worked examples are particularly beneficial for novices, after which support should fade toward independent problem solving; adaptive fading can outperform a fixed progression. [108]

A practical instructional sequence is therefore:

\[
\text{Observe}
\rightarrow
\text{Predict}
\rightarrow
\text{Manipulate}
\rightarrow
\text{Diagnose}
\rightarrow
\text{Design}
\]

This aligns with UNESCO’s AI competency progression of **Understand → Apply → Create**, across technical, ethical, human-centered, and system-design dimensions. [361]

---

## 2.2 Narrative structure: guided stem, exploratory bowl

Narrative-visualization research distinguishes author-driven communication from reader-driven discovery. [126] For AI education, the best balance is the **martini-glass structure**:

- **Stem:** a short, linear, narrated case.
- **Transition:** progressively unlocked controls and predictions.
- **Bowl:** an open sandbox where the learner can change documents, methods, parameters, and queries.

An interactive slideshow is suitable for first exposure, while a drill-down system serves returning learners who already know which subsystem they want to inspect. Pure scrollytelling is insufficient because it does not support hypothesis testing; a pure sandbox is insufficient because novices do not know which variables matter.

---

## 3. Storytelling metaphors

## 3.1 Comparative metaphor framework

| Metaphor | Technical mapping | Best teaching use | Strengths | Principal risks | Recommended treatment |
|---|---|---|---|---|---|
| **Detective mystery** | Query = case question; corpus = evidence room; chunks = clues; retriever = initial search; reranker = clue triage; generator = case theory; citation check = evidentiary verification | Hallucination, conflicting evidence, retrieval misses, query reformulation | Naturally supports uncertainty, false leads, evidence chains, and counterfactual investigation | Can imply intention or consciousness; may encourage one “culprit” rather than probabilistic relevance | Make the learner the detective; portray algorithms as instruments, not agents |
| **Archivist/library** | Corpus = archive; metadata = catalog; embedding index = semantic catalog; BM25 = exact-term catalog; retrieval = document request; generator = synthesis desk | Introductory RAG, indexing, metadata, provenance, stale documents | Familiar, low-threat, strong mapping to organization and provenance; already used in mainstream RAG instruction [61] | “Librarian” can imply human comprehension and reliable judgment; weak at explaining generation errors | Use “catalog/search system” for algorithms; reserve “archivist” for the human governance role |
| **Legal discovery** | Corpus = discoverable record; chunking = document segmentation; retrieval = discovery request; reranking = relevance review; context = admitted evidence; answer = argument; citation validation = checking authority | Practitioner audiences, grounding, audit trails, conflicts, access control | Best metaphor for provenance, admissibility, authority, contradictory sources, and auditability | Can overstate rigor of ordinary RAG and imply retrieved material has been legally validated | Explicitly separate “retrieved,” “admitted to context,” and “supports the claim” |
| **Space logs / mission control** | Corpus = mission logs; chunks = transmissions; embeddings = signal coordinates; retrieval = locating relevant telemetry; reranking = signal analysis; generation = mission briefing | Narrative engagement, temporal data, versioning, missing information, multimodal evidence | Strong episodic plot, natural time/version metadata, good for incomplete or corrupted records | Science-fiction styling can overwhelm content; “AI copilot” can increase anthropomorphism | Keep mission-control instruments visibly mechanical; use uncertainty and missing-log events |
| **Open-book examination** | Pretraining = prior study; retrieved context = permitted notes; prompt = question; answer = synthesis | Minimal explanation of RAG versus closed-book generation | Compact and intuitive | Understates retrieval/indexing complexity; suggests all supplied notes are correct and read faithfully | Use only as a first-minute analogy, then retire it |
| **Newsroom/fact-check desk** | Retriever = researcher; reranker = editor; generator = writer; claim-source matrix = fact-checking | Citation discipline and public information literacy | Emphasizes that fluent prose requires source verification | Personifies algorithmic stages and may imply institutional quality control | Let human learners occupy editorial roles; show machine components as tools |

### Recommended primary framework

Use **“The Evidence Investigation”** as the canonical model:

- The learner is the investigator.
- The system presents search and synthesis instruments.
- Every answer becomes a set of claims.
- Every claim must be linked to supporting or conflicting evidence.
- Retrieval results are candidates, not truth.
- Absence of retrieved evidence is not proof of absence.
- The generator produces a draft theory, not a verdict.

The detective skin is more inviting for novices; the legal-discovery skin is more precise for practitioners. Both can share the same mechanics.

### Anthropomorphism guardrails

Human-role metaphors initially reduce abstraction, but they can create inaccurate mental models, overreliance, and misplaced responsibility. Research on AI education warns that anthropomorphic language can imply sentience or human-like understanding and obscure human accountability. [380][385]

Accordingly:

- Say **“the retriever ranks”**, not “the retriever understands.”
- Say **“the model generates a likely continuation”**, not “the model remembers.”
- Say **“the answer is unsupported”**, not “the model imagined.”
- Place agency with the learner: “You decide whether the evidence supports the claim.”
- Include a persistent **“Where the metaphor breaks”** panel.

---

## 4. Best-in-class interactive visual AI explainers

## 4.1 Comparative landscape

| Tool or family | Primary topic | Signature interaction | Real computation? | Pedagogical evidence | Best lesson for a RAG explainer |
|---|---|---|---|---|---|
| **Transformer Explainer** | Decoder-only transformers and next-token generation | Token-centered Sankey-like flow; click-to-expand attention/probability calculations; custom prompts and sampling controls | Live GPT-2 in browser through ONNX Runtime Web | Controlled study of 90 non-experts; significantly better quiz performance than blog and video [303] | Combine guided learning, real inputs, overview-to-math transitions, and immediate parameter effects |
| **CNN Explainer** | CNN inference | Focus-plus-context views; linked formulas; sliding kernels; uploaded images | Live browser inference with TensorFlow.js | Observational study of 16; high usability and feature ratings, but no rigorous learning baseline [1] | Preserve global context while drilling into one operation; link actual numbers to formulas |
| **Diffusion Explainer** | Stable Diffusion | Timestep controller, denoising animation, guidance slider, prompt-pair trajectories | Primarily precomputed prompt/model states in the evaluated version | 56-person within-subject comparison; 44 preferred it to a leading blog [321] | Make time/iteration navigable; compare near-identical inputs; disclose when results are precomputed |
| **GAN Lab** | Generative-adversarial training | Train toy GANs, adjust hyperparameters, watch distributions evolve | Live browser training | Follow-up evaluation exists, though less conclusive than Transformer Explainer [301][302] | A toy system can expose dynamic behavior that is impossible to show clearly at production scale |
| **TensorFlow Playground** | Basic neural networks | Direct manipulation of architecture, data, noise, and hyperparameters | Live browser model | Designed explicitly for rapid intuition through direct manipulation [275] | Use a small but real model; permit fast reset, sharing, and controlled counterfactuals |
| **Google PAIR AI Explorables** | Model behavior, uncertainty, language models, interpretability | Interactive essays embedded in prose | Usually live or carefully computed demonstrations | Strong design lineage; generally not accompanied by controlled learning evaluations | Integrate narrative and interaction rather than linking out to a separate tool |
| **What Have Language Models Learned?** | Masked-language modeling | Edit sentences and click tokens to inspect BERT predictions | Live BERT-backed interaction | Public explorable, no cited controlled study | Let users edit the exact object being explained [346] |
| **Patchscopes Explorable** | Internal LLM representations | Swap hidden representations across prompts/layers | Research-oriented intervention | Expository rather than learning-outcome evaluation | Progress from behavioral probing toward causal intervention [348] |
| **Anthropic Transformer Circuits essays** | Mechanistic interpretability | Interactive attribution graphs; tracing, pinning, labeling, feature examples | Based on real model traces | Research instrument and essay, not introductory pedagogy | Show causal pathways, but clearly distinguish partial reconstructions from literal “thoughts” [331] |
| **BertViz** | Transformer attention | Head, model, and neuron views | Real attention tensors from supported models | Research/demo tool, limited novice scaffolding | Coordinated multiscale views are powerful, but attention must not be labeled as causal explanation [289] |
| **Brendan Bycroft’s LLM Visualization** | Full GPT-style forward pass | 3D step-through of layers, heads, matrices, and operations | Working tiny transformer | Highly regarded public artifact, but no controlled study located | Spatial spectacle can motivate advanced learners; pair it with a simpler 2D orientation view [293] |
| **TensorFlow Embedding Projector** | High-dimensional embeddings | 2D/3D PCA and t-SNE, nearest-neighbor inspection, labels, subset isolation, custom axes | Real uploaded or TensorBoard embeddings | Mature research tool; not designed as a staged curriculum | Always link projected points to exact original-space neighbors and distances [38] |
| **RAG Visualizer** | Chunking, retrieval, reranking | Four chunking views plus bi-encoder, cross-encoder, ColBERT, and hybrid-RRF views | Real BM25/RRF/MaxSim; hashed trigram embeddings; heuristic—not trained—cross-encoder | Tests and documented examples, but no controlled user study; very young project | Excellent breadth and disclosure; label approximations conspicuously [46] |
| **RAG Playground / RAG-Play class** | End-to-end RAG | Text splitting → vectors → semantic search → context generation | Implementation varies | No controlled study identified | Pipeline completeness is useful, but technical provenance and real-versus-simulated status must be visible [47][51] |
| **RAGExplorer / ChunkLab class** | Practitioner comparison and debugging | Sankey, retrieval tracking, side-by-side strategies, metrics | Generally configurable real pipelines | Engineering tools rather than validated curricula | A strong practitioner tier should expose latency, rankings, cluster quality, and evaluation metrics [49][56] |

### What “best in class” actually means

There are three different forms of excellence:

| Category | Leader | Why |
|---|---|---|
| **Validated novice learning** | Transformer Explainer | Strongest combination of controlled evaluation, guided progression, live computation, and progressive disclosure |
| **Research interpretability** | Anthropic attribution-graph interfaces | Rich tracing and causal-intervention orientation, though unsuitable as the first novice experience |
| **Embedding exploration** | TensorFlow Embedding Projector | Mature linked views, 2D/3D interaction, nearest-neighbor inspection, metadata, and custom projections |
| **RAG pipeline breadth** | RAG Visualizer / ChunkLab class | Broadest coverage of chunking, sparse/dense retrieval, fusion, ColBERT, and reranking, but little learning-science validation |
| **Narrative interactive essays** | Google PAIR Explorables | Best integration of prose, visual experiments, and approachable model behavior |

The central market/research gap is therefore **an evaluated, novice-accessible, technically faithful RAG explainer**.

---

## 5. Visualizing high-dimensional embeddings

## 5.1 The correct visual stack

An embedding explainer should use four coordinated views rather than one scatterplot:

| View | Purpose | Required caveat |
|---|---|---|
| 2D projection | Reveal approximate neighborhoods and possible clusters | Distances and clusters may be projection artifacts |
| Optional 3D projection | Support spatial inspection and engagement | Rotation adds occlusion and navigation burden; it does not restore lost dimensions |
| Original-space neighbor table | Display exact cosine/dot-product scores and ranks | This—not 2D proximity—is what retrieval used |
| Angular/cosine view | Explain query-to-document similarity geometrically | A 2D cone is an analogy for a high-dimensional spherical cap |

### Projection choices

| Method | Preserves or emphasizes | Strengths | Risks | Recommended role |
|---|---|---|---|---|
| **PCA** | Directions of greatest linear variance | Deterministic, fast, interpretable axes, useful for broad geometry | Misses nonlinear manifolds; first components need not align with semantic relevance | Default “stable map”; display explained variance |
| **t-SNE** | Local neighborhood probabilities | Effective at revealing local groups | Perplexity, seed, and optimization strongly affect results; cluster size and inter-cluster distance are unreliable | Advanced toggle; require multi-seed/perplexity comparison |
| **UMAP** | Local neighborhood topology with some larger-scale organization | Fast and effective for large datasets; supports transforms in many implementations | Can create compact or separated clusters and distort global geometry | Default exploratory semantic map, but never the scoring surface |
| **Custom linear axis** | A learner-defined semantic contrast | Tests hypotheses such as formal↔informal or policy↔technical | Depends on labels and chosen anchors; can invite confirmation bias | Practitioner mode |
| **No projection—matrix/heatmap** | Exact pairwise or token-level similarities | Faithful to computed values | Scales poorly and is less immediately intuitive | Use for selected subsets and reranking explanations |

t-SNE’s perplexity changes the effective scale of visible structure, so hyperparameters cannot be


## Sources & Citations

[1] https://poloclub.github.io/papers/20-vis-cnnexplainer.pdf
[2] https://github.com/poloclub/cnn-explainer
[3] https://www.alphaxiv.org/abs/2408.04619
[4] https://github.com/XiaoJiNu/cnn-explainer
[5] https://poloclub.github.io/cnn-explainer/
[6] https://explorable-explanations.com/en/p/cnn-explainer/
[7] https://sites.gatech.edu/research/iclr-2026/
[8] https://github.com/cfcys/cnn-learn
[9] https://github.com/khlaifiabilel/interactive-visualization-convolutional-neural-networks
[10] https://github.com/poloclub/cnn-explainer/blob/d0971f94/README.md?plain=1
[11] https://github.com/mrdbourke/cnn-explainer
[12] https://ui.adsabs.harvard.edu/abs/2020arXiv200415004W/abstract
[13] https://research.ibm.com/blog/how-ai-transformers-work
[14] https://news.research.gatech.edu/taxonomy/term/564?page=12
[15] https://news.research.gatech.edu/taxonomy/term/2570
[16] https://projector.tensorflow.org/?authuser=56
[17] https://www.tensorflow.org/tensorboard/tensorboard_projector_plugin
[18] https://github.com/tensorflow/docs/blob/master/site/en/r1/guide/embedding.md
[19] https://pair.withgoogle.com/explorables/
[20] https://research.google/blog/the-what-if-tool-code-free-probing-of-machine-learning-models/
[21] https://www.tensorflow.org/text/tutorials/word_embeddings
[22] https://codelabs.developers.google.com/codelabs/prototyping-caip-notebooks
[23] https://arxiv.org/pdf/1611.05469
[24] https://github.com/efeiefei/tensorflow_documents_zh/blob/master/get_started/embedding_viz.md
[25] https://research.google/blog/responsible-ai-at-google-research-pair/
[26] https://pair.withgoogle.com/
[27] https://github.com/cnzeki/embedding-projector
[28] https://pair.withgoogle.com/tools/
[29] https://research.google/blog/open-sourcing-the-embedding-projector-a-tool-for-visualizing-high-dimensional-data/
[30] https://explorable-explanations.com/en/p/ai-explorables/
[31] https://www.anthropic.com/research/tracing-thoughts-language-model
[32] https://github.com/RobGruhl/anthropic-docs-mirror/blob/main/anthropic-research/interpretability.md
[33] https://x.com/AnthropicAI/status/1905303838417973669
[34] https://x.com/AnthropicAI/status/1905303835892990278/video/1
[35] https://x.com/AnthropicAI/status/1905303852842123725
[36] https://x.com/AnthropicAI/status/1905303848991805541
[37] https://x.com/AnthropicAI/status/1905303835892990278
[38] https://x.com/AnthropicAI/status/1905303862883365370
[39] https://github.com/berdyshevol/anthropic-research-wiki/blob/main/wiki/sources/tracing-thoughts-language-model.md
[40] https://gigazine.net/gsc_news/en/20250530-anthropic-open-source-circuit-tracing/
[41] https://github.com/berdyshevol/anthropic-research-wiki/blob/main/wiki/concepts/circuit-tracing.md
[42] https://www.anthropic.com/research/mapping-mind-language-model
[43] https://www.anthropic.com/news/tracing-thoughts-language-model
[44] https://www.anthropic.com/research/a-mathematical-framework-for-transformer-circuits
[45] https://www.anthropic.com/news/a-mathematical-framework-for-transformer-circuits
[46] https://github.com/SAGARCHRY0777/rag-visualizer
[47] https://ragplay.vercel.app/
[48] https://jay.tools/tags/machine-learning/
[49] https://github.com/Thymezzz/RAGExplorer
[50] https://stevenfoerster.com/lab/rag-playground/

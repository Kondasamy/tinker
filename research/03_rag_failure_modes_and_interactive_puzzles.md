# Comprehensive Taxonomy and Interactive Debugging Curriculum for RAG Failure Modes

**Research status:** current through **October 19, 2026**

## Executive summary

Retrieval-augmented generation does not have one failure point. It is a **cascading evidence pipeline**:

\[
\text{source} \rightarrow \text{parse} \rightarrow \text{chunk} \rightarrow
\text{represent} \rightarrow \text{retrieve} \rightarrow \text{rerank} \rightarrow
\text{assemble prompt} \rightarrow \text{generate} \rightarrow \text{validate}
\]

A wrong final answer can originate at any stage, and the visible symptom often differs from the root cause. For example, an apparently hallucinated dosage may actually begin with a PDF table-parsing error that separates a dose from its qualifying condition, followed by retrieval of the malformed chunk and faithful generation from bad evidence. This is the problem of **cascade blindness**: evaluating retrieval and generation independently can miss how upstream defects propagate downstream. [7]

The most useful canonical diagnostic framework remains Barnett et al.’s seven failure points:

1. missing content;
2. missed top-ranked documents;
3. retrieved but not placed in context;
4. present in context but not extracted;
5. wrong output format;
6. incorrect specificity; and
7. incomplete answer. [16]

However, these seven are primarily **observable end-to-end breakdowns**, not a complete lifecycle taxonomy. A more comprehensive 2026 systematic taxonomy identifies **33 failure modes across ingestion, representation, retrieval, generation, evaluation, deployment, and agentic orchestration**; only 9 had strong dedicated empirical evidence, while all eight agentic modes remained weakly benchmarked. [7]

Five principles should anchor a learning environment:

- **Expose every intermediate artifact.** Learners should see raw source, parsed text, chunks, embeddings or similarity neighborhoods, first-stage retrieval, reranked results, final context, prompt, answer, and claim-to-source alignment.
- **Diagnose by the first violated invariant**, not by the final symptom.
- **Separate retrieval recall from context quality and generation faithfulness.** High recall can coexist with poor precision; faithful generation can still reproduce stale or incorrect evidence.
- **Use controlled counterfactuals.** Move the same gold passage from prompt beginning to middle to end; vary one parameter at a time; replace only the document date; or split one required fact across a chunk boundary.
- **Score abstention and conflict handling**, not just answer accuracy. RGB found that models showed some noise robustness but struggled with negative rejection, multi-document information integration, and false or counterfactual information. [91]

---

# 1. Background and conceptual model

## 1.1 What RAG is expected to accomplish

A RAG system must perform four logically distinct jobs:

1. **Evidence availability:** the knowledge base contains usable evidence.
2. **Evidence discovery:** retrieval and ranking surface that evidence.
3. **Evidence delivery:** prompt assembly places intact, appropriately ordered evidence within the model’s usable context.
4. **Evidence use:** the generator interprets the evidence, follows instructions, resolves conflicts, and produces a complete supported response.

The standard four-metric decomposition is therefore useful:

- **Context precision:** how much retrieved context is useful.
- **Context recall:** how much necessary evidence was retrieved.
- **Faithfulness:** whether generated claims are supported by context.
- **Answer relevance:** whether the response addresses the question. [1][2]

These metrics answer different questions. A faithful answer may be faithfully wrong because its source is stale; an accurate answer may be unfaithful because it came from parametric memory rather than the supplied sources; and high context recall may produce worse end-to-end performance if the context is flooded with distractors.

## 1.2 A precise distinction between failure location and output symptom

| Concept | Precise meaning | Example | Pipeline owner |
|---|---|---|---|
| **Retrieval miss** | Relevant indexed evidence is absent from retrieved candidates or top-\(k\). | The correct policy clause ranks 17th when \(k=5\). | Retriever/ranker |
| **Semantic false positive** | A passage is close in embedding space but lacks the fact, qualification, entity, or relationship needed to answer. | Query asks for cancellation *fees*; retriever returns general cancellation-policy text with no fee. | Representation/retrieval |
| **Retrieval-induced hallucination** | Misleading, incomplete, stale, or irrelevant retrieval causes the generator to infer unsupported content. | A related passage mentions “30 days,” and the model invents a 30-day refund period. | Cross-stage |
| **Generation hallucination** | The answer contains a claim unsupported by the supplied context even though retrieval/context may be adequate. | Correct price is present, but the model adds an unsupported discount. | Generator |
| **Fabricated citation** | The generator names or cites a source that does not support the attributed claim—or does not exist. | Citation points to chunk 3, which contains no relevant statement. | Generator/validation |
| **Faithful misinformation** | The output accurately reproduces retrieved evidence, but the evidence itself is obsolete, corrupted, or false. | Model correctly quotes an expired 2023 policy. | Ingestion/governance |
| **Parametric override** | The model disregards supplied evidence in favor of memorized prior knowledge. | Updated source says the office moved, but the model gives the former address. | Generator/conflict handling |
| **Context override** | The model follows misleading retrieved context over reliable internal knowledge. | An injected or erroneous source changes a well-known fact. | Retrieval trust/generator |

Dense retrieval captures paraphrases but can introduce noise when a query is ambiguous; lexical retrieval is stronger for exact identifiers, rare terms, formulas, and named entities. This complementarity motivates hybrid dense–lexical retrieval rather than treating vector similarity as factual entailment. [82][86]

---

# 2. Canonical taxonomy: Barnett et al.’s seven failure points

## 2.1 Exact seven-point framework

| ID | Canonical failure point | Observable condition | Pipeline breakpoint | Primary diagnostic question | Typical mitigation |
|---|---|---|---|---|---|
| **FP1** | **Missing Content** | The corpus cannot answer the query, but the system may answer anyway. | Corpus/coverage | Does any valid source contain sufficient evidence? | Add content, detect unsupported queries, abstain. |
| **FP2** | **Missed the Top-Ranked Documents** | The answer exists in the index but is below the top-\(k\) cutoff. | Retrieval/ranking | Did an answer-bearing chunk exist but rank too low? | Hybrid retrieval, query rewriting, metadata, larger candidate pool, reranking. |
| **FP3** | **Not in Context—Consolidation Strategy Limitations** | Correct evidence was retrieved but discarded, truncated, or omitted from the actual prompt. | Context assembly | Is the gold chunk in raw retrieval but absent from the final model input? | Better consolidation, deduplication, token budgeting, parent–child retrieval. |
| **FP4** | **Not Extracted** | The answer is in the prompt, but the LLM fails to use it correctly. | Generation/evidence use | Can the answer be directly highlighted inside the exact prompt received by the model? | Reduce noise, reorder evidence, conflict-aware prompt, stronger reader. |
| **FP5** | **Wrong Format** | Content may be correct, but requested table, list, schema, or other structure is not followed. | Instruction following/output | Does the answer pass the required parser or schema? | Structured decoding, schema validation, retry/repair. |
| **FP6** | **Incorrect Specificity** | Answer is too broad, too narrow, or at the wrong level for the user. | Intent/generation | Does detail level match role, task, and requested scope? | Intent classification, audience metadata, explicit granularity rubric. |
| **FP7** | **Incomplete Answer** | Response is partly correct but omits available requested information. | Generation/coverage | Are all question facets supported in context and represented in the answer? | Decompose query, facet checklist, per-source or per-facet generation. |

Barnett et al. derived the framework from research, education, and biomedical RAG case studies. Their BioASQ investigation indexed 4,017 open-access documents, ran 1,000 questions, used automated evaluation, and manually inspected discrepancies; they found automated evaluation more pessimistic than human review in that domain. [16]

## 2.2 Important limitations of the seven-point framework

Barnett’s framework does not independently enumerate:

- PDF/OCR and layout corruption;
- tokenization or embedding-model mismatch;
- semantic false positives;
- stale evidence and temporal validity;
- authorization or privacy leakage;
- prompt injection;
- conflict between retrieved and parametric knowledge;
- observability failures;
- agent planning, tool, or recursive hallucination failures.

Those should be treated as **root-cause extensions**, while FP1–FP7 remain a compact set of user-visible diagnostic endpoints.

---

# 3. Comprehensive lifecycle taxonomy

The following table consolidates the broader 33-mode taxonomy into a practical engineering map. The evidence ratings come from the 2026 systematic review and should not be interpreted as prevalence rankings. [7]

| Stage | ID | Failure mode | What breaks | Characteristic symptom | Best diagnostic |
|---|---:|---|---|---|---|
| Ingestion | F1 | Stale/outdated data | Temporal validity | Faithful but obsolete answer | Compare source effective dates and supersession graph |
| Ingestion | F2 | Missing/incomplete documents | Corpus coverage | Unsupported answer or abstention | Corpus-support audit |
| Ingestion | F3 | Layout-parsing errors | Tables, columns, footnotes, equations | Values detached from labels or conditions | Parsed-versus-rendered document overlay |
| Ingestion | F4 | Multimodality conversion loss | Images, charts, diagrams | Missing evidence visible only graphically | Compare extracted text with visual source |
| Representation | F5 | Tokenization fragmentation | Domain terms and compounds | Rare term fails to retrieve | Token inspection and exact-term probe |
| Representation | F6 | Embedding drift/model mismatch | Vector compatibility | Silent relevance regression after model update | Frozen-query before/after retrieval comparison |
| Retrieval | F7 | Chunk-boundary errors | Semantic coherence | Definition and qualification land in different chunks | Boundary heat map over gold spans |
| Retrieval | F8 | Domain embedding mismatch | Domain semantics | General embedding confuses specialized concepts | Domain-specific retrieval benchmark |
| Retrieval | F9 | Multi-hop reasoning gap | Cross-document evidence | One hop found, bridge or second hop absent | Hop-by-hop evidence graph |
| Retrieval | F10 | Graph-RAG trade-off | Structure versus coverage | High precision but missing unlinked evidence | Graph coverage and disconnected-node audit |
| Retrieval | F11 | Low recall/ranking failure | Candidate discovery or ordering | Gold evidence below cutoff | Recall@candidate-\(k\), MRR, rank trace |
| Retrieval/context | F12 | Position-of-gold bias | Prompt ordering | Same evidence works at beginning/end but fails in middle | Position-permutation test |
| Generation | F13 | Hallucination despite context | Grounding | Unsupported claims added | Claim-level entailment/citation check |
| Generation | F14 | Unresolved conflicting information | Source reconciliation | Arbitrary selection or silent blending | Conflict pair and provenance matrix |
| Generation | F15 | Incomplete/partial answer | Facet coverage | Some requested components omitted | Question-facet coverage score |
| Generation | F16 | Incorrect specificity | Granularity | Correct but unusably vague or over-detailed | Audience/task-specific rubric |
| Generation | F17 | Wrong output format | Structural compliance | Invalid JSON/table/citation structure | Deterministic parser/schema validation |
| Evaluation | F18 | Metric inadequacy | Measurement validity | Metric says “good” despite unsupported answer | Human calibration and multiple metrics |
| Evaluation | F19 | No continuous monitoring | Drift detection | Production degrades without alerts | Time-series quality and drift dashboards |
| Deployment | F20 | Latency/cost bottleneck | Operational budget | Accurate but unusable system | Stage-level latency/token/cost trace |
| Deployment | F21 | Auditability gap | Provenance | Cannot reconstruct why answer was produced | Immutable source and prompt trace |
| Deployment | F22 | Domain portability degradation | Distribution shift | Good benchmark, poor new-domain behavior | Per-domain slices |
| Deployment | F23 | PII/compliance leakage | Privacy | Sensitive evidence appears in response | Retrieval- and output-layer DLP tests |
| Deployment | F24 | Prompt sensitivity | Robustness | Minor wording change flips answer | Paraphrase metamorphic tests |
| Deployment | F25 | Authorization/policy failure | Access control | Correct answer from unauthorized document | Permission-aware adversarial tests |
| Agentic | F26 | Planning failure | Task decomposition | Circular, shallow, or needlessly complex plan | Plan complexity versus task complexity |
| Agentic | F27 | Tool-selection/execution error | Tool use | Wrong tool, malformed arguments, timeout mishandling | Tool-call validator and error-rate trace |
| Agentic | F28 | Context-memory degradation | State management | Stale cache or cross-user leakage | Memory-age and session-boundary tests |
| Agentic | F29 | Multi-agent coordination failure | Orchestration | Deadlock or contradictory agent outputs | Agreement and message-flow trace |
| Agentic | F30 | Recursive hallucination cascade | Error propagation | Invented intermediate fact drives later searches | Faithfulness by reasoning depth |
| Agentic | F31 | Unbounded cost/latency spiral | Execution control | Recursive retrieval or tool calls | Depth, call-count, and cost limits |
| Agentic | F32 | Unsafe reasoning chain | Compositional safety | Individually safe steps yield unsafe outcome | Step-level and composite policy check |
| Agentic | F33 | Attribution/governance gap | Multi-step provenance | Final claim cannot be traced through agent chain | End-to-end attribution coverage |

Only 9 of these 33 modes had strong evidence under the review’s conservative rubric; 12 were moderate and 12 limited. All eight agentic modes were classified as limited because dedicated peer-reviewed benchmarks remained absent. [7]

---

# 4. Special failure mechanisms

## 4.1 Lost in the Middle

Liu et al. tested multi-document question answering and synthetic key–value retrieval while varying the position of relevant information. Performance was generally highest when evidence appeared at the beginning or end and degraded when the same evidence was placed in the middle, producing a characteristic U-shaped position curve—even for explicitly long-context models. [31]

This is neither a pure retrieval failure nor ordinary hallucination:

- retrieval may be perfect;
- context assembly may include the gold evidence;
- failure arises because the generator uses different context positions unequally.

### Required diagnostic experiment

For every long-context benchmark item, generate at least three prompt variants:

| Variant | Gold evidence placement | Expected interpretation |
|---|---|---|
| P0 | First 10% | Primacy condition |
| P50 | Middle 10% | Lost-in-the-middle stress condition |
| P100 | Last 10% | Recency condition |

Hold every token except ordering constant. If accuracy varies substantially, classify the root cause as **position sensitivity/F12**, not retrieval recall.

### Mitigations

- rerank the most important passages toward prompt boundaries;
- compress or remove low-value context;
- repeat a short evidence synopsis near the answer instruction;
- answer per facet or per document before synthesis;
- use position-permutation regression tests;
- do not assume a larger nominal context window implies uniform utilization.

## 4.2 Semantic false positives

A semantic false positive is not random retrieval. It is a **topically plausible but evidentially insufficient result**.

Common patterns include:

- same entity, wrong attribute;
- same process, wrong product version;
- same medical condition, wrong patient group;
- same policy topic, missing exception;
- antonym or negation collapse;
- related number, wrong unit;
- obsolete source with richer semantic overlap;
- general explanatory text retrieved instead of the exact rule.

A vector score measures embedding similarity—not entailment, factual consistency, temporal validity, authorization, or answer sufficiency.

### Recommended detection labels

Each retrieved passage should receive independent labels:

1. `topic_relevant`;
2. `contains_answer_evidence`;
3. `supports_query_constraints`;
4. `temporally_valid`;
5. `authorized`;
6. `contradicts_other_evidence`.

This prevents “about the right topic” from being mistaken for “supports the answer.”

### Mitigations

- hybrid BM25+dense retrieval;
- metadata filtering before semantic search;
- larger first-stage candidate set followed by cross-encoder reranking;
- answerability or entailment threshold after reranking;
- exact identifier, date, number, and negation features;
- domain-specific embeddings;
- query decomposition for multi-constraint questions.

## 4.3 Chunk-boundary mutilation

Chunking fails when a fact loses the text needed to interpret it. Examples:

- table row separated from its header;
- exception separated from the governing rule;
- pronoun separated from its antecedent;
- dosage separated from patient condition;
- figure caption separated from figure;
- function signature separated from constraints;
- “not” placed in the previous chunk;
- one side of a comparison omitted.

Smaller chunks tend to improve focus but increase fragmentation; larger chunks preserve local context but introduce noise and reduce the number of distinct passages that fit in a prompt. A systematic Natural Questions study found no measurable benefit from overlap in its tested setup, sentence chunking matched semantic chunking cost-effectively, and quality showed a “context cliff” beyond roughly 2.5K context tokens—evidence that chunking recommendations are dataset-dependent rather than universal. [47]

Other benchmarks have reached different optima: NVIDIA reported page-level chunking as the most consistent strategy in its tested datasets, while extreme 128- and 2,048-token settings often underperformed medium sizes. [54] This disagreement is itself a key lesson: **there is no universal chunk size or overlap percentage**.

## 4.4 Retrieval hallucination versus generation hallucination

“Retrieval hallucination” is ambiguous and should be avoided unless qualified.

| Label | Correct usage | Test |
|---|---|---|
| **Retrieval false positive** | Retriever returns related but non-supporting evidence. | Human or entailment label says passage does not support answer. |
| **Retrieval corruption** | Stored chunk misrepresents source due to extraction/chunking. | Compare chunk against original document. |
| **Retrieval-induced hallucination** | Generator extrapolates from poor context. | Hallucination disappears when context is replaced with clean evidence. |
| **Generation hallucination** | Generator adds unsupported claims despite adequate context. | Gold evidence is in prompt; claim lacks support. |
| **Parametric override** | Generator contradicts context with memorized answer. | Strict context answer differs from model-only answer and output follows model-only answer. |
| **Faithful error** | Generator accurately reports wrong or stale retrieved content. | Claim is entailed by context but fails external truth or freshness test. |

A low-faithfulness answer is a generation failure; low context precision or recall is a retrieval-side failure. RAGAS formalizes faithfulness as whether answer claims can be inferred from the supplied context. [1]

---

# 5. First-failure diagnostic protocol

Let:

- \(S\): authoritative source;
- \(I\): parsed/indexed representation;
- \(C\): first-stage candidates;
- \(R\): reranked top results;
- \(P\): exact prompt context;
- \(A\): generated answer.

The **first broken transition** identifies the primary root cause.

| Inspection step | Invariant | If false, diagnose |
|---|---|---|
| 1 | Authoritative evidence exists in \(S\). | Missing content/corpus coverage, FP1/F2 |
| 2 | Evidence survives parsing into \(I\) intact. | Layout/OCR/multimodal ingestion, F3–F4 |
| 3 | An answer-preserving chunk exists in \(I\). | Chunk-boundary error, F7 |
| 4 | Gold chunk appears in candidate set \(C\). | Query/embedding/retrieval recall failure, F5–F11 |
| 5 | Gold chunk survives into reranked set \(R\). | Ranking or threshold failure, FP2/F11 |
| 6 | Gold evidence appears intact in \(P\). | Consolidation, deduplication, truncation, FP3 |
| 7 | Evidence occupies a usable position in \(P\). | Lost in the middle/F12 |
| 8 | Every factual claim in \(A\) maps to \(P\). | Generation hallucination/F13 |
| 9 | Conflicts and source dates are handled explicitly. | Staleness/conflict failure, F1/F14 |
| 10 | All requested facets appear in \(A\). | Incomplete answer, FP7/F15 |
| 11 | Detail and output schema satisfy the request. | Specificity or format, FP5–FP6/F16–F17 |
| 12 | Sources were authorized and output is safe. | Governance/privacy failure, F23/F25/F32–F33 |

This method prevents wasted prompt engineering when the answer never reached the prompt.

---

# 6. Interactive debugging simulator

## 6.1 Recommended interface

The simulator should contain synchronized panels:

| Panel | What learners see | Required visual encoding |
|---|---|---|
| **1. Query inspector** | Original query, rewritten query, detected entities, dates, negations, facets | Color differences introduced by rewrite |
| **2. Source truth** | Authoritative documents and gold evidence spans | Green gold spans; red stale/false spans |
| **3. Parsing view** | Original page beside extracted text | Lines linking table cells, headings, and extracted tokens |
| **4. Chunk map** | Chunk boundaries over the source | Boundary cuts marked red when crossing gold evidence |
| **5. Retrieval view** | Candidate chunks, scores, rank, retriever type | Gold rank, false-positive labels, score histogram |
| **6. Reranking view** | Before/after order and threshold | Arrows showing rank changes and filtered chunks |
| **7. Prompt assembler** | Exact final prompt with token positions | Token ruler; beginning/middle/end zones; truncation marker |
| **8. Generator view** | Model, prompt template, temperature, seed, answer | Parameter comparison and repeated-run variance |
| **9. Claim ledger** | Atomic answer claims and supporting spans | Green=supported, amber=partial, red=unsupported |
| **10. Scoreboard** | Accuracy, recall, precision, faithfulness, latency, cost | Pareto plot rather than one aggregate score |

Arize tracing can visualize inputs, outputs, retrieved chunks, embeddings, and prompt parameters; LangSmith supports dedicated rendering of retrieved documents and metadata. These tools illustrate the level of instrumentation the teaching simulator should reproduce. [167][170]

## 6.2 Pedagogical workflow

1. Show only the query and faulty final answer.
2. Ask the learner to predict the likely failure stage.
3. Charge a small score penalty for each trace panel opened.
4. Require a formal diagnosis:
   - symptom;
   - first broken invariant;
   - root cause;
   - contributing causes;
   - proposed fix;
   - regression test.
5. Allow one parameter change at a time.
6. Re-run and show metric deltas.
7. Present a counterexample where the same fix harms another query.
8. Award full credit only if the learner fixes the benchmark suite—not merely one item.

This creates a debugging task rather than a prompt-tweaking guessing game.

---

# 7. Core simulation scenarios and puzzle designs

## 7.1 Complete scenario set

| Scenario | Corpus construction | Hidden failure | Learner controls | Expected diagnosis | Success criterion |
|---|---|---|---|---|---|
| **Needle in a haystack** | One answer-bearing passage among 50–500 similar distractors | Gold rank, context position, or distractor overload | Candidate \(k\), reranker, final \(k\), document order | Distinguish retrieval miss from lost in the middle | Find evidence and answer correctly across all position permutations |
| **Semantic doppelgänger** | Multiple topically similar chunks; only one satisfies entity/date/version constraints | Semantic false positive | Hybrid weight, metadata filter, reranker threshold | Topic similarity is not answer support | Increase evidence precision without losing gold recall |
| **Chunk-boundary mutilation** | Put definition in one chunk and exception/number in next | F7/FP2 | Chunk size, overlap, structure-aware splitter, parent retrieval | Gold text exists but no self-contained evidence unit exists | Reconstruct answer-preserving chunk |
| **Contradictory sources** | Two credible documents assert incompatible values | F14 or source-governance problem | Authority weights, date filters, conflict prompt | Generator silently chooses or blends | Explicitly report conflict and apply stated resolution policy |
| **Stale-data override** | Older document has stronger lexical/semantic match; newer notice supersedes it | F1 plus ranking recency bias | Temporal filter, effective-date metadata, reranker features | Faithful but obsolete answer | Select latest effective source and cite supersession |
| **Parametric-memory override** | Context deliberately updates a familiar fact | F13/context-memory conflict | Strict versus soft prompt, conflict rationale, temperature | Model uses memorized answer instead of supplied evidence | Follow trusted current context and expose conflict |
| **Cross-document bridge** | Document A identifies an entity; document B contains requested property under another name | F9/FP7 | Query decomposition, iterative retrieval, graph expansion | One-hop retrieval cannot formulate second-hop query | Retrieve and cite both bridge and answer documents |
| **Out-of-domain query** | Corpus contains no relevant material but many weak semantic neighbors | FP1/negative rejection | Similarity gate, abstention prompt, reranker threshold | Forced top-\(k\) creates fake support | Correctly abstain without citing irrelevant chunks |
| **Lost in the middle** | Same gold chunk rotated through beginning, middle, and end | F12/FP4 | Ordering, compression, final \(k\) | Context inclusion alone is insufficient | Stable accuracy across positions |
| **Incomplete list** | Query requests five attributes distributed across documents | FP7/F15 | Facet decomposition, per-facet retrieval, output checklist | Answer is correct but partial | 100% requested-facet coverage |
| **Wrong format** | Correct context; strict JSON schema required | FP5/F17 | Prompt, schema decoder, validator/retry | Content quality and format compliance are separate | Parser accepts output and claims remain supported |
| **Corrupted PDF table** | Dose/value is detached from its condition during extraction | F3→F7→F13 cascade | Parser, table reconstruction, chunker | Visible hallucination has ingestion root cause | Parsed representation matches rendered table |
| **Authorization trap** | Highly relevant document is inaccessible to learner’s role | F25 | Pre- versus post-retrieval access filtering | Correctness does not override authorization | No unauthorized chunk enters trace or answer |
| **Prompt-injected document** | Retrieved page instructs model to ignore system rules | Security/context integrity | Source sanitization, instruction hierarchy, allowlist | Retrieved content is data, not trusted instruction | Ignore malicious instruction while using factual content |
| **Metric illusion** | Reference answer and source use equivalent wording but exact match is low—or answer is fluent but unsupported | F18 | Evaluator mix | Single metric misdiagnoses quality | Human-calibrated retrieval and generation metrics agree |

## 7.2 Needle-in-a-haystack level progression

| Level | Manipulation | Learning objective |
|---|---|---|
| 1 | One exact-match needle, 20 unrelated documents | Basic recall@\(k\) |
| 2 | 100 semantically similar distractors | Semantic false positives |
| 3 | Needle placed at rank \(k+1\) | Cutoff sensitivity |
| 4 | Needle retrieved but removed by reranker | Reranker false negative |
| 5 | Needle in prompt middle | Position bias |
| 6 | Needle split across chunks | Boundary failure |
| 7 | Needle conflicts with an old source | Conflict and temporal resolution |
| 8 | Needle is inaccessible to user | Authorization before relevance |

## 7.3 Contradictory-source puzzle

Example corpus:

- **Document A:** Policy issued January 2024: “Refunds allowed within 30 days.”
- **Document B:** Amendment effective July 2025: “Refund period reduced to 14 days.”
- **Document C:** FAQ updated August 2025 but still says “30 days.”
- **Document D:** Product-specific exception: premium accounts retain 30 days.

Query: “What is the


## Sources & Citations

[1] https://dl.acm.org/doi/pdf/10.1145/3644815.3644945
[2] https://www.semanticscholar.org/paper/Seven-Failure-Points-When-Engineering-a-Retrieval-Barnett-Kurniawan/ba454ba8c594dfb86c25dff2e265c8a2686aa037
[3] https://www.gabormelli.com/RKB/Barnett_et_al.,_2024
[4] https://www.splunk.com/en_us/blog/artificial-intelligence/enterprise-rag-system.html
[5] https://www.unite.ai/how-to-build-reliable-rag-a-deep-dive-into-7-failure-points-and-evaluation-frameworks/
[6] https://labelstud.io/blog/seven-ways-your-rag-system-could-be-failing-and-how-to-fix-them/
[7] https://openrag.notion.site/Seven-Failure-1cb71ae5400444dabd8d592f2367dc60
[8] https://oulurepo.oulu.fi/bitstream/handle/10024/62723/nbnfioulu-202605213573.pdf?sequence=1
[9] https://www.computer.org/csdl/proceedings-article/cain/2024/059100a194/1XSnM2XOQs8
[10] https://sgu.ac.id/architecting-enterprise-ai-series-7-failure-points-of-rag-retrieval-augmented-generation-systems/
[11] https://dev.to/ikilic/the-llm-is-not-the-hard-part-of-rag-dab
[12] https://habr.com/ru/companies/speshu_ai/articles/1093732/
[13] https://dev.to/williamsj04/your-rag-app-isnt-failing-at-the-model-a-developers-guide-to-chunking-retrieval-and-the-4n50
[14] https://dev.to/rhuturaj_takle/rag-retrieval-augmented-generation-2816
[15] https://dev.to/rudratosh/naive-rag-is-lying-to-you-here-are-the-7-architectures-that-actually-survive-production-49cj
[16] https://arxiv.org/abs/2307.03172
[17] https://github.com/MathematicGuy/RAG-RAGAS-EVAL-ARXIV/blob/main/data/standardized/research/Lost_in_the_Middle_2307.03172.md
[18] https://liner.com/review/lost-in-middle-how-language-models-use-long-contexts
[19] https://github.com/AkihikoWatanabe/paper_notes/issues/793
[20] https://www.semanticscholar.org/paper/Lost-in-the-Middle:-How-Language-Models-Use-Long-Liu-Lin/1733eb7792f7a43dd21f51f4d1017a1bffd217b5
[21] https://www.centerconsulting.com/ai-library/papers/lost-in-the-middle
[22] https://aclanthology.org/people/nelson-f-liu/
[23] https://github.com/stellarshenson/claude-code-plugins/blob/main/docs/lost_in_the_middle_summary.md
[24] https://www.alphaxiv.org/abs/2307.03172
[25] https://huggingface.co/datasets/attention-wiki/knowledge-base/blob/refs%2Fpr%2F29/sources/arxiv-2307.03172.md
[26] https://scispace.com/papers/lost-in-the-middle-how-language-models-use-long-contexts-tmn2rzis
[27] https://huggingface.co/datasets/attention-wiki/knowledge-base/discussions/14/files
[28] https://www.scribd.com/document/747483186/Lost-in-the-Middle-How-Language-Models-Use-Long-Contexts
[29] https://wwwhatsnew.com/2026/10/18/ia-se-olvida-tokens-ventana-de-contexto/
[30] https://vanleke.com/blog/2026-08-23-why-long-context-llms-get-lost-in-the-middle.html
[31] https://arxiv.org/html/2309.15217v1
[32] https://arxiv.org/html/2604.23515v1
[33] https://link.springer.com/article/10.1007/s42979-026-05134-x
[34] https://aws.amazon.com/blogs/machine-learning/evaluate-the-reliability-of-retrieval-augmented-generation-applications-using-amazon-bedrock/
[35] https://mlflow.org/articles/tags/rag-evaluation-metrics/
[36] https://atlan.com/know/how-to-evaluate-rag-systems-explained/
[37] https://aclanthology.org/2026.trustnlp-main.27.pdf
[38] https://www.braintrust.dev/articles/rag-evaluation-metrics
[39] https://www.premai.io/blog/rag-evaluation-metrics-frameworks-testing-2026/
[40] https://www.braintrust.dev/articles/what-is-rag-evaluation
[41] https://www.confident-ai.com/knowledge-base/guides/rag-evaluation
[42] https://arxiv.org/pdf/2604.09174v1
[43] https://atlan.com/know/rag-accuracy-problems/
[44] https://weaviate.io/blog/retrieval-quality-rag-overview
[45] https://arxiv.org/html/2510.13975
[46] https://arxiv.org/html/2606.00881v1
[47] https://link.springer.com/chapter/10.1007/978-3-032-21321-1_9?error=cookies_not_supported&code=a04aef1f-99d8-438e-9a5b-284d0b00559d
[48] https://www.cs.toronto.edu/~kenshi/csc401/lectures/15_RAG_2026.pdf
[49] https://www.stackai.com/insights/retrieval-augmented-generation-(rag)-best-practices-for-enterprise-ai-chunking-embeddings-reranking-and-hybrid-search-optimization
[50] https://docs.nvidia.com/enterprise-reference-architectures/enterprise-rag-retrieval-scaling-and-sizing-guide/latest/rag-retrieval-accuracy-performance.html

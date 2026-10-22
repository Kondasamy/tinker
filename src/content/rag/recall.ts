// RAG's recall bank (KTD7): the recap and the warm-up ask from it. Each item asks a chapter's idea in a new
// situation, not the chapter's own question. Numbers come from the same data the chapters import.
import type { RecallItem } from '../../lib/recall';
import { STOPS, STOP_5TB, TIMELINE, WINDOW, formatBytes, formatTokens, tokensFor } from '../../lib/scale';

const win2023 = TIMELINE.filter(e => e.era === 'small-windows' && e.contextTokens).map(e => e.contextTokens!);
const DRIVE = STOPS[STOP_5TB];

export const RECALL: RecallItem[] = [
  // 1. History
  {
    id: 'rag-in-one-line',
    chapter: '01-history',
    pin: true,
    question: 'A colleague asks what RAG does, in one sentence. Which one do you give?',
    options: [
      'It trains the model again on your documents',
      'It looks up the relevant passages first, then has the model answer from them',
      'It gives the model a bigger context window',
    ],
    correct: 1,
    why: [
      'Nothing is retrained. The model stays the same; RAG changes what it reads for each question.',
      'Right. Retrieve the passages that match, then the model answers from them, and can cite them.',
      'A bigger window lets the model read more, but someone still has to choose what goes in. RAG is that choice.',
    ],
  },
  {
    id: 'confident-guess',
    chapter: '01-history',
    question:
      'A new hire asks a general chatbot about Larkspur’s holiday schedule. It answers at once, sounding sure. What is most likely going on?',
    options: [
      'It found the schedule on the company drive',
      'It looked the schedule up on the web',
      'It is guessing from its training data: it has never read the schedule',
    ],
    correct: 2,
    why: [
      'A chatbot with nothing wired in cannot see your drive. It only knows its training data and its prompt.',
      'Nothing was searched. Without a search tool wired in, it has only its training data.',
      'Right. Private documents were never in its training data, so a confident answer is a guess.',
    ],
  },
  {
    id: 'small-windows',
    chapter: '01-history',
    question: `In 2023 a model could read ${formatTokens(Math.min(...win2023))} to ${formatTokens(Math.max(...win2023))} tokens per request. What did that force teams building assistants to do?`,
    options: [
      'Pick the few right passages before the model read anything',
      'Retrain the model for every company',
      'Check every answer by hand',
    ],
    correct: 0,
    why: [
      'Right. Only a few pages fit, and models could barely call tools, so retrieval chose the passages up front.',
      'Retraining for each company was slow and costly, and documents change every day. Retrieval avoided it.',
      'Checking by hand does not scale. The fix was to give the model the right text in the first place.',
    ],
  },
  {
    id: 'retrieval-as-tool',
    chapter: '01-history',
    question: 'In 2026 an AI agent can call a search tool whenever it needs one. What is retrieval to it?',
    options: [
      'Gone: big context windows replaced it',
      'One tool among many: the agent decides when to search',
      'The only way it can read any text',
    ],
    correct: 1,
    why: [
      'Windows grew, but a company’s documents still do not fit, and facts still get lost in long prompts. Retrieval stayed.',
      'Right. Retrieval became a tool the agent chooses to use, and it can search again if the first result falls short.',
      'The agent also reads its prompt and the results of other tools. Search is one way in, not the only one.',
    ],
  },

  // 2. Why not stuff it
  {
    id: 'archive-size',
    chapter: '02-why-not-stuff-it',
    question: `A legal team wants to paste its ${formatBytes(DRIVE)} archive into one prompt. Why will that fail?`,
    options: [
      'Legal text has to be converted to a special format first',
      `It is about ${formatTokens(tokensFor(DRIVE))} tokens, and the largest window holds ${formatTokens(WINDOW)}`,
      'Prompts are not allowed to contain contracts',
    ],
    correct: 1,
    why: [
      'Format is not the problem. Text is text; there is simply far too much of it.',
      'Right. No window comes close, and size is only the first of four problems.',
      'Nothing forbids it. The archive is just far too big to fit, and it would show everyone everything.',
    ],
  },
  {
    id: 'lost-in-middle',
    chapter: '02-why-not-stuff-it',
    question: 'A long manual fits in the prompt, but the fact you need sits halfway through. What risk is left?',
    options: [
      'None: if it fits, the model reads every part equally well',
      'The model may miss it: facts in the middle of a long prompt are often missed',
      'The model will refuse a prompt that long',
    ],
    correct: 1,
    why: [
      'Fitting is not the same as being used. Models pay the least attention to the middle of a long prompt.',
      'Right. A short prompt with the right passage beats a long one with the passage buried in it.',
      'It will read the prompt. The trouble is that it may overlook what is in the middle.',
    ],
  },
  {
    id: 'stale-snapshot',
    chapter: '02-why-not-stuff-it',
    question:
      'The price list changed this morning, but the assistant still quotes last week’s prices from a prompt pasted last week. Why?',
    options: [
      'A pasted prompt is a snapshot: it does not change when the documents do',
      'The model learned the old prices in training',
      'Price lists are too long to fit in a prompt',
    ],
    correct: 0,
    why: [
      'Right. Retrieval reads the current version each time someone asks; a pasted prompt stays frozen.',
      'Your price list was never in its training data. It is quoting the old copy it was handed.',
      'It fit last week. The problem is that nobody pasted the new one.',
    ],
  },
  {
    id: 'one-prompt-for-all',
    chapter: '02-why-not-stuff-it',
    question:
      'Every employee’s assistant shares one giant prompt that includes HR files. An intern asks about a colleague. What goes wrong?',
    options: [
      'Nothing: the model keeps HR files private on its own',
      'The model cannot read HR files, so it says nothing',
      'The model has read everything, so it can tell anyone; retrieval could fetch only what this person may see',
    ],
    correct: 2,
    why: [
      'A model has no idea who is asking or what they may see. Whatever is in its prompt can end up in an answer.',
      'It reads them like any other text. That is exactly the problem.',
      'Right. Permissions have to be applied before the model reads anything, and retrieval is where that happens.',
    ],
  },

  // 3. What is RAG
  {
    id: 'rag-order',
    chapter: '03-what-is-rag',
    question: 'You sketch RAG on a whiteboard. Which order do the three steps go in?',
    options: [
      'Generate an answer, Retrieve passages to check it, Augment the result',
      'Augment the model, Retrieve from its memory, Generate',
      'Retrieve the matching passages, Augment the prompt with them, Generate the answer',
    ],
    correct: 2,
    why: [
      'Generating first is what a bare model does, and that is how it makes things up. The passages come first.',
      'The model is not changed or searched. Retrieval searches your documents, and the prompt is what gets augmented.',
      'Right. Find the passages, put them in the prompt, then let the model answer from them.',
    ],
  },
  {
    id: 'similarity-meaning',
    chapter: '03-what-is-rag',
    question: 'The retriever gives one passage a much higher similarity score than the rest. What does that tell you?',
    options: ['Its meaning is the closest to the question’s', 'It is the newest document', 'It is true'],
    correct: 0,
    why: [
      'Right. The score compares meaning, so the closest passages are handed to the model.',
      'The score ignores dates. Keeping old documents out is a separate filter (chapter 5).',
      'Close is not the same as correct: a retired policy can score high too (chapter 5).',
    ],
  },
  {
    id: 'citation',
    chapter: '03-what-is-rag',
    question: 'Why can a RAG answer point to where it came from, when a bare model cannot?',
    options: [
      'RAG models are trained to add footnotes',
      'It is built from passages it was handed, so it can name them',
      'It searches the web for a source after answering',
    ],
    correct: 1,
    why: [
      'The model is the same one. What changed is that it now reads real passages it can point to.',
      'Right. A grounded answer comes from the passages in its prompt, so it can cite them.',
      'Nothing is searched after the answer. The passages come first, and the answer is built from them.',
    ],
  },
  {
    id: 'not-the-model',
    chapter: '03-what-is-rag',
    question:
      'Your manager wants a bigger model to stop made-up answers about Larkspur policies. What do you tell them?',
    options: [
      'Good idea: a bigger model will know the policies',
      'Lower the temperature and it will stop guessing',
      'The model is not the problem: it needs the right passages in its prompt',
    ],
    correct: 2,
    why: [
      'No model, however big, was trained on Larkspur’s private documents. It would guess more fluently.',
      'Temperature changes how varied the wording is, not what the model knows.',
      'Right. Retrieval hands the model your policy; then even the same model answers correctly.',
    ],
  },

  // 4. Layers
  {
    id: 'cut-exception',
    chapter: '04-layers',
    question:
      'A contract says “Late fees apply, unless the customer has a signed waiver.” The chunker cuts right after “apply,” and only that piece is sent. What will the model say?',
    options: [
      'That late fees always apply: it never saw the exception',
      'The full rule: the model joins the pieces back together',
      'Nothing: cut pieces are thrown away',
    ],
    correct: 0,
    why: [
      'Right. The model reads only the pieces it is handed, and this one lost its exception.',
      'Nothing rejoins the pieces. The model sees exactly what the assembler sends, no more.',
      'Both pieces are kept and searched. Only one was sent, and it was the wrong half.',
    ],
  },
  {
    id: 'overlap-fix',
    chapter: '04-layers',
    question:
      'Your chunker cuts every few words, and an important sentence keeps straddling a cut. Which setting keeps it whole in at least one piece?',
    options: [
      'A bigger model',
      'Overlap: repeat the end of each piece at the start of the next',
      'Fewer documents in the index',
    ],
    correct: 1,
    why: [
      'The model cannot read words it was never handed. The fix is in the chunker.',
      'Right. With overlap, a sentence near a cut appears whole in one of the two pieces.',
      'The sentence is still cut wherever it is. Removing documents does not change where the chunker cuts.',
    ],
  },
  {
    id: 'embedding-meaning',
    chapter: '04-layers',
    question:
      '“Can I get my money back?” and “What is the refund policy?” share almost no words. How do their embeddings compare?',
    options: [
      'They are close, because embeddings capture meaning, not exact words',
      'They are far apart, because the words differ',
      'They are identical, because both are about refunds',
    ],
    correct: 0,
    why: [
      'Right. Similar meanings get similar numbers, so meaning-search finds the policy for either question.',
      'That is how keyword search behaves. Embeddings compare meaning, so different words can still match.',
      'Close is not identical. Each text gets its own numbers; similar meanings land near each other.',
    ],
  },
  {
    id: 'map-not-score',
    chapter: '04-layers',
    question: 'On the 2D map of embeddings, a dot sits right beside your question. Is it the best match?',
    options: [
      'Yes: closer on the map always means more similar',
      'Not necessarily: the map flattens many numbers into two, and the retriever ranks by the true score',
      'No: the map is drawn at random',
    ],
    correct: 1,
    why: [
      'Squashing many numbers into two distorts distances. The map is a picture, not the ranking.',
      'Right. Use the map to get a feel for meaning; trust the similarity score for the ranking.',
      'The map is not random: similar texts do tend to sit together. It is just not exact.',
    ],
  },

  // 5. Accuracy
  {
    id: 'recall-zero',
    chapter: '05-accuracy',
    question: 'An answer is wrong, and recall@k for that question is 0%. Where do you start?',
    options: [
      'Retrieval: the passage with the answer never reached the model',
      'The model: write it a better prompt',
      'Nowhere: recall does not affect the answer',
    ],
    correct: 0,
    why: [
      'Right. If the right passage never arrives, no model can use it. Fix what is retrieved first.',
      'A better prompt cannot conjure a passage that is not there. Recall says the problem is earlier.',
      'Recall decides what the model can possibly know. At 0% the answer cannot be grounded.',
    ],
  },
  {
    id: 'stale-filter',
    chapter: '05-accuracy',
    question: 'The assistant keeps quoting a retired price list because it ranks high. Which lever keeps it out?',
    options: [
      'Raise top-k so the current list also arrives',
      'A metadata filter on date or status, applied before ranking',
      'Add overlap to the chunker',
    ],
    correct: 1,
    why: [
      'More chunks bring the current list in, but the retired one still comes along, and the model may believe it.',
      'Right. A filter removes outdated documents before ranking, so they never compete.',
      'Overlap fixes sentences cut in two. The retired list is whole, and that is the problem.',
    ],
  },
  {
    id: 'buried-fact',
    chapter: '05-accuracy',
    question:
      'A teammate sets top-k to 20 “to be safe”. Recall is 100%, but the answer says it found nothing. What happened?',
    options: [
      'Retrieval failed to find the passage',
      'The answer is not in the documents',
      'The passage arrived but was buried mid-context; rerank, or put the best chunks at both ends',
    ],
    correct: 2,
    why: [
      'Recall at 100% means retrieval did find it. The problem is what happened after.',
      'It is in the documents, and it even reached the model: that is what 100% recall says.',
      'Right. Long contexts hide facts in the middle. Move the best chunks to where the model looks.',
    ],
  },
  {
    id: 'vague-question',
    chapter: '05-accuracy',
    question: 'Someone types “it won’t let me in again??” and nothing useful comes back. Which lever do you reach for?',
    options: [
      'Query rewrite: send the retriever a clearer version of the question',
      'A metadata filter',
      'A smaller chunk size',
    ],
    correct: 0,
    why: [
      'Right. Nothing in the documents looks like the vague question. A clearer rewrite matches the passage that answers it.',
      'A filter removes documents; it cannot make a vague question match the right one.',
      'Chunk size changes the pieces, not the question. The question is what fails to match.',
    ],
  },
  {
    id: 'look-alike',
    chapter: '05-accuracy',
    question:
      'A question names an exact product code, but meaning-search returns notes that only sound similar. Which lever helps?',
    options: ['Lower top-k to 1', 'Add overlap to the chunker', 'Hybrid search: mix in exact keyword matching'],
    correct: 2,
    why: [
      'With one chunk you just keep the top look-alike. The ranking itself is wrong.',
      'Overlap keeps sentences whole; the look-alikes are whole sentences already.',
      'Right. Keyword matching rewards the exact terms, so the real document outranks the look-alike.',
    ],
  },

  // 6. Types
  {
    id: 'two-docs',
    chapter: '06-types',
    question:
      '“Who signs off on spending for the team that runs our loading docks?” One document names the team; another names its approver and never mentions docks. Which type fits?',
    options: [
      'Naive RAG: one good search will find it',
      'GraphRAG: it follows the team from one document to the next',
      'Multimodal RAG',
    ],
    correct: 1,
    why: [
      'One search matches the question’s words, and the approver’s document does not contain them.',
      'Right. The graph links the people, teams and products documents name, so it can hop from one to the next.',
      'Nothing here is a table, PDF or image. The problem is joining two text documents.',
    ],
  },
  {
    id: 'table-row',
    chapter: '06-types',
    question:
      'The answer sits in one row of a price table, and the reader only handles plain text. Which type do you need?',
    options: [
      'Multimodal RAG: parse tables to text and keep each row whole',
      'Agentic RAG: search again until it shows up',
      'Self-correcting RAG',
    ],
    correct: 0,
    why: [
      'Right. A plain-text reader skips the table, so no search can find it until it is parsed.',
      'Searching again finds the same text. The table was never read, so it is not there to find.',
      'Grading can tell you retrieval failed, and then say “I don’t know”, but it cannot read the table.',
    ],
  },
  {
    id: 'say-i-dont-know',
    chapter: '06-types',
    question: 'For compliance questions, a confident wrong answer is worse than no answer. Which type fits?',
    options: [
      'GraphRAG',
      'Self-correcting RAG: grade what came back, retry, or say “I don’t know”',
      'Naive RAG with a bigger top-k',
    ],
    correct: 1,
    why: [
      'GraphRAG joins facts across documents. It does not check that what it found is any good.',
      'Right. It checks retrieval before the model answers, and refuses rather than guesses.',
      'More chunks bring more look-alikes and bury the right one. Nothing checks the result.',
    ],
  },
  {
    id: 'cut-chunk-agent',
    chapter: '06-types',
    question: 'The first search returns a chunk that stops mid-sentence. Which type can notice and fetch the rest?',
    options: ['Naive RAG', 'Multimodal RAG', 'Agentic RAG: it reads what came back and decides to search again'],
    correct: 2,
    why: [
      'One search, then answer: naive RAG never looks back at what it got.',
      'Multimodal is about tables, PDFs and images, not a sentence cut short.',
      'Right. The agent sees the chunk is cut, fetches its neighbours, and reads the sentence whole.',
    ],
  },

  // 7. Sandbox
  {
    id: 'one-lever',
    chapter: '07-sandbox',
    question: 'On the workbench you change three settings at once, and the answer turns correct. What do you know?',
    options: [
      'Not which one fixed it: change one lever at a time and compare runs',
      'All three were needed',
      'The model learned from your earlier runs',
    ],
    correct: 0,
    why: [
      'Right. One change per run is how the results strip tells you what each lever does.',
      'Maybe one was enough and two did nothing, or made things worse. You cannot tell from one run.',
      'The model learns nothing between runs. Only your settings changed.',
    ],
  },
  {
    id: 'cut-the-wire',
    chapter: '07-sandbox',
    question:
      'You cut the wire that carries passages to the model and run the question again. What happens to the answer?',
    options: [
      'It stays the same: the model remembers the last passages',
      'It becomes made up: nothing reaches the model, so it guesses from training',
      'The pipeline stops with an error',
    ],
    correct: 1,
    why: [
      'The model keeps nothing between requests. Each answer comes only from what is in that prompt.',
      'Right. Without passages it is a bare model again, and it answers from training, sure of itself.',
      'The model still answers. That is the danger: it answers without your documents.',
    ],
  },
  {
    id: 'start-simple',
    chapter: '07-sandbox',
    question: 'A team asks one-fact questions about current policies. Which type do you start with?',
    options: ['Agentic RAG, to be safe', 'GraphRAG', 'Naive or advanced RAG: one tuned search is cheapest and enough'],
    correct: 2,
    why: [
      'An agent pays for extra searches. With nothing left to fetch, they buy nothing.',
      'There is nothing to chain: each answer sits in one sentence.',
      'Right. Start simple and tune it; move to another type when a question needs it.',
    ],
  },
];

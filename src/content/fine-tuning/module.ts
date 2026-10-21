// Fine-tuning vs prompting, module 9: its chapters and module facts. Chapter ids are a contract with readers' saved
// progress: never rename one. All seven chapters are listed; chapters 5–7 are written in U21.
import type { Chapter, Module } from '../../lib/modules';
import { RECALL } from './recall';
import { fact } from '../../lib/fine-tuning/facts';

const CHAPTERS: Chapter[] = [
  {
    id: '01-three-ways', title: 'Three ways to change an answer', short: 'Three ways',
    intro: {
      story: 'Larkspur’s assistant answers from the company’s documents, and Evals checks every change before it ships. Now the support lead wants every reply to sound like Larkspur and sign off as the team. Someone in the meeting says: “Just fine-tune it.”',
      goal: 'What can you change to change an answer, and where does each change live?',
      learn: [
        'The three levers: the prompt, the documents and the weights',
        'Which lever changes what the model reads, and which changes the model itself',
        'Why a reply’s style and its facts can come from different levers',
      ],
      terms: [
        ['Prompt', 'The words sent to the model with each question, like “sign off as the Larkspur team”. Sent every time.'],
        ['Documents', 'Passages fetched for each question and put in front of the model, as in the RAG module.'],
        ['Weights', 'The numbers inside the model that decide what it writes. They change only when the model is trained.'],
        ['Fine-tuning', 'Training a model that already exists a little further, on your own examples, so its weights change.'],
      ],
    },
  },
  {
    id: '02-what-training-does', title: 'What training does', short: 'What training does',
    intro: {
      story: 'Chapter 1 showed three levers on paper. Here you pull the weights lever for real, on Larkspur mini: a tiny model that runs in your browser, trained once on Larkspur’s documents and then fine-tuned on the team’s past replies.',
      goal: 'What does fine-tuning change, and what does training look like while it runs?',
      learn: [
        'How a fine-tuned copy writes differently from its base model on a question it never trained on',
        'What the training loss is, and why it falls',
        'Why the change lives in the weights, not in the question',
      ],
      terms: [
        ['Base model', 'The model before fine-tuning: here, Larkspur mini as it was first trained.'],
        ['Training example', 'One question and the reply the team wants, used to adjust the weights.'],
        ['Loss', 'How surprised the model is by the next piece of the text, on average. Training nudges the weights to lower it.'],
        ['Training step', 'One small change to the weights, made after the model reads a batch of examples.'],
      ],
    },
  },
  {
    id: '03-small-adapters', title: 'Small adapters', short: 'Small adapters',
    intro: {
      story: 'The fine-tune worked: Larkspur mini signs off. But it changed every weight in the model, and the team would need a whole copy of the model for every style they train.',
      goal: 'How can training change a model’s replies while touching only a small share of its weights?',
      learn: [
        'How many weights a full fine-tune trains, counted from the model’s shapes',
        'What LoRA trains instead, and why that is so much smaller',
        'Why an adapter can be clipped on and off one shared base model',
      ],
      terms: [
        ['Full fine-tune', 'Training that changes every weight in the model, so the result is a whole new copy.'],
        ['LoRA', fact('lora').claim],
        ['Adapter', 'The small set of weights LoRA trains. It sits beside the base model, which stays as it was.'],
        ['Rank', 'How thin LoRA’s matrices are. Rank 4 means each adapted matrix gets two thin matrices four wide.'],
      ],
    },
  },
  {
    id: '04-facts-move-style-stays', title: 'Facts move, style stays', short: 'Facts move',
    intro: {
      story: 'Larkspur’s fine-tuned assistant sounds right. Then purchasing cuts the bulk price of the Kestrel K2 scanner, and a customer asks what it costs.',
      goal: 'When a fact changes, which version gives the new answer, and why?',
      learn: [
        'Why weights hold what they were trained on, including facts that later change',
        'Why documents carry a new fact the moment they are updated',
        'How Evals’ key-fact check catches an answer that sounds right and is out of date',
      ],
      terms: [
        ['Key fact', 'The short phrase an answer must contain to be right, like a price. Evals’ key-fact check looks for it.'],
        ['Stale', 'Out of date: right when the model was trained, wrong now.'],
      ],
    },
  },
  {
    id: '05-what-training-costs', title: 'What training costs you', short: 'What it costs',
    intro: {
      story: 'Training taught Larkspur mini a sign-off. The team wonders what else it changed, on everything that was not in the style set.',
      goal: 'What does a model lose when it is fine-tuned, and does a small adapter lose less?',
      learn: [
        'How to measure forgetting: score text the model never trained on, before and after',
        'Why a full fine-tune can do worse on the text it used to know',
        'How LoRA trades learning less for forgetting less',
      ],
      terms: [
        ['Held-out text', 'Text kept out of training, used only to score the model.'],
        ['Forgetting', fact('catastrophic-forgetting').claim],
      ],
    },
  },
  {
    id: '06-measure-before-you-train', title: 'Measure before you train', short: 'Measure first',
    intro: {
      story: 'The team has three versions of the assistant: prompted, RAG and fine-tuned. Before anyone pays to train again, the release gate from the Evals module gets a say.',
      goal: 'How do you decide, with numbers, whether fine-tuning beat prompting and documents?',
      learn: [
        'Why you set a baseline before you train',
        'How Evals’ release gate compares the three versions question by question',
        'Why a version can sound better and still fail the gate',
      ],
      terms: [
        ['Baseline', 'The version a new one is measured against: here, the RAG assistant that already ships.'],
        ['Release gate', 'The rule that decides, from a test run, whether a candidate ships.'],
      ],
    },
  },
  {
    id: '07-larkspurs-decision', title: 'Larkspur’s decision', short: 'The decision',
    intro: {
      story: 'Everything is on the bench: the prompt, the documents, the full fine-tune and the adapter, with their scores. The support lead needs a plan for each kind of request.',
      goal: 'Which lever should Larkspur pull for each kind of request?',
      learn: [
        'How to match a lever to what the request needs: a style, a fact, or a skill',
        'How quality, cost and upkeep pull against each other',
        'Why more than one plan can be equally good',
      ],
      terms: [
        ['Upkeep', 'The work a choice needs after launch: retraining, refreshing documents, re-running the evals.'],
      ],
    },
  },
];

export const FINE_TUNING_MODULE: Module = {
  id: 'fine-tuning',
  title: 'Fine-tuning vs prompting',
  description: 'When to train the model, when to prompt it, and when to give it documents.',
  level: 'Advanced',
  status: 'live',
  author: { name: 'Kondasamy Jayaraman', url: 'https://kondasamy.com' },
  prereqs: ['evals', 'transformers'],
  story: 'Back at Larkspur Supply Co., the team wants replies in the company’s own voice, and has to choose between a better prompt, better documents and training the model itself.',
  chapters: CHAPTERS,
  recall: RECALL,
};

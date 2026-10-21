// Structured outputs, module 10: its chapters and module facts. Chapter ids are a contract with readers' saved progress:
// never rename one. Each chapter's `intro` is the story column's opening context; its island is picked by
// src/pages/structured-outputs/[chapter].astro.
import type { Chapter, Module } from '../../lib/modules';
import { RAG_MODULE } from '../rag/module';
import { RECALL } from './recall';

const CHAPTERS: Chapter[] = [
  {
    id: '01-asking-nicely', title: 'Asking nicely', short: 'Asking nicely',
    intro: {
      story: 'Larkspur’s order system wants the assistant’s answers as JSON it can read without a person: a status field, a team, a number of days. The team starts the simple way, by asking Larkspur mini, the tiny model you met in Transformers, for JSON.',
      goal: 'Does asking a model for JSON get you JSON?',
      learn: [
        'Why a request in the prompt is not a guarantee of format',
        'What a model writes when it has never seen the format you ask for',
      ],
      terms: [
        ['JSON', 'A plain text format for data: curly braces around fields, each a quoted name, a colon and a value, like {"status":"delayed"}. Programs read it without guessing.'],
        ['Structured output', 'An answer in a fixed, machine-readable shape (usually JSON) instead of free prose.'],
      ],
    },
  },
  {
    id: '02-a-schema-is-a-contract', title: 'A schema is a contract', short: 'A schema is a contract',
    intro: {
      story: 'Larkspur mini answered in prose. The team writes down exactly what the order system expects, and has the host check every answer against it, as Tool calling’s host checks tool arguments.',
      goal: 'What does checking the answer after it is written buy you, and what does it cost?',
      learn: [
        'What a JSON schema says: which fields, which types, which values',
        'How a check after the answer turns a bad answer into a retry',
        'Why retries cost tokens and still guarantee nothing',
      ],
      terms: [
        ['Schema', 'A written description of the shape an answer must have: its fields, each one’s type, and the values allowed. Larkspur uses the same subset of JSON Schema as Tool calling.'],
        ['Validation', 'Checking a finished answer against the schema. It can only say pass or fail, after the tokens are spent.'],
        ['Retry', 'Asking again after a failed check, and paying for every token again.'],
      ],
    },
  },
  {
    id: '03-the-mask', title: 'The mask', short: 'The mask',
    intro: {
      story: 'Retries got the team nowhere. A different idea: don’t check the answer after it is written; stop the model writing anything the schema doesn’t allow, one token at a time.',
      goal: 'How can a schema stop a model writing invalid JSON, before it writes it?',
      learn: [
        'That the schema allows some tokens at each step and blocks the rest',
        'How the blocked tokens’ probability goes to the allowed ones',
        'Why the answer then always fits the schema',
      ],
      terms: [
        ['Mask', 'At one step of writing, the set of tokens the schema allows. Blocked tokens get zero probability, and the model picks among the rest.'],
        ['Constrained decoding', 'Writing an answer with a mask applied at every step, so only text the schema accepts can come out.'],
      ],
    },
  },
  {
    id: '04-tokens-are-not-characters', title: 'Tokens are not characters', short: 'Tokens, not characters',
    intro: {
      story: 'The mask works. But a schema is written in characters, and the model writes tokens: pieces of one to several characters, as you saw in Tokens. The mask has to judge whole tokens.',
      goal: 'How does a mask written for characters judge a token that carries several?',
      learn: [
        'Why the mask checks every byte of a token, not just its first',
        'How a length cap blocks long tokens before short ones',
        'What token healing fixes at the boundary between prompt and answer',
      ],
      terms: [
        ['Byte', 'The smallest unit of text a computer stores. Larkspur mini’s tokens are runs of bytes; in plain English text one byte is one character.'],
        ['Length cap', 'The most characters a free-text field may hold. Here every free field has one, so the answer always closes.'],
        ['Token healing', 'Backing up over the prompt’s last token and letting the model’s first token start with it, so a prompt that ends mid-token is read the way the training text was split.'],
      ],
    },
  },
  {
    id: '05-choices-from-a-list', title: 'Choices from a list', short: 'Choices from a list',
    intro: {
      story: 'The answers are valid JSON now, but the free text inside them is odd. The order system only knows two statuses. The team gives the model a list instead of a blank.',
      goal: 'What changes when a field is a choice from a list instead of free text?',
      learn: [
        'How an enum turns a free answer into a pick between allowed values',
        'That the pick follows the model’s own preference, shown live',
        'Why a draw can land on the other value',
      ],
      terms: [
        ['Enum', 'A field whose value must be one of a fixed list, like on time or delayed.'],
        ['Preference', 'The share of probability the model gives each allowed value at the step where they part ways.'],
      ],
    },
  },
  {
    id: '06-valid-isnt-right', title: 'Valid isn’t right', short: 'Valid isn’t right',
    intro: {
      story: 'Every answer now passes the check. Larkspur’s team is ready to ship, until someone reads what the answers say.',
      goal: 'If every answer fits the schema, is every answer right?',
      learn: [
        'That the mask forces a value even when the model doesn’t know one',
        'How a well-formed answer can be wrong',
        'What refusals and cut-off answers do to a schema',
      ],
      terms: [
        ['Valid', 'Fits the schema: the right fields, types and values. Says nothing about whether it is true.'],
        ['Cut-off', 'An answer that stopped before it finished, because it ran out of room (a token limit). A cut-off JSON answer doesn’t parse.'],
        ['Refusal', 'An answer in which the model declines the request. Providers return it in a way that may not follow your schema.'],
      ],
    },
  },
  {
    id: '07-workbench', title: 'Workbench: Larkspur’s order schema', short: 'Workbench',
    intro: {
      story: 'Time to design the real thing: Larkspur’s order-status schema, for four orders, with what you know about masks, lists, room and what the model can know.',
      goal: 'Which schema gets a valid and right answer for every order?',
      learn: [
        'How to choose, field by field, between free text, a list and leaving it to the system',
        'Why the model should only fill what it can know',
        'How to read validity and correctness side by side',
      ],
      terms: [
        ['Order system', 'Larkspur’s database of orders. It knows each order’s status and days to arrive; the model doesn’t.'],
      ],
    },
  },
];

export const STRUCTURED_OUTPUTS_MODULE: Module = {
  id: 'structured-outputs',
  title: 'Structured outputs',
  description: 'How a model is made to answer in valid JSON, every time: a schema masks the tokens it may pick.',
  level: 'Intermediate',
  status: 'live',
  author: RAG_MODULE.author,
  prereqs: ['tool-calling', 'tokens'],
  story: 'Larkspur Supply Co.’s order system wants the assistant’s answers as JSON, so the team makes Larkspur mini, a tiny model running in your browser, answer in a schema.',
  chapters: CHAPTERS,
  recall: RECALL,
};

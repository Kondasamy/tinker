// Tool calling & MCP, module 2: its chapters and module facts. Chapter ids are a contract with readers' saved progress: never rename one.
// Only chapters that are written are listed here; each chapter unit appends its own entry (with its `intro`) alongside its island.
import type { Chapter, Module } from '../../lib/modules';

const MODEL: [string, string] = ['Model', 'The language model inside the assistant. It reads text in and writes text out; on its own it cannot open or change anything.'];
const HOST: [string, string] = ['Host app', 'The software around the model: it sends the model the question and the tools, runs the calls the model asks for, and returns the results.'];
const TOOL_CALL: [string, string] = ['Tool call', 'A structured request from the model to run one tool with given arguments, such as get_order with order_id 1042.'];

const CHAPTERS: Chapter[] = [
  {
    id: '01-answers-arent-actions', title: 'Answers aren’t actions', short: 'Answers aren’t actions',
    intro: {
      story: 'In the RAG module you built Larkspur Supply Co.’s assistant: it answers staff questions from company documents. It works. Now the support team wants more. They want it to check an order or issue a refund while a customer is on the phone.',
      goal: 'Can an assistant that answers from documents tell you where an order is right now?',
      learn: [
        'Why a model alone can only write text, never look something up',
        'What happens when you ask it for live data anyway',
        'Who has to do the acting: the software around the model',
      ],
      terms: [
        MODEL,
        ['Order system', 'Larkspur’s live record of every order: customer, items, status and refunds.'],
        ['Tool', 'Something the software around the model can run for it, such as looking up an order.'],
      ],
    },
  },
  {
    id: '02-first-tool', title: 'Your first tool', short: 'Your first tool',
    intro: {
      story: 'In chapter 1 the assistant guessed an order’s status, because nothing joined the model to the order system. The team writes its first tool so the assistant can look orders up.',
      goal: 'How does a model know a tool exists, and when to use it?',
      learn: [
        'What a tool definition holds: a name, a description and a schema for its arguments',
        'The loop: the model proposes a call, the host runs it, the result goes back, the model answers',
        'Why the description decides whether the model picks the tool at all',
      ],
      terms: [
        ['Tool definition', 'What the model reads about a tool: its name, a description of when to use it, and a JSON Schema for its arguments.'],
        ['JSON Schema', 'A standard way to describe the shape of data: which fields, of which type, in which range.'],
        HOST,
        TOOL_CALL,
        ['Tool result', 'What the host sends back to the model after running a call: the data, or an error.'],
      ],
    },
  },
  {
    id: '03-valid-isnt-correct', title: 'Valid isn’t correct', short: 'Valid isn’t correct',
    intro: {
      story: 'The assistant can now look orders up with get_order. But the model writes each call itself, and models make mistakes. The team wants to know which mistakes the host can catch before they reach a customer.',
      goal: 'What does checking a call against its schema catch, and what slips through?',
      learn: [
        'How the host validates a call against the tool’s schema before anything runs',
        'Why a rejected call goes back to the model as an error it can fix',
        'Why a valid call can still be wrong, and how a business check catches it',
      ],
      terms: [
        ['Validation', 'Checking a tool call’s arguments against the tool’s JSON Schema before running it.'],
        ['Integer', 'A whole number, like 1042. The text "1042" in quotes is a string, not an integer.'],
        ['Error result', 'A tool result marked isError. It tells the model what went wrong, so it can try again.'],
        ['Ownership check', 'A rule in your software: a tool only touches orders that belong to the customer being served.'],
      ],
    },
  },
];

export const TOOL_CALLING_MODULE: Module = {
  id: 'tool-calling',
  title: 'Tool calling & MCP',
  description: 'How AI assistants go from answering to acting: tools, the Model Context Protocol, and keeping a human in charge.',
  level: 'Intermediate',
  status: 'live',
  author: { name: 'Kondasamy Jayaraman', url: 'https://kondasamy.com' },
  prereqs: ['rag'],
  story: 'Back at Larkspur Supply Co., the assistant that answers from documents must now act: check an order, issue a refund.',
  chapters: CHAPTERS,
};

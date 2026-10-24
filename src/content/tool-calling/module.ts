// Tool calling & MCP, module 2: its chapters and module facts. Chapter ids are a contract with readers' saved progress: never rename one.
// Only chapters that are written are listed here; each chapter unit appends its own entry (with its `intro`) alongside its island.
import type { Chapter, Module } from '../../lib/modules';
import { RECALL } from './recall';

const MODEL: [string, string] = [
  'Model',
  'The language model inside the assistant. It reads text in and writes text out; on its own it cannot open or change anything.',
];
const HOST: [string, string] = [
  'Host app',
  'The software around the model: it sends the model the question and the tools, runs the calls the model asks for, and returns the results.',
];
const TOOL_CALL: [string, string] = [
  'Tool call',
  'A structured request from the model to run one tool with given arguments, such as get_order with order_id 1042.',
];

const CHAPTERS: Chapter[] = [
  {
    id: '01-answers-arent-actions',
    title: 'Answers aren’t actions',
    short: 'Answers aren’t actions',
    intro: {
      story:
        'In the RAG module you built Larkspur’s assistant: it answers staff questions from company documents. Now support wants it to check orders and issue refunds mid-call.',
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
    id: '02-first-tool',
    title: 'Your first tool',
    short: 'Your first tool',
    intro: {
      story:
        'In chapter 1 the assistant guessed, because nothing joined the model to the order system. The team writes its first tool so it can look orders up.',
      goal: 'How does a model know a tool exists, and when to use it?',
      learn: [
        'What a tool definition holds: a name, a description and a schema for its arguments',
        'The loop: the model proposes a call, the host runs it, the result goes back, the model answers',
        'Why the description decides whether the model picks the tool at all',
      ],
      terms: [
        [
          'Tool definition',
          'What the model reads about a tool: its name, a description of when to use it, and a JSON Schema for its arguments.',
        ],
        ['JSON Schema', 'A standard way to describe the shape of data: which fields, of which type, in which range.'],
        HOST,
        TOOL_CALL,
        ['Tool result', 'What the host sends back to the model after running a call: the data, or an error.'],
      ],
    },
  },
  {
    id: '03-valid-isnt-correct',
    title: 'Valid isn’t correct',
    short: 'Valid isn’t correct',
    intro: {
      story:
        'The assistant now looks orders up with get_order. But the model writes each call itself, and models make mistakes. Which ones can the host catch?',
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
        [
          'Ownership check',
          'A rule in your software: a tool only touches orders that belong to the customer being served.',
        ],
      ],
    },
  },
  {
    id: '04-many-steps',
    title: 'Many tools, many steps',
    short: 'Many steps',
    intro: {
      story:
        'The assistant looks up orders and the host catches bad calls. Real requests need more: two orders at once, or a refund that depends on a lookup.',
      goal: 'How does the assistant handle a request that needs several tool calls?',
      learn: [
        'Why independent lookups can go out together, in one turn',
        'Why a call that needs an earlier result has to wait for it',
        'How the host caps the loop, so one request cannot call tools forever',
      ],
      terms: [
        ['Turn', 'One reply from the model: either an answer, or one or more tool calls.'],
        ['Parallel calls', 'Several tool calls the model asks for in one turn, because none needs another’s result.'],
        ['Sequence', 'Calls made one after another, because each needs the result of the one before.'],
        ['Call cap', 'A rule in the host: the most tool calls one request may make before the loop stops.'],
      ],
    },
  },
  {
    id: '05-mcp',
    title: 'MCP: one plug for many tools',
    short: 'MCP',
    intro: {
      story:
        'Larkspur’s tools now live in two systems: orders and the team calendar. Other teams want AI apps that use them too. Hand-wiring will not last.',
      goal: 'How can any AI app use any system’s tools without a custom integration for each pair?',
      learn: [
        'Why custom integrations multiply, and how one shared protocol turns the product into a sum',
        'Who is who in MCP: the host, its clients and the servers',
        'What a server offers besides tools: resources and prompts',
      ],
      terms: [
        ['Integration', 'Code that joins one AI app to one system so the app can use its tools.'],
        [
          'MCP',
          'The Model Context Protocol: an open standard for how AI apps talk to systems that offer tools and data.',
        ],
        ['MCP server', 'A program that offers one system’s tools, data and prompts to any app that speaks MCP.'],
        ['MCP client', 'The connector inside a host app that talks to one server.'],
        ['JSON-RPC', 'A simple message format: each request names a method, and gets back a result or an error.'],
        ['Resource', 'Data a server offers as context, such as a policy document.'],
        ['Prompt', 'A ready-made message template a server offers, for a person to pick.'],
      ],
    },
  },
  {
    id: '06-when-tools-go-wrong',
    title: 'When tools go wrong',
    short: 'When tools go wrong',
    intro: {
      story:
        'The assistant can now refund money, so every mistake costs: from the model, from a request, or from text someone planted in data it reads.',
      goal: 'What stops a tool call that should not run?',
      learn: [
        'How an approval gate puts a person in front of every call that changes data',
        'How a narrow permission limits the harm of a call that does run',
        'How text inside a tool result can steer the model, and what protects you either way',
      ],
      terms: [
        ['Approval gate', 'A rule in the host: calls that change data wait for a person to approve or deny them.'],
        [
          'Least privilege',
          'Giving a tool only the power its job needs, such as a limit on how much one refund can be.',
        ],
        [
          'Prompt injection',
          'Instructions hidden in data the model reads, such as a customer note, written to make it do something else.',
        ],
        ['Ledger', 'The order system’s record of every refund: where any damage shows.'],
      ],
    },
  },
  {
    id: '07-workbench',
    title: 'Workbench',
    short: 'Workbench',
    intro: {
      story:
        'The assistant looks up orders, reads the calendar and issues refunds through MCP servers, behind a gate and a limit. New requests arrive, each needing its own setup.',
      goal: 'Given a request, which servers, gate and permissions should the host have?',
      learn: [
        'Connect only the servers whose tools a request uses',
        'Keep the approval gate on wherever a tool that changes data is connected',
        'Set a limit that fits the job and nothing more',
      ],
      terms: [
        [
          'Setup',
          'How the host is configured for a request: which servers it connects, whether the gate is on, and the refund limit.',
        ],
        ['Least privilege', 'Giving the host and its tools only the power a request needs, and no more.'],
      ],
    },
  },
];

export const TOOL_CALLING_MODULE: Module = {
  id: 'tool-calling',
  title: 'Tool calling & MCP',
  description:
    'How AI assistants go from answering to acting: tools, the Model Context Protocol, and keeping a human in charge.',
  level: 'Intermediate',
  status: 'live',
  author: { name: 'Kondasamy Jayaraman', url: 'https://kondasamy.com' },
  prereqs: ['rag'],
  story:
    'Back at Larkspur Supply Co., the assistant that answers from documents must now act: check an order, issue a refund.',
  chapters: CHAPTERS,
  recall: RECALL,
};

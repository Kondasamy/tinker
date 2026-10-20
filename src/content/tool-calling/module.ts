// Tool calling & MCP, module 2: its chapters and module facts. Chapter ids are a contract with readers' saved progress: never rename one.
// Only chapters that are written are listed here; each chapter unit appends its own entry (with its `intro`) alongside its island.
import type { Chapter, Module } from '../../lib/modules';

const CHAPTERS: Chapter[] = [];

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

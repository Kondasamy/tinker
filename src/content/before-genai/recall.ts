// Before GenAI's recall bank: the recap and the warm-up ask from it. One to three items per chapter, each asking the
// chapter's idea in a new situation: what each bot could and couldn't do, what GenAI changed, and which later module
// fixes each gap it left. Every wrong option is a real misconception, and every option has a one-sentence `why`.
// Nothing here quotes or predicts a recorded GenAI reply (R13).
import type { RecallItem } from '../../lib/recall';

const C = {
  script: '01-scripted',
  sorter: '02-intents',
  picks: '03-predictive-ai',
  next: '04-next-word',
  scale: '05-scale',
  chat: '06-chat',
  changed: '07-what-changed',
  stayed: '08-what-stayed',
};

export const RECALL: RecallItem[] = [
  // 7. Same messages, three bots (pinned: the module's one idea)
  {
    id: 'pick-or-write',
    chapter: C.changed,
    pin: true,
    question: 'A colleague calls the GenAI assistant “the old help kiosk, only smarter”. What is the real difference?',
    options: [
      'The kiosk picks a reply someone wrote; GenAI writes a new one',
      'GenAI has many more reply cards to pick from',
      'GenAI matches keywords faster',
    ],
    correct: 0,
    why: [
      'Right: every old bot’s reply was written ahead by a person, while a language model writes each reply as it goes.',
      'GenAI keeps no reply cards at all; it writes every reply word by word.',
      'Speed was never the change, and GenAI has no keyword rules to match.',
    ],
  },
  {
    id: 'one-model-many-tasks',
    chapter: C.changed,
    question: 'Larkspur wants its bot to take on a new kind of request. What does that take, compared with the sorter?',
    options: [
      'The sorter needs a new intent and reply; the same GenAI model can try it as it is',
      'Both need labelled tickets and a written reply',
      'Both need a keyword rule for every wording',
    ],
    correct: 0,
    why: [
      'Right: the sorter only knows its list of intents, while one language model takes on tasks nobody trained it for.',
      'GenAI writes its replies, so nobody has to write one per request.',
      'Neither works by keyword rules; that was the script.',
    ],
  },
  // 1. The bot that followed a script
  {
    id: 'script-new-wording',
    chapter: C.script,
    question: 'A customer asks about delivery in words none of the script’s keywords cover. What does the script do?',
    options: ['It gives its fallback reply', 'It picks the closest rule', 'It writes a reply about delivery'],
    correct: 0,
    why: [
      'Right: a rule fires only when its keyword is in the message, so with none it falls back.',
      'A script never judges closeness; a rule matches its keyword or doesn’t fire.',
      'Every reply a script sends is a card someone wrote ahead.',
    ],
  },
  {
    id: 'keyword-clash',
    chapter: C.script,
    question: 'Someone adds a common word to the tracking rule so more messages match. What can go wrong?',
    options: [
      'Messages meant for other rules now get the tracking reply',
      'Nothing: more keywords only ever help',
      'The script starts writing its own replies',
    ],
    correct: 0,
    why: [
      'Right: the first rule that matches wins, so a common word takes over messages other rules answered.',
      'Each keyword can clash with the rest, so every new one risks a wrong card.',
      'A script only raises cards; more keywords never make it write.',
    ],
  },
  // 2. The bot that sorted messages
  {
    id: 'sorter-learned-words',
    chapter: C.sorter,
    question: 'Why could the sorter answer a message the script had missed?',
    options: [
      'It learned which words go with each intent from labelled tickets',
      'Someone wrote a rule for that exact wording',
      'It writes a reply to fit any message',
    ],
    correct: 0,
    why: [
      'Right: trained on tickets people labelled, it scores new wording against each intent.',
      'The sorter has no keyword rules; it was trained on examples.',
      'It only picks an intent, and that intent’s reply was written by a person.',
    ],
  },
  {
    id: 'sorter-off-list',
    chapter: C.sorter,
    question: 'A customer asks the sorter about something none of its intents covers. What happens?',
    options: [
      'It falls back, since no intent fits well enough',
      'It writes a fitting reply',
      'It makes a new intent for it',
    ],
    correct: 0,
    why: [
      'Right: the sorter knows only its fixed list, so an off-list message gets the fallback.',
      'The sorter never writes; each reply is a card tied to an intent.',
      'New intents come from people labelling tickets, not from the sorter itself.',
    ],
  },
  // 3. AI that picks from a list
  {
    id: 'older-ai-chose',
    chapter: C.picks,
    question: 'What did an email spam filter and a shop’s suggested products have in common?',
    options: [
      'Each picks from a fixed list of choices',
      'Each writes new text for the customer',
      'Each follows keyword rules people typed in',
    ],
    correct: 0,
    why: [
      'Right: one picks inbox or junk, the other products from a catalogue; neither writes.',
      'Writing new text is what GenAI added; these only choose.',
      'Both were trained on examples, not handed keyword rules.',
    ],
  },
  {
    id: 'ai-before-chatgpt',
    chapter: C.picks,
    question: 'Someone says AI arrived with ChatGPT. What is closer to the truth?',
    options: [
      'AI that chose from a list ran in email and shops for years before',
      'No company used AI before ChatGPT',
      'Before ChatGPT, every bot was a keyword script',
    ],
    correct: 0,
    why: [
      'Right: trained spam filters and product suggestions chose for people long before AI could write.',
      'Spam filters and shop suggestions were trained AI, in use long before ChatGPT.',
      'The sorter was already trained, not scripted.',
    ],
  },
  // 4. A machine that guesses the next word
  {
    id: 'what-a-language-model-does',
    chapter: C.next,
    question: 'At heart, what does a language model do?',
    options: [
      'Gives each possible next word a chance, given the text so far',
      'Looks the answer up in a table of replies',
      'Matches the text against keyword rules',
    ],
    correct: 0,
    why: [
      'Right: it scores every word it knows as the next one, then one is chosen.',
      'It keeps no table of replies; it guesses words.',
      'Keyword rules were the script; a language model learned from text.',
    ],
  },
  {
    id: 'guesses-write',
    chapter: C.next,
    question: 'How does a machine that guesses one word at a time write a whole reply?',
    options: [
      'It adds its guess to the text and guesses again',
      'It guesses the whole reply at once',
      'It picks the reply from a list',
    ],
    correct: 0,
    why: [
      'Right: each guessed word joins the text, and the next guess reads it.',
      'It guesses one word at a time, never a whole reply.',
      'Picking from a list was the older bots; this one writes.',
    ],
  },
  // 5. More text, bigger models
  {
    id: 'scale-new-tasks',
    chapter: C.scale,
    question: 'What changed when language models got far bigger and read far more text?',
    options: [
      'They could do tasks nobody trained them for',
      'They stopped guessing the next word',
      'They needed a rule for each task',
    ],
    correct: 0,
    why: [
      'Right: a big enough model can do a new task from a few examples in the prompt.',
      'They still guess the next word; they got much better at it.',
      'No rules were added; the same model took on many tasks.',
    ],
  },
  // 6. Taught to follow instructions
  {
    id: 'base-continues',
    chapter: C.chat,
    question: 'You type a customer’s question into a base model. What might it do?',
    options: [
      'Carry on the text, perhaps with more questions',
      'Answer it like a helpful assistant',
      'Refuse, since it has no reply card',
    ],
    correct: 0,
    why: [
      'Right: a base model only continues text, so a question may get more questions.',
      'Answering is what instruction tuning teaches; a base model hasn’t had it.',
      'A base model has no reply cards; it always continues the text.',
    ],
  },
  {
    id: 'chatgpt-reach',
    chapter: C.chat,
    question: 'Why did ChatGPT reach so many people?',
    options: [
      'It was tuned to follow instructions, and free to try in a chat window',
      'It was the first language model ever built',
      'It ran on keyword rules people trusted',
    ],
    correct: 0,
    why: [
      'Right: instruction tuning made it answer, and a free chat window put that in front of everyone.',
      'Language models existed for years before it, GPT-3 among them.',
      'It wrote every reply; it had no keyword rules.',
    ],
  },
  // 8. What GenAI didn't fix
  {
    id: 'gap-made-up',
    chapter: C.stayed,
    question: 'The assistant answers confidently about a policy your company never had. What catches that?',
    options: [
      'Tests on its answers, checked against known right ones',
      'A bigger model',
      'A longer list of reply cards',
    ],
    correct: 0,
    why: [
      'Right: evals test the assistant’s answers, so made-up ones get caught before customers see them.',
      'Bigger models still make up answers that sound right.',
      'The assistant writes its replies; reply cards were the old bots.',
    ],
  },
  {
    id: 'gap-cant-act',
    chapter: C.stayed,
    question: 'A customer asks the assistant to cancel an order. Why can’t a plain GenAI assistant do it?',
    options: [
      'It can only write words; acting needs tools linked to your systems',
      'It can’t understand the request',
      'Cancelling needs a keyword rule',
    ],
    correct: 0,
    why: [
      'Right: tool calling lets it act on your systems; without tools it can only write.',
      'It reads the request fine; it just has no way to act on it.',
      'Keyword rules were the script; acting needs a tool.',
    ],
  },
  {
    id: 'company-answers',
    chapter: C.stayed,
    question: 'A chatbot on your website gives a customer wrong advice. Can the company blame the bot?',
    options: [
      'No: the company answers for what its chatbot tells customers',
      'Yes: a bot’s replies bind nobody',
      'Only the model’s maker can be held to it',
    ],
    correct: 0,
    why: [
      'Right: a tribunal held Air Canada responsible for what the chatbot on its website told a customer.',
      'The tribunal found the chatbot is still part of the company’s website.',
      'The tribunal held the airline responsible for its own website’s chatbot.',
    ],
  },
];

// Voice's recall bank: the recap and the warm-up ask from it. Three items per chapter, each asking the chapter's idea in
// a new situation. Every wrong option is a real misconception, and every option has a `why` line.
import type { RecallItem } from '../../lib/recall';

export const RECALL: RecallItem[] = [
  // 3. Whose turn is it? (pinned: the module's one idea)
  {
    id: 'silence-trade-off',
    chapter: '03-whose-turn-is-it',
    pin: true,
    question:
      'A bank’s phone assistant keeps answering before callers finish reading out long account numbers. What is the trade-off in raising its silence setting?',
    options: [
      'None: a longer silence setting is always better',
      'Fewer cut-offs, but every caller waits longer for a reply after they finish',
      'It makes speech-to-text more accurate',
      'It makes the model answer faster',
    ],
    correct: 1,
    why: [
      'Every extra millisecond of waiting for silence is added to every reply. Past a point the line feels dead.',
      'Right. The line has to wait out the silence before it knows the turn is over, so the cure for cut-offs is paid for in dead air.',
      'The silence setting only decides when the turn ends; it doesn’t change how the words are heard.',
      'It does the opposite: the model can’t start until the turn has ended.',
    ],
  },
  {
    id: 'noisy-threshold',
    chapter: '03-whose-turn-is-it',
    question:
      'A caller rings from a busy kitchen, and the line never seems to notice they have stopped talking. Which setting is most likely wrong?',
    options: [
      'The energy threshold is so low that the kitchen noise counts as speech',
      'The silence setting is too short',
      'The model is too slow',
    ],
    correct: 0,
    why: [
      'Right. If the background is louder than the threshold, the line never hears silence, so the turn never ends on its own.',
      'A short silence setting ends turns too early, not too late.',
      'The model only starts once the turn has ended; here the turn never ends.',
    ],
  },
  {
    id: 'cut-off-what',
    chapter: '03-whose-turn-is-it',
    question:
      'A support lead hears the assistant ask “Which order is it?” while the caller is still saying the order number. What is this called?',
    options: ['Dead air', 'A cut-off: the line took a pause for the end of the turn', 'A mishearing', 'Barge-in'],
    correct: 1,
    why: [
      'Dead air is the opposite: too long a silence after the caller has finished.',
      'Right. The caller hadn’t finished; a pause ended their turn too early.',
      'Speech-to-text may have written every word correctly. The turn simply ended too soon.',
      'Barge-in is the caller talking over the assistant, not the other way round.',
    ],
  },
  // 1. Larkspur's phone line
  {
    id: 'three-stages',
    chapter: '01-larkspurs-phone-line',
    question: 'A hotel builds a phone line from three parts. In what order does a guest’s question pass through them?',
    options: [
      'Speech-to-text, then the model, then text-to-speech',
      'The model, then speech-to-text, then text-to-speech',
      'Text-to-speech, then the model, then speech-to-text',
    ],
    correct: 0,
    why: [
      'Right. The voice is written down, the model reads the text and writes a reply, and the reply is spoken.',
      'The model in a chained line reads text, so the voice must be written down first.',
      'Text-to-speech speaks the reply; it comes last, not first.',
    ],
  },
  {
    id: 'model-reads-text',
    chapter: '01-larkspurs-phone-line',
    question: 'In a chained voice line, what does the model in the middle actually receive?',
    options: ['The caller’s audio', 'A transcript: the caller’s words as text', 'A summary written by text-to-speech'],
    correct: 1,
    why: [
      'In a chained line the audio stops at speech-to-text. A speech-to-speech model is the one that hears audio.',
      'Right. The model is the same text model as in a chat window; only the ends of the line deal with sound.',
      'Text-to-speech speaks the model’s reply; it writes nothing for the model.',
    ],
  },
  {
    id: 'where-to-look',
    chapter: '01-larkspurs-phone-line',
    question: 'A caller says the assistant answered about the wrong product. Which stage’s output do you read first?',
    options: ['The transcript speech-to-text wrote', 'The text-to-speech voice settings', 'The caller’s phone'],
    correct: 0,
    why: [
      'Right. If the transcript is wrong, everything after it was built on the wrong words. It is also the easiest place to look.',
      'The voice only reads the reply out; it can’t change which product the reply is about.',
      'The phone carries the sound, but it’s the transcript that shows what the line heard.',
    ],
  },
  // 2. The latency budget
  {
    id: 'stages-add-up',
    chapter: '02-the-latency-budget',
    question: 'A team cuts its speech-to-text time in half. Why might callers barely notice?',
    options: [
      'Speech-to-text is only one of the stages that add up to the wait',
      'Callers can’t hear a difference under a second',
      'Speech-to-text doesn’t count towards the wait',
    ],
    correct: 0,
    why: [
      'Right. The wait is a sum: waiting for silence, transcribing, the model, the voice. Halving one small part leaves the rest.',
      'People notice gaps much shorter than a second: in conversation, replies usually come within a fraction of one.',
      'It does: the model can’t start until the transcript is ready.',
    ],
  },
  {
    id: 'streaming-what',
    chapter: '02-the-latency-budget',
    question: 'A voice line turns streaming on. What changes for the caller?',
    options: [
      'They hear the first sentence sooner, while the rest is still being written',
      'The whole reply is written faster',
      'The reply gets shorter',
    ],
    correct: 0,
    why: [
      'Right. The voice starts on the first sentence; the model finishes at the same time as before.',
      'The model writes at the same speed. Streaming changes when the speaking starts, not when the writing ends.',
      'The words are the same; only the timing changes.',
    ],
  },
  {
    id: 'first-sound',
    chapter: '02-the-latency-budget',
    question: 'Which number best predicts whether a call feels slow?',
    options: [
      'The time from the caller’s last word to the first sound of the reply',
      'The time the model takes to write its whole reply',
      'The length of the call',
    ],
    correct: 0,
    why: [
      'Right. That silence is what the caller sits through. Everything after the first sound is the reply being spoken.',
      'Once the voice has started, the rest of the writing happens while the caller listens.',
      'A long call can feel quick if every reply starts promptly.',
    ],
  },
  // 4. Being interrupted
  {
    id: 'barge-in-what',
    chapter: '04-being-interrupted',
    question:
      'A caller says “wait, wrong address” while a delivery assistant is still reading out the old one. What should a line with barge-in do?',
    options: [
      'Stop speaking and listen',
      'Finish the sentence first, then listen',
      'Keep speaking; the caller can repeat it',
    ],
    correct: 0,
    why: [
      'Right. Barge-in means the caller’s voice stops the reply, so they are heard at once.',
      'Finishing the sentence means talking over the caller, and anything they say meanwhile may be lost.',
      'Making the caller repeat themselves is exactly the failure barge-in exists to stop.',
    ],
  },
  {
    id: 'history-kept',
    chapter: '04-being-interrupted',
    question:
      'The assistant was cut off halfway through listing three opening times. What should its history say it said?',
    options: [
      'All three times, as it wrote them',
      'Only the part spoken before the caller cut in',
      'Nothing: the reply was interrupted, so it doesn’t count',
    ],
    correct: 1,
    why: [
      'The caller never heard the rest. A model that thinks it said all three will assume the caller knows them.',
      'Right. The history has to match what the caller actually heard, so the next turn can pick up from there.',
      'Part of it was heard. Dropping it all makes the model repeat itself or lose track.',
    ],
  },
  {
    id: 'talked-over-cost',
    chapter: '04-being-interrupted',
    question: 'A line without barge-in plays its whole reply while the caller is speaking. What is the likely result?',
    options: [
      'The caller’s words never reach the model, so it carries on as if they weren’t said',
      'The model hears both and answers faster',
      'Nothing: speech-to-text queues the caller’s words for later',
    ],
    correct: 0,
    why: [
      'Right. While the line is speaking and not listening, what the caller says is lost, and the next reply ignores it.',
      'Hearing both at once is what barge-in adds. Without it, the caller isn’t heard at all.',
      'A line that isn’t listening has nothing to queue.',
    ],
  },
  // 5. Mishearing
  {
    id: 'numbers-slip',
    chapter: '05-mishearing',
    question: 'Which part of a phone call is speech-to-text most likely to get wrong in a way that matters?',
    options: ['A greeting like “hi there”', 'A booking reference like “four-one-five-fifteen”', 'The word “thanks”'],
    correct: 1,
    why: [
      'Getting a greeting slightly wrong changes nothing the assistant does.',
      'Right. Numbers and codes have no context to fall back on: “fifteen” and “fifty” sound alike, and one wrong digit is a different booking.',
      'A small mistake here wouldn’t change any action.',
    ],
  },
  {
    id: 'read-back',
    chapter: '05-mishearing',
    question:
      'Speech-to-text flags a parcel tracking number as unsure. What should the assistant do before looking it up?',
    options: [
      'Read the number back and wait for a yes',
      'Look it up anyway: the lookup will fail if it is wrong',
      'Ask the caller to spell every word for the rest of the call',
    ],
    correct: 0,
    why: [
      'Right. One short turn catches the mistake before anything is done with the wrong number.',
      'A wrong number can be a real one, someone else’s, so the lookup succeeds and the answer is wrong.',
      'That makes every call slow to fix one unsure word.',
    ],
  },
  {
    id: 'read-back-cost',
    chapter: '05-mishearing',
    question: 'Why not read back every word the caller says?',
    options: [
      'Each read-back adds a turn: worth it for unsure numbers, tiring for everything else',
      'Speech-to-text never gets ordinary words wrong',
      'Read-backs confuse the model',
    ],
    correct: 0,
    why: [
      'Right. A read-back costs a little time, so save it for the details where a mistake changes what happens.',
      'It does get them wrong sometimes; most of those slips just don’t change the answer.',
      'The model handles a read-back like any other turn.',
    ],
  },
  // 6. One model or three
  {
    id: 's2s-what',
    chapter: '06-one-model-or-three',
    question: 'What does a speech-to-speech model do that a chained line doesn’t?',
    options: [
      'Hears audio and speaks audio in one model, with no transcript step in between',
      'Uses three models instead of one',
      'Works without the internet',
    ],
    correct: 0,
    why: [
      'Right. One model listens, decides and speaks; there is no separate ear and mouth.',
      'That describes the chained line: speech-to-text, a model, text-to-speech.',
      'Where a model runs has nothing to do with whether it is chained.',
    ],
  },
  {
    id: 'chained-why',
    chapter: '06-one-model-or-three',
    question:
      'A pharmacy needs every request checked against its rules before the assistant acts on it. Which build fits better?',
    options: [
      'A chained line: the transcript is text the line can check before the model replies',
      'A speech-to-speech model: it is newer',
      'Either: checks don’t depend on the build',
    ],
    correct: 0,
    why: [
      'Right. The text between stages is a natural place to store, read and check what was said.',
      'Newer isn’t the question. The question is where the line can see and check the words before acting.',
      'They do: a check needs the words as text at the moment before the reply.',
    ],
  },
  {
    id: 'turns-both',
    chapter: '06-one-model-or-three',
    question:
      'A team switches to a speech-to-speech model. Do they still need to think about when a caller’s turn ends?',
    options: [
      'Yes: the session still detects turns, with settings like a silence length',
      'No: speech-to-speech models never interrupt',
      'No: callers can’t interrupt a speech-to-speech model',
    ],
    correct: 0,
    why: [
      'Right. Turn detection and interruptions are still there; the session handles them, with the same trade-offs.',
      'They can still cut a caller off if the turn is ended too early.',
      'Callers can interrupt any voice line; the question is how the line handles it.',
    ],
  },
  // 7. Workbench
  {
    id: 'one-setting-many-calls',
    chapter: '07-workbench',
    question:
      'A silence setting fixes the cut-offs on one slow speaker’s call. What should the team check before shipping it?',
    options: [
      'Every other call in the set: the longer wait may add dead air elsewhere',
      'Nothing: the problem call is fixed',
      'Only the slow speaker’s next call',
    ],
    correct: 0,
    why: [
      'Right. A setting is shared by every call, so it has to be judged across all of them.',
      'Fixing one call can break others; the set of calls is what shows it.',
      'One more call from the same speaker says nothing about the rest.',
    ],
  },
  {
    id: 'rules-together',
    chapter: '07-workbench',
    question: 'Why can’t a single setting fix cut-offs, dead air, talking over and a misheard number at once?',
    options: [
      'They have different causes, so each needs its own rule',
      'Because settings can only be changed one at a time',
      'They can: a long enough silence setting fixes all four',
    ],
    correct: 0,
    why: [
      'Right. Turn length, streaming, barge-in and read-back each answer a different failure.',
      'All settings apply together; the point is that each one targets a different failure.',
      'A long silence setting causes dead air, and it does nothing for barge-in or mishearing.',
    ],
  },
  {
    id: 'measure-on-calls',
    chapter: '07-workbench',
    question: 'How should a team pick its voice line settings?',
    options: [
      'Run a set of real-sounding calls through each setting and count cut-offs, dead air and errors',
      'Copy the provider’s defaults',
      'Pick the fastest settings',
    ],
    correct: 0,
    why: [
      'Right. Your callers, your noise and your numbers decide; only your own calls show the trade-off.',
      'A default is a guess about the average line, not yours.',
      'The fastest settings cut callers off.',
    ],
  },
];

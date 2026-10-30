// Multimodal models, module 16: its chapters and module facts. Chapter ids are a contract with readers' saved progress:
// never rename one.
import type { Chapter, Module } from '../../lib/modules';
import { RECALL } from './recall';

const CHAPTERS: Chapter[] = [
  {
    id: '01-a-picture-is-tokens',
    title: 'A picture is tokens too',
    short: 'Pictures are tokens',
    intro: {
      story:
        'Larkspur’s assistant reads text. Now suppliers email invoices as images, the warehouse photographs its notes, and customers send photos of broken parts.',
      goal: 'How does a model that reads tokens read a picture?',
      learn: [
        'Why an image is cut into small squares called patches',
        'How each patch becomes one token, like a piece of text',
        'How to count an image’s tokens from its width and height',
      ],
      terms: [
        ['Multimodal model', 'A model that reads more than one kind of input, such as text and images.'],
        ['Patch', 'A small square of an image, 28 × 28 pixels here. The model reads each patch as one token.'],
        [
          'Visual token',
          'The token a patch becomes. Image tokens are priced and counted against limits like text tokens.',
        ],
      ],
    },
  },
  {
    id: '02-size-and-detail',
    title: 'Size and detail',
    short: 'Size and detail',
    intro: {
      story:
        'An invoice at full size costs thousands of tokens. Larkspur gets hundreds of invoices a week, and someone suggests sending them smaller.',
      goal: 'What do you lose when you send a smaller image?',
      learn: [
        'Why fewer pixels means fewer patches, and so fewer tokens',
        'Why small print is the first thing to go',
        'Why a very large image is scaled down before it is read',
      ],
      terms: [
        ['Resolution', 'How many pixels an image has across and down. Here the size is the long edge in pixels.'],
        ['Downscale', 'Shrinking an image to fewer pixels. The model’s provider does it to any image over its limits.'],
        ['Small print', 'The smallest text on a page: terms, footnotes, fine detail. It blurs away first.'],
      ],
    },
  },
  {
    id: '03-reading-a-scan',
    title: 'Reading a scan',
    short: 'Reading a scan',
    intro: {
      story:
        'Not every page is a clean invoice: the warehouse sends a packing slip with a table, and a handwritten note. An older way turns a scan into text first.',
      goal: 'When is reading the image better than reading its text?',
      learn: [
        'What OCR is, and what it hands the model',
        'Why OCR breaks tables and handwriting',
        'Why a vision model keeps a table’s rows and columns together',
      ],
      terms: [
        [
          'OCR',
          'Optical character recognition: software that turns an image of text into plain text. The model then reads only the text.',
        ],
        ['Vision', 'Here, sending the image itself: the model reads its patches and sees the layout.'],
        ['Layout', 'Where things sit on the page: rows, columns, which number belongs to which line.'],
      ],
    },
  },
  {
    id: '04-pulling-fields-out',
    title: 'Pulling fields out',
    short: 'Pulling fields out',
    intro: {
      story:
        'Accounts wants each invoice’s number, date, order, total and terms typed into the books. The assistant can pull them out, but someone has to know whether it got them right.',
      goal: 'How do you check an extraction field by field?',
      learn: [
        'What extracting fields from a document means',
        'Why grading each field finds what one overall score hides',
        'How OCR and vision compare on cost for clean print',
      ],
      terms: [
        ['Extraction', 'Pulling named fields (a total, a date) out of a document into a fixed form.'],
        ['Field', 'One named value the form needs, like the invoice number.'],
        ['Reference', 'The right value for each field, written by a person, that the extraction is graded against.'],
      ],
    },
  },
  {
    id: '05-photos-of-parts',
    title: 'Photos of parts',
    short: 'Photos of parts',
    intro: {
      story:
        'A customer’s shelf bracket snapped. They don’t know its code, so they send a photo and ask for a replacement.',
      goal: 'What should the assistant do when a photo can’t settle the answer?',
      learn: [
        'How a model names a part from a photo',
        'Why one angle can hide the detail that decides it',
        'Why asking for another photo beats a confident guess',
      ],
      terms: [
        ['Ambiguous', 'Fits more than one answer. Here: two parts that look the same from one side.'],
        ['Angle', 'Where the photo was taken from. A different angle shows different sides.'],
        ['Part number', 'The code a catalogue uses for one exact part, like BR-300.'],
      ],
    },
  },
  {
    id: '06-when-pictures-mislead',
    title: 'When pictures mislead',
    short: 'Pictures mislead',
    intro: {
      story:
        'Two images reach the assistant in one week: a faxed invoice with a smudged total, and a returned crate whose label has a sentence written for the AI.',
      goal: 'How can an image make the assistant wrong, or make it do something it shouldn’t?',
      learn: [
        'Why a misread digit comes back with no sign of doubt',
        'How a check outside the model catches it',
        'Why text inside an image is data, never instructions',
      ],
      terms: [
        ['Misread', 'A reading that comes back confident and wrong, like a smudged 8 read as a 3.'],
        [
          'Cross-check',
          'A rule Larkspur’s own software runs on the reading, such as “the lines must add up to the total”.',
        ],
        [
          'Prompt injection',
          'Text written to steer a model, hidden in something it reads: an email, a web page, or an image.',
        ],
      ],
    },
  },
  {
    id: '07-workbench',
    title: 'Workbench: pick a method and a size',
    short: 'Workbench',
    intro: {
      story:
        'Larkspur now reads three kinds of document daily: invoices, packing slips and warehouse notes. Each can be read by OCR or vision, at any size.',
      goal: 'Which method and size should each kind of document get?',
      learn: [
        'How to choose a method and a size for each kind of document',
        'Why the cheapest setup that gets every field right wins',
        'Why the answer is different for each kind',
      ],
      terms: [
        ['Plan', 'A method and a size for each kind of document.'],
        ['Cost', 'Here, the tokens the model reads: the image’s tokens for vision, the text’s tokens for OCR.'],
        ['Workbench', 'The chapter’s free-play bench: change the plan and see every result.'],
      ],
    },
  },
];

export const MULTIMODAL_MODULE: Module = {
  id: 'multimodal',
  title: 'Multimodal models',
  description: 'How images and documents become tokens, and how a model reads a photo, a scan or an invoice.',
  level: 'Intermediate',
  status: 'live',
  author: { name: 'Samy (Kondasamy Jayaraman)', url: 'https://kondasamy.com' },
  prereqs: ['tokens'],
  story:
    'Larkspur Supply Co.’s assistant starts receiving pictures: supplier invoices, packing slips, notes from the warehouse and photos of broken parts.',
  chapters: CHAPTERS,
  recall: RECALL,
};

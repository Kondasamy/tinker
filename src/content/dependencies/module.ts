// Dependencies: the module's registry entry and chapters. Chapter ids are a contract with readers' saved progress:
// never rename one.
import type { Chapter, Module } from '../../lib/modules';
import { BAD_DAY } from '../../lib/dependencies/story';
import { RECALL } from './recall';

const CHAPTERS: Chapter[] = [
  {
    id: '01-code-you-did-not-write',
    title: 'Code you did not write',
    short: 'Not your code',
    intro: {
      story:
        'Larkspur’s shop app runs on packages other people wrote. One morning the build breaks, and nobody at Larkspur changed a line.',
      goal: 'What does installing the app bring in?',
      learn: [
        'A package is code someone else publishes',
        'Packages bring the packages they need',
        'Why one missing piece breaks the rest',
      ],
      terms: [
        ['Package', 'Code someone published for others to use, with a name and a version.'],
        ['Dependency', 'A package your code needs in order to run.'],
      ],
    },
  },
  {
    id: '02-what-the-numbers-mean',
    title: 'What the numbers mean',
    short: 'The numbers',
    intro: {
      story:
        'Every package in the tower carries a version, and the app asks for each with a range, not one exact version.',
      goal: 'Which new versions does a range let in?',
      learn: [
        'major.minor.patch, and what each promises',
        'A caret takes minors and patches',
        'A tilde takes patches only',
      ],
      terms: [
        ['Version', 'A release’s number, major.minor.patch, like 1.4.2.'],
        ['Range', 'The versions a package will accept, like ^1.4.2.'],
        ['Caret', 'The ^ range: any newer minor or patch, never a new major (below 1.0.0, never a new minor).'],
        ['Tilde', 'The ~ range: newer patches only.'],
      ],
    },
  },
  {
    id: '03-packages-need-packages',
    title: 'Packages need packages',
    short: 'The tree',
    intro: {
      story:
        'The tower is not a list: packages stand on packages. Two of them need the same package at different majors.',
      goal: 'What happens when two packages need different versions of one?',
      learn: [
        'Dependencies have dependencies of their own',
        'A conflict gets a second, nested copy',
        'What stands on what',
      ],
      terms: [
        ['Transitive dependency', 'A package you get through another package, not one you asked for.'],
        ['Nested copy', 'A second copy of a package, kept inside the one that needs the other version.'],
      ],
    },
  },
  {
    id: '04-the-same-install-every-time',
    title: 'The same install every time',
    short: 'The lockfile',
    intro: {
      story: 'Mira’s laptop and the build server install the same app a week apart, and get different packages.',
      goal: 'How do two installs of the same app come out the same?',
      learn: [
        'Ranges let new releases in over time',
        'A lockfile records every exact version',
        'Installs follow the lockfile',
      ],
      terms: [
        ['Install', 'Fetching the packages an app needs and laying them out for it.'],
        ['Lockfile', 'A file listing the exact version at every place in the tree, so installs repeat.'],
      ],
    },
  },
  {
    id: '05-one-bad-patch',
    title: 'One bad patch',
    short: 'Bad patch',
    intro: {
      story: `Day ${BAD_DAY - 1}’s build passed. On day ${BAD_DAY} it breaks, and the only thing new is a patch release nobody at Larkspur asked for.`,
      goal: 'How does a bad release reach an app nobody changed?',
      learn: ['A patch flows into every caret range', 'The lockfile holds the build', 'A tested update keeps it out'],
      terms: [
        ['Build', 'The run that installs the app, puts it together and tests it before it ships.'],
        ['Tested update', 'Refreshing the lockfile only if the tests pass with the new versions.'],
      ],
    },
  },
  {
    id: '06-who-published-this',
    title: 'Who published this?',
    short: 'Hijacked',
    intro: {
      story: 'A stranger takes over the account of a small package deep in the tower and publishes a new patch.',
      goal: 'What keeps a hijacked release out of the app?',
      learn: [
        'Pinning your own packages misses deeper ones',
        'Install scripts off is not enough',
        'The lockfile and a reviewed update',
      ],
      terms: [
        ['Pin', 'Asking for one exact version, with no range.'],
        ['Hijacked release', 'A version published by someone who should not have been able to publish it.'],
        ['Install script', 'A command a package asks to run on your machine while it installs.'],
        ['Payload', 'The harmful part of a hijacked release.'],
      ],
    },
  },
  {
    id: '07-update-policy',
    title: 'An update policy',
    short: 'Policy',
    intro: {
      story:
        'One month of the registry: a bad patch, a hijacked release and a security fix. Larkspur picks how it updates.',
      goal: 'Which policy keeps every build safe and takes the fix soonest?',
      learn: [
        'Ranges, the lockfile and updates together',
        'Why updating too often is a risk too',
        'Why more than one policy can tie',
      ],
      terms: [
        ['Security fix', 'A release that closes a hole others could use; every day without it is a day exposed.'],
      ],
    },
  },
];

export const DEPENDENCIES_MODULE: Module = {
  id: 'dependencies',
  title: 'Dependencies',
  description:
    'Code you did not write: a package manager, version ranges, the lockfile, and one package that breaks the rest.',
  level: 'Intermediate',
  track: 'Classic tech',
  status: 'live',
  author: { name: 'Samy (Kondasamy Jayaraman)', url: 'https://kondasamy.com' },
  prereqs: [],
  story:
    'Larkspur’s shop app pulls in packages it did not write; one morning its build breaks without a code change, and the team learns that a range lets updates in and the lockfile decides when.',
  chapters: CHAPTERS,
  recall: RECALL,
};

// Dependencies' recall bank: the recap and the warm-up ask from it. Three items per chapter, each asking the chapter's
// idea in a new situation. Every wrong option is a real misconception, and every option has a `why` line. The pinned
// item is the module's one-line edge: a version range lets updates in, and the lockfile decides when.
import type { RecallItem } from '../../lib/recall';

const C1 = '01-code-you-did-not-write',
  C2 = '02-what-the-numbers-mean',
  C3 = '03-packages-need-packages',
  C4 = '04-the-same-install-every-time',
  C5 = '05-one-bad-patch',
  C6 = '06-who-published-this',
  C7 = '07-update-policy';

export const RECALL: RecallItem[] = [
  {
    id: 'range-and-lock',
    chapter: C4,
    pin: true,
    question:
      'A colleague says: “Our package.json uses carets, so we always run the versions we tested.” What do you tell them?',
    options: [
      'Carets let newer versions in on any fresh install; only a lockfile fixes what you run, until you update it',
      'Right: a caret pins the version you first installed',
      'Carets only matter when you publish your own package',
    ],
    correct: 0,
    why: [
      'Right. A range says what may come in; the lockfile decides when it does.',
      'A caret is a range: ^1.4.2 accepts 1.4.3, 1.5.0 and more as they are released.',
      'Every install resolves your app’s ranges, so they decide what your app runs.',
    ],
  },
  // 1. Code you did not write
  {
    id: 'most-code-is-theirs',
    chapter: C1,
    question:
      'A small web app names 12 packages in its package file. After installing, its folder holds hundreds. Why?',
    options: [
      'Each package brings the packages it needs, and those bring theirs',
      'The installer adds spare copies in case one breaks',
      'Something is wrong: an app gets exactly what it names',
    ],
    correct: 0,
    why: [
      'Right: dependencies have dependencies, so the tree is far bigger than the list.',
      'An installer fetches only what some package asks for, no spares.',
      'The list names direct dependencies only; the rest come through them.',
    ],
  },
  {
    id: 'pulled-breaks-up',
    chapter: C1,
    question: 'A date-formatting package is removed from the registry. Which apps fail to install?',
    options: [
      'Every app that needs it, directly or through another package',
      'Only apps that name it in their own package file',
      'None: removed packages stay installable for a year',
    ],
    correct: 0,
    why: [
      'Right: whatever stands on it fails, all the way up.',
      'Apps that get it through another package need it just as much.',
      'A removed version can no longer be fetched by a fresh install.',
    ],
  },
  {
    id: 'not-your-code',
    chapter: C1,
    question: 'Your build broke and git shows no new commits. Where do you look first?',
    options: [
      'What the install brought that differs from last time',
      'Your newest commit',
      'The test runner’s settings',
    ],
    correct: 0,
    why: [
      'Right: with no code change, the packages are what moved.',
      'There is no new commit; the change came from outside your code.',
      'Possible, but the packages changing under you is the usual cause.',
    ],
  },
  // 2. What the numbers mean
  {
    id: 'caret-major',
    chapter: C2,
    question: 'An app asks for ^3.2.0 of a chart library. Version 4.0.0 comes out. Does a fresh install take it?',
    options: ['No: a caret never crosses a major', 'Yes: 4.0.0 is newer than 3.2.0', 'Yes, if 4.0.0 is marked stable'],
    correct: 0,
    why: [
      'Right: ^3.2.0 means at least 3.2.0 and below 4.0.0.',
      'Newer is not enough: a new major may break code written for the old one.',
      'Stability labels don’t change a range; the major number does.',
    ],
  },
  {
    id: 'tilde-patch',
    chapter: C2,
    question: 'An app asks for ~2.1.3. Which of these can it get?',
    options: ['2.1.9', '2.2.0', '3.0.0'],
    correct: 0,
    why: [
      'Right: a tilde takes newer patches of 2.1 only.',
      'A new minor is outside a tilde range; a caret would take it.',
      'A new major is outside both a tilde and a caret.',
    ],
  },
  {
    id: 'zero-caret',
    chapter: C2,
    question: 'A young library is at 0.7.2. You ask for ^0.7.2. Which can arrive?',
    options: ['0.7.5', '0.8.0', '1.0.0'],
    correct: 0,
    why: [
      'Right: below 1.0.0 a caret stays within the minor, so only 0.7 patches.',
      'Below 1.0.0 a new minor may break things, so the caret leaves it out.',
      'A new major is never in a caret range.',
    ],
  },
  // 3. Packages need packages
  {
    id: 'two-majors',
    chapter: C3,
    question: 'Your app needs a logger at 5.x; a payment widget you use needs the same logger at 4.x. What happens?',
    options: [
      'Both install: 5.x at the top, 4.x nested inside the widget',
      'The widget gets 5.x and must cope',
      'The install fails until you remove one',
    ],
    correct: 0,
    why: [
      'Right: each finds the major it asked for, and the odd one out is nested.',
      'The widget only promised to work with 4.x; 5.x may break it.',
      'Nested copies exist for exactly this conflict.',
    ],
  },
  {
    id: 'shared-once',
    chapter: C3,
    question: 'Two packages both need a rounding library at ^2.0.0. How many copies does a tidy install keep?',
    options: ['One, shared, since one version meets both ranges', 'Two, one each', 'Three: one each and a spare'],
    correct: 0,
    why: [
      'Right: one copy that satisfies both is enough.',
      'A second copy is only made when the ranges can’t share one.',
      'Installers keep no spare copies.',
    ],
  },
  {
    id: 'transitive',
    chapter: C3,
    question: 'Which of these is a transitive dependency of your app?',
    options: [
      'A library your HTTP client uses, which you never named',
      'The HTTP client you named in your package file',
      'Your own utility folder',
    ],
    correct: 0,
    why: [
      'Right: you get it through another package, not by asking for it.',
      'That one you asked for: it is a direct dependency.',
      'Your own code is not a dependency at all.',
    ],
  },
  // 4. The same install every time
  {
    id: 'lock-commit',
    chapter: C4,
    question: 'A team ignores its lockfile in version control to keep commits small. What do they lose?',
    options: [
      'Every machine resolves the ranges afresh and may get different versions',
      'Nothing: package.json holds the versions',
      'The ability to install at all',
    ],
    correct: 0,
    why: [
      'Right: the lockfile is what makes installs repeat across machines and days.',
      'package.json holds ranges; the exact versions live in the lockfile.',
      'Installs still work, just not the same way twice.',
    ],
  },
  {
    id: 'lock-ignores-new',
    chapter: C4,
    question:
      'A lockfile names roundnum 3.0.1. Version 3.0.2 comes out. What does the next install from the lockfile get?',
    options: ['3.0.1', '3.0.2', 'Whichever the registry lists first'],
    correct: 0,
    why: [
      'Right: installs follow the lockfile, whatever has been released since.',
      'Only an update moves the lockfile to 3.0.2.',
      'The lockfile names an exact version, so the registry’s order doesn’t matter.',
    ],
  },
  {
    id: 'lock-same-tree',
    chapter: C4,
    question: 'Two developers install from the same lockfile a month apart. What do they get?',
    options: ['The same tree', 'Different trees, if anything was released', 'Whatever their own caret ranges pick'],
    correct: 0,
    why: [
      'Right: that is the lockfile’s whole job.',
      'New releases don’t move a lockfile; only an update does.',
      'With a lockfile present, the ranges are not resolved afresh.',
    ],
  },
  // 5. One bad patch
  {
    id: 'patch-spreads',
    chapter: C5,
    question: 'A popular parser ships a broken patch. Which apps break the same day?',
    options: [
      'Those that resolve ranges afresh without a lockfile',
      'Only those that pinned the parser exactly',
      'None: patches can’t break anything',
    ],
    correct: 0,
    why: [
      'Right: their caret and tilde ranges take the patch on the next install.',
      'A pin is exactly what keeps the patch out.',
      'A patch is meant to be safe, but a meant-to-be is not a test.',
    ],
  },
  {
    id: 'tested-update',
    chapter: C5,
    question:
      'A bot opens a pull request every morning that refreshes the lockfile. What should happen before it merges?',
    options: [
      'The tests run against the new versions',
      'Nothing: the versions are newer, so better',
      'The lockfile is deleted',
    ],
    correct: 0,
    why: [
      'Right: a tested update keeps a bad release from reaching the lockfile.',
      'Newer releases can be broken, which is why the update is tested.',
      'Without the lockfile every install would drift again.',
    ],
  },
  {
    id: 'never-modified',
    chapter: C5,
    question: 'A maintainer finds a bug in 1.4.3. How do they fix it under semantic versioning?',
    options: ['Release 1.4.4', 'Edit 1.4.3 in place', 'Delete 1.4.3 and re-upload it'],
    correct: 0,
    why: [
      'Right: a released version never changes; a fix is a new version.',
      'Semantic versioning says a released version’s contents must not be modified.',
      'Re-uploading under the same number would change what that number means.',
    ],
  },
  // 6. Who published this?
  {
    id: 'pin-not-deep',
    chapter: C6,
    question: 'You pin every package your app names. A package three levels down is hijacked. Are you safe?',
    options: [
      'No: the packages you pinned still ask for it with their own ranges',
      'Yes: pins cover the whole tree',
      'Yes, as long as you never import it yourself',
    ],
    correct: 0,
    why: [
      'Right: a pin fixes one package, not what that package asks for.',
      'Pins in your file apply only to the packages you name.',
      'Your dependencies import it for you; its code runs inside your app.',
    ],
  },
  {
    id: 'scripts-not-enough',
    chapter: C6,
    question:
      'You install with scripts off. A hijacked package hides its code in what runs when it is imported. What happens?',
    options: ['The code runs when your app imports the package', 'Nothing: scripts off blocks it', 'The install fails'],
    correct: 0,
    why: [
      'Right: scripts off stops install-time commands, not code that runs on import.',
      'Scripts off only skips install scripts; the package’s own code still ships.',
      'The install succeeds: the package looks like any other.',
    ],
  },
  {
    id: 'review-diff',
    chapter: C6,
    question: 'An update would move a deep package from 1.1.3 to 1.1.4, published by a new account. What do you do?',
    options: [
      'Hold that package back and look before taking it',
      'Take it: it is only a patch',
      'Delete the lockfile and reinstall',
    ],
    correct: 0,
    why: [
      'Right: reading the lockfile diff is where a reviewed update catches a stranger.',
      'A hijacked release is often a small patch; the number tells you nothing.',
      'Deleting the lockfile would take every new release, the hijacked one too.',
    ],
  },
  // 7. An update policy
  {
    id: 'weekly-wins',
    chapter: C7,
    question: 'Why might a weekly tested update beat a daily one?',
    options: [
      'A bad or hijacked release is often caught and removed within days',
      'Daily updates are slower to run',
      'Weekly updates skip the tests',
    ],
    correct: 0,
    why: [
      'Right: waiting a little gives others time to find a bad release first.',
      'Speed isn’t the issue; taking every release at once is.',
      'A tested update runs the tests whatever its cadence.',
    ],
  },
  {
    id: 'never-update',
    chapter: C7,
    question: 'A team never updates its lockfile, so nothing new ever breaks the build. What do they pay?',
    options: ['They miss security fixes', 'Nothing', 'Their builds slow down'],
    correct: 0,
    why: [
      'Right: every day without the fix is a day exposed.',
      'Safe builds, but old holes stay open.',
      'Build speed doesn’t change; what is missing is the fixes.',
    ],
  },
  {
    id: 'exact-pins-cost',
    chapter: C7,
    question: 'A team writes every range as an exact version. What does that cost them?',
    options: [
      'Fixes to those packages never arrive until someone bumps the number by hand',
      'Nothing: exact pins are always safest',
      'Their deeper packages become pinned too',
    ],
    correct: 0,
    why: [
      'Right: even a tested update can’t move a pinned package.',
      'Pins block good releases as well as bad ones.',
      'Deeper packages keep their own ranges; only a lockfile fixes those.',
    ],
  },
];

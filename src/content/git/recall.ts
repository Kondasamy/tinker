// Git's recall bank: the recap and the warm-up ask from it. Three items per chapter, each asking the chapter's idea in
// a new situation. Every wrong option is a real misconception, and every option has a `why` line. The pinned item is
// the module's one-line edge: a commit is a snapshot named by its contents, and a branch is just a label.
import type { RecallItem } from '../../lib/recall';

const C1 = '01-named-by-contents',
  C2 = '02-a-chain-of-snapshots',
  C3 = '03-a-branch-is-a-label',
  C4 = '04-three-way-merge',
  C5 = '05-both-changed-it',
  C6 = '06-rewriting-history',
  C7 = '07-bring-them-in';

export const RECALL: RecallItem[] = [
  {
    id: 'snapshot-and-label',
    chapter: C3,
    pin: true,
    question:
      'A new hire worries: “If I make ten branches to try ideas, I’ll fill the disk with ten copies of the project.” What do you tell them?',
    options: [
      'A branch is only a label pointing at a commit; the commits are stored once, named by their contents',
      'Right: each branch keeps its own full copy of every file',
      'Branches are free only until you commit on them, then Git copies the whole project',
    ],
    correct: 0,
    why: [
      'Right. Making a branch writes a small label; content is stored once and shared by every branch that reaches it.',
      'Git never copies the project per branch: identical contents have one name and are kept once.',
      'A commit on a branch stores only what is new; unchanged files keep the names they already had.',
    ],
  },
  // 1. Named by its contents
  {
    id: 'one-byte',
    chapter: C1,
    question:
      'You fix one typo in a long report and save it to Git. How does the new version’s name compare with the old?',
    options: [
      'Completely different: any changed byte changes the whole hash',
      'Almost the same: one character of the name changes',
      'The same: it is still the same file name',
    ],
    correct: 0,
    why: [
      'Right: a hash mixes every byte, so even one change gives an unrelated-looking name.',
      'Hashes don’t change a little for a little edit; that is what makes them good fingerprints.',
      'Git names a version by its bytes, not by its file name.',
    ],
  },
  {
    id: 'same-bytes',
    chapter: C1,
    question:
      'Two people on different computers each save a file with exactly the same bytes. Will Git give the two versions the same name?',
    options: [
      'Yes: the name comes only from the bytes',
      'No: each computer makes its own name',
      'Only if they also saved it at the same time',
    ],
    correct: 0,
    why: [
      'Right: the same bytes always hash to the same name, anywhere.',
      'The name isn’t made up by the computer; it is computed from the content.',
      'A blob’s name has no time in it; only its bytes count.',
    ],
  },
  {
    id: 'undo-edit',
    chapter: C1,
    question: 'You change a price, then change it back exactly. What name does the file’s content have now?',
    options: ['The original name again', 'A third, new name', 'The name of the changed version'],
    correct: 0,
    why: [
      'Right: the bytes are the original bytes, so the hash is the original hash.',
      'A new name would need different bytes; these are the same as before.',
      'That name belonged to the changed bytes, which are gone.',
    ],
  },
  // 2. A chain of snapshots
  {
    id: 'commit-holds',
    chapter: C2,
    question: 'Which of these is NOT written inside a commit?',
    options: [
      'The list of branches that point at it',
      'The name of its snapshot of the files',
      'The name of its parent commit',
      'Who made it, when, and the message',
    ],
    correct: 0,
    why: [
      'Right: branches point at commits from outside; a commit never lists them, which is why branches can move.',
      'Each commit names the snapshot of the whole project it saves.',
      'Each commit names its parent, which chains history together.',
      'The author, the time and the message are part of the commit, so they are part of its name too.',
    ],
  },
  {
    id: 'tamper',
    chapter: C2,
    question:
      'Someone quietly changes a price in a commit from last month in their copy. Why can everyone tell, just from the newest commit’s name?',
    options: [
      'Each commit holds its parent’s name, so the change renames every commit after it',
      'Git emails everyone when an old commit changes',
      'They can’t: only the old commit’s name changes',
    ],
    correct: 0,
    why: [
      'Right: the names chain, so a changed past shows up as a different newest name.',
      'Nothing is sent; the names alone give it away.',
      'The later commits contain the changed commit’s name, so their names change too.',
    ],
  },
  {
    id: 'snapshot-not-diff',
    chapter: C2,
    question: 'What does a commit save?',
    options: [
      'A snapshot of the whole project, with unchanged files reusing their old names',
      'Only the lines that changed since the last commit',
      'A copy of every file, stored again each time',
    ],
    correct: 0,
    why: [
      'Right: each commit names a full snapshot, but unchanged files keep their existing blobs, so nothing is stored twice.',
      'Git computes differences when you ask; what it stores is a snapshot.',
      'Unchanged files have the same bytes, so the same name, and are stored once.',
    ],
  },
  // 3. A branch is a label
  {
    id: 'commit-moves-head',
    chapter: C3,
    question: 'You are on a branch called fix and you commit. What moves?',
    options: [
      'The fix label moves to the new commit',
      'Every branch moves to the new commit',
      'Nothing moves until you merge',
    ],
    correct: 0,
    why: [
      'Right: the branch HEAD marks moves forward; others stay where they were.',
      'Only the branch you are on moves; that is what keeps work apart.',
      'Committing moves your branch at once; merging is a separate step.',
    ],
  },
  {
    id: 'delete-branch',
    chapter: C3,
    question:
      'A branch was merged into main last week, and today someone deletes the branch. What happens to its commits?',
    options: [
      'They stay: main still reaches them; only the label is gone',
      'They are removed from main’s history',
      'Main goes back to before the merge',
    ],
    correct: 0,
    why: [
      'Right: deleting a branch removes a label, not the commits main reaches.',
      'Main’s history is the chain of commits behind it, and that chain didn’t change.',
      'Main points at the same commit as before; only another label went away.',
    ],
  },
  {
    id: 'head-means',
    chapter: C3,
    question: 'What does HEAD tell you?',
    options: [
      'Which branch you are on, so where your next commit goes',
      'The newest commit in the whole repository',
      'The main branch, always',
    ],
    correct: 0,
    why: [
      'Right: HEAD names your current branch, and your next commit lands there.',
      'Another branch can have newer commits; HEAD follows where you are, not what is newest.',
      'HEAD moves when you switch branches; it isn’t tied to main.',
    ],
  },
  // 4. Three-way merge
  {
    id: 'why-base',
    chapter: C4,
    question:
      'Two branches both have a line that reads differently from the other. Why does Git look at their merge base before deciding?',
    options: [
      'To see which side changed the line; if only one did, it takes that change',
      'To pick the older version, which is safer',
      'To count which side has more commits',
    ],
    correct: 0,
    why: [
      'Right: with the base, Git can tell an edit from an untouched line, so a one-sided change wins on its own.',
      'Git doesn’t prefer old text; it keeps changes and needs the base to find them.',
      'The number of commits doesn’t matter; the base is about what each side changed.',
    ],
  },
  {
    id: 'merge-parents',
    chapter: C4,
    question: 'How is a merge commit different from an ordinary one?',
    options: ['It has two parents', 'It has no snapshot of its own', 'It can never have a message'],
    correct: 0,
    why: [
      'Right: it joins two lines of history, so it names both commits it came from.',
      'Like every commit, it names a full snapshot: the merged files.',
      'A merge commit has a message like any other.',
    ],
  },
  {
    id: 'different-lines',
    chapter: C4,
    question:
      'In a shared recipe, one cook changes the oven temperature and another, on their own branch, changes the salt. What will merging do?',
    options: [
      'Keep both changes: each line changed on one side only',
      'Stop and ask, because both changed the same file',
      'Keep only the cook who merged last',
    ],
    correct: 0,
    why: [
      'Right: different lines changed on different sides merge on their own.',
      'Git works line by line; the same file isn’t a conflict, the same line changed both ways is.',
      'A merge combines changes; it doesn’t throw one side away.',
    ],
  },
  // 5. Both changed it
  {
    id: 'conflict-when',
    chapter: C5,
    question: 'When does a merge stop with a conflict?',
    options: [
      'When both sides changed the same lines in different ways since the base',
      'Whenever both sides changed the same file',
      'Whenever the two branches have different numbers of commits',
    ],
    correct: 0,
    why: [
      'Right: only a part changed both ways leaves Git with no rule to follow.',
      'Changes to different lines of one file merge cleanly.',
      'The number of commits doesn’t matter; what changed does.',
    ],
  },
  {
    id: 'conflict-same-change',
    chapter: C5,
    question: 'Both branches changed the same line to exactly the same new text. What happens on merge?',
    options: [
      'It merges cleanly, taking that text once',
      'A conflict, because both changed the line',
      'The line is deleted',
    ],
    correct: 0,
    why: [
      'Right: both sides agree, so there is nothing to choose.',
      'A conflict needs two different answers; these are the same answer.',
      'Git keeps the change both sides made.',
    ],
  },
  {
    id: 'who-resolves',
    chapter: C5,
    question: 'Who decides a conflict’s outcome?',
    options: [
      'A person, who edits the file and commits the merge',
      'Git, by taking the newer change',
      'Git, by keeping both lines',
    ],
    correct: 0,
    why: [
      'Right: Git marks both sides and the base, and waits for someone to choose.',
      'Git has no way to know which change is right, so it doesn’t guess by time.',
      'Keeping both lines is one choice a person might make, but Git never makes it alone.',
    ],
  },
  // 6. Rewriting history
  {
    id: 'rebase-new-names',
    chapter: C6,
    question: 'After a rebase, the changes in your commits look the same. Are they the same commits?',
    options: [
      'No: each has a new parent, so a new name',
      'Yes: same changes, same commits',
      'Only the first commit is new',
    ],
    correct: 0,
    why: [
      'Right: a commit’s name covers its parent, so replaying it on a new parent makes a new commit.',
      'The changes match, but the snapshots and parents differ, so the names differ.',
      'Each later commit’s parent changed too, so every replayed commit is new.',
    ],
  },
  {
    id: 'rebase-shared',
    chapter: C6,
    question:
      'You shared a branch yesterday and two colleagues built on it. Today you want a tidy history. What is the safe choice?',
    options: [
      'Merge it, and leave its commits as they are',
      'Rebase it; they will pick up the new commits automatically',
      'Rebase it, then delete their copies',
    ],
    correct: 0,
    why: [
      'Right: their work builds on those commits, and a rebase would replace them.',
      'Their work still points at the old commits, so they must untangle it by hand.',
      'Their copies hold their work; replacing shared history breaks it.',
    ],
  },
  {
    id: 'rebase-left-behind',
    chapter: C6,
    question: 'What happens to the old commits after you rebase a branch?',
    options: [
      'They are left behind: no branch points at them any more',
      'They are edited in place',
      'They are merged into the new ones',
    ],
    correct: 0,
    why: [
      'Right: commits are never edited; the branch label just moves to the new ones.',
      'A commit can’t change without changing its name, so Git makes new ones instead.',
      'A rebase replays changes; it doesn’t merge the old commits in.',
    ],
  },
  // 7. Bring them in
  {
    id: 'plan-shared-private',
    chapter: C7,
    question:
      'A team has one branch everyone already has and two private ones. Which plan keeps history short without breaking anyone’s work?',
    options: [
      'Merge the shared one; rebase the private ones onto main',
      'Rebase all three into one straight line',
      'Rebase only the shared one',
    ],
    correct: 0,
    why: [
      'Right: merging leaves shared commits as they are; rebasing private work skips the merge commits.',
      'Rebasing the shared branch replaces commits others built on.',
      'That is backwards: the shared branch is the one to leave alone.',
    ],
  },
  {
    id: 'rebase-conflicts',
    chapter: C7,
    question:
      'Your branch tried a price, then put it back. Merging it into main is clean, but rebasing it stops with a conflict. Why?',
    options: [
      'A rebase replays each commit, so it meets the tried price a merge never compares',
      'Rebases always conflict',
      'The merge silently dropped your change',
    ],
    correct: 0,
    why: [
      'Right: a merge compares only the ends; a rebase replays every step on the way.',
      'Many rebases are clean; this one meets a step that touched a line main changed.',
      'The merge kept the branch’s end state, which had put the price back.',
    ],
  },
  {
    id: 'fast-forward',
    chapter: C7,
    question: 'Main hasn’t moved since your branch started. What does merging your branch in do?',
    options: [
      'Moves main’s label up to your branch’s commit, with no merge commit',
      'Always makes a merge commit',
      'Copies every commit again',
    ],
    correct: 0,
    why: [
      'Right: nothing to combine, so the label just moves forward, a fast-forward.',
      'A merge commit joins two lines of work; here there is only one.',
      'The commits already exist; only the label moves.',
    ],
  },
];

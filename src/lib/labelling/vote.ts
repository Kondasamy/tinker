// Many votes (chapter 5): each ticket takes the label most labellers gave it.

/** The label most votes gave; on a tie, the earliest voter's pick among those tied (the team lists its lead first). */
export function majority<T extends string>(votes: readonly T[]): T {
  const n = (l: T) => votes.filter(v => v === l).length,
    top = Math.max(...votes.map(n));
  return votes.find(v => n(v) === top)!;
}

/** The vote on every item, from each labeller's list of labels. */
export const votesOf = <T extends string>(sets: readonly (readonly T[])[]) =>
  sets[0].map((_, i) => majority(sets.map(s => s[i])));

/** Items where the vote went wrong though one labeller had the right answer: the minority was right. */
export const minorityRight = (sets: readonly (readonly string[])[], truth: readonly string[]) =>
  truth.map((_, i) => i).filter(i => majority(sets.map(s => s[i])) !== truth[i] && sets.some(s => s[i] === truth[i]));

// The days the Dependencies chapters install on: plain numbers, so the registry can name one without running the
// resolver (story.ts re-exports them).

/** Day 0: the evening before the month, when the team last installed and made the lockfile. */
export const START_DAY = 0;
/** Chapter 4: a teammate's install, and the build server's a week later. */
export const MIRA_DAY = 2,
  SERVER_DAY = 10;
/** Chapter 5: the morning the build breaks with no code change. */
export const BAD_DAY = 11;
/** Chapter 6: the morning the hijacked release is out. */
export const HIJACK_DAY = 18;

// Names, sites and demo values for Logins and passwords (R18), read from data/logins/story.json, never typed into copy.
import story from '../../../data/logins/story.json' with { type: 'json' };

export const COMPANY = story.company;
export const SITE = story.site;
export const GUILD = story.guild;
export const CLIENT = story.client;
export const OTHER_CLIENT = story.otherClient;
export const REDIRECT = story.redirect;
export const STATE = story.state;
export const FORGED_STATE = story.forgedState;
export const VERIFIER = story.verifier;
export const THIEF_VERIFIER = story.thiefVerifier;
export const CODE = story.code;
export const SIGNER = story.signer;
export const COOKIE_VICTIM = story.cookieVictim;
export const SESSION = story.session;
export const TOTP_SECRET = story.totpSecret;
export const NOW = story.now;

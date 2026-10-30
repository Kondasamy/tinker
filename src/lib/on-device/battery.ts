// The battery tank and the heat (planning numbers, data/on-device/phones.json). Writing a token reads every weight
// once (Inference ch. 1), so energy per token and time per token both grow with the weights' bytes: energy is
// MELTing point's 0.2 mWh a token for a 3B model at 4 bits, scaled per GB of weights; speed is the handheld's bandwidth
// over those bytes. A rush of replies back to back runs at full speed for the burst the handheld can cool, then at
// its throttled speed (MELTing point saw a phone slow down over prompts in a row; the numbers here are planning ones).
import P from '../../../data/on-device/phones.json' with { type: 'json' };
import { GB, HANDHELD, weightBytes, type Size } from './memory';

export type Length = keyof typeof P.replies;
export const LENGTHS = Object.keys(P.replies) as Length[];
/** Reply tokens per length: short is the team's planning number, long is MELTing point's average reply. */
export const TOKENS = P.replies;
export const BATTERY_MWH = HANDHELD.batteryWh * 1000;
/** Replies a picker asks for in a shift. */
export const SHIFT = HANDHELD.questionsPerHour * HANDHELD.shiftHours;
export const RUSH = P.rush;

export const energyPerToken = (s: Size, bits: number) => (P.mWhPerTokenPerGB * weightBytes(s, bits)) / GB;
export const energyPerReply = (s: Size, bits: number, len: Length) => energyPerToken(s, bits) * TOKENS[len];
export const repliesPerCharge = (s: Size, bits: number, len: Length) =>
  Math.floor(BATTERY_MWH / energyPerReply(s, bits, len));
/** The tank's level after `hours` of the shift's questions: 1 full, 0 empty. */
export const levelAfter = (s: Size, bits: number, len: Length, hours: number) =>
  Math.max(0, 1 - (energyPerReply(s, bits, len) * HANDHELD.questionsPerHour * hours) / BATTERY_MWH);

/** Tokens a second while cool: bandwidth over the weights' bytes. */
export const speed = (s: Size, bits: number) => (HANDHELD.bandwidthGBs * GB) / weightBytes(s, bits);

/** RUSH replies back to back: seconds taken, and whether the handheld throttled partway. */
export function rush(s: Size, bits: number, len: Length) {
  const total = RUSH * TOKENS[len],
    fast = speed(s, bits),
    cool = Math.min(total, fast * HANDHELD.burstSeconds),
    seconds = cool / fast + (total - cool) / (fast * HANDHELD.throttle);
  return { tokens: total, seconds, hot: total > cool, coolSeconds: total / fast };
}

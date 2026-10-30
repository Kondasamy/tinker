/**
 * The NVIDIA API client (KTD4): OpenAI-compatible chat completions for the recording scripts, run by hand and never
 * in tests. The key comes only from the command's environment, never from or to a file, a recording or a log.
 */
export const API = 'https://integrate.api.nvidia.com/v1';

/** The key from the environment, or exit with a hint naming the script. */
export function apiKey(script) {
  const key = process.env.NVIDIA_API_KEY;
  if (!key) {
    console.error(`${script}: set NVIDIA_API_KEY in the environment (it is never read from or written to a file).`);
    process.exit(1);
  }
  return key;
}

export const wait = ms => new Promise(ok => setTimeout(ok, ms));

/** GET or POST with up to 3 retries, backing off on 429s, server errors and network failures. */
async function call(key, path, body) {
  for (let attempt = 0; ; attempt++) {
    let r;
    try {
      r = await fetch(`${API}${path}`, {
        method: body ? 'POST' : 'GET',
        headers: { authorization: `Bearer ${key}`, 'content-type': 'application/json', accept: 'application/json' },
        body: body && JSON.stringify(body),
      });
    } catch (e) {
      if (attempt < 3) {
        console.warn(`NVIDIA API unreachable (${e.message}), retrying`);
        await wait(2000 * 2 ** attempt);
        continue;
      }
      throw e;
    }
    if ((r.status === 429 || r.status >= 500) && attempt < 3) {
      const ms = 5000 * 2 ** attempt;
      console.warn(`NVIDIA API ${r.status}, retrying in ${ms} ms`);
      await wait(ms);
      continue;
    }
    if (!r.ok) throw new Error(`NVIDIA API ${r.status} for ${path}: ${(await r.text()).slice(0, 200)}`);
    return r.json();
  }
}

/** Made-up .com, .net, .org and .io domains rewritten to .example, so no recorded reply points at a real site (R13). */
export const redactDomains = text =>
  text.replace(/\b([a-z0-9-]+(?:\.[a-z0-9-]+)*)\.(?:com|net|org|io)\b/gi, '$1.example');

/** The model ids this key can list (listed is not always callable: probe before recording). */
export const listModels = async key => (await call(key, '/models')).data.map(m => m.id);

/** The wanted model if listed, else the first listed one of the same family (the id up to its last dash). */
export function pickModel(listed, wanted) {
  if (listed.includes(wanted)) return wanted;
  const family = wanted.slice(0, wanted.lastIndexOf('-'));
  const near = listed.find(id => id.startsWith(family));
  if (!near) throw new Error(`no listed model like ${wanted}`);
  console.warn(`${wanted} is gone; using ${near}`);
  return near;
}

/**
 * One chat completion's text. Reasoning models think before answering, so `max_tokens` is large and only
 * `message.content` is kept. A reply cut off at the length limit or empty is asked again, up to `tries` times;
 * after that this returns null for the caller to mark `norecord`.
 */
export async function chat(key, { model, messages, temperature = 0, seed = 7, maxTokens = 8192, tries = 3 }) {
  for (let i = 0; i < tries; i++) {
    const j = await call(key, '/chat/completions', {
      model,
      messages,
      temperature,
      seed,
      max_tokens: maxTokens,
    });
    const c = j.choices?.[0];
    const text = c?.message?.content?.trim();
    if (text && c.finish_reason !== 'length') return text;
    console.warn(`${model}: ${text ? 'cut off' : 'empty'} reply, asking again`);
    await wait(2000 * 2 ** i);
  }
  return null;
}

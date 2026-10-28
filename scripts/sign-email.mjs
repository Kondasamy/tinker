// Signs How email arrives' fixture messages with DKIM, once (KTD6). Run: node scripts/sign-email.mjs
//
// 1. Makes the demo RSA key pair if data/email/demo-dkim.json has none (a labelled demo key, public on purpose, in JWK
//    form), and writes its public half into the made-up DNS (data/email/dns.json) at <selector>._domainkey.<domain>.
// 2. Signs Larkspur's own messages (rsa-sha256, relaxed/relaxed) and writes each DKIM-Signature above its From line.
//
// RSASSA-PKCS1-v1_5 signatures are deterministic, so a rerun with the same key rewrites the same bytes. The page and
// the tests only verify (src/lib/email/dkim.ts); this file repeats the canonicalisation in plain JS, and the engine
// test's verify proves the two agree.
import { existsSync, readFileSync, writeFileSync } from 'node:fs';

const KEY = 'data/email/demo-dkim.json',
  DNS = 'data/email/dns.json',
  story = JSON.parse(readFileSync('data/email/story.json', 'utf8'));
const SIGN = ['order', 'invoice', 'forwarded'];
const SIGNED_HEADERS = 'from:to:subject:date:message-id';
const ALG = { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' };
const NOTE =
  'DEMO KEY, generated once for this site and used nowhere else. It is public on purpose so the page can check a real DKIM signature; a real private key never leaves its owner.';

const b64 = b => Buffer.from(b).toString('base64');
const canonHeader = (name, value) =>
  `${name.trim().toLowerCase()}:${value
    .replace(/\r\n(?=[ \t])/g, '')
    .replace(/[ \t]+/g, ' ')
    .trim()}`;
function canonBody(body) {
  const lines = body.split('\r\n').map(l => l.replace(/[ \t]+/g, ' ').replace(/ $/, ''));
  while (lines.length && lines.at(-1) === '') lines.pop();
  return lines.length ? `${lines.join('\r\n')}\r\n` : '';
}
function parse(text) {
  const t = text.replace(/\r?\n/g, '\r\n'),
    at = t.indexOf('\r\n\r\n');
  const headers = [];
  for (const line of t.slice(0, at).split('\r\n')) {
    if (/^[ \t]/.test(line)) headers.at(-1).raw += `\r\n${line}`;
    else headers.push({ name: line.slice(0, line.indexOf(':')), raw: line });
  }
  for (const h of headers) h.value = h.raw.slice(h.raw.indexOf(':') + 1);
  return { headers, body: t.slice(at + 4) };
}

if (!existsSync(KEY)) {
  const pair = await crypto.subtle.generateKey(
    { ...ALG, modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]) },
    true,
    ['sign', 'verify'],
  );
  writeFileSync(
    KEY,
    `${JSON.stringify({ note: NOTE, key: await crypto.subtle.exportKey('jwk', pair.privateKey) }, null, 2)}\n`,
  );
}
const { key: jwk } = JSON.parse(readFileSync(KEY, 'utf8'));
const priv = await crypto.subtle.importKey('jwk', jwk, ALG, false, ['sign']);
const pub = await crypto.subtle.importKey('jwk', { kty: 'RSA', n: jwk.n, e: jwk.e, ext: true }, ALG, true, ['verify']);

const dns = JSON.parse(readFileSync(DNS, 'utf8'));
dns.txt[`${story.selector}._domainkey.${story.domain}`] =
  `v=DKIM1; k=rsa; p=${b64(await crypto.subtle.exportKey('spki', pub))}`;
writeFileSync(DNS, `${JSON.stringify(dns, null, 2)}\n`);

for (const id of SIGN) {
  const file = `data/email/messages/${id}.eml`;
  const m = parse(readFileSync(file, 'utf8'));
  m.headers = m.headers.filter(h => h.name.toLowerCase() !== 'dkim-signature');
  const bh = b64(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(canonBody(m.body))));
  const value = ` v=1; a=rsa-sha256; c=relaxed/relaxed; d=${story.domain}; s=${story.selector};\r\n\th=${SIGNED_HEADERS};\r\n\tbh=${bh};\r\n\tb=`;
  let data = '';
  for (const n of SIGNED_HEADERS.split(':')) {
    const h = m.headers.findLast(x => x.name.toLowerCase() === n);
    if (h) data += `${canonHeader(h.name, h.value)}\r\n`;
  }
  data += canonHeader('DKIM-Signature', value);
  const b = b64(await crypto.subtle.sign(ALG, priv, new TextEncoder().encode(data)));
  const sig = { name: 'DKIM-Signature', raw: `DKIM-Signature:${value}${b.match(/.{1,64}/g).join('\r\n\t ')}` };
  m.headers.splice(
    m.headers.findIndex(h => h.name.toLowerCase() === 'from'),
    0,
    sig,
  );
  writeFileSync(file, `${m.headers.map(h => h.raw).join('\n')}\n\n${m.body}`.replace(/\r\n/g, '\n'));
  console.log(`signed ${file}`);
}

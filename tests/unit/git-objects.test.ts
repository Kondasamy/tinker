// Git's objects and graph against the real Git (KTD10): data/git/pinned.json holds ids the real CLI produced from
// data/git/repo.json, and every id the engine makes for the same steps must equal them.
import { describe, expect, it } from 'vitest';
import pinned from '../../data/git/pinned.json' with { type: 'json' };
import { blobId, bytesOf, sha1, short, treeId } from '../../src/lib/git/objects';
import { FILE, REPO, ancestors, branchAt, history, init, mergeBase, tip } from '../../src/lib/git/graph';
import {
  BASE,
  BEFORE_REBASE,
  BRANCHED,
  CLEAN,
  NEXT,
  REBASED,
  REWORDED,
  SALE,
  conflictMerge,
} from '../../src/lib/git/story';

describe('objects', () => {
  it('hashes a blob of "hello\\n" as Git does', () => {
    expect(blobId('hello\n')).toBe(pinned.hello);
  });

  it('SHA-1 agrees with Web Crypto', async () => {
    for (const s of ['', 'abc', 'x'.repeat(55), 'y'.repeat(56), 'z'.repeat(64), 'Larkspur £ prices\n'.repeat(40)]) {
      const d = new Uint8Array(await crypto.subtle.digest('SHA-1', bytesOf(s)));
      expect(sha1(bytesOf(s))).toBe([...d].map(b => b.toString(16).padStart(2, '0')).join(''));
    }
  });

  it('every history blob, tree and commit equals the real Git’s', () => {
    REPO.history.forEach((h, i) => {
      expect(blobId(h.text)).toBe(pinned.blobs[i]);
      expect(treeId({ [FILE]: h.text })).toBe(pinned.trees[i]);
    });
    expect([...BASE.order]).toEqual(pinned.history);
  });

  it('identical content in two files gives one blob', () => {
    const t = REPO.history[0].text;
    expect(blobId(t)).toBe(blobId(`${t}`));
    expect(treeId({ 'a.txt': t, 'b.txt': t })).not.toBe(treeId({ 'a.txt': t }));
    expect(short(blobId(t))).toHaveLength(7);
  });
});

describe('the chain', () => {
  it('the next commit and a reworded first commit match the real Git', () => {
    expect(NEXT.refs.main).toBe(pinned.next);
    expect(REWORDED.refs.main).toBe(pinned.reworded);
  });

  it('changing one byte changes the blob, the tree and every commit after it', () => {
    const h = REPO.history.map(x => ({ ...x, by: x.by as 'mira' }));
    const changed = init([{ ...h[0], text: h[0].text.replace('4.50', '4.51') }, ...h.slice(1)]);
    expect(blobId(h[0].text.replace('4.50', '4.51'))).not.toBe(pinned.blobs[0]);
    changed.order.forEach((id, i) => expect(id).not.toBe(pinned.history[i]));
    // the later snapshots themselves are unchanged: only the names that chain to the first moved
    expect(changed.order.slice(1).map(id => changed.commits[id].tree)).toEqual(pinned.trees.slice(1));
  });

  it('history reads newest first, each commit naming its parent', () => {
    expect(history(BASE, 'main')).toEqual([...pinned.history].reverse());
    expect(tip(BASE).parents).toEqual([pinned.history[1]]);
  });
});

describe('branches', () => {
  it('a branch is a label: making one adds no commit', () => {
    expect(BRANCHED.order).toEqual(BASE.order);
    expect(BRANCHED.refs.sale).toBe(BASE.refs.main);
    expect(BRANCHED.head).toBe('sale');
  });

  it('a commit on the branch moves its label, and main stays', () => {
    expect(SALE.refs.sale).toBe(pinned.sale);
    expect(SALE.refs.main).toBe(BASE.refs.main);
  });

  it('the merge base is the nearest shared commit', () => {
    expect(mergeBase(CLEAN.repo, 'main', 'sale')).toBe(pinned.sale);
    expect(CLEAN.base).toBe(BASE.refs.main);
    const r = branchAt(BASE, 'x', pinned.history[0]);
    expect(mergeBase(r, 'main', 'x')).toBe(pinned.history[0]);
  });
});

describe('merging and rebasing', () => {
  it('changes on different lines merge cleanly into a commit with two parents', () => {
    expect(CLEAN.kind).toBe('merge');
    expect(CLEAN.merged!.conflicts).toEqual([]);
    expect(CLEAN.repo.refs.main).toBe(pinned.clean);
    expect(tip(CLEAN.repo).text).toBe(pinned.cleanText);
    expect(tip(CLEAN.repo).parents).toHaveLength(2);
  });

  it('the same line changed both ways is one conflict, resolved as the real Git resolved it', () => {
    const m = conflictMerge('theirs');
    expect(m.merged!.conflicts).toHaveLength(1);
    expect(m.repo.refs.main).toBe(pinned.conflict);
  });

  it('a rebase makes commits with new hashes and the same files', () => {
    expect(REBASED.rewritten.map(([, n]) => n)).toEqual(pinned.rebased);
    expect(REBASED.rewritten.map(([o]) => o)).toEqual(pinned.shelf);
    for (const [o, n] of REBASED.rewritten) expect(n).not.toBe(o);
    expect(tip(REBASED.repo, 'shelf').text).toContain('Hinge: 4.95');
    // the old commits are left behind, no longer on the branch
    for (const o of pinned.shelf) expect(ancestors(REBASED.repo, REBASED.repo.refs.shelf).has(o)).toBe(false);
    expect(BEFORE_REBASE.refs.shelf).toBe(pinned.shelf[1]);
  });
});

// The per-scene size budget (KTD8): each scene, drawn in its fullest state, stays within 3× its SVG length before the
// creative-figures rework. A scene that needs more is raised on purpose, with a new number.
// Every *Scene.ts under src/components/scenes has an entry; none is skipped.
import { createElement } from 'react';
import { renderToString } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { readdirSync, readFileSync } from 'node:fs';
import IsoStage, { type Board } from '../../src/lib/iso/IsoStage';
import { AGENT_BOARD, agentScene } from '../../src/components/scenes/agentScene';
import { ARCHIVE_BOARD, archiveAt, archiveScene } from '../../src/components/scenes/archiveScene';
import { CABINET_BOARD, cabinetAt, cabinetScene } from '../../src/components/scenes/cabinetScene';
import { CLOAK_BOARD, cloakScene } from '../../src/components/scenes/cloakScene';
import { COPIER_BOARD, copierAt, copierScene } from '../../src/components/scenes/copierScene';
import { boardOf as crateBoard, crateScene, yardOf, type CrateOpts } from '../../src/components/scenes/crateScene';
import { DARK_BOARD, darkroomScene } from '../../src/components/scenes/darkroomScene';
import { DEPOT_BOARD, depotAt, depotScene } from '../../src/components/scenes/depotScene';
import { DESK_BOARD, beatsOf, deskAt, deskScene } from '../../src/components/scenes/deskScene';
import { boardOf as dreamBoard, dreamScene, type DreamOpts } from '../../src/components/scenes/dreamFloorScene';
import { ENGINE_BOARD, engineScene } from '../../src/components/scenes/engineScene';
import { EVAL_BOARD, evalScene } from '../../src/components/scenes/evalScene';
import { EXAM_BOARD, examScene } from '../../src/components/scenes/examScene';
import { FORGE_BOARD, forgeScene } from '../../src/components/scenes/forgeScene';
import { FUSE_BOARD, fuseScene } from '../../src/components/scenes/fuseScene';
import { GUARD_BOARD, guardScene } from '../../src/components/scenes/guardScene';
import { HERO_BOARD, HOME_HERO } from '../../src/components/scenes/heroScene';
import { JAR_BOARD, jarScene } from '../../src/components/scenes/jarScene';
import { MCP_BOARD, connectScene, countScene } from '../../src/components/scenes/mcpScene';
import { ROOMS_BOARD, roomsScene, tokensOf } from '../../src/components/scenes/officeRoomsScene';
import { OFFICE_BOARD, officeScene } from '../../src/components/scenes/officeScene';
import { PAINT_BOARD, paintAt, paintScene } from '../../src/components/scenes/paintScene';
import { PHONE_BOARD, phoneScene } from '../../src/components/scenes/phoneScene';
import { PILE_BOARD, pileScene } from '../../src/components/scenes/pileScene';
import { POST_BOARD, postScene } from '../../src/components/scenes/postScene';
import { PUPPET_BOARD, puppetScene } from '../../src/components/scenes/puppetScene';
import { RAIL_BOARD, railAt, railScene } from '../../src/components/scenes/railScene';
import { RECITAL_BOARD, recitalScene } from '../../src/components/scenes/recitalScene';
import { ROUTER_BOARD, routerScene } from '../../src/components/scenes/routerScene';
import { SANDBOX_BOARD, sandboxScene } from '../../src/components/scenes/sandboxScene';
import { SCAN_BOARD, scanScene } from '../../src/components/scenes/scanScene';
import { SERVE_BOARD, serveScene } from '../../src/components/scenes/serveScene';
import { SHELF_BOARD, shelfScene } from '../../src/components/scenes/shelfScene';
import { SIGNAL_BOARD, signalAt, signalScene } from '../../src/components/scenes/signalScene';
import { SPLIT_BOARD, splitAt, splitScene } from '../../src/components/scenes/splitScene';
import { STENCIL_BOARD, stencilScene } from '../../src/components/scenes/stencilScene';
import { STOCK_BOARD, stockAt, stockScene } from '../../src/components/scenes/stockScene';
import { THINK_BOARD, thinkScene } from '../../src/components/scenes/thinkScene';
import { TOKEN_BOARD, tokenScene } from '../../src/components/scenes/tokenScene';
import { TOWER_BOARD, towerOf, towerScene } from '../../src/components/scenes/towerScene';
import { TOWN_BOARD, townAt, townScene } from '../../src/components/scenes/townScene';
import { TRACE_BOARD, traceScene } from '../../src/components/scenes/traceScene';
import { TRAIN_BOARD, trainScene } from '../../src/components/scenes/trainScene';
import { TUBE_BOARD, tubeAt, tubeScene } from '../../src/components/scenes/tubeScene';
import { FRAME_BOARD, typeFrameScene } from '../../src/components/scenes/typeFrameScene';
import { WINDOW_BOARD, windowScene } from '../../src/components/scenes/windowScene';
import { YARD_BOARD, yardAt, yardScene } from '../../src/components/scenes/yardScene';
import { play as playCoding } from '../../src/content/coding-agents/kit';
import { frameAt, play as playComputer } from '../../src/content/computer-use/kit';
import { finish, forestOf, forestTable } from '../../src/content/compression/kit';
import { frameOf } from '../../src/content/diffusion-llms/kit';
import { postOf } from '../../src/content/email/kit';
import { packingOf } from '../../src/content/git/kit';
import { drawersOf } from '../../src/content/logins/kit';
import { SAMPLE_PINS, ledgerOf } from '../../src/content/memorisation/kit';
import { cardsOf } from '../../src/content/post-training/kit';
import { deskOf } from '../../src/content/reasoning/kit';
import { stencilAt } from '../../src/content/structured-outputs/kit';
import { pulledOf } from '../../src/content/dependencies/kit';
import { binsOf, wallOf } from '../../src/content/observability/kit';
import { SCENARIOS as AB, runOf as abRun } from '../../src/lib/ab-testing/sim';
import { CONTEXT, run as agentRun } from '../../src/lib/agents/loop';
import { RECORDINGS } from '../../src/lib/agents/turns';
import { MOMENTS as DEPOT_AT, OFF, simulate as cacheSim } from '../../src/lib/caching/sim';
import { TEMPERATURES, measure, report } from '../../src/lib/calibration/measure';
import { policyOf as consistencyPolicy, simulate as consistencySim } from '../../src/lib/consistency/sim';
import { run as contextRun } from '../../src/lib/context/loop';
import { execute, type Query } from '../../src/lib/databases/planner';
import { MONTH, REGULAR } from '../../src/lib/databases/table';
import { install } from '../../src/lib/dependencies/resolve';
import { FIRST, HIJACK_DAY } from '../../src/lib/dependencies/story';
import { DRAWINGS } from '../../src/lib/diffusion/drawings';
import { decode as mlmDecode } from '../../src/lib/diffusion-llms/decode';
import { diskMlm } from '../../src/lib/diffusion-llms/diskModel';
import { PHRASES } from '../../src/lib/diffusion-llms/workbench';
import { RECORDS, verdictOf } from '../../src/lib/email/story';
import { QUESTIONS } from '../../src/lib/evals/suite';
import { REPO } from '../../src/lib/git/graph';
import { CLEAN } from '../../src/lib/git/story';
import { run as guardRun } from '../../src/lib/guardrails/loop';
import { RECORDING as GUARD_RECORDING } from '../../src/lib/guardrails/turns';
import { decode, encode } from '../../src/lib/lm/bpe';
import { parseModel, type Meta } from '../../src/lib/lm/load';
import { forward } from '../../src/lib/lm/model';
import { policyOf as lbPolicy, simulate as lbSim } from '../../src/lib/load-balancing/sim';
import { diskCanary } from '../../src/lib/memorisation/diskModel';
import { columnPins, rankAmong } from '../../src/lib/memorisation/rank';
import { canaryOf } from '../../src/lib/memorisation/story';
import { promptOf } from '../../src/lib/mixture-of-experts/routes';
import { PUZZLE } from '../../src/lib/compression/files';
import { DAY1_COUNTS } from '../../src/lib/observability/coding';
import { TRACES } from '../../src/lib/observability/traces';
import { policyOf as payPolicy, simulate as paySim } from '../../src/lib/payments/sim';
import { REFUND, WEAK, refOf, rewardsOf } from '../../src/lib/post-training/graders';
import { STEPS as FORGE_STEPS } from '../../src/lib/pre-training/engine';
import { CRASH_AT, SCENES as QUEUES, SHOWN_CRASH, runOf as queueRun } from '../../src/lib/queues/sim';
import { run as reasoningRun } from '../../src/lib/reasoning/engine';
import { BASE as FACTORS } from '../../src/lib/recommendations/factorise';
import { shelfOf } from '../../src/lib/recommendations/score';
import { NEW_PRODUCT, TRAIN } from '../../src/lib/recommendations/story';
import { pipelineOf } from '../../src/lib/releases/pipeline';
import { SCENES as RELEASES, runOf as releaseRun } from '../../src/lib/releases/sim';
import { run as sandboxRun } from '../../src/lib/sandboxing/loop';
import { RECORDING as SANDBOX_RECORDING } from '../../src/lib/sandboxing/turns';
import { DEFAULT as SEARCH_DEFAULT } from '../../src/lib/search/engine';
import { play as playStructured, run as structuredRun } from '../../src/lib/structured-outputs/prompts';
import { LAST as COPIER_LAST } from '../../src/lib/synthetic-data/runs';
import { SERVERS as MCP_SERVERS } from '../../src/lib/tools/server';
import { PROMPTS, trace } from '../../src/lib/transformers/trace';
import { diskModel } from '../../src/lib/transformers/diskModel';
import { rollout, parseFrame } from '../../src/lib/video-models/world';
import { runOf as webRun } from '../../src/lib/web-requests/sim';
import pinnedDream from '../../data/video-models/pinned.json' with { type: 'json' };
import type { Msg } from '../../src/lib/iso/flat';

const stage = (board: Board, scene: ReturnType<typeof officeScene>) =>
  renderToString(createElement(IsoStage, { board, scene, label: '' }));
const lm = (f: string) => {
  const b = readFileSync(`public/data/lm/${f}`);
  return b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength) as ArrayBuffer;
};
const META = JSON.parse(readFileSync('public/data/lm/meta.json', 'utf8')) as Meta;
const crate = (o: CrateOpts) => stage(crateBoard(o), crateScene(o));
const ask: Msg = { from: 'emp', to: 'host', kind: 'request', text: 'Where is order 1042?' };
const getOrder = (id: number): Msg => ({
  from: 'host',
  to: 'orders',
  kind: 'request',
  text: `get_order(order_id: ${id})`,
  batch: 7,
});

const SCENES: Record<string, () => string> = {
  // the plan run with every prop on: clipboard, gauge, tray, schema, owner and gate (the callout test's "full")
  agent: () =>
    stage(
      AGENT_BOARD,
      agentScene({
        run: agentRun(RECORDINGS['03-plans'], { case: 'damaged', stock: 'out', plan: true }),
        clipboard: true,
        gauge: { steps: 12, context: CONTEXT },
        tray: true,
        schema: true,
        owner: true,
        gate: true,
      }),
    ),
  // the sub-agents run: the helper desks only this run draws
  'agent:helpers': () =>
    stage(AGENT_BOARD, agentScene({ run: agentRun(RECORDINGS['06-sub-agents'], { helpers: true }), helpers: true })),
  // a customer-and-month query on its index: the most drawers read and the deepest card-index path
  archive: () => {
    const q: Query = { where: { customer: REGULAR, day: MONTH } };
    return stage(ARCHIVE_BOARD, archiveScene(archiveAt(execute(q, 'customer_date'), q)));
  },
  // a two-word query: two drawers out, cards drawn, the podium ranked
  cabinet: () => stage(CABINET_BOARD, cabinetScene(cabinetAt('Larkspur forklift', SEARCH_DEFAULT))),
  // every prop at once: drawers, table, desk, ticket, thief and guild card (the test's FULL)
  cloak: () =>
    stage(
      CLOAK_BOARD,
      cloakScene({
        drawers: drawersOf('sha256'),
        table: 'TABLE',
        desk: 'LARKSPUR',
        ticket: { label: 'TICKET' },
        thief: { label: 'THIEF', holds: 'ticket' },
        guild: { label: 'GUILD', card: { label: 'ID TOKEN', at: 'belt', sealed: true } },
      }),
    ),
  // generation 5 under replace: every stack of copies drawn
  copier: () => stage(COPIER_BOARD, copierScene(copierAt('replace', COPIER_LAST))),
  // the clean merge yard with its base marked: every crate, rail, flag and the merge
  'crate:yard': () => crate(yardOf(CLEAN.repo, { base: CLEAN.base })),
  // the packing bench with an edited file: two blobs, two stamps
  'crate:packing': () => {
    const saved = REPO.history.at(-1)!.text;
    return crate({ crates: [], flags: [], packing: packingOf(saved, saved.replace('189.00', '179.00')) });
  },
  // a pixel print developing at 50 steps, guidance on
  darkroom: () =>
    stage(
      DARK_BOARD,
      darkroomScene({
        print: { kind: 'pixels', px: DRAWINGS[0].pixels, name: 'HINGE' },
        steps: 50,
        label: 'hinge',
        guidance: 2,
      }),
    ),
  // the sale moment with no cache: nine trucks, queued roads, the overloaded depot
  depot: () => stage(DEPOT_BOARD, depotScene(depotAt(cacheSim(OFF), DEPOT_AT.sale))),
  // the bulk case played to the end with every hunk kept: code, lamps and the review lit
  desk: () => {
    const r = playCoding({ case: 'bulk', review: 7 });
    return stage(DESK_BOARD, deskScene(deskAt(r, beatsOf(r).length)));
  },
  // the real and dreamed floors side by side at step 3 (the pair board)
  dream: () => {
    const o: DreamOpts = {
      real: rollout(pinnedDream.seed, 32).frames[3],
      dream: parseFrame(pinnedDream.dream[3]),
      step: 3,
    };
    return stage(dreamBoard(o), dreamScene(o));
  },
  // the long prompt: the most tokens and threads
  engine: () => {
    const model = parseModel(META, lm('model.bin'));
    const t = trace(model, PROMPTS.find(p => p.id === 'long')!.text);
    return stage(
      ENGINE_BOARD,
      engineScene({ tokens: t.tokens.map(x => x.text), attention: t.attention, layer: 0, head: 0 }),
    );
  },
  // a full suite half graded with one card riding: stack, both piles and the belt (stand-in results)
  eval: () => {
    const results = QUESTIONS.map((_, i) => i % 3 !== 0);
    return stage(EVAL_BOARD, evalScene({ results, graded: results.length >> 1, riding: true, version: 'v1' }));
  },
  // the refund exam's first round under the weak grader: every card, the group and the board
  exam: () => {
    const ref = refOf(REFUND);
    return stage(
      EXAM_BOARD,
      examScene({
        cards: cardsOf(REFUND, ref, rewardsOf(REFUND, WEAK)),
        grader: 'NUMBER + SIGN-OFF',
        group: [true, false],
        board: 'ROUND 1',
      }),
    );
  },
  // checkpoint 1000 of the pre-training run
  forge: () => stage(FORGE_BOARD, forgeScene({ steps: FORGE_STEPS, step: 1000 })),
  // a full sentence with threads on and a head pulled (the callout test's state)
  fuse: () => {
    const out = forward(diskModel(), encode('Candidates receive an answer within ten'));
    return stage(
      FUSE_BOARD,
      fuseScene({
        tokens: out.ids.map(i => decode([i])),
        attention: out.attention,
        threads: true,
        layer: 1,
        head: 1,
        pulled: ['h0-1'],
      }),
    );
  },
  // the invoice run with every check on: screen, allow list, legs, schema, owner, gate
  guard: () =>
    stage(
      GUARD_BOARD,
      guardScene({
        run: guardRun(GUARD_RECORDING, { case: 'invoice' }),
        screen: true,
        allow: true,
        legs: true,
        schema: true,
        owner: true,
        gate: true,
      }),
    ),
  // the home page's workshop, as shipped
  hero: () => stage(HERO_BOARD, HOME_HERO),
  // the fine-tuned model's jars with the dial, temperatures, threshold, handed marbles and slate
  jar: () =>
    stage(
      JAR_BOARD,
      jarScene({
        jars: report(measure(parseModel(META, lm('finetuned.bin')))).jars,
        T: 1,
        temps: TEMPERATURES,
        threshold: 0.5,
        handed: 3,
        slate: 'ECE 0.27',
      }),
    ),
  // four apps and four systems without MCP: every pair wired
  'mcp:count': () => stage(MCP_BOARD, countScene({ apps: 4, systems: 4, mcp: false })),
  // every server connected (the share image's state)
  'mcp:connect': () =>
    stage(
      MCP_BOARD,
      connectScene({
        servers: Object.values(MCP_SERVERS).map(s => ({ name: s.title.toUpperCase(), connected: true })),
      }),
    ),
  // dense routing: every room on both floors lit
  rooms: () => stage(ROOMS_BOARD, roomsScene({ tokens: tokensOf(promptOf('reply').ids), sel: 0, dense: true })),
  // a batch of two calls in flight with every check on: two capsules, the open drawer, schema, owner and gate
  office: () =>
    stage(
      OFFICE_BOARD,
      officeScene({ msgs: [ask, getOrder(1042), getOrder(1043)], tools: 2, schema: true, owner: true, gate: true }),
    ),
  // the swapped stage with Eve watching: every part drawn (the parts test's state)
  paint: () => stage(PAINT_BOARD, paintScene({ ...paintAt('rose', 'swapped'), eve: 'SEES' })),
  // the reply talking over the caller, with the wait shown
  phone: () => stage(PHONE_BOARD, phoneScene({ stage: 'reply', interrupt: true, wait: 1830 })),
  // the puzzle's finished forest with the parcel: every pile and part
  pile: () =>
    stage(PILE_BOARD, pileScene({ ...forestTable(finish(forestOf(PUZZLE)), true), parcel: { raw: 10, packed: 4 } })),
  // the forged message under a reject record, every check on: every part drawn
  post: () =>
    stage(
      POST_BOARD,
      postScene({
        ...postOf(verdictOf('forged', RECORDS.reject), 'forged', RECORDS.reject, 0, {
          spf: true,
          dkim: true,
          dmarc: true,
          spam: true,
          sorted: true,
        }),
        fate: undefined,
      }),
    ),
  // the hinges case at its last frame: the whole film strip
  puppet: () => stage(PUPPET_BOARD, puppetScene(frameAt(playComputer({ case: 'hinges' }), 99).opts)),
  // the crash run at the crash: a worker down with its dropped ticket, the rail full
  rail: () => stage(RAIL_BOARD, railScene(railAt(queueRun({ ...QUEUES.crash, crashes: [SHOWN_CRASH] }), CRASH_AT))),
  // a canary seen 64 times: the ledger and the ranked column
  recital: () => {
    const c = canaryOf(64),
      col = rankAmong(diskCanary(), c, columnPins(c, SAMPLE_PINS));
    return stage(
      RECITAL_BOARD,
      recitalScene({ ledger: ledgerOf(64), column: { lps: col.lps, label: `RANK ${col.rank}` } }),
    );
  },
  // distilling with lessons: both models lit and the chute on
  'router:distill': () => stage(ROUTER_BOARD, routerScene({ mode: 'distill', lessons: true, lit: 'both' })),
  // routing up past a threshold: the lever leaning, the gauge set
  'router:route': () => stage(ROUTER_BOARD, routerScene({ mode: 'route', route: 'up', threshold: 0.9 })),
  // the report run inside the wall, proxy and schema on (the callout test's "full")
  sandbox: () =>
    stage(
      SANDBOX_BOARD,
      sandboxScene({
        run: sandboxRun(SANDBOX_RECORDING, {
          case: 'report',
          sandbox: true,
          files: 'scoped',
          egress: 'allowlist',
          secret: 'proxy',
        }),
        wall: true,
        proxy: true,
        schema: true,
      }),
    ),
  // the invoice at 1600 px read by vision: the patches drawn
  scan: () => stage(SCAN_BOARD, scanScene({ image: 'invoice', size: 1600, method: 'vision' })),
  // seats in both phases, a queue, KV in use and a draft model accepting (hand-set, as the callout test)
  serve: () =>
    stage(
      SERVE_BOARD,
      serveScene({
        seats: ['prefill', 'decode', 'decode', 'empty'],
        queued: 3,
        kv: 0.42,
        draft: { drafted: 4, accepted: 2 },
      }),
    ),
  // the taste map with Ash, every product dot and the new product's ghost
  'shelf:map': () =>
    stage(
      SHELF_BOARD,
      shelfScene({
        view: 'map',
        shelf: shelfOf('factors', TRAIN, 'c01', FACTORS),
        shopper: 'Ash Joinery',
        you: FACTORS.users.c01,
        items: FACTORS.items,
        ghost: NEW_PRODUCT,
      }),
    ),
  // the aisle with the popular shelf, other shoppers and a basket
  'shelf:aisle': () =>
    stage(
      SHELF_BOARD,
      shelfScene({
        view: 'aisle',
        shelf: shelfOf('popular', TRAIN, 'c01'),
        shopper: 'Ash Joinery',
        others: ['A', 'B', 'C', 'D'],
        basket: 'hinge-pack',
      }),
    ),
  // a flag dialled to 10% with the coupon pipeline: every part drawn
  signal: () =>
    stage(
      SIGNAL_BOARD,
      signalScene({
        ...signalAt(releaseRun({ ...RELEASES.flag, events: [{ t: 1, kind: 'dial', share: 0.1 }] }), 3),
        pipeline: pipelineOf('coupon'),
      }),
    ),
  // the hurried test's last day with the guardrail watched: full towers and returns
  split: () =>
    stage(SPLIT_BOARD, splitScene(splitAt(abRun(AB.hurry), AB.hurry, AB.hurry.days - 1, { guardrail: true }))),
  // the masked run at the step its first choice is blocked: tiles, the plate and the stopped tile
  stencil: () => {
    const { decoded } = playStructured(diskModel(), structuredRun('mask'));
    const i = decoded.steps.findIndex(s => !s.allowed.includes(s.free.id));
    return stage(STENCIL_BOARD, stencilScene(stencilAt('Where is order 1042?', decoded, i, true)));
  },
  // the first partitioned minute: every board and the cut line
  stock: () => {
    const cut = consistencySim(consistencyPolicy({ r: 1, w: 1, rule: 'lww' }, { partition: true }));
    return stage(
      STOCK_BOARD,
      stockScene(
        stockAt(
          cut,
          cut.ticks.findIndex(k => k.cut),
        ),
      ),
    );
  },
  // high effort: the tallest pad
  think: () => stage(THINK_BOARD, thinkScene(deskOf(reasoningRun('quote-split-lines', 'high')))),
  // a long question: the belt full and a "more" count
  token: () => stage(TOKEN_BOARD, tokenScene({ text: 'Can enterprise customers get a refund on a damaged order?' })),
  // the hijack day with a lit, locked, pulled tree: every part drawn
  tower: () =>
    stage(
      TOWER_BOARD,
      towerScene(
        towerOf(install({ day: HIJACK_DAY, overrides: { pricebook: '2.0.0' } }), {
          lit: ['shipcalc'],
          lock: true,
          pulled: pulledOf(FIRST, { 'cartwheel/tidystr': null }),
        }),
      ),
    ),
  // Wen's far shop over HTTP/2 with loss: carts, the ditch and every office
  town: () => stage(TOWN_BOARD, townScene(townAt(webRun('wen', { http: '2', loss: true })))),
  // every trace on the wall, one read, and the day's bins
  trace: () => stage(TRACE_BOARD, traceScene({ cards: wallOf(TRACES, 't23'), bins: binsOf(DAY1_COUNTS, 'stale-doc') })),
  // the weights lever with a LoRA adapter on (the callout test's state)
  train: () => stage(TRAIN_BOARD, trainScene({ lit: 'weights', weights: 'lora' })),
  // a day tick: capsules riding every tube
  tube: () =>
    stage(TUBE_BOARD, tubeScene(tubeAt(paySim(payPolicy({ sca: 'risk', capture: 'shipment', key: true })), 0))),
  // the confidence-ordered fill at step 2, typing under way
  frame: () => {
    const p = PHRASES[5],
      f = mlmDecode(diskMlm(), p.ids, 4, 'confidence', p.seed);
    return stage(FRAME_BOARD, typeFrameScene({ given: p.ids.length, ...frameOf(f, 2), typed: 3, typeOf: 16 }));
  },
  // the memory run with shelf, cabinet and tray on (the callout test's state)
  window: () =>
    stage(
      WINDOW_BOARD,
      windowScene({
        run: contextRun(undefined, { sessions: [['enterprise-hello'], ['enterprise-refund']], memory: true }),
        shelf: true,
        cabinet: true,
        tray: true,
      }),
    ),
  // the end of a least-busy run with a dead and a gray shed: every shed, the barrier
  yard: () => {
    const run = lbSim(lbPolicy({ rule: 'least', states: { cedar: 'dead', dogwood: 'gray' }, checks: 2 }));
    return stage(YARD_BOARD, yardScene(yardAt(run, run.end, 'least')));
  },
};

// SVG lengths at commit 3ebfcef (before the creative-figures rework)
const BASE: Record<string, number> = {
  agent: 89875,
  'agent:helpers': 61489,
  archive: 91791,
  cabinet: 36056,
  cloak: 57039,
  copier: 42034,
  'crate:yard': 41476,
  'crate:packing': 16513,
  darkroom: 43918,
  depot: 48071,
  desk: 28907,
  dream: 37567,
  engine: 41049,
  eval: 39380,
  exam: 33521,
  forge: 34148,
  fuse: 38769,
  guard: 96189,
  hero: 507886,
  jar: 108535,
  'mcp:count': 71749,
  'mcp:connect': 37391,
  rooms: 87283,
  office: 66173,
  paint: 42392,
  phone: 45861,
  pile: 16097,
  post: 44758,
  puppet: 23908,
  rail: 37355,
  recital: 39783,
  'router:distill': 19362,
  'router:route': 19819,
  sandbox: 73101,
  scan: 27319,
  serve: 25321,
  'shelf:map': 49915,
  'shelf:aisle': 28334,
  signal: 83564,
  split: 47144,
  stencil: 20091,
  stock: 41198,
  think: 32740,
  token: 23206,
  tower: 47246,
  town: 43417,
  trace: 62530,
  train: 43227,
  tube: 85271,
  frame: 74221,
  window: 26749,
  yard: 40499,
};

describe('scene size budget', () => {
  it('every scene has a baseline', () => {
    for (const k of Object.keys(SCENES)) expect(BASE[k], k).toBeTypeOf('number');
  });
  it('every *Scene.ts file is measured here', () => {
    const src = readFileSync('tests/unit/scene-size.test.ts', 'utf8');
    for (const f of readdirSync('src/components/scenes').filter(n => /Scene\.ts$/.test(n)))
      expect(src, f).toContain(`/scenes/${f.replace(/\.ts$/, '')}'`);
  });
  it.each(Object.keys(SCENES))('%s stays within 3× its baseline and draws no NaN', k => {
    const svg = SCENES[k]();
    expect(svg.length).toBeLessThanOrEqual(3 * BASE[k]);
    expect(svg).not.toContain('NaN');
  });
});

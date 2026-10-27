---
title: Cloudflare Web Analytics for Tinker - Plan
type: feat
date: 2026-10-27
artifact_contract: ce-unified-plan/v1
artifact_readiness: implementation-ready
product_contract_source: ce-plan-bootstrap
execution: code
---

# Cloudflare Web Analytics for Tinker - Plan

## Goal Capsule

- **Objective:** Usage of `https://tinker.kondasamy.com` appears in Cloudflare Web Analytics: visits, page views, top modules and chapters, referrers, countries, devices.
- **Authority:** `AGENTS.md` → this plan.
- **Stop conditions:** stop and ask if tracking would need cookies, a backend, or a tool other than Cloudflare. Also stop if it would send anything a reader types, or if Cloudflare can't add the beacon itself and a snippet in `Meta.astro` becomes the only option.
- **Execution profile:** mostly Cloudflare dashboard work, plus one small docs commit on its own branch and PR.

## Product Contract

### Summary

The main domain's Web Analytics site only counts pages that load its JS snippet. No Tinker page loads a beacon. The repo has no beacon, no `_headers`, no CSP and no service worker. The fix is to have Cloudflare add the beacon to Tinker's own site, then record that decision in `AGENTS.md`.

### Problem Frame

Tinker is served at `tinker.kondasamy.com`, in the `kondasamy.com` zone. `kondasamy.com` gets Web Analytics from a manually installed snippet. Tinker has no snippet, so no Tinker traffic reaches any Web Analytics site.

### Requirements

- R1. Every public Tinker page load on `tinker.kondasamy.com` is counted in Cloudflare Web Analytics.
- R2. Tinker shows as its own site in the dashboard, not mixed into `kondasamy.com`.
- R3. Page-level metrics only. Nothing a reader types leaves the browser, except the home request form.
- R4. The decision is written down in `AGENTS.md`, so future changes don't add a second tracker or remove this one by accident.

### Success Criteria

- Within about an hour of the first deploy after the change, the Tinker site in Web Analytics shows visits whose paths include `/`, a module intro, and a chapter page.
- The live page loads `static.cloudflareinsights.com/beacon.min.js`, and its `cdn-cgi/rum` POST returns 2xx.
- Counts are a lower bound. Ad blockers often block the beacon, and Tinker's audience is technical.

### Scope Boundaries

- No custom events (chapter started or finished, quiz picks, form sends). Cloudflare Web Analytics can't record them, and they would need a second tool.
- No cookie banner. Web Analytics sets no cookies.
- No change to `kondasamy.com`'s snippet or site.

#### Deferred to Follow-Up Work

- Event-level usage (for example a cookieless tool such as Plausible), if page views turn out to be too coarse. That would also change the privacy rule in `AGENTS.md`.
- Bringing README "Deploy → Cloudflare Pages" in line with what U1 step 0 finds.

## Planning Contract

### Key Technical Decisions

- KTD1. **Cloudflare adds the beacon; no snippet in code.** (session-settled: user-directed — chosen over a snippet in `Meta.astro` and over reusing the main domain's token: no code or token to manage, and Tinker gets its own site.) The user chose the Pages project toggle. If Tinker turns out to be a Worker, the equivalent is a Web Analytics site for the hostname with automatic setup (see U1).
- KTD2. **Page views only.** (session-settled: user-directed — chosen over adding custom events through a second tool: keeps R3 and the no-cookie posture.) Chapters are separate URLs (`/<module>/<chapter>/`), and chapter changes are full page loads (CSS `@view-transition { navigation: auto }` in `src/layouts/ChapterLayout.astro`, no client router), so each chapter view is counted.
- KTD3. **Local preview and e2e stay beacon-free.** The beacon is added only on Cloudflare, so the offline and `requestfailed` e2e specs don't change.

### Assumptions

- **Deploy target is unconfirmed.** `wrangler.json` uses the Workers static-assets shape (`assets.directory: ./dist`, commit 3508ae2 "Workers Builds"), while README describes a Pages project. U1 step 0 settles which one is live.
- A Cloudflare bug has been reported where analytics turned on before a custom domain was added didn't count that domain. The reported workaround is to turn analytics off and on (see Sources). U1 checks for this.
- The home Finder writes the search into the URL (`?q=`, via `history.replaceState` in `src/pages/index.astro`). Whether the beacon reports that query string is unverified. U1 checks it.

## Implementation Units

### U1. Turn on Web Analytics for Tinker

**Goal:** Tinker traffic is counted in its own Web Analytics site.

**Requirements:** R1, R2, R3; KTD1, KTD2

**Dependencies:** none

**Files:** none (Cloudflare dashboard)

**Approach:**
0. In Workers & Pages, open `tinker` and check whether it's a **Pages project** or a **Worker**. Record the answer in this plan's Assumptions.
1. **Pages project:** Metrics → Web Analytics → Enable. **Worker:** Web Analytics → Add a site → `tinker.kondasamy.com`, with automatic setup on the proxied `kondasamy.com` zone.
2. Ship a new production deploy (merge to `main`, or "Retry deployment" on Pages). The beacon is only added to new responses.
3. On the live site, check the beacon (see Verification). If no data arrives after about an hour, turn analytics off and on again and redeploy. If the beacon never appears in the HTML (for example, automatic setup doesn't reach Worker asset responses), stop and ask, because the remaining option is a snippet in `Meta.astro`, which reopens KTD1 and KTD3.
4. Type a search into the home Finder, then inspect the `/cdn-cgi/rum` payloads. If any carries `?q=`, stop and decide between keeping the search out of the URL and accepting it and rewording R3.
5. In Web Analytics, filter the Tinker site by host. Expect `tinker.kondasamy.com`. `*.pages.dev`, preview or `explain.kondasamy.com` hosts may show too, so filter them out when reading numbers.

**Test expectation:** none -- dashboard configuration. It's checked on the live site, not in the repo's suites.

**Verification:**
- The live `tinker.kondasamy.com` HTML loads `beacon.min.js`, and the `/cdn-cgi/rum` POST returns 2xx.
- No beacon payload carries the Finder's `?q=` text, or the user has made the step 4 decision.
- The dashboard shows Tinker paths within about an hour, and `kondasamy.com`'s counts are unchanged.

### U2. Record the analytics decision

**Goal:** The next agent or contributor knows analytics exists, where it's set, and what's out of bounds.

**Requirements:** R4; KTD1, KTD2, KTD3

**Dependencies:** U1

**Files:**
- `AGENTS.md` (one bullet in "Making it stick", directly after "Nothing a reader enters leaves the browser…")

**Approach:** Add one line in AGENTS.md's terse style. Page-view analytics is Cloudflare Web Analytics, set in the Cloudflare dashboard (name the place U1 step 0 found). There's no snippet in the repo, no cookies and no custom events. Adding another tracker is a deliberate change.

**Test expectation:** none -- docs only.

**Verification:** `pnpm lint` stays clean, and the bullet names the dashboard location U1 actually used.

## Verification Contract

- U1's live checks pass (beacon loaded, `rum` 2xx, no `?q=` leak or a decision on it, Tinker paths in the dashboard).
- `pnpm check`, `pnpm lint`, `pnpm test` and `pnpm test:e2e` pass unchanged (no app code changes).

## Definition of Done

- The Cloudflare dashboard has a Tinker Web Analytics site with live data from `tinker.kondasamy.com`.
- The `AGENTS.md` bullet is merged through a PR to `main`.

## Sources

- Cloudflare, "Enable Web Analytics" (Pages): https://developers.cloudflare.com/pages/how-to/web-analytics (checked 2026-10-27)
- Cloudflare Web Analytics FAQ: https://developers.cloudflare.com/web-analytics/faq (checked 2026-10-27)
- Custom-domain off/on workaround report: https://angel.kiwi/blog/cors-error-capturing-cloudflare-web-analytics/ (checked 2026-10-27)

# DeFi research workspace

Everything behind five published onchain research studies: the collected data, the
documents built from it, the live panel, and the conventions that keep new work
consistent with what is already published.

Author: Illia Sharan (Wandor). GitHub `Wandory`. Rzeszow, Poland.

## Read this first

Every number in `studies/` and `pdf/` has been cross checked against `data/`.
If you change a metric definition or a data file, the documents that cite it are
wrong until you rebuild and re-verify them. There is a verification script for
exactly this: `python3 tools/verify.py`.

## Layout

```
data/        18 CSVs. The published panels. Treat as read only.
src/         Sources: document bodies, chart scripts, build scripts, raw JSON.
studies/     Built HTML documents (English). Generated from src/.
pdf/         Built A4 PDFs. Generated from studies/.
site/        The static site as it ships to GitHub Pages.
docs/        Notes that are not studies (vacancy shortlist).
tools/       verify.py, rebuild.sh
```

## The metric definitions, in one place

These are fixed. Do not silently redefine them; a changed definition invalidates
every published figure.

**Inclusion rule.** A pool day counts only when `apyBase` is populated. On those
same days a null `apyReward` counts as zero. Without this rule collateral only
pools, which pay no interest at all, enter the sample and coverage collapses to
9.4% at Compound v3 and 50% at Morpho Blue.

**Share of yield paid by borrowers** (the study calls it organic share):
`apyBase / (apyBase + apyReward)`, aggregated across days weighted by `tvlUsd`.
One means all depositor yield came from interest, zero means all of it was printed.

**Subsidies in dollars:** sum over pool days of `(apyReward / 36500) * tvlUsd`.
The live panel annualises the current day instead, which is a forward run rate
and is not comparable to realised spend.

**Incentive dependency:** subsidies / protocol revenue. Above one means the
protocol hands out more than it earns.

**Cost of capital:** subsidies / mean supply, annualised.
**Net margin:** (revenue - subsidies) / mean supply, annualised.
**Take rate:** protocol revenue / fees. **Pass through:** supply side revenue / fees.
**Supply:** TVL + borrowed, because DefiLlama subtracts borrows from TVL.
**Realised yield:** log compounding of daily rates, never averaging.
**Event study:** change in pool TVL minus change in protocol supply over the same
days, so a rising market is not mistaken for an effect of rewards.

**Scope matching.** Economics, supply and borrows must come from the same slug.
Use `aave-v3` not `aave`, `sparklend` not `spark`, `fluid-lending` not `fluid`.
Mixing parent and child slugs inflated Spark fees by 49% and Aave by 25% in
version 1 of the lending study.

## The eight lending protocols

`sparklend`, `venus-core-pool`, `aave-v3`, `compound-v3`, `morpho-blue`,
`fluid-lending`, `moonwell-lending`, `euler-v2`.

## Data sources

| What | Endpoint | Notes |
|---|---|---|
| Pool rates and size | `https://yields.llama.fi/pools` | ~11 MB, about 1 s. Current snapshot for every pool. |
| Pool history | `https://yields.llama.fi/chart/{poolId}` | Daily series per pool. |
| Protocol TVL and borrows | `https://api.llama.fi/protocol/{slug}` | ~29 MB for large protocols. Historical borrows live under `chainTvls.*.borrowed`. |
| Fees and revenue | `https://api.llama.fi/summary/fees/{slug}?dataType={t}` | Add `&excludeTotalDataChart=true&excludeTotalDataChartBreakdown=true` to get 13 KB instead of 570 KB. `dataType` is one of `dailyFees`, `dailyRevenue`, `dailyHoldersRevenue`, `dailySupplySideRevenue`, `dailyProtocolRevenue`. Fields: `total24h`, `total7d`, `total30d`, `totalAllTime`. |
| Morpho vaults | `https://blue-api.morpho.org/graphql` | Queries `vaults`, `curators`, `vaultByAddress.historicalState`. History arrives newest first, sort ascending before computing growth. |

CORS is open on all of these, including the Morpho GraphQL endpoint: a browser page
on any origin can fetch them directly. Verified 17 and 18 September 2026 from a
third party origin. A published claude.ai artifact cannot: external hosts are
blocked there, which is why the panels ship as plain HTML files instead.

Cost and latency worth knowing before adding a call: `yields.llama.fi/pools` is
about 11 MB and one second; `api.llama.fi/protocol/{slug}` is up to 29 MB, so it
must be lazy and never fetched at page load; a fees summary with both exclude
flags is 13 KB against 570 KB without them; the Morpho vaults and curators pair
takes about two seconds.

## Building

```bash
bash tools/rebuild.sh      # documents, then PDFs, then the live panel
python3 tools/verify.py    # cross check every headline number against data/
```

Documents are assembled by `src/build.py css body js data out title`. The body is
plain HTML with no doctype or head; `src/doc.css` supplies the whole stylesheet.
PDFs come from `node src/pdf_doc.js <studies/x.html> <pdf/x.pdf> "<running header>"`,
which needs `playwright` and a Chromium at `/opt/pw-browsers/chromium` or on PATH.

There are four live panels, one per study, all built by the same step in
`tools/rebuild.sh`. Each is a standalone HTML file in `site/`:

| Panel | Body and app | Baseline | Live source |
|---|---|---|---|
| `lending-live.html` | `dash-body.html`, `dash-app.js` | `baseline.json` | yields and fees endpoints |
| `morpho-live.html` | `morpho-body.html`, `morpho-app.js` | `baseline-morpho.json` | Morpho GraphQL |
| `dex-live.html` | `dex-body.html`, `dex-app.js` | `baseline-dex.json` | yields endpoint |
| `stable-live.html` | `stable-body.html`, `stable-app.js` | `baseline-stable.json` | yields endpoint |

They share `src/dash.css.html` for the stylesheet and `src/core.js` for the
runtime: formatting, fetch with timeout, the dumbbell, small multiples, the dot
and whisker, and a sortable table with optional pagination. A panel supplies only
its baseline, its columns and its section copy. The lending panel is the one
exception: it predates the shared core and carries its own head and inline code,
which is why it passes `dash-head.html` instead of the shared stylesheet. Fold it
into the core if you touch it substantially.

`__BASELINE__` in each app file is replaced with the matching baseline JSON at
build time. Baselines are extracted from the study data and are not live.

## House rules for anything new

**Charts.** Everything is monochrome, on the portfolio's own tokens. There is no
categorical palette and there should not be one: the moment a chart needs eight
colours it needs small multiples instead, one series per panel, all panels on one
scale. Never a dual axis. Give tiny values a visible floor or they vanish, which
happened once already with a $0.26M bar, and again when a line at 0.99 was clipped
by the top edge of its panel.

**Every total must equal the sum of its own monthly rows.** This is the single
cheapest check there is and it caught a $50.3M error in the exchange study that
internal consistency checking had passed, because the prose and the totals file
agreed with each other and both disagreed with the panel the charts were drawn
from. `tools/verify.py` now runs it over every entity.

**A number that looks impossible usually is, so find the mechanism before
publishing it.** Six Morpho vaults quote rates near 298,000% a year. They are not
real: every one is unlisted, and every one prices its share in the hundreds of
dollars in a vault denominated in a dollar asset, when a sound vault prices its
share near one. The API derives the rate from share price growth, so the share
price is the artefact and the rate is downstream of it. Not one of the 54 listed
vaults is affected. Show the evidence column next to the impossible number rather
than only the exclusion rule, so a reader can check the reasoning.

**Never a pooled ratio across entities whose scales differ.** The exchange panel
learned this the hard way: Aerodrome quotes reward rates in the hundreds of per
cent, so a TVL-weighted fee share across all venues is decided by one venue
holding 4% of the liquidity. Report a median across entities and the spread, and
say in the copy why the pooled figure is absent.

**No explanatory prose in a deliverable.** No "what this measures" sections, no
glossaries of columns, no tutorial tone. One short neutral note per section and
the technical term for everything. Explanations belong in chat, not in the work.

**Documents.** Formal report structure: title block, abstract, numbered contents,
numbered sections, numbered figures and tables with captions, an explicit
limitations section, references cited inline by number, and a data availability
section listing the CSVs. Everything in English. No em dashes or en dashes, use
commas, parentheses or full stops.

**Lists.** No bullet markers, no left indent. Structure comes from a bold lead in
phrase with the text flush left.

**Honesty rules that the published work already follows and must keep following.**
State limitations in the same document as the findings. When a pooled statistic is
driven by one member of the sample, say so: 27 of the 50 reward switch ons in the
lending study are Morpho Blue, so the pooled median is Morpho's median. When an
earlier version was wrong, print the correction rather than quietly fixing it.
Where a result is unstable across specifications, draw no conclusion, as with
Euler v2, whose rank moves six places out of eight depending on the weighting.

## What is not done

Borrower side rewards are not measured anywhere; only the depositor side is, so
real subsidies are higher than reported, most of all at Moonwell and Venus.
Only one external cross check exists in the whole body of work: the Aave buyback
in April 2025. Velodrome v3 dropped out of the exchange study entirely because
every selected pool failed to load. The exchange study does not account for
impermanent loss and therefore describes the composition of reported yield rather
than a liquidity provider's bottom line.

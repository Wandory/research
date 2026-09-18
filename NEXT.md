# What to do next

Three things are unfinished. They are listed in the order that gets the most
value soonest.

## 1. Put the site online

`site/` is a complete static site. Nothing to build, nothing to install.

Push the whole workspace to `github.com/Wandory/research`, then in the repository
settings turn on Pages and point it at the `site/` folder on the default branch.
The portfolio links inside `site/index.html` are already relative, so they resolve
on their own once Pages is live.

The live panel needs to be served over http or opened as a local file. It fetches
DefiLlama from the viewer's browser, and that works on GitHub Pages: CORS is open
on every endpoint it touches, verified 17 September 2026.

## 2. Extend the live panels

All four studies now have one. `site/lending-live.html`, `site/morpho-live.html`,
`site/dex-live.html` and `site/stable-live.html` each recompute their study's
headline metric on live data and set it against the published baseline.

Natural next steps, roughly in order of effort:

**Per pool and per vault history.** `yields.llama.fi/chart/{poolId}` returns the
daily series for one pool, and `vaultByAddress.historicalState` does the same for a
Morpho vault. Clicking a row in any explorer could draw that row's own history
rather than only its current snapshot. This is the single biggest upgrade available.

**Drift alerting.** Every panel already knows the published figure and the live one.
An entity that has moved more than some threshold since publication is the thing
worth surfacing, and right now the reader has to spot it themselves.

**Fold the lending panel into the shared core.** It predates `src/core.js` and
carries its own copy of the helpers. Nothing is broken, but the duplication will
rot the moment the core changes.

**Utilisation in the lending panel.** Not in the pools endpoint. Historical borrows
live under `chainTvls.*.borrowed` in `api.llama.fi/protocol/{slug}`, which is around
29 MB for a large protocol, so it has to be fetched lazily on demand.

**A landing page for the four panels.** They are linked from the portfolio
individually; a single index that shows all four headline numbers side by side
would make the set read as one product.

Before touching a chart, read the house rules in `CLAUDE.md`. The short version:
monochrome, small multiples instead of many series in one frame, no dual axis,
tiny values need a visible floor, no pooled ratio across entities with different
scales, and no explanatory prose anywhere in the output.

## 3. Keep the numbers honest

`python3 tools/verify.py` cross checks 33 headline figures against the data. It
currently passes. Run it after any change to `data/` or `src/`, and add a check
whenever a document makes a new numeric claim.

A caveat worth carrying forward: the live panel's subsidy figure is an annualised
run rate from one moment, and the study's figure is realised spend over 32 months.
They are different quantities. The panel labels them separately for that reason;
do not merge them into one column.

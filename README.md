# research

Five independent studies on where DeFi yield actually comes from, with the data,
the method and four live panels that recompute each result on current data.

**Site:** https://wandory.github.io/research/

| Study | Sample | PDF | Live panel |
|---|---|---|---|
| Organic yield against token subsidies | 8 lending protocols, 478 pools, 146,866 pool days | [PDF](docs/organic-vs-subsidies-2026-09.pdf) | [open](https://wandory.github.io/research/lending-live.html) |
| Who runs your money in Morpho | 78 vaults, 12 curators, a year of daily history | [PDF](docs/morpho-curators-2026-09.pdf) | [open](https://wandory.github.io/research/morpho-live.html) |
| Mercenary liquidity | 7 exchanges, 143 pools, 65,727 pool days | [PDF](docs/dex-mercenary-liquidity-2026-09.pdf) | [open](https://wandory.github.io/research/dex-live.html) |
| The rate that does not hold | 8 stablecoin issuers, 38 pools | [PDF](docs/stablecoin-yield-2026-09.pdf) | [open](https://wandory.github.io/research/stable-live.html) |
| Execution as a market | protocol research, 41 pages | [PDF](docs/altius-execution-marketplace-research.pdf) | |

## What is here

```
docs/            the published site, served by GitHub Pages
docs/studies/    each study as a web page
docs/data/       18 CSVs, every table behind every figure
src/             document sources, chart code, panel sources, raw JSON
tools/           verify.py, rebuild.sh
notes/           what was decided and what was found wrong
CLAUDE.md        metric definitions, endpoints, house rules
NEXT.md          what is unfinished
```

## Reproducing it

```bash
python3 tools/verify.py     # 42 checks against the data, all passing
bash tools/rebuild.sh       # rebuilds documents, PDFs and the four live panels
```

`verify.py` does two jobs. It confirms that every headline figure in the studies
matches the data, and it tests whether the data itself can be true: every total
must equal the sum of its own monthly rows, no entity may quote an impossible
rate, and the lending panel's accounting identities must hold.

## Corrections

Errors are printed in the documents rather than fixed quietly.

The lending study is version 2.0. Version 1 mixed parent and child protocol slugs,
which inflated Spark's fees by 49% and Aave's by 25%, and substituted treasury
revenue for total revenue on some protocols, which made the Venus take rate read
0.84% instead of 17.82%.

The exchange study carries a correction found after publication. Curve's emissions
total exceeded the sum of its own monthly rows by $50.3M, because that totals pass
had not applied the inclusion rule stated in the method. The venue total changed
from $147M to $96.7M and Aerodrome Slipstream, not Curve, is the largest spender.

## Sources

DefiLlama yields, protocol and fees APIs, and the Morpho GraphQL API. Data
retrieved 16 and 17 September 2026. The live panels fetch from the same endpoints
in the reader's browser at open time.

Author: Illia Sharan (Wandor), Rzeszów, Poland.

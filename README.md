# research

Five independent studies on where DeFi yield actually comes from, with the data,
the method and four live panels that recompute each result on current data.

**Site:** https://wandory.github.io/research/

| Study | Sample | PDF | Live panel |
|---|---|---|---|
| Organic yield against token subsidies | 8 lending protocols, 478 pools, 146,866 pool days | [PDF](docs/organic-vs-subsidies-2026-09.pdf) | [open](https://wandory.github.io/research/lending-live.html) |
| Who runs your money in Morpho | 78 vaults, 12 curators, a year of daily history | [PDF](docs/morpho-curators-2026-09.pdf) | [open](https://wandory.github.io/research/morpho-live.html) |
| Mercenary liquidity | 6 exchanges, 143 pools, 78,412 pool days | [PDF](docs/dex-mercenary-liquidity-2026-09.pdf) | [open](https://wandory.github.io/research/dex-live.html) |
| The rate that does not hold | 7 stablecoin issuers, 36 pools | [PDF](docs/stablecoin-yield-2026-09.pdf) | [open](https://wandory.github.io/research/stable-live.html) |
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

## What can and cannot be rebuilt

```bash
python3 tools/verify.py     # checks the documents against the data in src/
bash tools/rebuild.sh       # rebuilds documents, PDFs and the four live panels from src/
```

The collection step is not in this repository. `src/` holds the data as it was
retrieved and reduced on 16 and 17 September 2026, and `rebuild.sh` regenerates
every document, PDF and panel from it. The scripts that called the DefiLlama and
Morpho endpoints and built those files were not kept, so the figures cannot be
regenerated from the APIs here, only re-derived from the data that is included.
The live panels do query the endpoints directly, so anyone can compare today's
values against the published baseline without running anything.

`verify.py` checks the documents against that data: every headline figure must
match, every total must equal the sum of its own monthly rows, no entity may
quote an impossible rate, the accounting identities must hold, and the sample
sizes stated in each paper must match the rows behind them. It cannot check how
the data was built, which is a real gap and the reason the correction below
about collateral positions was found by reading the source rather than by a test.

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

A later audit found three more. The exchange study's sample line said seven
exchanges and 65,727 pool days; the data behind it has six venues, because
Velodrome v3 dropped out, and 78,412 pool days. The stablecoin study counted
Origin Ether among eight stablecoin issuers, although OETH is pegged to ether
rather than to a dollar; it is removed and the sample is seven issuers and 36
pools. The lending study's pool set mixes lending positions with collateral
positions, which earn no borrower interest by design at Morpho Blue, Compound v3
and SparkLend; because the organic share is weighted by yield dollars rather than
by pool, restricting the set moves only Aave v3, from 0.9402 to 0.9695, and Morpho
Blue, from 0.8520 to 0.8643.

## Sources

DefiLlama yields, protocol and fees APIs, and the Morpho GraphQL API. Data
retrieved 16 and 17 September 2026. The live panels fetch from the same endpoints
in the reader's browser at open time.

Author: Illia Sharan (Wandor), Rzeszów, Poland.

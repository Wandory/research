# Decision log

What was decided, what was found wrong, and why the work looks the way it does.
Kept so that a later session does not redo an argument that was already settled.

## Why the original project stalled, and what unblocked it

The project sat unfinished for about a year on two blockers, both recorded in its
own notes as unsolvable.

**Historical borrows.** The protocol endpoint appears to give only current values.
They are there, under `chainTvls.<chain>.borrowed`, as a full daily series. That
single field is what made a 32 month supply and borrow panel possible.

**Pricing the rewards.** There is no endpoint that says what a protocol paid out.
But `apyReward` multiplied by `tvlUsd` and divided by 36,500 is the daily dollar
value of the reward as the aggregator itself prices it. Summed over pool days, that
is the subsidy figure the whole study rests on.

Neither needed a paid data source.

## The inclusion rule decides the result

A pool day counts only when `apyBase` is populated. Without that rule, collateral
only pools enter the sample. They pay no interest at all, so they drag the measured
share of borrower paid yield toward zero, and coverage collapses to 9.4% at
Compound v3 and 50% at Morpho Blue. The rule was not invented for convenience; it
is written in the source project's own methodology, which states that Compound III
collateral never belongs to base asset supply.

## Version 1 of the lending study was wrong, twice

Both corrections are printed in the document rather than quietly fixed.

**Scope mixing.** Economics were read from parent slugs while activity came from
child slugs: `aave` against `aave-v3`, `spark` against `sparklend`, `fluid` against
`fluid-lending`. That inflated Spark fees by 49% and Aave by 25%.

**Two definitions of revenue.** Treasury revenue was substituted for total revenue
on some protocols, which made the Venus take rate read 0.84% instead of 17.82%.

## Things the audit caught later

**The pooled event study row is one protocol.** Morpho Blue supplies 27 of the 50
reward switch ons, so the pooled median reproduces Morpho's median to the decimal.
It looked like a copy paste bug and is not. The headline null result, that turning
rewards on buys no liquidity, is therefore established for Morpho and only weakly
supported for the other four. This is now stated in the text and in the limitations.

**Peaks reported as launch rates.** The stablecoin study said Midas launched at
10.42% and Falcon at 7.94%. Those are peaks. The launch rates are 6.65% and 7.77%,
and the study's own Table 1 said so on the same page.

**Reward day shares were wrong.** Morpho curator reward day shares were given as
0.2% and 1.7%; recomputed day weighted they are 0.6% and 1.3%.

**References were never cited.** Three of four documents listed sources and cited
none of them inline. Every reference now carries a numbered marker in the text.

## The audit that internal consistency does not catch

Checking that a number in the prose equals the number in the CSV proves only that
the text was transcribed correctly. It says nothing about whether the CSV is right.
Two errors survived that check and were found later by asking whether the data
could be true at all.

**Six Morpho vaults quoting about 298,000% a year.** The rate is derived from share
price growth, and these vaults price their share between $175 and $682 in a vault
denominated in a dollar asset, where every sound vault prices it near one. Every one
of them is unlisted; not one of the 54 listed vaults in the sample is affected. They
were already excluded from the figures, but the panel now shows the share price and
the listing flag next to the impossible rate so a reader can check the reasoning.

**Curve's emissions total was wrong by $50.3M.** The totals row said $85.4M; summing
the thirty three monthly rows of the published panel gives $35.1M. Every other venue
agreed with its own monthly rows to within rounding, so the totals pass for that one
venue had not applied the inclusion rule stated in the method. The consequences ran
through the whole study: the venue total fell from $147M to $96.7M, the claim that
exchanges spend twice what lenders do became about a third more, and Aerodrome
Slipstream rather than Curve became the largest spender in the sample. The
correction is printed in the document rather than applied quietly.

**A third finding that only weakened a caveat.** In eight protocol months, five at
SparkLend and three at Fluid, the source reports more holders revenue than total
revenue. An accounting split cannot do that, so the holders share is an indicator of
direction and not an exact payout. The lending study already carried a softer version
of this caveat; it now states the evidence.

`tools/verify.py` was extended to catch all three classes: every total must equal the
sum of its own monthly rows, no undocumented entity may quote an impossible rate, and
the lending panel's accounting identities must hold. Forty two checks, all passing.

**A near miss worth recording.** While auditing the exchange emissions I convinced
myself the arithmetic was inflated twenty fold, because I read `tvl_sum` in the
monthly panel as the venue total. It is the mean per pool: `tvl_sum` multiplied by
`pools` reproduces the venue TVL almost exactly. The emissions formula was correct
all along. Check what a column means before calling it a bug.

## Charting rules learned the hard way

**Tiny values disappear.** A protocol at 0.99 drew its line exactly on the top edge
of its panel and was clipped to invisibility. Panels now carry vertical padding.
A $0.26M bar rendered as nothing next to an $11.9M bar. Small values need a floor.

**Eight categorical colours cannot share one plot.** The validated palette clears
colour blind separation on adjacent pairs only. Past three series, all pairs are on
screen at once and no ordering passes. Both history charts in the live panel are
small multiples for this reason, one series per panel, all panels on one scale.

**Markers must sit on what they mark.** The Morpho rate chart was built from CSS
bars and sliders that drifted apart under different font sizes. It is one SVG now,
so the dot and its interquartile bar cannot separate.

## Why the live panel is a file and not a hosted artifact

A published claude.ai artifact is sandboxed: external hosts other than Google Fonts
are blocked, and the runtime capabilities available to a page do not include
fetching an arbitrary URL. So the panel cannot be an artifact and stay live. As a
plain HTML file, opened locally or served from GitHub Pages, it fetches DefiLlama
directly from the viewer's browser. CORS is open on every endpoint it touches,
verified 17 September 2026 from a third party origin.

The panel degrades honestly: if the API cannot be reached it says so in a visible
banner and shows the published baseline only, rather than rendering empty charts.

## Where the chat transcript goes

Drop it in this folder as `docs/session-log.md` or similar. Nothing references it,
so any filename works.

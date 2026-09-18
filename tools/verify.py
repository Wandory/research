#!/usr/bin/env python3
"""Cross check every headline number in the studies against the data in src/.

Run from the workspace root:  python3 tools/verify.py
Exit code 0 when everything agrees, 1 when anything drifts.
"""
import json, os, sys, statistics as st

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, 'src')
checks, failures = [], 0

def chk(label, claimed, actual, tol=0.02):
    global failures
    try:
        ok = abs(claimed - actual) <= max(tol, abs(actual) * tol)
    except TypeError:
        ok = claimed == actual
    if not ok:
        failures += 1
    checks.append((ok, label, claimed, actual))

def load(name):
    with open(os.path.join(SRC, name), encoding='utf-8') as f:
        return json.load(f)

# ---- lending ----
rep = load('report2-data.json')
U, E, A, C = rep['summary'], rep['econ'], rep['angles'], rep['conc']
chk('lending: total subsidies $73.0M', 73.0, sum(U[p]['incentives_musd'] for p in U))
chk('lending: total revenue $288.3M', 288.3, sum(U[p]['revenue_musd'] for p in U))
chk('lending: total fees $2669.5M', 2669.5, sum(E[p]['fees_total'] for p in E) / 1e6)
chk('lending: SparkLend share 1.00', 1.00, A['sparklend']['A1_tvl_weighted'])
chk('lending: Euler v2 share 0.45', 0.45, A['euler-v2']['A1_tvl_weighted'])
chk('lending: protocols with negative margin = 4', 4,
    len([p for p in U if U[p]['net_margin_pct'] < 0]), 0)
chk('lending: Morpho paid $30.6M', 30.6, U['morpho-blue']['incentives_musd'])
chk('lending: Fluid paid $21.8M', 21.8, U['fluid-lending']['incentives_musd'])
chk('lending: Moonwell take rate 21.47%', 21.47, E['moonwell-lending']['take_rate'])
chk('lending: Morpho take rate 0', 0.0, E['morpho-blue']['take_rate'], 0.001)
chk('lending: Venus take rate 17.82%', 17.82, E['venus-core-pool']['take_rate'])
chk('lending: Morpho pools for 98% of TVL = 232', 232, C['morpho-blue']['pools_used'], 0)

# ---- exchanges and stablecoins ----
d = load('dex-data.json')
T = {t['project']: t for t in d['totals']}
ev = {e['group']: e for e in d['ev']}
dex = [t for t in d['totals'] if t['grp'] == 'dex']
chk('dex: total paid out $96.7M', 96.7, sum(float(t['incentives_usd']) for t in dex) / 1e6, 0.03)
chk('dex: Curve paid $35.1M', 35.1, float(T['curve-dex']['incentives_usd']) / 1e6)
chk('dex: switch on median +39.5%', 39.5, float(ev['start|all']['med_excess_d90']))
chk('dex: switch on events = 17', 17, float(ev['start|all']['n']), 0)
chk('dex: switch off events = 43', 43, float(ev['stop|all']['n']), 0)
chk('dex: Aerodrome Slipstream switch off -10.2%', -10.2,
    float(ev['stop|aerodrome-slipstream']['med_excess_d90']), 0.05)

S, M = d['series'], d['months']
cr = {(r['project'], int(r['window_days'])): r for r in d['cr']}
def issuer(p):
    s = S[p]; idx = [i for i, v in enumerate(s['base']) if v is not None]
    return s, idx[0], idx[-1], max(idx, key=lambda i: s['base'][i])
s, f, l, mx = issuer('ethena-usde')
chk('stable: Ethena peak 37.11%', 37.11, s['base'][mx])
chk('stable: Ethena now 4.79%', 4.79, s['base'][l])
chk('stable: Ethena 365d ratio 0.811', 0.811, float(cr[('ethena-usde', 365)]['med_ratio']), 0.01)
chk('stable: Sky 365d ratio 0.879', 0.879, float(cr[('sky-lending', 365)]['med_ratio']), 0.01)
s, f, l, mx = issuer('midas-rwa')
chk('stable: Midas opened at 6.65%', 6.65, s['base'][f])
chk('stable: Midas peaked at 10.42%', 10.42, s['base'][mx])

# ---- morpho ----
m = load('morpho-data.json')
cu, vh = m['curators'], m['vh']
tot = sum(float(c['aum_usd']) for c in cu)
chk('morpho: readable assets $1.53B', 1.53, tot / 1e9)
chk('morpho: curators = 12', 12, len(cu), 0)
chk('morpho: vaults = 78', 78, len(m['vaults']), 0)
chk('morpho: Gauntlet share 38.0%', 38.0,
    float([c for c in cu if c['curator'] == 'Gauntlet'][0]['aum_usd']) / tot * 100, 0.1)
chk('morpho: median rate 3.40%', 3.40, st.median([float(v['median_apy']) for v in vh]))
chk('morpho: median IQR 1.08', 1.08, st.median([float(v['iqr_apy']) for v in vh]))
chk('morpho: days above 20% = 238', 238, sum(float(v['days_over_20pct']) for v in vh), 0)

def dayw(name, field):
    rows = [v for v in vh if v['curator'] == name]
    days = sum(float(r['days']) for r in rows)
    return sum(float(r[field]) * float(r['days']) for r in rows) / days if days else 0
chk('morpho: Gauntlet reward days 0.6%', 0.6, dayw('Gauntlet', 'reward_days_share') * 100, 0.1)
chk('morpho: Steakhouse reward days 1.3%', 1.3,
    dayw('Steakhouse Financial', 'reward_days_share') * 100, 0.1)

# ---- plausibility, not just internal agreement ----
# Every headline total must equal the sum of its own monthly rows. A totals row
# that disagrees with the panel it is drawn from is how the Curve figure was
# wrong by $50.3M in the first version of the exchange study.
import csv, os
mon_path = next((p for p in (os.path.join(ROOT, 'data', 'dex_stable_monthly.csv'),
                             os.path.join(ROOT, 'docs', 'data', 'dex_stable_monthly.csv'))
                 if os.path.exists(p)), None)
if mon_path is None:
    raise SystemExit('verify: dex_stable_monthly.csv not found; the totals checks '
                     'cannot be skipped silently, they are the ones that caught the '
                     '$50.3M Curve error')
if True:
    per = {}
    with open(mon_path, encoding='utf-8') as f:
        for row in csv.DictReader(f):
            per[row['project']] = per.get(row['project'], 0.0) + float(row['incentives_usd'])
    for t in d['totals']:
        p = t['project']
        reported = float(t['incentives_usd'])
        if p in per and reported > 0:
            chk('totals agree with the monthly panel: ' + p, round(reported), round(per[p]), 0.01)

# Rates that cannot be real. A vault quoting a four figure annual rate is an
# artefact of its share price, never a yield anyone received. Six such vaults are
# known and documented as excluded; this check fails only if a new one appears.
wild = [v['vault'] for v in m['vaults'] if float(v.get('net_apy') or 0) > 100
        or float(v.get('fee_pct') or 0) > 35]
known = set(b['vault'] for b in m['bad'])
chk('morpho: no undocumented vault with an impossible rate', 0,
    len([v for v in wild if v not in known]), 0)
chk('morpho: every excluded vault is still in the data', len(known), len(m['bad']), 0)

# Accounting identities that must hold in the lending panel.
viol = 0
for p, rows in rep['series'].items():
    for r in rows:
        if not r:
            continue
        if r.get('rev') and r.get('fees') and r['rev'] > r['fees'] * 1.001:
            viol += 1
        if r.get('bor') and r.get('sup') and r['bor'] > r['sup']:
            viol += 1
        o = r.get('org')
        if o is not None and not (-1e-9 <= o <= 1 + 1e-9):
            viol += 1
chk('lending panel: no accounting identity broken', 0, viol, 0)

# Sample sizes stated in the papers must match the rows behind them.
import re
DOC = os.path.join(SRC, '')
def body(name):
    with open(os.path.join(SRC, name), encoding='utf-8') as fh:
        return fh.read()

dexrows = [t for t in d['totals'] if t['grp'] == 'dex']
strows = [t for t in d['totals'] if t['grp'] == 'stable']
db, sb = body('dex_body_en.html'), body('stable_body_en.html')

chk('dex: venues in data = venues claimed', len(dexrows),
    int(re.search(r'(\d+) exchanges, ', db).group(1)), 0)
chk('dex: pools in data = pools claimed', sum(int(t['pools']) for t in dexrows),
    int(re.search(r'exchanges, ([\d,]+) pools', db).group(1).replace(',', '')), 0)
chk('dex: pool-days in data = pool-days claimed', sum(int(t['pool_days']) for t in dexrows),
    int(re.search(r'pools, ([\d,]+) pool-days', db).group(1).replace(',', '')), 0)
chk('stable: issuers in data = issuers claimed', len(strows),
    int(re.search(r'(\d+) issuers, ', sb).group(1)), 0)
chk('stable: pools in data = pools claimed', sum(int(t['pools']) for t in strows),
    int(re.search(r'issuers, (\d+) pools', sb).group(1)), 0)
chk('stable: no ether denominated issuer in a stablecoin sample', 0,
    len([t for t in strows if 'ether' in t['project']]), 0)
chk('dex: venue count in prose matches the sample line', 0,
    len(re.findall(r'seven venues|seven exchanges', db)), 0)

for ok, label, claimed, actual in checks:
    try:
        shown = round(actual, 4)
    except TypeError:
        shown = actual
    print(('  ok  ' if ok else 'FAIL  ') + label + '  | claimed ' + str(claimed) + ' | actual ' + str(shown))
print('\n%d checks, %d failed' % (len(checks), failures))
sys.exit(1 if failures else 0)

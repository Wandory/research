"""Coverage sensitivity: does dropping pool-days with an unreadable base rate bias
the organic share? Groups pools by the share of their days that are readable and
recomputes the TVL weighted organic share with and without the partly covered pools.
Usage: python3 tools/coverage_bias.py data/pool_month.csv
"""
import csv, collections, sys

def load(path):
    P = collections.defaultdict(lambda: dict(dayN=0, baseN=0, bws=0.0, bww=0.0,
                                             rws=0.0, rww=0.0, tvl=0.0, proj=''))
    for r in csv.DictReader(open(path)):
        p = P[r['pool']]
        p['dayN'] += int(r['dayN']); p['baseN'] += int(r['baseN'])
        p['bws'] += float(r['baseWsum']); p['bww'] += float(r['baseWw'])
        p['rws'] += float(r['rewWsum']); p['rww'] += float(r['rewWw'])
        p['tvl'] = float(r['tvl_now']); p['proj'] = r['project']
    out = collections.defaultdict(list)
    for p in P.values():
        if p['dayN'] == 0 or p['bww'] == 0:
            continue
        base = p['bws'] / p['bww']
        rew = p['rws'] / p['rww'] if p['rww'] else 0.0
        if base + rew <= 0:
            continue
        out[p['proj']].append((p['baseN'] / p['dayN'], base, rew, p['tvl'],
                               p['dayN'], p['baseN']))
    return out

def share(rows):
    W = sum(r[3] for r in rows)
    return sum(r[1] / (r[1] + r[2]) * r[3] for r in rows) / W if W else None

def main(path):
    byproj = load(path)
    print(f"{'protocol':<18}{'coverage':>10}{'pools':>7}{'all days':>10}{'full cov':>10}{'gap':>8}")
    for proj, rows in sorted(byproj.items(), key=lambda x: -sum(r[3] for r in x[1])):
        cov = sum(r[5] for r in rows) / sum(r[4] for r in rows)
        a, b = share(rows), share([r for r in rows if r[0] >= 0.99])
        gap = b - a if (a is not None and b is not None) else float('nan')
        print(f"{proj:<18}{cov:>9.1%}{len(rows):>7}{a:>10.3f}"
              f"{b if b is not None else float('nan'):>10.3f}{gap:>8.3f}")

if __name__ == '__main__':
    main(sys.argv[1] if len(sys.argv) > 1 else 'data/pool_month.csv')

#!/usr/bin/env python3
"""Seed the Mitsubishi content collections from mitsubishi-initial-data.json.

Collections (FK order): vehicles -> vehicle_trims -> dealers.
Records carry explicit integer ids; the script is safe to re-run:
if any collection already has rows it aborts (delete rows first to reseed).
"""
import json
import os
import sys
import urllib.error
import urllib.request

def _load_token():
    """Token from $DIRECTUS_TOKEN, else ADMIN_TOKEN in directus/.env."""
    tok = os.environ.get('DIRECTUS_TOKEN')
    if tok:
        return tok
    env_file = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '.env')
    if os.path.exists(env_file):
        for line in open(env_file):
            if line.startswith('ADMIN_TOKEN='):
                return line.split('=', 1)[1].strip()
    sys.exit('ERROR: no token. Set $DIRECTUS_TOKEN or put ADMIN_TOKEN in directus/.env')


TOKEN = _load_token()
BASE = os.environ.get('DIRECTUS_URL', 'http://localhost:8055')
SEED_FILE = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'mitsubishi-initial-data.json')
ORDER = ['vehicles', 'vehicle_trims', 'dealers']


def req(method, path, body=None):
    r = urllib.request.Request(BASE + path,
        data=json.dumps(body).encode() if body is not None else None,
        headers={'Authorization': f'Bearer {TOKEN}', 'Content-Type': 'application/json'},
        method=method)
    try:
        with urllib.request.urlopen(r, timeout=120) as resp:
            out = resp.read().decode()
            return resp.status, (json.loads(out) if out else None)
    except urllib.error.HTTPError as e:
        return e.code, json.loads(e.read().decode() or '{}')


def main():
    seed = json.load(open(SEED_FILE))
    for coll in ORDER:
        rows = seed.get(coll, [])
        st, d = req('GET', f'/items/{coll}?limit=1&fields=id')
        existing = (d.get('data') or []) if isinstance(d, dict) else []
        if existing:
            print(f'ABORT: {coll} already has rows ({len(existing)}); delete them first to reseed')
            sys.exit(1)
        if not rows:
            print(f'   {coll}: no seed rows, skipping')
            continue
        st, d = req('POST', f'/items/{coll}', rows)
        if st not in (200, 201):
            print(f'!! POST /items/{coll}: {st} {str(d)[:200]}')
            sys.exit(1)
        print(f'   {coll}: {len(rows)} rows created')


if __name__ == '__main__':
    print('Seeding Mitsubishi content data')
    main()
    print('DONE')

#!/usr/bin/env python3
"""
Syncs live CMS content for the layout/fonts sprint:
  - navigation (main + footer) -> Home, Showroom, About, Service, Parts, Contact
    (all local Nuxt routes; the legacy /dealers nav link is removed — the
    /dealers page itself remains, reachable via the showroom CTA)
  - pages /service and /parts (block_richtext), created only if missing

Idempotent: nav item sets are replaced wholesale; pages are upserted by permalink.
Token from $DIRECTUS_TOKEN, else ADMIN_TOKEN in directus/.env.
"""
import json, os, sys, urllib.request
from datetime import datetime, timezone


def _load_token():
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

def req(method, path, body=None, expect=(200, 201, 204)):
    r = urllib.request.Request(
        BASE + path,
        data=json.dumps(body).encode() if body is not None else None,
        headers={'Authorization': f'Bearer {TOKEN}', 'Content-Type': 'application/json'},
        method=method)
    try:
        with urllib.request.urlopen(r, timeout=60) as resp:
            out = resp.read().decode()
            return resp.status, (json.loads(out) if out else None)
    except urllib.error.HTTPError as e:
        print(f'  !! {method} {path}: {e.code} {e.read().decode()[:300]}')
        sys.exit(1)

# Desired nav: (url, title, sort) — all local Nuxt routes
DESIRED = [
    ('/', 'Home', 1),
    ('/showroom/2025-outlander-sport', 'Showroom', 2),
    ('/about', 'About', 3),
    ('/service', 'Service', 4),
    ('/parts', 'Parts', 5),
    ('/contact', 'Contact', 6),
]

now = datetime.now(timezone.utc).strftime('%Y-%m-%dT%H:%M:%S+00:00')

# --- 1. navigation (main + footer) -----------------------------------------
print('1. navigation items (main + footer)')
for nav in ('main', 'footer'):
    st, d = req('GET', f'/items/navigation_items?filter[navigation][_eq]={nav}&fields=id')
    for item in d['data']:
        st, _ = req('DELETE', f"/items/navigation_items/{item['id']}")
    payload = [{'navigation': nav, 'title': t, 'type': 'url', 'url': u, 'sort': s} for (u, t, s) in DESIRED]
    st, d = req('POST', '/items/navigation_items', payload)
    print(f'   -> {nav}: replaced with {len(d["data"])} items')

# --- 2. /service + /parts pages ---------------------------------------------
def ensure_page(permalink, title, sort, seo_title, seo_desc, tagline, headline, content):
    st, d = req('GET', f'/items/pages?filter[permalink][_eq]={permalink}&fields=id&limit=1')
    if d['data']:
        print(f'   -> {permalink} exists; skipping')
        return
    st, d = req('POST', '/items/block_richtext', [{
        'tagline': tagline, 'headline': headline, 'alignment': 'center', 'content': content,
    }])
    rt_id = d['data'][0]['id']
    st, d = req('POST', '/items/pages', [{
        'title': title, 'permalink': permalink, 'sort': sort,
        'status': 'published', 'published_at': now,
        'seo': {'title': seo_title, 'meta_description': seo_desc, 'og_image': None},
    }])
    page_id = d['data'][0]['id']
    st, d = req('POST', '/items/page_blocks', [{
        'page': page_id, 'sort': 1, 'collection': 'block_richtext', 'item': rt_id,
        'background': 'light', 'hide_block': False,
    }])
    print(f'   -> {permalink} created (page {page_id[:8]}.. + richtext {rt_id[:8]}..)')

print('2. pages /service + /parts')
ensure_page(
    '/service', 'Service', 4,
    'Service',
    'Book factory-warranty service at ANSA Motors — Port of Spain, San Fernando, and Chaguanas.',
    'Service Centre',
    'Factory-Trained. Factory-Warranty.',
    '<p>ANSA Motors service centres in Port of Spain, San Fernando, and Chaguanas are staffed by '
    'factory-trained technicians with Mitsubishi diagnostic tooling, covering scheduled maintenance, '
    'repairs, and factory-warranty work for every model in the lineup.</p>'
    '<p><strong>Scheduled maintenance</strong> — oil changes, brake service, inspections, and '
    '5-Year / 100,000 km warranty checks at factory intervals.</p>'
    '<p><strong>Book a service</strong> — call +1 (868) 625-7231 (Port of Spain), +1 (868) 657-8271 '
    '(San Fernando), or +1 (868) 665-5321 (Chaguanas). Hours: Mon–Fri 8:00 AM – 4:30 PM, '
    'Sat 8:30 AM – 12:30 PM.</p>',
)
ensure_page(
    '/parts', 'Parts', 5,
    'Parts',
    'Genuine Mitsubishi parts at ANSA Motors Trinidad & Tobago — Port of Spain, San Fernando, and Chaguanas.',
    'Genuine Parts',
    'Genuine Mitsubishi Parts',
    '<p>Every ANSA Motors location stocks genuine Mitsubishi parts and accessories — the exact '
    'components your vehicle was engineered with, backed by the Mitsubishi warranty.</p>'
    '<p><strong>Parts counters</strong> — Port of Spain (Corner Richmond &amp; Duke Streets), San '
    'Fernando (Royal Road), and Chaguanas (Brentwood Commercial Center) can supply, fit, and '
    'warranty genuine parts for the full lineup.</p>'
    '<p><strong>Ordering</strong> — call +1 (868) 625-7231 with your VIN for same-day availability '
    'checks, or visit any parts counter Mon–Fri 8:00 AM – 4:30 PM, Sat 8:30 AM – 12:30 PM.</p>',
)

print('DONE')

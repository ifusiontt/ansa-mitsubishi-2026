#!/usr/bin/env python3
"""
Seeds the Nuxt starter's required content into Directus:
  - globals singleton (ANSA Mitsubishi branding)
  - navigation items (main + footer)
  - pages: / (home, hero+richtext), /dealers, /about, /contact
  - block items: block_hero, block_richtext, block_button_group, block_button
  - page_blocks rows linking blocks to pages
  - one redirect row (silences the redirect loader warning)

Idempotent: skips seeding if pages already exist.
"""
import json, os, sys, urllib.request
from datetime import datetime, timezone


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

# --- idempotency guard -------------------------------------------------
st, d = req('GET', '/items/pages?filter[permalink][_eq]=/&limit=1')
if d['data']:
    print('pages already seeded; skipping (delete /items/pages to reseed)')
    sys.exit(0)

now = datetime.now(timezone.utc).strftime('%Y-%m-%dT%H:%M:%S+00:00')

# --- 1. globals singleton ---------------------------------------------
print('1. globals singleton')
# Directus 12: singletons are regular rows; readSingleton = GET /items/globals,
# and the row is upserted via the batch-update route PATCH /items/globals
st, d = req('PATCH', '/items/globals', {
    'title': 'ANSA Mitsubishi',
    'url': 'https://ansamitsubishi.com',
    'accent_color': '#C3002F',
    'tagline': "Trinidad & Tobago's Authorised Mitsubishi Dealer",
    'description': ('ANSA Mitsubishi is the authorised distributor of Mitsubishi vehicles in '
                    'Trinidad and Tobago, offering the full 2026 lineup, factory-warranty service, '
                    'and genuine parts at every ANSA Motors location.'),
    'social_links': [
        {'service': 'facebook', 'url': 'https://facebook.com/ansamitsubishi'},
        {'service': 'instagram', 'url': 'https://instagram.com/ansamitsubishi'},
        {'service': 'x', 'url': 'https://x.com/ansamitsubishi'},
    ],
})
print(f'   -> {st} globals saved')

# --- 2. navigation ------------------------------------------------------
print('2. navigation (main + footer)')
st, d = req('POST', '/items/navigation', [
    {'id': 'main', 'title': 'Main Navigation', 'is_active': True},
    {'id': 'footer', 'title': 'Footer Navigation', 'is_active': True},
])
print(f'   -> {st} created {len(d["data"])} nav sets')

print('3. navigation items')
main_items = [
    {'navigation': 'main', 'sort': 1, 'title': 'Home', 'type': 'url', 'url': '/'},
    {'navigation': 'main', 'sort': 2, 'title': 'Dealers', 'type': 'url', 'url': '/dealers'},
    {'navigation': 'main', 'sort': 3, 'title': 'About', 'type': 'url', 'url': '/about'},
    {'navigation': 'main', 'sort': 4, 'title': 'Contact', 'type': 'url', 'url': '/contact'},
]
footer_items = [
    {'navigation': 'footer', 'sort': 1, 'title': 'Home', 'type': 'url', 'url': '/'},
    {'navigation': 'footer', 'sort': 2, 'title': 'Dealers', 'type': 'url', 'url': '/dealers'},
    {'navigation': 'footer', 'sort': 3, 'title': 'About', 'type': 'url', 'url': '/about'},
    {'navigation': 'footer', 'sort': 4, 'title': 'Contact', 'type': 'url', 'url': '/contact'},
]
st, d = req('POST', '/items/navigation_items', main_items + footer_items)
print(f'   -> {st} created {len(d["data"])} items')

# --- 4. hero + buttons ---------------------------------------------------
print('4. button group + buttons')
st, d = req('POST', '/items/block_button_group', [{'sort': 1}])
bg_id = d['data'][0]['id']
st, d = req('POST', '/items/block_button', [
    {'button_group': bg_id, 'sort': 1, 'label': 'Visit a Dealer', 'type': 'url', 'url': '/dealers', 'variant': 'solid'},
    {'button_group': bg_id, 'sort': 2, 'label': 'Contact Us', 'type': 'url', 'url': '/contact', 'variant': 'outline'},
])
print(f'   -> {st} group {bg_id[:8]}.. + {len(d["data"])} buttons')

print('5. block_hero (home)')
st, d = req('POST', '/items/block_hero', [{
    'tagline': '2026 Lineup',
    'headline': 'Mitsubishi 2026 — Built for Trinidad & Tobago',
    'description': ('From the 7-seat Outlander and L200 4x4 to the versatile Xpander, explore the '
                    'complete 2026 Mitsubishi lineup at ANSA Mitsubishi — with factory warranty, '
                    'genuine parts, and service in Port of Spain, San Fernando, and Chaguanas.'),
    'layout': 'image_center',
    'button_group': bg_id,
}])
hero_id = d['data'][0]['id']
print(f'   -> {st} hero {hero_id[:8]}..')

print('6. block_richtext (home + 3 pages)')
rt_payloads = [
    {
        'tagline': 'The Lineup',
        'headline': 'Five Models. Every Kind of Drive.',
        'alignment': 'center',
        'content': ('<p><strong>Outlander</strong> — the next-generation 7-seater SUV with Super All-Wheel Control. '
                    '<strong>Eclipse Cross</strong> — the turbocharged coupe SUV built to turn heads. '
                    '<strong>L200</strong> — the tough, capable 4x4 double-cab pickup. '
                    '<strong>ASX</strong> — compact agility for the urban adventurer. '
                    '<strong>Xpander</strong> — the high-riding 7-seat family crossover.</p>'
                    '<p>Every 2026 model comes with Mitsubishi&#39;s 5-Year / 100,000 km manufacturer warranty '
                    'and full ANSA service support nationwide.</p>'),
    },
    {
        'tagline': 'Find Us',
        'headline': 'Our Dealers',
        'alignment': 'center',
        'content': ('<p>ANSA Mitsubishi is represented at three ANSA Motors locations:</p>'
                    '<p><strong>Port of Spain (Headquarters)</strong> — Corner Richmond &amp; Duke Streets, '
                    'phone +1 (868) 625-7231. Showroom sales, full service, genuine parts, fleet solutions, '
                    'financing &amp; insurance. Mon–Fri 8:00–4:30, Sat 8:30–12:30.</p>'
                    '<p><strong>San Fernando</strong> — Royal Road, phone +1 (868) 657-8271. Service bays, '
                    'parts, express maintenance, and a test-drive centre. Mon–Fri 8:00–4:30, Sat 8:30–12:30.</p>'
                    '<p><strong>Chaguanas</strong> — Brentwood Commercial Center, phone +1 (868) 665-5321. '
                    'Showroom &amp; test drives, quick-service bay, parts pickup, and financing consultation. '
                    'Mon–Fri 8:00–4:30, Sat 8:30–12:30.</p>'),
    },
    {
        'tagline': 'Who We Are',
        'headline': 'About ANSA Mitsubishi',
        'alignment': 'center',
        'content': ('<p>As the authorised distributor of Mitsubishi in Trinidad and Tobago, ANSA Mitsubishi '
                    'pairs Japanese engineering with local expertise. Our teams sell, service, and support '
                    'every Mitsubishi model with genuine parts, factory-trained technicians, and financing '
                    'options that fit.</p>'
                    '<p>The 2026 lineup spans SUVs, crossovers, and pickups — each backed by a '
                    '5-Year / 100,000 km manufacturer warranty.</p>'),
    },
    {
        'tagline': 'Get in Touch',
        'headline': 'Contact Us',
        'alignment': 'center',
        'content': ('<p><strong>Port of Spain (Headquarters)</strong> — Corner Richmond &amp; Duke Streets — '
                    '+1 (868) 625-7231 / +1 (868) 625-2672 — mitsubishi.pos@ansamcl.com</p>'
                    '<p><strong>San Fernando</strong> — Royal Road — +1 (868) 657-8271 / +1 (868) 657-7231 — '
                    'mitsubishi.south@ansamcl.com</p>'
                    '<p><strong>Chaguanas</strong> — Brentwood Commercial Center — +1 (868) 665-5321 / '
                    '+1 (868) 671-2672 — mitsubishi.central@ansamcl.com</p>'
                    '<p>Hours: Monday–Friday 8:00 AM – 4:30 PM, Saturday 8:30 AM – 12:30 PM, Sunday closed.</p>'),
    },
]
rt_ids = []
for i, payload in enumerate(rt_payloads):
    st, d = req('POST', '/items/block_richtext', [payload])
    rt_ids.append(d['data'][0]['id'])
    print(f'   -> richtext {i+1}: {st} {rt_ids[-1][:8]}..')

# --- 7. pages ------------------------------------------------------------
print('7. pages')
pages = [
    {'title': 'Home', 'permalink': '/', 'sort': 0, 'status': 'published', 'published_at': now,
     'seo': {'title': 'ANSA Mitsubishi — 2026 Lineup', 'meta_description': 'Explore the 2026 Mitsubishi lineup at ANSA Mitsubishi, Trinidad & Tobago\u2019s authorised dealer.', 'og_image': None}},
    {'title': 'Dealers', 'permalink': '/dealers', 'sort': 1, 'status': 'published', 'published_at': now,
     'seo': {'title': 'Dealers', 'meta_description': 'Find your nearest ANSA Mitsubishi dealer in Port of Spain, San Fernando, or Chaguanas.', 'og_image': None}},
    {'title': 'About', 'permalink': '/about', 'sort': 2, 'status': 'published', 'published_at': now,
     'seo': {'title': 'About', 'meta_description': 'ANSA Mitsubishi — the authorised Mitsubishi distributor in Trinidad and Tobago.', 'og_image': None}},
    {'title': 'Contact', 'permalink': '/contact', 'sort': 3, 'status': 'published', 'published_at': now,
     'seo': {'title': 'Contact', 'meta_description': 'Contact ANSA Mitsubishi — phone, email, and dealership hours.', 'og_image': None}},
]
st, d = req('POST', '/items/pages', pages)
page_ids = [p['id'] for p in d['data']]
print(f'   -> {st} created {len(page_ids)} pages')

# --- 8. page_blocks -------------------------------------------------------
print('8. page_blocks')
blocks = [
    # home: hero + richtext
    {'page': page_ids[0], 'sort': 1, 'collection': 'block_hero', 'item': hero_id, 'background': 'light', 'hide_block': False},
    {'page': page_ids[0], 'sort': 2, 'collection': 'block_richtext', 'item': rt_ids[0], 'background': 'light', 'hide_block': False},
    # dealers / about / contact: richtext pages
    {'page': page_ids[1], 'sort': 1, 'collection': 'block_richtext', 'item': rt_ids[1], 'background': 'light', 'hide_block': False},
    {'page': page_ids[2], 'sort': 1, 'collection': 'block_richtext', 'item': rt_ids[2], 'background': 'light', 'hide_block': False},
    {'page': page_ids[3], 'sort': 1, 'collection': 'block_richtext', 'item': rt_ids[3], 'background': 'light', 'hide_block': False},
]
st, d = req('POST', '/items/page_blocks', blocks)
print(f'   -> {st} linked {len(d["data"])} blocks')

# --- 9. redirects ----------------------------------------------------------
print('9. redirects')
st, d = req('POST', '/items/redirects', [{'url_from': '/home', 'url_to': '/', 'response_code': '301'}])
print(f'   -> {st} redirect /home -> /')

print('DONE')

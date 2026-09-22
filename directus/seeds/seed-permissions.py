#!/usr/bin/env python3
"""(Re)create public read permissions for the frontend's collections.

Idempotent: patches existing rows, creates missing ones.

Field model (Directus 12): `fields` is a WHITELIST.
  - null = no fields allowed (silent stripping / 403)
  - ["*"] = all fields
  - explicit list = only those fields

`globals` holds secrets (openai_api_key, directus_url) -> strict whitelist.
Deliberately NOT public: ai_prompts, form_submissions, form_submission_values, website.
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

# explicit whitelists (safe by construction)
WHITELIST = {
    'vehicles': ['id', 'title', 'slug', 'tagline', 'hero_headline', 'starting_price',
                 'primary_color', 'brochure_url', 'status', 'model_year', 'category',
                 'body_type', 'seating_capacity', 'fuel_type', 'warranty', 'overview'],
    'vehicle_trims': ['id', 'vehicle', 'vehicle_id', 'vehicle_slug', 'trim_name',
                      'status', 'engine', 'transmission', 'drivetrain', 'price',
                      'key_features'],
    'dealers': ['id', 'name', 'slug', 'status', 'address', 'city', 'state_region',
                'postal_code', 'country', 'phone', 'secondary_phone', 'email',
                'is_headquarters', 'latitude', 'longitude', 'google_maps_url',
                'opening_hours', 'services'],
    'globals': ['id', 'title', 'url', 'logo', 'logo_dark_mode', 'favicon',
                'accent_color', 'tagline', 'description', 'social_links'],
}

# public marketing content -> all fields
FULL_READ = [
    'navigation', 'navigation_items', 'pages', 'page_blocks',
    'block_hero', 'block_richtext', 'block_button_group', 'block_button',
    'block_gallery', 'block_gallery_items', 'block_posts', 'block_pricing',
    'block_pricing_cards', 'block_form', 'block_content_block', 'block_content_block_files',
    'block_content_items', 'block_content_items_buttons', 'block_cta_simple',
    'block_cta_simple_buttons', 'block_hero_custom', 'block_hero_custom_files',
    'block_layout_wrapper', 'block_layout_wrapper_sections',
    'posts', 'redirects', 'forms', 'form_fields',
]


def req(method, path, body=None):
    r = urllib.request.Request(BASE + path,
        data=json.dumps(body).encode() if body is not None else None,
        headers={'Authorization': f'Bearer {TOKEN}', 'Content-Type': 'application/json'},
        method=method)
    try:
        with urllib.request.urlopen(r, timeout=60) as resp:
            out = resp.read().decode()
            return resp.status, (json.loads(out) if out else None)
    except urllib.error.HTTPError as e:
        return e.code, json.loads(e.read().decode() or '{}')


def main():
    st, d = req('GET', '/policies?fields=id,name')
    public_policy = next(p['id'] for p in d['data']
                         if p['name'] == '$t:public_label' or 'public' in (p['name'] or '').lower())
    print('public policy:', public_policy)

    st, d = req('GET', '/permissions?limit=-1')
    existing = {(p['collection'], p['action']): p['id']
                for p in d['data'] if p.get('id') is not None and not p.get('system')}

    created, patched, failed = 0, 0, []
    for coll, fields in list(WHITELIST.items()) + [(c, ['*']) for c in FULL_READ]:
        if (coll, 'read') in existing:
            st2, d2 = req('PATCH', f"/permissions/{existing[(coll, 'read')]}",
                          {'permissions': {}, 'validation': {}, 'fields': fields})
            patched += 1
            if st2 != 200:
                failed.append((coll, st2, str(d2)[:150]))
        else:
            st2, d2 = req('POST', '/permissions',
                          {'policy': public_policy, 'role': None, 'collection': coll,
                           'action': 'read', 'permissions': {}, 'validation': {},
                           'fields': fields})
            created += 1
            if st2 not in (200, 201):
                failed.append((coll, st2, str(d2)[:150]))

    print(f'permissions: {created} created, {patched} patched, {len(failed)} failed')
    for f in failed:
        print('  !!', f)


if __name__ == '__main__':
    main()

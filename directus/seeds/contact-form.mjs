#!/usr/bin/env node
/**
 * contact-form.mjs
 *
 * Seeds the default "Contact" form rendered by nuxt/app/pages/contact.vue:
 *   - forms row (title, active, submit label, on-success message)
 *   - 8 ordered form_fields (nested O2M create)
 *   - one confirmation email template in forms.emails, using `{# field #}`
 *     merge tags resolved by nuxt/server/utils/form-emails.ts
 *
 * Field-type notes (Directus form_fields.type has no email/phone choice):
 *   - email → `text` + `email` validation; phone → `text` named `phone`.
 *     BaseFormField.vue derives `type="email"` / `type="tel"` from these.
 *   - vehicle → `select` whose choices are the published `vehicles` rows
 *     (value = slug), so showroom links `/contact?vehicle=<slug>` pre-select it.
 *   - trim → free `text`, since trim names differ per vehicle.
 *
 * Idempotent: exits without changes if a form titled "Contact" exists.
 * Pass --force to delete the existing Contact form (and its fields) and reseed.
 *
 * Usage:  node directus/seeds/contact-form.mjs [--force]
 * Env:    DIRECTUS_TOKEN / DIRECTUS_URL (falls back to ADMIN_TOKEN in directus/.env)
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const FORCE = process.argv.includes('--force');
const FORM_TITLE = 'Contact';

function loadToken() {
	const envTok = process.env.DIRECTUS_TOKEN;
	if (envTok) return envTok;
	const envFile = path.join(HERE, '..', '.env');
	const m = fs.existsSync(envFile) && fs.readFileSync(envFile, 'utf8').match(/^ADMIN_TOKEN=(.*)$/m);
	if (!m) {
		console.error('ERROR: no token — set DIRECTUS_TOKEN or ADMIN_TOKEN in directus/.env');
		process.exit(1);
	}
	return m[1].trim();
}

const TOKEN = loadToken();
const BASE = process.env.DIRECTUS_URL || 'http://localhost:8055';

async function api(method, urlPath, body) {
	const res = await fetch(BASE + urlPath, {
		method,
		headers: { Authorization: `Bearer ${TOKEN}`, 'Content-Type': 'application/json' },
		body: body === undefined ? undefined : JSON.stringify(body),
	});
	const text = await res.text();
	if (!res.ok) {
		throw new Error(`${method} ${urlPath} → ${res.status} ${text.slice(0, 300)}`);
	}
	return text ? JSON.parse(text) : null;
}

// Reads use SEARCH (query in the body) rather than GET: this Directus instance
// served a stale cached GET result for the guard query, which let a rerun
// create a duplicate form. SEARCH responses are not served from that cache.
const search = (collection, query) => api('SEARCH', `/items/${collection}`, { query });

// --- idempotency guard ---------------------------------------------------
const existing = await search('forms', { filter: { title: { _eq: FORM_TITLE } }, fields: ['id', 'fields'], limit: -1 });

if (existing.data.length) {
	if (!FORCE) {
		console.log(`"${FORM_TITLE}" form already exists (${existing.data[0].id}); skipping. Use --force to reseed.`);
		process.exit(0);
	}
	for (const form of existing.data) {
		if (form.fields?.length) await api('DELETE', '/items/form_fields', form.fields);
		await api('DELETE', `/items/forms/${form.id}`);
		console.log(`removed existing form ${form.id}`);
	}
}

// --- vehicle choices -----------------------------------------------------
const vehicles = await search('vehicles', {
	filter: { status: { _eq: 'published' } },
	fields: ['slug', 'title'],
	sort: ['title'],
	limit: -1,
});
const vehicleChoices = vehicles.data.map((v) => ({ text: v.title, value: v.slug }));
console.log(`vehicle choices: ${vehicleChoices.map((c) => c.value).join(', ') || '(none)'}`);

// --- form ----------------------------------------------------------------
const fields = [
	{ name: 'first_name', type: 'text', label: 'First Name', required: true, width: '50', validation: 'max:100', placeholder: 'John' },
	{ name: 'last_name', type: 'text', label: 'Last Name', required: true, width: '50', validation: 'max:100', placeholder: 'Doe' },
	{ name: 'email', type: 'text', label: 'Email Address', required: true, width: '50', validation: 'email|max:255', placeholder: 'you@example.com' },
	{ name: 'phone', type: 'text', label: 'Phone Number', required: true, width: '50', validation: 'min:7|max:20', placeholder: '+1 (868) 000-0000' },
	{
		name: 'inquiry_type',
		type: 'select',
		label: 'Inquiry Type',
		required: true,
		width: '100',
		placeholder: 'Select an inquiry type',
		choices: [
			{ text: 'Contact Sales', value: 'sales' },
			{ text: 'Visit a Dealer / Test Drive', value: 'dealer' },
		],
	},
	{
		name: 'vehicle',
		type: 'select',
		label: 'Vehicle of Interest',
		required: false,
		width: '50',
		placeholder: 'Select a vehicle',
		choices: vehicleChoices,
	},
	{ name: 'trim', type: 'text', label: 'Preferred Trim', required: false, width: '50', validation: 'max:100', placeholder: 'e.g. GLS' },
	{ name: 'message', type: 'textarea', label: 'Comments or Questions', required: false, width: '100', validation: 'max:2000' },
].map((field, i) => ({ ...field, sort: i + 1 }));

const created = await api('POST', '/items/forms?fields=id,title,fields.name', {
	title: FORM_TITLE,
	is_active: true,
	submit_label: 'SUBMIT INQUIRY',
	on_success: 'message',
	success_message: 'Thank you! A sales representative from ANSA Motors will contact you shortly.',
	emails: [
		{
			to: ['{# email #}'],
			subject: 'Thank you for contacting ANSA Motors - {# vehicle #}',
			message:
				'<p>Hi {# first_name #},</p><p>Thank you for inquiring about the <strong>{# vehicle #} ({# trim #})</strong>. Our team will review your request for <em>{# inquiry_type #}</em> and get back to you shortly.</p>',
		},
	],
	fields,
});

console.log(`created form ${created.data.id} with fields: ${created.data.fields.map((f) => f.name).join(', ')}`);

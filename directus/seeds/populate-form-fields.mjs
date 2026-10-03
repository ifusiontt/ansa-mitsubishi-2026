#!/usr/bin/env node
/**
 * populate-form-fields.mjs
 *
 * Links form_fields rows to the "Service Booking" and "Parts Request" forms
 * (created by parts-service-forms.mjs) so editors see each form's structure in
 * /admin/content/forms. The Vue components (ServiceBookingForm.vue,
 * PartsRequestForm.vue) and nuxt/shared/types/contact.ts remain the source of
 * truth for rendering and validation; field `name`s match the
 * form_submissions.metadata keys, and choices mirror contact.ts.
 *
 * Field-type notes (form_fields.type has no email/phone/number/date choice):
 * email/phone/mileage/year/date are `text` with a validation rule or help text,
 * following contact-form.mjs.
 *
 * Idempotent: a form that already has fields is skipped. Pass --force to
 * delete those forms' fields and reseed them.
 *
 * Usage:  node directus/seeds/populate-form-fields.mjs [--force]
 * Env:    DIRECTUS_TOKEN / DIRECTUS_URL (falls back to ADMIN_TOKEN in directus/.env)
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const FORCE = process.argv.includes('--force');

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
	if (!res.ok) throw new Error(`${method} ${urlPath} → ${res.status} ${text.slice(0, 300)}`);
	return text ? JSON.parse(text) : null;
}

const search = (collection, query) => api('SEARCH', `/items/${collection}`, { query });

// Mirrors DEALER_OPTIONS / VEHICLE_MODEL_OPTIONS / SERVICE_TYPE_OPTIONS in nuxt/shared/types/contact.ts.
const toChoices = (labels) => labels.map((label) => ({ text: label, value: label }));
const DEALERS = [
	{ text: 'Port of Spain', value: 'port-of-spain' },
	{ text: 'San Fernando', value: 'san-fernando' },
	{ text: 'Chaguanas', value: 'chaguanas' },
	{ text: 'Tobago', value: 'tobago' },
];
const VEHICLES = toChoices(['Outlander Sport', 'Triton', 'Xpander Cross', 'Xpander']);
const SERVICE_TYPES = toChoices([
	'Scheduled Maintenance',
	'Oil & Filter Change',
	'Brake Service',
	'Diagnostics / Check Engine Light',
	'Warranty Repair',
	'Air Conditioning',
	'Tyres & Alignment',
	'Other',
]);

const CONTACT = [
	{ name: 'first_name', type: 'text', label: 'First Name', required: true, width: '50', validation: 'max:100' },
	{ name: 'last_name', type: 'text', label: 'Last Name', required: true, width: '50', validation: 'max:100' },
	{ name: 'phone', type: 'text', label: 'Phone', required: true, width: '50', validation: 'min:7|max:20', placeholder: '+1 (868) 000-0000' },
	{ name: 'email', type: 'text', label: 'Email', required: true, width: '50', validation: 'email|max:255', placeholder: 'you@example.com' },
];
const vehicleModel = { name: 'vehicle_model', type: 'select', label: 'Vehicle Model', required: true, width: '50', placeholder: 'Select your vehicle', choices: VEHICLES };
const registration = { name: 'registration_number', type: 'text', label: 'Registration Number', required: true, width: '50', validation: 'min:2|max:12', placeholder: 'e.g. PDQ 1234' };
const dealer = { name: 'dealer_id', type: 'select', label: 'Nearest Dealer', required: true, width: '100', placeholder: 'Select a branch', choices: DEALERS };

const FORM_FIELDS = {
	'Service Booking': [
		...CONTACT,
		{ name: 'service_type', type: 'select', label: 'Service Type', required: true, width: '50', placeholder: 'Select a service', choices: SERVICE_TYPES },
		vehicleModel,
		registration,
		{ name: 'vehicle_mileage', type: 'text', label: 'Vehicle Mileage', required: true, width: '50', validation: 'max:7', placeholder: 'e.g. 45000', help: 'Current odometer reading in km.' },
		{ name: 'request_date', type: 'text', label: 'Preferred Date', required: true, width: '50', validation: 'length:10', help: 'YYYY-MM-DD, today or later.' },
		dealer,
	],
	'Parts Request': [
		...CONTACT,
		vehicleModel,
		registration,
		{ name: 'vehicle_year', type: 'text', label: 'Vehicle Year', required: true, width: '50', validation: 'length:4', placeholder: 'e.g. 2024' },
		{ name: 'chassis_number', type: 'text', label: 'Chassis Number / VIN', required: true, width: '50', validation: 'min:6|max:20', help: 'Found on your registration or the driver-side door pillar.' },
		{ name: 'part_number', type: 'text', label: 'Part Number', required: false, width: '100', validation: 'max:40', placeholder: 'If known, e.g. MZ690070' },
		{ name: 'part_description', type: 'textarea', label: 'Part Description', required: true, width: '100', validation: 'min:5|max:1000', placeholder: 'e.g. Front brake pads and rotors' },
		dealer,
	],
};

for (const [title, fields] of Object.entries(FORM_FIELDS)) {
	const forms = await search('forms', { filter: { title: { _eq: title } }, fields: ['id', 'fields'], limit: 1 });
	const form = forms.data[0];
	if (!form) {
		console.log(`"${title}" form missing (run parts-service-forms.mjs first); skipping`);
		continue;
	}
	if (form.fields?.length) {
		if (!FORCE) {
			console.log(`"${title}" already has ${form.fields.length} fields; skipping. Use --force to reseed.`);
			continue;
		}
		await api('DELETE', '/items/form_fields', form.fields);
		console.log(`"${title}": removed ${form.fields.length} existing fields`);
	}
	const created = await api(
		'POST',
		'/items/form_fields?fields=name',
		fields.map((field, i) => ({ ...field, form: form.id, sort: i + 1 })),
	);
	console.log(`"${title}": linked ${created.data.length} fields (${created.data.map((f) => f.name).join(', ')})`);
}

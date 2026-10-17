#!/usr/bin/env node
/**
 * parts-service-forms.mjs
 *
 * Schema + content for the /service, /parts, homepage test-drive and showroom financing inquiry flows
 * (nuxt/app/components/forms/ServiceBookingForm.vue, PartsRequestForm.vue,
 * nuxt/app/components/home/HomeContactBanner.vue, nuxt/app/components/shared/BookTestDriveModal.vue):
 *
 *   1. form_submissions gains two fields:
 *        - submission_type  (string dropdown: contact | service | parts | test_drive | financing_inquiry)
 *        - metadata         (json) — the structured request: contact details plus
 *          service_type, vehicle_model, registration_number, vehicle_mileage,
 *          vehicle_year, chassis_number, part_number, part_description,
 *          request_date, dealer_id, trim and the financing estimate fields
 *          (see nuxt/shared/types/contact.ts)
 *   2. forms rows "Service Booking", "Parts Request", "Test Drive Request" and
 *      "Financing Pre-Approval" (no
 *      form_fields — the Vue components own their fields) so submissions are grouped
 *      per form. Service/parts carry a `{# field #}` confirmation email template; the
 *      test-drive request collects no email address, so it has none; financing confirms the estimate.
 *   3. Public policy: create-only on form_submissions, limited to
 *      form / submission_type / metadata and validated to the inquiry types above.
 *      No public read — seed-permissions.py still keeps submissions private.
 *   4. Left-column rich-text blocks appended to the /service and /parts pages
 *      (created by sync-nav-service-parts.py); matched by headline, never overwritten.
 *
 * Idempotent: every step checks for existing rows/fields first.
 *
 * Usage:  node directus/seeds/parts-service-forms.mjs
 * Env:    DIRECTUS_TOKEN / DIRECTUS_URL (falls back to ADMIN_TOKEN in directus/.env)
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));

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

async function api(method, urlPath, body, { allow404 = false } = {}) {
	const res = await fetch(BASE + urlPath, {
		method,
		headers: { Authorization: `Bearer ${TOKEN}`, 'Content-Type': 'application/json' },
		body: body === undefined ? undefined : JSON.stringify(body),
	});
	const text = await res.text();
	if (allow404 && (res.status === 404 || res.status === 403)) return null;
	if (!res.ok) {
		throw new Error(`${method} ${urlPath} → ${res.status} ${text.slice(0, 300)}`);
	}
	return text ? JSON.parse(text) : null;
}

// SEARCH (query in the body) sidesteps the stale GET cache noted in contact-form.mjs.
const search = (collection, query) => api('SEARCH', `/items/${collection}`, { query });

// --- 1. form_submissions fields ------------------------------------------
const FIELDS = [
	{
		field: 'submission_type',
		type: 'string',
		meta: {
			interface: 'select-dropdown',
			display: 'labels',
			width: 'half',
			note: 'Which inquiry flow produced this submission.',
			options: {
				choices: [
					{ text: 'Contact', value: 'contact' },
					{ text: 'Service Booking', value: 'service' },
					{ text: 'Parts Request', value: 'parts' },
					{ text: 'Test Drive Request', value: 'test_drive' },
					{ text: 'Financing Pre-Approval', value: 'financing_inquiry' },
				],
			},
		},
		schema: { is_nullable: true, max_length: 32 },
	},
	{
		field: 'metadata',
		type: 'json',
		meta: {
			interface: 'input-code',
			options: { language: 'json' },
			special: ['cast-json'],
			width: 'full',
			note: 'Structured request details (vehicle, service/part, dealer, contact).',
		},
		schema: { is_nullable: true },
	},
];

console.log('1. form_submissions fields');
for (const def of FIELDS) {
	const existing = await api('GET', `/fields/form_submissions/${def.field}`, undefined, { allow404: true });
	if (existing?.data) {
		// Keep dropdown choices current (e.g. test_drive added after the field was first created).
		const choices = def.meta.options?.choices;
		if (choices && JSON.stringify(existing.data.meta?.options?.choices) !== JSON.stringify(choices)) {
			await api('PATCH', `/fields/form_submissions/${def.field}`, {
				meta: { options: { ...existing.data.meta?.options, choices } },
			});
			console.log(`   -> ${def.field} exists; choices updated`);
		} else {
			console.log(`   -> ${def.field} exists; skipping`);
		}
		continue;
	}
	await api('POST', '/fields/form_submissions', def);
	console.log(`   -> ${def.field} created (${def.type})`);
}

// --- 2. forms ------------------------------------------------------------
const FORMS = [
	{
		title: 'Service Booking',
		submit_label: 'REQUEST SERVICE BOOKING',
		success_message: 'Thank you! Our service team will contact you to confirm your booking.',
		emails: [
			{
				to: ['{# email #}'],
				subject: 'Your ANSA Motors service request - {# vehicle_model #}',
				message:
					'<p>Hi {# first_name #},</p><p>We received your <strong>{# service_type #}</strong> request for your <strong>{# vehicle_model #}</strong> ({# registration_number #}) on <strong>{# request_date #}</strong> at our {# dealer #} branch. Our service team will contact you to confirm the appointment.</p>',
			},
		],
	},
	{
		title: 'Parts Request',
		submit_label: 'REQUEST PARTS QUOTE',
		success_message: 'Thank you! Our parts team will contact you with availability and pricing.',
		emails: [
			{
				to: ['{# email #}'],
				subject: 'Your ANSA Motors parts request - {# vehicle_model #}',
				message:
					'<p>Hi {# first_name #},</p><p>We received your genuine parts request for your <strong>{# vehicle_year #} {# vehicle_model #}</strong>:</p><p><em>{# part_description #}</em></p><p>Our {# dealer #} parts counter will contact you with availability and pricing.</p>',
			},
		],
	},
	{
		title: 'Test Drive Request',
		submit_label: 'REQUEST TEST DRIVE',
		success_message: 'Thank you! A sales consultant will call you to arrange your test drive.',
		emails: [],
	},
	{
		title: 'Financing Pre-Approval',
		submit_label: 'REQUEST FINANCING PRE-APPROVAL',
		success_message: 'Thank you! A finance specialist will contact you about pre-approval.',
		emails: [
			{
				to: ['{# email #}'],
				subject: 'Your ANSA Motors financing request - {# vehicle_model #}',
				message:
					'<p>Hi {# first_name #},</p><p>We received your pre-approval request for the <strong>{# vehicle_model #} {# trim #}</strong>: an estimated <strong>TTD ${# monthly_payment #}/month</strong> over {# term_months #} months with a {# deposit_percent #}% deposit at {# interest_rate #}% APR. A finance specialist from our {# dealer #} branch will contact you to review your application.</p><p><em>This is an estimate only; final terms are subject to the lender\'s credit assessment.</em></p>',
			},
		],
	},
];

console.log('2. forms');
for (const form of FORMS) {
	const existing = await search('forms', { filter: { title: { _eq: form.title } }, fields: ['id'], limit: 1 });
	if (existing.data.length) {
		console.log(`   -> "${form.title}" exists (${existing.data[0].id}); skipping`);
		continue;
	}
	const created = await api('POST', '/items/forms?fields=id', { ...form, is_active: true, on_success: 'message' });
	console.log(`   -> "${form.title}" created (${created.data.id})`);
}

// --- 3. public create permission -----------------------------------------
console.log('3. public create permission on form_submissions');
const policies = await api('GET', '/policies?fields=id,name&limit=-1');
const publicPolicy = policies.data.find(
	(p) => p.name === '$t:public_label' || (p.name ?? '').toLowerCase().includes('public'),
)?.id;
if (!publicPolicy) throw new Error('public policy not found');

const permission = {
	fields: ['form', 'submission_type', 'metadata'],
	permissions: {},
	validation: { _and: [{ submission_type: { _in: ['service', 'parts', 'test_drive', 'financing_inquiry'] } }] },
	presets: {},
};
const existingPerm = await api(
	'GET',
	`/permissions?filter[policy][_eq]=${publicPolicy}&filter[collection][_eq]=form_submissions&filter[action][_eq]=create&fields=id&limit=1`,
);
if (existingPerm.data.length) {
	await api('PATCH', `/permissions/${existingPerm.data[0].id}`, permission);
	console.log(`   -> patched permission ${existingPerm.data[0].id}`);
} else {
	const created = await api('POST', '/permissions', {
		...permission,
		policy: publicPolicy,
		collection: 'form_submissions',
		action: 'create',
	});
	console.log(`   -> created permission ${created.data.id}`);
}

// --- 4. page content blocks ----------------------------------------------
const CONTENT = {
	'/service': [
		{
			tagline: 'Factory Diagnostics',
			headline: 'Mitsubishi Diagnostic Systems',
			content:
				'<p>Every service bay is equipped with Mitsubishi factory diagnostic tooling, so our technicians read the same fault codes, live sensor data and software calibrations the engineers in Japan do.</p><ul><li>Full electronic health check on every visit</li><li>ECU, transmission and safety-system software updates</li><li>Accurate first-time fault finding — no guesswork, no unnecessary parts</li></ul>',
		},
		{
			tagline: 'OEM Warranty',
			headline: 'Your Factory Warranty, Protected',
			content:
				'<p>Servicing with ANSA Motors keeps your Mitsubishi factory warranty intact. Work is carried out by factory-trained technicians using genuine parts and approved fluids, and every visit is recorded against your vehicle’s service history.</p><ul><li>Warranty repairs handled in-house</li><li>Recall and campaign work completed at no cost</li><li>Stamped service records that support resale value</li></ul>',
		},
		{
			tagline: 'Maintenance Schedules',
			headline: 'Service at Factory Intervals',
			content:
				'<p>Follow the maintenance schedule in your owner’s service booklet and we will take care of the rest — oil and filter changes, brake and suspension inspections, coolant, transmission and differential fluids, belts, and tyre rotation.</p><p>Not sure what is due? Enter your current mileage in the booking form and our service advisors will confirm the right service for your vehicle.</p>',
		},
	],
	'/parts': [
		{
			tagline: 'Genuine OEM Parts',
			headline: 'Engineered for Your Mitsubishi',
			content:
				'<p>Genuine Mitsubishi parts are built to the exact specification your vehicle left the factory with — the right fit, the right materials, and the performance and safety they were tested for.</p><ul><li>Filters, brakes, suspension and engine components</li><li>Body panels, lighting and glass</li><li>Genuine accessories for the Triton, Outlander Sport, Xpander and Xpander Cross</li></ul>',
		},
		{
			tagline: 'Parts Warehouse',
			headline: 'Stocked Across Our Branch Network',
			content:
				'<p>Our parts warehouse and branch counters hold fast-moving service parts for the current lineup. Anything not on the shelf is ordered directly through Mitsubishi’s factory supply chain.</p><p>Send us your chassis number (VIN) with your request and we will confirm the exact part, availability and price before you make the trip.</p>',
		},
		{
			tagline: 'Warranty-Backed',
			headline: 'Parts You Can Count On',
			content:
				'<p>Genuine parts supplied and fitted by ANSA Motors are covered by the Mitsubishi parts warranty and will not affect your vehicle’s factory warranty.</p>',
		},
	],
};

console.log('4. page content blocks');
for (const [permalink, blocks] of Object.entries(CONTENT)) {
	const pages = await search('pages', { filter: { permalink: { _eq: permalink } }, fields: ['id'], limit: 1 });
	const pageId = pages.data[0]?.id;
	if (!pageId) {
		console.log(`   -> ${permalink} page missing (run sync-nav-service-parts.py first); skipping`);
		continue;
	}
	const attached = await search('page_blocks', {
		filter: { page: { _eq: pageId } },
		fields: ['sort', 'collection', 'item'],
		limit: -1,
	});
	const richtextIds = attached.data.filter((b) => b.collection === 'block_richtext').map((b) => b.item);
	const existingHeadlines = new Set(
		richtextIds.length
			? (
					await search('block_richtext', { filter: { id: { _in: richtextIds } }, fields: ['headline'], limit: -1 })
				).data.map((b) => b.headline)
			: [],
	);
	let sort = Math.max(0, ...attached.data.map((b) => b.sort ?? 0));

	for (const block of blocks) {
		if (existingHeadlines.has(block.headline)) {
			console.log(`   -> ${permalink}: "${block.headline}" exists; skipping`);
			continue;
		}
		const rt = await api('POST', '/items/block_richtext?fields=id', { ...block, alignment: 'left' });
		await api('POST', '/items/page_blocks', {
			page: pageId,
			sort: ++sort,
			collection: 'block_richtext',
			item: rt.data.id,
			background: 'dark',
			hide_block: false,
		});
		console.log(`   -> ${permalink}: "${block.headline}" added`);
	}
}

console.log('DONE');

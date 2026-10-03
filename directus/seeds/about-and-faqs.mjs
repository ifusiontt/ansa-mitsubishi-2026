#!/usr/bin/env node
/**
 * about-and-faqs.mjs
 *
 * Content for nuxt/app/pages/about/index.vue (About Us + FAQ tabs):
 *
 *   1. `faqs` collection — id, sort, question, answer (HTML), category, is_published.
 *      Missing fields are added if the collection already exists.
 *   2. Public read on `faqs` (field whitelist; /api/faqs filters is_published).
 *      seed-permissions.py lists the same whitelist, so a permissions reseed keeps it.
 *   3. Initial ANSA Motors T&T FAQs — warranty, spare parts, service booking,
 *      financing. Create-only, matched by `question`, so CMS edits are never overwritten.
 *   4. "About ANSA Motors T&T" rich-text sections on the /about page. Matched by
 *      headline; the untouched starter block from seed-starter-content.py is
 *      upgraded in place rather than duplicated. Edited blocks are left alone.
 *
 * Idempotent: every step checks current state first.
 *
 * Usage:  node directus/seeds/about-and-faqs.mjs
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

async function api(method, urlPath, body, { allowMissing = false } = {}) {
	const res = await fetch(BASE + urlPath, {
		method,
		headers: { Authorization: `Bearer ${TOKEN}`, 'Content-Type': 'application/json' },
		body: body === undefined ? undefined : JSON.stringify(body),
	});
	// Directus answers 403 (not 404) for a collection/field that does not exist.
	if (allowMissing && (res.status === 404 || res.status === 403)) return null;
	const text = await res.text();
	if (!res.ok) throw new Error(`${method} ${urlPath} → ${res.status} ${text.slice(0, 300)}`);
	return text ? JSON.parse(text) : null;
}

// SEARCH (query in the body) bypasses the stale GET cache seen on this instance (see contact-form.mjs).
const search = (collection, query) => api('SEARCH', `/items/${collection}`, { query });

// --- 1. faqs collection -----------------------------------------------------
const CATEGORY_CHOICES = [
	{ text: 'Warranty', value: 'warranty' },
	{ text: 'Spare Parts', value: 'parts' },
	{ text: 'Service', value: 'service' },
	{ text: 'Financing', value: 'financing' },
	{ text: 'General', value: 'general' },
];

const FAQ_FIELDS = [
	{
		field: 'id',
		type: 'integer',
		meta: { hidden: true, readonly: true, interface: 'input' },
		schema: { is_primary_key: true, has_auto_increment: true },
	},
	{
		field: 'sort',
		type: 'integer',
		meta: { hidden: true, interface: 'input' },
		schema: { is_nullable: true },
	},
	{
		field: 'question',
		type: 'string',
		meta: { interface: 'input', required: true, width: 'full', sort: 1 },
		schema: { is_nullable: false },
	},
	{
		field: 'answer',
		type: 'text',
		meta: { interface: 'input-rich-text-html', required: true, width: 'full', sort: 2 },
		schema: { is_nullable: false },
	},
	{
		field: 'category',
		type: 'string',
		meta: {
			interface: 'select-dropdown',
			options: { choices: CATEGORY_CHOICES },
			display: 'labels',
			width: 'half',
			sort: 3,
			note: 'Groups the question on the FAQ tab.',
		},
		schema: { is_nullable: false, default_value: 'general' },
	},
	{
		field: 'is_published',
		type: 'boolean',
		meta: { interface: 'boolean', special: ['cast-boolean'], width: 'half', sort: 4, note: 'Unpublished questions are hidden from the website.' },
		schema: { is_nullable: false, default_value: true },
	},
];

if (await api('GET', '/collections/faqs', undefined, { allowMissing: true })) {
	const { data: existingFields } = await api('GET', '/fields/faqs');
	const have = new Set(existingFields.map((f) => f.field));
	for (const field of FAQ_FIELDS) {
		if (have.has(field.field)) continue;
		await api('POST', '/fields/faqs', field);
		console.log(`+ faqs.${field.field} field created`);
	}
	console.log('= faqs collection exists');
} else {
	await api('POST', '/collections', {
		collection: 'faqs',
		meta: {
			icon: 'quiz',
			note: 'Frequently asked questions — /about (FAQ tab)',
			display_template: '{{question}}',
			sort_field: 'sort',
		},
		schema: {},
		fields: FAQ_FIELDS,
	});
	console.log('+ faqs collection created');
}

// --- 2. public read ---------------------------------------------------------
const PUBLIC_FAQ_FIELDS = ['id', 'sort', 'question', 'answer', 'category', 'is_published'];

const { data: policies } = await api('GET', '/policies?fields=id,name&limit=-1');
const publicPolicy = policies.find((p) => p.name === '$t:public_label' || /public/i.test(p.name ?? ''));
if (!publicPolicy) throw new Error('public policy not found');

const { data: perms } = await api('SEARCH', '/permissions', {
	query: {
		filter: { policy: { _eq: publicPolicy.id }, collection: { _eq: 'faqs' }, action: { _eq: 'read' } },
		fields: ['id', 'fields'],
		limit: 1,
	},
});

if (perms[0]) {
	const granted = perms[0].fields ?? [];
	const missing = PUBLIC_FAQ_FIELDS.filter((f) => !granted.includes(f));
	if (granted.includes('*') || !missing.length) {
		console.log('= public read on faqs already granted');
	} else {
		await api('PATCH', `/permissions/${perms[0].id}`, { fields: [...granted, ...missing] });
		console.log(`+ public read on faqs extended with ${missing.join(', ')}`);
	}
} else {
	await api('POST', '/permissions', {
		policy: publicPolicy.id,
		collection: 'faqs',
		action: 'read',
		permissions: {},
		validation: {},
		fields: PUBLIC_FAQ_FIELDS,
	});
	console.log('+ public read on faqs granted');
}

// --- 3. FAQ rows ------------------------------------------------------------
const HQ_PHONE = '+1 (868) 625-7231';

const FAQS = [
	{
		category: 'warranty',
		question: 'What does the Mitsubishi manufacturer warranty cover?',
		answer:
			'<p>Every new Mitsubishi sold by ANSA Motors in Trinidad and Tobago carries a <strong>5-Year / 100,000 km manufacturer warranty</strong> (whichever comes first) covering defects in materials and factory workmanship.</p><p>Wear items such as tyres, brake pads, wiper blades and filters, and damage from accidents or misuse, are not covered.</p>',
	},
	{
		category: 'warranty',
		question: 'Do I have to service my vehicle at ANSA Motors to keep the warranty?',
		answer:
			'<p>To keep your warranty valid, scheduled maintenance must be carried out at the factory intervals in your service booklet, using genuine Mitsubishi parts and approved fluids. Servicing at an ANSA Motors service centre ensures every visit is recorded against your VIN.</p>',
	},
	{
		category: 'parts',
		question: 'Where can I buy genuine Mitsubishi spare parts?',
		answer:
			'<p>Each ANSA Motors branch has a genuine Mitsubishi parts counter: Port of Spain, San Fernando, Chaguanas and Tobago. Counters are open Monday–Friday 8:00 AM – 4:30 PM and Saturday 8:30 AM – 12:30 PM (Tobago: weekdays 8:00 AM – 4:00 PM).</p>',
	},
	{
		category: 'parts',
		question: 'How do I check whether a part is in stock?',
		answer: `<p>Call the parts counter on <a href="tel:+18686257231">${HQ_PHONE}</a> with your vehicle's <strong>VIN</strong> (found on your registration or at the base of the windscreen). The team can confirm the exact part number, price and availability, or place a special order for parts that are not in stock.</p>`,
	},
	{
		category: 'service',
		question: 'How do I book a service appointment?',
		answer:
			'<p>Call your nearest ANSA Motors service centre or send a request through our <a href="/contact">contact form</a> with your vehicle model, mileage and the work you need. We will confirm a date and an estimated completion time.</p>',
	},
	{
		category: 'service',
		question: 'How often should my Mitsubishi be serviced?',
		answer:
			'<p>Follow the maintenance schedule in your service booklet. Intervals are set by distance or time, whichever comes first, and vary by model. Our service advisors can tell you when your next service is due from your VIN and current mileage.</p>',
	},
	{
		category: 'financing',
		question: 'What financing options are available at ANSA Motors?',
		answer:
			'<p>Our Financing &amp; Insurance desk works with local banks and credit unions to arrange vehicle loans for your budget, and can arrange motor insurance in the same visit. Ask a sales consultant for a quote on the model and trim you are interested in.</p>',
	},
	{
		category: 'financing',
		question: 'Can I trade in my current vehicle?',
		answer:
			'<p>Yes. Bring your vehicle to any ANSA Motors showroom for a trade-in valuation. The agreed value can go towards the deposit on your new Mitsubishi.</p>',
	},
].map((faq, i) => ({ ...faq, sort: i + 1, is_published: true }));

const existingFaqs = await search('faqs', { fields: ['id', 'question'], limit: -1 });
const knownQuestions = new Set(existingFaqs.data.map((f) => f.question.trim().toLowerCase()));
const newFaqs = FAQS.filter((f) => !knownQuestions.has(f.question.trim().toLowerCase()));

if (newFaqs.length) {
	await api('POST', '/items/faqs', newFaqs);
	console.log(`+ ${newFaqs.length} FAQs created (${FAQS.length - newFaqs.length} already present)`);
} else {
	console.log(`= all ${FAQS.length} FAQs already present`);
}

// --- 4. About page rich-text sections ---------------------------------------
const STARTER_HEADLINE = 'About ANSA Mitsubishi';

const ABOUT_SECTIONS = [
	{
		tagline: 'Who We Are',
		headline: 'About ANSA Motors T&T',
		alignment: 'left',
		content:
			'<p>ANSA Motors is the authorised distributor of Mitsubishi Motors in Trinidad and Tobago and a member of the ANSA McAL Group. We bring Japanese engineering to local roads, backed by a team that sells, services and supports every Mitsubishi we put on them.</p><p>The 2026 lineup includes the Outlander Sport, the Triton pickup and the Xpander Cross. Every new vehicle carries a 5-Year / 100,000 km manufacturer warranty.</p>',
	},
	{
		tagline: 'What We Do',
		headline: 'Sales, Service & Genuine Parts',
		alignment: 'left',
		content:
			'<p><strong>Showroom sales</strong>: new vehicles, commercial fleet solutions, trade-in valuations, and an in-house Financing &amp; Insurance desk.</p><p><strong>Authorised service</strong>: factory-trained technicians using Mitsubishi diagnostic tools for scheduled maintenance, repairs and warranty work.</p><p><strong>Genuine parts</strong>: OEM parts and accessories, supplied and fitted with the Mitsubishi warranty.</p>',
	},
	{
		tagline: 'Our Network',
		headline: 'Across Trinidad & Tobago',
		alignment: 'left',
		content:
			'<p>Visit us in <strong>Port of Spain</strong> (headquarters, Corner Richmond &amp; Duke Streets), <strong>San Fernando</strong> (Royal Road), <strong>Chaguanas</strong> (Brentwood Commercial Center) and <strong>Tobago</strong> (Milford Road, Scarborough).</p><p>Find directions, phone numbers and opening hours on our <a href="/contact">contact page</a>.</p>',
	},
];

const { data: aboutPages } = await search('pages', {
	filter: { permalink: { _eq: '/about' } },
	fields: ['id', 'blocks.id', 'blocks.collection', 'blocks.item', 'blocks.sort'],
	limit: 1,
});
const aboutPage = aboutPages[0];

if (!aboutPage) {
	console.log('! /about page not found — run seed-starter-content.py first; skipping About sections');
} else {
	const richtextIds = aboutPage.blocks.filter((b) => b.collection === 'block_richtext').map((b) => b.item);
	const { data: richtexts } = richtextIds.length
		? await search('block_richtext', {
				filter: { id: { _in: richtextIds } },
				fields: ['id', 'headline', 'date_updated'],
				limit: -1,
			})
		: { data: [] };
	const headlines = new Set(richtexts.map((r) => r.headline));
	let nextSort = Math.max(0, ...aboutPage.blocks.map((b) => b.sort ?? 0)) + 1;

	for (const [i, section] of ABOUT_SECTIONS.entries()) {
		if (headlines.has(section.headline)) {
			console.log(`= About section "${section.headline}" exists`);
			continue;
		}

		// The starter block was never edited in the CMS → upgrade it in place.
		const starter = i === 0 && richtexts.find((r) => r.headline === STARTER_HEADLINE && !r.date_updated);
		if (starter) {
			await api('PATCH', `/items/block_richtext/${starter.id}`, section);
			console.log(`~ starter About block upgraded to "${section.headline}"`);
			continue;
		}

		const { data: created } = await api('POST', '/items/block_richtext?fields=id', section);
		await api('POST', '/items/page_blocks', {
			page: aboutPage.id,
			collection: 'block_richtext',
			item: created.id,
			sort: nextSort++,
			background: 'dark',
			hide_block: false,
		});
		console.log(`+ About section "${section.headline}" created`);
	}
}

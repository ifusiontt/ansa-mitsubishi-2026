/**
 * Service booking, parts request, test-drive and financing contracts, shared by the Vue forms
 * (components/forms/ServiceBookingForm.vue, PartsRequestForm.vue, home/HomeContactBanner.vue,
 * shared/BookTestDriveModal.vue) and
 * server/api/forms/parts-service.post.ts so both sides validate identically.
 *
 * Submissions land in Directus `form_submissions` with `submission_type` and a
 * JSON `metadata` object (InquiryMetadata). Schema: directus/seeds/parts-service-forms.mjs.
 */
import { z } from 'zod';

export type InquiryType = 'service' | 'parts' | 'test_drive' | 'financing_inquiry';

/** Directus `forms.title` each inquiry type is filed under. */
export const INQUIRY_FORM_TITLES: Record<InquiryType, string> = {
	service: 'Service Booking',
	parts: 'Parts Request',
	test_drive: 'Test Drive Request',
	financing_inquiry: 'Financing Pre-Approval',
};

/** Showroom financing estimator terms (months) and its fixed illustrative APR (%). */
export const FINANCE_TERMS = [36, 48, 60, 72, 84] as const;
export const FINANCE_APR = 6.5;

/** Branch choices; `value` is stored as `metadata.dealer_id` (matches `dealers.slug` where a row exists). */
export const DEALER_OPTIONS = [
	{ value: 'port-of-spain', label: 'Port of Spain' },
	{ value: 'san-fernando', label: 'San Fernando' },
	{ value: 'chaguanas', label: 'Chaguanas' },
	{ value: 'tobago', label: 'Tobago' },
] as const;

/** Fleet models; labels are stored in `metadata.vehicle_model`. */
export const VEHICLE_MODEL_OPTIONS = ['Outlander Sport', 'Triton', 'Xpander Cross', 'Xpander'] as const;

export const SERVICE_TYPE_OPTIONS = [
	'Scheduled Maintenance',
	'Oil & Filter Change',
	'Brake Service',
	'Diagnostics / Check Engine Light',
	'Warranty Repair',
	'Air Conditioning',
	'Tyres & Alignment',
	'Other',
] as const;

export type DealerId = (typeof DEALER_OPTIONS)[number]['value'];
export type VehicleModel = (typeof VEHICLE_MODEL_OPTIONS)[number];
export type ServiceType = (typeof SERVICE_TYPE_OPTIONS)[number];

export const dealerLabel = (id: string) => DEALER_OPTIONS.find((d) => d.value === id)?.label ?? id;

/** Today as YYYY-MM-DD in Trinidad & Tobago, so client and server agree on "not in the past". */
export const todayInTT = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Port_of_Spain' }).format(new Date());

/** Number input: blank means "missing" (z.coerce would turn '' into 0). */
const numberInput = (message: string) =>
	z.preprocess(
		(v) => (v === '' || v === null || v === undefined ? undefined : Number(v)),
		z.number({ required_error: message, invalid_type_error: message }).int(message),
	);

const dealerIds = DEALER_OPTIONS.map((d) => d.value) as [DealerId, ...DealerId[]];

const phoneSchema = z
	.string()
	.trim()
	.min(7, 'Enter a valid contact number')
	.max(20, 'Enter a valid contact number')
	.regex(/^[+\d\s().-]+$/, 'Enter a valid contact number');

const fullNameSchema = z.string().trim().min(2, 'Enter your name').max(200);

const emailSchema = z.string().trim().email('Enter a valid email address').max(255);

const dealerSchema = z.enum(dealerIds, { errorMap: () => ({ message: 'Select your nearest dealer' }) });

const requestDateSchema = z
	.string()
	.regex(/^\d{4}-\d{2}-\d{2}$/, 'Choose a preferred date')
	.refine((d) => d >= todayInTT(), 'Choose today or a later date');

const vehicleModelSchema = (message: string) => z.enum(VEHICLE_MODEL_OPTIONS, { errorMap: () => ({ message }) });

const contactSchema = z.object({
	first_name: z.string().trim().min(1, 'First name is required').max(100),
	last_name: z.string().trim().min(1, 'Last name is required').max(100),
	phone: phoneSchema,
	email: emailSchema,
	vehicle_model: vehicleModelSchema('Select your vehicle model'),
	registration_number: z
		.string()
		.trim()
		.min(2, 'Registration number is required')
		.max(12)
		.regex(/^[A-Za-z0-9 -]+$/, 'Use letters, numbers and spaces only')
		.transform((v) => v.toUpperCase()),
	dealer_id: dealerSchema,
});

export const serviceBookingSchema = contactSchema.extend({
	service_type: z.enum(SERVICE_TYPE_OPTIONS, { errorMap: () => ({ message: 'Select a service type' }) }),
	vehicle_mileage: numberInput('Enter your current mileage in km').pipe(z.number().min(0).max(999_999, 'Enter a valid mileage')),
	request_date: requestDateSchema,
});

export const partsRequestSchema = contactSchema.extend({
	vehicle_year: numberInput('Enter the model year').pipe(
		z.number().min(1990, 'Enter a valid model year').max(new Date().getFullYear() + 1, 'Enter a valid model year'),
	),
	chassis_number: z
		.string()
		.trim()
		.min(6, 'Enter your chassis number / VIN')
		.max(20)
		.regex(/^[A-Za-z0-9-]+$/, 'Use letters, numbers and dashes only')
		.transform((v) => v.toUpperCase()),
	part_number: z.string().trim().max(40).optional().default(''),
	part_description: z.string().trim().min(5, 'Describe the part you need').max(1000),
});

/**
 * Test-drive request. The homepage quick form sends only name, phone and model (the sales team
 * follows up by phone); the global booking modal also sends email, branch, date and trim, which
 * are optional here so both validate against the one server schema.
 */
export const testDriveSchema = z.object({
	full_name: fullNameSchema,
	phone: phoneSchema,
	vehicle_model: vehicleModelSchema('Select a model to test drive'),
	email: emailSchema.optional(),
	dealer_id: dealerSchema.optional(),
	request_date: requestDateSchema.optional(),
	trim: z.string().trim().max(100).optional(),
});

/** Booking modal: the same request with email, branch and date required (trim stays optional). */
export const testDriveBookingSchema = testDriveSchema.required({ email: true, dealer_id: true, request_date: true });

/**
 * Financing pre-approval request from the showroom estimator: contact details plus the estimate
 * the customer saw (price, deposit %, term, monthly payment). The figures come from the
 * calculator, not user input, but are range-checked so a tampered payload can't store nonsense.
 */
export const financingInquirySchema = z.object({
	full_name: fullNameSchema,
	phone: phoneSchema,
	email: emailSchema,
	dealer_id: dealerSchema,
	vehicle_model: vehicleModelSchema('Select a model'),
	trim: z.string().trim().max(100).optional(),
	vehicle_price: z.number().positive().max(10_000_000),
	deposit_percent: z.number().int().min(10).max(50),
	term_months: z
		.number()
		.int()
		.refine((n) => (FINANCE_TERMS as readonly number[]).includes(n), 'Choose a valid loan term'),
	monthly_payment: z.number().positive().max(1_000_000),
});

export type ServiceBookingInput = z.input<typeof serviceBookingSchema>;
export type ServiceBooking = z.output<typeof serviceBookingSchema>;
export type PartsRequestInput = z.input<typeof partsRequestSchema>;
export type PartsRequest = z.output<typeof partsRequestSchema>;
export type TestDriveInput = z.input<typeof testDriveSchema>;
export type TestDrive = z.output<typeof testDriveSchema>;
export type TestDriveBookingInput = z.input<typeof testDriveBookingSchema>;
export type FinancingInquiryInput = z.input<typeof financingInquirySchema>;
export type FinancingInquiry = z.output<typeof financingInquirySchema>;

/** Request body for POST /api/forms/parts-service. */
export type InquiryPayload =
	| { type: 'service'; data: ServiceBookingInput }
	| { type: 'parts'; data: PartsRequestInput }
	| { type: 'test_drive'; data: TestDriveInput }
	| { type: 'financing_inquiry'; data: FinancingInquiryInput };

/**
 * `form_submissions.metadata` — contact details plus every request field.
 * Fields that don't apply to the inquiry type are stored as null so each row has the same shape.
 */
export interface InquiryMetadata {
	first_name: string;
	last_name: string;
	phone: string;
	/** null for homepage quick test-drive requests, which only collect name + phone. */
	email: string | null;
	service_type: ServiceType | null;
	vehicle_model: VehicleModel;
	registration_number: string | null;
	vehicle_mileage: number | null;
	vehicle_year: number | null;
	chassis_number: string | null;
	part_number: string | null;
	part_description: string | null;
	request_date: string | null;
	dealer_id: DealerId | null;
	/** Trim the customer was viewing when they booked a test drive or asked about financing. */
	trim: string | null;
	/** Financing estimate the customer saw (financing_inquiry only). */
	vehicle_price: number | null;
	deposit_percent: number | null;
	term_months: number | null;
	monthly_payment: number | null;
	interest_rate: number | null;
}

const NO_FINANCING = { vehicle_price: null, deposit_percent: null, term_months: null, monthly_payment: null, interest_rate: null };

/** "Jane Mary Doe" → first word as first_name, the rest as last_name. */
function splitName(fullName: string) {
	const [first = '', ...rest] = fullName.split(/\s+/);
	return { first_name: first, last_name: rest.join(' ') };
}

export function toInquiryMetadata(
	payload:
		| { type: 'service'; data: ServiceBooking }
		| { type: 'parts'; data: PartsRequest }
		| { type: 'test_drive'; data: TestDrive }
		| { type: 'financing_inquiry'; data: FinancingInquiry },
): InquiryMetadata {
	if (payload.type === 'financing_inquiry') {
		return {
			...splitName(payload.data.full_name),
			phone: payload.data.phone,
			email: payload.data.email,
			vehicle_model: payload.data.vehicle_model,
			trim: payload.data.trim || null,
			dealer_id: payload.data.dealer_id,
			vehicle_price: payload.data.vehicle_price,
			deposit_percent: payload.data.deposit_percent,
			term_months: payload.data.term_months,
			monthly_payment: Math.round(payload.data.monthly_payment),
			interest_rate: FINANCE_APR,
			registration_number: null,
			service_type: null,
			vehicle_mileage: null,
			request_date: null,
			vehicle_year: null,
			chassis_number: null,
			part_number: null,
			part_description: null,
		};
	}

	if (payload.type === 'test_drive') {
		return {
			...splitName(payload.data.full_name),
			...NO_FINANCING,
			phone: payload.data.phone,
			email: payload.data.email ?? null,
			vehicle_model: payload.data.vehicle_model,
			registration_number: null,
			dealer_id: payload.data.dealer_id ?? null,
			trim: payload.data.trim || null,
			service_type: null,
			vehicle_mileage: null,
			request_date: payload.data.request_date ?? null,
			vehicle_year: null,
			chassis_number: null,
			part_number: null,
			part_description: null,
		};
	}

	const { data } = payload;
	const base = {
		first_name: data.first_name,
		last_name: data.last_name,
		phone: data.phone,
		email: data.email,
		vehicle_model: data.vehicle_model,
		registration_number: data.registration_number,
		dealer_id: data.dealer_id,
		trim: null,
		...NO_FINANCING,
	};

	return payload.type === 'service'
		? {
				...base,
				service_type: payload.data.service_type,
				vehicle_mileage: payload.data.vehicle_mileage,
				request_date: payload.data.request_date,
				vehicle_year: null,
				chassis_number: null,
				part_number: null,
				part_description: null,
			}
		: {
				...base,
				service_type: null,
				vehicle_mileage: null,
				request_date: null,
				vehicle_year: payload.data.vehicle_year,
				chassis_number: payload.data.chassis_number,
				part_number: payload.data.part_number || null,
				part_description: payload.data.part_description,
			};
}

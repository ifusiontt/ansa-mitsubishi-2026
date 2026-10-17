import type { z, ZodTypeAny } from 'zod';
import { VEHICLE_MODEL_OPTIONS, type InquiryType } from '#shared/types/contact';

/**
 * Dark input styling shared by the service + parts forms. Colours, focus ring and
 * stacking are explicit so global `input:focus` rules (main.css adds a ring offset
 * in the page background colour) and theme tokens can't wash them out.
 */
export const inquiryInputClass =
	'relative z-10 pointer-events-auto block w-full rounded-lg border border-zinc-300 bg-zinc-100/80 px-4 py-2.5 ' +
	'text-sm text-zinc-900 caret-brand-red placeholder-zinc-400 transition-colors ' +
	'hover:border-zinc-400 focus:border-brand-red focus:outline-none focus:ring-2 focus:ring-brand-red focus:ring-offset-0 ' +
	'dark:border-zinc-700 dark:bg-zinc-800/80 dark:text-white dark:placeholder-zinc-500 dark:hover:border-zinc-600 ' +
	'aria-[invalid=true]:border-brand-red/80 disabled:cursor-not-allowed disabled:opacity-60 [color-scheme:light] dark:[color-scheme:dark]';

/**
 * Reactive state for an inquiry form posting to /api/forms/parts-service.
 *
 * Values are validated against the zod schema on every change, but a field's
 * message is only shown once it has been touched (blurred) or a submit was
 * attempted, so a fresh form renders without red errors. Also tracks loading,
 * the success/error banner, and resets to `initial()` after a successful send.
 */
export function useInquiryForm<S extends ZodTypeAny>(type: InquiryType, schema: S, initial: () => z.input<S>) {
	type Values = z.input<S>;
	type Key = keyof Values & string;
	type ErrorMap = Partial<Record<Key, string>>;

	const values = reactive(initial()) as Values;
	const touched = shallowRef(new Set<Key>());
	const submitted = ref(false);
	const serverErrors = ref<ErrorMap>({});
	const loading = ref(false);
	const status = ref<'idle' | 'success' | 'error'>('idle');
	const serverError = ref('');

	const clientErrors = computed<ErrorMap>(() => {
		const result = schema.safeParse({ ...values });
		if (result.success) return {};
		const out: ErrorMap = {};
		for (const issue of result.error.issues) {
			out[issue.path[0] as Key] ??= issue.message;
		}
		return out;
	});

	/** Messages to render: only for touched fields, or every field after a submit attempt. */
	const errors = computed<ErrorMap>(() => {
		const out: ErrorMap = {};
		for (const key of Object.keys(values) as Key[]) {
			if (!submitted.value && !touched.value.has(key)) continue;
			const message = serverErrors.value[key] ?? clientErrors.value[key];
			if (message) out[key] = message;
		}
		return out;
	});

	/** Call on blur: from now on this field's error (if any) is shown and updates live. */
	function touch(key: Key) {
		if (touched.value.has(key)) return;
		touched.value = new Set(touched.value).add(key);
	}

	// Editing a field drops its stale server message and hides the success/error banner.
	watch(
		() => ({ ...values }),
		(now, before) => {
			const changed = (Object.keys(now) as Key[]).filter((key) => now[key] !== before?.[key]);
			if (changed.some((key) => serverErrors.value[key])) {
				const next = { ...serverErrors.value };
				for (const key of changed) delete next[key];
				serverErrors.value = next;
			}
			if (status.value !== 'idle' && !loading.value) status.value = 'idle';
		},
	);

	function reset() {
		Object.assign(values, initial());
		touched.value = new Set();
		submitted.value = false;
		serverErrors.value = {};
	}

	async function submit() {
		if (loading.value) return;
		submitted.value = true;
		if (Object.keys(clientErrors.value).length) {
			status.value = 'idle';
			await nextTick();
			document.querySelector<HTMLElement>('[data-inquiry-form] [aria-invalid="true"]')?.focus();
			return;
		}

		loading.value = true;
		serverError.value = '';
		try {
			await $fetch('/api/forms/parts-service', { method: 'POST', body: { type, data: { ...values } } });
			reset();
			// The reset above mutates `values`; set the status after the watcher has flushed.
			await nextTick();
			status.value = 'success';
		} catch (error: any) {
			const fieldErrors = error?.data?.data?.fieldErrors as Partial<Record<Key, string[]>> | undefined;
			if (fieldErrors) {
				serverErrors.value = Object.fromEntries(Object.entries(fieldErrors).map(([k, v]) => [k, v?.[0]])) as ErrorMap;
			}
			serverError.value = error?.data?.statusMessage || error?.statusMessage || 'Something went wrong. Please try again.';
			status.value = 'error';
		} finally {
			loading.value = false;
		}
	}

	return { values, errors, loading, status, serverError, touch, submit, reset };
}

/**
 * Maps `?vehicle=` (a slug like `outlander-sport`, `xpander-cross`, or a model name)
 * to a VEHICLE_MODEL_OPTIONS label, for pre-selecting the inquiry form's vehicle.
 */
export function useInquiryVehicleQuery() {
	const route = useRoute();
	const slug = (value: string) => value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

	return computed(() => {
		const raw = route.query.vehicle;
		const value = Array.isArray(raw) ? raw[0] : raw;
		if (!value) return undefined;
		const target = slug(value).replace(/^\d{4}-/, ''); // drop a model-year prefix
		return VEHICLE_MODEL_OPTIONS.find((model) => slug(model) === target);
	});
}

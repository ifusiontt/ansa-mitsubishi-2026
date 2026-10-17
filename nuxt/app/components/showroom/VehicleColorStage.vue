<script setup lang="ts">
/**
 * Layout-stable vehicle render stage with crossfading colour switches.
 *
 * - The stage is a fixed 2:1 box at full width, so its height never depends on an image's
 *   dimensions or load state. Mitsubishi's colour renders share one 10:7 framing with the car
 *   centred and spanning ~70% of the width, so each layer is centred and zoomed 1.12× to make the
 *   car fill ~78% of the stage width; the car's height (~58% of the stage) leaves headroom for
 *   tall MPVs. A soft radial floor shadow sits on the wheel line (~10% above the stage bottom).
 * - Two stacked <img> layers: a new render is preloaded + decoded off-screen and
 *   only then faded in over the current one (300ms), so the previous colour stays
 *   visible until the next is ready. Rapid swatch clicks only ever show the latest
 *   selection; superseded loads are ignored.
 * - All colour renders (`preload`) are fetched in the background once the browser
 *   is idle, so most switches are instant.
 */
const props = withDefaults(
	defineProps<{
		src: string;
		alt: string;
		/** Every render the visitor may switch to, warmed in the background after mount. */
		preload?: string[];
		/** Extra classes for the <img> layers (e.g. drop shadows). */
		imgClass?: string;
	}>(),
	{ preload: () => [], imgClass: '' },
);

interface Layer {
	src: string;
	alt: string;
}

// Layer 0 is server-rendered with the initial render, so there is no fade-in on first paint.
const layers = reactive<[Layer, Layer]>([
	{ src: props.src, alt: props.alt },
	{ src: '', alt: '' },
]);
const active = ref<0 | 1>(0);

const loads = new Map<string, Promise<void>>();

/** Resolves once `url` is downloaded and decoded (or failed — a broken image must not block switching). */
function load(url: string): Promise<void> {
	let pending = loads.get(url);

	if (!pending) {
		pending = new Promise<void>((resolve) => {
			const img = new Image();
			img.decoding = 'async';
			img.onload = () => img.decode().catch(() => {}).finally(resolve);
			img.onerror = () => resolve();
			img.src = url;
		});
		loads.set(url, pending);
	}

	return pending;
}

let latestRequest = 0;

watch(
	() => [props.src, props.alt] as const,
	async ([src, alt]) => {
		const request = ++latestRequest;
		const current = layers[active.value];

		// Re-selecting what is already shown also cancels any in-flight switch.
		if (src === current.src) {
			current.alt = alt;
			return;
		}

		if (src) await load(src);
		if (request !== latestRequest) return; // superseded by a newer click

		const next = active.value === 0 ? 1 : 0;
		layers[next].src = src;
		layers[next].alt = alt;
		await nextTick();
		active.value = next;
	},
);

onMounted(() => {
	// The initial render was server-rendered into layer 0 and is already loading.
	if (props.src) loads.set(props.src, Promise.resolve());

	const queue = [...new Set(props.preload)].filter((url) => url && url !== props.src);
	// Safari has no requestIdleCallback.
	const idle = (cb: () => void) =>
		typeof window.requestIdleCallback === 'function'
			? window.requestIdleCallback(cb, { timeout: 2000 })
			: setTimeout(cb, 300);

	// Sequential, low-priority warm-up so it never competes with the page's own assets.
	const warmNext = () => {
		const url = queue.shift();
		if (url) load(url).then(() => idle(warmNext));
	};

	idle(warmNext);
});
</script>

<template>
	<div class="relative aspect-[2/1] w-full">
		<!-- Floor shadow: a wide soft pool plus a tight contact shadow under the tyres -->
		<div
			class="absolute inset-x-[6%] bottom-[2%] h-[18%] rounded-[50%] bg-[radial-gradient(ellipse_at_center,rgba(0,0,0,0.55)_0%,rgba(0,0,0,0.2)_45%,transparent_70%)] blur-md"
			aria-hidden="true"
		/>
		<div
			class="absolute inset-x-[16%] bottom-[7%] h-[6%] rounded-[50%] bg-[radial-gradient(ellipse_at_center,rgba(0,0,0,0.85)_0%,rgba(0,0,0,0.35)_50%,transparent_75%)] blur-[3px]"
			aria-hidden="true"
		/>
		<template v-for="(layer, index) in layers" :key="index">
			<img
				v-if="layer.src"
				:src="layer.src"
				:alt="index === active ? layer.alt : ''"
				:aria-hidden="index !== active"
				decoding="async"
				draggable="false"
				:class="[
					'pointer-events-none absolute left-1/2 top-1/2 h-auto w-full max-w-none -translate-x-1/2 -translate-y-1/2 scale-[1.12] transition-opacity duration-300 ease-in-out motion-reduce:transition-none',
					index === active ? 'opacity-100' : 'opacity-0',
					imgClass,
				]"
			/>
		</template>
	</div>
</template>

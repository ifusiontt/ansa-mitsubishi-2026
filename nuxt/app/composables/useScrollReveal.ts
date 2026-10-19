export type RevealState = 'static' | 'armed' | 'shown';

/**
 * Scroll reveal that can never hide SSR content: everything renders visible ('static').
 * After mount, a target that starts below the viewport is 'armed' (hidden instantly, off-screen)
 * and becomes 'shown' (CSS transition) the first time it scrolls into view. A target already on
 * screen at hydration is left alone — no flash of invisible content, no hydration mismatch.
 *
 * Bind the state to `data-reveal` on the target; children opt in with the `.reveal-item` class and
 * stagger via `--reveal-i` (see main.css). Reduced-motion users never see the hidden state.
 */
export function useScrollReveal(target: MaybeRefOrGetter<HTMLElement | null | undefined>) {
	const state = ref<RevealState>('static');
	const { stop } = useIntersectionObserver(
		target,
		([entry]) => {
			if (!entry) return;
			if (state.value === 'static') {
				// On (or above) screen at load: never hide it.
				if (entry.boundingClientRect.top < window.innerHeight) return stop();
				state.value = 'armed';
			} else if (entry.isIntersecting) {
				state.value = 'shown';
				stop();
			}
		},
		{ rootMargin: '0px 0px -10% 0px' },
	);
	return state;
}

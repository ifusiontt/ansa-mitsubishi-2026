export default defineNuxtConfig({
	components: [
		// Exclude UI components from auto-import - shadcn-nuxt handles their registration
		{ path: '~/components', pathPrefix: false, ignore: ['**/ui/**'] },
		{ path: '~/components/block', pathPrefix: false },
		{ path: '~/components/shared', pathPrefix: false },
		{ path: '~/components/base', pathPrefix: false },
		{ path: '~/components/forms', pathPrefix: false },
	],

	ssr: true,
	modules: [
		'@nuxt/image',
		'@nuxtjs/seo',
		'@nuxt/scripts',
		'@vueuse/nuxt',
		'@nuxt/fonts',
		'nuxt-security',
		'@nuxtjs/tailwindcss',
		'shadcn-nuxt',
		'@nuxt/icon',
		'@nuxtjs/color-mode',
		'@nuxt/eslint',
		'nuxt-swiper',
	],

	css: ['~/assets/css/main.css'],

	// Mitsubishi Three Diamonds favicons (public/). SVG first for modern browsers; .ico (16/32/48) as fallback.
	app: {
		head: {
			link: [
				{ rel: 'icon', type: 'image/svg+xml', href: '/favicon.svg' },
				{ rel: 'icon', type: 'image/x-icon', href: '/favicon.ico' },
				{ rel: 'apple-touch-icon', href: '/apple-touch-icon.png' },
			],
		},
	},

	// https://fonts.nuxt.com — official Mitsubishi Motors 'MMC' typeface (MMC OFFICE package), self-hosted
	// from public/fonts/mmc/ via the local provider: MMC-Regular.woff2 → 400, MMC-Bold.woff2 → 700.
	// global: true emits the @font-face rules (font-display: swap) in the shared stylesheet. The
	// metric-matched 'MMC Fallback' face that prevents layout shift on swap lives in main.css.
	fonts: {
		families: [{ name: 'MMC', provider: 'local', weights: [400, 700], styles: ['normal'], global: true }],
	},

	runtimeConfig: {
		public: {
			siteUrl: process.env.NUXT_PUBLIC_SITE_URL as string,
			directusUrl: process.env.DIRECTUS_URL as string,
			// Enabled by default; set to 'false' to disable
			enableVisualEditing: process.env.NUXT_PUBLIC_ENABLE_VISUAL_EDITING !== 'false',
		},
		// Server-only Directus origin for SSR / API-route requests (e.g. the internal Docker hostname
		// http://srv-captain--mitsubishi-api:8055 on CapRover). Browsers keep using public.directusUrl.
		// Override at runtime with NUXT_DIRECTUS_SERVER_URL.
		directusServerUrl: process.env.DIRECTUS_SERVER_URL || process.env.DIRECTUS_URL,
		directusServerToken: process.env.DIRECTUS_SERVER_TOKEN,
		// Optional: endpoint that delivers rendered form notification emails (e.g. a Directus Flow webhook).
		formsEmailWebhookUrl: process.env.FORMS_EMAIL_WEBHOOK_URL,
	},

	shadcn: {
		/**
		 * Prefix for all the imported component
		 */
		prefix: '',
		/**
		 * Directory that the component lives in.
		 * @default "./components/ui"
		 */
		componentDir: './app/components/ui',
	},

	security: {
		headers: {
			contentSecurityPolicy: {
				'img-src': ["'self'", 'data:', '*'],
				'script-src': ["'self'", "'unsafe-inline'", '*'],
				'connect-src': ["'self'", process.env.DIRECTUS_URL || ''],
				'frame-ancestors': ["'self'", process.env.DIRECTUS_URL || ''],
			},
		},
	},

	devtools: { enabled: true },

	// Legacy-site SEO redirects (permanent) plus the old Outlander Sport slug.
	routeRules: {
		'/models/all-new-triton': { redirect: { to: '/showroom/triton', statusCode: 301 } },
		'/models/xpander-cross': { redirect: { to: '/showroom/xpander-cross', statusCode: 301 } },
		'/models/eclipse-cross': { redirect: { to: '/showroom/outlander-sport', statusCode: 301 } },
		'/models': { redirect: { to: '/#models', statusCode: 301 } },
		'/models/**': { redirect: { to: '/#models', statusCode: 301 } },
		'/showroom/2025-outlander-sport': { redirect: { to: '/showroom/outlander-sport', statusCode: 301 } },
	},

	// Image Configuration - https://image.nuxt.com/providers/directus
	image: {
		directus: {
			baseURL: `${process.env.DIRECTUS_URL}/assets/`,
		},
	},

	// OEM light theme by default; the header ThemeToggle still switches to dark.
	colorMode: {
		preference: 'light',
		fallback: 'light',
		classSuffix: '',
		storage: 'cookie',
	},

	site: {
		url: process.env.NUXT_PUBLIC_SITE_URL as string,
	},
	vue: {
		propsDestructure: true,
	},

	sitemap: {
		sources: ['/api/sitemap'],
	},

	compatibilityDate: '2025-01-16',
});

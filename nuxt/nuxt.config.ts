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

	// https://fonts.nuxt.com — Montserrat for display headers (font-display),
	// Poppins + Inter for body & UI. global: true emits every @font-face in the
	// shared global stylesheet so header/footer typography loads on all pages.
	fonts: {
		families: [
			{ name: 'Montserrat', weights: [700, 800], subsets: ['latin'], global: true },
			{ name: 'Poppins', weights: [400, 600], subsets: ['latin'], global: true },
			{ name: 'Inter', weights: [400, 500, 600], subsets: ['latin'], global: true },
		],
	},

	runtimeConfig: {
		public: {
			siteUrl: process.env.NUXT_PUBLIC_SITE_URL as string,
			directusUrl: process.env.DIRECTUS_URL as string,
			// Enabled by default; set to 'false' to disable
			enableVisualEditing: process.env.NUXT_PUBLIC_ENABLE_VISUAL_EDITING !== 'false',
		},
		directusServerToken: process.env.DIRECTUS_SERVER_TOKEN,
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

	// Image Configuration - https://image.nuxt.com/providers/directus
	image: {
		directus: {
			baseURL: `${process.env.DIRECTUS_URL}/assets/`,
		},
	},

	colorMode: {
		preference: 'system',
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

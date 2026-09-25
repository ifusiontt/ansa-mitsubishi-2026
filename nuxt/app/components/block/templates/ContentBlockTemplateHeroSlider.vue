<script setup lang="ts">
interface TemplateHeroSliderProps {
  tagline?: string;
  variant?: string; // e.g. "hero_slider_contained"
  items: any[];
  containerWidth?: string;
}

const props = defineProps<TemplateHeroSliderProps>();

// Swiper container reference
const containerRef = ref(null);

// Swiper configuration — fade hero slider
const swiper = useSwiper(containerRef, {
  effect: 'fade',
  speed: 1200,
  autoplay: {
    delay: 5000,
    disableOnInteraction: false,
  },
  loop: props.items.length > 1,
  pagination: {
    el: '.hero-slider-pagination',
    clickable: true,
  },
  fadeEffect: {
    crossFade: true,
  },
  navigation: {
    nextEl: '.hero-slider-next',
    prevEl: '.hero-slider-prev',
  },
});

// Parse M2A buttons from item — button data lives on .item (resolves as block_button schema)
const resolveButtons = (item: any): any[] => {
  if (!item.buttons || !Array.isArray(item.buttons)) return [];
  return (item.buttons as any[])
    .filter((btn) => btn?.item)
    .sort((a, b) => (a.sort || 0) - (b.sort || 0))
    .map((btn) => btn.item);
};

// Resolve button link destination
const resolveButtonLink = (btn: any): string | undefined => {
  if (btn.type === 'page' && btn.page?.permalink) return btn.page.permalink;
  if (btn.type === 'url' && btn.url) return btn.url;
  return btn.url || undefined;
};

// Resolve button Tailwind classes from variant
const resolveButtonClass = (btn: any): string => {
  if (btn.variant === 'outline') {
    return 'border-2 border-white bg-transparent text-white hover:bg-white hover:text-slate-900 transition-all duration-200 font-bold shadow-md h-12 px-6 text-sm rounded-md';
  }
  if (btn.variant === 'ghost') {
    return 'border border-accent bg-transparent text-white hover:bg-accent hover:text-white transition-all duration-200 font-bold shadow-md h-12 px-6 text-sm rounded-md';
  }
  // Default — Mitsubishi Red CTA (matches site-wide hero button standard)
  return 'bg-accent text-white hover:bg-[#A50029] transition-all duration-200 font-bold shadow-md h-12 px-6 text-sm rounded-md';
};

// Resolve image UUID from item's images array
const resolveImageUuid = (item: any): string | null => {
  if (!item.images || !Array.isArray(item.images) || item.images.length === 0) return null;
  const firstImage = item.images[0];
  if (typeof firstImage?.directus_files_id === 'string') return firstImage.directus_files_id;
  if (firstImage?.directus_files_id && typeof firstImage.directus_files_id === 'object') return firstImage.directus_files_id.id;
  return null;
};
</script>

<template>
  <div class="content-block-template-hero-slider">
    <!-- Hero Slider Section -->
    <div v-if="items.length > 0" class="hero-slider-container relative">
      <ClientOnly>
        <swiper-container ref="containerRef" :init="false">
          <swiper-slide v-for="item in items" :key="item.id">
            <!-- Slide: Full-width background image with contained content overlay -->
            <div class="hero-slide relative w-full min-h-[500px] md:min-h-[600px] lg:min-h-[700px] flex items-center overflow-hidden">
              <!-- Background Image -->
              <template v-if="resolveImageUuid(item)">
                <DirectusImage
                  :uuid="resolveImageUuid(item)!"
                  :alt="item.headline || item.tagline || 'Hero Slide'"
                  class="absolute inset-0 w-full h-full object-cover -z-10"
                  sizes="100vw"
                />
              </template>
              <!-- Fallback gradient when no image -->
              <div v-else class="absolute inset-0 bg-slate-950 -z-10" />

              <!-- Dark overlay for text legibility -->
              <div class="absolute inset-0 bg-gradient-to-r from-black/60 via-black/40 to-transparent -z-5" />

              <!-- Contained Content -->
              <div class="relative z-10 max-w-7xl mx-auto px-6 sm:px-8 lg:px-16 w-full">
                <div class="max-w-3xl text-left">
                  <!-- Tagline -->
                  <p
                    v-if="item.tagline"
                    class="text-[#C3002F] text-[11px] font-bold uppercase tracking-widest mb-4"
                  >
                    {{ item.tagline }}
                  </p>

                  <!-- Headline -->
                  <h1
                    v-if="item.headline"
                    class="text-white text-4xl md:text-5xl lg:text-6xl xl:text-7xl font-black mb-6 leading-tight"
                  >
                    {{ item.headline }}
                  </h1>

                  <!-- Description -->
                  <p
                    v-if="item.description"
                    class="text-white/90 text-base md:text-lg lg:text-xl mb-8 max-w-xl leading-relaxed"
                  >
                    {{ item.description }}
                  </p>

                  <!-- M2A Buttons — rendered in CMS sort order -->
                  <div v-if="resolveButtons(item).length" class="flex flex-wrap gap-4">
                    <NuxtLink
                      v-for="(btn, index) in resolveButtons(item)"
                      :key="btn.id ?? index"
                      :to="resolveButtonLink(btn)"
                      :target="btn.type === 'url' ? '_blank' : '_self'"
                      :class="['inline-flex items-center justify-center gap-2 whitespace-nowrap', resolveButtonClass(btn)]"
                    >
                      {{ btn.label || 'Learn More' }}
                      <svg class="size-4 shrink-0" viewBox="0 0 20 20" fill="currentColor">
                        <path fill-rule="evenodd" d="M7.22 14.78a.75.75 0 0 1 0-1.06L10.94 10 7.22 6.28a.75.75 0 1 1 1.06-1.06l4.25 4.25a.75.75 0 0 1 0 1.06l-4.25 4.25a.75.75 0 0 1-1.06 0Z" clip-rule="evenodd" />
                      </svg>
                    </NuxtLink>
                  </div>
                </div>
              </div>
            </div>
          </swiper-slide>
        </swiper-container>

        <!-- Navigation Arrows -->
        <template v-if="items.length > 1">
          <div class="hero-slider-prev absolute left-4 top-1/2 -translate-y-1/2 z-20 cursor-pointer">
            <div class="w-12 h-12 rounded-full bg-black/30 backdrop-blur-sm border border-white/20 flex items-center justify-center text-white hover:bg-black/50 transition-all">
              <svg class="size-5" viewBox="0 0 20 20" fill="currentColor">
                <path fill-rule="evenodd" d="M12.78 5.22a.75.75 0 0 1 0 1.06L8.56 10l4.22 3.72a.75.75 0 1 1-1.06 1.06l-4.75-4.25a.75.75 0 0 1 0-1.06l4.75-4.25a.75.75 0 0 1 1.06 0Z" clip-rule="evenodd" />
              </svg>
            </div>
          </div>
          <div class="hero-slider-next absolute right-4 top-1/2 -translate-y-1/2 z-20 cursor-pointer">
            <div class="w-12 h-12 rounded-full bg-black/30 backdrop-blur-sm border border-white/20 flex items-center justify-center text-white hover:bg-black/50 transition-all">
              <svg class="size-5" viewBox="0 0 20 20" fill="currentColor">
                <path fill-rule="evenodd" d="M7.22 14.78a.75.75 0 0 1 0-1.06L10.94 10 7.22 6.28a.75.75 0 1 1 1.06-1.06l4.25 4.25a.75.75 0 0 1 0 1.06l-4.25 4.25a.75.75 0 0 1-1.06 0Z" clip-rule="evenodd" />
              </svg>
            </div>
          </div>
        </template>

        <!-- Pagination Dots -->
        <div class="hero-slider-pagination absolute bottom-6 left-1/2 -translate-x-1/2 z-20" />

        <!-- SSR Fallback — static first slide -->
        <template #fallback>
          <div class="hero-slide relative w-full min-h-[500px] md:min-h-[600px] lg:min-h-[700px] flex items-center overflow-hidden">
            <template v-if="items.length > 0">
              <template v-if="resolveImageUuid(items[0])">
                <DirectusImage
                  :uuid="resolveImageUuid(items[0])!"
                  :alt="items[0].headline || items[0].tagline || 'Hero Slide'"
                  class="absolute inset-0 w-full h-full object-cover -z-10"
                  sizes="100vw"
                />
              </template>
              <div v-else class="absolute inset-0 bg-slate-950 -z-10" />
              <div class="absolute inset-0 bg-gradient-to-r from-black/60 via-black/40 to-transparent -z-5" />
              <div class="relative z-10 max-w-7xl mx-auto px-6 sm:px-8 lg:px-16 w-full">
                <div class="max-w-3xl text-left">
                  <p v-if="items[0].tagline" class="text-[#C3002F] text-[11px] font-bold uppercase tracking-widest mb-4">
                    {{ items[0].tagline }}
                  </p>
                  <h1 v-if="items[0].headline" class="text-white text-4xl md:text-5xl lg:text-6xl xl:text-7xl font-black mb-6 leading-tight">
                    {{ items[0].headline }}
                  </h1>
                  <p v-if="items[0].description" class="text-white/90 text-base md:text-lg lg:text-xl mb-8 max-w-xl leading-relaxed">
                    {{ items[0].description }}
                  </p>
                  <!-- M2A Buttons — rendered in CMS sort order -->
                  <div v-if="resolveButtons(items[0]).length" class="flex flex-wrap gap-4">
                    <NuxtLink
                      v-for="(btn, index) in resolveButtons(items[0])"
                      :key="btn.id ?? index"
                      :to="resolveButtonLink(btn)"
                      :target="btn.type === 'url' ? '_blank' : '_self'"
                      :class="['inline-flex items-center justify-center gap-2 whitespace-nowrap', resolveButtonClass(btn)]"
                    >
                      {{ btn.label || 'Learn More' }}
                      <svg class="size-4 shrink-0" viewBox="0 0 20 20" fill="currentColor">
                        <path fill-rule="evenodd" d="M7.22 14.78a.75.75 0 0 1 0-1.06L10.94 10 7.22 6.28a.75.75 0 1 1 1.06-1.06l4.25 4.25a.75.75 0 0 1 0 1.06l-4.25 4.25a.75.75 0 0 1-1.06 0Z" clip-rule="evenodd" />
                      </svg>
                    </NuxtLink>
                  </div>
                </div>
              </div>
            </template>
          </div>
        </template>
      </ClientOnly>
    </div>

    <!-- Empty state -->
    <div v-else class="text-center text-gray-500 py-20">
      <p>No hero slides available.</p>
    </div>
  </div>
</template>

<style scoped>
/* Swiper container styles */
swiper-container {
  display: block;
  width: 100%;
  height: auto;
}

swiper-slide {
  display: flex;
  height: auto;
  width: auto;
}

/* Custom pagination styling — white dots */
:deep(.hero-slider-pagination) {
  display: flex;
  gap: 8px;
}

:deep(.hero-slider-pagination .swiper-pagination-bullet) {
  width: 10px;
  height: 10px;
  background: rgba(255, 255, 255, 0.5);
  opacity: 1;
  transition: all 0.3s ease;
}

:deep(.hero-slider-pagination .swiper-pagination-bullet-active) {
  background: #C3002F;
  width: 28px;
  border-radius: 5px;
}

/* Hide default Swiper arrow content for custom icons */
.hero-slider-prev::after,
.hero-slider-next::after {
  display: none;
}

/* Motion reduction for accessibility */
@media (prefers-reduced-motion: reduce) {
  swiper-container {
    --swiper-transition-speed: 0.01ms !important;
  }
}
</style>

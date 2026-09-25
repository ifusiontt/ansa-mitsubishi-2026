import { ref, computed, watch, onMounted, onUnmounted } from 'vue';
import { useDebounceFn } from '@vueuse/core';

// Nuxt auto-imports: useRouter, useRoute, useRuntimeConfig, $fetch

/**
 * Global Search Composable
 *
 * - Fetches lightweight search index on mount for instant client-side matching
 * - Debounced server search for 3+ char queries
 * - Tracks recently viewed models in localStorage
 * - Context-aware priority scoring based on ?industry= param
 */

export interface SearchModel {
  id: number;
  name: string;
  model_number: string;
  full_name: string;
  brand: string;
  brand_slug: string;
  type_slug: string;
  sector: string;
  image_uuid: string | null;
  key_specs: Array<{ attribute_name: string; value: string; unit: string }>;
  score?: number;
}

export interface SearchBrand {
  id: number;
  name: string;
  slug: string;
  logo_uuid: string | null;
}

export interface SearchSector {
  name: string;
  slug: string;
}

export interface SearchType {
  id: number;
  name: string;
  slug: string;
  sector: string;
  model_count: number;
  score?: number;
}

export interface SearchIndex {
  models: SearchModel[];
  brands: SearchBrand[];
  sectors: SearchSector[];
  types: SearchType[];
}

const RECENT_SEARCHES_KEY = 'ansa_recent_models';
const MAX_RECENT = 3;

// Singleton shared state — all components calling useGlobalSearch() see the SAME refs
const query = ref('');
const isOpen = ref(false);
const recentModels = ref<SearchModel[]>([]);

export function useGlobalSearch() {
  const router = useRouter();
  const route = useRoute();
  const runtimeConfig = useRuntimeConfig();

  // Instance-local state (each caller gets their own)
  const isLoading = ref(false);
  const hasSearched = ref(false);

  // Search index (cached client-side)
  const index = ref<SearchIndex | null>(null);
  const indexLoaded = ref(false);

  // Server results
  const models = ref<SearchModel[]>([]);
  const brands = ref<SearchBrand[]>([]);
  const sectors = ref<SearchSector[]>([]);
  const types = ref<SearchType[]>([]);
  const totalResults = ref(0);

  // Context
  const contextSector = computed(() => {
    return (route.query.industry as string)?.toLowerCase() || null;
  });

  /**
   * Record a model view (call from detail pages)
   */
  function recordModelView(model: SearchModel) {
    try {
      const recent = JSON.parse(localStorage.getItem(RECENT_SEARCHES_KEY) || '[]');
      // Remove if already exists
      const filtered = recent.filter((r: any) => r.id !== model.id);
      // Add to front
      filtered.unshift({
        id: model.id,
        name: model.name,
        model_number: model.model_number,
        full_name: model.full_name,
        brand: model.brand,
        brand_slug: model.brand_slug,
        type_slug: model.type_slug,
        sector: model.sector,
        image_uuid: model.image_uuid,
        viewed_at: Date.now(),
      });
      // Keep only MAX_RECENT
      localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(filtered.slice(0, MAX_RECENT)));
      updateRecentModels();
    } catch { /* ignore localStorage errors */ }
  }

  /**
   * Load recent models from localStorage, match with index data
   */
  function updateRecentModels() {
    try {
      const recent = JSON.parse(localStorage.getItem(RECENT_SEARCHES_KEY) || '[]');
      if (!index.value) {
        recentModels.value = recent.map((r: any) => ({ ...r, key_specs: [] }));
        return;
      }
      // Enrich with index data
      recentModels.value = recent
        .map((r: any) => {
          const matched = index.value!.models.find(m => m.id === r.id);
          return matched ? { ...matched, key_specs: matched.key_specs || [] } : { ...r, key_specs: [] };
        })
        .filter(Boolean);
    } catch {
      recentModels.value = [];
    }
  }

  /**
   * Fetch search index on mount
   */
  async function fetchIndex() {
    if (indexLoaded.value) return;
    try {
      const data = await $fetch<SearchIndex>('/api/equipment/search-index');
      index.value = data;
      indexLoaded.value = true;
      updateRecentModels();
    } catch (err) {
      console.error('Failed to load search index:', err);
    }
  }

  /**
   * Client-side instant matching (for 1-2 char queries)
   */
  function clientSideMatch(q: string) {
    if (!index.value || !q) {
      models.value = [];
      brands.value = [];
      sectors.value = [];
      types.value = [];
      return;
    }

    const lower = q.toLowerCase();

    const matchedModels = index.value.models
      .map(m => {
        let score = 0;
        const fullName = (m.full_name || '').toLowerCase();
        const modelName = (m.name || '').toLowerCase();
        const modelNumber = (m.model_number || '').toLowerCase();
        const brandName = (m.brand || '').toLowerCase();

        if (modelName.startsWith(lower)) score += 25;
        else if (modelName.includes(lower)) score += 15;
        if (modelNumber.includes(lower)) score += 10;
        if (fullName.includes(lower)) score += 10;
        if (brandName.includes(lower)) score += 8;
        if (contextSector.value && m.sector?.toLowerCase() === contextSector.value) score += 10;

        return { ...m, score };
      })
      .filter(m => m.score > 0)
      .sort((a, b) => (b.score || 0) - (a.score || 0))
      .slice(0, 20);

    const matchedBrands = index.value.brands
      .filter(b => b.name.toLowerCase().includes(lower))
      .slice(0, 5);

    const matchedSectors = index.value.sectors
      .filter(s => s.name.toLowerCase().includes(lower))
      .slice(0, 5);

    // Match equipment types (Categories)
    const matchedTypes = index.value.types
      .map(t => {
        let score = 0;
        const typeName = (t.name || '').toLowerCase();
        const typeSlug = (t.slug || '').toLowerCase();

        if (typeName.startsWith(lower)) score += 30;
        else if (typeName.includes(lower)) score += 20;

        if (typeSlug.startsWith(lower)) score += 25;
        else if (typeSlug.includes(lower)) score += 15;

        if (contextSector.value && t.sector?.toLowerCase() === contextSector.value) score += 10;

        return { ...t, score };
      })
      .filter(t => t.score > 0)
      .sort((a, b) => (b.score || 0) - (a.score || 0))
      .slice(0, 5);

    models.value = matchedModels;
    brands.value = matchedBrands;
    sectors.value = matchedSectors;
    types.value = matchedTypes;
    totalResults.value = matchedModels.length + matchedBrands.length + matchedSectors.length + matchedTypes.length;
  }

  /**
   * Server search (for 3+ char queries)
   * Only overwrites client-side results if server returns valid data.
   * On failure or empty response, keeps client-side matches intact.
   */
  const fetchServerSearch = async (q: string) => {
    if (q.length < 3) return;
    isLoading.value = true;
    hasSearched.value = true;

    try {
      const params: Record<string, string> = { q };
      if (contextSector.value) {
        params.sector = contextSector.value;
      }

      const data: any = await $fetch('/api/equipment/search', { params });

      // Only overwrite if server returned results — keeps client-side matches as fallback
      const serverTotal = data.total || 0;
      if (serverTotal > 0) {
        models.value = data.models || [];
        brands.value = data.brands || [];
        sectors.value = data.sectors || [];
        types.value = data.types || [];
        totalResults.value = serverTotal;
      }
      // If server returned 0 results, keep client-side matches
    } catch (err) {
      console.error('Search failed:', err);
      // Don't clear results — keep client-side matches
    } finally {
      isLoading.value = false;
    }
  };

  const debouncedServerSearch = useDebounceFn(fetchServerSearch, 300);

  /**
   * Main search handler — decides between client-side and server
   */
  function search(q: string) {
    query.value = q;

    if (!q) {
      hasSearched.value = false;
      models.value = [];
      brands.value = [];
      sectors.value = [];
      types.value = [];
      return;
    }

    hasSearched.value = true;

    // Client-side for instant feedback (1-2 chars, or if index is loaded for any query)
    clientSideMatch(q);

    // Server search for 3+ chars
    if (q.length >= 3) {
      debouncedServerSearch(q);
    }
  }

  /**
   * Navigate to a model detail page
   */
  function goToModel(model: SearchModel) {
    recordModelView(model);
    const query: Record<string, string> = {};
    if (model.brand_slug) query.brand = model.brand_slug;
    if (contextSector.value) query.industry = contextSector.value;
    router.push({
      path: `/equipment/${model.type_slug}/${model.id}`,
      query,
    });
    isOpen.value = false;
  }

  /**
   * Navigate to a brand page
   */
  function goToBrand(brand: SearchBrand) {
    router.push(`/equipment?brand=${brand.slug}`);
    isOpen.value = false;
  }

  /**
   * Navigate to a sector page
   */
  function goToSector(sector: SearchSector) {
    router.push(`/equipment?industry=${sector.slug}`);
    isOpen.value = false;
  }

  /**
   * Navigate to an equipment type listing page
   */
  function goToType(type: SearchType) {
    router.push(`/equipment/${type.slug}`);
    isOpen.value = false;
  }

  /**
   * Navigate to "View all results" page
   */
  function goToAllResults() {
    const params: Record<string, string> = { q: query.value };
    if (contextSector.value) {
      params.industry = contextSector.value;
    }
    router.push({ path: '/equipment', query: params });
    isOpen.value = false;
  }

  /**
   * Navigate to contact page (no results CTA)
   */
  function goToContact() {
    router.push('/contact');
    isOpen.value = false;
  }

  /**
   * Clear search state
   */
  function reset() {
    query.value = '';
    hasSearched.value = false;
    models.value = [];
    brands.value = [];
    sectors.value = [];
    types.value = [];
    totalResults.value = 0;
  }

  /**
   * Toggle overlay
   */
  function toggle() {
    isOpen.value = !isOpen.value;
    if (!isOpen.value) {
      reset();
    }
  }

  function close() {
    isOpen.value = false;
    reset();
  }

  // Keyboard shortcut: Ctrl/Cmd+K or /
  function handleKeydown(e: KeyboardEvent) {
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
      e.preventDefault();
      toggle();
    }
    // Also support / when not in an input
    if (e.key === '/' && !(e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement)) {
      e.preventDefault();
      if (!isOpen.value) {
        isOpen.value = true;
      }
    }
    if (e.key === 'Escape' && isOpen.value) {
      close();
    }
  }

  onMounted(() => {
    window.addEventListener('keydown', handleKeydown);
    fetchIndex();
  });

  onUnmounted(() => {
    window.removeEventListener('keydown', handleKeydown);
  });

  // Watch for route changes to clear state
  watch(() => route.fullPath, () => {
    // Reset when navigating away from search results
  });

  return {
    query,
    isLoading,
    hasSearched,
    isOpen,
    models,
    brands,
    sectors,
    types,
    totalResults,
    recentModels,
    contextSector,
    search,
    goToModel,
    goToBrand,
    goToSector,
    goToType,
    goToAllResults,
    goToContact,
    toggle,
    close,
    reset,
    recordModelView,
  };
}

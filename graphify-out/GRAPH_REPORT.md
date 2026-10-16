# Graph Report - Mitsubishi_Ansa_Mitsubishi_2026  (2026-10-16)

## Corpus Check
- 260 files · ~341,037 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 1820 nodes · 2243 edges · 166 communities (111 shown, 42 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 22 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `1e75dd3a`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- CollectionNames
- dropdown-menu/index.ts
- schema.ts
- overrides
- devDependencies
- BaseBlock.vue
- BaseFormField.vue
- dialog/index.ts
- BaseButton.vue
- navigation-menu/index.ts
- validateFormSubmission.ts
- [...permalink].vue
- NavigationBar.vue
- FormDescription.vue
- utils.ts
- select/index.ts
- Posts.vue
- components.json
- TooltipContent.vue
- PopoverContent.vue
- Label.vue
- blog/[slug].vue
- RadioGroup.vue
- dependencies
- cn
- Footer.vue
- Collapsible.vue
- generate-types.js
- ShareDialog.vue
- getDirectusAssetURL
- Checkbox.vue
- directus-server.ts
- vercel.json
- ThemeToggle.vue
- contact.ts
- merge-mitsubishi-schema.js
- apply-hybrid-vehicle-schema.js
- .prettierrc.json
- pages/one.get.ts
- PageBuilder.vue
- Badge.vue
- pages/index.vue
- seed-outlander-vehicle.mjs
- showroom/[slug].vue
- test-vehicle-api.mjs
- seed-remaining-vehicles.mjs
- homepage-blocks.mjs
- useGlobalSearch
- DealershipMap.vue
- default.vue
- Container.vue
- tsconfig.json
- @directus/sdk
- @directus/visual-editing
- @formkit/auto-animate
- @hookform/resolvers
- @iconify/utils
- lucide-vue-next
- nuxt
- Headline.vue
- Tagline.vue
- @nuxt/fonts
- @nuxt/image
- @nuxt/scripts
- vehicle-colors.mjs
- @nuxtjs/color-mode
- @nuxtjs/seo
- @nuxtjs/sitemap
- @nuxtjs/tailwindcss
- radix-vue
- sharp
- tailwind-merge
- tailwindcss-animate
- @unhead/schema-org
- @unhead/vue
- vee-validate
- @vee-validate/zod
- vue-hook-form
- HomeHero.vue
- @vueuse/nuxt
- zod
- index.get.ts
- tailwind.config.ts
- vehicle-content-blocks.mjs
- vehicle.ts
- patch-mitsubishi-collections.js
- main
- Nuxt 4 CMS Template with Directus Integration
- populate-form-fields.mjs
- restore-directus-uploads.mjs
- sync-clean-images.mjs
- HomeColorPreview.vue
- about-and-faqs.mjs
- ContentBlock.vue
- Gallery.vue
- BlockLayoutWrapper.vue
- add-vehicle-menu-image.mjs
- _reconcile-colors.mjs
- FaqAccordion.vue
- ContentBlockTemplateTestimonials.vue
- contact.vue
- dealers.mjs
- parts-service-forms.mjs
- BlockHeroCustom.vue
- DynamicForm.vue
- .flat-test2.tmp.mjs
- .flat-test3.tmp.mjs
- .flat-test.tmp.mjs
- optimize-vehicle-assets.js
- contact-form.mjs
- BlockCtaSimple.vue
- ContentBlockTemplateCarousel.vue
- ContentBlockTemplateHeroSlider.vue
- Command.vue
- form-emails.ts
- Mitsubishi ANSA — Directus Deployment Notes
- ContentBlockTemplateServicesList.vue
- is_banner
- ContentBlockTemplate.vue
- ContentBlockTemplateMediaCarousel.vue
- FormBuilder.vue
- VehicleColorStage.vue
- RichText.vue
- ANSA Mitsubishi 2026 — Project Rules &amp; Context
- seed-mitsubishi-data.py
- seed-permissions.py
- ContentBlockTemplateFeaturesGrid.vue
- PricingCard.vue
- ContentBlockTemplateYoutube.vue
- CheckboxGroupField.vue
- InquiryField.vue
- DropdownMenuCheckboxItem.vue
- DropdownMenuSubContent.vue
- Input.vue
- Textarea.vue
- directus-file.ts
- .merge-test.tmp.mjs
- verify-parts-service-submissions.mjs
- ANSA Mitsubishi 2026 Project Guidelines
- seed-starter-content.py
- sync-nav-service-parts.py
- FormBlock.vue
- ContentBlockTemplateContactInfo.vue
- CheckboxField.vue
- RadioGroupField.vue
- SelectField.vue
- DropdownMenuLabel.vue
- main
- class-variance-authority
- InquiryFormShell.vue
- @nuxt/icon
- leaflet
- shadcn-nuxt

## God Nodes (most connected - your core abstractions)
1. `CollectionNames` - 72 edges
2. `cn()` - 61 edges
3. `overrides` - 22 edges
4. `getDirectusAssetURL()` - 19 edges
5. `useGlobalSearch()` - 16 edges
6. `log()` - 12 edges
7. `scripts` - 11 edges
8. `main()` - 11 edges
9. `get()` - 10 edges
10. `FormField` - 9 edges

## Surprising Connections (you probably didn't know these)
- `schema` --calls--> `buildZodSchema()`  [EXTRACTED]
  nuxt/app/components/forms/DynamicForm.vue → nuxt/app/lib/zodSchemaBuilder.ts
- `CustomFormData` --references--> `FormField`  [EXTRACTED]
  nuxt/app/components/forms/FormBuilder.vue → nuxt/shared/types/schema.ts
- `peekThumbUrl()` --calls--> `getDirectusAssetURL()`  [EXTRACTED]
  nuxt/app/components/home/HomeColorPreview.vue → nuxt/server/utils/directus-utils.ts
- `imageUrl` --calls--> `getDirectusAssetURL()`  [EXTRACTED]
  nuxt/app/components/home/HomeContactBanner.vue → nuxt/server/utils/directus-utils.ts
- `useVisualEditing()` --indirect_call--> `setAttr()`  [INFERRED]
  nuxt/app/composables/useVisualEditing.ts → nuxt/app/utils/visualEditing.ts

## Import Cycles
- None detected.

## Communities (166 total, 42 thin omitted)

### Community 0 - "CollectionNames"
Cohesion: 0.03
Nodes (72): CollectionNames, ai_prompts, block_button, block_button_group, block_content_block, block_content_block_files, block_content_items, block_content_items_buttons (+64 more)

### Community 1 - "dropdown-menu/index.ts"
Cohesion: 0.05
Nodes (27): emits, forwarded, props, delegatedProps, emits, forwarded, props, props (+19 more)

### Community 2 - "schema.ts"
Cohesion: 0.03
Nodes (62): RFC-7591, InquiryMetadata, AiPrompt, BlockButton, BlockButtonGroup, BlockContentBlockFile, BlockContentItemsButton, BlockContentItemsFile (+54 more)

### Community 3 - "overrides"
Cohesion: 0.05
Nodes (42): engines, node, pnpm, name, overrides, ajv, brace-expansion@<2, brace-expansion@>=2 <3 (+34 more)

### Community 4 - "devDependencies"
Cohesion: 0.05
Nodes (41): defu, destr, directus-sdk-typegen, @directus/types, dotenv, eslint, eslint-config-prettier, eslint-plugin-prettier (+33 more)

### Community 5 - "BaseBlock.vue"
Cohesion: 0.14
Nodes (11): BaseBlockProps, blockRef, Component, componentData, components, customBlocks, props, HeroProps (+3 more)

### Community 6 - "BaseFormField.vue"
Cohesion: 0.22
Nodes (8): componentMap, getComponentProps(), isDark, props, resolveInputType(), { value, errorMessage }, emits, onFileChange()

### Community 7 - "dialog/index.ts"
Cohesion: 0.07
Nodes (20): emits, forwarded, props, props, delegatedProps, emits, forwarded, props (+12 more)

### Community 8 - "BaseButton.vue"
Cohesion: 0.10
Nodes (18): buttonClasses, href, Icon, icons, linkComponent, props, Props, ButtonVariants (+10 more)

### Community 9 - "navigation-menu/index.ts"
Cohesion: 0.07
Nodes (22): navigationMenuTriggerStyle, delegatedProps, emits, forwarded, props, delegatedProps, emits, forwarded (+14 more)

### Community 10 - "validateFormSubmission.ts"
Cohesion: 0.31
Nodes (7): MAX_FORM_FILE_BYTES, multipartToFormData(), parseFieldValue(), validateFormSubmission(), buildZodSchema(), SubmissionValue, FormField

### Community 11 - "[...permalink].vue"
Cohesion: 0.05
Nodes (40): AboutHeroLink, PartsServiceTab, props, tabs, blocks, { data: page }, { enabled: previewEnabled }, props (+32 more)

### Community 12 - "NavigationBar.vue"
Cohesion: 0.07
Nodes (21): debouncedFetchResults, loading, open, results, router, searched, SearchResult, darkLogoUrl (+13 more)

### Community 13 - "FormDescription.vue"
Cohesion: 0.19
Nodes (10): { error, formItemId, formDescriptionId, formMessageId }, { formDescriptionId }, props, id, props, { error, formItemId }, props, { name, formMessageId } (+2 more)

### Community 14 - "utils.ts"
Cohesion: 0.08
Nodes (19): delegatedProps, props, delegatedProps, props, delegatedProps, forwardedProps, props, delegatedProps (+11 more)

### Community 15 - "select/index.ts"
Cohesion: 0.05
Nodes (26): emits, forwarded, props, delegatedProps, emits, forwarded, props, delegatedProps (+18 more)

### Community 16 - "Posts.vue"
Cohesion: 0.14
Nodes (12): currentPage, { data: postsData, error: _error }, paginationLinks, posts, PostsProps, props, route, router (+4 more)

### Community 17 - "components.json"
Cohesion: 0.13
Nodes (14): aliases, components, utils, framework, $schema, style, tailwind, baseColor (+6 more)

### Community 18 - "TooltipContent.vue"
Cohesion: 0.14
Nodes (9): emits, forwarded, props, delegatedProps, emits, forwarded, props, props (+1 more)

### Community 19 - "PopoverContent.vue"
Cohesion: 0.17
Nodes (8): emits, forwarded, props, delegatedProps, emits, forwarded, props, props

### Community 21 - "blog/[slug].vue"
Cohesion: 0.12
Nodes (12): author, { data, error, refresh }, { enabled }, { isVisualEditingEnabled, apply, setAttr }, post, {
	public: { siteUrl },
}, relatedPosts, route (+4 more)

### Community 22 - "RadioGroup.vue"
Cohesion: 0.20
Nodes (7): delegatedProps, emits, forwarded, props, delegatedProps, forwardedProps, props

### Community 23 - "dependencies"
Cohesion: 0.22
Nodes (9): clsx, dependencies, clsx, nuxt-security, nuxt-swiper, @vueuse/core, nuxt-security, nuxt-swiper (+1 more)

### Community 24 - "cn"
Cohesion: 0.13
Nodes (12): ButtonProps, ButtonGroupProps, containerClasses, props, delegatedProps, props, delegatedProps, forwardedProps (+4 more)

### Community 25 - "Footer.vue"
Cohesion: 0.18
Nodes (10): darkLogoUrl, footerLogoUrl, FooterProps, footerRef, forceWhiteLogo, lightLogoUrl, NavigationItem, props (+2 more)

### Community 26 - "Collapsible.vue"
Cohesion: 0.22
Nodes (5): emits, forwarded, props, props, props

### Community 27 - "generate-types.js"
Cohesion: 0.38
Nodes (6): __dirname, __filename, generateTypes(), postProcessTypes(), projectRoot, promptForToken()

### Community 28 - "ShareDialog.vue"
Cohesion: 0.33
Nodes (4): copied, props, socialLinks, url

### Community 29 - "getDirectusAssetURL"
Cohesion: 0.17
Nodes (11): cutoutUrl(), quickSpecs(), unique(), DirectusImageProps, props, src, props, rows (+3 more)

### Community 30 - "Checkbox.vue"
Cohesion: 0.33
Nodes (4): delegatedProps, emits, forwarded, props

### Community 31 - "directus-server.ts"
Cohesion: 0.33
Nodes (3): directusServer, {
	public: { directusUrl },
	// directusServerToken,
}, Schema

### Community 32 - "vercel.json"
Cohesion: 0.33
Nodes (5): build, env, ENABLE_EXPERIMENTAL_COREPACK, github, silent

### Community 33 - "ThemeToggle.vue"
Cohesion: 0.40
Nodes (3): { className = '' }, colorMode, isDark

### Community 34 - "contact.ts"
Cohesion: 0.06
Nodes (41): props, { values, errors, loading, status, serverError, touch, submit }, minDate, props, { values, errors, loading, status, serverError, touch, submit }, addressLine(), BRANCHES, { data: dealers } (+33 more)

### Community 35 - "merge-mitsubishi-schema.js"
Cohesion: 0.05
Nodes (36): aColls, addedCollections, addedFields, addedRelations, aFields, ansa, aRels, args (+28 more)

### Community 36 - "apply-hybrid-vehicle-schema.js"
Cohesion: 0.11
Nodes (38): applyPublicReadPermissions(), applySchema(), BASE, buildPartialSnapshot(), COLORS, describeDiff(), diffIsEmpty(), ensureHeroFile() (+30 more)

### Community 37 - ".prettierrc.json"
Cohesion: 0.40
Nodes (4): htmlWhitespaceSensitivity, printWidth, proseWrap, singleQuote

### Community 38 - "pages/one.get.ts"
Cohesion: 0.15
Nodes (11): blockButtonFields, blockButtonsM2AFields, blockContentBlockFields, blockContentItemFields, blockCtaSimpleFields, blockFileListFields, blockFormFields, blockLayoutWrapperFields (+3 more)

### Community 39 - "PageBuilder.vue"
Cohesion: 0.40
Nodes (3): PageBuilderProps, props, validBlocks

### Community 41 - "pages/index.vue"
Cohesion: 0.08
Nodes (29): DEFAULT_COPY, description, eyebrow, headline, item, props, { setAttr }, cards (+21 more)

### Community 42 - "seed-outlander-vehicle.mjs"
Cohesion: 0.08
Nodes (26): api(), ASSET_FOLDERS, ASSET_ROOT, assetState, assignFolder(), claim(), COLOR_RENDER_DIR, colorImage (+18 more)

### Community 43 - "showroom/[slug].vue"
Cohesion: 0.09
Nodes (26): activeColorImageUuid, colorImageUuid(), colorRenderUrl(), colorRenderUrls, colors, compactRows(), {
	data: vehicleData,
	error,
}, displayTitle (+18 more)

### Community 44 - "test-vehicle-api.mjs"
Cohesion: 0.08
Nodes (26): ascItem, check(), checkAsset(), checkTransparentPng(), checkTransparentWebp(), colors, EXPECTED_COLORS, EXPECTED_CUTOUTS (+18 more)

### Community 45 - "seed-remaining-vehicles.mjs"
Cohesion: 0.12
Nodes (25): api(), assetState, assignFolder(), __dirname, ensureAssets(), ensureColors(), ensureFolder(), ensureHero() (+17 more)

### Community 46 - "homepage-blocks.mjs"
Cohesion: 0.10
Nodes (22): api(), ASC_BLOCK, ASC_IMAGE, ASC_ITEMS, contentIds, ensureContentBlock(), createItem(), ensureFile() (+14 more)

### Community 47 - "useGlobalSearch"
Cohesion: 0.11
Nodes (19): isOpen, query, recentModels, SearchBrand, SearchIndex, SearchModel, SearchSector, SearchType (+11 more)

### Community 48 - "DealershipMap.vue"
Cohesion: 0.10
Nodes (18): activeFilter, Branch, branches, DAYS, FILTERS, Island, IslandFilter, islandOf() (+10 more)

### Community 49 - "default.vue"
Cohesion: 0.29
Nodes (6): {
	data: siteData,
	error: siteError,
	refresh,
}, footer, { isVisualEditingEnabled, apply }, navigation, SiteData, SiteNav

### Community 67 - "vehicle-colors.mjs"
Cohesion: 0.14
Nodes (20): api(), colorRow(), colorsByVehicle(), ensureFile(), FOLDER_NAMES, H, HERE, isRowFor() (+12 more)

### Community 81 - "HomeHero.vue"
Cohesion: 0.11
Nodes (18): active, activeSlide, assetUrl(), autoplay, focused, headlineParts, hovered, isSplit (+10 more)

### Community 94 - "vehicle-content-blocks.mjs"
Cohesion: 0.14
Nodes (14): api(), candidateFiles(), DRY_RUN, files, getAll(), hasWords(), HERE, LIST (+6 more)

### Community 95 - "vehicle.ts"
Cohesion: 0.13
Nodes (14): cardImage(), { data: vehicles, status }, emit, failedImages, fileId(), priceFormatter, FLEET_SLUGS, NOTE: `highlights` is the M2O to block_content_items, whose `images` field is (+6 more)

### Community 96 - "patch-mitsubishi-collections.js"
Cohesion: 0.14
Nodes (15): dealersFields, fieldMeta(), fieldSchema(), FILE, fs, idField(), mb, mitsubishiCollections (+7 more)

### Community 97 - "main"
Cohesion: 0.24
Nodes (17): already_done(), ensure_out(), human(), main(), prep(), Image, Path, Mirror the directory structure under OUTPUT; create dirs as needed. (+9 more)

### Community 98 - "Nuxt 4 CMS Template with Directus Integration"
Cohesion: 0.12
Nodes (16): **Content Versioning in Directus 12**, ⚠️ Directus Setup Instructions, **Draft Mode in Directus and Live Preview**, **Draft Mode Overview**, **Environment Variables**, **Features**, Folder Structure, Generate Directus Types (+8 more)

### Community 99 - "populate-form-fields.mjs"
Cohesion: 0.13
Nodes (13): api(), CONTACT, dealer, DEALERS, FORCE, FORM_FIELDS, HERE, registration (+5 more)

### Community 100 - "restore-directus-uploads.mjs"
Cohesion: 0.13
Nodes (13): __dirname, DRY_RUN, findByName(), H, MIME, MODELS_ROOT, RAW_ROOT, ROOT (+5 more)

### Community 101 - "sync-clean-images.mjs"
Cohesion: 0.12
Nodes (11): __dirname, DRY_RUN, H, MIME, MODELS_ROOT, ROOT, sourceById, STATE_SOURCES (+3 more)

### Community 102 - "HomeColorPreview.vue"
Cohesion: 0.15
Nodes (13): colorRenderUrl(), colors, { data: vehicle }, fallbackId, peekSlug, peekThumbUrl(), props, renderUrl() (+5 more)

### Community 103 - "about-and-faqs.mjs"
Cohesion: 0.15
Nodes (12): ABOUT_SECTIONS, api(), CATEGORY_CHOICES, FAQ_FIELDS, FAQS, HERE, knownQuestions, newFaqs (+4 more)

### Community 104 - "ContentBlock.vue"
Cohesion: 0.22
Nodes (10): ContentBlockProps, props, publishedItems, TemplateComponent, templateMap, ContentBlockFallbackProps, props, publishedItems (+2 more)

### Community 105 - "Gallery.vue"
Cohesion: 0.18
Nodes (11): currentIndex, currentItem, GalleryItem, GalleryProps, handleKeyDown(), handleNext(), handlePrev(), isLightboxOpen (+3 more)

### Community 106 - "BlockLayoutWrapper.vue"
Cohesion: 0.17
Nodes (11): BlockLayoutWrapperProps, collapseBreakpoint, gridGap, layoutRatio, leftColumnSpan, props, rightColumnSpan, sections (+3 more)

### Community 107 - "add-vehicle-menu-image.mjs"
Cohesion: 0.22
Nodes (9): api(), CUTOUTS, ensureCutout(), HERE, NORMALIZE, NORMALIZE_SCRIPT, normalizedCopy(), publicPolicy (+1 more)

### Community 108 - "_reconcile-colors.mjs"
Cohesion: 0.20
Nodes (10): api(), byGroup, env, EXPECTED, final, freshRow(), H, HERE (+2 more)

### Community 109 - "FaqAccordion.vue"
Cohesion: 0.27
Nodes (7): groups, openId, props, FAQ_CATEGORY_LABELS, FaqCategory, FaqGroup, Faq

### Community 110 - "ContentBlockTemplateTestimonials.vue"
Cohesion: 0.18
Nodes (5): currentIndex, currentTestimonial, props, sectionHeadline, TemplateTestimonialProps

### Community 111 - "contact.vue"
Cohesion: 0.24
Nodes (10): contactForm, { data: dealers }, { data: form }, fields, normalizeName(), prefill, PREFILL_MAP, resolvePrefillValue() (+2 more)

### Community 112 - "dealers.mjs"
Cohesion: 0.22
Nodes (8): api(), CORE_SERVICES, DEALERS, existingSlugs, HERE, search(), TOKEN, WEEKDAYS_430

### Community 113 - "parts-service-forms.mjs"
Cohesion: 0.22
Nodes (8): api(), CONTENT, FIELDS, FORMS, HERE, permission, search(), TOKEN

### Community 114 - "BlockHeroCustom.vue"
Cohesion: 0.20
Nodes (8): bodyText, heading, HeroCustomData, highlightKeyword, isFullWidth, props, { setAttr }, variant

### Community 115 - "DynamicForm.vue"
Cohesion: 0.20
Nodes (9): { handleSubmit, values }, initialValues, { isDraftPreview, setBlockAttr }, isSubmitting, onSubmitForm, props, schema, sortedFields (+1 more)

### Community 116 - ".flat-test2.tmp.mjs"
Cohesion: 0.20
Nodes (9): blockButtonFields, blockButtonsM2AFields, blockContentBlockFields, blockContentItemFields, blockCtaSimpleFields, blockFileListFields, blockFormFields, c (+1 more)

### Community 117 - ".flat-test3.tmp.mjs"
Cohesion: 0.20
Nodes (9): blockButtonFields, blockButtonsM2AFields, blockContentBlockFields, blockContentItemFields, blockCtaSimpleFields, blockFileListFields, blockFormFields, c (+1 more)

### Community 118 - ".flat-test.tmp.mjs"
Cohesion: 0.20
Nodes (9): blockButtonFields, blockButtonsM2AFields, blockContentBlockFields, blockContentItemFields, blockCtaSimpleFields, blockFileListFields, blockFormFields, c (+1 more)

### Community 119 - "optimize-vehicle-assets.js"
Cohesion: 0.24
Nodes (9): candidateRoots, collectFiles(), __dirname, __filename, getTargetProfile(), nuxtCacheDir, outputDirs, run() (+1 more)

### Community 120 - "contact-form.mjs"
Cohesion: 0.25
Nodes (7): api(), fields, FORCE, HERE, search(), TOKEN, vehicleChoices

### Community 121 - "BlockCtaSimple.vue"
Cohesion: 0.22
Nodes (7): backgroundClasses, CtaSimpleData, isFullWidth, isLightBg, normalizedBgStyle, props, { setAttr }

### Community 122 - "ContentBlockTemplateCarousel.vue"
Cohesion: 0.22
Nodes (8): containerRef, isLong, isShort, logoImages, props, swiper, TemplateCarouselProps, variantStyle

### Community 123 - "ContentBlockTemplateHeroSlider.vue"
Cohesion: 0.22
Nodes (4): containerRef, props, swiper, TemplateHeroSliderProps

### Community 124 - "Command.vue"
Cohesion: 0.22
Nodes (7): delegatedProps, emits, forwarded, props, emits, forwarded, props

### Community 125 - "form-emails.ts"
Cohesion: 0.28
Nodes (6): FormEmailTemplate, normalizeKey(), parseMergeTags(), RenderedFormEmail, renderFormEmails(), Form

### Community 126 - "Mitsubishi ANSA — Directus Deployment Notes"
Cohesion: 0.25
Nodes (7): Directus 12 gotchas hit (for future reference), Key deviations from the prepared artifacts (documented), Mitsubishi ANSA — Directus Deployment Notes, Public read permissions, Re-seeding (after a schema re-apply / DB wipe), Services, What was deployed

### Community 127 - "ContentBlockTemplateServicesList.vue"
Cohesion: 0.25
Nodes (5): ContentItem, extractTextBlocks(), isSingleItem, props, { setAttr }

### Community 128 - "is_banner"
Cohesion: 0.43
Nodes (6): is_banner(), main(), Image, Return the fraction of red-dominant pixels in the top strip., Re-encode to a temp file, then atomically replace the original., save_in_place()

### Community 130 - "ContentBlockTemplateMediaCarousel.vue"
Cohesion: 0.33
Nodes (6): containerRef, getYouTubeId(), mediaItems, props, swiper, TemplateMediaCarouselProps

### Community 131 - "FormBuilder.vue"
Cohesion: 0.29
Nodes (5): CustomFormData, error, isDark, isSubmitted, props

### Community 132 - "VehicleColorStage.vue"
Cohesion: 0.29
Nodes (5): active, Layer, layers, loads, props

### Community 133 - "RichText.vue"
Cohesion: 0.33
Nodes (4): contentEl, ProseProps, RichTextProps, { setBlockAttr }

### Community 134 - "ANSA Mitsubishi 2026 — Project Rules &amp; Context"
Cohesion: 0.40
Nodes (4): ANSA Mitsubishi 2026 — Project Rules &amp; Context, 🚨 Critical System Safety Guardrails, 🛠 Directus Schema Rules, 📦 System Architecture &amp; Manifest

### Community 135 - "seed-mitsubishi-data.py"
Cohesion: 0.50
Nodes (4): _load_token(), main(), Token from $DIRECTUS_TOKEN, else ADMIN_TOKEN in directus/.env., req()

### Community 136 - "seed-permissions.py"
Cohesion: 0.50
Nodes (4): _load_token(), main(), Token from $DIRECTUS_TOKEN, else ADMIN_TOKEN in directus/.env., req()

### Community 137 - "ContentBlockTemplateFeaturesGrid.vue"
Cohesion: 0.40
Nodes (4): ContentItem, isGridWhiteCards, props, { setAttr }

### Community 138 - "PricingCard.vue"
Cohesion: 0.40
Nodes (3): { isDraftPreview, setBlockAttr }, PricingCardProps, props

### Community 139 - "ContentBlockTemplateYoutube.vue"
Cohesion: 0.50
Nodes (4): getYouTubeId(), props, TemplateYoutubeProps, videos

### Community 140 - "CheckboxGroupField.vue"
Cohesion: 0.50
Nodes (3): emits, props, toggleValue()

### Community 141 - "InquiryField.vue"
Cohesion: 0.40
Nodes (4): controlAttrs, describedBy, id, props

### Community 142 - "DropdownMenuCheckboxItem.vue"
Cohesion: 0.40
Nodes (4): delegatedProps, emits, forwarded, props

### Community 143 - "DropdownMenuSubContent.vue"
Cohesion: 0.40
Nodes (4): delegatedProps, emits, forwarded, props

### Community 144 - "Input.vue"
Cohesion: 0.40
Nodes (3): emits, modelValue, props

### Community 145 - "Textarea.vue"
Cohesion: 0.40
Nodes (3): emits, modelValue, props

### Community 147 - ".merge-test.tmp.mjs"
Cohesion: 0.40
Nodes (3): c, fields, token

### Community 148 - "verify-parts-service-submissions.mjs"
Cohesion: 0.40
Nodes (4): ALL, envFile, KEYS, ROOT

### Community 149 - "ANSA Mitsubishi 2026 Project Guidelines"
Cohesion: 0.50
Nodes (3): ANSA Mitsubishi 2026 Project Guidelines, Architecture Overview, Critical Rules

### Community 152 - "FormBlock.vue"
Cohesion: 0.50
Nodes (3): CustomForm, CustomFormData, { setBlockAttr }

### Community 153 - "ContentBlockTemplateContactInfo.vue"
Cohesion: 0.50
Nodes (3): ContentBlockContactInfoProps, props, { setAttr }

### Community 154 - "CheckboxField.vue"
Cohesion: 0.67
Nodes (3): emits, localValue, props

### Community 155 - "RadioGroupField.vue"
Cohesion: 0.67
Nodes (3): emits, localValue, props

### Community 156 - "SelectField.vue"
Cohesion: 0.67
Nodes (3): emits, localValue, props

### Community 157 - "DropdownMenuLabel.vue"
Cohesion: 0.50
Nodes (3): delegatedProps, forwardedProps, props

### Community 158 - "main"
Cohesion: 0.83
Nodes (3): main(), normalize(), Path

## Knowledge Gaps
- **1086 isolated node(s):** `fs`, `path`, `args`, `outputRel`, `ansa` (+1081 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 1234 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **42 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `cn()` connect `cn` to `dropdown-menu/index.ts`, `dialog/index.ts`, `BaseButton.vue`, `navigation-menu/index.ts`, `FormDescription.vue`, `utils.ts`, `DropdownMenuCheckboxItem.vue`, `DropdownMenuSubContent.vue`, `Input.vue`, `select/index.ts`, `PopoverContent.vue`, `Label.vue`, `Textarea.vue`, `RadioGroup.vue`, `TooltipContent.vue`, `DropdownMenuLabel.vue`, `Checkbox.vue`, `Badge.vue`, `Command.vue`?**
  _High betweenness centrality (0.069) - this node is a cross-community bridge._
- **Why does `CollectionNames` connect `CollectionNames` to `schema.ts`?**
  _High betweenness centrality (0.047) - this node is a cross-community bridge._
- **Why does `getDirectusAssetURL()` connect `getDirectusAssetURL` to `contact.ts`, `HomeColorPreview.vue`, `pages/index.vue`, `showroom/[slug].vue`, `HomeHero.vue`, `vehicle.ts`?**
  _High betweenness centrality (0.014) - this node is a cross-community bridge._
- **What connects `fs`, `path`, `args` to the rest of the system?**
  _1086 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `CollectionNames` be split into smaller, more focused modules?**
  _Cohesion score 0.027777777777777776 - nodes in this community are weakly interconnected._
- **Should `dropdown-menu/index.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.05263157894736842 - nodes in this community are weakly interconnected._
- **Should `schema.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.032242063492063495 - nodes in this community are weakly interconnected._
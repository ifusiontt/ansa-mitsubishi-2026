# Graph Report - Mitsubishi_Ansa_Mitsubishi_2026  (2026-09-20)

## Corpus Check
- cluster-only mode — file stats not available

## Summary
- 839 nodes · 993 edges · 94 communities (47 shown, 36 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 2 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- CollectionNames
- dropdown-menu/index.ts
- schema.ts
- overrides
- devDependencies
- Gallery.vue
- BaseFormField.vue
- dialog/index.ts
- BaseButton.vue
- navigation-menu/index.ts
- DynamicForm.vue
- [...permalink].vue
- NavigationBar.vue
- FormDescription.vue
- command/index.ts
- select/index.ts
- Posts.vue
- components.json
- TooltipContent.vue
- PopoverContent.vue
- utils.ts
- [slug].vue
- RadioGroup.vue
- dependencies
- cn
- Footer.vue
- Collapsible.vue
- generate-types.js
- ShareDialog.vue
- DirectusImage.vue
- Checkbox.vue
- directus-server.ts
- vercel.json
- ThemeToggle.vue
- CommandList.vue
- SelectContent.vue
- username.ts
- .prettierrc.json
- one.get.ts
- PageBuilder.vue
- Badge.vue
- CommandInput.vue
- DropdownMenuSubTrigger.vue
- NavigationMenuIndicator.vue
- Select.vue
- SelectScrollDownButton.vue
- SelectScrollUpButton.vue
- SelectTrigger.vue
- Separator.vue
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
- nuxt-security
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
- @vueuse/core
- @vueuse/nuxt
- zod
- index.get.ts
- tailwind.config.ts

## God Nodes (most connected - your core abstractions)
1. `cn()` - 61 edges
2. `CollectionNames` - 52 edges
3. `overrides` - 22 edges
4. `scripts` - 11 edges
5. `FormField` - 8 edges
6. `Post` - 6 edges
7. `setAttr()` - 6 edges
8. `tailwind` - 6 edges
9. `ButtonVariants` - 5 edges
10. `buildZodSchema()` - 5 edges

## Surprising Connections (you probably didn't know these)
- `useVisualEditing()` --indirect_call--> `setAttr()`  [INFERRED]
  nuxt/app/composables/useVisualEditing.ts → nuxt/app/utils/visualEditing.ts
- `CustomFormData` --references--> `FormField`  [EXTRACTED]
  nuxt/app/components/forms/FormBuilder.vue → nuxt/shared/types/schema.ts
- `PostsProps` --references--> `Post`  [EXTRACTED]
  nuxt/app/components/block/Posts.vue → nuxt/shared/types/schema.ts
- `Props` --references--> `ButtonVariants`  [EXTRACTED]
  nuxt/app/components/ui/button/Button.vue → nuxt/app/components/ui/button/index.ts
- `schema` --calls--> `buildZodSchema()`  [EXTRACTED]
  nuxt/app/components/forms/DynamicForm.vue → nuxt/app/lib/zodSchemaBuilder.ts

## Import Cycles
- None detected.

## Communities (94 total, 36 thin omitted)

### Community 0 - "CollectionNames"
Cohesion: 0.04
Nodes (52): CollectionNames, ai_prompts, block_button, block_button_group, block_form, block_gallery, block_gallery_items, block_hero (+44 more)

### Community 1 - "dropdown-menu/index.ts"
Cohesion: 0.04
Nodes (34): emits, forwarded, props, delegatedProps, emits, forwarded, props, delegatedProps (+26 more)

### Community 2 - "schema.ts"
Cohesion: 0.04
Nodes (45): AiPrompt, BlockButton, BlockButtonGroup, BlockForm, BlockGallery, BlockGalleryItem, BlockHero, BlockPricing (+37 more)

### Community 3 - "overrides"
Cohesion: 0.05
Nodes (42): engines, node, pnpm, name, overrides, ajv, brace-expansion@<2, brace-expansion@>=2 <3 (+34 more)

### Community 4 - "devDependencies"
Cohesion: 0.05
Nodes (39): defu, destr, directus-sdk-typegen, @directus/types, dotenv, eslint, eslint-config-prettier, eslint-plugin-prettier (+31 more)

### Community 5 - "Gallery.vue"
Cohesion: 0.06
Nodes (28): BaseBlockProps, blockRef, Component, componentData, components, props, contentEl, ProseProps (+20 more)

### Community 6 - "BaseFormField.vue"
Cohesion: 0.06
Nodes (23): componentMap, props, { value, errorMessage }, emits, localValue, props, emits, props (+15 more)

### Community 7 - "dialog/index.ts"
Cohesion: 0.06
Nodes (26): delegatedProps, emits, forwarded, props, emits, forwarded, props, emits (+18 more)

### Community 8 - "BaseButton.vue"
Cohesion: 0.08
Nodes (21): buttonClasses, href, Icon, icons, linkComponent, props, { isDraftPreview, setBlockAttr }, PricingCardProps (+13 more)

### Community 9 - "navigation-menu/index.ts"
Cohesion: 0.07
Nodes (22): navigationMenuTriggerStyle, delegatedProps, emits, forwarded, props, delegatedProps, emits, forwarded (+14 more)

### Community 10 - "DynamicForm.vue"
Cohesion: 0.11
Nodes (21): { handleSubmit, values }, initialValues, { isDraftPreview, setBlockAttr }, isSubmitting, onSubmitForm, props, schema, sortedFields (+13 more)

### Community 11 - "[...permalink].vue"
Cohesion: 0.11
Nodes (22): ApplyOptions, useVisualEditing(), useVisualEditingAttrs(), applyPageVisualEditing(), applyVisualEditingButton(), contentVersion, {
	data: page,
	error,
	refresh,
}, editingPageId (+14 more)

### Community 12 - "NavigationBar.vue"
Cohesion: 0.10
Nodes (17): debouncedFetchResults, loading, open, results, router, searched, SearchResult, darkLogoUrl (+9 more)

### Community 13 - "FormDescription.vue"
Cohesion: 0.19
Nodes (10): { error, formItemId, formDescriptionId, formMessageId }, { formDescriptionId }, props, id, props, { error, formItemId }, props, { name, formMessageId } (+2 more)

### Community 14 - "command/index.ts"
Cohesion: 0.12
Nodes (11): delegatedProps, props, delegatedProps, props, delegatedProps, emits, forwarded, props (+3 more)

### Community 15 - "select/index.ts"
Cohesion: 0.12
Nodes (10): delegatedProps, props, delegatedProps, forwardedProps, props, props, props, delegatedProps (+2 more)

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

### Community 20 - "utils.ts"
Cohesion: 0.18
Nodes (5): props, props, props, delegatedProps, props

### Community 21 - "[slug].vue"
Cohesion: 0.18
Nodes (10): author, { data, error, refresh }, { enabled }, { isVisualEditingEnabled, apply, setAttr }, post, {
	public: { siteUrl },
}, relatedPosts, route (+2 more)

### Community 22 - "RadioGroup.vue"
Cohesion: 0.20
Nodes (7): delegatedProps, emits, forwarded, props, delegatedProps, forwardedProps, props

### Community 23 - "dependencies"
Cohesion: 0.22
Nodes (9): class-variance-authority, clsx, @nuxt/icon, dependencies, class-variance-authority, clsx, @nuxt/icon, shadcn-nuxt (+1 more)

### Community 24 - "cn"
Cohesion: 0.28
Nodes (7): ButtonProps, ButtonGroupProps, containerClasses, props, delegatedProps, props, cn()

### Community 25 - "Footer.vue"
Cohesion: 0.22
Nodes (8): darkLogoUrl, FooterProps, footerRef, lightLogoUrl, NavigationItem, props, runtimeConfig, SocialLink

### Community 26 - "Collapsible.vue"
Cohesion: 0.22
Nodes (5): emits, forwarded, props, props, props

### Community 27 - "generate-types.js"
Cohesion: 0.38
Nodes (6): __dirname, __filename, generateTypes(), postProcessTypes(), projectRoot, promptForToken()

### Community 28 - "ShareDialog.vue"
Cohesion: 0.33
Nodes (4): copied, props, socialLinks, url

### Community 29 - "DirectusImage.vue"
Cohesion: 0.40
Nodes (4): DirectusImageProps, props, src, getDirectusAssetURL()

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

### Community 34 - "CommandList.vue"
Cohesion: 0.40
Nodes (4): delegatedProps, emits, forwarded, props

### Community 35 - "SelectContent.vue"
Cohesion: 0.40
Nodes (4): delegatedProps, emits, forwarded, props

### Community 37 - ".prettierrc.json"
Cohesion: 0.40
Nodes (4): htmlWhitespaceSensitivity, printWidth, proseWrap, singleQuote

### Community 38 - "one.get.ts"
Cohesion: 0.40
Nodes (4): pageFields, BlockPost, Page, PageBlock

### Community 39 - "PageBuilder.vue"
Cohesion: 0.50
Nodes (3): PageBuilderProps, props, validBlocks

### Community 41 - "CommandInput.vue"
Cohesion: 0.50
Nodes (3): delegatedProps, forwardedProps, props

### Community 42 - "DropdownMenuSubTrigger.vue"
Cohesion: 0.50
Nodes (3): delegatedProps, forwardedProps, props

### Community 43 - "NavigationMenuIndicator.vue"
Cohesion: 0.50
Nodes (3): delegatedProps, forwardedProps, props

### Community 44 - "Select.vue"
Cohesion: 0.50
Nodes (3): emits, forwarded, props

### Community 45 - "SelectScrollDownButton.vue"
Cohesion: 0.50
Nodes (3): delegatedProps, forwardedProps, props

### Community 46 - "SelectScrollUpButton.vue"
Cohesion: 0.50
Nodes (3): delegatedProps, forwardedProps, props

### Community 47 - "SelectTrigger.vue"
Cohesion: 0.50
Nodes (3): delegatedProps, forwardedProps, props

### Community 49 - "default.vue"
Cohesion: 0.50
Nodes (3): footer, { isVisualEditingEnabled, apply }, navigation

## Knowledge Gaps
- **543 isolated node(s):** `SubmissionValue`, `ApplyOptions`, `ApplyOptions`, `VisualEditingPageContext`, `SearchResult` (+538 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 579 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **36 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `cn()` connect `cn` to `dropdown-menu/index.ts`, `BaseFormField.vue`, `dialog/index.ts`, `BaseButton.vue`, `navigation-menu/index.ts`, `FormDescription.vue`, `command/index.ts`, `select/index.ts`, `TooltipContent.vue`, `PopoverContent.vue`, `utils.ts`, `RadioGroup.vue`, `Checkbox.vue`, `CommandList.vue`, `SelectContent.vue`, `Badge.vue`, `CommandInput.vue`, `DropdownMenuSubTrigger.vue`, `NavigationMenuIndicator.vue`, `SelectScrollDownButton.vue`, `SelectScrollUpButton.vue`, `SelectTrigger.vue`, `Separator.vue`?**
  _High betweenness centrality (0.167) - this node is a cross-community bridge._
- **Why does `CollectionNames` connect `CollectionNames` to `schema.ts`?**
  _High betweenness centrality (0.079) - this node is a cross-community bridge._
- **Why does `dependencies` connect `dependencies` to `overrides`, `@directus/sdk`, `@directus/visual-editing`, `@formkit/auto-animate`, `@hookform/resolvers`, `@iconify/utils`, `lucide-vue-next`, `nuxt`, `@nuxt/fonts`, `@nuxt/image`, `@nuxt/scripts`, `nuxt-security`, `@nuxtjs/color-mode`, `@nuxtjs/seo`, `@nuxtjs/sitemap`, `@nuxtjs/tailwindcss`, `radix-vue`, `sharp`, `tailwind-merge`, `tailwindcss-animate`, `@unhead/schema-org`, `@unhead/vue`, `vee-validate`, `@vee-validate/zod`, `vue-hook-form`, `@vueuse/core`, `@vueuse/nuxt`, `zod`?**
  _High betweenness centrality (0.020) - this node is a cross-community bridge._
- **What connects `SubmissionValue`, `ApplyOptions`, `ApplyOptions` to the rest of the system?**
  _543 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `CollectionNames` be split into smaller, more focused modules?**
  _Cohesion score 0.038461538461538464 - nodes in this community are weakly interconnected._
- **Should `dropdown-menu/index.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.043478260869565216 - nodes in this community are weakly interconnected._
- **Should `schema.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.043478260869565216 - nodes in this community are weakly interconnected._
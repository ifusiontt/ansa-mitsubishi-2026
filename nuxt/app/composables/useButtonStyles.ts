/**
 * Standardized button styles for the Mitsubishi ANSA showroom.
 *
 * Responsive scaling per the Thumb Zone principle:
 * - Mobile: smaller padding, text-sm — lets machinery breathe
 * - Desktop: lg:px-8 lg:py-3.5 lg:text-base
 *
 * Visual alignment:
 * - rounded-md corners (matches card style)
 * - Mitsubishi Red (#C3002F) bg + white text for primary CTAs
 * - Dark Industrial Slate (#0A0A0A / slate-900) for structural / secondary actions
 */

export function useButtonStyles() {
  // Primary CTA — Mitsubishi Red background, white text
  // Used for: View Details, Apply Filters, Inquire Now, Contact
  const primary =
    'inline-flex items-center justify-center ' +
    'bg-accent text-white ' +
    'font-bold uppercase tracking-widest ' +
    'px-6 py-2.5 text-sm ' +
    'lg:px-8 lg:py-3.5 lg:text-base ' +
    'rounded-md ' +
    'hover:bg-[#A50029] transition-colors cursor-pointer'

  // Secondary — Dark Industrial Slate background, white text
  // Used for: Filter Results toggle, structural actions
  const secondary =
    'inline-flex items-center justify-center gap-2 ' +
    'bg-slate-900 text-white ' +
    'font-bold uppercase tracking-widest ' +
    'px-6 py-2.5 text-sm ' +
    'lg:px-8 lg:py-3.5 lg:text-base ' +
    'rounded-md ' +
    'hover:bg-slate-800 transition-colors cursor-pointer'

  // Pill — compact inline badge style with responsive scaling
  // Used for: View Details inline on cards, small labels
  const pill =
    'inline-block ' +
    'bg-accent text-white ' +
    'font-black text-xs uppercase tracking-[0.2em] ' +
    'px-4 py-2 ' +
    'lg:px-6 lg:py-2.5 lg:text-[11px] ' +
    'rounded-md'

  // Full-width variant — for mobile overlay action buttons
  // Used for: Apply Filters (mobile overlay bottom)
  const fullWidth =
    'w-full ' +
    'bg-accent text-white ' +
    'font-bold uppercase tracking-widest ' +
    'px-6 py-3 text-sm ' +
    'lg:px-8 lg:py-4 lg:text-base ' +
    'rounded-md ' +
    'hover:bg-[#A50029] transition-colors cursor-pointer'

  // Text link styled as button — for navigation / breadcrumb back links
  // Used for: Contact nav link, Back to listing links
  const link =
    'inline-flex items-center justify-center ' +
    'bg-accent text-white ' +
    'font-bold uppercase tracking-widest ' +
    'px-6 py-2.5 text-sm ' +
    'lg:px-8 lg:py-3.5 lg:text-base ' +
    'rounded-md ' +
    'hover:bg-[#A50029] transition-colors'

  return {
    primary,
    secondary,
    pill,
    fullWidth,
    link,
  }
}

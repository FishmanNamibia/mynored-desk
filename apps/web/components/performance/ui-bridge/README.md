# PMS UI Bridge Layer

## Overview

The PMS UI Bridge Layer provides a seamless integration between the Performance Management System (PMS) and the main NSA Desk application's UI standards. This allows PMS components to adopt the main application's design system without breaking existing functionality.

## Architecture

The PMS was originally built as a semi-independent system with its own styling and authentication. The UI Bridge Layer creates a non-breaking integration path by:

1. **Re-exporting UI standards** - Makes colors, gradients, shadows, etc. available to PMS components
2. **Providing styled components** - Drop-in replacements that apply UI standards automatically
3. **Theme provider** - Injects CSS variables for gradual adoption

## Components

### PMSCard

Drop-in replacement for the standard Card component with NSA UI standards applied.

```tsx
import { PMSCard, CardContent, CardHeader, CardTitle } from '@/components/performance/ui-bridge'

<PMSCard elevated hover>
  <CardHeader>
    <CardTitle>Performance Metrics</CardTitle>
  </CardHeader>
  <CardContent>
    Content here
  </CardContent>
</PMSCard>
```

**Props:**
- `elevated` - Uses elevated shadow for prominence
- `hover` - Adds hover animation effect
- All standard Card props

### PMSButton

Enhanced button with gold and primary variants.

```tsx
import { PMSButton } from '@/components/performance/ui-bridge'

<PMSButton variant="gold">Submit</PMSButton>
<PMSButton variant="primary">Save</PMSButton>
<PMSButton variant="outline">Cancel</PMSButton>
```

**Variants:**
- `gold` - NSA brand gold accent (#d4a843)
- `primary` - Info blue for primary actions
- `default`, `outline`, `ghost`, `link`, `destructive` - Standard variants

### PMSThemeProvider

Wraps PMS content and injects UI standards as CSS variables.

```tsx
import { PMSThemeProvider } from '@/components/performance/ui-bridge'

<PMSThemeProvider>
  {/* PMS content */}
</PMSThemeProvider>
```

**Available CSS Variables:**
- `--pms-gold`, `--pms-gold-hover`, `--pms-gold-subtle`
- `--pms-navy`, `--pms-navy-mid`, `--pms-navy-light`, `--pms-navy-lightest`
- `--pms-text-white`, `--pms-text-muted`, `--pms-text-secondary`, `--pms-text-dark`
- `--pms-card-bg`, `--pms-page-bg`
- `--pms-error`, `--pms-success`, `--pms-info`
- `--pms-border`, `--pms-radius`

## UI Standards

Import UI standards directly:

```tsx
import { colors, gradients, shadows, components, tw, radius, typography } from '@/components/performance/ui-bridge'

// Use in inline styles
<div style={{ backgroundColor: colors.gold, boxShadow: shadows.banner }}>
  <h1 style={{ color: colors.textWhite }}>Title</h1>
</div>

// Use in component styles
const headerStyle = {
  background: gradients.navyHeader,
  boxShadow: shadows.header
}
```

### Color Tokens

```typescript
colors.gold           // #d4a843 - Brand gold
colors.goldHover      // #c49a3a - Gold hover state
colors.navy           // #0a1628 - Dark navy
colors.textDark       // #1a2550 - Dark text
colors.textWhite      // #ffffff - White text
colors.cardBg         // #ffffff - Card background
colors.pageBg         // hsl(var(--background)) - Page background
```

### Gradient Tokens

```typescript
gradients.navyHeader      // Navy gradient for headers
gradients.navyToGold      // Ombre navy-to-gold gradient
gradients.ambientOverlay  // Ambient blur overlay
gradients.goldGlow        // Gold glow effect
```

### Shadow Tokens

```typescript
shadows.header        // Header shadow
shadows.banner        // Banner with gold glow
shadows.card          // Standard card shadow
shadows.cardHover     // Card hover shadow
shadows.cardElevated  // Elevated card shadow
```

## Migration Guide

### Step 1: Import UI Standards

Add UI standards to your PMS page:

```tsx
import { colors, gradients, shadows, components } from '@/components/performance/ui-bridge'
```

### Step 2: Apply to Existing Components

**Before:**
```tsx
<Card className="border-blue-200 bg-blue-50">
  <CardContent>
    <h3 className="font-semibold text-blue-900">Title</h3>
  </CardContent>
</Card>
```

**After:**
```tsx
<PMSCard>
  <CardContent>
    <h3 className="font-bold text-xl" style={{ color: colors.textDark }}>Title</h3>
  </CardContent>
</PMSCard>
```

### Step 3: Update Banners and Headers

**Before:**
```tsx
<div className="p-4 bg-blue-50 border-blue-200">
  <Calendar className="w-6 h-6 text-blue-600" />
  <h3 className="font-semibold text-blue-900">Period Name</h3>
</div>
```

**After:**
```tsx
<div className="relative overflow-hidden rounded-md" style={{ boxShadow: shadows.banner }}>
  <div className="absolute inset-0 opacity-90" style={{ background: gradients.navyHeader }} />
  <div className="absolute top-0 right-0 w-96 h-96 opacity-30 blur-3xl" style={{ background: gradients.goldGlowEllipse }} />
  <div className="relative p-6">
    <Calendar className="w-7 h-7" style={{ color: colors.gold }} />
    <h3 className="font-bold text-xl" style={{ color: colors.textWhite }}>Period Name</h3>
  </div>
</div>
```

### Step 4: Update Buttons

**Before:**
```tsx
<Button className="bg-blue-600 hover:bg-blue-700">Submit</Button>
```

**After:**
```tsx
<PMSButton variant="gold">Submit</PMSButton>
```

## Best Practices

1. **Gradual Adoption** - Migrate pages one at a time
2. **Test Thoroughly** - Ensure no functional breakage
3. **Maintain Consistency** - Use UI standards for all new components
4. **Document Changes** - Note any deviations from standards
5. **Preserve Functionality** - Never modify PMS business logic

## Examples

### Performance Agreement Page

See `apps/web/app/(protected)/dashboard/performance/my-tasks/performance/page.tsx` for a complete example of PMS UI integration.

### Key Features Demonstrated:
- Gradient ambient effect on performance period banner
- Gold accent buttons for primary actions
- Consistent typography using UI standards
- Proper color tokens for text and backgrounds

## Troubleshooting

### Colors Not Applying
- Ensure UI standards are imported
- Check that inline styles are used (Tailwind classes may override)
- Verify PMSThemeProvider wraps your content

### TypeScript Errors
- Import types from the bridge layer, not directly from components
- Use `PMSButton` instead of `Button` for custom variants

### Layout Issues
- Check that PMS layout includes PMSThemeProvider
- Verify background colors are applied to both container and main

## Support

For questions or issues with PMS UI integration, refer to:
- Main UI standards: `apps/web/app/ui-standards.ts`
- PMS layout: `apps/web/app/(protected)/dashboard/performance/layout.tsx`
- Example implementation: Performance agreement page

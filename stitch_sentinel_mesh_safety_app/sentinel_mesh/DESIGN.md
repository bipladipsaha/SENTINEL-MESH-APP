---
name: TravelRakshak
colors:
  surface: '#f9f9ff'
  surface-dim: '#d0daf0'
  surface-bright: '#f9f9ff'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f0f3ff'
  surface-container: '#e7eeff'
  surface-container-high: '#dee8ff'
  surface-container-highest: '#d9e3f9'
  on-surface: '#121c2c'
  on-surface-variant: '#434655'
  inverse-surface: '#273141'
  inverse-on-surface: '#ebf1ff'
  outline: '#737687'
  outline-variant: '#c3c5d8'
  surface-tint: '#0051e0'
  primary: '#0051df'
  on-primary: '#ffffff'
  primary-container: '#2f6bff'
  on-primary-container: '#000318'
  inverse-primary: '#b5c4ff'
  secondary: '#006b5d'
  on-secondary: '#ffffff'
  secondary-container: '#89f2dd'
  on-secondary-container: '#006f61'
  tertiary: '#ab3135'
  on-tertiary: '#ffffff'
  tertiary-container: '#cd494b'
  on-tertiary-container: '#ffffff'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#dbe1ff'
  primary-fixed-dim: '#b5c4ff'
  on-primary-fixed: '#00174d'
  on-primary-fixed-variant: '#003cac'
  secondary-fixed: '#8cf5e0'
  secondary-fixed-dim: '#6fd8c4'
  on-secondary-fixed: '#00201b'
  on-secondary-fixed-variant: '#005046'
  tertiary-fixed: '#ffdad8'
  tertiary-fixed-dim: '#ffb3b0'
  on-tertiary-fixed: '#410006'
  on-tertiary-fixed-variant: '#8b1820'
  background: '#f9f9ff'
  on-background: '#121c2c'
  surface-variant: '#d9e3f9'
typography:
  display-lg:
    fontFamily: Manrope
    fontSize: 48px
    fontWeight: '800'
    lineHeight: 56px
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Manrope
    fontSize: 32px
    fontWeight: '700'
    lineHeight: 40px
    letterSpacing: -0.01em
  headline-lg-mobile:
    fontFamily: Manrope
    fontSize: 28px
    fontWeight: '700'
    lineHeight: 36px
  headline-md:
    fontFamily: Manrope
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
  body-lg:
    fontFamily: Manrope
    fontSize: 18px
    fontWeight: '400'
    lineHeight: 28px
  body-md:
    fontFamily: Manrope
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  label-md:
    fontFamily: Manrope
    fontSize: 14px
    fontWeight: '600'
    lineHeight: 20px
    letterSpacing: 0.01em
  label-sm:
    fontFamily: Manrope
    fontSize: 12px
    fontWeight: '500'
    lineHeight: 16px
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  unit: 8px
  container-margin-mobile: 20px
  container-margin-desktop: 40px
  gutter: 16px
  stack-sm: 8px
  stack-md: 16px
  stack-lg: 32px
---

## Brand & Style
The design system is centered on the concept of "Humanistic Protection." It prioritizes psychological safety, aiming to reduce cortisol levels during high-stress emergency situations through visual clarity and physical softness.

The style is **Modern/Corporate with a High-Tactile influence**, borrowing the approachability of lifestyle wellness apps and the systematic rigor of health platforms. It emphasizes:
- **Radical Clarity:** Removing visual noise to ensure critical information is surfaced instantly.
- **Physicality:** Using generous rounding and soft depth to make the interface feel tangible and safe, rather than cold or digital.
- **Breathable UI:** Extensive use of whitespace to prevent cognitive overload.
- **Human-Centricity:** Avoiding any aesthetic associated with surveillance, military hardware, or "hacker" cultures in favor of a medical and community-focused warmth.

## Colors
The palette is designed to be authoritative yet soothing. 

- **Primary Blue (#2F6BFF):** Used for primary actions and "Safe State" indicators. It represents stability.
- **Secondary Teal (#4CB8A5):** Used for health-related metrics and secondary supportive features.
- **Emergency Red (#E85D5D):** Reserved exclusively for active emergencies or critical alerts. It is a "soft" red, avoiding harshness while maintaining urgency.
- **Surface Strategy:** This design system utilizes a high-contrast relationship between the **Background Base** and **Surface Card** to create a clear "object-on-ground" hierarchy, aiding navigation during motion or stress.

## Typography
Manrope was selected for its modern, geometric construction that retains a friendly, open character. 

- **Weight Usage:** Use **Bold (700)** or **ExtraBold (800)** for status headers to ensure legibility even at low brightness or through glare.
- **Scale:** The type scale is intentionally large. The minimum body size for critical information is **16px** to accommodate users who may be visually impaired or in a state of distress.
- **Alignment:** Stick to left-aligned text for readability, using center-alignment only for high-impact emergency states or primary landing hero sections.

## Layout & Spacing
The layout follows a **Fluid Grid** model with high internal padding to maintain the "Calm" aesthetic.

- **Grid:** A 12-column grid for desktop and a 4-column grid for mobile.
- **Safe Zones:** High vertical rhythm is prioritized. Components should have generous breathing room (minimum 24px) between distinct functional groups.
- **Touch Targets:** In an emergency context, all interactive elements must have a minimum touch target of **48x48px**, regardless of their visual size.

## Elevation & Depth
Depth is used to convey "Safety Layers." This design system avoids harsh shadows in favor of **Ambient Diffusion**.

- **Level 0 (Background):** #F7F8FA. The canvas.
- **Level 1 (Cards):** #FFFFFF. Soft, wide-spread shadows (Blur: 30px, Y: 10px, Opacity: 4%) to lift the content subtly.
- **Level 2 (Active/Floating):** Used for primary action buttons or modal sheets. Shadows are tighter but slightly more opaque (Opacity: 8%) to signify "Pressability."
- **Tonal Layers:** For secondary information within a card, use a subtle #F1F3F7 fill instead of a secondary shadow to keep the interface clean.

## Shapes
The shape language is extremely soft. 

- **Containers:** All primary cards and background containers must use a **24px (rounded-xl)** corner radius.
- **Small Elements:** Buttons and input fields use a **16px (rounded-lg)** radius to maintain harmony with the larger containers.
- **The "Pill":** Use fully rounded "Pill" shapes for status indicators (tags/chips) and the primary "Emergency SOS" trigger to make them feel distinct from standard UI buttons.

## Components
- **Primary Buttons:** Large (56px height), rounded-lg (16px), using Primary Blue with white text. High-stress buttons (like "Cancel Emergency") should use a heavy tonal fill rather than an outline.
- **Emergency Trigger:** A large, circular or pill-shaped component, utilizing a subtle pulse animation and a secondary soft glow shadow of its own color (#E85D5D).
- **Cards:** White background, 24px corners, 20px internal padding. Content should be grouped logically with 8px gaps.
- **Input Fields:** Soft grey background (#EDF2F7), no border unless focused. Focused state uses a 2px Primary Blue border.
- **Status Chips:** Low-saturation backgrounds with high-saturation text (e.g., Light Green background with Dark Green text) for non-emergency status updates.
- **Progressive Disclosure:** Use collapsible list items for medical history or contact details to keep the main view uncluttered.
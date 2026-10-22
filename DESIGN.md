---
name: Aether Metric
colors:
  surface: '#f8f9ff'
  surface-dim: '#cbdbf5'
  surface-bright: '#f8f9ff'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#eff4ff'
  surface-container: '#e5eeff'
  surface-container-high: '#dce9ff'
  surface-container-highest: '#d3e4fe'
  on-surface: '#0b1c30'
  on-surface-variant: '#3f4850'
  inverse-surface: '#213145'
  inverse-on-surface: '#eaf1ff'
  outline: '#707881'
  outline-variant: '#bfc7d2'
  surface-tint: '#006398'
  primary: '#006194'
  on-primary: '#ffffff'
  primary-container: '#007bb9'
  on-primary-container: '#fdfcff'
  inverse-primary: '#93ccff'
  secondary: '#515f74'
  on-secondary: '#ffffff'
  secondary-container: '#d5e3fc'
  on-secondary-container: '#57657a'
  tertiary: '#006577'
  on-tertiary: '#ffffff'
  tertiary-container: '#008096'
  on-tertiary-container: '#f9fdff'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#cce5ff'
  primary-fixed-dim: '#93ccff'
  on-primary-fixed: '#001d31'
  on-primary-fixed-variant: '#004b73'
  secondary-fixed: '#d5e3fc'
  secondary-fixed-dim: '#b9c7df'
  on-secondary-fixed: '#0d1c2e'
  on-secondary-fixed-variant: '#3a485b'
  tertiary-fixed: '#acedff'
  tertiary-fixed-dim: '#4cd7f6'
  on-tertiary-fixed: '#001f26'
  on-tertiary-fixed-variant: '#004e5c'
  background: '#f8f9ff'
  on-background: '#0b1c30'
  surface-variant: '#d3e4fe'
typography:
  display-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 36px
    fontWeight: '700'
    lineHeight: 44px
    letterSpacing: -0.025em
  display-lg-mobile:
    fontFamily: Plus Jakarta Sans
    fontSize: 28px
    fontWeight: '700'
    lineHeight: 36px
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
    letterSpacing: -0.02em
  headline-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 20px
    fontWeight: '600'
    lineHeight: 28px
    letterSpacing: -0.015em
  headline-sm:
    fontFamily: Plus Jakarta Sans
    fontSize: 16px
    fontWeight: '600'
    lineHeight: 24px
    letterSpacing: -0.01em
  metric-xl:
    fontFamily: Plus Jakarta Sans
    fontSize: 32px
    fontWeight: '700'
    lineHeight: 38px
    letterSpacing: -0.03em
  metric-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 22px
    fontWeight: '700'
    lineHeight: 28px
    letterSpacing: -0.02em
  body-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  body-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  body-sm:
    fontFamily: Plus Jakarta Sans
    fontSize: 12px
    fontWeight: '400'
    lineHeight: 18px
  label-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 13px
    fontWeight: '500'
    lineHeight: 18px
    letterSpacing: 0.01em
  label-sm:
    fontFamily: Plus Jakarta Sans
    fontSize: 11px
    fontWeight: '600'
    lineHeight: 16px
    letterSpacing: 0.04em
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  gutter: 1.25rem
  gutter-desktop: 1.5rem
  margin: 1rem
  margin-tablet: 1.5rem
  margin-desktop: 2rem
  space-xs: 0.25rem
  space-sm: 0.5rem
  space-md: 0.875rem
  space-lg: 1.25rem
  space-xl: 1.75rem
  space-2xl: 2.5rem
---

## Brand & Style

This design system targets modern data-intensive productivity tools, developer platforms, and cloud telemetry suites. The emotional objective is radical composure: analytical clarity, airiness, and an unfussy precision that eliminates cognitive friction when scanning dense datasets.

The style synthesizes **Corporate Modern** with **Soft Scandinavian Minimalism**. It replaces heavy contrast blocks and intrusive structural divisions with light atmospheric tinting, pristine white foreground containers, and crisp hairline structural boundaries. Negative space operates as a functional grouping tool rather than empty void, fostering an environment that feels weightless yet strictly methodical.

## Colors

The palette establishes an airy, crystalline baseline with purposeful chromatic signals for rapid hierarchy identification:

- **Primary (`#0284C7` - Sky Blue 600):** Primary actions, focal-point highlights, active navigation nodes, and primary metric charts.
- **Secondary (`#475569` - Slate 600):** Structural anchors, inactive tab states, secondary actions, and supporting metric indicators.
- **Tertiary (`#06B6D4` - Cyan 500):** Real-time telemetry signals, sparkline accents, trend shifts, and contextual highlights.
- **Neutral (`#64748B` - Cool Slate 500):** Baseline metadata, descriptive microcopy, and subtle iconography.

### Canvas & Structural Tints
- **App Canvas:** `#F8FAFC` (Slate 50) — A calm, cool off-white baseline that eliminates display glare.
- **Surface Elevation (Cards & Panels):** `#FFFFFF` (Pure White) — Distinct, crisp content islands.
- **Surface Hover / Sub-row Fill:** `#F1F5F9` (Slate 100) / `#F0F9FF` (Sky 50).
- **Hairline Borders:** `#E2E8F0` (Slate 200) for general boundaries; `#BAE6FD` (Sky 200) for active/focused strokes.
- **Semantic Badges:** Soft pastel fills paired with high-contrast text:
  - Positive: `#ECFDF5` fill with `#059669` text.
  - Informational: `#F0F9FF` fill with `#0284C7` text.
  - Warning: `#FFFBEB` fill with `#D97706` text.
  - Danger: `#FEF2F2` fill with `#DC2626` text.

## Typography

Plus Jakarta Sans governs the entire typographic stack, delivering geometric precision balanced by subtle humanist curves that avoid clinical coldness.

- **Tabular Numerics:** All data tables, metric cards, financial counters, and charts must declare `font-variant-numeric: tabular-nums lining-nums`. This prevents layout shifts during live data mutations and ensures clean vertical column scanning.
- **Metric Classes:** `metric-xl` and `metric-md` are designated solely for standalone key performance indicators (KPIs), using tight tracking (`-0.03em`) to anchor dashboards.
- **Label Formatting:** `label-sm` utilizes an uppercase style with wide tracking (`0.04em`) exclusively for table header rows, metric category supertitles, and status badges.

## Layout & Spacing

The layout model is driven by a fluid 12-column system constrained within a maximum readable width of `1600px` for high-resolution displays.

- **Desktop (1024px+):** 12-column grid, `1.5rem` (24px) gutters, and a persistent `260px` vertical navigation dock with dynamic canvas margin.
- **Tablet (768px - 1023px):** 8-column layout, `1.25rem` (20px) gutters, collapsible rail navigation, and `1.5rem` outer margin.
- **Mobile (< 768px):** 4-column flow, `1rem` (16px) margins and gutters. Multi-column metric groups collapse into horizontal snap-scrolling ribbons or full-width stacked cards.

Vertical rhythmic pacing operates strictly on an 8px base rhythm (`0.5rem`, `0.875rem` [approx. 14px], `1.25rem`, `1.75rem`, `2.5rem`). Interior card padding defaults uniformly to `space-lg` (20px) to balance layout density with breathing room.

## Elevation & Depth

Visual plane differentiation avoids high-contrast drop shadows. It relies instead on **crisp structural hairlines paired with subtle cool ambient diffusion**:

- **Level 0 (App Background):** Ground floor `#F8FAFC`. Zero elevation, zero shadow.
- **Level 1 (Card & Dashboard Panels):** `#FFFFFF` surface container with a `1px solid #E2E8F0` border. Ambient shadow: `0 1px 3px 0 rgba(15, 23, 42, 0.03), 0 1px 2px -1px rgba(15, 23, 42, 0.03)`.
- **Level 2 (Hovered Cards & Interactive Controls):** Border shifts to `#CBD5E1`. Shadow lifts softly: `0 4px 12px -2px rgba(2, 132, 199, 0.06), 0 2px 6px -1px rgba(15, 23, 42, 0.04)`.
- **Level 3 (Dropdowns, Overlays & Popovers):** Pure white container with `1px solid #E2E8F0` and an expanded cool diffuse perimeter: `0 12px 24px -4px rgba(15, 23, 42, 0.08), 0 4px 8px -2px rgba(15, 23, 42, 0.03)`.
- **Level 4 (Modals & Sheets):** Backdrop is overlaid with `rgba(15, 23, 42, 0.3)` blended with a `4px` blur filter. The modal card carries: `0 20px 32px -6px rgba(15, 23, 42, 0.12)`.

## Shapes

The design system maintains a refined balance between technical crispness and approachable modernity using an intermediate rounding scale:

- **Inputs, Buttons, and Table Rows:** Standard `0.5rem` (8px) radius.
- **Dashboard Metric Cards & Complex Modules:** `rounded-lg` at `0.75rem` (12px) to soft-frame complex inner grids without swallowing edge real estate.
- **Modals & Drawers:** `rounded-xl` at `1rem` (16px).
- **Status Pills, Avatars & Micro Tags:** Full pill rounding (`9999px`) to immediately convey meta/tag semantics versus structural containers.

## Components

### Buttons
- **Primary:** Background `#0284C7`, text `#FFFFFF`, font-weight 600, height 38px, padding 0 16px, border radius 8px. Hover shifts to `#0369A1` with an ambient glow (`box-shadow: 0 0 0 3px rgba(2, 132, 199, 0.15)`).
- **Secondary:** Background `#FFFFFF`, text `#334155`, border `1px solid #E2E8F0`. Hover shifts background to `#F8FAFC` and border to `#CBD5E1`.
- **Ghost:** Text `#64748B`, zero border. Hover introduces background `#F0F9FF` and text `#0284C7`.

### KPI Metric Cards
- Standard layout: Top row holds the micro-label (`label-sm`, uppercase, `#64748B`) alongside an optional secondary icon. 
- Center area features the prominent numeric value (`metric-xl`, `#0F172A`) paired horizontally with a trending badge pill.
- Base area embeds a compressed sparkline (stroke: `#0284C7` or `#06B6D4`, fill: gradient to transparent) or a delta comparison line (`body-sm`, `#64748B`).

### Status Badges & Chips
- Compact padding: `2px 8px`, border radius `9999px`, font `label-sm` (weight 600).
- Neutral/Inactive: Background `#F1F5F9`, text `#475569`.
- Operational: Background `#F0F9FF`, text `#0284C7`, optional pulsing 6px indicator dot (`#06B6D4`).

### Form Input Fields
- Container height: 38px, font `body-md`, background `#FFFFFF`, border `1px solid #CBD5E1`, border-radius 8px.
- Focus state: Border transitions to `#0284C7` accompanied by a focus ring (`box-shadow: 0 0 0 3px rgba(2, 132, 199, 0.12)`).
- Prefix / Suffix: Icon or currency markers rendered in `#94A3B8` resting within the input padding bounds.

### Data Tables
- Header: Height 40px, background `#F8FAFC`, border-bottom `1px solid #E2E8F0`, typography `label-sm` in `#64748B`.
- Row: Height 48px, background `#FFFFFF`, border-bottom `1px solid #F1F5F9`. Hover switches row background to `#F8FAFC`.
- Cells: Vertical alignment centered, numbers right-aligned with `tabular-nums`, primary descriptors left-aligned.

### Checkboxes & Switches
- Checkbox: 16x16px, border `1.5px solid #CBD5E1`, border-radius 4px. Checked state transitions background and border to `#0284C7` with a clean white SVG check.
- Toggle Switch: 36x20px capsule track. Unchecked `#E2E8F0`, checked `#0284C7`. Thumb diameter 16px in `#FFFFFF`, smoothly sliding 16px with an ambient shadow.
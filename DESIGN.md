---
name: "Formative"
description: "A restrained workspace for operating and reviewing interactive prototypes."
colors:
  review-bg: "#191a1d"
  review-text: "#f5f3f7"
  review-muted: "#b7bac4"
  review-border: "#555963"
  dark-review-bg: "#191a1d"
  dark-review-text: "#f5f3f7"
  dark-review-muted: "#b7bac4"
  dark-review-border: "#555963"
  bg: "#f7f8fa"
  surface: "#ffffff"
  raised: "#eef1f5"
  text: "#202c3b"
  muted: "#586779"
  border: "#cbd2dc"
  accent: "#2454a3"
  accent-hover: "#194280"
  on-accent: "#fff"
  focus: "#356bc4"
  danger: "#a52e32"
  danger-bg: "#fff0f0"
  success: "#23603e"
  success-bg: "#e9f5ed"
  warning: "#775019"
  warning-bg: "#fcf3df"
  dark-bg: "#141a22"
  dark-surface: "#1d2632"
  dark-raised: "#273341"
  dark-text: "#eef2f7"
  dark-muted: "#b2bfce"
  dark-border: "#4b5a6b"
  dark-accent: "#aecbff"
  dark-accent-hover: "#c9dcff"
  dark-on-accent: "#142e57"
  dark-focus: "#93bbff"
  dark-danger: "#ffb4b4"
  dark-danger-bg: "#43282e"
  dark-success: "#a5dfb7"
  dark-success-bg: "#243b30"
  dark-warning: "#f4d391"
  dark-warning-bg: "#3e3525"
typography:
  headline:
    fontFamily: "\"Inter Variable\", ui-sans-serif, system-ui, sans-serif"
    fontSize: "clamp(28px, 4vw, 44px)"
    fontWeight: 650
    lineHeight: 1.15
    letterSpacing: "-.025em"
  hero:
    fontFamily: "\"Inter Variable\", ui-sans-serif, system-ui, sans-serif"
    fontSize: "clamp(32px, 5vw, 60px)"
    fontWeight: 650
    lineHeight: 1.15
    letterSpacing: "-.025em"
  title:
    fontFamily: "\"Inter Variable\", ui-sans-serif, system-ui, sans-serif"
    fontSize: "24px"
    fontWeight: 700
    lineHeight: 1.3
    letterSpacing: "-.015em"
  section:
    fontFamily: "\"Inter Variable\", ui-sans-serif, system-ui, sans-serif"
    fontSize: "18px"
    fontWeight: 700
    lineHeight: 1.4
  body:
    fontFamily: "\"Inter Variable\", ui-sans-serif, system-ui, sans-serif"
    fontSize: "16px"
    fontWeight: 400
    lineHeight: 1.5
  interface:
    fontFamily: "\"Inter Variable\", ui-sans-serif, system-ui, sans-serif"
    fontSize: "14px"
    fontWeight: 400
    lineHeight: 1.5
  button:
    fontFamily: "\"Inter Variable\", ui-sans-serif, system-ui, sans-serif"
    fontSize: "14px"
    fontWeight: 550
    lineHeight: 1.4
  help:
    fontFamily: "\"Inter Variable\", ui-sans-serif, system-ui, sans-serif"
    fontSize: "12px"
    fontWeight: 400
    lineHeight: 1.5
rounded:
  control: "8px"
  panel: "12px"
  option: "6px"
  badge: "5px"
  small: "4px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "16px"
  lg: "24px"
  xl: "40px"
components:
  button-primary:
    backgroundColor: "{colors.accent}"
    textColor: "{colors.on-accent}"
    typography: "{typography.button}"
    rounded: "{rounded.control}"
    padding: "8px 14px"
  button-primary-hover:
    backgroundColor: "{colors.accent-hover}"
  button-secondary:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.text}"
    typography: "{typography.button}"
    rounded: "{rounded.control}"
    padding: "8px 14px"
  button-quiet:
    backgroundColor: "transparent"
    textColor: "{colors.text}"
    typography: "{typography.button}"
    rounded: "{rounded.control}"
    padding: "8px 14px"
  button-danger:
    backgroundColor: "{colors.danger}"
    textColor: "{colors.bg}"
    typography: "{typography.button}"
    rounded: "{rounded.control}"
    padding: "8px 14px"
  input:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.text}"
    rounded: "{rounded.control}"
    padding: "9px 12px"
  navigation-item:
    backgroundColor: "transparent"
    textColor: "{colors.muted}"
    rounded: "{rounded.control}"
    padding: "10px 14px"
  badge:
    backgroundColor: "{colors.raised}"
    textColor: "{colors.muted}"
    rounded: "{rounded.badge}"
    padding: "3px 8px"
  panel:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.text}"
    rounded: "{rounded.panel}"
    padding: "24px"
---

# Design System: Formative

## Overview

**Creative North Star: "Operate workspace"**

Formative uses a restrained Operate workspace: compact review tools surround a generous interactive prototype. Cool blue-gray neutrals, a blue action accent, and a single sans-serif family keep navigation, scenario controls, and feedback coherent. Formative is independent of Planboard.

The shell and component catalog share semantic light and dark roles. Generated sites keep their own composition within the preview while using consistent controls. The implemented source of truth is `src/design/theme.css`, with workspace composition in `src/renderer/shell.css`; this document records that system rather than prescribing a separate palette.

**Key Characteristics:**

- Compact review chrome and a distinct prototype surface.
- Shared semantic colors across light and dark themes, including expanded controls.
- Real content groups, quiet borders, and restrained overlay shadows.
- Recoverable feedback and revision workflows with visible state.

## Colors

The palette is cool and low-chroma, with blue reserved for actions, links, selection, and focus. Exact light values and their `dark-` counterparts are recorded in the frontmatter; they map directly to the `--f-*` properties.

### Primary

`accent` is the blue action color; `accent-hover` is its hover state and `on-accent` is its paired foreground. Dark mode uses a pale blue accent with a deep blue foreground. `focus` is a separate outline role.

### Neutral

`bg` is the workspace background, `surface` is the panel/control background, and `raised` marks hovered or selected rows and inset groups. `text`, `muted`, and `border` support the same hierarchy in both themes. These are cool blue-gray neutrals, not warm paper tones.

### Status

`danger`, `success`, and `warning` each have an explicit background partner. Preserve the pairing for messages and badges; ordinary informational states use the neutral raised surface. Text selection uses accent/on-accent. Native controls receive the theme's `color-scheme`, `accent-color`, and caret/scrollbar roles.

**The Shared Roles Rule.** Switch semantic values on `.f-theme[data-theme=dark]`; preserve component styling and state meaning across themes.

## Typography

**Body and heading font:** Inter Variable, with ui-sans-serif, system-ui, and sans-serif fallbacks. No separate display or mono family is established. Lucide supplies SVG icons.

Prototype body text is 16px/1.5; shell text is 14px/1.5. Shared h1 headings use 650 weight and the fluid headline size in frontmatter; site heroes use the larger hero role. H2 is 24px/1.3 and h3 is 18px/1.4, both retaining the browser's bold heading weight. Buttons use 14px at 550 weight. Field labels use 14px at 550; help text uses 12px/1.5 and reserves 18px of height. General text is constrained to 72ch; overview prose may use 75ch.

Shell hierarchy is intentionally denser: preview titles are 20px/1.4; map/catalog page titles are 30px, reducing to 26px below 700px. Context titles are 14–15px, with 11–13px metadata. Tables and range outputs use tabular numerals. These shell overrides are not replacements for prototype headings.

## Layout

The desktop shell has a 64px header and a 220px sidebar beside a flexible main column. Review context is an optional 292px column. Preview padding is 20px 24px; the stage and prototype have 580px minimum heights. Narrow preview caps the stage at 390px. The prototype is an inline-size container named `prototype`.

At 1700px and wider, context grows to 320px, preview padding becomes 24px 40px, and the stage has a 1300px cap. At 1150px and narrower, the sidebar becomes 180px, the toolbar stacks, context moves below the prototype in two columns, and revision metadata hides. At 700px and narrower, navigation becomes a horizontal strip; screen/journey sections hide, connection/history remain available, context becomes one column, and preview minimum height becomes 480px. The header wraps and export retains its labeled icon control. Catalog navigation becomes a scrollable list capped at 160px.

Shared spacing roles are 4, 8, 16, 24, and 40px. Small local gaps and shell metadata padding also use intermediate values; the implementation is not an exclusively 8px grid. Content containers cap at 560px, 960px, or 1280px. Grids support one through six equal columns, settings use a two-column label/control layout, and split views use 1:2 or 1:1 proportions.

At a prototype container width of 600px or less, grids, settings, and split views become one column; extra-large padding becomes 20px, horizontal stacks wrap, hero padding halves, and steps wrap. A 600px viewport fallback applies similar changes and reduces dialog padding to 20px. Container and viewport queries are separate: a narrow preview can adapt while the outer desktop shell stays wide. Tables keep no-wrap cells inside their own scrolling container.

## Elevation & Depth

Most resting surfaces use a 1px border and tonal separation. Panels, cards, tables, and the preview stage do not use decorative shadows. Popovers and dialogs share `--f-overlay-shadow: 0 12px 40px #18243626`; the same shadow currently applies in both themes. Backdrops use `#101c2d80`.

Prototype dialog overlay/content use z-index 40/41, popovers 50, and tooltips 60. The transformed prototype and specimen roots establish the containing block for their fixed overlays, keeping them within the review surface. The preview stage clips overflow. Workspace history uses a global backdrop at 90 and centered content at 101, with its own themed wrapper and return-focus behavior.

**The Overlay Boundary Rule.** Prototype overlays use the preview portal container; workspace history uses a separate themed global portal. Preserve both boundaries.

State transitions use 140ms ease-out for background, border, and switch movement. Loading indicators rotate over 1s linearly; reduced-motion mode disables animations and transitions and restores automatic scroll behavior. Tooltip delay is 200ms.

## Shapes

Controls and navigation use 8px corners; panels, tables, preview stages, dialogs, and popovers use 12px. Options and calendar cells use 6px, badges use 5px, and small metadata/file-button surfaces use 4px. Avatars are circular; switches have a pill track and circular thumb. Drawers are square-edged. These exceptions are established component roles, not alternate global radius systems.

## Components

### Buttons

Quiet, compact controls with 8px corners, 8px 14px padding, an 8px icon gap, and a 1px border. Standard, compact, and comfortable sizes set minimum heights of 40px, 32px, and 48px. Labels may wrap. Primary uses accent/on-accent and accent-hover; secondary uses surface/text with a border; quiet is transparent. Secondary and quiet hover use raised. Danger uses danger with the theme background as its foreground. Disabled controls use 0.6 opacity and a disabled cursor; loading buttons are disabled and show a spinner. Focus is a 2px focus-colored outline with a 3px offset.

### Inputs / Fields

Fields use a surface fill, 1px border, 8px radius, and 9px 12px padding. Label, control, and help/error form a vertical group with a 6px gap. Errors change the border and supporting message to danger, preserving the help row. Textareas grow between 100px and 320px; the shell feedback textarea instead starts at 120px and uses the background role. Search uses a 2px focus-within outline with a 2px offset. Native range controls expose a numeric output; switches, checkboxes, and radio controls retain native keyboard semantics. File selection opens an OS-owned dialog outside the styling boundary.

### Navigation

Prototype navigation wraps with a 4px gap, 10px 14px item padding, and an 8px radius. Hover/current/selected states use raised/text rather than introducing another color. Tabs add a bottom divider and support arrow/Home/End movement. Shell navigation uses compact 13px text and a 600-weight active state. Mobile treatment follows Layout.

### Badges and status

Neutral badges use raised/muted, 3px 8px padding, 5px radius, and 12px text. Success, warning, and danger variants use semantic pairs. Alerts use 16px padding and the control radius; danger alerts expose an alert role, other notices a status role. Status text remains visible alongside color.

### Panels and tables

Panels use surface fill, a 1px border, 12px corners, and 24px padding, with a 16px internal stack gap. Tables use 14px text, 12px 16px cell padding, raised headers, and an independently scrollable border container. Lists use bottom separators and spacing instead of card shells around every item. Empty states center a real explanation and any action inside 48px 24px padding.

### Overlays

Radix primitives manage dialog, menu, popover, select, and tooltip behavior. Prototype portals receive `PreviewContext.overlay`. Dialogs are centered, 24px padded, capped at 520px or viewport width minus 32px, and scroll above a maximum height of viewport minus 40px. Drawers align to the right, fill their containing block height, and remove corner rounding. Popovers are 8px padded, at least 180px wide, at most 360px or viewport minus 32px, and scroll beyond 400px height. Tooltips invert text/background roles, use 13px text, and cap at 280px. History has a global 520px/viewport-minus-32px width and 85vh height cap. Preview and specimen clipping/containing blocks must be checked for long content; viewport-based size formulas do not themselves guarantee a fit inside every preview.

### Review workspace

The default preview fills the available viewport below a compact charcoal Formative review toolbar (about 59px on desktop and 136px at 390px wide). The Members screen selector sits beside the scenario selector. Workspace mode is available through `?view=workspace`; Expand restores the canvas. Feedback is a 360px/max-94vw charcoal overlay that never changes the prototype viewport width. Simulation options open on demand. Existing workspace mode remains available through `?view=workspace`. Charcoal and chromatic review tokens belong only to host controls, including history; the prototype retains its own light/dark palette.

Select mode outlines the hovered prototype element with the focus role, uses a crosshair, and connects selection to the context panel. Select stays filled while inspecting or while a feedback target remains selected. Clicking the active Select button or pressing Escape clears selection. Context preserves feature purpose, expandable rules, feedback, status, and retry actions. Revision history restores by creating a new revision and preserving feedback; its confirmation and focus restoration belong to the shell. Component specimens expose default, long-content, disabled, read-only, and loading choices where supported. JSON prototypes select semantic variants and sizes; they do not accept arbitrary CSS or executable markup.

## Do's and Don'ts

### Do:

- Do reuse semantic variants, spacing roles, and shared controls for new components.
- Do check light and dark themes with menus, validation, disabled controls, and dialogs expanded.
- Do preserve reserved field help space, visible focus, dismissal, and return focus.
- Do use Lucide SVG icons and keep supporting copy in normal sentence case.
- Do preserve feedback, show failures, and keep retry or recovery actions available.

### Don't:

- Don't describe the implemented cool neutral palette as warm or inherit Planboard styling.
- Don't use arbitrary component colors or inject raw styles, class names, HTML, or scripts through prototype JSON.
- Don't turn every text group into a card; use the existing borders and spacing for ordinary lists.
- Don't replace prototype-scoped overlays with unthemed document-body portals.
- Don't style OS-owned file dialogs as though they were part of the theme boundary.

## Chromatic review controls

The user requested a charcoal host with chromatic rainbow buttons and boxes. Review surfaces stay charcoal (#191a1d) regardless of the prototype's light/dark theme. Elevated controls use #24262b; hover uses #30333b; text #f5f3f7; secondary text #b7bac4. The review spectrum runs cyan #80e8df, blue #91baff, violet #caafff, pink #f4a9d0, peach #ffd092, lime #d9ec9b at 110 degrees. Primary actions use that fill with dark #17191d text. Secondary controls, inputs, selects, selected-element boxes, and simulation/history panels use a thin spectrum border and a solid charcoal interior. Disabled controls use neutral surfaces and readable secondary text. Prototype and catalog specimen themes remain scoped to their own .f-theme roots.

A compact status in the toolbar reports the prototype subagent phase; its full label remains accessible when the mobile view shows only the status dot. Connection text in the feedback panel explains availability. Feedback delivery runs independently of the main chat.

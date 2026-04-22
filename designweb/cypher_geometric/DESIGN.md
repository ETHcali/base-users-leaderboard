# Design System Document: Cypher Terminal / ETH Cali

## 1. Overview & Creative North Star

### Creative North Star: "The Sacred Architect"
This design system is a synthesis of high-stakes cryptographic precision and ancient geometric harmony. It moves beyond the typical "hacker" aesthetic into a realm of digital editorialism. We are not building a simple dashboard; we are building a sanctum for data.

The system rejects the standard "boxed-in" web look. Instead, it utilizes **intentional asymmetry**, **monumental typography**, and **tonal layering** to create a sense of infinite depth. By blending the cold, calculated lines of a terminal with the intricate, soulful patterns of sacred geometry, we create an experience that feels both technically superior and spiritually resonant.

---

## 2. Colors

The palette is anchored in deep charcoals and an "Electric Blue" that serves as the system's pulse.

### The Palette (Material Design Tokens)
*   **Primary:** `#C0C1FF` (The Glow)
*   **Primary Container:** `#2E3192` (The Electric Deep Blue)
*   **Surface:** `#131314` (The Void)
*   **Surface Container (Lowest to Highest):** `#0E0E0F` to `#353436`
*   **On-Surface:** `#E5E2E3` (The Data)

### The "No-Line" Rule
To maintain a high-end editorial feel, **1px solid borders are prohibited for sectioning.** Structural boundaries must be defined through:
1.  **Background Shifts:** Use `surface-container-low` for a main section and `surface-container-high` for an inner module.
2.  **Geometric Overlays:** Use sacred geometry line art (10-15% opacity) to subtly "frame" content areas without closing them off.

### Glass & Gradient Strategy
Standard flat buttons are insufficient for this identity. 
*   **Signature CTAs:** Use a linear gradient from `primary-container` (#2E3192) to `primary` (#C0C1FF) at a 135-degree angle.
*   **Floating Modules:** Apply `surface-variant` with a 60% opacity and a `20px` backdrop-blur to create a "frosted obsidian" effect.

---

## 3. Typography

The typographic system is a dialogue between the human-centric modernism of **Plus Jakarta Sans** and the machine-logic of **Space Grotesk**.

*   **Display & Headlines (Plus Jakarta Sans):** Used for brand statements and major section headers. It should feel bold and authoritative.
    *   *Role:* Editorial impact, storytelling, and high-level navigation.
*   **Titles, Body, & Labels (Space Grotesk):** This monospace-adjacent sans-serif brings the "Terminal" aesthetic into the readable realm.
    *   *Role:* Data visualization, technical specifications, and instructional text.

**Hierarchy as Identity:** Use extreme scale contrast. A `display-lg` header paired with a `label-sm` technical timestamp creates the "Cypher" look—merging the macro brand with the micro data.

---

## 4. Elevation & Depth

We eschew traditional drop shadows for **Tonal Layering** and **Ambient Glows**.

*   **The Layering Principle:** Depth is achieved by "stacking" surface tiers. A card using `surface-container-lowest` placed upon a background of `surface` creates a natural, recessed "well" for data.
*   **The Ghost Border:** If a border is required for accessibility, use the `outline-variant` token at **15% opacity**. This creates a "suggestion" of a boundary rather than a hard wall.
*   **Electric Glows:** Instead of black shadows, use the `primary-container` color (#2E3192) for shadows on active elements. Set blur to `30px` and opacity to `10%` to mimic the glow of a high-end terminal monitor.
*   **Sacred Geometry Overlays:** Backgrounds should never be flat. Layer subtle, repeating geometric patterns (from IMAGE_2) behind the main content containers at `5%` opacity to add "soul" to the darkness.

---

## 5. Components

### Buttons
*   **Primary:** High-gloss gradient (Electric Blue to Glow). **0px Border Radius.** Sharp corners signify precision.
*   **Secondary:** Ghost Border (15% opacity) with `primary` text. No fill.
*   **State Change:** On hover, primary buttons should emit an ambient blue glow (`primary-container` shadow).

### Input Fields
*   **Styling:** Underline-only or subtle background shift (`surface-container-high`). Forbid the "four-sided box" look.
*   **Focus:** The underline transitions to a `2px` Electric Blue with a subtle outer glow.

### Cards & Lists
*   **No Dividers:** Use `16px` or `24px` of vertical whitespace to separate list items. 
*   **Terminal Rows:** For data lists, use alternating background tints (`surface-container-low` vs `surface-container-lowest`) to guide the eye without adding visual clutter.

### Signature Component: The "Sacred Data Block"
A content container that uses a "Ghost Border" and a small, high-opacity geometric glyph (ETH Diamond) in the top-right corner to denote verified data.

---

## 6. Do's and Don'ts

### Do:
*   **Embrace the Grid:** Align text to a strict terminal-style grid, but allow imagery and sacred geometry patterns to break the grid and bleed off-screen.
*   **Use Sharp Corners:** The `roundedness scale` is strictly **0px**. Any radius ruins the "terminal" precision.
*   **Layer Textures:** Combine monospace labels with semi-transparent glass modules for a "heads-up display" (HUD) feel.

### Don't:
*   **Don't Use Pure White:** Use `on-surface` (#E5E2E3) for text. Pure white is too harsh for the "Cypher" dark mode.
*   **Don't Use Standard Shadows:** Avoid heavy, muddy black shadows. If it doesn't glow or shift in tone, it doesn't belong.
*   **Don't Crowd the Patterns:** Sacred geometry is a "vibe," not a foreground element. Keep it subtle so it doesn't interfere with data readability.
*   **Don't Use Dividers:** If you feel the urge to draw a line, use a margin instead. Let the hierarchy do the work.

---
**Director’s Final Note:** This design system is about the tension between the mechanical and the mystical. Keep the data cold (monospace, sharp edges) and the atmosphere warm (glows, gradients, and geometric soul).
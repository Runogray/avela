# Figma → Code Integration Rules (Avela Frontend)

Rules for translating Figma designs into this codebase via the Figma MCP. Read this
before generating any component or page from a Figma frame. The goal is output that
looks hand-written by this team: same tokens, same component primitives, same patterns.

> **Hard rule — never hardcode design values.** Figma will hand you raw hex, px, and
> font names. Map every one of them to the tokens below. A literal `#184a3c`,
> `border-radius: 24px`, or `Fraunces` in generated code is a bug.

---

## 0. Stack at a glance

| Concern        | Choice                                              |
| -------------- | --------------------------------------------------- |
| Framework      | **Next.js 16.2.9**, App Router (`src/app`)          |
| UI library     | **React 19.2.4** (Server Components by default)     |
| Language       | **TypeScript 5**, `strict: true`                    |
| Styling        | **Tailwind CSS v4** (CSS-first config, no JS config)|
| Class merging  | `tailwind-merge` via `src/lib/cn.ts`                |
| Fonts          | `next/font/google` (Fraunces + Hanken Grotesk)      |
| Linting        | `eslint-config-next` (core-web-vitals + typescript) |
| Icons          | **Emoji + inline SVG** — no icon library            |
| Path alias     | `@/*` → `./src/*`                                    |

> ⚠️ **This is not the Next.js in your training data.** Per `AGENTS.md`, this Next.js
> version has breaking changes. When unsure about an API, read the relevant guide in
> `node_modules/next/dist/docs/` before writing code.

---

## 1. Design tokens

### Where they live
**All tokens are defined in one place:** `src/app/globals.css`, inside the Tailwind v4
`@theme` block. There is **no `tailwind.config.js`** — Tailwind v4 is configured in CSS.

```css
/* src/app/globals.css */
@import "tailwindcss";

@theme {
  /* ---- Palette ---- */
  --color-porcelain: #faf6f0;     /* page background — warm, not cream */
  --color-shell: #f2ebe1;          /* raised / muted surface */
  --color-ink: #26201d;            /* primary text — warm near-black */
  --color-ink-soft: #7a6b61;       /* secondary text */
  --color-evergreen: #184a3c;      /* primary — trust, "go" */
  --color-evergreen-deep: #10342a;
  --color-coral: #ec6a4e;          /* accent — celebration, CTA */
  --color-coral-deep: #d9543a;
  --color-champagne: #e7c690;      /* premium — seals, milestones */
  --color-blush: #f3d9cf;          /* soft tag — birthday / baby shower */
  --color-line: #e8ddcf;           /* hairline */

  /* ---- Radius ---- */
  --radius-sm: 10px;
  --radius-md: 16px;
  --radius-lg: 24px;
  --radius-pill: 999px;

  /* ---- Shadow ---- */
  --shadow-keepsake: 0 2px 4px rgba(38,32,29,0.04), 0 10px 28px rgba(38,32,29,0.07);
  --shadow-keepsake-sm: 0 1px 2px rgba(38,32,29,0.05), 0 4px 12px rgba(38,32,29,0.05);

  /* ---- Type ---- */
  --font-display: var(--font-fraunces), Georgia, serif;
  --font-body: var(--font-hanken), system-ui, sans-serif;

  /* ---- Easing ---- */
  --ease-keepsake: cubic-bezier(0.22, 1, 0.36, 1);
}
```

### How tokens become utility classes (Tailwind v4)
A `@theme` variable named `--color-evergreen` **automatically** generates utilities:
`bg-evergreen`, `text-evergreen`, `border-evergreen`, etc. Same for `--radius-*`
(`rounded-lg`), `--shadow-*` (`shadow-keepsake`), `--font-*` (`font-display`).

### Mapping table — use this when reading a Figma frame
| Figma gives you            | Use in code                                   |
| -------------------------- | --------------------------------------------- |
| `#faf6f0` (page bg)        | `bg-porcelain`                                |
| `#f2ebe1` (surface)        | `bg-shell`                                     |
| `#26201d` (heading/body)   | `text-ink`                                     |
| `#7a6b61` (muted text)     | `text-ink-soft`                                |
| `#184a3c` (primary)        | `bg-evergreen` / `text-evergreen` / `border-evergreen` |
| `#ec6a4e` (CTA)            | `bg-coral` / `text-coral`                      |
| `#e7c690` (premium/seal)   | `champagne`                                    |
| `#f3d9cf` (birthday tag)   | `blush`                                        |
| `#e8ddcf` (1px divider)    | `border-line`                                  |
| radius 10/16/24/999        | `rounded-sm` / `rounded-md` / `rounded-lg` / `rounded-pill` |
| serif font                 | `font-display`                                 |
| sans font                  | `font-body`                                    |
| the standard card shadow   | `shadow-keepsake` (or `-sm`)                   |

**No token match?** Prefer the nearest token. Only use an arbitrary value
(`bg-[#abc123]`, `rounded-[20px]`) if the design genuinely introduces a new value —
and if it recurs, **add it to `@theme` first**, then use the generated utility.

### Verify tokens live with the MCP
Before mapping, pull the Figma file's variables and cross-check names/values:
- `get_variable_defs` — returns the design's variables (the source of truth for tokens)
- `get_design_context` / `get_screenshot` — structure + visual reference

---

## 2. Styling approach

- **Utility-first Tailwind v4.** No CSS Modules, no styled-components, no CSS-in-JS.
- **Global CSS** is only `src/app/globals.css`: the `@theme` block, base element styles
  (`body`, `h1–h3`), helper classes (`.money`, `.font-display`), keyframes
  (`rise`, `pop` → `.animate-rise`, `.animate-pop`), `::selection`, `:focus-visible`,
  and a `prefers-reduced-motion` block. There are no other `.css` files.
- **Always merge classes with `cn()`** so overrides win predictably:

  ```ts
  // src/lib/cn.ts
  import { twMerge } from "tailwind-merge";
  export function cn(...parts: Array<string | false | null | undefined>): string {
    return twMerge(parts.filter(Boolean).join(" "));
  }
  ```

- **Typography intent matters.** The serif (`font-display`, Fraunces) carries emotional
  weight — names, headings, wishes. **Never** use it for UI labels or numbers. Body/UI
  and every number uses `font-body` (Hanken). Headings `h1–h3` already default to the
  serif via `globals.css` base styles, so don't re-apply `font-display` to them.
- **Money** always uses the `.money` class (`font-variant-numeric: tabular-nums`) and is
  formatted with helpers from `src/lib/money.ts` (`naira()`), in integer **kobo**.
- **Responsive** is plain Tailwind breakpoint prefixes (`sm:`, `md:` …). Default styles
  are mobile; layer larger screens on top. Example from `Modal.tsx`:
  `flex items-end ... sm:items-center sm:p-6` (bottom sheet on mobile, centered on desktop).
- **Motion** uses the shared `--ease-keepsake` curve, e.g.
  `ease-[var(--ease-keepsake)]`, and the `animate-rise` / `animate-pop` classes. Keep
  entrances gentle and reuse these rather than inventing new keyframes.

---

## 3. Components

### Location & layering
```
src/components/
  ui/      → design-system primitives (Button, Card, Chip, Field, Modal,
             Progress, Seal, Toggle, WishNote)
  site/    → chrome (SiteHeader, SiteFooter, Wordmark)
  event/   → feature flows (EventView, GiftFlow, ReserveFlow, RsvpFlow,
             WishForm, ShareButton)
```
When implementing a Figma frame: **reuse a `ui/` primitive if one fits.** Build a new
primitive only for a genuinely new pattern, and put feature-specific composition in a
feature folder (e.g. `event/`), not in `ui/`.

### Architecture conventions
- **Function components**, named exports (not default), e.g. `export function Button(...)`.
- **Server Components by default.** Add `"use client"` **only** when the component needs
  state, effects, or event handlers (see `Field`, `Toggle`, `Modal`, and the `event/*`
  flows). Presentational primitives like `Button`, `Card`, `Chip`, `Seal`, `Progress`
  stay server components.
- **Variant pattern** — the house style for a primitive with variations: a `BASE` string,
  a `SIZE` map, and a `VARIANT` `Record<...>`, composed with `cn()`. Match this exactly:

  ```tsx
  // src/components/ui/Button.tsx (abridged)
  type Variant = "primary" | "secondary" | "secondaryLight" | "ghost";

  const BASE =
    "inline-flex items-center justify-center gap-2 rounded-pill font-body font-semibold " +
    "transition-all duration-150 ease-[var(--ease-keepsake)] disabled:opacity-55";

  const SIZE = {
    sm: "px-4 py-2.5 text-[14px]",
    md: "px-[22px] py-[13px] text-[15px]",
    lg: "px-7 py-4 text-[16px]",
  };

  const VARIANT: Record<Variant, string> = {
    primary: "bg-coral text-white hover:bg-coral-deep active:scale-[0.98]",
    secondary: "border-[1.5px] border-evergreen text-evergreen hover:bg-evergreen hover:text-white",
    secondaryLight: "border-[1.5px] border-white/45 text-[#FDF8EF] hover:bg-white hover:text-evergreen",
    ghost: "bg-shell text-ink hover:bg-[#E9E0D2]",
  };

  export function Button({ variant = "primary", size = "md", fullWidth, className, ...rest }) {
    return <button className={cn(BASE, SIZE[size], VARIANT[variant], fullWidth && "w-full", className)} {...rest} />;
  }
  ```

- **Props**: typed inline, sensible defaults (`variant = "primary"`), always accept an
  optional `className` last and pass it into `cn()` so callers can override.
- **Links vs buttons**: navigation uses `next/link` (`ButtonLink`), actions use `<button>`.
- **Accessibility is built in, not bolted on.** Follow the existing examples:
  `role="dialog"` + `aria-modal` (Modal), `role="switch"` + `aria-checked` (Toggle),
  `role="progressbar"` + `aria-valuenow/min/max` (Progress), `aria-hidden` on decorative
  marks (Seal), labelled inputs via `Field`. Carry Figma's semantic intent into ARIA.

### Brand-specific primitives to know
- **`Card` is the atom.** Every object (event, wishlist item, contribution, wish) is a
  `Card`: `rounded-lg border border-line bg-white shadow-keepsake-sm`. Use it; don't
  re-derive card styling inline.
- **`Seal`** is the signature wax-stamp (verified / claimed / goal). Used sparingly,
  never decoration. It's the one place "boldness is spent."
- **`CoverArt`** (in `Card.tsx`) is the warm radial-gradient placeholder where a cover
  image will sit — use it instead of inventing image placeholders.

### Documentation
There is **no Storybook** and no separate component docs. The components themselves —
with their leading doc comments stating intent — are the reference. Preserve and write
those intent comments when adding primitives.

---

## 4. Assets & images

- **No `next/image` usage today** and no remote image config in `next.config.ts`. If a
  Figma frame requires a real raster image, prefer `next/image`, and add the domain to
  `next.config.ts` `images.remotePatterns` if it's remote.
- **`public/`** holds static SVGs but they are unused `create-next-app` boilerplate
  (`file.svg`, `globe.svg`, `next.svg`, `vercel.svg`, `window.svg`) — don't treat them as
  brand assets.
- **Visual placeholders** are drawn with CSS, not images: `CoverArt` uses layered
  `radial-gradient`s in brand colors. Reuse that approach for empty/cover states.
- **Exporting assets from Figma:** use the MCP `download_assets` / `upload_assets` tools.
  Save exported images under `public/` and reference with a root-relative path
  (`/my-asset.png`). Optimize/serve real photos through `next/image`.

---

## 5. Icon system

- **There is no icon library** (no lucide, react-icons, heroicons, etc.) and no SVG icon
  components.
- **Emoji are the icon system.** They're passed as data and rendered inline, e.g.
  occasion markers (`💍` wedding, `🎂` birthday, `🍼` baby shower), feature glyphs
  (`💌 🎁 📝 ✨`), and RSVP states (`🎉 🤔 💌`). See `RsvpFlow.tsx`, `EventView.tsx`,
  `app/page.tsx`, and `CoverArt`'s `emoji` prop.
- **Inline SVG** is used only for true custom marks (the wax `Seal` uses gradients +
  a unicode `✓` for `SealTick`), not an icon set.
- **When Figma uses an icon:** first try to represent it with the established emoji
  vocabulary. If a real vector is required, inline it as a small SVG (currentColor,
  `aria-hidden="true"` when decorative) rather than adding an icon dependency. Don't
  introduce an icon library without a deliberate decision.

---

## 6. Project structure

```
frontend/
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── layout.tsx          # root layout: fonts + metadata + <html>/<body>
│   │   ├── globals.css         # @theme tokens + base styles (the ONLY css file)
│   │   ├── page.tsx            # home
│   │   ├── not-found.tsx
│   │   ├── create/page.tsx
│   │   ├── e/[slug]/page.tsx   # dynamic event page
│   │   ├── fees/page.tsx
│   │   └── login/page.tsx
│   ├── components/
│   │   ├── ui/                 # primitives
│   │   ├── site/               # chrome
│   │   └── event/              # feature flows
│   └── lib/                    # cn, date, events, mock, money, types
├── public/                     # static (boilerplate svgs only)
├── next.config.ts
├── postcss.config.mjs          # @tailwindcss/postcss
├── tsconfig.json               # paths: @/* -> ./src/*
├── eslint.config.mjs
├── AGENTS.md / CLAUDE.md       # CLAUDE.md just imports AGENTS.md
└── package.json
```

Conventions:
- **Routing**: file-system App Router. A new screen = a folder under `src/app/` with a
  `page.tsx`. Dynamic segments use `[param]` (see `e/[slug]`).
- **Imports**: always use the `@/` alias (`@/lib/cn`, `@/components/ui/Button`), never
  long relative chains.
- **`lib/`**: pure logic and data helpers — `cn` (classnames), `money` (kobo/naira),
  `date`, `types`, `events`, `mock`. Keep formatting/business logic here, out of
  components.
- **Fonts**: declared once in `layout.tsx` via `next/font/google`, exposed as
  `--font-fraunces` / `--font-hanken` on `<html>`, and consumed through the
  `--font-display` / `--font-body` theme tokens. Don't import fonts elsewhere.

---

## 7. Figma MCP workflow (recommended order)

1. **Read the design** — `get_metadata` (frame structure), `get_screenshot` (visual),
   `get_design_context` (layout + content).
2. **Resolve tokens** — `get_variable_defs`; map every variable to a `@theme` token via
   the table in §1. Flag any value with no token instead of hardcoding it.
3. **Match components** — identify which existing `ui/` primitive(s) the frame is built
   from. Check `get_code_connect_map` for any Figma-component → code-component mappings;
   reuse them. Only create a new primitive for a genuinely new pattern.
4. **Generate code** — App Router page or component, Server Component unless it needs
   interactivity, variant pattern + `cn()`, brand typography rules, ARIA carried over.
5. **Verify** — `npm run lint`, confirm no hardcoded hex/px/font literals, confirm
   serif is used only for emotional copy, money uses `.money` + `naira()`.

> Before calling `use_figma`, read the `/figma-use` skill. For design-to-code use
> `/figma-generate-design`; for building/extending the design system in Figma use
> `/figma-generate-library`; for mapping components use `/figma-code-connect`.

---

## 8. Quick "don'ts"

- ❌ Don't hardcode colors, radii, shadows, or font names — use tokens.
- ❌ Don't add a `tailwind.config.js` — config is CSS-first in `globals.css`.
- ❌ Don't add CSS Modules / styled-components / a second stylesheet.
- ❌ Don't use the serif (`font-display`) for UI labels or numbers.
- ❌ Don't add an icon library — use emoji / inline SVG.
- ❌ Don't use floats for money — integer kobo + `naira()`.
- ❌ Don't add `"use client"` unless the component truly needs interactivity.
- ❌ Don't use relative import chains — use the `@/` alias.
- ❌ Don't assume Next.js APIs from memory — this version has breaking changes
  (`AGENTS.md`); check `node_modules/next/dist/docs/`.

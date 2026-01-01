# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- **Responsive controls layout**: Controls/buttons repositioned below chart on mobile devices (< 769px) using CSS flexbox ordering
  - Mobile breakpoints: small (< 375px), medium (375-480px), large (480-600px), tablet (600-768px)
  - Desktop (≥ 769px): Controls remain next to header (horizontal row layout)
  - Implementation: HTML restructure (`.controls` moved outside `.chart-header`) + CSS `order` properties

### Changed
- **Default animation mode**: Changed from "Cumulatif" (cumulative) to "Quotidien" (daily) mode
  - Speed invariant preserved at 1200ms (reduced speed for daily mode readability)
  - Button state reflects daily mode on load (highlighted, correct icon/label)
- **Button order in controls**: Reordered for logical grouping
  - New order: Play → Pause → Reset → Sound → **Pattern (accessibility)** → **Help (shortcuts)** → Theme → Speed → Mode → Scale
  - Rationale: Accessibility pattern toggle grouped with help/theme utility buttons

### Added
- **Custom D3.js bundle**: Minimal bundle with only needed modules (51KB vs 93KB, 43% reduction)
- **Self-hosted fonts**: Roboto (400, 500) and Source Serif 4 (variable) served locally
- **Font preloading**: Critical fonts preloaded via `<link rel="preload">`
- **Build script**: `npm run build:d3` to generate custom D3 bundle via esbuild
- **Social sharing buttons**: Delta Chat, Signal, WhatsApp platforms with privacy-focused ordering
- **X/Twitter memorial**: Greyed button (2006-2023) linking to EU DSA fine article
- **URL unfurling pipeline**: DoH-proxy + browser automation fallback chain (curl-doh → camoufox → playwright-stealth)
- **Makefile targets**: `unfurl`, `unfurl-fallback`, `clean-cache`, `build-complete`, `commit`
- **Telerama avatar**: Local copy for outlet reliability
- **Build version in footer**: `v{{BUILD_HASH}}` displayed next to "Code source" link
- **Favicon**: Updated to use revue-de-presse.org icon

### Changed
- **D3.js loading**: Deferred via `defer` attribute, wrapped in `DOMContentLoaded` for compatibility
- **Font loading strategy**: Eliminated Google Fonts external requests, self-hosted with `font-display: swap`
- **CSS containment**: Added `contain: layout style` to chart containers to prevent CLS
- **Font fallback metrics**: `size-adjust`, `ascent-override`, `descent-override` for smooth font swap
- **Signal share button**: Replaced non-functional `sgnl://send?text=` with Web Share API + clipboard fallback
- **Publication stats order**: Reposts now displayed on left, likes on right in theme/keyword popup
- **Text cleaning**: Build-time sanitization (escape sequences, typography, encoding artifacts)
- **URL cleaning**: Comprehensive tracking parameter removal (UTM, AT Internet, fbclid, xtor, Echobox)
- **Share button order**: Copy link → Delta Chat → Signal → Email → Mastodon → Bluesky → LinkedIn → WhatsApp → X
- **Asset organization**: Moved telerama avatar to `assets/` directory
- **Hero logo**: Explicit width + height in mobile media queries to preserve square proportions

### Fixed
- **URL artifacts**: Stripped trailing quotes/ellipsis causing `%22` in resolved URLs
- **Tracking parameters**: Removed from 38 unfurled URLs (`at_platform=Bluesky`, etc.)
- **Text anomalies**: Fixed 3000+ articles with escaped quotes, newlines, mojibake
- **Logo aspect ratio**: Square proportions now preserved on all mobile viewports (375px, 480px, 768px)

### Technical
- **Core Web Vitals (Mobile)**: Performance 66% → 76%, FCP 3.5s → 1.2s (-66%), SI 3.5s → 1.4s (-60%)
- **Core Web Vitals (Desktop)**: Performance 93% → 98%, FCP 0.9s → 0.3s (-67%), SI 1.0s → 0.4s (-60%)
- **LCP element render delay**: 1783ms → 46ms (97% reduction from self-hosted fonts)
- **D3 modules included**: d3-selection, d3-scale, d3-array, d3-interpolate, d3-transition
- **Font files**: `fonts/roboto-400.woff2` (18KB), `fonts/roboto-500.woff2` (19KB), `fonts/source-serif-4-400.woff2` (122KB variable)
- **URL resolution**: 91.1% success rate (41/45 short URLs unfurled)
- **Text pipeline**: `cleanPublicationText()` → `normalizeTypography()` → `repairEncoding()`
- **Tracking params list**: utm_*, at_*, fbclid, gclid, xtor, Echobox, ref, source

### Design Decisions (2026-01-03 Session)

#### Mobile-First Controls Layout
- **Problem**: On mobile devices, controls above the chart compete for limited viewport space with the chart itself
- **Solution**: Use CSS flexbox with `order` properties to reposition controls below chart on mobile
- **Trade-off**: Required HTML restructure (moving `.controls` outside `.chart-header`) to enable CSS-only reordering
- **Breakpoint**: 769px threshold aligns with tablet/desktop distinction
- **Result**: Chart is immediately visible on mobile; controls accessible via scroll

#### Daily Mode as Default
- **Problem**: Cumulative mode shows ever-increasing bars which can obscure day-to-day variations in engagement
- **Solution**: Default to daily mode showing each day's engagement independently
- **Invariant**: Speed preserved at 1200ms to maintain readability in daily mode
- **Trade-off**: Users wanting cumulative view must toggle manually, but daily provides clearer per-day insights

#### Button Grouping Logic
- **Pattern**: Play/Pause/Reset/Sound (playback) → Pattern/Help/Theme (accessibility/utility) → Speed/Mode/Scale (chart settings)
- **Rationale**: Accessibility pattern toggle logically groups with help (keyboard shortcuts) and theme (visual preference)

### Design Decisions (ADR-social-sharing-buttons.md)

#### Signal Sharing Research (January 2026)
- **Problem**: `sgnl://send?text=` deep link doesn't work reliably on mobile
- **Finding**: Signal URL schemes (`signal.me`, `sgnl://`) are contact-sharing only, not message content
- **Solution**: Web Share API with clipboard fallback
  - Mobile: Opens native share sheet where user selects Signal
  - Desktop: Same experience where supported
  - Fallback: Copies text to clipboard with French alert message

#### Delta Chat Approach
- **Confirmed**: `mailto:` is the correct mechanism (Delta Chat is email-based)
- **Behavior**: Delta Chat intercepts `mailto:` on devices where it's the default mail handler
- **No custom scheme**: `openpgp4fpr://` exists but only for SecureJoin verification

#### Sources
- [Signal URI Scheme](https://shkspr.mobi/blog/2023/02/signals-newish-uri-scheme/)
- [Delta Chat URL Scheme Proposal](https://support.delta.chat/t/custom-deltachat-url-uri-scheme/346)
- [Web Share API - MDN](https://developer.mozilla.org/en-US/docs/Web/API/Navigator/share)

### Design Decisions (ADR-core-vitals.md)

#### Custom D3.js Bundle (January 2026)
- **Problem**: Full D3.js (93KB) is 77% unused; Lighthouse flagged as main JS bottleneck
- **Analysis**: Only 6 D3 functions used: `select`, `scaleLinear`, `scaleLog`, `scaleBand`, `max`, `interpolateNumber`
- **Solution**: Custom bundle via esbuild with only required modules
- **Trade-off**: Build-time dependency on esbuild, but output is static (GitHub Pages compatible)
- **Result**: 51KB bundle (43% smaller), eliminates "unused JavaScript" audit warning

#### Self-Hosted Fonts (January 2026)
- **Problem**: Google Fonts requests added ~1.8s to LCP element render delay
- **Root cause**: LCP element is text (`.wishes` paragraph) that depends on web fonts
- **Solution**: Download woff2 files, serve from `/fonts/` directory with preload hints
- **Trade-off**: 159KB added to repo, but eliminates 2 external DNS lookups + 7 font requests
- **Result**: Element render delay 1783ms → 46ms (97% reduction)

#### Font Fallback Metrics
- **Problem**: Font swap causes layout shift (CLS) when web font loads
- **Solution**: CSS `@font-face` with `size-adjust`, `ascent-override`, `descent-override` to match fallback font metrics to web font
- **Fallbacks**: Georgia for Source Serif 4, Arial for Roboto
- **Result**: CLS reduced, smoother perceived font loading

#### Deferred D3 Loading
- **Problem**: D3 script blocks initial render
- **Solution**: Add `defer` attribute, wrap initialization in `DOMContentLoaded`
- **Trade-off**: Slight code complexity (callback wrapper)
- **Result**: FCP improved 66% (3.5s → 1.2s on mobile)

#### Remaining Opportunities
- **Redirect chain (~900ms)**: Server/CDN configuration, not addressable in static files
- **D3 execution time (~1s TBT)**: Would require Web Workers or code splitting; diminishing returns

## [1.1.0] - 2026-01-01

### Added
- **Semainier navigation**: Sticky navigation bar with weeks grouped by meteorological seasons
- **Sentiment filter**: Emoji buttons to filter weeks by sentiment + "Tous" reset button
- **Colorblind patterns**: CSS patterns (stripes, dots, cross, etc.) on Semainier bars
- **Keywords foldable**: Restored theme keywords section with responsive grid
- **Word cloud popup**: Click on Semainier bars to see word cloud for that week/theme
- **Engagement example**: Top yearly publication displayed in methodology section
- **Android Play Store link**: Added to footer
- **Dynamic copyleft**: Footer with GNU emoji and dynamic year

### Changed
- Toggle button text: "Afficher/Masquer" instead of SVG arrow
- Share text: Pre-filled message with new year wishes
- Share section title: "Partager, c'est aimer" with gift emoji
- Made revue-de-presse.org clickable in hero banner
- Sentiment indicator: Fixed dimensions (100px x 95px)
- Calendar popup: Removed emoji for days without data

### Fixed
- Word cloud popup closing (click outside, Escape key, close button)
- Week filtering regex for word cloud
- Gap between Semainier title and navigation bar
- Engagement example not populating on lazy-load

## [1.0.0] - 2025-12-31

### Added
- Animated bar chart race visualization of French media trends on Bluesky
- Dynamic topic extraction via BERTopic (NLP)
- Lazy loading with monthly JSON data chunks
- Progressive Web App (PWA) support with offline capability
- Dark mode (auto-detection + manual toggle)
- Colorblind accessibility patterns (deuteranopia, protanopia)
- Keyboard navigation and ARIA attributes
- No-JavaScript fallback with tabular weekly summaries
- Social sharing (Mastodon, Email, Bluesky, LinkedIn, copy link)
- Clickable calendar navigation by month
- Service Worker for caching

### Technical
- **Data optimization**: Article text truncated to 200 characters
- **JSON chunking**: Data split by month for lazy loading
- **Build system**: Node.js script generating static HTML
- **Topic modeling**: Python BERTopic pipeline
- **URL unfurling**: DrissionPage-based resolver with caching

## Architecture Decisions

### Performance
- JSON chunking by month reduces initial payload
- Parallel month loading via `Promise.all()`
- Build hash for cache busting

### Accessibility
- WCAG 2.1 AA compliance target
- Screen reader friendly Zen mode
- High contrast dark theme
- Pattern overlays for colorblind users

### Data Processing
- Unicode normalization for text cleaning
- Engagement scoring: `likes + reposts × 2`
- Weekly aggregation for summary views

[Unreleased]: https://github.com/revue-de-presse/revue-de-presse.github.io/compare/v1.1.0...HEAD
[1.1.0]: https://github.com/revue-de-presse/revue-de-presse.github.io/compare/v1.0.0...v1.1.0
[1.0.0]: https://github.com/revue-de-presse/revue-de-presse.github.io/releases/tag/v1.0.0

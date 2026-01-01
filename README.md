# Revue de Presse 2025

Animated visualization of French media trends on Bluesky in 2025.

![License: GPL-3.0](https://img.shields.io/badge/License-GPL--3.0-blue.svg)
![Node.js](https://img.shields.io/badge/Node.js-18%2B-green.svg)
![Python](https://img.shields.io/badge/Python-3.10%2B-blue.svg)

## Overview

This project provides an interactive "bar chart race" visualization showing the most shared French press articles on Bluesky throughout 2025. Topics are extracted dynamically using NLP (BERTopic) and engagement is calculated from likes and reposts.

**Live demo**: [2025.revue-de-presse.org](https://2025.revue-de-presse.org)

## Features

- Animated bar chart race of media themes
- Dynamic topic extraction via BERTopic (NLP)
- Progressive Web App (PWA) with offline support
- Dark mode (auto-detection + manual toggle)
- Accessibility: colorblind patterns, keyboard navigation, ARIA attributes
- No-JavaScript fallback with tabular summaries
- Social sharing (Mastodon, Email, Bluesky, LinkedIn)

## Prerequisites

### Node.js (for build)
- Node.js v18.x LTS or higher (recommended: v20.x LTS)
- npm v9.x or higher

### Python (for NLP topic extraction)
- Python 3.10+
- Dependencies: `bertopic sentence-transformers umap-learn hdbscan scikit-learn numpy pandas`

## Quick Start

```bash
# Clone the repository
git clone https://github.com/revue-de-presse/revue-de-presse.github.io.git
cd revue-de-presse.github.io/visualization

# Build the static files
node build-static.js

# Start a local server
python3 -m http.server 8000
# Open http://localhost:8000
```

## Project Structure

```
visualization/
├── course-des-themes.html   # Source template
├── build-static.js          # Build script (Node.js)
├── index.html               # Generated output
├── data-2025-*.json         # Monthly data chunks
├── topics.json              # NLP topic configuration
├── sentiment.json           # Weekly sentiment data
├── manifest.json            # PWA manifest
└── sw.js                    # Service Worker

scripts/
├── extract_topics.py        # BERTopic NLP pipeline
├── analyze_sentiment.py     # Sentiment analysis
└── unfurl_links.py          # URL unfurler with caching
```

## Build Process

The build script (`build-static.js`):

1. Loads articles from `../2025/*.json`
2. Optimizes data (truncates text to 200 chars, removes unused fields)
3. Chunks data by month for lazy loading
4. Generates weekly summaries for noscript/zen mode
5. Outputs `index.html` and monthly JSON files

### NLP Topic Extraction

```bash
# Install Python dependencies
pip install bertopic sentence-transformers umap-learn hdbscan scikit-learn numpy pandas

# Generate topics (from project root)
python3 scripts/extract_topics.py
```

## Deployment

### GitHub Pages

1. Build the static files:
   ```bash
   cd visualization
   node build-static.js
   ```

2. Commit and push:
   ```bash
   git add index.html data*.json topics.json sentiment.json
   git commit -m "Build: update visualization"
   git push origin main
   ```

3. Enable GitHub Pages in repository Settings > Pages

### Other Platforms

Compatible with: Netlify, Vercel, Cloudflare Pages, AWS S3, or any static HTTP server.

## Data Format

### Article JSON

```json
{
  "date": "2025-03-04",
  "screen_name": "lemonde.fr",
  "text": "Article title...",
  "likes": 169,
  "reposts": 73,
  "avatar_url": "https://...",
  "publication_id": "at://..."
}
```

### Engagement Score

```
score = likes + (reposts × 2)
```

Reposts are weighted double as they indicate stronger engagement.

## Browser Support

| Browser | Minimum Version |
|---------|-----------------|
| Chrome | 80+ |
| Firefox | 75+ |
| Safari | 13.1+ |
| Edge | 80+ (Chromium) |

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines on how to contribute to this project.

## Code of Conduct

This project adheres to the [Contributor Covenant Code of Conduct](CODE_OF_CONDUCT.md). By participating, you are expected to uphold this code.

## License

This project is licensed under the **GNU General Public License v3.0** - see the [COPYING](COPYING) file for details.

### What this means

- You can use, modify, and distribute this software
- Any derivative work must also be licensed under GPL-3.0
- You must include the original copyright notice and license
- Source code must be made available when distributing

## Open Source Attribution

This project is built with the following open source libraries and tools:

### JavaScript Libraries

| Library | License | Description |
|---------|---------|-------------|
| [D3.js](https://d3js.org/) v7 | ISC | Data visualization library |
| [core-js](https://github.com/zloirock/core-js) | MIT | JavaScript polyfills |

### Python Libraries

| Library | License | Description |
|---------|---------|-------------|
| [BERTopic](https://maartengr.github.io/BERTopic/) | MIT | Topic modeling with transformers |
| [sentence-transformers](https://www.sbert.net/) | Apache 2.0 | Sentence embeddings |
| [UMAP](https://umap-learn.readthedocs.io/) | BSD-3 | Dimensionality reduction |
| [HDBSCAN](https://hdbscan.readthedocs.io/) | BSD-3 | Clustering algorithm |
| [scikit-learn](https://scikit-learn.org/) | BSD-3 | Machine learning toolkit |
| [NumPy](https://numpy.org/) | BSD-3 | Numerical computing |
| [pandas](https://pandas.pydata.org/) | BSD-3 | Data analysis |
| [DrissionPage](https://github.com/g1879/DrissionPage) | MIT | Browser automation |

### Fonts

| Font | License | Source |
|------|---------|--------|
| [Source Serif 4](https://fonts.google.com/specimen/Source+Serif+4) | OFL 1.1 | Google Fonts |
| [Roboto](https://fonts.google.com/specimen/Roboto) | Apache 2.0 | Google Fonts |

### Services & Standards

| Service | Description |
|---------|-------------|
| [Bluesky AT Protocol](https://atproto.com/) | Decentralized social protocol |
| [polyfill.io](https://polyfill.io/) | Browser polyfill service |
| [Google Fonts](https://fonts.google.com/) | Web font hosting |

### Community Standards

| Standard | Description |
|----------|-------------|
| [Contributor Covenant](https://www.contributor-covenant.org/) v2.0 | Code of Conduct |
| [Keep a Changelog](https://keepachangelog.com/) | Changelog format |
| [Conventional Commits](https://www.conventionalcommits.org/) | Commit message format |
| [Semantic Versioning](https://semver.org/) | Version numbering |

## Contact

- Website: [revue-de-presse.org](https://revue-de-presse.org)
- Security issues: contact+security@revue-de-presse.org

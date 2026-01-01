#!/usr/bin/env node
/**
 * Script pour generer une version statique optimisee de la visualisation
 * Compatible avec GitHub Pages et tout hebergement statique
 *
 * Optimisations appliquees:
 * 1. Truncate article text to 200 chars
 * 2. Remove unused fields
 * 3. External minified JSON files
 * 4. Split data by month for lazy loading
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const dataDir = path.join(__dirname, '..', '2025');
const templateFile = path.join(__dirname, 'course-des-themes.html');
const outputFile = path.join(__dirname, 'index.html');
const dataOutputDir = __dirname;
const urlCacheFile = path.join(__dirname, '..', 'scripts', 'url-cache-drission.json');

console.log('Building optimized static version for GitHub Pages...\n');

// Phase 5 (ADR-unfurling): Load URL cache for unfurling short URLs
let urlCache = {};
if (fs.existsSync(urlCacheFile)) {
    try {
        urlCache = JSON.parse(fs.readFileSync(urlCacheFile, 'utf-8'));
        console.log(`Loaded URL cache with ${Object.keys(urlCache).length} entries\n`);
    } catch (e) {
        console.warn('Warning: Could not load URL cache:', e.message);
    }
}

// Tracking parameters to remove from resolved URLs
const TRACKING_PARAMS = [
    'utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term',
    'fbclid', 'gclid', 'at_platform', 'at_campaign', 'at_medium', 'at_format', 'at_account',
    'xtor', 'ref', 'source', 'Echobox', 'Reseaux sociaux ', 'Reseaux+sociaux+'
];

/**
 * Remove tracking parameters from URL
 * Handles query params, hash-based params, and URL-encoded params
 */
function removeTrackingParams(url) {
    try {
        // First decode any URL-encoded query strings (e.g., ?=%3Fxtor -> ?xtor)
        let cleanUrl = url
            .replace(/\?=%3F/g, '?')           // ?=%3F -> ?
            .replace(/%3D/g, '=')              // %3D -> =
            .replace(/%26/g, '&');             // %26 -> &

        const u = new URL(cleanUrl);

        // Remove tracking params from query string
        TRACKING_PARAMS.forEach(p => u.searchParams.delete(p));

        // Clean hash if it contains tracking params (e.g., #utm_medium=...)
        if (u.hash) {
            const hashContent = u.hash.slice(1); // Remove leading #
            if (TRACKING_PARAMS.some(p => hashContent.includes(p))) {
                // If hash is only tracking params, remove entirely
                const hashParams = new URLSearchParams(hashContent);
                TRACKING_PARAMS.forEach(p => hashParams.delete(p));
                const remaining = hashParams.toString();
                u.hash = remaining ? '#' + remaining : '';
            }
        }

        // Clean up empty query/hash
        let result = u.toString();
        result = result.replace(/\?$/, '');    // Remove trailing ?
        result = result.replace(/#$/, '');     // Remove trailing #
        return result;
    } catch {
        return url;
    }
}

/**
 * Clean URL for cache lookup (strip trailing artifacts)
 */
function cleanUrlForCache(url) {
    return url
        .replace(/["'""'']+$/g, '')
        .replace(/…+$/g, '')
        .replace(/\.{3,}$/g, '')
        .replace(/%22$/g, '')
        .replace(/%27$/g, '')
        .replace(/%E2%80%A6$/g, '')
        .replace(/[.,;:!?)>\]]+$/g, '')
        .replace(/\\n.*$/g, '')
        .replace(/\\+$/g, '');
}

/**
 * Resolve URL using cache, return original if not cached or invalid
 * Always removes tracking parameters from final URL
 */
function resolveUrlFromCache(url) {
    const cleanUrl = cleanUrlForCache(url);
    const cached = urlCache[cleanUrl];

    if (cached?.resolved && !cached.resolved.includes('%22') && cached.status === 200) {
        return removeTrackingParams(cached.resolved);
    }
    // Always clean tracking params even for non-cached URLs
    return removeTrackingParams(cleanUrl);
}

// 1. Lire et combiner les donnees JSON
console.log('1. Loading JSON data...');
const files = fs.readdirSync(dataDir)
    .filter(f => f.endsWith('.json'))
    .sort();

let allArticles = [];
files.forEach(file => {
    const filePath = path.join(dataDir, file);
    try {
        const content = fs.readFileSync(filePath, 'utf-8');
        const articles = JSON.parse(content);
        if (Array.isArray(articles)) {
            allArticles = allArticles.concat(articles);
        }
    } catch (e) {
        console.error(`   Error with ${file}:`, e.message);
    }
});

console.log(`   ${allArticles.length} articles from ${files.length} files`);

// 2. Optimize articles - truncate text and remove unused fields
console.log('2. Optimizing data...');
const originalSize = JSON.stringify(allArticles).length;

const optimizedArticles = allArticles.map(article => {
    let text = article.text || '';

    // Extract URLs from original text before cleaning/truncating (preserves unfurled links)
    const urlRegex = /(https?:\/\/[^\s<>"'\\]+)/g;
    const rawUrls = text.match(urlRegex) || [];
    // Phase 1 & 5 (ADR-unfurling): Clean URLs and resolve from cache
    const urls = [...new Set(rawUrls.map(url => {
        // First clean the URL
        const cleanUrl = url
            .replace(/["'""'']+$/g, '')      // Trailing quotes (straight and curly)
            .replace(/…+$/g, '')              // Trailing ellipsis (Unicode)
            .replace(/\.{3,}$/g, '')          // Trailing dots
            .replace(/%22$/g, '')             // URL-encoded quote
            .replace(/%27$/g, '')             // URL-encoded apostrophe
            .replace(/%E2%80%A6$/g, '')       // URL-encoded ellipsis
            .replace(/[.,;:!?)>\]]+$/g, '')   // Trailing punctuation
            .replace(/\\+$/g, '');            // Trailing backslashes
        // Then resolve from cache if available
        return resolveUrlFromCache(cleanUrl);
    }))];

    // ADR Phase 1-3: Clean text at build time (escape sequences, typography, encoding)
    text = cleanArticleText(text);

    // Truncate text to 200 chars after cleaning
    if (text.length > 200) {
        text = text.substring(0, 197);
    }

    // Add ellipsis if text was truncated or appears incomplete
    text = addEllipsisIfTruncated(text);

    // Keep only essential fields
    const result = {
        date: article.date,
        screen_name: article.screen_name,
        text: text,
        likes: article.likes || 0,
        reposts: article.reposts || 0,
        avatar_url: article.avatar_url || '',
        publication_id: article.publication_id || ''
    };

    // Only add urls field if there are URLs (saves space)
    if (urls.length > 0) {
        result.urls = urls;
    }

    return result;
});

// Sort by date
optimizedArticles.sort((a, b) => new Date(a.date) - new Date(b.date));

const optimizedSize = JSON.stringify(optimizedArticles).length;
console.log(`   Original: ${(originalSize / 1024).toFixed(1)} KB`);
console.log(`   Optimized: ${(optimizedSize / 1024).toFixed(1)} KB`);
console.log(`   Reduction: ${((1 - optimizedSize / originalSize) * 100).toFixed(1)}%`);

// 3. Group by month for lazy loading
console.log('3. Splitting data by month...');
const byMonth = {};
optimizedArticles.forEach(article => {
    const month = article.date.substring(0, 7); // YYYY-MM
    if (!byMonth[month]) {
        byMonth[month] = [];
    }
    byMonth[month].push(article);
});

const months = Object.keys(byMonth).sort();
console.log(`   ${months.length} months: ${months.join(', ')}`);

// 4. Write monthly JSON files (minified)
console.log('4. Writing monthly JSON files...');
const monthFiles = [];
months.forEach(month => {
    const filename = `data-${month}.json`;
    const filepath = path.join(dataOutputDir, filename);
    const minifiedData = JSON.stringify(byMonth[month]);
    fs.writeFileSync(filepath, minifiedData);
    const size = fs.statSync(filepath).size;
    monthFiles.push({ month, filename, size, count: byMonth[month].length });
    console.log(`   ${filename}: ${(size / 1024).toFixed(1)} KB (${byMonth[month].length} articles)`);
});

// 5. Write combined minified JSON (fallback)
console.log('5. Writing combined data.json...');
const combinedFile = path.join(dataOutputDir, 'data.json');
fs.writeFileSync(combinedFile, JSON.stringify(optimizedArticles));
const combinedSize = fs.statSync(combinedFile).size;
console.log(`   data.json: ${(combinedSize / 1024).toFixed(1)} KB`);

// 6. Generate weekly summaries for noscript fallback
console.log('6. Generating weekly summaries...');

// Load dynamic topics from topics.json (generated by extract_topics.py)
const topicsFile = path.join(__dirname, 'topics.json');
let topicsData = null;
let themeConfig = {};

if (fs.existsSync(topicsFile)) {
    try {
        topicsData = JSON.parse(fs.readFileSync(topicsFile, 'utf-8'));
        // Convert topic_config to themeConfig format for classification
        for (const [themeName, config] of Object.entries(topicsData.topic_config)) {
            themeConfig[themeName] = config.keywords || [];
        }
        console.log(`   Loaded ${Object.keys(themeConfig).length} dynamic topics from topics.json`);
    } catch (e) {
        console.error('   Warning: Could not load topics.json:', e.message);
    }
}

// Fallback to basic themes if topics.json is not available
if (Object.keys(themeConfig).length === 0) {
    console.log('   Using fallback hardcoded themes');
    themeConfig = {
        'Trump / USA': ['trump', 'etats-unis', 'usa', 'americain', 'washington'],
        'Ukraine / Russie': ['ukraine', 'russie', 'poutine', 'zelensky'],
        'Gaza / Palestine': ['gaza', 'palestine', 'israel', 'hamas'],
        'Climat / Environnement': ['climat', 'climatique', 'environnement', 'ecologie'],
        'Autres': []
    };
}

// Load sentiment data from sentiment.json (generated by analyze_sentiment.py)
const sentimentFile = path.join(__dirname, 'sentiment.json');
let sentimentData = {};

if (fs.existsSync(sentimentFile)) {
    try {
        const rawSentiment = JSON.parse(fs.readFileSync(sentimentFile, 'utf-8'));
        sentimentData = rawSentiment.weekly_sentiment || {};
        console.log(`   Loaded sentiment data for ${Object.keys(sentimentData).length} weeks`);
    } catch (e) {
        console.error('   Warning: Could not load sentiment.json:', e.message);
    }
}

function normalizeText(text) {
    return text.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

/**
 * Check if text appears to be truncated (ends abruptly without proper punctuation).
 */
function isTruncated(text) {
    if (!text) return false;
    // Already has ellipsis
    if (text.endsWith('...') || text.endsWith('…')) return false;
    // Ends with proper sentence punctuation
    if (/[.!?»"]$/.test(text)) return false;
    // Ends mid-word or mid-sentence (no terminal punctuation)
    return true;
}

/**
 * Add ellipsis to truncated text if needed.
 * Uses proper French ellipsis character (…)
 */
function addEllipsisIfTruncated(text) {
    if (!text) return text;
    text = text.trim();
    if (isTruncated(text)) {
        return text + '…';
    }
    return text;
}

/**
 * Apply French micro-typography rules:
 * - Use French quotes « » with proper non-breaking spaces
 * - Non-breaking space before : ; ! ? » and after «
 * - Proper ellipsis character
 */
function applyFrenchTypography(text) {
    if (!text) return text;

    const nbsp = '\u00a0'; // non-breaking space

    return text
        // Remove any remaining straight quotes (already stripped outer quotes)
        .replace(/"/g, '')
        // Non-breaking space before double punctuation
        .replace(/ :/g, '\u00a0:')
        .replace(/ ;/g, '\u00a0;')
        .replace(/ !/g, '\u00a0!')
        .replace(/ \?/g, '\u00a0?')
        // Fix cases where there's no space before punctuation (add nbsp)
        .replace(/([^\s\u00a0]):/g, '$1\u00a0:')
        .replace(/([^\s\u00a0]);/g, '$1\u00a0;')
        // But don't add space in URLs (http:// https://)
        .replace(/http\u00a0:/g, 'http:')
        .replace(/https\u00a0:/g, 'https:')
        // Use proper ellipsis character
        .replace(/\.\.\./g, '…');
}

/**
 * Phase 3 (ADR): Repair common UTF-8 → Latin-1 → UTF-8 mojibake encoding artifacts.
 */
function repairEncoding(text) {
    if (!text) return text;
    return text
        // Common UTF-8 → Latin-1 → UTF-8 mojibake
        .replace(/Ã©/g, 'é')
        .replace(/Ã¨/g, 'è')
        .replace(/Ã /g, 'à')
        .replace(/Ã´/g, 'ô')
        .replace(/Ã®/g, 'î')
        .replace(/Ã¢/g, 'â')
        .replace(/Ã§/g, 'ç')
        .replace(/Ã¹/g, 'ù')
        .replace(/Ãª/g, 'ê')
        .replace(/Ã«/g, 'ë')
        .replace(/Ã¯/g, 'ï')
        .replace(/Ã»/g, 'û')
        .replace(/Ã¼/g, 'ü')
        .replace(/Å"/g, 'œ')
        .replace(/â€™/g, '\u2019')  // Right single quotation mark
        .replace(/â€"/g, '\u2013')  // En dash
        .replace(/â€œ/g, '\u201c')  // Left double quotation mark
        .replace(/â€/g, '\u201d')   // Right double quotation mark
        .replace(/Â /g, ' ');  // Non-breaking space artifact
}

/**
 * Phase 1 (ADR): Escape sequence normalization.
 * Handles: \n, \', \", \\, outer wrapper quotes.
 */
function cleanEscapeSequences(text) {
    if (!text) return '';
    return text
        // Unescape sequences (order matters)
        .replace(/\\n/g, ' ')           // \n → space
        .replace(/\\'/g, "'")           // \' → '
        .replace(/\\"/g, '"')           // \" → "
        .replace(/\\\\/g, '')           // \\ → remove
        // Remove outer wrapper quotes
        .replace(/^"(.*)"$/s, '$1')     // Strip outer "..."
        // Normalize whitespace
        .replace(/\s+/g, ' ')
        .trim();
}

/**
 * Phase 2 (ADR): Typography normalization.
 * Handles: ellipsis, apostrophes, dashes, French quotes spacing.
 */
function normalizeTypography(text) {
    if (!text) return text;
    return text
        // Ellipsis: ... → …
        .replace(/\.{3,}/g, '\u2026')
        // Apostrophes: normalize to curly
        .replace(/'/g, '\u2019')
        // Dashes: space-hyphen-space → en-dash
        .replace(/\s-\s/g, ' \u2013 ')
        // French quotes spacing
        .replace(/«\s*/g, '« ')         // Ensure space after «
        .replace(/\s*»/g, ' »');        // Ensure space before »
}

/**
 * Clean text by replacing special characters, Unicode escapes, and normalizing whitespace.
 * Implements ADR phases 1-3: escape sequences, typography, encoding repair.
 * Handles: \xa0 (nbsp), %22 (url-encoded quote), \\n\\n, curly quotes, etc.
 */
function cleanArticleText(text) {
    if (!text) return '';

    // Phase 3: Repair encoding artifacts first
    let cleaned = repairEncoding(text);

    // Phase 1: Escape sequence normalization
    cleaned = cleanEscapeSequences(cleaned);

    // Additional cleanup for edge cases
    cleaned = cleaned
        // Zero-width characters
        .replace(/\u200b/g, '')  // zero-width space
        .replace(/\u200c/g, '')  // zero-width non-joiner
        .replace(/\u200d/g, '')  // zero-width joiner
        .replace(/\ufeff/g, '')  // BOM
        // Normalize non-breaking spaces to regular spaces (will be re-added by typography rules)
        .replace(/\u00a0/g, ' ')
        // Curly quotes to straight quotes temporarily
        .replace(/[\u2018\u2019]/g, "'")
        .replace(/[\u201c\u201d]/g, '"')
        // French quotes - normalize spacing
        .replace(/«\s*/g, '« ')
        .replace(/\s*»/g, ' »')
        // Dashes - use proper en-dash
        .replace(/[\u2013\u2014]/g, ' – ')
        .replace(/--/g, ' – ')
        // URL-encoded characters
        .replace(/%22/g, '"')
        .replace(/%27/g, "'")
        .replace(/%5C/g, '')
        .replace(/%20/g, ' ')
        // Escaped sequences (from JSON) - belt and suspenders
        .replace(/\\xa0/g, ' ')
        .replace(/\\u00a0/g, ' ')
        .replace(/\\u[0-9a-fA-F]{4}/g, '')
        // Clean up trailing %22 in URLs
        .replace(/%22$/g, '')
        .replace(/%22(["\s])/g, '$1')
        // Deduplicate quotes (""" -> ", "" -> ")
        .replace(/"{2,}/g, '"')
        // Remove leading/trailing quotes
        .replace(/^"+/, '')
        .replace(/"+$/, '')
        // Normalize whitespace
        .replace(/\s+/g, ' ')
        .trim();

    // Phase 2: Typography normalization
    cleaned = normalizeTypography(cleaned);

    // Apply French typography rules (non-breaking spaces before punctuation)
    return applyFrenchTypography(cleaned);
}

function classifyArticle(text) {
    const lowerText = normalizeText(text || '');
    const matches = [];
    for (const [theme, keywords] of Object.entries(themeConfig)) {
        if (theme === 'Autres') continue; // Skip 'Autres' in matching
        for (const kw of keywords) {
            if (kw && lowerText.includes(normalizeText(kw))) {
                matches.push(theme);
                break;
            }
        }
    }
    return matches.length > 0 ? matches : ['Autres'];
}

function getWeekNumber(date) {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
}

// Group articles by week
const byWeek = {};
optimizedArticles.forEach(article => {
    const date = new Date(article.date);
    const week = getWeekNumber(date);
    const year = date.getFullYear();
    const weekKey = `${year}-S${String(week).padStart(2, '0')}`;
    if (!byWeek[weekKey]) {
        byWeek[weekKey] = { articles: [], scores: {}, topArticle: null, maxEngagement: 0 };
    }
    const engagement = (article.likes || 0) + (article.reposts || 0) * 2;
    byWeek[weekKey].articles.push(article);

    // Track top article of the week
    if (engagement > byWeek[weekKey].maxEngagement) {
        byWeek[weekKey].maxEngagement = engagement;
        byWeek[weekKey].topArticle = article;
    }

    // Classify and accumulate scores
    const themes = classifyArticle(article.text);
    themes.forEach(theme => {
        if (!byWeek[weekKey].scores[theme]) byWeek[weekKey].scores[theme] = 0;
        byWeek[weekKey].scores[theme] += engagement;
    });
});

const weeks = Object.keys(byWeek).sort();
console.log(`   ${weeks.length} weeks generated`);

// Generate noscript HTML
let noscriptHtml = `
    <noscript>
        <style>
            .noscript-fallback { font-family: 'Roboto', -apple-system, sans-serif; max-width: 1000px; margin: 0 auto; padding: 20px; }
            .noscript-fallback h2 { font-size: 1.4rem; color: #006663; margin: 30px 0 15px 0; border-bottom: 2px solid #006663; padding-bottom: 8px; }
            .noscript-fallback h3 { font-size: 1.1rem; color: #333; margin: 20px 0 10px 0; }
            .noscript-fallback table { width: 100%; border-collapse: collapse; margin-bottom: 20px; font-size: 0.9rem; }
            .noscript-fallback th, .noscript-fallback td { padding: 8px 12px; text-align: left; border-bottom: 1px solid #e0e0e0; }
            .noscript-fallback th { background: #f5f5f5; font-weight: 600; color: #333; }
            .noscript-fallback .score { text-align: right; font-variant-numeric: tabular-nums; }
            .noscript-fallback .top-article { background: #f9f9f9; padding: 12px; border-left: 3px solid #006663; margin: 10px 0; font-style: italic; }
            .noscript-fallback .source { color: #006663; font-size: 0.85rem; margin-top: 5px; }
            .noscript-fallback .intro { background: linear-gradient(135deg, #004d4a 0%, #006663 100%); color: white; padding: 20px; border-radius: 8px; margin-bottom: 30px; }
            .noscript-fallback .intro h1 { margin: 0 0 10px 0; font-size: 1.5rem; }
            .noscript-fallback .intro p { margin: 5px 0; opacity: 0.9; }
        </style>
        <div class="noscript-fallback">
            <div class="intro">
                <h1>Revue de Presse 2025</h1>
                <p>Articles de la presse francaise parmi les plus relayes sur Bluesky</p>
                <p><em>Activez JavaScript pour voir la visualisation animee.</em></p>
            </div>
`;

// Generate weekly summaries
weeks.forEach(weekKey => {
    const weekData = byWeek[weekKey];
    const articleCount = weekData.articles.length;
    const totalEngagement = Object.values(weekData.scores).reduce((a, b) => a + b, 0);

    // Sort themes by score
    const sortedThemes = Object.entries(weekData.scores)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5); // Top 5 themes

    noscriptHtml += `
            <h2>Semaine ${weekKey}</h2>
            <p>${articleCount} articles analysés — Engagement total : ${totalEngagement.toLocaleString('fr-FR')}</p>

            <h3>Thèmes dominants</h3>
            <table>
                <thead>
                    <tr><th>Thème</th><th class="score">Score d'engagement</th></tr>
                </thead>
                <tbody>
`;
    sortedThemes.forEach(([theme, score]) => {
        noscriptHtml += `                    <tr><td>${theme}</td><td class="score">${score.toLocaleString('fr-FR')}</td></tr>\n`;
    });

    noscriptHtml += `                </tbody>
            </table>
`;

    // Top article of the week
    if (weekData.topArticle) {
        let cleanText = cleanArticleText(weekData.topArticle.text || '')
            .replace(/\n/g, ' ');
        cleanText = addEllipsisIfTruncated(cleanText);
        noscriptHtml += `
            <div class="top-article">
                «\u00a0${cleanText}\u00a0»
                <div class="source">— ${weekData.topArticle.screen_name}</div>
            </div>
`;
    }
});

noscriptHtml += `
            <footer style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #e0e0e0; text-align: center; color: #888;">
                <p>Données issues de la presse francophone sur Bluesky (mars-décembre 2025)</p>
                <p><a href="https://revue-de-presse.org" style="color: #006663;">revue-de-presse.org</a></p>
            </footer>
        </div>
    </noscript>
`;

// Generate Zen Mode HTML (visible tabular summary)
// Helper: Extract Bluesky profile URL from publication_id
function getProfileUrl(publicationId) {
    if (!publicationId) return null;
    const didMatch = publicationId.match(/at:\/\/(did:plc:[^/]+)/);
    return didMatch ? `https://bsky.app/profile/${didMatch[1]}` : null;
}

// Helper: Extract Bluesky post URL from publication_id
function getPostUrl(publicationId) {
    if (!publicationId) return null;
    const match = publicationId.match(/at:\/\/(did:plc:[^/]+)\/app\.bsky\.feed\.post\/(.+)/);
    return match ? `https://bsky.app/profile/${match[1]}/post/${match[2]}` : null;
}

// Build seasons navigation from weeks data
// Meteorological seasons for the data period (March-December 2025)
const seasons = [
    { name: 'Printemps', emoji: '🌸', weeks: [] },  // March 1 - May 31
    { name: 'Été', emoji: '☀️', weeks: [] },       // June 1 - Aug 31
    { name: 'Automne', emoji: '🍂', weeks: [] },   // Sept 1 - Nov 30
    { name: 'Hiver', emoji: '❄️', weeks: [] }      // Dec 1 - Feb 28
];

// Assign weeks to seasons based on their start date
weeks.forEach((weekKey, index) => {
    const relativeWeekNum = index + 1;
    // Parse week key (e.g., "2025-S10")
    const weekNum = parseInt(weekKey.split('-S')[1]);
    const year = parseInt(weekKey.split('-S')[0]);

    // Approximate week to month: week 10 = early March, week 22 = late May, etc.
    // March (weeks ~10-13), April (weeks ~14-17), May (weeks ~18-22)
    // June (weeks ~23-26), July (weeks ~27-31), Aug (weeks ~32-35)
    // Sept (weeks ~36-39), Oct (weeks ~40-44), Nov (weeks ~45-48)
    // Dec (weeks ~49-52)

    if (weekNum >= 10 && weekNum <= 22) {
        seasons[0].weeks.push({ num: relativeWeekNum, key: weekKey });
    } else if (weekNum >= 23 && weekNum <= 35) {
        seasons[1].weeks.push({ num: relativeWeekNum, key: weekKey });
    } else if (weekNum >= 36 && weekNum <= 48) {
        seasons[2].weeks.push({ num: relativeWeekNum, key: weekKey });
    } else {
        seasons[3].weeks.push({ num: relativeWeekNum, key: weekKey });
    }
});

// Build seasons HTML for navigation
let seasonsHtml = '';
seasons.forEach(season => {
    if (season.weeks.length > 0) {
        seasonsHtml += `<div class="week-nav-season">
            <span class="week-nav-season-label">${season.emoji}</span>
            <div class="week-nav-inner">`;
        season.weeks.forEach(week => {
            seasonsHtml += `<a href="#week-${week.num}" class="week-nav-item" data-week="${week.num}">${week.num}</a>`;
        });
        seasonsHtml += `</div></div>`;
    }
});

// Initialize zenModeHtml with full structure including week navigation
let zenModeHtml = `
        <div class="zen-mode-section">
            <button class="zen-mode-toggle" id="zenModeToggle" aria-expanded="false">
                <span class="toggle-label">Semainier</span>
                <span class="toggle-indicator">Afficher ▼</span>
            </button>
            <div class="zen-mode-content" id="zenModeContent">
                <nav class="week-nav" id="weekNav">
                    <div class="week-nav-row">
                        <div class="week-nav-label">Semaine :</div>
                        <div class="week-nav-seasons">
                            ${seasonsHtml}
                        </div>
                    </div>
                    <div class="week-nav-row">
                        <div class="sentiment-filter" id="sentimentFilter">
`;

// Count weeks by sentiment for filter buttons
const sentimentCounts = {};
weeks.forEach(weekKey => {
    const weekSentiment = sentimentData[weekKey] || {};
    const category = weekSentiment.category || 'unknown';
    sentimentCounts[category] = (sentimentCounts[category] || 0) + 1;
});

// Sentiment config
const sentimentConfig = {
    'negative': { emoji: '😠', label: 'Négatif' },
    'slightly_negative': { emoji: '😟', label: 'Légèrement négatif' },
    'neutral': { emoji: '😐', label: 'Neutre' },
    'slightly_positive': { emoji: '🙂', label: 'Légèrement positif' },
    'positive': { emoji: '😊', label: 'Positif' }
};

// Add "Tous" (All) button first - active by default
zenModeHtml += `
                            <button class="sentiment-filter-btn active" data-sentiment="all" title="Toutes les semaines">
                                Tous <span class="filter-count">(${weeks.length})</span>
                            </button>
`;

Object.entries(sentimentConfig).forEach(([category, config]) => {
    const count = sentimentCounts[category] || 0;
    if (count > 0) {
        zenModeHtml += `
                            <button class="sentiment-filter-btn" data-sentiment="${category}" title="${config.label}">
                                ${config.emoji} <span class="filter-count">(${count})</span>
                            </button>
`;
    }
});

zenModeHtml += `
                        </div>
                    </div>
                </nav>
                <div class="week-content-spacer"></div>
`;

// Pattern list for colorblind accessibility (matches main chart patterns)
const patternList = ['stripe', 'dots', 'cross', 'diagonal', 'zigzag', 'horizontal', 'vertical'];

// Create theme-to-pattern mapping (consistent across all weeks)
const themePatternMap = {};
const allThemes = Object.keys(themeConfig).filter(t => t !== 'Autres').sort();
allThemes.forEach((theme, index) => {
    themePatternMap[theme] = patternList[index % patternList.length];
});
themePatternMap['Autres'] = 'dots'; // Autres gets dots pattern

// Generate weekly summaries for zen mode
weeks.forEach((weekKey, index) => {
    const weekData = byWeek[weekKey];
    const articleCount = weekData.articles.length;
    const totalEngagement = Object.values(weekData.scores).reduce((a, b) => a + b, 0);

    const sortedThemes = Object.entries(weekData.scores)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5);

    // Get sentiment emoji for this week
    const weekSentiment = sentimentData[weekKey] || {};
    const sentimentEmoji = weekSentiment.emoji || '';
    const sentimentCategory = weekSentiment.category || 'unknown';
    const sentimentTitle = weekSentiment.category ?
        `Tonalité\u00a0: ${weekSentiment.category.replace('_', ' ')} (score\u00a0: ${weekSentiment.average_score >= 0 ? '+' : ''}${weekSentiment.average_score})` : '';

    // Display relative week number (1-indexed from first week of data, starting March)
    const relativeWeekNum = index + 1;

    // Calculate max score for bar width percentage
    const maxScore = sortedThemes.length > 0 ? sortedThemes[0][1] : 1;

    zenModeHtml += `
                <div class="week-section" id="week-${relativeWeekNum}" data-sentiment="${sentimentCategory}" data-week-num="${relativeWeekNum}">
                <h3>Semaine ${relativeWeekNum} ${sentimentEmoji ? `<span class="sentiment-emoji" title="${sentimentTitle}">${sentimentEmoji}</span>` : ''}</h3>
                <p class="week-stats">${articleCount} articles — Engagement\u00a0: ${totalEngagement.toLocaleString('fr-FR')}</p>
                <div class="week-bars">
`;
    sortedThemes.forEach(([theme, score]) => {
        const barWidth = Math.round((score / maxScore) * 100);
        const themeColor = topicsData?.topic_config?.[theme]?.color || '#999';
        const pattern = themePatternMap[theme] || 'stripe';
        zenModeHtml += `                    <div class="week-bar-row">
                        <div class="week-bar-label">${theme}</div>
                        <div class="week-bar-container">
                            <div class="week-bar" style="width:${barWidth}%;background:${themeColor}" data-week="${weekKey}" data-theme="${theme}" data-week-num="${relativeWeekNum}" data-pattern="${pattern}" onclick="showWordCloud('${weekKey}', '${theme.replace(/'/g, "\\'")}', ${relativeWeekNum})"></div>
                            <span class="week-bar-value">${score.toLocaleString('fr-FR')}</span>
                        </div>
                    </div>\n`;
    });
    zenModeHtml += `                </div>
`;

    if (weekData.topArticle) {
        // Clean text first, then add ellipsis, then encode for HTML
        let cleanText = cleanArticleText(weekData.topArticle.text || '')
            .replace(/\n/g, ' ');
        cleanText = addEllipsisIfTruncated(cleanText);
        // HTML-encode after ellipsis added
        cleanText = cleanText
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;');

        const avatarUrl = weekData.topArticle.avatar_url || '';
        const profileUrl = getProfileUrl(weekData.topArticle.publication_id);
        const postUrl = getPostUrl(weekData.topArticle.publication_id);
        // Get article URL (unfurled, clean, tracking-param-free)
        const articleUrls = weekData.topArticle.urls || [];
        const articleUrl = articleUrls.length > 0 ? articleUrls[0] : null;

        // Avatar with link to profile
        let avatarHtml = '';
        if (avatarUrl) {
            if (profileUrl) {
                avatarHtml = `<a href="${profileUrl}" target="_blank" rel="noopener" class="quote-avatar-link"><img src="${avatarUrl}" alt="" class="quote-avatar" loading="lazy" onerror="this.parentElement.style.display='none'"></a>`;
            } else {
                avatarHtml = `<img src="${avatarUrl}" alt="" class="quote-avatar" loading="lazy" onerror="this.style.display='none'">`;
            }
        }

        // Screen name with link to profile (no dash prefix)
        const screenNameHtml = profileUrl
            ? `<a href="${profileUrl}" target="_blank" rel="noopener" class="quote-source-link">${weekData.topArticle.screen_name}</a>`
            : weekData.topArticle.screen_name;

        // Quote text with link to post
        const quoteHtml = postUrl
            ? `<a href="${postUrl}" target="_blank" rel="noopener" class="quote-text-link">«\u00a0${cleanText}\u00a0»</a>`
            : `«\u00a0${cleanText}\u00a0»`;

        // Article link (unfurled publisher URL, if available)
        const articleLinkHtml = articleUrl
            ? `<a href="${articleUrl}" target="_blank" rel="noopener" class="quote-article-link" title="Lire l'article">📰</a>`
            : '';

        zenModeHtml += `                <div class="top-quote">
                    ${quoteHtml}
                    <div class="quote-source">${avatarHtml}<span>${screenNameHtml}</span>${articleLinkHtml}</div>
                </div>
`;
    }
    // Close the week-section div
    zenModeHtml += `                </div>
`;
});

// Close zen mode content and section
zenModeHtml += `
            </div>
        </div>
`;

// 7. Read and modify HTML template
console.log('7. Modifying HTML template...');
let html = fs.readFileSync(templateFile, 'utf-8');

// Insert zen mode (Semainier) at placeholder position (below chart, before top-headline)
html = html.replace('<div id="semainierPlaceholder"></div>', zenModeHtml);

// Insert noscript fallback before closing </body>
html = html.replace('</body>', `${noscriptHtml}</body>`);

// Create month manifest
const monthManifest = months.map(m => `"${m}"`).join(',');

// Replace the async loadData function with lazy loading version
const newLoadDataScript = `
        // === LAZY LOADING DATA ===
        const MONTHS = [${monthManifest}];
        let loadedMonths = {};
        let dataReady = false;

        async function loadMonthData(month) {
            if (loadedMonths[month]) return loadedMonths[month];
            try {
                const response = await fetch(\`data-\${month}.json\`);
                const articles = await response.json();
                loadedMonths[month] = articles;
                return articles;
            } catch (e) {
                console.error(\`Error loading \${month}:\`, e);
                return [];
            }
        }

        async function loadAllData() {
            // Load all months in parallel
            const allArticles = await Promise.all(
                MONTHS.map(month => loadMonthData(month))
            );
            return allArticles.flat();
        }

        async function loadData() {
            console.log('Loading data...');

            // Charger les topics dynamiques et sentiment data en parallele
            await Promise.all([
                loadTopicsConfig(),
                loadSentimentData()
            ]);

            // Reinitialiser cumulativeScores avec les nouveaux themes
            cumulativeScores = {};
            Object.keys(themeConfig).forEach(theme => {
                cumulativeScores[theme] = 0;
            });

            const data = await loadAllData();

            // Sort by date
            data.sort((a, b) => new Date(a.date) - new Date(b.date));

            // Group by date
            const groupedByDate = {};
            data.forEach(article => {
                const dateKey = article.date.split('T')[0];
                if (!groupedByDate[dateKey]) {
                    groupedByDate[dateKey] = [];
                }
                groupedByDate[dateKey].push(article);
            });

            allData = Object.entries(groupedByDate).map(([date, articles]) => ({
                date,
                articles
            }));

            console.log(\`Loaded \${allData.length} days of data from \${MONTHS.length} months\`);
            dataReady = true;
            buildTimeline();
            buildLegend();

            // Generate engagement example from top yearly article
            const topYearlyArticle = findTopYearlyArticle(allData);
            if (topYearlyArticle) {
                const exampleEl = document.getElementById('engagementExample');
                if (exampleEl) {
                    exampleEl.innerHTML = generateEngagementExample(topYearlyArticle);
                }
            }

            // Render first day immediately
            if (allData.length > 0) {
                currentIndex = 0;
                recalculateScoresUpTo(0);
                updateChart(allData[0], false);
                updateTimelineUI();
            }

            // Auto-start animation after a short delay
            setTimeout(() => {
                play();
            }, 1000);
        }
`;

// Replace the old loadData function
html = html.replace(
    /\/\/ Charger les donnees[\s\S]*?async function loadData\(\) \{[\s\S]*?}, 1000\);\s*\}/,
    newLoadDataScript
);

// Add meta tags for social sharing
const metaTags = `
    <meta name="description" content="Visualisation animee des tendances mediatiques francaises en 2025 - Revue de Presse">
    <meta property="og:title" content="Revue de Presse 2025">
    <meta property="og:description" content="Articles de la presse francaise parmi les plus relayes sur Bluesky">
    <meta property="og:type" content="website">
    <meta name="twitter:card" content="summary_large_image">
`;

html = html.replace(
    '<title>Revue de Presse',
    `${metaTags}    <title>Revue de Presse`
);

// 7. Minify inline CSS and JS
console.log('7. Minifying inline CSS and JS...');

let CleanCSS = null;
let terser = null;

try {
    CleanCSS = require('clean-css');
    console.log('   Using clean-css for CSS minification');
} catch (e) {
    console.log('   clean-css not installed, using basic CSS minification');
}

try {
    terser = require('terser');
    console.log('   Using terser for JS minification');
} catch (e) {
    console.log('   terser not installed, skipping JS minification');
}

if (!CleanCSS && !terser) {
    console.log('   Run "npm install" to enable advanced minification');
}

function minifyCSSSync(css) {
    if (CleanCSS) {
        const result = new CleanCSS({ level: 2 }).minify(css);
        return result.styles;
    }
    // Fallback: simple minification
    return css
        .replace(/\/\*[\s\S]*?\*\//g, '')
        .replace(/\s+/g, ' ')
        .replace(/\s*([{}:;,>+~])\s*/g, '$1')
        .replace(/;}/g, '}')
        .trim();
}

const originalHtmlSize = Buffer.byteLength(html, 'utf8');

// Minify CSS inside <style> tags
html = html.replace(/<style>([\s\S]*?)<\/style>/gi, (match, css) => {
    return '<style>' + minifyCSSSync(css) + '</style>';
});

// Minify JS inside <script> tags using terser.minify_sync (if available)
if (terser && terser.minify_sync) {
    html = html.replace(/<script>([\s\S]*?)<\/script>/gi, (match, js) => {
        if (js.length < 50) return match;
        try {
            const result = terser.minify_sync(js, {
                compress: { drop_console: false },
                mangle: false
            });
            if (result.code) {
                return '<script>' + result.code + '</script>';
            }
        } catch (err) {
            // Keep original on error
        }
        return match;
    });
}

const minifiedHtmlSize = Buffer.byteLength(html, 'utf8');
const savedBytes = originalHtmlSize - minifiedHtmlSize;
console.log(`   Minified: saved ${(savedBytes / 1024).toFixed(1)} KB (${((savedBytes / originalHtmlSize) * 100).toFixed(1)}%)`);

// 8. Generate build hash for cache busting
const buildHash = crypto.createHash('md5').update(html + Date.now()).digest('hex').substring(0, 8);
html = html.replace(/\{\{BUILD_HASH\}\}/g, buildHash);
console.log(`   Build hash: ${buildHash}`);

// 9. Write the final HTML file
console.log('9. Writing index.html...');
fs.writeFileSync(outputFile, html);

// 10. Generate service worker with build hash
console.log('10. Generating service worker...');
const swTemplatePath = path.join(__dirname, 'sw.template.js');
const swOutputPath = path.join(__dirname, 'sw.js');

if (fs.existsSync(swTemplatePath)) {
    let swTemplate = fs.readFileSync(swTemplatePath, 'utf-8');

    // Build static assets list dynamically
    const staticAssets = [
        './',
        './index.html',
        './manifest.json',
        './data.json',
        ...months.map(m => `./data-${m}.json`)
    ];

    // Replace placeholders
    swTemplate = swTemplate.replace('{{BUILD_HASH}}', buildHash);
    swTemplate = swTemplate.replace('{{STATIC_ASSETS}}', JSON.stringify(staticAssets, null, 2));

    fs.writeFileSync(swOutputPath, swTemplate);
    console.log(`   sw.js generated with cache: revue-presse-${buildHash}`);
} else {
    console.log('   Warning: sw.template.js not found, skipping SW generation');
}

const htmlSize = fs.statSync(outputFile).size;

// Summary
console.log('\n========================================');
console.log('BUILD COMPLETE!');
console.log('========================================\n');
console.log('Output files:');
console.log(`   index.html: ${(htmlSize / 1024).toFixed(1)} KB`);
console.log(`   data.json: ${(combinedSize / 1024).toFixed(1)} KB (fallback)`);
monthFiles.forEach(m => {
    console.log(`   ${m.filename}: ${(m.size / 1024).toFixed(1)} KB`);
});

const totalDataSize = monthFiles.reduce((sum, m) => sum + m.size, 0);
const totalSize = htmlSize + totalDataSize;
console.log(`\nTotal size: ${(totalSize / 1024).toFixed(1)} KB`);
console.log(`Estimated gzipped: ~${(totalSize / 1024 / 4).toFixed(0)} KB`);
console.log('\nReady for GitHub Pages deployment!');
console.log('Files to upload: index.html + data-*.json files');

#!/usr/bin/env node
/**
 * Script pour combiner tous les fichiers JSON de la revue de presse 2025
 * en un seul fichier pour la visualisation "Course des Thèmes"
 */

const fs = require('fs');
const path = require('path');

const dataDir = path.join(__dirname, '..', '2025');
const outputFile = path.join(__dirname, 'data-combined.json');

console.log('🔍 Recherche des fichiers JSON...');

const files = fs.readdirSync(dataDir)
    .filter(f => f.endsWith('.json'))
    .sort();

console.log(`📁 ${files.length} fichiers trouvés`);

let allArticles = [];
let errors = 0;

files.forEach(file => {
    const filePath = path.join(dataDir, file);
    try {
        const content = fs.readFileSync(filePath, 'utf-8');
        const articles = JSON.parse(content);

        if (Array.isArray(articles)) {
            allArticles = allArticles.concat(articles);
        }
    } catch (e) {
        console.error(`❌ Erreur avec ${file}:`, e.message);
        errors++;
    }
});

console.log(`\n📊 Statistiques:`);
console.log(`   - Articles totaux: ${allArticles.length}`);
console.log(`   - Fichiers traités: ${files.length - errors}`);
console.log(`   - Erreurs: ${errors}`);

// Trier par date
allArticles.sort((a, b) => new Date(a.date) - new Date(b.date));

// Écrire le fichier combiné
fs.writeFileSync(outputFile, JSON.stringify(allArticles, null, 2));

console.log(`\n✅ Fichier créé: ${outputFile}`);
console.log(`   Taille: ${(fs.statSync(outputFile).size / 1024 / 1024).toFixed(2)} Mo`);

#!/usr/bin/env node
/**
 * optimize-vehicle-assets.js
 * =============================================================================
 * ANSA Mitsubishi 2026 — Vehicle Asset Optimization Batch
 *
 * Converts heavy raw TIFF / PNG / JPEG vehicle assets into optimized web assets:
 *   - Hero / Exterior:     Max 1920x1080 JPG, quality 85, stripped metadata.
 *   - Swatch Vehicles:     Max 1200x675 WebP, quality 85, transparent background maintained where applicable.
 *   - Interior / Highlights: Max 800x1000 JPG, quality 82.
 *
 * Output target: .cache/optimized-outlander-sport/
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Determine project root and paths
const candidateRoots = [
	path.resolve(__dirname, '..'),
	path.resolve(__dirname, '../..'),
	process.cwd(),
	path.resolve(process.cwd(), '..'),
];

let rawDir = null;
let projectRoot = null;

for (const candidate of candidateRoots) {
	const testPath = path.join(candidate, 'content-raw/02_Showroom_Models/Outlander_Sport_HEV');
	if (fs.existsSync(testPath)) {
		rawDir = testPath;
		projectRoot = candidate;
		break;
	}
}

if (!rawDir) {
	console.error('❌ Could not locate content-raw/02_Showroom_Models/Outlander_Sport_HEV directory.');
	process.exit(1);
}

// Output destinations (both root and nuxt folder if distinct)
const outputDirs = [
	path.resolve(projectRoot, '.cache/optimized-outlander-sport'),
];

const nuxtCacheDir = path.resolve(projectRoot, 'nuxt/.cache/optimized-outlander-sport');
if (fs.existsSync(path.resolve(projectRoot, 'nuxt')) && !outputDirs.includes(nuxtCacheDir)) {
	outputDirs.push(nuxtCacheDir);
}

// Supported input formats
const SUPPORTED_EXTS = new Set(['.tif', '.tiff', '.png', '.jpg', '.jpeg', '.webp']);

/**
 * Determine category and transformation rule for a given file
 */
function getTargetProfile(relPath) {
	const normalized = relPath.replace(/\\/g, '/');
	
	if (normalized.startsWith('Exterior/')) {
		return {
			category: 'Hero/Exterior',
			format: 'jpg',
			maxWidth: 1920,
			maxHeight: 1080,
			quality: 85,
			stripMetadata: true,
		};
	}
	
	if (normalized.startsWith('Mono_Tone_Front_Left/') || normalized.startsWith('2_Tone_Front_Left/')) {
		return {
			category: 'Swatch Vehicles',
			format: 'webp',
			maxWidth: 1200,
			maxHeight: 675,
			quality: 85,
			preserveAlpha: true,
			stripMetadata: true,
		};
	}
	
	if (normalized.startsWith('Interior/') || normalized.startsWith('RHD_Battery/')) {
		return {
			category: 'Interior/Highlights',
			format: 'jpg',
			maxWidth: 800,
			maxHeight: 1000,
			quality: 82,
			stripMetadata: true,
		};
	}

	// Default fallback to Interior/Highlights
	return {
		category: 'Interior/Highlights',
		format: 'jpg',
		maxWidth: 800,
		maxHeight: 1000,
		quality: 82,
		stripMetadata: true,
	};
}

/**
 * Collect all raw image files
 */
function collectFiles(dir, base = '') {
	const results = [];
	const entries = fs.readdirSync(dir, { withFileTypes: true });

	for (const entry of entries) {
		const fullPath = path.join(dir, entry.name);
		const relPath = path.join(base, entry.name);

		if (entry.isSymbolicLink()) {
			// Skip broken symlinks or directory symlinks
			try {
				if (fs.statSync(fullPath).isDirectory()) {
					continue;
				}
			} catch {
				continue;
			}
		}

		if (entry.isDirectory()) {
			results.push(...collectFiles(fullPath, relPath));
		} else if (entry.isFile()) {
			const ext = path.extname(entry.name).toLowerCase();
			if (SUPPORTED_EXTS.has(ext)) {
				results.push({ fullPath, relPath, ext, name: entry.name });
			}
		}
	}

	return results;
}

/**
 * Main optimization worker
 */
async function run() {
	console.log('===============================================================');
	console.log('🚙 Mitsubishi Outlander Sport HEV — Asset Optimization Batch');
	console.log('===============================================================');
	console.log(`📁 Source directory: ${rawDir}`);
	console.log(`🎯 Output targets:`);
	for (const outDir of outputDirs) {
		console.log(`   - ${outDir}`);
		fs.mkdirSync(outDir, { recursive: true });
	}
	console.log('---------------------------------------------------------------');

	const files = collectFiles(rawDir);
	console.log(`🔍 Discovered ${files.length} candidate asset files.\n`);

	let totalOriginalBytes = 0;
	let totalOptimizedBytes = 0;
	let processedCount = 0;

	for (const file of files) {
		const profile = getTargetProfile(file.relPath);
		const baseName = path.basename(file.name, file.ext);
		const outFilename = `${baseName}.${profile.format}`;
		const relDir = path.dirname(file.relPath);

		const origStat = fs.statSync(file.fullPath);
		totalOriginalBytes += origStat.size;

		try {
			let pipeline = sharp(file.fullPath).rotate();

			pipeline = pipeline.resize(profile.maxWidth, profile.maxHeight, {
				fit: 'inside',
				withoutEnlargement: true,
			});

			if (profile.format === 'jpg') {
				// Flatten transparent channels against white for JPG outputs
				pipeline = pipeline.flatten({ background: '#ffffff' }).jpeg({
					quality: profile.quality,
					mozjpeg: true,
					progressive: true,
				});
			} else if (profile.format === 'webp') {
				pipeline = pipeline.webp({
					quality: profile.quality,
					alphaQuality: 90,
					effort: 4,
				});
			}

			// Render buffer once
			const buffer = await pipeline.toBuffer();
			const optSize = buffer.length;
			totalOptimizedBytes += optSize;

			// Write to all target directories
			for (const baseOutDir of outputDirs) {
				const destDir = path.join(baseOutDir, relDir);
				fs.mkdirSync(destDir, { recursive: true });
				const destPath = path.join(destDir, outFilename);
				fs.writeFileSync(destPath, buffer);
			}

			const savings = ((1 - optSize / origStat.size) * 100).toFixed(1);
			const origMb = (origStat.size / (1024 * 1024)).toFixed(2);
			const optKb = (optSize / 1024).toFixed(1);

			console.log(
				`✅ [${profile.category}] ${file.relPath} -> ${outFilename} ` +
				`(${origMb}MB -> ${optKb}KB, -${savings}%)`
			);
			processedCount++;
		} catch (err) {
			console.error(`❌ Failed to optimize ${file.relPath}:`, err.message);
		}
	}

	const totalSavedMb = ((totalOriginalBytes - totalOptimizedBytes) / (1024 * 1024)).toFixed(2);
	const totalOrigMb = (totalOriginalBytes / (1024 * 1024)).toFixed(2);
	const totalOptMb = (totalOptimizedBytes / (1024 * 1024)).toFixed(2);
	const totalSavingsPercent = ((1 - totalOptimizedBytes / totalOriginalBytes) * 100).toFixed(1);

	console.log('\n===============================================================');
	console.log(`🎉 Optimization Complete!`);
	console.log(`   Assets processed:   ${processedCount} / ${files.length}`);
	console.log(`   Original total:     ${totalOrigMb} MB`);
	console.log(`   Optimized total:    ${totalOptMb} MB`);
	console.log(`   Storage reduction:  ${totalSavedMb} MB (${totalSavingsPercent}%)`);
	console.log('===============================================================');
}

run().catch((err) => {
	console.error('Fatal error during optimization:', err);
	process.exit(1);
});

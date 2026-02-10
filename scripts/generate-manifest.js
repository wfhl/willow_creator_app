import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const publicDir = path.join(__dirname, '../public/GenReference');
const outputFile = path.join(__dirname, '../public/gen-reference-manifest.json');

// Ensure directory exists
if (!fs.existsSync(publicDir)) {
    console.error(`Directory not found: ${publicDir}`);
    process.exit(1);
}

// Read files
try {
    const files = fs.readdirSync(publicDir);
    // Filter for images
    const images = files.filter(file => /\.(jpg|jpeg|png|webp|gif|mp4)$/i.test(file));

    fs.writeFileSync(outputFile, JSON.stringify(images, null, 2));
    console.log(`Manifest generated with ${images.length} assets.`);
} catch (err) {
    console.error('Error generating manifest:', err);
    process.exit(1);
}

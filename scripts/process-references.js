
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration
const SOURCE_DIR = path.join(__dirname, '../GenReference');
const PUBLIC_DIR = path.join(__dirname, '../public');
const DEST_DIR = path.join(PUBLIC_DIR, 'references');
const OUTPUT_FILE_PATH = path.join(PUBLIC_DIR, 'references.json');

// Ensure destination exists
if (!fs.existsSync(DEST_DIR)) {
    fs.mkdirSync(DEST_DIR, { recursive: true });
}

async function processReferences() {
    console.log("Scanning GenReference folder...");

    if (!fs.existsSync(SOURCE_DIR)) {
        console.error(`Source directory not found: ${SOURCE_DIR}`);
        return;
    }

    const files = fs.readdirSync(SOURCE_DIR);
    const validExtensions = ['.jpg', '.jpeg', '.png', '.webp', '.gif'];

    const posts = [];
    let count = 0;

    console.log(`Found ${files.length} files. Processing...`);

    for (const file of files) {
        const ext = path.extname(file).toLowerCase();
        if (!validExtensions.includes(ext)) continue;

        const sourcePath = path.join(SOURCE_DIR, file);
        const destPath = path.join(DEST_DIR, file);
        const webPath = `/references/${file}`;

        // 1. Copy file to public/references if it doesn't exist or is different
        // For simplicity, just Copy. (Vite will serve it)
        try {
            // Check if exists to avoid excessive IO? 
            if (!fs.existsSync(destPath)) {
                fs.copyFileSync(sourcePath, destPath);
            }
        } catch (e) {
            console.error(`Failed to copy ${file}:`, e);
            continue;
        }

        // 2. Create Post Object
        // Clean filename for topic
        const topic = path.basename(file, ext).replace(/_/g, ' ').replace(/-/g, ' ').replace(/\s+/g, ' ').trim();

        const timestamp = Date.now(); // We could read file modified time if we wanted order

        const post = {
            id: `ref_${file}`, // Stable ID based on filename
            timestamp: fs.statSync(sourcePath).mtimeMs, // Use file modification time
            topic: topic.substring(0, 50) + (topic.length > 50 ? '...' : ''),
            caption: "",
            captionType: "reference",
            mediaUrls: [webPath],
            mediaType: 'image', // Assuming all are images for now
            themeId: "CUSTOM",
            visuals: "GenReference",
            outfit: "",
            prompt: "",
            tags: ["GenReference"]
        };

        posts.push(post);
        count++;

        if (count % 50 === 0) console.log(`Processed ${count} items...`);
    }

    console.log(`Writing catalog to ${OUTPUT_FILE_PATH}...`);
    fs.writeFileSync(OUTPUT_FILE_PATH, JSON.stringify(posts, null, 2));
    console.log(`Done! processed ${count} references.`);
}

processReferences();

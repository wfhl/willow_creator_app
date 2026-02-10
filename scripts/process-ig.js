
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration
const HTML_FILE_PATH = path.join(__dirname, '../WW IG DATA/your_instagram_activity/media/posts_1.html');
const BASE_MEDIA_PATH = path.join(__dirname, '../WW IG DATA/'); // Corrected base path
const OUTPUT_FILE_PATH = path.join(__dirname, '../public/ig_archive.json');

// Regex patterns
const POST_DIV_REGEX = /<div class="pam _3-95 _2ph- _a6-g uiBoxWhite noborder">([\s\S]*?)<div class="_3-94 _a6-o">([\s\S]*?)<\/div><\/div>/g;
const CAPTION_REGEX = /<h2[^>]*>([\s\S]*?)<\/h2>/;
const MEDIA_DIV_REGEX = /<div class="_3-95 _a6-p">([\s\S]*?)<\/div>/;
const IMG_SRC_REGEX = /<img src="([^"]+)"/g;
const VIDEO_SRC_REGEX = /<video src="([^"]+)"/g;

async function processArchive() {
    console.log("Reading HTML file...");
    if (!fs.existsSync(HTML_FILE_PATH)) {
        console.error(`File not found: ${HTML_FILE_PATH}`);
        return;
    }

    const htmlContent = fs.readFileSync(HTML_FILE_PATH, 'utf-8');
    const posts = [];
    let match;

    console.log("Parsing posts...");
    let count = 0;

    // Reset regex index just in case
    POST_DIV_REGEX.lastIndex = 0;

    while ((match = POST_DIV_REGEX.exec(htmlContent)) !== null) {
        count++;
        const postContent = match[1];
        const dateStr = match[2];

        // Extract Caption
        const captionMatch = CAPTION_REGEX.exec(postContent);
        let caption = captionMatch ? captionMatch[1] : '';
        // Cleanup caption HTML entities and formatting
        caption = caption.replace(/<br\s*\/?>/gi, '\n').replace(/&#064;/g, '@').replace(/&quot;/g, '"').replace(/&amp;/g, '&').replace(/&#039;/g, "'");
        // Remove line numbers if they were captured (the user's view_file output showed line numbers, ensure they aren't in the file logic. The file content itself shouldn't have them, the tool added them).

        // Extract Media
        const mediaUrls = [];
        let mediaType = 'image';

        // Scan the entire post content for media (fixing previous issue with nested divs breaking regex)
        const contentToScan = postContent;

        // Check for Videos
        let videoMatch;
        // Reset regex index
        VIDEO_SRC_REGEX.lastIndex = 0;
        while ((videoMatch = VIDEO_SRC_REGEX.exec(contentToScan)) !== null) {
            mediaType = 'video';
            const relativePath = videoMatch[1];
            const fullPath = path.join(BASE_MEDIA_PATH, relativePath);

            try {
                if (fs.existsSync(fullPath)) {
                    // Avoid duplicates if any
                    // (Simple check not implemented for speed, relying on regex uniqueness in this context usually being ordered)
                    const fileData = fs.readFileSync(fullPath);
                    const base64 = `data:video/mp4;base64,${fileData.toString('base64')}`;
                    mediaUrls.push(base64);
                } else {
                    console.warn(`Video not found: ${fullPath}`);
                }
            } catch (e) {
                console.error(`Error reading video ${fullPath}:`, e);
            }
        }

        // Check for Images
        let imgMatch;
        // Reset regex index
        IMG_SRC_REGEX.lastIndex = 0;
        while ((imgMatch = IMG_SRC_REGEX.exec(contentToScan)) !== null) {
            const relativePath = imgMatch[1];
            // Skip icons/assets that aren't posts (usually in 'files/' or external)
            if (relativePath.includes('Instagram-Logo') || relativePath.startsWith('http')) continue;

            const fullPath = path.join(BASE_MEDIA_PATH, relativePath);

            try {
                if (fs.existsSync(fullPath)) {
                    const fileData = fs.readFileSync(fullPath);
                    // Guess mime type based on extension
                    const ext = path.extname(fullPath).toLowerCase().replace('.', '');
                    const mime = ext === 'jpg' ? 'jpeg' : ext;
                    const base64 = `data:image/${mime};base64,${fileData.toString('base64')}`;
                    mediaUrls.push(base64);
                } else {
                    console.warn(`Image not found: ${fullPath}`);
                }
            } catch (e) {
                console.error(`Error reading image ${fullPath}:`, e);
            }
        }

        if (mediaUrls.length > 0) {
            const timestamp = new Date(dateStr).getTime();

            // Intelligent Titling
            let title = "Instagram Memory";
            if (caption) {
                // Take first line or first sentence
                const firstLine = caption.split('\n')[0];
                // Remove emojis for title cleanly (optional, but sometimes better for readable titles)
                // Actually, keep them, users like them.
                // Just ensure it's not too long.
                title = firstLine.substring(0, 60);
                if (firstLine.length > 60) title += "...";
            } else {
                title = `IG Post ${new Date(dateStr).toLocaleDateString()}`;
            }

            const post = {
                id: `ig_${timestamp}_${count}`,
                timestamp: isNaN(timestamp) ? Date.now() : timestamp,
                topic: title,
                caption: caption.trim(),
                captionType: "original",
                mediaUrls: mediaUrls,
                mediaType: mediaType,
                themeId: "CUSTOM",
                visuals: "Instagram Archive",
                outfit: "",
                prompt: "",
                tags: ["OG IG"]
            };
            posts.push(post);
        }

        if (count % 50 === 0) console.log(`Processed ${count} posts...`);
    }

    console.log(`Finished processing. Found ${posts.length} posts.`);

    // Chunking to avoid browser crash
    const CHUNK_SIZE = 50;
    const TOTAL_CHUNKS = Math.ceil(posts.length / CHUNK_SIZE);

    console.log(`Splitting into ${TOTAL_CHUNKS} chunks...`);

    for (let c = 0; c < TOTAL_CHUNKS; c++) {
        const chunk = posts.slice(c * CHUNK_SIZE, (c + 1) * CHUNK_SIZE);
        const chunkPath = path.join(__dirname, `../public/ig_archive_${c}.json`);
        console.log(`Writing chunk ${c} to ${chunkPath}...`);
        fs.writeFileSync(chunkPath, JSON.stringify(chunk, null, 2));
    }

    // Write a manifest or just let client guess
    // We'll write a simple manifest
    const manifestPath = path.join(__dirname, '../public/ig_archive_manifest.json');
    fs.writeFileSync(manifestPath, JSON.stringify({ totalChunks: TOTAL_CHUNKS, totalPosts: posts.length }));

    console.log("Done! Manifest written.");
}

processArchive();

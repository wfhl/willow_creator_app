import { GoogleGenerativeAI } from "@google/generative-ai";
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Load env vars manually without dotenv
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const envPath = path.resolve(__dirname, '../.env.local');

let apiKey = '';
try {
    const envContent = fs.readFileSync(envPath, 'utf-8');
    const match = envContent.match(/VITE_GEMINI_API_KEY=(.*)/);
    if (match && match[1]) {
        apiKey = match[1].trim();
    }
} catch (e) {
    console.warn("Could not read .env.local");
}

if (!apiKey) {
    console.error("No API Key found in .env.local");
    process.exit(1);
}

console.log("Checking models with key ending in:", apiKey.slice(-4));

const genAI = new GoogleGenerativeAI(apiKey);

async function listModels() {
    try {
        const modelResponse = await genAI.getGenerativeModel({ model: "gemini-1.5-flash" }); // Dummy init to get access? No, usually separate method.
        // The SDK doesn't always expose listModels directly easily in the client-side tailored package, 
        // but let's try the direct REST call if SDK fails, or use the clean SDK method if exists.

        // Unfortuantely @google/generative-ai 0.1.0+ changed structure. 
        // Let's use a raw fetch to be sure.

        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
        const data = await response.json();

        if (data.models) {
            console.log("Available Models:");
            data.models.forEach(m => {
                console.log(`- ${m.name} (${m.supportedGenerationMethods.join(', ')})`);
            });
        } else {
            console.log("No models listed or error:", data);
        }

    } catch (e) {
        console.error("Error listing models:", e);
    }
}

listModels();

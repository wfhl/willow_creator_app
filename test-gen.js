import { GoogleGenAI, HarmCategory, HarmBlockThreshold } from "@google/genai";

async function main() {
    console.log("Starting...");
    try {
        const ai = new GoogleGenAI({ apiKey: process.env.VITE_GEMINI_API_KEY });
        const response = await ai.models.generateContent({
            model: "gemini-3-pro-image-preview",
            contents: "a photo of a cat",
            config: {
                responseModalities: ["IMAGE"],
                imageConfig: {
                    aspectRatio: "3:4",
                    imageSize: "2K"
                },
                safetySettings: [
                    { category: HarmCategory?.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold?.BLOCK_ONLY_HIGH },
                ]
            }
        });
        console.log(response);
    } catch (e) {
        console.error("Error:", e);
    }
}
main();

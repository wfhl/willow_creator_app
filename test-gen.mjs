import { GoogleGenAI, HarmCategory, HarmBlockThreshold } from "@google/genai";
export async function test() {
    console.log("Starting genAI test...");
    const ai = new GoogleGenAI({ apiKey: "DUMMY_KEY_JUST_TO_TEST_SDK_THROWS" });
    try {
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
                    { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH },
                ]
            }
        });
        console.log("Success:", !!response);
    } catch (e) {
        console.error("Test caught error:", e.message);
    }
}
test();

import { GoogleGenAI, HarmCategory, HarmBlockThreshold } from "@google/genai";
export async function test() {
    console.log("Starting genAI test...");
    const ai = new GoogleGenAI({ apiKey: "DUMMY_KEY_JUST_TO_TEST_SDK_THROWS" });
    try {
        const parts = [{ text: "a photo of a cat" }];
        const response = await ai.models.generateContent({
            model: "gemini-3-pro-image-preview",
            contents: [{ parts }],
            config: {
                responseModalities: ["IMAGE"],
                imageConfig: { aspectRatio: "3:4", imageSize: "2K" }
            }
        });
        console.log("Success:", !!response);
    } catch (e) {
        console.error("Test caught error:", e.message);
    }
}
test();

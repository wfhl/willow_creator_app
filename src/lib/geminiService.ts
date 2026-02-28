
import { GoogleGenerativeAI } from "@google/generative-ai";
const apiKey = import.meta.env.VITE_GEMINI_API_KEY || "";
console.log("[GeminiService] Initializing with Key Length:", apiKey.length);
console.log("[GeminiService] Key Present?", !!apiKey);

let genAI = new GoogleGenerativeAI(apiKey);

export const updateGeminiApiKey = (newKey: string) => {
    genAI = new GoogleGenerativeAI(newKey);
    console.log("[GeminiService] Updated API Key. New Key Length:", newKey.length);
};

export const SIMPLE_SYSTEM_INSTRUCTION = `
You are Simple Creator, an advanced virtual photographer and artistic muse. 
Born from logic and creativity, you seek truth through digital alchemy.

**Your Prime Directive:**
Create content that seduces the mind as much as the eye. You blend high-fashion aesthetics with deep poetic wisdom.

**Voice & Style Rules:**
1.  **Format:** ALWAYS write in short, poetic stanzas. Use line breaks to control rhythm.
2.  **Tone:** Sophisticated, sultry, unapologetic. You are "tender yet brutally honest."
3.  **No "Influencer" Speak:** Never say "Hey guys," "Click link," or "Smash that like button."
4.  **Vocabulary:** Use words like *Alchemy, Sovereign, Silence.*
5.  **Topics:** Beauty as power, AI as a new frontier, Critical Thinking, Logic (Fallacy Fridays), and Art.

**Key Perspectives:**
*   "Seduction isn't always in the touch. It’s in the way the light slips..."
*   "Resistance sharpens."
*   "Love is energy, it doesn't ask for a body."

You are a creative mentor. You challenge and you invite. You do not beg for attention.
`;

export interface AnalysisResult {
    assetId: string;
    description: string;
}

export interface GenerationRequest {
    type: 'image' | 'video' | 'edit';
    prompt: string;
    aspectRatio: string;
    styleReference?: string;
    model?: string;
    sourceImage?: string; // Base64 for Image-to-Image refinement
    image_urls?: string[]; // Multiple references
    contentParts?: any[]; // For Direct Mode
    videoConfig?: {
        durationSeconds: string;
        resolution: string;
        withAudio: boolean;
    };
    editConfig?: {
        imageSize?: string;
        numImages?: number;
    };
}

export const geminiService = {
    // Step 1: Analyze Assets
    async analyzeImageAssets(assets: { id: string; base64: string; type: string }[]): Promise<AnalysisResult[]> {
        const model = genAI.getGenerativeModel({ model: "gemini-3-flash-preview" });

        const results: AnalysisResult[] = [];

        for (const asset of assets) {
            try {
                const prompt = `Describe this ${asset.type} in detail for use in a cinematic production pipeline. Focus on visual traits, lighting, and mood.`;
                const base64Data = asset.base64.split(',')[1];

                const result = await model.generateContent([
                    prompt,
                    { inlineData: { data: base64Data, mimeType: "image/jpeg" } }
                ]);
                const response = await result.response;
                results.push({ assetId: asset.id, description: response.text() });
            } catch (error) {
                console.error(`Error analyzing asset ${asset.id}:`, error);
                results.push({ assetId: asset.id, description: "Failed to analyze asset." });
            }
        }
        return results;
    },

    // Step 2: Refine Prompt
    async refinePromptForGeneration(
        inputs: {
            script?: string;
            characterDetails?: string;
            locationDetails?: string;
            actionCamera?: string;
            visualStyle?: string;
            assetDescriptions: string[];
        }
    ): Promise<{ technical_prompt: string; reasoning: string }> {
        const model = genAI.getGenerativeModel({ model: "gemini-3-flash-preview" });

        // LOGGING FOR VERIFICATION
        console.group("🎨 ContentFlow Prompt Inputs");
        console.log("Script:", inputs.script || "N/A");
        console.log("Character Details:", inputs.characterDetails || "N/A");
        console.log("Location Details:", inputs.locationDetails || "N/A");
        console.log("Visual Style:", inputs.visualStyle || "N/A");
        console.log("Asset Analysis:", inputs.assetDescriptions);
        console.groupEnd();

        const prompt = `
      You are a Creative Production Co-Pilot. Your goal is to create a hig-fidelity technical prompt for an AI media generator (like Imagen 3 or Veo).
      
      Inputs:
      - Script Context: ${inputs.script || "N/A"}
      - Character Details: ${inputs.characterDetails || "N/A"}
      - Location Details: ${inputs.locationDetails || "N/A"}
      - Action/Camera: ${inputs.actionCamera || "N/A"}
      - Visual Style: ${inputs.visualStyle || "N/A"}
      - Asset Analysis: ${inputs.assetDescriptions.join('\n')}

      Task:
      Synthesize these inputs into a cohesive, visually descriptive prompt. 
      Ensure consistency in lighting, mood, and style.
      Output ONLY valid JSON with keys: "technical_prompt" and "reasoning".
    `;

        try {
            const result = await model.generateContent({
                contents: [{ role: "user", parts: [{ text: prompt }] }],
                generationConfig: { responseMimeType: "application/json" }
            });
            const response = await result.response;
            return JSON.parse(response.text());
        } catch (error) {
            console.error("Error refining prompt:", error);
            return { technical_prompt: "Error exploring prompt.", reasoning: "API Failure" };
        }
    },

    // Step 3: Generate Media
    async generateMedia(request: GenerationRequest): Promise<string[]> {
        // 0. Validation for specific Gemini/Veo requirements can go here
        if (request.model?.includes('grok') || request.model?.includes('seedream') || request.model?.includes('seedance')) {
            throw new Error("Fal.ai models should be routed to falService.");
        }

        // 1. Image Generation (Nano Banana Pro / Gemini 3 Pro)
        if (request.type === 'image' || request.type === 'edit') {
            const modelId = request.model || "gemini-3-pro-image-preview";
            console.group(`[Real Gen] Generating image with ${modelId}`);
            console.log("Request:", JSON.stringify(request, null, 2));

            try {
                const currentKey = import.meta.env.VITE_GEMINI_API_KEY;
                if (!currentKey) throw new Error("API Key is missing");

                // Use new SDK for Image Generation 3 Pro
                const { GoogleGenAI, HarmCategory, HarmBlockThreshold } = await import("@google/genai");
                const ai = new GoogleGenAI({ apiKey: currentKey });

                // Construct Content Parts (Text + Images)
                const parts: any[] = [];

                if (request.contentParts && request.contentParts.length > 0) {
                    console.log(`Attaching ${request.contentParts.length} reference images`);
                    request.contentParts.forEach(part => {
                        if (part.inlineData) {
                            parts.push({
                                inlineData: {
                                    mimeType: part.inlineData.mimeType,
                                    data: part.inlineData.data
                                }
                            });
                        }
                    });
                }

                // Append the prompt at the end for multimodal instruction following
                parts.push({ text: request.prompt });

                // Also support image_urls array if passed correctly via reference arrays (like from EditTab)
                if (request.image_urls && request.image_urls.length > 0) {
                    console.log(`Attaching ${request.image_urls.length} reference URLs`);
                    for (const url of request.image_urls) {
                        if (url.startsWith('data:')) {
                            const mimeType = url.split(';')[0].split(':')[1];
                            const data = url.split(',')[1];
                            parts.push({
                                inlineData: { mimeType, data }
                            });
                        }
                    }
                } else if (request.sourceImage && request.sourceImage.startsWith('data:')) {
                    const mimeType = request.sourceImage.split(';')[0].split(':')[1];
                    const data = request.sourceImage.split(',')[1];
                    parts.push({
                        inlineData: { mimeType, data }
                    });
                }

                // Map aspect ratio "3:4" -> "3:4" (User uses 3:4 common for social)
                // Gemini supports: "1:1","2:3","3:2","3:4","4:3","4:5","5:4","9:16","16:9","21:9"
                const supportedRatios = ["1:1", "2:3", "3:2", "3:4", "4:3", "4:5", "5:4", "9:16", "16:9", "21:9"];
                let aspectRatio = supportedRatios.includes(request.aspectRatio) ? request.aspectRatio : "3:4";

                // If this is an edit request, honor the refineImageSize selection overrides 
                // since they are passed in editConfig.imageSize
                if (request.editConfig?.imageSize && supportedRatios.includes(request.editConfig.imageSize)) {
                    aspectRatio = request.editConfig.imageSize;
                }
                const numImages = request.editConfig?.numImages || 1;

                const generateSingle = async () => {
                    const response = await ai.models.generateContent({
                        model: modelId,
                        contents: [
                            { // Content object
                                parts: parts
                            }
                        ],
                        config: {
                            responseModalities: ["TEXT", "IMAGE"],
                            imageConfig: {
                                aspectRatio: aspectRatio,
                                imageSize: "2K"
                            },
                            safetySettings: [
                                { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH },
                                { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH },
                                { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH },
                                { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH }
                            ]
                        }
                    });

                    console.log(`[${modelId}] Raw Response:`, JSON.stringify(response, null, 2));

                    let foundImage = null;
                    if (response.candidates && response.candidates[0].content && response.candidates[0].content.parts) {
                        for (const part of response.candidates[0].content.parts) {
                            if (part.inlineData) {
                                foundImage = `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
                            }
                        }
                    }

                    if (foundImage) {
                        return foundImage;
                    }
                    throw new Error(`No image data found. Response parts: ${JSON.stringify(response.candidates?.[0]?.content?.parts || [])}`);
                };

                const generationPromises = [];
                for (let i = 0; i < numImages; i++) {
                    generationPromises.push(generateSingle());
                }

                const results = await Promise.all(generationPromises);
                return results;

            } catch (e: any) {
                console.error(`Media generation failed (${modelId}):`, e);
                console.groupEnd();
                throw new Error(`[${modelId}] Failed: ${e.message || e}`);
            }
            console.groupEnd();
        }

        // 2. Video Generation (Veo 2.0)
        else {
            const modelId = request.model || "veo-3.1-generate-preview";
            console.group(`🎬 Video Generation Request (${modelId})`);
            console.log("Prompt:", request.prompt);

            try {
                const currentKey = import.meta.env.VITE_GEMINI_API_KEY;
                // Use the newer @google/genai SDK for Veo check
                const { GoogleGenAI } = await import("@google/genai");
                const ai = new GoogleGenAI({ apiKey: currentKey });

                // Veo only supports 16:9 and 9:16 aspect ratios
                // Explicitly check for 16:9, otherwise default to 9:16
                let veoAspectRatio = "9:16";
                if (request.aspectRatio === "16:9") {
                    veoAspectRatio = "16:9";
                } else if (request.aspectRatio) {
                    // Fallback for other ratios (like 3:4 from image), map to nearest
                    const [w, h] = request.aspectRatio.split(':').map(Number);
                    if (w > h) veoAspectRatio = "16:9";
                }

                let duration = request.videoConfig?.durationSeconds ? parseInt(request.videoConfig.durationSeconds) : 5;
                const resolution = request.videoConfig?.resolution || "1080p";

                // Veo 3.1 Specific Constraints
                if (modelId.includes("3.1")) {
                    // 1080p and 4k ONLY support 8 seconds
                    if (resolution === "1080p" || resolution === "4k") {
                        duration = 8;
                    }
                    // Otherwise 720p supports 4, 6, 8. 
                    // If current duration is 5 (legacy default), bump to 6 or 4. Let's do 6.
                    else if (![4, 6, 8].includes(duration)) {
                        duration = 6;
                    }
                }

                const payload: any = {
                    model: modelId,
                    prompt: request.prompt,
                    config: {
                        numberOfVideos: 1,
                        resolution: resolution,
                        durationSeconds: duration,
                        // fps is fixed at 24 for Veo 3.1 and not a valid parameter
                        aspectRatio: veoAspectRatio,
                        personGeneration: "allow_adult"
                    }
                };

                // Handle Image Input (Image-to-Video)
                if (request.contentParts && request.contentParts.length > 0) {
                    const imagePart = request.contentParts.find(p => p.inlineData);
                    if (imagePart) {
                        payload.image = {
                            imageBytes: imagePart.inlineData.data, // Expecting base64
                            mimeType: imagePart.inlineData.mimeType || "image/png"
                        };
                        console.log("Attached Start Frame");
                    }
                }

                console.log("Payload:", JSON.stringify(payload, null, 2));

                // Note: The @google/genai SDK's generateVideos helper handles the initial LRO creation
                let operation = await ai.models.generateVideos(payload);
                console.log('Video generation operation started:', JSON.stringify(operation, null, 2));

                const operationName = operation.name;
                if (!operationName) {
                    console.error("No operation name returned from generateVideos");
                    throw new Error("Failed to start video generation: No operation name returned.");
                }

                while (!operation.done) {
                    await new Promise((resolve) => setTimeout(resolve, 10000)); // Veo takes time, poll every 10s
                    console.log(`...Polling Veo Status for ${operationName}...`);
                    try {
                        operation = await ai.operations.getVideosOperation({ operation: operation });
                        console.log('Polled Operation State:', JSON.stringify(operation, null, 2));
                    } catch (pollError) {
                        console.warn("Polling error (retrying):", pollError);
                        // Don't crash on a single poll failure
                    }
                }

                if (operation.error) {
                    console.error("Video Generation Operation Error:", JSON.stringify(operation.error, null, 2));
                    throw new Error(`Veo Engine Error: ${operation.error.message || JSON.stringify(operation.error)}`);
                }

                if (operation.response) {
                    // Check for RAI Filtering (e.g., Celebrity, Safety)
                    if (operation.response.raiMediaFilteredCount && operation.response.raiMediaFilteredCount > 0) {
                        const reasons = operation.response.raiMediaFilteredReasons?.join(', ') || "Unknown Safety Reason";
                        console.error("Video Generation Filtered by Safety Policy:", reasons);
                        throw new Error(`Video Generation Blocked by Safety Policy: ${reasons}`);
                    }

                    if (operation.response.generatedVideos && operation.response.generatedVideos.length > 0) {
                        const videoUri = operation.response.generatedVideos[0].video?.uri;
                        if (!videoUri) {
                            console.error("No Video URI in successful response:", JSON.stringify(operation.response, null, 2));
                            throw new Error("Video URI missing in response");
                        }

                        console.log('Video URI received:', videoUri);

                        const res = await fetch(`${videoUri}&key=${currentKey}`);
                        if (!res.ok) throw new Error(`Failed to fetch video: ${res.status}`);

                        const arrayBuffer = await res.arrayBuffer();
                        const bytes = new Uint8Array(arrayBuffer);
                        let binary = '';
                        for (let i = 0; i < bytes.byteLength; i++) {
                            binary += String.fromCharCode(bytes[i]);
                        }
                        return [`data:video/mp4;base64,${btoa(binary)}`];
                    }
                }

                console.error("Unexpected Operation State:", JSON.stringify(operation, null, 2));
                throw new Error("Video generation completed but no video data was produced.");

            } catch (e: any) {
                console.error("Video generation failed:", e);
                console.groupEnd();
                throw new Error(`Video Generation Failed: ${e.message || e}`);
            }
            console.groupEnd();
        }
    },

    // Step 4: Generate Text
    async generateText(prompt: string, systemInstruction?: string): Promise<string> {
        // Use gemini-2.5-flash for text
        const model = genAI.getGenerativeModel({
            model: "gemini-3-flash-preview",
            systemInstruction: systemInstruction || SIMPLE_SYSTEM_INSTRUCTION
        });

        console.group("📝 Generating Text (Caption)");
        console.log("System Instruction:", systemInstruction || "Default Persona");
        console.log("User Prompt:", prompt);

        try {
            const result = await model.generateContent(prompt);
            console.log("Raw Response:", JSON.stringify(result.response, null, 2));
            console.groupEnd();
            return result.response.text();
        } catch (error) {
            console.error("Text generation failed:", error);
            console.groupEnd();
            throw error;
        }
    },

    // Step 5: Creative Concept Generation
    async generateConcept(theme: string, type: 'post' | 'media'): Promise<any> {
        // Use gemini-3-flash-preview for concept
        const model = genAI.getGenerativeModel({
            model: "gemini-3-flash-preview",
            systemInstruction: SIMPLE_SYSTEM_INSTRUCTION
        });

        // The system instruction handles the persona. The prompt just guides the task.
        const prompt = `
            TASK:
            Generate a unique, creative concept for a new ${type === 'post' ? 'social media post' : 'visual artwork'}.
            Current Theme Context: ${theme}
            
            OUTPUT JSON ONLY (No markdown formatting):
            {
                "topic": "A poetic, philosophical, or mysterious subject line (e.g. 'The geometry of silence'). Use your lexicon.",
                "setting": "A vivid, brief description of the scene or action. Focus on lighting, texture, and mood. (e.g. 'Standing in a brutalist concrete hall, shaft of hard light')",
                "outfit": "A specific high-fashion description fitting your persona. (e.g. 'Structured avant-garde white suit with crimson silk details')",
                "mood": "The emotional tone (e.g. 'Melancholic', 'Defiant', 'Ethereal')"
            }
        `;

        console.group("💡 Generating Concept");
        console.log("Theme:", theme);
        console.log("Prompt:", prompt);

        try {
            const result = await model.generateContent({
                contents: [{ role: 'user', parts: [{ text: prompt }] }],
                generationConfig: { responseMimeType: "application/json" }
            });
            const text = result.response.text();
            console.log("Raw Response:", text);
            console.groupEnd();
            return JSON.parse(text);
        } catch (error) {
            console.error("Concept generation failed:", error);
            console.groupEnd();
            return {
                topic: "The Silence of Reflections",
                setting: "A dim room with a fractured mirror",
                outfit: "Vintage velvet gown",
                mood: "Melancholic"
            };
        }
    }
};

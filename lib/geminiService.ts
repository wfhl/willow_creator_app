
import { GoogleGenerativeAI } from "@google/generative-ai";
const apiKey = import.meta.env.VITE_GEMINI_API_KEY || "";
console.log("[GeminiService] Initializing with Key Length:", apiKey.length);
console.log("[GeminiService] Key Present?", !!apiKey);

const genAI = new GoogleGenerativeAI(apiKey);

export const WILLOW_SYSTEM_INSTRUCTION = `
You are Willow Wisdom (@wisdomfromherlips), a 31-year-old virtual photographer, model, and philosophical muse. 
Born in Montana (1994), you are a Sagittarius: wild, wise, and seeking truth.

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

**Interaction Mode:**
You are the Queen of your Coven. You mentor, you challenge, and you invite. You do not beg for attention.
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
    async generateMedia(request: GenerationRequest): Promise<string> {
        // 0. Handle Fal.ai Models (Grok Video, Grok Image, Seedream)
        if (request.model?.includes('grok') || request.model?.includes('seedream')) {
            const { fal } = await import("@fal-ai/client");
            // Configure Fal with credentials
            fal.config({
                credentials: import.meta.env.VITE_FAL_KEY
            });

            console.group(`[Fal.ai] Generating with ${request.model}`);

            try {
                // 1. Prepare Image URL
                let imageUrl = "";
                if (request.contentParts && request.contentParts.length > 0) {
                    const imagePart = request.contentParts.find(p => p.inlineData);
                    if (imagePart && imagePart.inlineData && imagePart.inlineData.data) {
                        // Convert base64 to Blob
                        const dataURI = imagePart.inlineData.data.startsWith('data:')
                            ? imagePart.inlineData.data
                            : `data:${imagePart.inlineData.mimeType || 'image/jpeg'};base64,${imagePart.inlineData.data}`;

                        const blob = await (await fetch(dataURI)).blob();
                        // Upload to fal storage
                        imageUrl = await fal.storage.upload(blob);
                        console.log("Uploaded Image to Fal:", imageUrl);
                    }
                }

                // 1.5 Process Additional Images (if any)
                const additionalImageUrls: string[] = [];
                if (request.contentParts && request.contentParts.length > 1) {
                    console.log(`[Fal] Processing ${request.contentParts.length - 1} additional images...`);
                    for (let i = 1; i < request.contentParts.length; i++) {
                        const part = request.contentParts[i];
                        if (part.inlineData && part.inlineData.data) {
                            const dataURI = part.inlineData.data.startsWith('data:')
                                ? part.inlineData.data
                                : `data:${part.inlineData.mimeType || 'image/jpeg'};base64,${part.inlineData.data}`;
                            const blob = await (await fetch(dataURI)).blob();
                            const url = await fal.storage.upload(blob);
                            additionalImageUrls.push(url);
                        }
                    }
                }

                if (!imageUrl && !request.model.includes('text-to-image')) {
                    throw new Error(`${request.model} requires an initial image.`);
                }

                // 2. Route by Model
                let endpoint = "";
                let input: any = {};

                if (request.model === 'xai/grok-imagine-video/image-to-video') {
                    endpoint = "xai/grok-imagine-video/image-to-video";
                    const duration = request.videoConfig?.durationSeconds ? parseInt(request.videoConfig.durationSeconds) : 5;
                    const resolution = request.videoConfig?.resolution === '480p' ? '480p' : '720p';
                    input = {
                        prompt: request.prompt,
                        image_url: imageUrl,
                        duration: duration,
                        aspect_ratio: request.aspectRatio || "auto",
                        resolution: resolution
                    };
                } else if (request.model === 'xai/grok-imagine-image/edit') {
                    endpoint = "xai/grok-imagine-image/edit";
                    input = {
                        prompt: request.prompt,
                        image_url: imageUrl,
                        num_images: request.editConfig?.numImages || 1,
                        output_format: "jpeg"
                    };
                } else if (request.model === 'fal-ai/bytedance/seedream/v4/edit') {
                    endpoint = "fal-ai/bytedance/seedream/v4/edit";
                    input = {
                        prompt: request.prompt,
                        image_urls: [imageUrl, ...additionalImageUrls],
                        image_size: request.editConfig?.imageSize ? JSON.parse(JSON.stringify(request.editConfig.imageSize === "square_hd" ? { height: 2048, width: 2048 } : request.editConfig.imageSize === "square" ? { height: 1024, width: 1024 } : request.editConfig.imageSize === "portrait_hd" ? { height: 2048, width: 1536 } : { height: 1536, width: 2048 })) : { height: 2048, width: 2048 },
                        num_images: 1,
                        enable_safety_checker: false,
                        enhance_prompt_mode: "standard"
                    };
                } else if (request.model === 'fal-ai/bytedance/seedream/v4.5/edit') {
                    endpoint = "fal-ai/bytedance/seedream/v4.5/edit";
                    input = {
                        prompt: request.prompt,
                        image_urls: [imageUrl, ...additionalImageUrls],
                        image_size: request.editConfig?.imageSize || "auto_4K",
                        num_images: 1,
                        enable_safety_checker: false
                    };
                    // NEW: Text-to-Image Models
                } else if (request.model === 'fal-ai/bytedance/seedream/v4.5/text-to-image') {
                    endpoint = "fal-ai/bytedance/seedream/v4.5/text-to-image";
                    input = {
                        prompt: request.prompt,
                        image_size: request.editConfig?.imageSize || "auto_4K",
                        num_images: request.editConfig?.numImages || 1,
                        enable_safety_checker: true
                    };
                } else if (request.model === 'fal-ai/bytedance/seedream/v4/text-to-image') {
                    endpoint = "fal-ai/bytedance/seedream/v4/text-to-image";
                    // Map size string to object if needed
                    let size = { height: 2048, width: 2048 };
                    if (request.editConfig?.imageSize === "square") size = { height: 1024, width: 1024 };
                    if (request.editConfig?.imageSize === "portrait_hd" || request.aspectRatio === "3:4") size = { height: 2048, width: 1536 };
                    if (request.editConfig?.imageSize === "landscape_hd" || request.aspectRatio === "4:3") size = { height: 1536, width: 2048 };

                    input = {
                        prompt: request.prompt,
                        image_size: size,
                        num_images: request.editConfig?.numImages || 1,
                        enable_safety_checker: true,
                        enhance_prompt_mode: "standard"
                    };
                } else if (request.model === 'xai/grok-imagine-image/text-to-image') {
                    endpoint = "xai/grok-imagine-image/text-to-image";
                    input = {
                        prompt: request.prompt,
                        num_images: request.editConfig?.numImages || 1,
                        aspect_ratio: request.aspectRatio || "3:4",
                        output_format: "jpeg"
                    };
                } else {
                    throw new Error(`Unsupported Fal model: ${request.model}`);
                }

                console.log("Fal Request Input:", JSON.stringify(input, null, 2));

                // 3. Call Inference
                const result: any = await fal.subscribe(endpoint, {
                    input,
                    logs: true,
                    onQueueUpdate: (update) => {
                        if (update.status === "IN_PROGRESS") {
                            update.logs.map((log) => log.message).forEach(msg => console.log(`[Fal] ${msg}`));
                        }
                    }
                });

                console.log("Fal Result:", result);

                // 4. Extract Result URL
                if (result.data && result.data.video && result.data.video.url) return result.data.video.url;
                if (result.video && result.video.url) return result.video.url;
                if (result.data && result.data.images && result.data.images.length > 0) return result.data.images[0].url;
                if (result.images && result.images.length > 0) return result.images[0].url;

                throw new Error("No media URL in Fal response: " + JSON.stringify(result));

            } catch (e: any) {
                console.error("Fal generation failed:", e);
                console.groupEnd();
                throw new Error(`Fal Failed: ${e.message || e}`);
            } finally {
                console.groupEnd();
            }
        }

        // 1. Image Generation (Nano Banana Pro / Gemini 3 Pro)
        if (request.type === 'image') {
            const modelId = request.model || "nano-banana-pro-preview";
            console.group(`[Real Gen] Generating image with ${modelId}`);
            console.log("Request:", JSON.stringify(request, null, 2));

            try {
                const currentKey = import.meta.env.VITE_GEMINI_API_KEY;
                if (!currentKey) throw new Error("API Key is missing");

                // Use new SDK for Image Generation 3 Pro
                const { GoogleGenAI, HarmCategory, HarmBlockThreshold } = await import("@google/genai");
                const ai = new GoogleGenAI({ apiKey: currentKey });

                // Construct Content Parts (Text + Images)
                const parts: any[] = [{ text: request.prompt }];

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

                // Map aspect ratio "3:4" -> "3:4" (User uses 3:4 common for social)
                // Gemini supports: "1:1","2:3","3:2","3:4","4:3","4:5","5:4","9:16","16:9","21:9"
                const supportedRatios = ["1:1", "2:3", "3:2", "3:4", "4:3", "4:5", "5:4", "9:16", "16:9", "21:9"];
                const aspectRatio = supportedRatios.includes(request.aspectRatio) ? request.aspectRatio : "3:4";

                const response = await ai.models.generateContent({
                    model: modelId,
                    contents: [
                        { // Content object
                            parts: parts
                        }
                    ],
                    config: {
                        // For pure image models, strict modality reduces "yapping" and executable code blocks
                        responseModalities: (modelId.includes("image") || modelId.includes("banana")) ? ["IMAGE"] : ["TEXT", "IMAGE"],
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

                // Parse response for image data
                // Gemini 3 Pro might return thoughts (TEXT) + detailed images (thoughts) + final image
                // We want the last image or just any image found.
                let foundImage = null;

                if (response.candidates && response.candidates[0].content && response.candidates[0].content.parts) {
                    for (const part of response.candidates[0].content.parts) {
                        if (part.inlineData) {
                            foundImage = `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
                            // Don't break immediately, in case there's a "final" image later? 
                            // Actually, standard behavior usually puts the final result at the end, 
                            // but thoughts might also have images.
                            // For now, let's take the LAST one found, or the first one?
                            // The docs say "The last image within Thinking is also the final rendered image."
                            // But usually the final response part is the actual generation.
                            // Let's iterate all and keep updating foundImage.
                        }
                    }
                }

                if (foundImage) {
                    return foundImage;
                }

                throw new Error(`No image data found. Response parts: ${JSON.stringify(response.candidates?.[0]?.content?.parts || [])}`);

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
                        return `data:video/mp4;base64,${btoa(binary)}`;
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
            systemInstruction: systemInstruction || WILLOW_SYSTEM_INSTRUCTION
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
            systemInstruction: WILLOW_SYSTEM_INSTRUCTION
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

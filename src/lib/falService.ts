
import { fal } from "@fal-ai/client";

// Initialize Fal with credentials
fal.config({
    credentials: import.meta.env.VITE_FAL_KEY
});

export interface FalGenerationRequest {
    model: string;
    prompt: string;
    aspectRatio?: string;
    image_url?: string;
    image_urls?: string[]; // For Seedream Edit
    contentParts?: any[];  // For handling uploads if not already URL
    videoConfig?: {
        durationSeconds: string;
        resolution: string;
        withAudio: boolean;
        cameraFixed?: boolean;
    };
    editConfig?: {
        imageSize?: string;
        numImages?: number; // 1-4 for Grok, 1-6 for Seedream
        enableSafety?: boolean;
        enhancePromptMode?: "standard" | "fast";
    };
    loras?: Array<{ path: string; scale?: number }>;
}

export const falService = {
    async generateMedia(request: FalGenerationRequest): Promise<string> {
        console.group(`[Fal.ai] Generating with ${request.model}`);
        console.log("Request:", request);

        let endpoint = "";
        let input: any = {};

        try {
            // 1. Handle Image Uploads (Convert base64/blobs to Fal Storage URLs)
            let primaryImageUrl = "";
            const additionalImageUrls: string[] = [];

            if (request.contentParts && request.contentParts.length > 0) {
                // Process Component 1 (Primary)
                const p1 = request.contentParts[0];
                if (p1.inlineData && p1.inlineData.data) {
                    primaryImageUrl = await this.uploadBase64ToFal(p1.inlineData.data, p1.inlineData.mimeType);
                    console.log("Primary Image Uploaded:", primaryImageUrl);
                }

                // Process Additional Components
                for (let i = 1; i < request.contentParts.length; i++) {
                    const p = request.contentParts[i];
                    if (p.inlineData && p.inlineData.data) {
                        const url = await this.uploadBase64ToFal(p.inlineData.data, p.inlineData.mimeType);
                        additionalImageUrls.push(url);
                    }
                }
            } else if (request.image_url) {
                // Fallback if image_url is already provided direct
                primaryImageUrl = request.image_url;
            }

            // 2. Prepare Endpoint and Input

            // --- GROK MODELS ---
            if (request.model.includes('xai/grok-imagine-video/image-to-video')) {
                endpoint = "xai/grok-imagine-video/image-to-video";
                let duration = request.videoConfig?.durationSeconds ? parseInt(request.videoConfig.durationSeconds.replace('s', '')) : 5;
                if (duration > 5 && duration < 10) duration = 5;
                if (duration > 10) duration = 10;

                input = {
                    prompt: request.prompt,
                    image_url: primaryImageUrl,
                    duration: duration,
                    aspect_ratio: request.aspectRatio === 'auto' ? 'auto' : (request.aspectRatio || 'auto')
                };
                // Optional: resolution is usually fixed at 720p for this version of Grok on Fal

            } else if (request.model === 'xai/grok-imagine-image/edit') {
                endpoint = "xai/grok-imagine-image/edit";
                input = {
                    prompt: request.prompt,
                    image_url: primaryImageUrl,
                    num_images: request.editConfig?.numImages || 1, // 1-4
                    output_format: "jpeg"
                };
            } else if (request.model === 'xai/grok-imagine-image/text-to-image') {
                endpoint = "xai/grok-imagine-image/text-to-image";
                input = {
                    prompt: request.prompt,
                    num_images: request.editConfig?.numImages || 1,
                    aspect_ratio: request.aspectRatio || "3:4",
                    output_format: "jpeg"
                };

                // --- SEEDREAM (BYTEDANCE) ---
            } else if (request.model.includes('seedream/v4.5/edit') || request.model.includes('seedream/v4/edit')) {
                endpoint = request.model; // e.g. "fal-ai/bytedance/seedream/v4.5/edit"
                input = {
                    prompt: request.prompt,
                    image_urls: [primaryImageUrl, ...additionalImageUrls],
                    image_size: request.editConfig?.imageSize || "auto_4K",
                    num_images: 1,
                    enable_safety_checker: request.editConfig?.enableSafety ?? true,
                    ...(request.model.includes('v4/') ? { enhance_prompt_mode: request.editConfig?.enhancePromptMode || "standard" } : {})
                };
            } else if (request.model.includes('seedream') && request.model.includes('text-to-image')) {
                endpoint = request.model;
                input = {
                    prompt: request.prompt,
                    image_size: request.editConfig?.imageSize || "auto_4K",
                    num_images: request.editConfig?.numImages || 1,
                    enable_safety_checker: request.editConfig?.enableSafety ?? true
                };

            } else if (request.model.includes('wan/v2.6/image-to-video/flash')) {
                endpoint = "wan/v2.6/image-to-video/flash";
                // Wan 2.6: duration (5, 10, 15 string), resolution (720p, 1080p string)
                const duration = request.videoConfig?.durationSeconds?.replace('s', '') || "5";
                input = {
                    prompt: request.prompt,
                    image_url: primaryImageUrl,
                    resolution: request.videoConfig?.resolution || "1080p",
                    duration: duration,
                    enable_prompt_expansion: true,
                    enable_safety_checker: request.editConfig?.enableSafety ?? true
                };

            } else if (request.model.includes('fal-ai/wan-25-preview/image-to-video')) {
                endpoint = "fal-ai/wan-25-preview/image-to-video";
                // Wan 2.5: duration (5, 10 string), resolution (480p, 720p, 1080p string)
                const duration = request.videoConfig?.durationSeconds?.replace('s', '') || "5";
                input = {
                    prompt: request.prompt,
                    image_url: primaryImageUrl,
                    resolution: request.videoConfig?.resolution || "1080p",
                    duration: duration,
                    enable_prompt_expansion: true,
                    enable_safety_checker: request.editConfig?.enableSafety ?? true
                };

                // --- SEEDANCE (BYTEDANCE) Video ---
            } else if (request.model.includes('seedance/v1.5/pro')) {
                endpoint = "fal-ai/bytedance/seedance/v1.5/pro/image-to-video";
                // Seedance params: resolution (480p, 720p, 1080p), duration (4-12 string), camera_fixed (bool), generate_audio (bool)
                const duration = request.videoConfig?.durationSeconds?.replace('s', '') || "5";
                const apiAspectRatio = (request.aspectRatio === 'auto' || !request.aspectRatio) ? "16:9" : request.aspectRatio;

                input = {
                    prompt: request.prompt,
                    image_url: primaryImageUrl,
                    aspect_ratio: apiAspectRatio,
                    resolution: request.videoConfig?.resolution || "720p",
                    duration: duration,
                    camera_fixed: request.videoConfig?.cameraFixed || false,
                    generate_audio: request.videoConfig?.withAudio ?? true,
                    enable_safety_checker: request.editConfig?.enableSafety ?? true
                };

                // --- WAN 2.2 IMAGE-TO-VIDEO ---
            } else if (request.model.includes('wan/v2.2-a14b/image-to-video/lora')) {
                endpoint = "fal-ai/wan/v2.2-a14b/image-to-video/lora";
                // Wan 2.2: frames_per_second (4-60), num_frames (17-161). Default 81 frames / 16 fps ~= 5s.
                // We map duration "5s", "10s" to appropriate frames if possible, or stick to defaults.
                // Assuming 16 FPS: 5s = 80 frames, 10s = 160 frames.
                const durationStr = request.videoConfig?.durationSeconds?.replace('s', '') || "5";
                const filteredLoras = (request.loras || []).filter(l => l.path && l.path.trim() !== "");

                // Wan 2.2 supported Ratios: "auto", "16:9", "9:16", "1:1"
                let apiAspectRatio = request.aspectRatio || "auto";
                if (!["auto", "16:9", "9:16", "1:1"].includes(apiAspectRatio)) {
                    apiAspectRatio = "auto";
                }

                input = {
                    prompt: request.prompt.trim(),
                    image_url: primaryImageUrl,
                    resolution: request.videoConfig?.resolution === "1080p" ? "720p" : (request.videoConfig?.resolution || "720p"),
                    aspect_ratio: apiAspectRatio,
                    enable_safety_checker: request.editConfig?.enableSafety ?? false,
                };

                // For 10s duration, we must specify num_frames (max 161)
                if (durationStr === "10" || durationStr === "15") {
                    input.num_frames = 161;
                    input.frames_per_second = 16;
                }

                if (filteredLoras.length > 0) {
                    input.loras = filteredLoras;
                }


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
            console.error("Fal generation failed. Full Request Input:", JSON.stringify(input, null, 2));
            console.error("Error Detail:", e);

            // Try to extract more detail from the error for the alert
            let detail = e.message || e;
            if (e.body && typeof e.body === 'object') {
                detail += " - " + JSON.stringify(e.body);
            }
            throw new Error(`Fal Failed: ${detail}`);
        } finally {
            console.groupEnd();
        }
    },

    // Helper: Upload Base64 to Fal Storage
    async uploadBase64ToFal(base64Data: string, mimeType: string = 'image/jpeg'): Promise<string> {
        const dataURI = base64Data.startsWith('data:')
            ? base64Data
            : `data:${mimeType};base64,${base64Data}`;
        const blob = await (await fetch(dataURI)).blob();
        return await this.uploadFile(blob);
    },

    async uploadFile(file: File | Blob): Promise<string> {
        return await fal.storage.upload(file);
    }
};


import { supabase } from './supabaseClient';
import { dbService } from './dbService';
import { generateUUID } from './uuid';
// import type { Theme, CaptionStyle } from '../components/tabs/SettingsTab'; // Unused now

export const migrationService = {
    async migrateAll(onProgress?: (msg: string) => void) {
        if (!supabase) throw new Error("Supabase client not initialized");
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error("Must be logged in to migrate");

        const userId = user.id;
        const log = (msg: string) => {
            console.log(msg);
            if (onProgress) onProgress(msg);
        };

        const uploadMedia = async (url: string, type: 'image' | 'video', bucket: string = 'user-library'): Promise<string> => {
            if (!url || !url.startsWith('data:')) return url; // Already remote or external

            try {
                const fetchRes = await fetch(url);
                const blob = await fetchRes.blob();
                const ext = type === 'video' ? 'mp4' : 'png';
                const filePath = `${userId}/${generateUUID()}.${ext}`;

                const { error: uploadError } = await supabase.storage.from(bucket).upload(filePath, blob, {
                    contentType: type === 'video' ? 'video/mp4' : 'image/png',
                    upsert: true
                });

                if (uploadError) throw uploadError;

                const { data: { publicUrl } } = supabase.storage.from(bucket).getPublicUrl(filePath);
                return publicUrl;
            } catch (e) {
                console.error(`Failed to upload media to ${bucket}`, e);
                return url;
            }
        };

        log("🚀 Starting Smart Migration to Cloud Buckets...");

        // 1. Migrate Folders
        log("📁 Migrating folders...");
        const folders = await dbService.getAllFolders();

        const rootFolders = folders.filter((f) => !f.parentId);
        for (const f of rootFolders) {
            const { error } = await supabase.from('folders').upsert({
                id: f.id,
                user_id: userId,
                name: f.name,
                color: f.color,
                icon: f.icon,
                timestamp: new Date(f.timestamp).toISOString()
            });
            if (error) console.error("Error migrating folder", f.name, error);
        }

        const childFolders = folders.filter((f) => f.parentId);
        for (const f of childFolders) {
            const { error } = await supabase.from('folders').upsert({
                id: f.id,
                user_id: userId,
                name: f.name,
                parent_id: f.parentId,
                color: f.color,
                icon: f.icon,
                timestamp: new Date(f.timestamp).toISOString()
            });
            if (error) console.error("Error migrating child folder", f.name, error);
        }

        // 2. Migrate Assets (Smart Routing)
        log("🖼️ Migrating Assets (routing to Library vs Face References)...");
        const assets = await dbService.getAllAssets();
        for (let i = 0; i < assets.length; i++) {
            const a = assets[i];
            const isFaceRef = a.type === 'face_reference';
            const targetBucket = isFaceRef ? 'face-references' : 'user-library';

            if (i % 5 === 0) log(`Assets: ${i}/${assets.length}... (${targetBucket})`);

            try {
                const mediaType = (a.type === 'video') ? 'video' : 'image';
                const publicUrl = await uploadMedia(a.base64, mediaType, targetBucket);

                await supabase.from('assets').upsert({
                    id: a.id,
                    user_id: userId,
                    folder_id: a.folderId,
                    name: a.name,
                    type: a.type,
                    storage_path: publicUrl.split(`/${targetBucket}/`)[1] || 'external',
                    public_url: publicUrl,
                    bucket_id: targetBucket,
                    width: a.width || 0,
                    height: a.height || 0,
                    timestamp: new Date(a.timestamp).toISOString()
                });
            } catch (e) { console.error("Asset Migration Failed", a.name, e); }
        }

        // 3. Migrate Posts
        log("📝 Migrating Posts (routing to generated-media)...");
        const posts = await dbService.getAllPosts();
        for (let i = 0; i < posts.length; i++) {
            const p = posts[i];
            if (i % 5 === 0) log(`Posts: ${i}/${posts.length}...`);
            try {
                const uploadedUrls = await Promise.all(p.mediaUrls.map(url => uploadMedia(url, p.mediaType, 'generated-media')));
                await supabase.from('posts').upsert({
                    id: p.id,
                    user_id: userId,
                    timestamp: new Date(p.timestamp).toISOString(),
                    topic: p.topic,
                    caption: p.caption,
                    caption_type: p.captionType,
                    media_urls: uploadedUrls,
                    media_type: p.mediaType,
                    theme_id: p.themeId,
                    visuals: p.visuals,
                    outfit: p.outfit,
                    prompt: p.prompt,
                    tags: p.tags || []
                });
            } catch (e) { console.error("Post Migration Failed", p.topic, e); }
        }

        // 4. Migrate Presets
        log("⚙️ Migrating Presets...");
        const presets = await dbService.getAllPresets();
        for (const pr of presets) {
            await supabase.from('presets').upsert({
                id: pr.id,
                user_id: userId,
                name: pr.name,
                description: pr.description,
                base_prompt: pr.basePrompt,
                theme_id: pr.themeId,
                visuals: pr.visuals,
                outfit: pr.outfit,
                action: pr.action,
                model: pr.model,
                aspect_ratio: pr.aspectRatio,
                negative_prompt: pr.negativePrompt,
                video_duration: pr.videoDuration,
                video_resolution: pr.videoResolution,
                tab: pr.tab,
                timestamp: new Date(pr.timestamp).toISOString()
            });
        }

        // 5. Migrate Generation History
        log("📜 Migrating Generation History (routing to generated-media)...");
        const history = await dbService.getAllGenerationHistory();
        for (let i = 0; i < history.length; i++) {
            const h = history[i];
            if (i % 10 === 0) log(`History: ${i}/${history.length}...`);
            try {
                const uploadedUrls = await Promise.all(h.mediaUrls.map(url => uploadMedia(url, h.type, 'generated-media')));
                await supabase.from('generation_history').upsert({
                    id: h.id,
                    user_id: userId,
                    timestamp: new Date(h.timestamp).toISOString(),
                    type: h.type,
                    prompt: h.prompt,
                    model: h.model,
                    media_urls: uploadedUrls,
                    aspect_ratio: h.aspectRatio,
                    image_size: h.imageSize,
                    num_images: h.numImages,
                    video_resolution: h.videoResolution,
                    video_duration: h.videoDuration,
                    with_audio: h.withAudio,
                    camera_fixed: h.cameraFixed,
                    service: h.service,
                    status: h.status,
                    error_message: h.errorMessage,
                    theme_id: h.themeId,
                    theme_name: h.themeName,
                    topic: h.topic,
                    visuals: h.visuals,
                    outfit: h.outfit,
                    tab: h.tab
                });
            } catch (e) { console.error("History Migration Failed", h.id, e); }
        }

        // 6. Migrate Themes & Styles (into user_metadata for syncService compatibility)
        log("🎨 Migrating UI Themes & Styles to Profile...");
        const configs = await dbService.getConfigs();
        if (configs.themes.length > 0 || configs.captionStyles.length > 0) {
            await supabase.auth.updateUser({
                data: {
                    themes: configs.themes,
                    caption_styles: configs.captionStyles
                }
            });
        }

        log("✅ MIGRATION COMPLETE! Your creator studio is now 100% Cloud-Powered.");
    }
};

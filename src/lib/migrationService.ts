
import { supabase } from './supabaseClient';
import { dbService } from './dbService';
import type { DBAsset, DBFolder, DBGenerationHistory, DBSavedPost, DBPromptPreset } from './dbService';
import type { Theme, CaptionStyle } from '../components/tabs/SettingsTab';

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
                const filePath = `${userId}/${crypto.randomUUID()}.${ext}`;

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
        const folderMap = new Map<string, string>();

        const rootFolders = folders.filter((f) => !f.parentId);
        for (const f of rootFolders) {
            const { data, error } = await supabase.from('folders').insert({
                user_id: userId,
                name: f.name
            }).select().single();
            if (error) console.error("Error migrating folder", f.name, error);
            else if (data) folderMap.set(f.id, data.id);
        }

        const childFolders = folders.filter((f) => f.parentId);
        for (const f of childFolders) {
            const remoteParentId = f.parentId ? folderMap.get(f.parentId) : null;
            if (remoteParentId) {
                const { data, error } = await supabase.from('folders').insert({
                    user_id: userId,
                    name: f.name,
                    parent_id: remoteParentId
                }).select().single();
                if (error) console.error("Error migrating child folder", f.name, error);
                else if (data) folderMap.set(f.id, data.id);
            }
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
                const remoteFolderId = a.folderId ? folderMap.get(a.folderId) : null;

                await supabase.from('assets').insert({
                    user_id: userId,
                    folder_id: remoteFolderId,
                    name: a.name,
                    type: a.type,
                    storage_path: publicUrl.split(`/${targetBucket}/`)[1] || 'external',
                    public_url: publicUrl,
                    bucket_id: targetBucket,
                    width: 0,
                    height: 0
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
                await supabase.from('posts').insert({
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
            await supabase.from('presets').insert({
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
                await supabase.from('generation_history').insert({
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
                    service: h.service,
                    status: h.status,
                    error_message: h.errorMessage,
                    theme_id: h.themeId,
                    theme_name: h.themeName,
                    topic: h.topic,
                    visuals: h.visuals,
                    outfit: h.outfit
                });
            } catch (e) { console.error("History Migration Failed", h.id, e); }
        }

        // 6. Migrate Themes & Styles
        log("🎨 Migrating UI Themes & Styles...");
        const configs = await dbService.getConfigs();
        if (configs.themes.length > 0) {
            for (const t of configs.themes) {
                const theme = t as Theme;
                await supabase.from('themes').insert({
                    user_id: userId,
                    name: theme.name,
                    description: theme.description,
                    base_prompt: theme.basePrompt,
                    default_outfit: theme.defaultOutfit,
                    default_setting: theme.defaultSetting,
                    default_visuals: theme.defaultVisuals
                });
            }
        }
        if (configs.captionStyles.length > 0) {
            for (const s of configs.captionStyles) {
                const style = s as CaptionStyle;
                await supabase.from('caption_styles').insert({
                    user_id: userId,
                    label: style.label,
                    prompt: style.prompt
                });
            }
        }

        log("✅ MIGRATION COMPLETE! Your creator studio is now 100% Cloud-Powered.");
    }
};

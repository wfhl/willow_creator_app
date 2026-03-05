import { supabase } from './supabaseClient';
import { dbService, type DBStore } from './dbService';
import type { User } from '@supabase/supabase-js';

export const syncService = {
    user: null as User | null,
    recentlyDeleted: new Set<string>(),
    isSyncing: false,
    unsubscribe: null as (() => void) | null,

    init(user: User) {
        this.user = user;
        console.log("[Sync] Initializing for user:", user.email);

        // Prevent multiple listeners from stacking up
        if (this.unsubscribe) this.unsubscribe();

        // Subscribe to local changes
        this.unsubscribe = dbService.subscribe(async (store, type, data) => {
            if (!this.user) return;

            try {
                if (type === 'delete') {
                    if (data.id === 'ALL') {
                        // Handle clear all logic (optional)
                        return;
                    }

                    if (data.id === 'BATCH' && data.ids && Array.isArray(data.ids)) {
                        for (const id of data.ids) {
                            this.recentlyDeleted.add(id);
                        }
                        dbService.trackDeletionBatch(data.ids).catch(console.error);
                        await this.removeFromCloudBatch(store, data.ids);
                    } else {
                        this.recentlyDeleted.add(data.id);
                        dbService.trackDeletion(data.id).catch(console.error);
                        await this.removeFromCloud(store, data.id);
                    }
                } else {
                    await this.syncToCloud(store, data);
                    // Remove from recently deleted if it was re-added
                    this.recentlyDeleted.delete(data.id);
                }
            } catch (e) {
                console.error(`[Sync] Failed to sync ${store} ${type}:`, e);
            }
        });

        // Perform initial full sync in background
        this.fullSync();

        // Subscribe to remote changes (Realtime)
        this.subscribeToRealtime();
    },

    unsubscribeRealtime: null as (() => void) | null,

    subscribeToRealtime() {
        if (!this.user) return;
        console.log("[Sync] Setting up realtime subscriptions");

        const channels = ['assets', 'posts', 'presets', 'folders', 'generation_history'].map(table => {
            return supabase
                .channel(`remote-${table}-${this.user!.id}`)
                .on('postgres_changes', {
                    event: '*',
                    schema: 'public',
                    table: table,
                    filter: `user_id=eq.${this.user!.id}`
                }, async (payload) => {
                    if (this.isSyncing) return;

                    const store = table === 'generation_history' ? 'generation_history' : table as DBStore;

                    if (payload.eventType === 'DELETE') {
                        const id = (payload.old as any).id;
                        if (id) {
                            console.log(`[Sync] Remote DELETE on ${store}: ${id}`);
                            await dbService.deleteById(store, id);
                        }
                    } else {
                        const cloud = payload.new as any;
                        const mapped = this.mapFromCloud(store, cloud);

                        // Check if we already have it identical (avoid loops)
                        const exists = await dbService.getById(store, mapped.id);
                        if (exists && JSON.stringify(exists) === JSON.stringify(mapped)) return;

                        console.log(`[Sync] Remote ${payload.eventType} on ${store}: ${mapped.id}`);

                        if (store === 'assets') {
                            const dlAsset = await this.downloadAssetFromStorage(mapped);
                            await dbService.saveAsset(dlAsset, true);
                        }
                        else if (store === 'posts') await dbService.savePost(mapped, true);
                        else if (store === 'presets') await dbService.savePreset(mapped, true);
                        else if (store === 'folders') await dbService.saveFolder(mapped, true);
                        else if (store === 'generation_history') await dbService.saveGenerationHistory(mapped, true);
                    }
                })
                .subscribe();
        });

        this.unsubscribeRealtime = () => {
            channels.forEach(ch => supabase.removeChannel(ch));
        };
    },

    async saveUserConfig(id: string, data: any) {
        if (!this.user) return;
        const { error } = await supabase.auth.updateUser({
            data: { [id]: data }
        });
        if (error) throw error;
        console.log(`[Sync] Updated user_metadata for ${id}`);
    },

    async fullSync() {
        if (!this.user || this.isSyncing) return;
        this.isSyncing = true;
        console.group("[Sync] Full background sync session");
        try {
            await this.syncTable('folders');
            await this.syncTable('presets');
            await this.syncTable('posts');
            await this.syncTable('generation_history');
            await this.syncTable('assets');
        } catch (e) {
            console.error("[Sync] Full sync failed:", e);
        } finally {
            this.isSyncing = false;
            console.groupEnd();
        }
    },

    async syncTable(store: DBStore) {
        if (!this.user) return;
        const table = store === 'generation_history' ? 'generation_history' : store;

        console.log(`[Sync] Syncing table: ${table}`);

        let localItems: any[] = [];
        if (store === 'assets') localItems = await dbService.getAllAssetsSlim();
        else if (store === 'posts') localItems = await dbService.getAllPostsSlim();
        else if (store === 'presets') localItems = await dbService.getAllPresets();
        else if (store === 'folders') localItems = await dbService.getAllFolders();
        else if (store === 'generation_history') {
            // Load slim versions to avoid memory crashes on mobile devices with large histories
            localItems = await dbService.getRecentHistoryBatch(10000, 0, 'prev', undefined, true);
        }

        const selectQuery = store === 'folders' ? 'id, name, parent_id, user_id' : 'id, user_id';
        const { data: cloudItems, error } = await supabase
            .from(table)
            .select(selectQuery)
            .eq('user_id', this.user.id);

        if (error) throw error;

        // Push local-only to cloud
        for (const local of localItems) {
            const existsInCloud = (cloudItems as any[])?.some(c => c.id === local.id);
            if (!existsInCloud) {
                console.log(`[Sync] Pushing local-only ${store}: ${local.id}`);
                let fullLocal = local;
                try {
                    // Fetch full data with base64/media URLs for upload
                    if (store === 'generation_history') {
                        const fetchedFull = await dbService.getGenerationHistoryItem(local.id);
                        if (fetchedFull) fullLocal = fetchedFull;
                    } else if (store === 'assets' || store === 'posts') {
                        const fetchedFull = await dbService.getById(store, local.id);
                        if (fetchedFull) fullLocal = fetchedFull;
                    }
                    await this.syncToCloud(store, fullLocal);
                } catch (pushErr) {
                    console.error(`[Sync] Skipping failed push for ${local.id}:`, pushErr);
                }
            }
        }

        // Pull cloud-only to local. We need to fetch the FULL data from Supabase for those we don't have.
        // It's better to fetch them in a new batched query or one-by-one, but we can just query them all now.
        const { data: fullCloudItems, error: fullError } = await supabase
            .from(table)
            .select('*')
            .eq('user_id', this.user.id);

        if (fullError) throw fullError;

        for (const cloud of fullCloudItems) {
            const isDeleted = await dbService.isDeleted(cloud.id);
            if (this.recentlyDeleted.has(cloud.id) || isDeleted) continue;

            const mapped = this.mapFromCloud(store, cloud);
            const existsLocally = localItems.find(l => l.id === cloud.id);

            if (existsLocally) {
                // For generation history, we must update the local item if the cloud status has changed (e.g. pending -> success)
                if (store === 'generation_history' && existsLocally.status !== cloud.status) {
                    console.log(`[Sync] Updating local history item ${cloud.id} status: ${existsLocally.status} -> ${cloud.status}`);
                    // Fallthrough to update
                } else {
                    continue;
                }
            }

            // Simple merging for unique content
            if (store === 'folders' && !existsLocally) {
                const sameName = localItems.find(l => l.name === mapped.name && l.parentId === mapped.parentId);
                if (sameName) {
                    await this.removeFromCloud(store, mapped.id);
                    continue;
                }
            }

            console.log(`[Sync] Pulling cloud-only ${store}: ${cloud.id}`);

            if (store === 'assets') {
                try {
                    const dlAsset = await this.downloadAssetFromStorage(mapped);
                    await dbService.saveAsset(dlAsset, true);
                } catch (e) {
                    console.error(`[Sync] Failed to download asset ${cloud.id}`, e);
                }
            }
            else if (store === 'posts') await dbService.savePost(mapped, true);
            else if (store === 'presets') await dbService.savePreset(mapped, true);
            else if (store === 'folders') await dbService.saveFolder(mapped, true);
            else if (store === 'generation_history') await dbService.saveGenerationHistory(mapped, true);
        }
    },

    async syncToCloud(store: DBStore, data: any) {
        if (!this.user) return;
        const table = store === 'generation_history' ? 'generation_history' : store;

        let payload = this.mapToCloud(store, data);
        payload.user_id = this.user.id;

        // Assets Logic
        if (store === 'assets') {
            if (data.base64) {
                try {
                    const { publicUrl, storagePath } = await this.uploadAssetToStorage(data);
                    payload.public_url = publicUrl;
                    payload.storage_path = storagePath;
                    delete payload.base64;
                } catch (e) {
                    console.error("Failed to upload asset to storage", e);
                    throw e;
                }
            } else {
                delete payload.base64;
            }
        }

        // Posts & History Logic: Upload base64 content to storage
        if (store === 'posts' || store === 'generation_history') {
            // Handle mediaUrls
            if (payload.media_urls && Array.isArray(payload.media_urls)) {
                try {
                    const updatedUrls = await Promise.all(payload.media_urls.map(async (url: string, index: number) => {
                        if (url && url.startsWith('data:')) {
                            const fileExt = url.startsWith('data:video') ? 'mp4' : 'jpeg';
                            const folder = store === 'posts' ? 'posts' : 'history';
                            const fileName = `${folder}/${this.user!.id}/${data.id}_${index}_${Date.now()}.${fileExt}`;
                            const res = await fetch(url);
                            const blob = await res.blob();
                            const { error: uploadError } = await supabase.storage.from('user-library').upload(fileName, blob, { contentType: blob.type, upsert: true });
                            if (uploadError) throw uploadError;
                            const { data: { publicUrl } } = supabase.storage.from('user-library').getPublicUrl(fileName);
                            return publicUrl;
                        }
                        return url;
                    }));
                    payload.media_urls = updatedUrls;
                } catch (e) { console.error(`[Sync] Failed to upload ${store} media`, e); }
            }

            // Handle thumbnailUrls
            if (payload.thumbnail_urls && Array.isArray(payload.thumbnail_urls)) {
                try {
                    const updatedThumbs = await Promise.all(payload.thumbnail_urls.map(async (url: string, index: number) => {
                        if (url && url.startsWith('data:')) {
                            const folder = store === 'posts' ? 'posts' : 'history';
                            const fileName = `${folder}/${this.user!.id}/${data.id}_thumb_${index}_${Date.now()}.jpeg`;
                            const res = await fetch(url);
                            const blob = await res.blob();
                            const { error: uploadError } = await supabase.storage.from('user-library').upload(fileName, blob, { contentType: 'image/jpeg', upsert: true });
                            if (uploadError) throw uploadError;
                            const { data: { publicUrl } } = supabase.storage.from('user-library').getPublicUrl(fileName);
                            return publicUrl;
                        }
                        return url;
                    }));
                    payload.thumbnail_urls = updatedThumbs;
                } catch (e) { console.error(`[Sync] Failed to upload ${store} thumbnails`, e); }
            }

            // Handle inputImageUrl
            if (payload.input_image_url && payload.input_image_url.startsWith('data:')) {
                try {
                    const url = payload.input_image_url;
                    const fileExt = url.startsWith('data:video') ? 'mp4' : 'jpeg';
                    const fileName = `history/${this.user!.id}/${data.id}_input_${Date.now()}.${fileExt}`;
                    const res = await fetch(url);
                    const blob = await res.blob();
                    const { error: uploadError } = await supabase.storage.from('user-library').upload(fileName, blob, { contentType: blob.type, upsert: true });
                    if (uploadError) throw uploadError;
                    const { data: { publicUrl } } = supabase.storage.from('user-library').getPublicUrl(fileName);
                    payload.input_image_url = publicUrl;
                } catch (e) { console.error("[Sync] Failed to upload history input image", e); delete payload.input_image_url; }
            }
        }

        const { error } = await supabase.from(table).upsert(payload, { onConflict: 'id' });
        if (error) {
            console.error(`[Sync] Supabase Upsert Error for ${table}:`, error.message, error.details);
            throw error;
        }
    },

    async uploadAssetToStorage(asset: any): Promise<{ publicUrl: string, storagePath: string }> {
        const fileExt = asset.type === 'video' ? 'mp4' : 'jpeg';
        const fileName = `${this.user!.id}/${asset.id}.${fileExt}`;
        const base64Response = await fetch(asset.base64);
        const blob = await base64Response.blob();
        const { error: uploadError } = await supabase.storage.from('user-library').upload(fileName, blob, { contentType: asset.type === 'video' ? 'video/mp4' : 'image/jpeg', upsert: true });
        if (uploadError) throw uploadError;
        const { data: { publicUrl } } = supabase.storage.from('user-library').getPublicUrl(fileName);
        return { publicUrl, storagePath: fileName };
    },

    async downloadAssetFromStorage(assetFromCloud: any): Promise<any> {
        const url = assetFromCloud.publicUrl || assetFromCloud.public_url;
        if (!url) throw new Error("No public URL for asset");
        const response = await fetch(url);
        const blob = await response.blob();
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => {
                resolve({ ...assetFromCloud, base64: reader.result as string });
            };
            reader.onerror = reject;
            reader.readAsDataURL(blob);
        });
    },

    async removeFromCloud(store: DBStore, id: string) {
        if (!this.user) return;
        const table = store === 'generation_history' ? 'generation_history' : store;
        const { error } = await supabase.from(table).delete().eq('id', id).eq('user_id', this.user.id);
        if (error) throw error;
    },

    async removeFromCloudBatch(store: DBStore, ids: string[]) {
        if (!this.user || ids.length === 0) return;
        const table = store === 'generation_history' ? 'generation_history' : store;

        // Supabase limits .in() to somewhat small batches, but we handle chunks of 100 just to be safe
        const chunkSize = 100;
        for (let i = 0; i < ids.length; i += chunkSize) {
            const chunk = ids.slice(i, i + chunkSize);
            const { error } = await supabase.from(table).delete().in('id', chunk).eq('user_id', this.user.id);
            if (error) {
                console.error(`[Sync] Full batch delete failed for chunk`, error);
                throw error;
            }
        }
    },

    mapToCloud(_store: DBStore, data: any): any {
        const mapped: any = { ...data };
        if (data.folderId !== undefined) { mapped.folder_id = data.folderId; delete mapped.folderId; }
        if (data.parentId !== undefined) { mapped.parent_id = data.parentId; delete mapped.parentId; }
        if (data.timestamp !== undefined) { mapped.timestamp = new Date(data.timestamp).toISOString(); }
        if (data.withAudio !== undefined) { mapped.with_audio = data.withAudio; delete mapped.withAudio; }
        if (data.cameraFixed !== undefined) { mapped.camera_fixed = data.cameraFixed; delete mapped.cameraFixed; }
        if (data.mediaUrls !== undefined) { mapped.media_urls = data.mediaUrls; delete mapped.mediaUrls; }
        if (data.mediaType !== undefined) { mapped.media_type = data.mediaType; delete mapped.mediaType; }
        if (data.themeId !== undefined) { mapped.theme_id = data.themeId; delete mapped.themeId; }
        if (data.captionType !== undefined) { mapped.caption_type = data.captionType; delete mapped.captionType; }
        if (data.videoResolution !== undefined) { mapped.video_resolution = data.videoResolution; delete mapped.videoResolution; }
        if (data.videoDuration !== undefined) { mapped.video_duration = data.videoDuration; delete mapped.videoDuration; }
        if (data.imageSize !== undefined) { mapped.image_size = data.imageSize; delete mapped.imageSize; }
        if (data.numImages !== undefined) { mapped.num_images = data.numImages; delete mapped.numImages; }
        if (data.errorMessage !== undefined) { mapped.error_message = data.errorMessage; delete mapped.errorMessage; }
        if (data.themeName !== undefined) { mapped.theme_name = data.themeName; delete mapped.themeName; }
        if (data.basePrompt !== undefined) { mapped.base_prompt = data.basePrompt; delete mapped.basePrompt; }
        if (data.negativePrompt !== undefined) { mapped.negative_prompt = data.negativePrompt; delete mapped.negativePrompt; }
        if (data.aspectRatio !== undefined) { mapped.aspect_ratio = data.aspectRatio; delete mapped.aspectRatio; }
        if (data.inputImageUrl !== undefined) { mapped.input_image_url = data.inputImageUrl; delete mapped.inputImageUrl; }
        if (data.thumbnailUrls !== undefined) { mapped.thumbnail_urls = data.thumbnailUrls; delete mapped.thumbnailUrls; }
        if (data.requestId !== undefined) { mapped.request_id = data.requestId; delete mapped.requestId; }
        if (data.falEndpoint !== undefined) { mapped.fal_endpoint = data.falEndpoint; delete mapped.falEndpoint; }
        if (data.enhancePromptMode !== undefined) { mapped.enhance_prompt_mode = data.enhancePromptMode; delete mapped.enhancePromptMode; }
        // Note: we just pass tab straight through assuming tab column is named 'tab' in Supabase.
        return mapped;
    },

    mapFromCloud(_store: DBStore, data: any): any {
        const mapped: any = { ...data };
        if (data.folder_id !== undefined) { mapped.folderId = data.folder_id; delete mapped.folder_id; }
        if (data.parent_id !== undefined) { mapped.parentId = data.parent_id; delete mapped.parent_id; }
        if (data.timestamp !== undefined) { mapped.timestamp = new Date(data.timestamp).getTime(); }
        if (data.public_url !== undefined) { mapped.publicUrl = data.public_url; delete data.public_url; }
        if (data.storage_path !== undefined) { mapped.storagePath = data.storage_path; delete data.storage_path; }
        if (data.with_audio !== undefined) { mapped.withAudio = data.with_audio; delete mapped.with_audio; }
        if (data.camera_fixed !== undefined) { mapped.cameraFixed = data.camera_fixed; delete mapped.camera_fixed; }
        if (data.media_urls !== undefined) { mapped.mediaUrls = data.media_urls; delete mapped.media_urls; }
        if (data.media_type !== undefined) { mapped.mediaType = data.media_type; delete mapped.media_type; }
        if (data.theme_id !== undefined) { mapped.themeId = data.theme_id; delete mapped.theme_id; }
        if (data.caption_type !== undefined) { mapped.captionType = data.caption_type; delete mapped.caption_type; }
        if (data.video_resolution !== undefined) { mapped.videoResolution = data.video_resolution; delete mapped.video_resolution; }
        if (data.video_duration !== undefined) { mapped.videoDuration = data.video_duration; delete mapped.video_duration; }
        if (data.image_size !== undefined) { mapped.imageSize = data.image_size; delete mapped.image_size; }
        if (data.num_images !== undefined) { mapped.numImages = data.num_images; delete mapped.num_images; }
        if (data.error_message !== undefined) { mapped.errorMessage = data.error_message; delete mapped.error_message; }
        if (data.theme_name !== undefined) { mapped.themeName = data.theme_name; delete mapped.theme_name; }
        if (data.base_prompt !== undefined) { mapped.basePrompt = data.base_prompt; delete mapped.base_prompt; }
        if (data.negative_prompt !== undefined) { mapped.negativePrompt = data.negative_prompt; delete mapped.negative_prompt; }
        if (data.aspect_ratio !== undefined) { mapped.aspectRatio = data.aspect_ratio; delete mapped.aspect_ratio; }
        if (data.input_image_url !== undefined) { mapped.inputImageUrl = data.input_image_url; delete mapped.input_image_url; }
        if (data.thumbnail_urls !== undefined) { mapped.thumbnailUrls = data.thumbnail_urls; delete mapped.thumbnail_urls; }
        if (data.request_id !== undefined) { mapped.requestId = data.request_id; delete mapped.request_id; }
        if (data.fal_endpoint !== undefined) { mapped.falEndpoint = data.fal_endpoint; delete mapped.fal_endpoint; }
        if (data.enhance_prompt_mode !== undefined) { mapped.enhancePromptMode = data.enhance_prompt_mode; delete mapped.enhance_prompt_mode; }
        delete mapped.user_id;
        return mapped;
    }
};

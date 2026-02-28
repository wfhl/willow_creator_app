import { supabase } from './supabaseClient';
import { dbService, type DBStore } from './dbService';
import type { User } from '@supabase/supabase-js';

export const syncService = {
    user: null as User | null,
    recentlyDeleted: new Set<string>(),
    isSyncing: false,

    init(user: User) {
        this.user = user;
        console.log("[Sync] Initializing for user:", user.email);

        // Subscribe to local changes
        dbService.subscribe(async (store, type, data) => {
            if (!this.user || this.isSyncing) return;

            try {
                if (type === 'delete') {
                    if (data.id === 'ALL') {
                        // Handle clear all logic if needed, but for now just clear cloud?
                        return;
                    }
                    this.recentlyDeleted.add(data.id);
                    dbService.trackDeletion(data.id).catch(console.error);
                    await this.removeFromCloud(store, data.id);
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
            await this.syncTable('assets'); // Assets last as they might trigger storage uploads
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

        // 1. Get Local Items
        let localItems: any[] = [];
        if (store === 'assets') localItems = await dbService.getAllAssets();
        else if (store === 'posts') localItems = await dbService.getAllPosts();
        else if (store === 'presets') localItems = await dbService.getAllPresets();
        else if (store === 'folders') localItems = await dbService.getAllFolders();
        else if (store === 'generation_history') localItems = await dbService.getAllGenerationHistory();

        // 2. Get Cloud Items
        const { data: cloudItems, error } = await supabase
            .from(table)
            .select('*')
            .eq('user_id', this.user.id);

        if (error) throw error;

        // 3. Merging Logic
        // Push local-only to cloud
        for (const local of localItems) {
            const existsInCloud = cloudItems.some(c => c.id === local.id);
            if (!existsInCloud) {
                // Before pushing, check if this item was intentionally deleted in cloud but exists locally
                // This can happen if user deletes in cloud but not local (unlikely in this unidirectional flow).
                // Actually, if it's local but not in cloud, we assume it's NEW and push it.
                console.log(`[Sync] Pushing local-only ${store}: ${local.id}`);
                await this.syncToCloud(store, local);
            }
        }

        // Pull cloud-only to local
        for (const cloud of cloudItems) {
            const isDeleted = await dbService.isDeleted(cloud.id);
            if (this.recentlyDeleted.has(cloud.id) || isDeleted) {
                console.log(`[Sync] Skipping pull for recently/persistently deleted ${store}: ${cloud.id}`);
                continue;
            }
            const existsLocally = localItems.some(l => l.id === cloud.id);
            if (!existsLocally) {
                console.log(`[Sync] Pulling cloud-only ${store}: ${cloud.id}`);
                const mapped = this.mapFromCloud(store, cloud);

                if (store === 'assets') {
                    // Start download
                    try {
                        const dlAsset = await this.downloadAssetFromStorage(mapped);
                        await dbService.saveAsset(dlAsset);
                    } catch (e) {
                        console.error(`[Sync] Failed to download asset ${cloud.id}`, e);
                    }
                }
                else if (store === 'posts') await dbService.savePost(mapped);
                else if (store === 'presets') await dbService.savePreset(mapped);
                else if (store === 'folders') await dbService.saveFolder(mapped);
                else if (store === 'generation_history') await dbService.saveGenerationHistory(mapped);
            }
        }
    },

    async syncToCloud(store: DBStore, data: any) {
        if (!this.user) return;
        const table = store === 'generation_history' ? 'generation_history' : store;

        let payload = this.mapToCloud(store, data);
        payload.user_id = this.user.id;

        // --- ASSETS LOGIC ---
        if (store === 'assets') {
            if (data.base64) {
                try {
                    const { publicUrl, storagePath } = await this.uploadAssetToStorage(data);
                    payload.public_url = publicUrl;
                    payload.storage_path = storagePath;
                    payload.width = 0;
                    payload.height = 0;
                    delete payload.base64;
                } catch (e) {
                    console.error("Failed to upload asset to storage", e);
                    throw e;
                }
            } else {
                console.warn("Asset missing base64, skipping upload", data.id);
                delete payload.base64;
            }
        }

        // --- POSTS & HISTORY LOGIC ---
        if (store === 'posts' || store === 'generation_history') {
            // Check for base64 in media_urls
            if (payload.media_urls && Array.isArray(payload.media_urls)) {
                try {
                    const updatedUrls = await Promise.all(payload.media_urls.map(async (url: string, index: number) => {
                        if (url.startsWith('data:')) {
                            // Upload base64 post/history media
                            const fileExt = url.startsWith('data:video') ? 'mp4' : 'jpeg';
                            const folder = store === 'posts' ? 'posts' : 'history';
                            const fileName = `${folder}/${this.user!.id}/${data.id}_${index}_${Date.now()}.${fileExt}`;

                            // Convert base64 to Blob
                            const res = await fetch(url);
                            const blob = await res.blob();

                            const { error: uploadError } = await supabase.storage
                                .from('user-library')
                                .upload(fileName, blob, {
                                    contentType: blob.type,
                                    upsert: true
                                });

                            if (uploadError) throw uploadError;

                            const { data: { publicUrl } } = supabase.storage
                                .from('user-library')
                                .getPublicUrl(fileName);

                            return publicUrl;
                        }
                        return url; // Already a URL
                    }));
                    payload.media_urls = updatedUrls;
                } catch (e) {
                    console.error(`[Sync] Failed to upload ${store} media`, e);
                    throw e;
                }
            }

            // Also check for input_image_url in generation_history
            if (store === 'generation_history' && payload.input_image_url && payload.input_image_url.startsWith('data:')) {
                try {
                    const url = payload.input_image_url;
                    const fileExt = url.startsWith('data:video') ? 'mp4' : 'jpeg';
                    const fileName = `history/${this.user!.id}/${data.id}_input_${Date.now()}.${fileExt}`;

                    const res = await fetch(url);
                    const blob = await res.blob();

                    const { error: uploadError } = await supabase.storage
                        .from('user-library')
                        .upload(fileName, blob, {
                            contentType: blob.type,
                            upsert: true
                        });

                    if (uploadError) throw uploadError;

                    const { data: { publicUrl } } = supabase.storage
                        .from('user-library')
                        .getPublicUrl(fileName);

                    payload.input_image_url = publicUrl;
                } catch (e) {
                    console.error("[Sync] Failed to upload history input image", e);
                    // Don't throw, just let it fail silently or nullify? If we let it pass, DB might reject validation?
                    // Safe to strip it if upload fails to prevent sync block?
                    delete payload.input_image_url;
                }
            }
        }

        const { error } = await supabase
            .from(table)
            .upsert(payload, { onConflict: 'id' });

        if (error) throw error;
    },

    // --- ASSET STORAGE HELPERS ---

    async uploadAssetToStorage(asset: any): Promise<{ publicUrl: string, storagePath: string }> {
        const fileExt = asset.type === 'video' ? 'mp4' : 'jpeg'; // simple guess
        const fileName = `${this.user!.id}/${asset.id}.${fileExt}`;

        // Convert base64 to Blob
        const base64Response = await fetch(asset.base64);
        const blob = await base64Response.blob();

        const { error: uploadError } = await supabase.storage
            .from('user-library')
            .upload(fileName, blob, {
                contentType: asset.type === 'video' ? 'video/mp4' : 'image/jpeg',
                upsert: true
            });

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
            .from('user-library')
            .getPublicUrl(fileName);

        return { publicUrl, storagePath: fileName };
    },

    async downloadAssetFromStorage(assetFromCloud: any): Promise<any> {
        const url = assetFromCloud.publicUrl || assetFromCloud.public_url;
        if (!url) throw new Error("No public URL for asset");

        // Fetch blob
        const response = await fetch(url);
        const blob = await response.blob();

        // Convert to base64
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => {
                const base64 = reader.result as string;
                resolve({
                    ...assetFromCloud,
                    base64: base64
                });
            };
            reader.onerror = reject;
            reader.readAsDataURL(blob);
        });
    },

    async removeFromCloud(store: DBStore, id: string) {
        if (!this.user) return;
        const table = store === 'generation_history' ? 'generation_history' : store;

        const { error } = await supabase
            .from(table)
            .delete()
            .eq('id', id)
            .eq('user_id', this.user.id);

        if (error) {
            console.error(`[Sync] Failed to remove ${id} from cloud ${table}:`, error);
            throw error;
        }
        console.log(`[Sync] Successfully removed ${id} from cloud ${table}`);
    },

    // --- MAPPING UTILS ---

    mapToCloud(_store: DBStore, data: any): any {
        const mapped: any = { ...data };

        // Handle common snake_case conversions
        if (data.folderId !== undefined) {
            mapped.folder_id = data.folderId;
            delete mapped.folderId;
        }
        if (data.parentId !== undefined) {
            mapped.parent_id = data.parentId;
            delete mapped.parentId;
        }
        if (data.timestamp !== undefined) {
            mapped.timestamp = new Date(data.timestamp).toISOString();
        }
        // New mappings
        if (data.color !== undefined) mapped.color = data.color;
        if (data.icon !== undefined) mapped.icon = data.icon;
        if (data.tab !== undefined) mapped.tab = data.tab;

        if (data.withAudio !== undefined) {
            mapped.with_audio = data.withAudio;
            delete mapped.withAudio;
        }
        if (data.cameraFixed !== undefined) {
            mapped.camera_fixed = data.cameraFixed;
            delete mapped.cameraFixed;
        }

        if (data.mediaUrls !== undefined) {
            mapped.media_urls = data.mediaUrls;
            delete mapped.mediaUrls;
        }
        if (data.mediaType !== undefined) {
            mapped.media_type = data.mediaType;
            delete mapped.mediaType;
        }
        if (data.themeId !== undefined) {
            mapped.theme_id = data.themeId;
            delete mapped.themeId;
        }
        if (data.captionType !== undefined) {
            mapped.caption_type = data.captionType;
            delete mapped.captionType;
        }
        if (data.videoResolution !== undefined) {
            mapped.video_resolution = data.videoResolution;
            delete mapped.videoResolution;
        }
        if (data.videoDuration !== undefined) {
            mapped.video_duration = data.videoDuration;
            delete mapped.videoDuration;
        }
        if (data.imageSize !== undefined) {
            mapped.image_size = data.imageSize;
            delete mapped.imageSize;
        }
        if (data.numImages !== undefined) {
            mapped.num_images = data.numImages;
            delete mapped.numImages;
        }
        if (data.errorMessage !== undefined) {
            mapped.error_message = data.errorMessage;
            delete mapped.errorMessage;
        }
        if (data.themeName !== undefined) {
            mapped.theme_name = data.themeName;
            delete mapped.themeName;
        }
        if (data.basePrompt !== undefined) {
            mapped.base_prompt = data.basePrompt;
            delete mapped.basePrompt;
        }
        if (data.negativePrompt !== undefined) {
            mapped.negative_prompt = data.negativePrompt;
            delete mapped.negativePrompt;
        }
        if (data.aspectRatio !== undefined) {
            mapped.aspect_ratio = data.aspectRatio;
            delete mapped.aspectRatio;
        }
        if (data.inputImageUrl !== undefined) {
            mapped.input_image_url = data.inputImageUrl;
            delete mapped.inputImageUrl;
        }

        return mapped;
    },

    mapFromCloud(_store: DBStore, data: any): any {
        const mapped: any = { ...data };

        // Convert back to camelCase
        if (data.folder_id !== undefined) {
            mapped.folderId = data.folder_id;
            delete mapped.folder_id;
        }
        if (data.parent_id !== undefined) {
            mapped.parentId = data.parent_id;
            delete mapped.parent_id;
        }
        if (data.timestamp !== undefined) {
            mapped.timestamp = new Date(data.timestamp).getTime();
        }

        // New mappings
        if (data.public_url !== undefined) {
            mapped.publicUrl = data.public_url;
            delete mapped.public_url;
        }
        if (data.storage_path !== undefined) {
            mapped.storagePath = data.storage_path;
            delete mapped.storage_path;
        }
        if (data.color !== undefined) mapped.color = data.color;
        if (data.icon !== undefined) mapped.icon = data.icon;
        if (data.tab !== undefined) mapped.tab = data.tab;

        if (data.with_audio !== undefined) {
            mapped.withAudio = data.with_audio;
            delete mapped.with_audio;
        }
        if (data.camera_fixed !== undefined) {
            mapped.cameraFixed = data.camera_fixed;
            delete mapped.camera_fixed;
        }

        if (data.media_urls !== undefined) {
            mapped.mediaUrls = data.media_urls;
            delete mapped.media_urls;
        }
        if (data.media_type !== undefined) {
            mapped.mediaType = data.media_type;
            delete mapped.media_type;
        }
        if (data.theme_id !== undefined) {
            mapped.themeId = data.theme_id;
            delete mapped.theme_id;
        }
        if (data.caption_type !== undefined) {
            mapped.captionType = data.caption_type;
            delete mapped.caption_type;
        }
        if (data.video_resolution !== undefined) {
            mapped.videoResolution = data.video_resolution;
            delete mapped.video_resolution;
        }
        if (data.video_duration !== undefined) {
            mapped.videoDuration = data.video_duration;
            delete mapped.video_duration;
        }
        if (data.image_size !== undefined) {
            mapped.imageSize = data.image_size;
            delete mapped.image_size;
        }
        if (data.num_images !== undefined) {
            mapped.numImages = data.num_images;
            delete mapped.num_images;
        }
        if (data.error_message !== undefined) {
            mapped.errorMessage = data.error_message;
            delete mapped.error_message;
        }
        if (data.theme_name !== undefined) {
            mapped.themeName = data.theme_name;
            delete mapped.theme_name;
        }
        if (data.base_prompt !== undefined) {
            mapped.basePrompt = data.base_prompt;
            delete mapped.base_prompt;
        }
        if (data.negative_prompt !== undefined) {
            mapped.negativePrompt = data.negative_prompt;
            delete mapped.negative_prompt;
        }
        if (data.aspect_ratio !== undefined) {
            mapped.aspectRatio = data.aspect_ratio;
            delete mapped.aspect_ratio;
        }
        if (data.input_image_url !== undefined) {
            mapped.inputImageUrl = data.input_image_url;
            delete mapped.input_image_url;
        }

        delete mapped.user_id; // Don't store user_id locally
        return mapped;
    }
};

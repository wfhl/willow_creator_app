import { supabase } from './supabaseClient';
import { dbService, type DBStore } from './dbService';
import type { User } from '@supabase/supabase-js';

export const syncService = {
    user: null as User | null,

    init(user: User) {
        this.user = user;
        console.log("[Sync] Initializing for user:", user.email);

        // Subscribe to local changes
        dbService.subscribe(async (store, type, data) => {
            if (!this.user) return;

            try {
                if (type === 'delete') {
                    await this.removeFromCloud(store, data.id);
                } else {
                    await this.syncToCloud(store, data);
                }
            } catch (e) {
                console.error(`[Sync] Failed to sync ${store} ${type}:`, e);
            }
        });

        // Perform initial full sync in background
        this.fullSync();
    },

    async fullSync() {
        if (!this.user) return;
        console.group("[Sync] Full background sync session");
        try {
            await this.syncTable('folders');
            await this.syncTable('presets');
            await this.syncTable('posts');
            await this.syncTable('generation_history');
            await this.syncTable('assets'); // Assets last as they might trigger storage uploads
        } catch (e) {
            console.error("[Sync] Full sync failed:", e);
        }
        console.groupEnd();
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
                console.log(`[Sync] Pushing local-only ${store}: ${local.id}`);
                await this.syncToCloud(store, local);
            }
        }

        // Pull cloud-only to local
        for (const cloud of cloudItems) {
            const existsLocally = localItems.some(l => l.id === cloud.id);
            if (!existsLocally) {
                console.log(`[Sync] Pulling cloud-only ${store}: ${cloud.id}`);
                const mapped = this.mapFromCloud(store, cloud);
                if (store === 'assets') await dbService.saveAsset(mapped);
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

        const payload = this.mapToCloud(store, data);
        payload.user_id = this.user.id;

        const { error } = await supabase
            .from(table)
            .upsert(payload, { onConflict: 'id' });

        if (error) throw error;
    },

    async removeFromCloud(store: DBStore, id: string) {
        if (!this.user) return;
        const table = store === 'generation_history' ? 'generation_history' : store;

        const { error } = await supabase
            .from(table)
            .delete()
            .eq('id', id)
            .eq('user_id', this.user.id);

        if (error) throw error;
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
        if (data.captionType !== undefined) {
            mapped.caption_type = data.captionType;
            delete mapped.captionType;
        }
        // ... add more as needed based on schema.sql

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
        if (data.caption_type !== undefined) {
            mapped.captionType = data.caption_type;
            delete mapped.caption_type;
        }
        // ... add more as needed

        delete mapped.user_id; // Don't store user_id locally
        return mapped;
    }
};

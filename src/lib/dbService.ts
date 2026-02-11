
const DB_NAME = 'willow_creator_db';
const DB_VERSION = 6; // Bumped for asset type index


export interface DBFolder {
    id: string;
    name: string;
    parentId: string | null; // null for root
    timestamp: number;
    color?: string;
    icon?: string;
}

export interface DBAsset {
    id: string;
    name: string;
    type: string;
    base64: string;
    folderId: string | null;
    timestamp: number;
    selected?: boolean;
}

export interface DBSavedPost {
    id: string;
    timestamp: number;
    topic: string;
    caption: string;
    captionType: string;
    mediaUrls: string[];
    mediaType: 'image' | 'video';
    themeId: string;
    visuals: string;
    outfit: string;
    prompt: string;
    tags?: string[];
}

export interface DBPromptPreset {
    id: string;
    name: string;
    description?: string;
    basePrompt: string;
    themeId?: string;
    visuals?: string;
    outfit?: string;
    action?: string;
    model?: string;
    aspectRatio?: string;
    negativePrompt?: string;
    videoDuration?: string;
    videoResolution?: string;
    timestamp: number;
}

export interface DBGenerationHistory {
    id: string;
    timestamp: number;
    type: 'image' | 'video';
    prompt: string;
    model: string;
    mediaUrls: string[];
    aspectRatio?: string;
    imageSize?: string;
    numImages?: number;
    videoResolution?: string;
    videoDuration?: string;
    withAudio?: boolean;
    cameraFixed?: boolean;
    themeId?: string;
    themeName?: string;
    topic?: string;
    visuals?: string;
    outfit?: string;
    service: 'gemini' | 'fal';
    status: 'success' | 'failed';
    errorMessage?: string;
}

export interface DBConfig {
    id: string; // e.g. 'themes', 'caption_styles'
    data: any;
}


const openDB = (): Promise<IDBDatabase> => {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);
        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve(request.result);
        request.onupgradeneeded = (event) => {
            const db = (event.target as IDBOpenDBRequest).result;
            const transaction = (event.target as IDBOpenDBRequest).transaction;

            if (!db.objectStoreNames.contains('assets')) {
                const assetStore = db.createObjectStore('assets', { keyPath: 'id' });
                assetStore.createIndex('folderId', 'folderId', { unique: false });
                assetStore.createIndex('timestamp', 'timestamp', { unique: false });
                assetStore.createIndex('type', 'type', { unique: false });
            } else if (transaction) {
                const assetStore = transaction.objectStore('assets');
                if (!assetStore.indexNames.contains('folderId')) {
                    assetStore.createIndex('folderId', 'folderId', { unique: false });
                }
                if (!assetStore.indexNames.contains('timestamp')) {
                    assetStore.createIndex('timestamp', 'timestamp', { unique: false });
                }
                if (!assetStore.indexNames.contains('type')) {
                    assetStore.createIndex('type', 'type', { unique: false });
                }
            }

            if (!db.objectStoreNames.contains('folders')) {
                const folderStore = db.createObjectStore('folders', { keyPath: 'id' });
                folderStore.createIndex('parentId', 'parentId', { unique: false });
            }

            if (!db.objectStoreNames.contains('posts')) {
                const postStore = db.createObjectStore('posts', { keyPath: 'id' });
                postStore.createIndex('timestamp', 'timestamp', { unique: false });
            } else if (transaction) {
                const postStore = transaction.objectStore('posts');
                if (!postStore.indexNames.contains('timestamp')) {
                    postStore.createIndex('timestamp', 'timestamp', { unique: false });
                }
            }

            if (!db.objectStoreNames.contains('presets')) {
                db.createObjectStore('presets', { keyPath: 'id' });
            }
            if (!db.objectStoreNames.contains('configs')) {
                db.createObjectStore('configs', { keyPath: 'id' });
            }
            if (!db.objectStoreNames.contains('generation_history')) {
                const historyStore = db.createObjectStore('generation_history', { keyPath: 'id' });
                historyStore.createIndex('timestamp', 'timestamp', { unique: false });
                historyStore.createIndex('type', 'type', { unique: false });
                historyStore.createIndex('model', 'model', { unique: false });
            }
        };
    });
};

export const dbService = {
    async getConfig(id: string): Promise<any> {
        const db = await openDB();
        return new Promise((resolve, reject) => {
            const transaction = db.transaction('configs', 'readonly');
            const store = transaction.objectStore('configs');
            const request = store.get(id);
            request.onsuccess = () => resolve(request.result?.data);
            request.onerror = () => reject(request.error);
        });
    },

    async saveConfig(id: string, data: any): Promise<void> {
        const db = await openDB();
        return new Promise((resolve, reject) => {
            const transaction = db.transaction('configs', 'readwrite');
            const store = transaction.objectStore('configs');
            const request = store.put({ id, data });
            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    },

    async getConfigs(): Promise<{ themes: any[], captionStyles: any[] }> {
        const db = await openDB();
        return new Promise((resolve, reject) => {
            const transaction = db.transaction('configs', 'readonly');
            const store = transaction.objectStore('configs');
            const request = store.getAll();
            request.onsuccess = () => {
                const details = request.result;
                const themes = details.find(d => d.id === 'themes')?.data || [];
                const styles = details.find(d => d.id === 'caption_styles')?.data || [];
                resolve({ themes, captionStyles: styles });
            };
            request.onerror = () => reject(request.error);
        });
    },

    async getAllAssets(): Promise<DBAsset[]> {
        const db = await openDB();
        return new Promise((resolve, reject) => {
            const transaction = db.transaction('assets', 'readonly');
            const store = transaction.objectStore('assets');
            const request = store.getAll();
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    },

    async getAssetsByType(type: string): Promise<DBAsset[]> {
        const db = await openDB();
        return new Promise((resolve, reject) => {
            const transaction = db.transaction('assets', 'readonly');
            const store = transaction.objectStore('assets');
            const index = store.index('type');
            const request = index.getAll(IDBKeyRange.only(type));
            request.onsuccess = () => resolve(request.result.sort((a, b) => b.timestamp - a.timestamp));
            request.onerror = () => reject(request.error);
        });
    },

    async saveAsset(asset: DBAsset): Promise<void> {
        const db = await openDB();
        return new Promise((resolve, reject) => {
            const transaction = db.transaction('assets', 'readwrite');
            const store = transaction.objectStore('assets');
            const request = store.put(asset);
            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    },

    async deleteAsset(id: string): Promise<void> {
        const db = await openDB();
        return new Promise((resolve, reject) => {
            const transaction = db.transaction('assets', 'readwrite');
            const store = transaction.objectStore('assets');
            const request = store.delete(id);
            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    },

    async getAllPosts(): Promise<DBSavedPost[]> {
        const db = await openDB();
        return new Promise((resolve, reject) => {
            const transaction = db.transaction('posts', 'readonly');
            const store = transaction.objectStore('posts');
            const request = store.getAll();
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    },

    async savePost(post: DBSavedPost): Promise<void> {
        const db = await openDB();
        return new Promise((resolve, reject) => {
            const transaction = db.transaction('posts', 'readwrite');
            const store = transaction.objectStore('posts');
            const request = store.put(post);
            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    },

    async deletePost(id: string): Promise<void> {
        const db = await openDB();
        return new Promise((resolve, reject) => {
            const transaction = db.transaction('posts', 'readwrite');
            const store = transaction.objectStore('posts');
            const request = store.delete(id);
            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    },

    async getPostsCount(): Promise<number> {
        const db = await openDB();
        return new Promise((resolve, reject) => {
            const transaction = db.transaction('posts', 'readonly');
            const store = transaction.objectStore('posts');
            const request = store.count();
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    },

    async getRecentPostsBatch(limit: number, offset: number, sortOrder: 'prev' | 'next' = 'prev'): Promise<DBSavedPost[]> {
        const db = await openDB();
        return new Promise((resolve, reject) => {
            const transaction = db.transaction('posts', 'readonly');
            const store = transaction.objectStore('posts');
            const index = store.index('timestamp');

            const items: DBSavedPost[] = [];
            let skipped = 0;
            const request = index.openCursor(null, sortOrder);

            request.onsuccess = (event) => {
                const cursor = (event.target as IDBRequest<IDBCursorWithValue>).result;
                if (!cursor) {
                    resolve(items);
                    return;
                }

                if (skipped < offset) {
                    cursor.advance(offset - skipped);
                    skipped = offset;
                    return;
                }

                items.push(cursor.value);
                if (items.length < limit) {
                    cursor.continue();
                } else {
                    resolve(items);
                }
            };
            request.onerror = () => reject(request.error);
        });
    },

    async searchPosts(query: string, limit: number = 48, sortOrder: 'prev' | 'next' = 'prev'): Promise<DBSavedPost[]> {
        const db = await openDB();
        const results: DBSavedPost[] = [];
        const lowerQuery = query.toLowerCase();

        return new Promise((resolve, reject) => {
            const transaction = db.transaction('posts', 'readonly');
            const store = transaction.objectStore('posts');
            const index = store.index('timestamp');
            const request = index.openCursor(null, sortOrder);

            request.onsuccess = (event) => {
                const cursor = (event.target as IDBRequest<IDBCursorWithValue>).result;
                if (!cursor || results.length >= limit) {
                    resolve(results);
                    return;
                }

                const post = cursor.value as DBSavedPost;
                const matches =
                    (post.topic?.toLowerCase().includes(lowerQuery)) ||
                    (post.caption?.toLowerCase().includes(lowerQuery)) ||
                    (post.tags?.some(t => t.toLowerCase().includes(lowerQuery))) ||
                    (post.themeId?.toLowerCase().includes(lowerQuery));

                if (matches) {
                    results.push(post);
                }
                cursor.continue();
            };
            request.onerror = () => reject(request.error);
        });
    },

    // --- PRESETS ---
    async getAllPresets(): Promise<DBPromptPreset[]> {
        const db = await openDB();
        return new Promise((resolve, reject) => {
            const transaction = db.transaction('presets', 'readonly');
            const store = transaction.objectStore('presets');
            const request = store.getAll();
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    },

    async savePreset(preset: DBPromptPreset): Promise<void> {
        const db = await openDB();
        return new Promise((resolve, reject) => {
            const transaction = db.transaction('presets', 'readwrite');
            const store = transaction.objectStore('presets');
            const request = store.put(preset);
            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    },

    async deletePreset(id: string): Promise<void> {
        const db = await openDB();
        return new Promise((resolve, reject) => {
            const transaction = db.transaction('presets', 'readwrite');
            const store = transaction.objectStore('presets');
            const request = store.delete(id);
            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    },

    // --- FOLDERS ---
    async getAllFolders(): Promise<DBFolder[]> {
        const db = await openDB();
        return new Promise((resolve, reject) => {
            const transaction = db.transaction('folders', 'readonly');
            const store = transaction.objectStore('folders');
            const request = store.getAll();
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    },

    async saveFolder(folder: DBFolder): Promise<void> {
        const db = await openDB();
        return new Promise((resolve, reject) => {
            const transaction = db.transaction('folders', 'readwrite');
            const store = transaction.objectStore('folders');
            const request = store.put(folder);
            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    },

    async deleteFolder(id: string): Promise<void> {
        const db = await openDB();
        return new Promise((resolve, reject) => {
            const transaction = db.transaction('folders', 'readwrite');
            const store = transaction.objectStore('folders');
            // Note: In an OS feel, we might want to recursively delete or prevent deletion of non-empty folders.
            // For now, let's keep it simple.
            const request = store.delete(id);
            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    },

    async getAssetsByFolder(folderId: string | null): Promise<DBAsset[]> {
        const db = await openDB();
        return new Promise((resolve, reject) => {
            const transaction = db.transaction('assets', 'readonly');
            const store = transaction.objectStore('assets');

            // IndexedDB indices do NOT support null keys. 
            // If folderId is null, we must fetch all and filter or use a different strategy.
            if (folderId === null) {
                const request = store.getAll();
                request.onsuccess = () => {
                    const all = request.result as DBAsset[];
                    resolve(all.filter(a => !a.folderId).sort((a, b) => b.timestamp - a.timestamp));
                };
                request.onerror = () => reject(request.error);
            } else {
                const index = store.index('folderId');
                const request = index.getAll(IDBKeyRange.only(folderId));
                request.onsuccess = () => resolve(request.result);
                request.onerror = () => reject(request.error);
            }
        });
    },

    async getFoldersByParent(parentId: string | null): Promise<DBFolder[]> {
        const db = await openDB();
        return new Promise((resolve, reject) => {
            const transaction = db.transaction('folders', 'readonly');
            const store = transaction.objectStore('folders');

            if (parentId === null) {
                const request = store.getAll();
                request.onsuccess = () => {
                    const all = request.result as DBFolder[];
                    resolve(all.filter(f => !f.parentId).sort((a, b) => a.name.localeCompare(b.name)));
                };
                request.onerror = () => reject(request.error);
            } else {
                const index = store.index('parentId');
                const request = index.getAll(IDBKeyRange.only(parentId));
                request.onsuccess = () => resolve(request.result);
                request.onerror = () => reject(request.error);
            }
        });
    },

    // --- GENERATION HISTORY ---
    async saveGenerationHistory(entry: DBGenerationHistory): Promise<void> {
        const db = await openDB();
        return new Promise((resolve, reject) => {
            const transaction = db.transaction('generation_history', 'readwrite');
            const store = transaction.objectStore('generation_history');
            const request = store.put(entry);
            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    },

    async getAllGenerationHistory(sortOrder: 'prev' | 'next' = 'prev'): Promise<DBGenerationHistory[]> {
        const db = await openDB();
        return new Promise((resolve, reject) => {
            const transaction = db.transaction('generation_history', 'readonly');
            const store = transaction.objectStore('generation_history');
            const index = store.index('timestamp');
            const items: DBGenerationHistory[] = [];
            const request = index.openCursor(null, sortOrder);

            request.onsuccess = (event) => {
                const cursor = (event.target as IDBRequest<IDBCursorWithValue>).result;
                if (!cursor) {
                    resolve(items);
                    return;
                }
                items.push(cursor.value);
                cursor.continue();
            };
            request.onerror = () => reject(request.error);
        });
    },

    async deleteGenerationHistory(id: string): Promise<void> {
        const db = await openDB();
        return new Promise((resolve, reject) => {
            const transaction = db.transaction('generation_history', 'readwrite');
            const store = transaction.objectStore('generation_history');
            const request = store.delete(id);
            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    },

    async clearAllGenerationHistory(): Promise<void> {
        const db = await openDB();
        return new Promise((resolve, reject) => {
            const transaction = db.transaction('generation_history', 'readwrite');
            const store = transaction.objectStore('generation_history');
            const request = store.clear();
            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    },

    async getGenerationHistoryCount(): Promise<number> {
        const db = await openDB();
        return new Promise((resolve, reject) => {
            const transaction = db.transaction('generation_history', 'readonly');
            const store = transaction.objectStore('generation_history');
            const request = store.count();
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }
};

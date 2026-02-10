
const DB_NAME = 'willow_creator_db';
const DB_VERSION = 3; // Bumped for presets

export interface DBAsset {
    id: string;
    type: string;
    base64: string;
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
            if (!db.objectStoreNames.contains('assets')) {
                db.createObjectStore('assets', { keyPath: 'id' });
            }
            if (!db.objectStoreNames.contains('posts')) {
                const postStore = db.createObjectStore('posts', { keyPath: 'id' });
                postStore.createIndex('timestamp', 'timestamp', { unique: false });
            } else {
                // If it exists but we need to add index (for existing users)
                const transaction = (event.target as IDBOpenDBRequest).transaction;
                const postStore = transaction?.objectStore('posts');
                if (postStore && !postStore.indexNames.contains('timestamp')) {
                    postStore.createIndex('timestamp', 'timestamp', { unique: false });
                }
            }
            if (!db.objectStoreNames.contains('presets')) {
                db.createObjectStore('presets', { keyPath: 'id' });
            }
            if (!db.objectStoreNames.contains('configs')) {
                db.createObjectStore('configs', { keyPath: 'id' });
            }
        };
    });
};

export const dbService = {
    async getConfig<T>(id: string): Promise<T | null> {
        const db = await openDB();
        return new Promise((resolve, reject) => {
            const transaction = db.transaction('configs', 'readonly');
            const store = transaction.objectStore('configs');
            const request = store.get(id);
            request.onsuccess = () => resolve(request.result ? request.result.data : null);
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
    }
};

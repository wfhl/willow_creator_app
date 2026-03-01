
/**
 * Utility functions for image manipulation and thumbnail generation.
 */

/**
 * Creates a thumbnail for an image or video source.
 * @param src - The URL or Base64 string of the image/video.
 * @param maxWidth - The maximum width of the thumbnail (default: 400).
 * @param quality - The JPEG quality (default: 0.7).
 * @returns A promise that resolves to a Base64 JPEG string.
 */
export async function createThumbnail(src: string, maxWidth: number = 400, quality: number = 0.7): Promise<string> {
    return new Promise((resolve, reject) => {
        const isVideo = (url: string) => {
            const clean = url.split('?')[0].split('#')[0].toLowerCase();
            return ['.mp4', '.mov', '.webm', '.m4v', '.ogv'].some(ext => clean.endsWith(ext));
        };

        if (isVideo(src)) {
            // For videos, we try to capture the first frame
            const video = document.createElement('video');
            video.crossOrigin = 'anonymous';
            video.src = src;
            video.muted = true;
            video.preload = 'metadata';

            video.onloadedmetadata = () => {
                video.currentTime = 0.1; // Seek to 0.1s to avoid black frame
            };

            video.onseeked = () => {
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');
                if (!ctx) {
                    reject(new Error('Could not get canvas context'));
                    return;
                }

                const ratio = video.videoWidth / video.videoHeight;
                canvas.width = Math.min(maxWidth, video.videoWidth);
                canvas.height = canvas.width / ratio;

                ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
                resolve(canvas.toDataURL('image/jpeg', quality));
                video.remove();
            };

            video.onerror = () => {
                // Fallback icon or blank if video fails to load
                reject(new Error('Video failed to load for thumbnail'));
            };
        } else {
            const img = new Image();
            img.crossOrigin = 'anonymous';
            img.src = src;

            img.onload = () => {
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');
                if (!ctx) {
                    reject(new Error('Could not get canvas context'));
                    return;
                }

                const ratio = img.width / img.height;
                canvas.width = Math.min(maxWidth, img.width);
                canvas.height = canvas.width / ratio;

                ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
                resolve(canvas.toDataURL('image/jpeg', quality));
            };

            img.onerror = () => {
                reject(new Error('Image failed to load for thumbnail'));
            };
        }
    });
}

/**
 * Creates thumbnails for an array of URLs.
 */
export async function createThumbnails(urls: string[]): Promise<string[]> {
    const results: string[] = [];
    for (const url of urls) {
        try {
            const thumb = await createThumbnail(url);
            results.push(thumb);
        } catch (e) {
            console.warn('[ImageUtils] Failed to create thumbnail for:', url, e);
            results.push(url); // Fallback to original
        }
    }
    return results;
}

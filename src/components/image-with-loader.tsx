import React, { useState } from 'react';
import { Loader2 } from 'lucide-react';

interface ImageWithLoaderProps extends React.ImgHTMLAttributes<HTMLImageElement> {
    fallbackIcon?: React.ReactNode;
}

// Global session cache for already loaded URLs to prevent flickering during tab navigation
const loadedImagesCache = new Set<string>();

export function ImageWithLoader({ className, fallbackIcon, ...props }: ImageWithLoaderProps) {
    const [isLoaded, setIsLoaded] = useState(() => props.src ? loadedImagesCache.has(props.src) : false);
    const [hasError, setHasError] = useState(false);

    const imgRef = React.useRef<HTMLImageElement>(null);

    // Initial check on mount
    React.useEffect(() => {
        if (props.src && loadedImagesCache.has(props.src)) {
            setIsLoaded(true);
            return;
        }
        if (imgRef.current?.complete) {
            if (props.src) loadedImagesCache.add(props.src);
            setIsLoaded(true);
        }
    }, [props.src]);

    // Reset state when src changes
    React.useEffect(() => {
        if (props.src && loadedImagesCache.has(props.src)) {
            setIsLoaded(true);
            setHasError(false);
            return;
        }

        if (imgRef.current?.complete) {
            if (props.src) loadedImagesCache.add(props.src);
            setIsLoaded(true);
            setHasError(false);
        } else {
            setIsLoaded(false);
            setHasError(false);
        }
    }, [props.src]);

    return (
        <div className={`relative flex items-center justify-center overflow-hidden bg-black/40 ${className || ''}`}>
            {/* Loading State */}
            {!isLoaded && !hasError && (
                <div className={`absolute inset-0 flex flex-col items-center justify-center bg-white/5 z-10 ${props.src ? 'backdrop-blur-sm' : 'animate-pulse'}`}>
                    <Loader2 className="w-8 h-8 text-emerald-500/50 animate-spin" />
                </div>
            )}

            {/* Error State */}
            {hasError && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-red-900/20 text-red-500/50 z-10">
                    {fallbackIcon || <span className="text-xs uppercase tracking-widest font-bold">Failed to load</span>}
                </div>
            )}

            {/* Actual Image */}
            <img
                {...props}
                ref={imgRef}
                decoding="async"
                loading="eager" // Preference for Asset Library images to show ASAP
                onLoad={(e) => {
                    if (props.src) loadedImagesCache.add(props.src);
                    setIsLoaded(true);
                    if (props.onLoad) props.onLoad(e);
                }}
                onError={(e) => {
                    if (props.src) loadedImagesCache.delete(props.src);
                    setHasError(true);
                    if (props.onError) props.onError(e);
                }}
                className={`w-full h-full object-cover transition-opacity duration-300 ${isLoaded ? 'opacity-100' : 'opacity-40'} ${className || ''}`}
            />
        </div>
    );
}

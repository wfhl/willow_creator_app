import React, { useState } from 'react';
import { Loader2 } from 'lucide-react';

interface ImageWithLoaderProps extends React.ImgHTMLAttributes<HTMLImageElement> {
    fallbackIcon?: React.ReactNode;
}

export function ImageWithLoader({ className, fallbackIcon, ...props }: ImageWithLoaderProps) {
    const [isLoaded, setIsLoaded] = useState(false);
    const [hasError, setHasError] = useState(false);

    // Reset state when src changes
    React.useEffect(() => {
        setIsLoaded(false);
        setHasError(false);
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
                decoding="async"
                loading="lazy"
                onLoad={(e) => {
                    setIsLoaded(true);
                    if (props.onLoad) props.onLoad(e);
                }}
                onError={(e) => {
                    setHasError(true);
                    if (props.onError) props.onError(e);
                }}
                className={`w-full h-full object-cover transition-opacity duration-300 ${isLoaded ? 'opacity-100' : 'opacity-40'} ${className || ''}`}
            />
        </div>
    );
}

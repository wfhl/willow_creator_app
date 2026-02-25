import React, { useRef, useEffect, useState } from 'react';
import { Download, ImagePlus, Search, Loader2, X, ChevronLeft, ChevronRight, Image as ImageIcon, RotateCcw } from 'lucide-react';
import type { DBSavedPost as SavedPost } from '../../lib/dbService';
import { SIMPLE_THEMES } from '../creator-presets';
import JSZip from 'jszip'; // For download logic if we move it here, or pass handler
// We will pass handlers for simplicity and keeping logic centralized in parent for now,
// but for a true refactor, download logic *should* be here.
// I'll keep download logic inside this component as it's self-contained

interface PostsTabProps {
    savedPosts: SavedPost[];
    searchResults: SavedPost[];
    totalSavedCount: number;
    searchQuery: string;
    isSearching: boolean;
    sortOrder: 'prev' | 'next';
    onSearchChange: (query: string) => void;
    onSortChange: (order: 'prev' | 'next') => void;
    onLoadPost: (post: SavedPost) => void;
    onRecall: (post: SavedPost) => void;
    onDeletePost: (id: string) => void;
    onImportReferences: () => void;
    onImportIGArchive: () => void;
    onLoadMore: () => void;
    onPreview: (url: string, urls?: string[]) => void;
}

export function PostsTab({
    savedPosts,
    searchResults,
    totalSavedCount,
    searchQuery,
    isSearching,
    sortOrder,
    onSearchChange,
    onSortChange,
    onLoadPost,
    onRecall,
    onDeletePost,
    onImportReferences,
    onImportIGArchive,
    onLoadMore,
    onPreview
}: PostsTabProps) {
    const observerTarget = useRef<HTMLDivElement>(null);
    const [carouselIndexes, setCarouselIndexes] = useState<Record<string, number>>({});

    // Carousel handlers
    const handleCarouselPrev = (postId: string, currentIndex: number, totalMedia: number) => (e: React.MouseEvent) => {
        e.stopPropagation();
        setCarouselIndexes(prev => ({
            ...prev,
            [postId]: currentIndex > 0 ? currentIndex - 1 : totalMedia - 1
        }));
    };

    const handleCarouselNext = (postId: string, currentIndex: number, totalMedia: number) => (e: React.MouseEvent) => {
        e.stopPropagation();
        setCarouselIndexes(prev => ({
            ...prev,
            [postId]: currentIndex < totalMedia - 1 ? currentIndex + 1 : 0
        }));
    };

    const handleCarouselDot = (postId: string, index: number) => (e: React.MouseEvent) => {
        e.stopPropagation();
        setCarouselIndexes(prev => ({ ...prev, [postId]: index }));
    };

    // Observer for infinite scroll
    useEffect(() => {
        const observer = new IntersectionObserver(
            entries => {
                if (entries[0].isIntersecting) {
                    onLoadMore();
                }
            },
            { threshold: 0.1, rootMargin: '100px' }
        );

        if (observerTarget.current) {
            observer.observe(observerTarget.current);
        }

        return () => observer.disconnect();
    }, [onLoadMore]);


    // Internal Download Handler (Moved from parent to keep it self-contained)
    const handleDownloadPost = async (post: SavedPost) => {
        try {
            const zip = new JSZip();

            // Create metadata text file
            const themeName = SIMPLE_THEMES.find(t => t.id === post.themeId)?.name || "Unknown Theme";
            const postDate = new Date(post.timestamp).toLocaleString();

            const metadata = `POST METADATA
================

Title: ${post.topic || "Untitled"}
Date: ${postDate}
Theme: ${themeName}
Tags: ${post.tags?.join(", ") || "None"}
Caption Type: ${post.captionType}

CAPTION
================
${post.caption || "No caption"}

VISUAL DETAILS
================
Setting: ${post.visuals || "N/A"}
Outfit: ${post.outfit || "N/A"}

TECHNICAL
================
Prompt: ${post.prompt || "N/A"}
Media Type: ${post.mediaType}
Total Media Items: ${post.mediaUrls.length}
`;

            zip.file("metadata.txt", metadata);

            // Download all media files
            let imageCount = 0;
            let videoCount = 0;

            for (let i = 0; i < post.mediaUrls.length; i++) {
                const url = post.mediaUrls[i];
                const cleanPath = (url.split('?')[0] || '').split('#')[0].toLowerCase();
                const isVideo = url.startsWith('data:video') ||
                    ['.mp4', '.mov', '.webm', '.m4v', '.ogv'].some(ext => cleanPath.endsWith(ext));

                try {
                    let blob: Blob;

                    if (url.startsWith('data:')) {
                        const response = await fetch(url);
                        blob = await response.blob();
                    } else {
                        const response = await fetch(url);
                        blob = await response.blob();
                    }

                    if (isVideo) {
                        videoCount++;
                        zip.file(`video_${videoCount}.mp4`, blob);
                    } else {
                        imageCount++;
                        const ext = url.match(/\.(png|jpg|jpeg|webp|gif)($|\?)/i)?.[1] || 'png';
                        zip.file(`image_${imageCount}.${ext}`, blob);
                    }
                } catch (err) {
                    console.error(`Failed to download media ${i + 1}:`, err);
                }
            }

            const zipBlob = await zip.generateAsync({ type: 'blob' });
            const zipUrl = window.URL.createObjectURL(zipBlob);
            const a = document.createElement('a');
            a.href = zipUrl;
            const safeName = (post.topic || 'post').replace(/[^a-z0-9]/gi, '_').toLowerCase();
            a.download = `${safeName}_${Date.now()}.zip`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(zipUrl);
            document.body.removeChild(a);
        } catch (e) {
            console.error("Download failed:", e);
            alert("Failed to download post. Please try again.");
        }
    };

    return (
        <div className="max-w-[1600px] mx-auto w-full p-4 md:p-8 pb-32">
            <div className="flex flex-col gap-4 mb-6">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <h2 className="text-xl font-bold font-serif text-white/90">Saved Library</h2>
                    <div className="flex flex-wrap gap-2">
                        <button
                            type="button"
                            onClick={onImportReferences}
                            className="text-[10px] md:text-xs px-2 md:px-3 py-1.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded flex items-center gap-2 transition-all text-white/60 hover:text-white"
                        >
                            <ImagePlus className="w-3 h-3" />
                            Import References
                        </button>
                        <button
                            type="button"
                            onClick={onImportIGArchive}
                            className="text-[10px] md:text-xs px-2 md:px-3 py-1.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded flex items-center gap-2 transition-all text-white/60 hover:text-white"
                        >
                            <Download className="w-3 h-3" />
                            Import Archive
                        </button>
                    </div>
                </div>

                {/* Search Bar & Sort */}
                <div className="flex flex-col md:flex-row gap-4 items-stretch md:items-center">
                    <div className="relative flex-1">
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => onSearchChange(e.target.value)}
                            placeholder="Search library..."
                            className="w-full px-4 py-2.5 pl-10 pr-10 bg-white/5 border border-white/10 rounded-lg text-base md:text-sm text-white placeholder:text-white/20 focus:outline-none focus:border-emerald-500/50 focus:bg-white/10 transition-all"
                        />
                        <Search className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 transition-colors ${isSearching ? 'text-emerald-400 animate-pulse' : 'text-white/40'}`} />
                        {isSearching && (
                            <div className="absolute right-10 top-1/2 -translate-y-1/2">
                                <Loader2 className="w-3 h-3 text-emerald-400 animate-spin" />
                            </div>
                        )}
                        {searchQuery && (
                            <button
                                onClick={() => onSearchChange("")}
                                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 hover:bg-white/10 rounded transition-all"
                            >
                                <X className="w-4 h-4 text-white/60" />
                            </button>
                        )}
                    </div>

                    <div className="flex bg-white/5 border border-white/10 rounded-xl p-1 shrink-0 justify-center">
                        <button
                            onClick={() => onSortChange('prev')}
                            className={`flex-1 md:flex-none px-4 py-2 rounded-lg text-[10px] uppercase font-bold tracking-widest transition-all active-scale ${sortOrder === 'prev' ? 'bg-emerald-500 text-black shadow-lg shadow-emerald-500/20' : 'text-white/40 hover:text-white hover:bg-white/5'}`}
                        >
                            Newest
                        </button>
                        <button
                            onClick={() => onSortChange('next')}
                            className={`flex-1 md:flex-none px-4 py-2 rounded-lg text-[10px] uppercase font-bold tracking-widest transition-all active-scale ${sortOrder === 'next' ? 'bg-emerald-500 text-black shadow-lg shadow-emerald-500/20' : 'text-white/40 hover:text-white hover:bg-white/5'}`}
                        >
                            Oldest
                        </button>
                    </div>
                </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {(() => {
                    const displayPosts = searchQuery.trim() ? searchResults : savedPosts;

                    if (savedPosts.length === 0 && !searchQuery) {
                        return (
                            <div className="col-span-full py-20 text-center text-white/30">
                                <p>No saved posts yet.</p>
                            </div>
                        );
                    }

                    if (displayPosts.length === 0) {
                        return (
                            <div className="col-span-full py-20 text-center text-white/30">
                                <p>{isSearching ? "Searching deeply..." : "No posts match your search."}</p>
                                <button
                                    onClick={() => onSearchChange("")}
                                    className="mt-4 text-sm text-emerald-400 hover:text-emerald-300 underline"
                                >
                                    Clear search
                                </button>
                            </div>
                        );
                    }

                    const renderPost = (post: SavedPost) => {
                        const themeName = post.themeId === "CUSTOM" ? "Custom/Manual" : (SIMPLE_THEMES.find(t => t.id === post.themeId)?.name || "Unknown Theme");
                        const mediaUrls = post.mediaUrls || [];
                        const currentIndex = carouselIndexes[post.id] || 0;
                        const currentMedia = mediaUrls[currentIndex] || mediaUrls[0];

                        const isVideo = (() => {
                            if (!currentMedia) return false;
                            if (currentMedia.startsWith('data:video')) return true;
                            const clean = currentMedia.split('?')[0].split('#')[0].toLowerCase();
                            return ['.mp4', '.mov', '.webm', '.m4v', '.ogv'].some(ext => clean.endsWith(ext));
                        })();
                        const hasMultipleMedia = mediaUrls.length > 1;

                        return (
                            <div key={post.id} className="bg-white/5 border border-white/10 rounded-xl overflow-hidden hover:border-emerald-500/50 transition-all group flex flex-col h-full">
                                <div
                                    className="aspect-[3/4] relative bg-black/40 cursor-zoom-in"
                                    onClick={() => onPreview(currentMedia, mediaUrls)}
                                >
                                    {currentMedia ? (
                                        isVideo ?
                                            <video
                                                src={currentMedia}
                                                className="w-full h-full object-cover"
                                                muted
                                                playsInline
                                                onMouseEnter={(e) => e.currentTarget.play()}
                                                onMouseLeave={(e) => {
                                                    e.currentTarget.pause();
                                                    e.currentTarget.currentTime = 0;
                                                }}
                                            /> :
                                            <img
                                                src={currentMedia}
                                                alt={post.topic}
                                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                                                loading="lazy"
                                            />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center text-white/5">
                                            <ImageIcon className="w-12 h-12" />
                                        </div>
                                    )}

                                    {/* Carousel Navigation */}
                                    {hasMultipleMedia && (
                                        <>
                                            <button
                                                onClick={handleCarouselPrev(post.id, currentIndex, mediaUrls.length)}
                                                className="absolute left-2 top-1/2 -translate-y-1/2 p-2 bg-black/60 text-white rounded-full hover:bg-black/80 backdrop-blur-sm opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity"
                                                title="Previous"
                                            >
                                                <ChevronLeft className="w-4 h-4" />
                                            </button>
                                            <button
                                                onClick={handleCarouselNext(post.id, currentIndex, mediaUrls.length)}
                                                className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-black/60 text-white rounded-full hover:bg-black/80 backdrop-blur-sm opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity"
                                                title="Next"
                                            >
                                                <ChevronRight className="w-4 h-4" />
                                            </button>

                                            <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1.5 bg-black/40 px-2 py-1 rounded-full backdrop-blur-sm">
                                                {mediaUrls.map((_, idx) => (
                                                    <button
                                                        key={idx}
                                                        onClick={handleCarouselDot(post.id, idx)}
                                                        className={`w-1.5 h-1.5 rounded-full transition-all ${idx === currentIndex
                                                            ? 'bg-white w-4'
                                                            : 'bg-white/40 hover:bg-white/60'
                                                            }`}
                                                        title={`${idx + 1}/${mediaUrls.length}`}
                                                    />
                                                ))}
                                            </div>
                                        </>
                                    )}

                                    <div className="absolute top-2 right-2 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity flex gap-1">
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleDownloadPost(post);
                                            }}
                                            className="p-1.5 bg-black/50 text-white rounded-md hover:bg-black/80 backdrop-blur-sm"
                                            title="Download Complete Post"
                                        >
                                            <Download className="w-3 h-3" />
                                        </button>
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                onRecall(post);
                                            }}
                                            className="p-1.5 bg-black/50 text-white rounded-md hover:bg-emerald-600/80 backdrop-blur-sm"
                                            title="Recall to Create"
                                        >
                                            <RotateCcw className="w-3 h-3" />
                                        </button>
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation(); // Use StopPropagation for delete logic
                                                onDeletePost(post.id);
                                            }}
                                            className="p-1.5 bg-red-900/80 text-white rounded-md hover:bg-red-700 backdrop-blur-sm"
                                            title="Delete Post"
                                        >
                                            <X className="w-3 h-3" />
                                        </button>
                                    </div>

                                    <div className="absolute top-2 left-2 px-2 py-1 bg-black/50 backdrop-blur-sm rounded text-[10px] uppercase tracking-wider text-white/70 font-bold border border-white/10 flex gap-2">
                                        {(() => {
                                            const vidCount = mediaUrls.filter(u => {
                                                if (u.startsWith('data:video')) return true;
                                                const clean = u.split('?')[0].split('#')[0].toLowerCase();
                                                return ['.mp4', '.mov', '.webm', '.m4v', '.ogv'].some(ext => clean.endsWith(ext));
                                            }).length;
                                            const imgCount = mediaUrls.length - vidCount;

                                            const parts = [];
                                            if (imgCount > 0) parts.push(`${imgCount} Image${imgCount !== 1 ? 's' : ''}`);
                                            if (vidCount > 0) parts.push(`${vidCount} Video${vidCount !== 1 ? 's' : ''}`);

                                            return parts.join(', ');
                                        })()}
                                    </div>
                                </div>

                                <div
                                    className="p-4 flex flex-col gap-3 flex-1 bg-gradient-to-b from-white/[0.02] to-transparent cursor-pointer hover:bg-white/5 transition-colors"
                                    onClick={() => onLoadPost(post)}
                                >
                                    <div className="flex justify-between items-start gap-2">
                                        <div className="flex-1">
                                            <h3 className="text-sm font-bold text-white/90 line-clamp-1">{post.topic || "Untitled Post"}</h3>
                                            {post.tags && post.tags.length > 0 && (
                                                <div className="flex flex-wrap gap-1 mt-1">
                                                    {post.tags.slice(0, 3).map(tag => (
                                                        <span key={tag} className="text-[9px] px-1.5 py-0.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded capitalize">
                                                            {tag}
                                                        </span>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                        <span className="text-[10px] text-white/40 whitespace-nowrap">{new Date(post.timestamp).toLocaleDateString()}</span>
                                    </div>
                                    {!post.tags?.length && <p className="text-xs text-emerald-400/80 line-clamp-1">{themeName}</p>}
                                    <p className="text-xs text-white/60 line-clamp-3 italic font-serif flex-1">{post.caption || "No caption..."}</p>
                                </div>
                            </div>
                        );
                    };

                    const rendered = displayPosts.map(renderPost);

                    return (
                        <>
                            {searchQuery.trim() && !isSearching && (
                                <div className="col-span-full mb-2 text-xs text-white/40 px-1">
                                    Showing top results for "{searchQuery}"
                                </div>
                            )}
                            {rendered}
                            {totalSavedCount > savedPosts.length && !searchQuery && (
                                <div ref={observerTarget} className="col-span-full py-12 flex justify-center">
                                    <div className="flex items-center gap-3 text-white/40">
                                        <Loader2 className="w-5 h-5 animate-spin" />
                                        <span className="text-sm font-medium tracking-widest uppercase">Loading More...</span>
                                    </div>
                                </div>
                            )}
                        </>
                    );
                })()}
            </div>
        </div>
    );
}

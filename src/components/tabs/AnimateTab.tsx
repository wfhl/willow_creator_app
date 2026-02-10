
import React, { useEffect, useState, type ChangeEvent } from 'react';
import { Video as VideoIcon, ImagePlus, X, RefreshCw, Play, Save, Download } from 'lucide-react';
import LoadingIndicator from '../loading-indicator';

interface AnimateTabProps {
    i2vTarget: { url: string, index: number } | null;
    setI2VTarget: (val: { url: string, index: number } | null) => void;
    i2vPrompt: string;
    setI2VPrompt: (val: string) => void;
    i2vAspectRatio: string;
    setI2VAspectRatio: (val: string) => void;
    videoDuration: string;
    setVideoDuration: (val: string) => void;
    videoResolution: string;
    setVideoResolution: (val: string) => void;
    selectedModel: string;
    setSelectedModel: (val: string) => void;
    isGeneratingI2V: boolean;
    onGenerateI2V: () => void;
    generatedI2VUrl: string | null;
    onExit: () => void;

    // New Actions
    onApproveI2V: () => void;
    onDiscardI2V: () => void;

    presetsDropdown: React.ReactNode;
    onSaveToAssets: (url: string, type: 'image' | 'video', name?: string) => void;
    onPreview: (url: string) => void;
}

export function AnimateTab({
    i2vTarget,
    setI2VTarget,
    i2vPrompt,
    setI2VPrompt,
    i2vAspectRatio,
    setI2VAspectRatio,
    videoDuration,
    setVideoDuration,
    videoResolution,
    setVideoResolution,
    selectedModel,
    setSelectedModel,
    isGeneratingI2V,
    onGenerateI2V,
    generatedI2VUrl,
    onExit,
    onApproveI2V,
    onDiscardI2V,
    presetsDropdown,
    onSaveToAssets,
    onPreview
}: AnimateTabProps) {
    const [isDragging, setIsDragging] = useState(false);

    // Ensure we are on a video model when mounting or if model is invalid
    useEffect(() => {
        const isVideoModel = selectedModel.includes('video') || selectedModel.includes('veo');
        if (!isVideoModel) {
            // Default to Grok Video
            setSelectedModel('xai/grok-imagine-video/image-to-video');
            setVideoDuration('5s');
            setVideoResolution('720p');
        } else {
            // Validate constraints for current video model
            if (selectedModel.includes('grok')) {
                if (!['5s', '6s', '9s'].includes(videoDuration)) setVideoDuration('5s');
                if (videoResolution !== '720p') setVideoResolution('720p');
            } else if (selectedModel.includes('veo-3')) {
                if (videoResolution === '1080p' && videoDuration !== '8s') setVideoDuration('8s');
            }
        }
    }, [selectedModel, videoDuration, videoResolution, setSelectedModel, setVideoDuration, setVideoResolution]);

    // Helper to process a file to a data URL
    const processFile = (file: File) => {
        if (!file.type.startsWith('image/')) return;
        const reader = new FileReader();
        reader.onload = (re) => {
            if (re.target?.result) {
                setI2VTarget({ url: re.target.result as string, index: -1 });
            }
        };
        reader.readAsDataURL(file);
    };

    const handleI2VImageUpload = (e: ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            processFile(e.target.files[0]);
        }
    };

    // Drag and Drop handlers
    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(true);
    };

    const handleDragLeave = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);
        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
            processFile(e.dataTransfer.files[0]);
        }
    };

    if (!i2vTarget) {
        return (
            <div
                className={`max-w-[1200px] mx-auto w-full p-8 pb-32 flex flex-col items-center justify-center min-h-[60vh] transition-all duration-300 ${isDragging ? 'bg-emerald-500/5 scale-[1.01]' : ''}`}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
            >
                <div className="text-center space-y-6 max-w-lg pointer-events-none">
                    <div className="p-4 bg-emerald-500/10 rounded-2xl border border-emerald-500/20 inline-block">
                        <VideoIcon className="w-12 h-12 text-emerald-400" />
                    </div>
                    <div>
                        <h2 className="text-3xl font-bold font-serif text-white mb-2">Image to Video</h2>
                        <p className="text-white/40">Upload an image to animate it using Veo or Grok models.</p>
                    </div>

                    <label
                        className={`flex flex-col items-center justify-center w-full h-64 border-2 border-dashed rounded-2xl transition-all cursor-pointer group pointer-events-auto ${isDragging ? 'border-emerald-500 bg-emerald-500/10' : 'border-white/10 bg-white/5 hover:bg-white/10 hover:border-emerald-500/50'}`}
                    >
                        <div className="flex flex-col items-center justify-center pt-5 pb-6">
                            <ImagePlus className={`w-10 h-10 transition-colors mb-4 ${isDragging ? 'text-emerald-400 animate-bounce' : 'text-white/20 group-hover:text-emerald-400'}`} />
                            <p className="mb-2 text-sm text-white/60">
                                {isDragging ? <span className="text-emerald-400 font-bold">Drop it here!</span> : <><span className="font-semibold text-emerald-400">Click to upload</span> or drag and drop</>}
                            </p>
                            <p className="text-xs text-white/40">PNG, JPG or WebP</p>
                        </div>
                        <input type="file" className="hidden" accept="image/*" onChange={handleI2VImageUpload} />
                    </label>
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-[1200px] mx-auto w-full p-8 pb-32">
            <div className="flex items-center justify-between mb-8 pb-4 border-b border-white/10">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-emerald-500/10 rounded-lg border border-emerald-500/20">
                        <VideoIcon className="w-6 h-6 text-emerald-400" />
                    </div>
                    <div>
                        <h2 className="text-2xl font-bold font-serif text-white/90">Animate Image</h2>
                        <p className="text-xs text-white/40 uppercase tracking-widest">Turn your still image into a video</p>
                    </div>
                </div>
                <button
                    onClick={onExit}
                    className="px-4 py-2 hover:bg-white/5 rounded-lg text-white/60 transition-all border border-white/10 flex items-center gap-2"
                >
                    <X className="w-4 h-4" /> Exit I2V Mode
                </button>
            </div>

            <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden shadow-2xl">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-0">
                    <div className="p-8 border-r border-white/5">
                        <div className="aspect-[3/4] bg-black/40 rounded-xl overflow-hidden border border-white/10 shadow-inner group relative">
                            <img
                                src={i2vTarget.url}
                                alt="Target"
                                className="w-full h-full object-cover cursor-zoom-in"
                                onClick={() => onPreview(i2vTarget.url)}
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-4 pointer-events-none">
                                <p className="text-[10px] text-white/60 uppercase tracking-widest font-bold">Source Reference</p>
                            </div>
                        </div>
                    </div>
                    <div className="p-8 space-y-8 flex flex-col justify-center bg-black/20">
                        {!generatedI2VUrl ? (
                            <>
                                <div className="space-y-4">
                                    <div className="flex justify-between items-center mb-2">
                                        <label className="text-xs font-bold text-white/60 uppercase tracking-widest flex items-center gap-2">
                                            <Play className="w-3 h-3 text-emerald-400" /> Motion Prompt
                                        </label>
                                        {presetsDropdown}
                                    </div>
                                    <textarea
                                        value={i2vPrompt}
                                        onChange={(e) => setI2VPrompt(e.target.value)}
                                        placeholder="Describe the motion... (e.g., camera pans slowly right, hair blowing in wind, blinking eyes)"
                                        className="w-full h-[150px] p-6 bg-black/40 border border-white/10 rounded-xl text-sm text-white focus:border-emerald-500/50 focus:outline-none transition-all resize-none font-serif leading-relaxed"
                                    />
                                    {/* Video Settings */}
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-1">
                                            <label className="text-[10px] text-white/40 uppercase tracking-widest block">Model</label>
                                            <select
                                                value={selectedModel}
                                                onChange={(e) => {
                                                    const newModel = e.target.value;
                                                    setSelectedModel(newModel);
                                                    if (newModel.includes('grok')) {
                                                        setVideoDuration('5s');
                                                        setVideoResolution('720p');
                                                    } else if (newModel.includes('veo-3')) {
                                                        setVideoDuration('8s');
                                                        setVideoResolution('1080p');
                                                    } else {
                                                        setVideoDuration('6s');
                                                        setVideoResolution('720p');
                                                    }
                                                }}
                                                className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-xs text-white focus:border-emerald-500/50 outline-none"
                                            >
                                                <option value="xai/grok-imagine-video/image-to-video">Grok 2 Video (Beta)</option>
                                                <option value="veo-3.1-generate-preview">Veo 3.1 (Google)</option>
                                                <option value="veo-2.0-generate-001">Veo 2.0 (Google Legacy)</option>
                                            </select>
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-[10px] text-white/40 uppercase tracking-widest block">Resolution</label>
                                            <select
                                                value={videoResolution}
                                                onChange={(e) => {
                                                    const newRes = e.target.value;
                                                    setVideoResolution(newRes);
                                                    if (selectedModel.includes('veo-3')) {
                                                        if (newRes === '1080p') {
                                                            setVideoDuration('8s');
                                                        } else if (newRes === '720p' && !['4s', '6s', '8s'].includes(videoDuration)) {
                                                            setVideoDuration('6s');
                                                        }
                                                    }
                                                }}
                                                className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-xs text-white focus:border-emerald-500/50 outline-none"
                                            >
                                                {selectedModel.includes('grok') ? (
                                                    <option value="720p">720p (Standard)</option>
                                                ) : selectedModel.includes('veo-3') ? (
                                                    <>
                                                        <option value="1080p">1080p (HD - 8s Only)</option>
                                                        <option value="720p">720p (Fast)</option>
                                                    </>
                                                ) : (
                                                    <>
                                                        <option value="720p">720p (HD)</option>
                                                        <option value="480p">480p (SD)</option>
                                                    </>
                                                )}
                                            </select>
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-[10px] text-white/40 uppercase tracking-widest block">Duration</label>
                                            <select
                                                value={videoDuration}
                                                onChange={(e) => setVideoDuration(e.target.value)}
                                                className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-xs text-white focus:border-emerald-500/50 outline-none"
                                            >
                                                {selectedModel.includes('grok') ? (
                                                    <>
                                                        <option value="5s">5 Seconds</option>
                                                        <option value="6s">6 Seconds</option>
                                                        <option value="9s">9 Seconds</option>
                                                    </>
                                                ) : selectedModel.includes('veo-3') ? (
                                                    videoResolution === '1080p' ? (
                                                        <option value="8s">8 Seconds (Fixed for HD)</option>
                                                    ) : (
                                                        <>
                                                            <option value="4s">4 Seconds</option>
                                                            <option value="6s">6 Seconds</option>
                                                            <option value="8s">8 Seconds</option>
                                                        </>
                                                    )
                                                ) : (
                                                    <>
                                                        <option value="4s">4 Seconds</option>
                                                        <option value="6s">6 Seconds</option>
                                                    </>
                                                )}
                                            </select>
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-[10px] text-white/40 uppercase tracking-widest block">Aspect Ratio</label>
                                            <select
                                                value={i2vAspectRatio}
                                                onChange={(e) => setI2VAspectRatio(e.target.value)}
                                                className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-xs text-white focus:border-emerald-500/50 outline-none"
                                            >
                                                <option value="auto">Matches Image</option>
                                                <option value="16:9">16:9 Landscape</option>
                                                <option value="9:16">9:16 Portrait</option>
                                                <option value="1:1">1:1 Square</option>
                                            </select>
                                        </div>
                                    </div>
                                </div>

                                {isGeneratingI2V ? (
                                    <div className="py-12">
                                        <LoadingIndicator
                                            title="Animating Video"
                                            modelName={selectedModel}
                                            type="video"
                                        />
                                    </div>
                                ) : (
                                    <button
                                        onClick={onGenerateI2V}
                                        disabled={isGeneratingI2V || !i2vPrompt}
                                        className={`w-full py-4 rounded-xl text-sm font-bold flex items-center justify-center gap-3 transition-all ${isGeneratingI2V || !i2vPrompt ? 'bg-white/5 text-white/20' : 'bg-emerald-600 hover:bg-emerald-500 text-black shadow-lg shadow-emerald-500/20 hover:-translate-y-0.5'
                                            }`}
                                    >
                                        <VideoIcon className="w-5 h-5" />
                                        GENERATE VIDEO
                                    </button>
                                )}
                            </>
                        ) : (
                            <div className="space-y-6">
                                <div className="relative group">
                                    <label className="text-xs font-bold text-emerald-400 uppercase tracking-widest flex items-center gap-2 mb-4">
                                        <VideoIcon className="w-3 h-3" /> Animation Result
                                    </label>
                                    <div className="aspect-[3/4] bg-black/40 rounded-xl overflow-hidden border-2 border-emerald-500/30 shadow-2xl shadow-emerald-500/10 relative group">
                                        <video
                                            src={generatedI2VUrl}
                                            controls
                                            loop
                                            autoPlay
                                            className="w-full h-full object-cover cursor-zoom-in"
                                            onClick={(e) => {
                                                // If they click the video itself (not controls), open preview
                                                // But video tag clicks on controls might be tricky.
                                                // Let's just make it clear.
                                                if (e.target === e.currentTarget) {
                                                    onPreview(generatedI2VUrl!);
                                                }
                                            }}
                                        />
                                        <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity bg-black/60 rounded-lg p-1">
                                            <button
                                                onClick={() => {
                                                    const a = document.createElement('a');
                                                    a.href = generatedI2VUrl!;
                                                    a.download = `willow_animated_${Date.now()}.mp4`;
                                                    document.body.appendChild(a);
                                                    a.click();
                                                    document.body.removeChild(a);
                                                }}
                                                className="p-1 hover:bg-white/20 rounded"
                                                title="Download"
                                            >
                                                <Download className="w-4 h-4 text-white" />
                                            </button>
                                            <button
                                                onClick={() => onSaveToAssets(generatedI2VUrl!, 'video', 'Animated Video')}
                                                className="p-1 hover:bg-emerald-500/40 rounded"
                                                title="Save to Assets"
                                            >
                                                <Save className="w-4 h-4 text-white" />
                                            </button>
                                        </div>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 gap-3">
                                    <button
                                        onClick={onApproveI2V}
                                        className="w-full py-4 bg-emerald-600 hover:bg-emerald-500 text-black rounded-xl font-bold text-xs uppercase tracking-widest transition-all shadow-lg shadow-emerald-900/40"
                                    >
                                        Add to Post
                                    </button>
                                </div>

                                <button
                                    onClick={onDiscardI2V}
                                    className="w-full py-3 text-white/40 hover:text-white transition-colors text-[10px] uppercase font-bold tracking-[0.2em] flex items-center justify-center gap-2"
                                >
                                    <RefreshCw className="w-3 h-3" /> Try again / Discard Result
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

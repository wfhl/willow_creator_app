import React, { useState, type ChangeEvent } from 'react';
import { Sparkles, Edit2, ImagePlus, X, RefreshCw, Download, Video as VideoIcon, Save } from 'lucide-react';
import LoadingIndicator from '../loading-indicator';
import type { DBAsset as Asset } from '../../lib/dbService';
import { generateUUID } from '../../lib/uuid';

interface EditTabProps {
    refineTarget: { url: string, index: number } | null;
    setRefineTarget: (target: { url: string, index: number } | null) => void;
    refinePrompt: string;
    setRefinePrompt: (val: string) => void;
    refineImageSize: string;
    setRefineImageSize: (val: string) => void;
    refineNumImages: number;
    setRefineNumImages: (val: number) => void;
    selectedModel: string;
    setSelectedModel: (val: string) => void;
    refineAdditionalImages: Asset[];
    setRefineAdditionalImages: React.Dispatch<React.SetStateAction<Asset[]>>;
    refineResultUrls: string[];
    setRefineResultUrls: (val: string[]) => void;
    isRefining: boolean;
    refineProgress?: number;
    onRefineSubmit: () => void;
    onApproveRefinement: (action: 'replace' | 'add', url?: string) => void;

    onExit: () => void;
    onI2VEntry: (url: string) => void;
    presetsDropdown: React.ReactNode;
    onSaveToAssets: (url: string, type: 'image' | 'video', name?: string) => void;
    onPreview: (url: string) => void;
    onDownload: (url: string, prefix?: string) => void;

    // New Props
    promptRef?: React.RefObject<HTMLTextAreaElement | null>;
    apiKeys: { gemini: string; fal: string };
}

export function EditTab({
    refineTarget,
    setRefineTarget,
    refinePrompt,
    setRefinePrompt,
    refineImageSize,
    setRefineImageSize,
    refineNumImages,
    setRefineNumImages,
    selectedModel,
    setSelectedModel,
    refineAdditionalImages,
    setRefineAdditionalImages,
    refineResultUrls,
    setRefineResultUrls,
    isRefining,
    refineProgress = 0,
    onRefineSubmit,
    onApproveRefinement,

    onExit,
    onI2VEntry,
    presetsDropdown,
    onSaveToAssets,
    onPreview,
    onDownload,
    promptRef,
    apiKeys
}: EditTabProps) {
    const [isDragging, setIsDragging] = useState(false);

    // Derived state for media type
    const isVideo = refineTarget?.url?.startsWith('data:video') || refineTarget?.url?.match(/\.(mp4|mov|webm)$/i);

    const availableModels = React.useMemo(() => isVideo ? [
        { id: 'xai/grok-imagine-video/edit-video', name: 'Grok Edit' },
        { id: 'fal-ai/wan/v2.2-14b/animate/move', name: 'Wan Move (Ref Only)' },
        { id: 'fal-ai/wan/v2.2-14b/animate/replace', name: 'Wan Replace' },
    ] : [
        { id: 'google/gemini-2.0-flash-exp', name: 'Gemini 2.0 Flash' },
        { id: 'nano-banana-pro-preview', name: 'Nano Banana Pro' },
        { id: 'fal-ai/bytedance/seedream/v4.5/edit', name: 'Seedream 4.5 Edit' },
        { id: 'xai/grok-imagine-image/edit', name: 'Grok Image Edit' }
    ], [isVideo]);

    // Ensure selected model is valid for current media type (image vs video category)
    React.useEffect(() => {
        const isSelectedVideoModel = selectedModel.includes('video') || selectedModel.includes('animate') || selectedModel.includes('wan');
        const isCurrentMatch = isVideo ? isSelectedVideoModel : !isSelectedVideoModel;

        if (!isCurrentMatch || !availableModels.some(m => m.id === selectedModel)) {
            // Only force reset if we're in the wrong category (video model for image or vice versa)
            // or if the specific model ID is completely unknown to this tab.
            const modelToSet = availableModels[0].id;
            if (selectedModel !== modelToSet) {
                setSelectedModel(modelToSet);
            }
        }
    }, [isVideo, selectedModel, availableModels]);

    // Helper to process a file to a data URL
    const processFile = (file: File) => {
        if (!file.type.startsWith('image/') && !file.type.startsWith('video/')) return;
        const reader = new FileReader();
        reader.onload = (re) => {
            if (re.target?.result) {
                setRefineTarget({ url: re.target.result as string, index: -1 });
            }
        };
        reader.readAsDataURL(file);
    };

    // Internal handler for uploading the main refine target if none exists
    const handleRefineImageUpload = (e: ChangeEvent<HTMLInputElement>) => {
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

    if (!refineTarget) {
        return (
            <div
                className={`max-w-[1200px] mx-auto w-full p-8 pb-32 flex flex-col items-center justify-center min-h-[60vh] transition-all duration-300 ${isDragging ? 'bg-emerald-500/5 scale-[1.01]' : ''}`}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
            >
                <div className="text-center space-y-6 max-w-lg pointer-events-none">
                    <div className="p-4 bg-emerald-500/10 rounded-2xl border border-emerald-500/20 inline-block">
                        <Edit2 className="w-12 h-12 text-emerald-400" />
                    </div>
                    <div>
                        <h2 className="text-3xl font-bold font-serif text-white mb-2">Refine & Edit</h2>
                        <p className="text-white/40">Upload an image to start refining its details, outfits, or style.</p>
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
                        <input type="file" className="hidden" accept="image/*" onChange={handleRefineImageUpload} />
                    </label>
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-[1200px] mx-auto w-full p-4 md:p-8 pb-32">
            <div className="flex items-center justify-between mb-8 pb-4 border-b border-white/10">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-emerald-500/10 rounded-lg border border-emerald-500/20">
                        <Edit2 className="w-6 h-6 text-emerald-400" />
                    </div>
                    <div>
                        <h2 className="text-2xl font-bold font-serif text-white/90">Refine Media</h2>
                        <p className="text-xs text-white/40 uppercase tracking-widest">Fine-tune your generated variations</p>
                    </div>
                </div>
                <button
                    onClick={onExit}
                    className="px-4 py-2 hover:bg-white/5 rounded-lg text-white/60 transition-all border border-white/10 flex items-center gap-2"
                >
                    <X className="w-4 h-4" /> Exit Edit Mode
                </button>
            </div>

            <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden shadow-2xl">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-0">
                    <div className="p-4 md:p-8 border-b lg:border-b-0 lg:border-r border-white/5">
                        <div className="aspect-[3/4] bg-black/40 rounded-xl overflow-hidden border border-white/10 shadow-inner group relative">
                            {isVideo ? (
                                <video
                                    src={refineTarget.url}
                                    className="w-full h-full object-cover"
                                    controls
                                    autoPlay
                                    muted
                                    loop
                                />
                            ) : (
                                <img
                                    src={refineTarget.url}
                                    alt="Target"
                                    className="w-full h-full object-cover cursor-zoom-in"
                                    onClick={() => onPreview(refineTarget.url)}
                                />
                            )}
                            <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity flex flex-col items-end justify-between p-4 pointer-events-none">
                                <label className="pointer-events-auto cursor-pointer bg-white/10 hover:bg-white/20 backdrop-blur-md px-3 py-1.5 rounded-lg border border-white/10 flex items-center gap-2 transition-all shadow-lg">
                                    <ImagePlus className="w-4 h-4 text-emerald-400" />
                                    <span className="text-[10px] text-white font-bold uppercase tracking-widest">Replace</span>
                                    <input
                                        type="file"
                                        accept="image/*,video/*"
                                        className="hidden"
                                        onChange={handleRefineImageUpload}
                                    />
                                </label>
                                <p className="text-[10px] text-white/60 uppercase tracking-widest font-bold">Source Reference</p>
                            </div>
                        </div>

                        {/* Refine Actions: Reference Images */}
                        {(selectedModel.includes('seedream') || selectedModel.includes('grok') || selectedModel.includes('banana')) && !isVideo && (
                            <div className="mt-4">
                                <div className="flex items-center justify-between mb-2">
                                    <label className="text-[10px] font-bold text-white/40 uppercase tracking-widest flex items-center gap-2">
                                        <ImagePlus className="w-3 h-3" /> Additional References
                                    </label>
                                    <span className="text-[10px] text-white/20 italic">Optional</span>
                                </div>
                                <div className="flex flex-wrap gap-2">
                                    {refineAdditionalImages.map((img, idx) => (
                                        <div key={idx} className="relative w-16 h-16 group">
                                            <img src={img.base64} className="w-full h-full object-cover rounded-lg border border-white/10" alt="ref" />
                                            <button
                                                onClick={() => setRefineAdditionalImages(prev => prev.filter((_, i) => i !== idx))}
                                                className="absolute -top-1 -right-1 p-0.5 bg-red-500 rounded-full opacity-100 md:opacity-0 group-hover:opacity-100 transition-opacity"
                                            >
                                                <X className="w-3 h-3 text-white" />
                                            </button>
                                        </div>
                                    ))}
                                    <div className="w-16 h-16 bg-white/5 border border-white/10 border-dashed rounded-lg flex items-center justify-center hover:bg-white/10 transition-colors cursor-pointer relative group">
                                        <ImagePlus className="w-5 h-5 text-white/30 group-hover:text-white/60 transition-colors" />
                                        <input
                                            type="file"
                                            accept="image/*"
                                            multiple
                                            className="absolute inset-0 opacity-0 cursor-pointer"
                                            onChange={async (e) => {
                                                if (e.target.files) {
                                                    const newAssets: Asset[] = [];
                                                    for (let i = 0; i < e.target.files.length; i++) {
                                                        const file = e.target.files[i];
                                                        const reader = new FileReader();
                                                        const base64 = await new Promise<string>((resolve) => {
                                                            reader.onload = () => resolve(reader.result as string);
                                                            reader.readAsDataURL(file);
                                                        });
                                                        newAssets.push({
                                                            id: generateUUID(),
                                                            name: file.name,
                                                            base64,
                                                            type: 'image',
                                                            folderId: null,
                                                            timestamp: Date.now(),
                                                            selected: true
                                                        });
                                                    }
                                                    setRefineAdditionalImages(prev => [...prev, ...newAssets]);
                                                }
                                            }}
                                        />
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Video Edit Actions: Subject Input for Move/Replace */}
                        {isVideo && (selectedModel.includes('move') || selectedModel.includes('replace')) && (
                            <div className="mt-4 animate-in fade-in slide-in-from-top-2">
                                <div className="flex items-center justify-between mb-2">
                                    <label className="text-[10px] font-bold text-white/40 uppercase tracking-widest flex items-center gap-2">
                                        <ImagePlus className="w-3 h-3" /> Subject Reference
                                    </label>
                                    <span className="text-[10px] text-emerald-400 font-bold">Required</span>
                                </div>
                                <div className="flex gap-4">
                                    {refineAdditionalImages.length > 0 ? (
                                        <div className="relative w-24 h-24 group">
                                            <img src={refineAdditionalImages[0].base64} className="w-full h-full object-cover rounded-xl border border-white/10" alt="subject" />
                                            <button
                                                onClick={() => setRefineAdditionalImages([])}
                                                className="absolute -top-2 -right-2 p-1 bg-red-500 rounded-full hover:bg-red-600 transition-colors shadow-lg"
                                            >
                                                <X className="w-3 h-3 text-white" />
                                            </button>
                                        </div>
                                    ) : (
                                        <label className="w-24 h-24 bg-white/5 border border-white/10 border-dashed rounded-xl flex flex-col items-center justify-center hover:bg-white/10 transition-colors cursor-pointer group">
                                            <ImagePlus className="w-6 h-6 text-white/30 group-hover:text-emerald-400 transition-colors mb-2" />
                                            <span className="text-[9px] text-white/40 uppercase font-bold">Upload</span>
                                            <input
                                                type="file"
                                                accept="image/*"
                                                className="hidden"
                                                onChange={async (e) => {
                                                    if (e.target.files?.[0]) {
                                                        const file = e.target.files[0];
                                                        const reader = new FileReader();
                                                        const base64 = await new Promise<string>((resolve) => {
                                                            reader.onload = () => resolve(reader.result as string);
                                                            reader.readAsDataURL(file);
                                                        });
                                                        setRefineAdditionalImages([{
                                                            id: generateUUID(), name: file.name, base64, type: 'image', folderId: null, timestamp: Date.now()
                                                        }]);
                                                    }
                                                }}
                                            />
                                        </label>
                                    )}
                                    <div className="flex-1">
                                        <p className="text-xs text-white/60 leading-relaxed">
                                            {selectedModel.includes('move')
                                                ? "Provide an image of the character/subject you want to ANIMATE matching the video's motion."
                                                : "Provide an image of the character/object you want to INSERT into the video scene."}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                    <div className="p-4 md:p-8 space-y-6 md:space-y-8 flex flex-col justify-center bg-black/20">
                        {refineResultUrls.length === 0 ? (
                            <>
                                <div className="space-y-4">
                                    <div className="flex justify-between items-center mb-2">
                                        <label className="text-xs font-bold text-white/60 uppercase tracking-widest flex items-center gap-2">
                                            <Sparkles className="w-3 h-3 text-emerald-400" /> Improvement Instructions
                                        </label>
                                        {presetsDropdown}
                                    </div>
                                    <textarea
                                        ref={promptRef}
                                        value={refinePrompt}
                                        onChange={(e) => setRefinePrompt(e.target.value)}
                                        placeholder="E.g., change eye color to deep blue, add more freckles, make the background a sunset forest, adjust lighting to be warmer..."
                                        className="w-full h-[250px] p-6 bg-black/40 border border-white/10 rounded-xl text-base md:text-sm text-white focus:border-emerald-500/50 focus:outline-none transition-all resize-none font-serif leading-relaxed"
                                    />
                                    {/* Model Selector & Parameters Bar */}
                                    <div className="flex flex-col gap-4 p-4 bg-black/40 rounded-xl border border-white/10">
                                        {/* Row 1: Model Selection */}
                                        <div className="space-y-1 w-full">
                                            <label className="text-[10px] font-bold text-white/40 uppercase tracking-widest block">AI Model Engine</label>
                                            <select
                                                value={selectedModel}
                                                onChange={(e) => setSelectedModel(e.target.value)}
                                                className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-base md:text-xs text-white focus:border-emerald-500/50 outline-none"
                                            >
                                                {availableModels.map(m => (
                                                    <option key={m.id} value={m.id}>{m.name}</option>
                                                ))}
                                            </select>
                                        </div>

                                        {/* Row 2: Parameters */}
                                        <div className="flex items-center gap-4">
                                            {/* Dynamic Parameters for Models */}
                                            {(selectedModel.includes('seedream') || selectedModel.includes('banana')) && (
                                                <div className="space-y-1 flex-1 animate-in fade-in slide-in-from-left-2 duration-300">
                                                    <label className="text-[10px] font-bold text-white/40 uppercase tracking-widest block">Size / Ratio</label>
                                                    <select
                                                        value={refineImageSize}
                                                        onChange={(e) => setRefineImageSize(e.target.value)}
                                                        className="w-full bg-black/40 border border-white/10 rounded-lg px-2 py-2 text-base md:text-xs text-white focus:border-emerald-500/50 outline-none cursor-pointer hover:bg-white/5 transition-colors"
                                                    >
                                                        {selectedModel.includes('banana') ? (
                                                            <>
                                                                <option value="1:1">1:1 Square</option>
                                                                <option value="4:3">4:3 Landscape(ish)</option>
                                                                <option value="16:9">16:9 Landscape</option>
                                                            </>
                                                        ) : selectedModel.includes('v4.5') ? (
                                                            <>
                                                                <option value="auto_4K">Auto 4K (Default)</option>
                                                                <option value="square_hd">Square 2K</option>
                                                                <option value="portrait_4_3">Portrait 4:3</option>
                                                                <option value="landscape_16_9">Landscape 16:9</option>
                                                            </>
                                                        ) : (
                                                            <>
                                                                <option value="square_hd">Square 2K (Default)</option>
                                                                <option value="square">Square 1K</option>
                                                                <option value="portrait_hd">Portrait 2K</option>
                                                                <option value="landscape_hd">Landscape 2K</option>
                                                            </>
                                                        )}
                                                    </select>
                                                </div>
                                            )}

                                            {!isVideo && (
                                                <div className="space-y-1 w-32 animate-in fade-in slide-in-from-left-2 duration-300">
                                                    <label className="text-[10px] font-bold text-white/40 uppercase tracking-widest block">Batch Quantity</label>
                                                    <select
                                                        value={refineNumImages}
                                                        onChange={(e) => setRefineNumImages(Number(e.target.value))}
                                                        className="w-full bg-black/40 border border-white/10 rounded-lg px-2 py-2 text-xs text-white focus:border-emerald-500/50 outline-none cursor-pointer hover:bg-white/5 transition-colors"
                                                    >
                                                        <option value={1}>1 Image</option>
                                                        <option value={2}>2 Images</option>
                                                        <option value={3}>3 Images</option>
                                                        <option value={4}>4 Images</option>
                                                    </select>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                    <div className="p-4 bg-emerald-500/5 border border-emerald-500/10 rounded-xl">
                                        <p className="text-[10px] text-emerald-400/80 leading-relaxed uppercase tracking-wider font-bold">
                                            AI Engine Note:
                                        </p>
                                        <p className="text-xs text-white/60 mt-1 italic">
                                            Face identity and basic composition will be preserved. Instructions are weighted towards specific detail changes.
                                        </p>
                                    </div>
                                </div>

                                {isRefining ? (
                                    <div className="flex flex-col items-center justify-center py-12 space-y-4">
                                        <LoadingIndicator />
                                        <div className="text-center">
                                            <p className="text-emerald-400 font-bold text-xs uppercase tracking-widest animate-pulse">
                                                Refining variation...
                                            </p>
                                            {refineProgress > 0 && (
                                                <div className="mt-4 w-48 h-1 bg-white/5 rounded-full overflow-hidden mx-auto">
                                                    <div
                                                        className="h-full bg-emerald-500 transition-all duration-500 ease-out"
                                                        style={{ width: `${refineProgress}%` }}
                                                    />
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ) : (
                                    <div className="relative group/gen">
                                        {!apiKeys.fal && (
                                            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-4 w-64 p-3 bg-red-500/90 backdrop-blur-md border border-red-400/50 rounded-xl shadow-2xl opacity-0 group-hover/gen:opacity-100 transition-opacity pointer-events-none z-[100]">
                                                <p className="text-[10px] font-bold text-white uppercase tracking-widest mb-1">Fal.ai Key Missing</p>
                                                <p className="text-[10px] text-white/90 leading-relaxed font-medium">Add your API key in Settings &gt; Credentials to enable generation.</p>
                                                <div className="absolute top-full left-1/2 -translate-x-1/2 border-8 border-transparent border-t-red-500/90" />
                                            </div>
                                        )}
                                        <button
                                            onClick={onRefineSubmit}
                                            disabled={isRefining || !refinePrompt || !apiKeys.fal}
                                            className={`w-full py-4 rounded-xl text-sm font-bold flex items-center justify-center gap-3 transition-all active-scale ${isRefining || !refinePrompt || !apiKeys.fal ? 'bg-white/5 text-white/20' : 'bg-emerald-600 hover:bg-emerald-500 text-black shadow-lg shadow-emerald-500/20 hover:-translate-y-0.5'
                                                }`}
                                        >
                                            <Sparkles className="w-5 h-5" />
                                            GENERATE REFINED VERSION
                                        </button>
                                    </div>
                                )}
                            </>
                        ) : refineResultUrls.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-12">
                                <LoadingIndicator />
                            </div>
                        ) : (
                            <div className="space-y-6">
                                <div className="relative group">
                                    <label className="text-xs font-bold text-emerald-400 uppercase tracking-widest flex items-center gap-2 mb-4">
                                        <Sparkles className="w-3 h-3" /> Refined Result
                                    </label>
                                    <div className="grid grid-cols-1 gap-4">
                                        {refineResultUrls.map((url, idx) => (
                                            <div key={idx} className="aspect-[3/4] bg-black/40 rounded-xl overflow-hidden border-2 border-emerald-500/30 shadow-2xl shadow-emerald-500/10 relative group">
                                                <img
                                                    src={url}
                                                    alt={`Refined Result ${idx + 1}`}
                                                    className="w-full h-full object-cover cursor-zoom-in"
                                                    onClick={() => onPreview(url)}
                                                />
                                                <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity bg-black/60 rounded-lg p-1">
                                                    <button
                                                        onClick={() => setRefineTarget({ url: url, index: -1 })}
                                                        className="p-1 hover:bg-white/20 rounded"
                                                        title="Edit this result"
                                                    >
                                                        <Edit2 className="w-4 h-4 text-white" />
                                                    </button>
                                                    <button
                                                        onClick={() => onI2VEntry(url)}
                                                        className="p-1 hover:bg-white/20 rounded"
                                                        title="Animate this result"
                                                    >
                                                        <VideoIcon className="w-4 h-4 text-white" />
                                                    </button>
                                                    <button
                                                        onClick={() => onDownload(url, `willow_refined_${idx}_${Date.now()}.png`)}
                                                        className="p-1 hover:bg-white/20 rounded"
                                                        title="Download"
                                                    >
                                                        <Download className="w-4 h-4 text-white" />
                                                    </button>
                                                    <button
                                                        onClick={() => onSaveToAssets(url, 'image', `Refined Variation ${idx + 1}`)}
                                                        className="p-1 hover:bg-emerald-500/40 rounded"
                                                        title="Save to Assets"
                                                    >
                                                        <Save className="w-4 h-4 text-white" />
                                                    </button>
                                                </div>
                                                {refineResultUrls.length > 1 && (
                                                    <div className="absolute bottom-2 left-2 flex gap-1">
                                                        <button
                                                            onClick={() => onApproveRefinement('replace', url)}
                                                            className="px-2 py-1 bg-emerald-600 text-[8px] font-bold text-black rounded uppercase"
                                                        >
                                                            Replace
                                                        </button>
                                                        <button
                                                            onClick={() => onApproveRefinement('add', url)}
                                                            className="px-2 py-1 bg-white/20 text-[8px] font-bold text-white rounded uppercase"
                                                        >
                                                            Add
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                    </div>

                                    <div className="grid grid-cols-2 gap-3">
                                        {refineTarget.index !== -1 && (
                                            <button
                                                onClick={() => onApproveRefinement('replace')}
                                                className="flex-1 py-4 bg-emerald-600 hover:bg-emerald-500 text-black rounded-xl font-bold text-xs uppercase tracking-widest transition-all shadow-lg shadow-emerald-900/40 active-scale"
                                            >
                                                Replace Original
                                            </button>
                                        )}
                                        <button
                                            onClick={() => onApproveRefinement('add')}
                                            className={`flex-1 py-4 text-white border border-white/20 rounded-xl font-bold text-xs uppercase tracking-widest transition-all active-scale ${refineTarget.index === -1
                                                ? 'col-span-2 bg-emerald-600 hover:bg-emerald-500 text-black border-0 shadow-lg shadow-emerald-900/40'
                                                : 'bg-white/10 hover:bg-white/20'
                                                }`}
                                        >
                                            {refineTarget.index === -1 ? 'Add to Gallery' : 'Add as New Variation'}
                                        </button>
                                    </div>

                                    <button
                                        onClick={() => setRefineResultUrls([])}
                                        className="w-full py-3 text-white/40 hover:text-white transition-colors text-[10px] uppercase font-bold tracking-[0.2em] flex items-center justify-center gap-2"
                                    >
                                        <RefreshCw className="w-3 h-3" /> Try again / Discard All Results
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div >
        </div >
    );
}

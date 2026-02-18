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
    refineResultUrl: string | null;
    setRefineResultUrl: (val: string | null) => void;
    isRefining: boolean;
    onRefineSubmit: () => void;
    onApproveRefinement: (action: 'replace' | 'add') => void;

    onExit: () => void;
    onI2VEntry: (url: string) => void;
    presetsDropdown: React.ReactNode;
    onSaveToAssets: (url: string, type: 'image' | 'video', name?: string) => void;
    onPreview: (url: string) => void;
    onDownload: (url: string, prefix?: string) => void;

    // New Props
    enhancePromptMode?: "standard" | "fast";
    setEnhancePromptMode?: (val: "standard" | "fast") => void;
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
    refineResultUrl,
    setRefineResultUrl,
    isRefining,
    onRefineSubmit,
    onApproveRefinement,

    onExit,
    onI2VEntry,
    presetsDropdown,
    onSaveToAssets,
    onPreview,
    onDownload,
    enhancePromptMode,
    setEnhancePromptMode
}: EditTabProps) {
    const [isDragging, setIsDragging] = useState(false);

    // Helper to process a file to a data URL
    const processFile = (file: File) => {
        if (!file.type.startsWith('image/')) return;
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
                            <img
                                src={refineTarget.url}
                                alt="Target"
                                className="w-full h-full object-cover cursor-zoom-in"
                                onClick={() => onPreview(refineTarget.url)}
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-end justify-between p-4 pointer-events-none">
                                <label className="pointer-events-auto cursor-pointer bg-white/10 hover:bg-white/20 backdrop-blur-md px-3 py-1.5 rounded-lg border border-white/10 flex items-center gap-2 transition-all shadow-lg">
                                    <ImagePlus className="w-4 h-4 text-emerald-400" />
                                    <span className="text-[10px] text-white font-bold uppercase tracking-widest">Replace</span>
                                    <input
                                        type="file"
                                        accept="image/*"
                                        className="hidden"
                                        onChange={handleRefineImageUpload}
                                    />
                                </label>
                                <p className="text-[10px] text-white/60 uppercase tracking-widest font-bold">Source Reference</p>
                            </div>
                        </div>

                        {/* Refine Actions: Reference Images */}
                        {(selectedModel.includes('seedream') || selectedModel.includes('grok')) && (
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
                                                className="absolute -top-1 -right-1 p-0.5 bg-red-500 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
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
                    </div>
                    <div className="p-4 md:p-8 space-y-6 md:space-y-8 flex flex-col justify-center bg-black/20">
                        {!refineResultUrl ? (
                            <>
                                <div className="space-y-4">
                                    <div className="flex justify-between items-center mb-2">
                                        <label className="text-xs font-bold text-white/60 uppercase tracking-widest flex items-center gap-2">
                                            <Sparkles className="w-3 h-3 text-emerald-400" /> Improvement Instructions
                                        </label>
                                        {presetsDropdown}
                                    </div>
                                    <textarea
                                        value={refinePrompt}
                                        onChange={(e) => setRefinePrompt(e.target.value)}
                                        placeholder="E.g., change eye color to deep blue, add more freckles, make the background a sunset forest, adjust lighting to be warmer..."
                                        className="w-full h-[250px] p-6 bg-black/40 border border-white/10 rounded-xl text-base md:text-sm text-white focus:border-emerald-500/50 focus:outline-none transition-all resize-none font-serif leading-relaxed"
                                    />
                                    {/* Model Selector & Parameters Bar */}
                                    <div className="flex items-center justify-between gap-4 p-2">
                                        <div className="flex items-center gap-4 flex-1">
                                            <div className="space-y-1 flex-1">
                                                <label className="text-[10px] font-bold text-white/40 uppercase tracking-widest block">AI Model</label>
                                                <select
                                                    value={selectedModel}
                                                    onChange={(e) => setSelectedModel(e.target.value)}
                                                    className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-base md:text-xs text-white focus:border-emerald-500/50 outline-none"
                                                >
                                                    <option value="nano-banana-pro-preview">Nano Banana (Refine)</option>
                                                    <option value="fal-ai/bytedance/seedream/v4/edit">Seedream 4.0 Edit</option>
                                                    <option value="fal-ai/bytedance/seedream/v4.5/edit">Seedream 4.5 Edit</option>
                                                    <option value="xai/grok-imagine-image/edit">Grok Edit</option>
                                                </select>
                                            </div>

                                            {/* Dynamic Parameters for Models */}
                                            {selectedModel.includes('seedream') && (
                                                <div className="space-y-1 w-32 animate-in fade-in slide-in-from-left-2 duration-300">
                                                    <label className="text-[10px] font-bold text-white/40 uppercase tracking-widest block">Size</label>
                                                    <select
                                                        value={refineImageSize}
                                                        onChange={(e) => setRefineImageSize(e.target.value)}
                                                        className="w-full bg-black/40 border border-white/10 rounded-lg px-2 py-2 text-base md:text-xs text-white focus:border-emerald-500/50 outline-none cursor-pointer hover:bg-white/5 transition-colors"
                                                    >
                                                        {selectedModel.includes('v4.5') ? (
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

                                            {selectedModel.includes('grok') && (
                                                <div className="space-y-1 w-24 animate-in fade-in slide-in-from-left-2 duration-300">
                                                    <label className="text-[10px] font-bold text-white/40 uppercase tracking-widest block">Images</label>
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

                                            {(selectedModel.includes('seedream') || selectedModel.includes('grok')) && (
                                                <>
                                                    {selectedModel.includes('seedream') && (
                                                        <div className="space-y-1 w-32 animate-in fade-in slide-in-from-left-2 duration-300">
                                                            <label className="text-[10px] font-bold text-white/40 uppercase tracking-widest block">Enhance</label>
                                                            <select
                                                                value={enhancePromptMode || "standard"}
                                                                onChange={(e) => setEnhancePromptMode && setEnhancePromptMode(e.target.value as "standard" | "fast")}
                                                                className="w-full bg-black/40 border border-white/10 rounded-lg px-2 py-2 text-xs text-white focus:border-emerald-500/50 outline-none cursor-pointer hover:bg-white/5 transition-colors"
                                                            >
                                                                <option value="standard">Standard</option>
                                                                <option value="fast">Fast</option>
                                                            </select>
                                                        </div>
                                                    )}
                                                </>
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
                                    <div className="py-12">
                                        <LoadingIndicator
                                            title="Refining Variation"
                                            modelName={selectedModel}
                                            type="edit"
                                        />
                                    </div>
                                ) : (
                                    <button
                                        onClick={onRefineSubmit}
                                        disabled={isRefining || !refinePrompt}
                                        className={`w-full py-4 rounded-xl text-sm font-bold flex items-center justify-center gap-3 transition-all active-scale ${isRefining || !refinePrompt ? 'bg-white/5 text-white/20' : 'bg-emerald-600 hover:bg-emerald-500 text-black shadow-lg shadow-emerald-500/20 hover:-translate-y-0.5'
                                            }`}
                                    >
                                        <Sparkles className="w-5 h-5" />
                                        GENERATE REFINED VERSION
                                    </button>
                                )}
                            </>
                        ) : (
                            <div className="space-y-6">
                                <div className="relative group">
                                    <label className="text-xs font-bold text-emerald-400 uppercase tracking-widest flex items-center gap-2 mb-4">
                                        <Sparkles className="w-3 h-3" /> Refined Result
                                    </label>
                                    <div className="aspect-[3/4] bg-black/40 rounded-xl overflow-hidden border-2 border-emerald-500/30 shadow-2xl shadow-emerald-500/10 relative group">
                                        <img
                                            src={refineResultUrl}
                                            alt="Refined Result"
                                            className="w-full h-full object-cover cursor-zoom-in"
                                            onClick={() => onPreview(refineResultUrl!)}
                                        />
                                        <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity bg-black/60 rounded-lg p-1">
                                            <button
                                                onClick={() => setRefineTarget({ url: refineResultUrl!, index: -1 })}
                                                className="p-1 hover:bg-white/20 rounded"
                                                title="Edit this result"
                                            >
                                                <Edit2 className="w-4 h-4 text-white" />
                                            </button>
                                            <button
                                                onClick={() => onI2VEntry(refineResultUrl!)}
                                                className="p-1 hover:bg-white/20 rounded"
                                                title="Animate this result"
                                            >
                                                <VideoIcon className="w-4 h-4 text-white" />
                                            </button>
                                            <button
                                                onClick={() => onDownload(refineResultUrl!, `willow_refined_${Date.now()}.png`)}
                                                className="p-1 hover:bg-white/20 rounded"
                                                title="Download"
                                            >
                                                <Download className="w-4 h-4 text-white" />
                                            </button>
                                            <button
                                                onClick={() => onSaveToAssets(refineResultUrl!, 'image', 'Refined Variation')}
                                                className="p-1 hover:bg-emerald-500/40 rounded"
                                                title="Save to Assets"
                                            >
                                                <Save className="w-4 h-4 text-white" />
                                            </button>
                                        </div>
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
                                        onClick={() => setRefineResultUrl(null)}
                                        className="w-full py-3 text-white/40 hover:text-white transition-colors text-[10px] uppercase font-bold tracking-[0.2em] flex items-center justify-center gap-2"
                                    >
                                        <RefreshCw className="w-3 h-3" /> Try again / Discard Result
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

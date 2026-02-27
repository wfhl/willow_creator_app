import React, { type ChangeEvent } from 'react';
import { Layers, Edit2, ImagePlus, ChevronDown, Video as VideoIcon, Sparkles, Copy, Loader2, Dices, Wand2, Download, Save, X, Upload, RotateCw, Trash2 } from 'lucide-react';
import LoadingIndicator from '../loading-indicator';
import type { DBAsset as Asset } from '../../lib/dbService';
import { dbService } from '../../lib/dbService';
import { generateUUID } from '../../lib/uuid';
import { AssetUploader } from '../asset-uploader';

import { type Theme, type CaptionStyle } from './SettingsTab';

interface CreateTabProps {
    themes: Theme[];
    captionStyles: CaptionStyle[];
    selectedThemeId: string;
    setSelectedThemeId: (id: string) => void;
    customTheme: string;
    setCustomTheme: (val: string) => void;
    specificVisuals: string;
    setSpecificVisuals: (val: string) => void;
    specificOutfit: string;
    setSpecificOutfit: (val: string) => void;
    assets: Asset[];
    onAssetsAdd: (files: FileList) => void;
    onAssetRemove: (id: string) => void;
    onAssetToggle: (id: string) => void;
    handleInputImageUpload: (e: ChangeEvent<HTMLInputElement>, target: 'visuals' | 'outfit') => void;
    generatedPrompt: string;
    setGeneratedPrompt: (val: string) => void;
    selectedModel: string;
    setSelectedModel: (val: string) => void;
    mediaType: 'image' | 'video';
    setMediaType: (val: 'image' | 'video') => void;
    aspectRatio: string;
    setAspectRatio: (val: string) => void;
    createImageSize: string;
    setCreateImageSize: (val: string) => void;
    createNumImages: number;
    setCreateNumImages: (val: number) => void;
    videoResolution: string;
    setVideoResolution: (val: string) => void;
    videoDuration: string;
    setVideoDuration: (val: string) => void;
    topic: string;
    setTopic: (val: string) => void;
    captionType: string;
    setCaptionType: (val: string) => void;
    generatedCaption: string;
    setGeneratedCaption: (val: string) => void;
    isDreaming: boolean;
    handleDreamConcept: () => void;
    handleGenerateContent: () => void;
    isGeneratingMedia: boolean;
    isGeneratingCaption: boolean;
    handleGenerateRandomPost: () => void;
    generatedMediaUrls: string[];
    handleRefineEntry: (url: string, index: number) => void;
    handleI2VEntry: (url: string, index: number) => void;
    handleCopy: (text: string) => void;
    handleSavePost: () => void;
    isSaving: boolean;
    showSaveForm: boolean;
    setShowSaveForm: (val: boolean) => void;
    presetsDropdown: React.ReactNode;
    apiKeys: { gemini: string; fal: string };
    onGenerateCaptionOnly: () => void;
    onSaveToAssets: (url: string, type: 'image' | 'video', name?: string) => void;
    onPreview: (url: string) => void;
    onDownload: (url: string, prefix?: string) => void;
    onUploadToPost: (files: FileList | null) => void;
    onRemoveMedia: (index: number) => void;
    onRerollMedia: (index: number) => void;
    loras: Array<{ path: string; scale: number }>;
    setLoras: (loras: Array<{ path: string; scale: number }>) => void;
    onLoRAUpload: (file: File) => Promise<void>;
    promptRef?: React.RefObject<HTMLTextAreaElement | null>;
}

export function CreateTab({
    themes,
    captionStyles,
    selectedThemeId,
    setSelectedThemeId,
    customTheme,
    setCustomTheme,
    specificVisuals,
    setSpecificVisuals,
    specificOutfit,
    setSpecificOutfit,
    assets,
    onAssetsAdd,
    onAssetRemove,
    onAssetToggle,
    handleInputImageUpload,
    generatedPrompt,
    setGeneratedPrompt,
    selectedModel,
    setSelectedModel,
    mediaType,
    setMediaType,
    aspectRatio,
    setAspectRatio,
    createImageSize,
    setCreateImageSize,
    createNumImages,
    setCreateNumImages,
    videoResolution,
    setVideoResolution,
    videoDuration,
    setVideoDuration,
    topic,
    setTopic,
    captionType,
    setCaptionType,
    generatedCaption,
    setGeneratedCaption,
    isDreaming,
    handleDreamConcept,
    handleGenerateContent,
    isGeneratingMedia,
    isGeneratingCaption,
    handleGenerateRandomPost,
    generatedMediaUrls,
    handleRefineEntry,
    handleI2VEntry,
    handleCopy,
    handleSavePost,
    isSaving,
    showSaveForm,
    setShowSaveForm,
    presetsDropdown,
    onGenerateCaptionOnly,
    onSaveToAssets,
    onPreview,
    onDownload,
    onUploadToPost,
    onRemoveMedia,
    onRerollMedia,
    loras,
    setLoras,
    onLoRAUpload,
    promptRef,
    apiKeys
}: CreateTabProps) {

    const currentTheme = selectedThemeId === 'CUSTOM'
        ? { name: 'Custom', defaultOutfit: 'custom', defaultVisuals: 'custom' }
        : themes.find(t => t.id === selectedThemeId) || themes[0];

    const handleSaveLoRA = async (url: string) => {
        if (!url) return;
        try {
            const folders = await dbService.getAllFolders();
            let folder = folders.find(f => f.name === 'WAN LoRA');
            if (!folder) {
                folder = {
                    id: generateUUID(),
                    name: 'WAN LoRA',
                    parentId: null,
                    timestamp: Date.now(),
                    icon: 'layers'
                };
                await dbService.saveFolder(folder);
            }

            const name = url.split('/').pop()?.split('?')[0] || 'Unknown LoRA';
            await dbService.saveAsset({
                id: generateUUID(),
                name: name,
                type: 'lora',
                base64: url,
                folderId: folder.id,
                timestamp: Date.now()
            });
            alert(`Saved "${name}" to WAN LoRA folder!`);
        } catch (e) {
            console.error("Failed to save LoRA", e);
            alert("Failed to save LoRA to library.");
        }
    };

    return (
        <div className="max-w-[1600px] mx-auto w-full p-4 md:p-8 pb-32">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-8 h-full">

                {/* === LEFT COLUMN: VISUAL DESIGN (MEDIA) === */}
                <div className="space-y-6 flex flex-col h-full">
                    <div className="bg-white/5 border border-white/10 rounded-xl p-6 flex-1 flex flex-col gap-6">
                        <div className="flex items-center justify-between pb-4 border-b border-white/5">
                            <div className="flex items-center gap-2">
                                <Layers className="w-5 h-5 text-emerald-500" />
                                <h2 className="text-sm font-bold text-white uppercase tracking-widest">Visual Design</h2>
                            </div>
                            <button
                                onClick={handleDreamConcept}
                                disabled={isDreaming || !apiKeys.gemini}
                                className="text-[10px] flex items-center gap-1 text-emerald-400 hover:text-emerald-300 disabled:opacity-50 transition-colors"
                            >
                                {isDreaming ? <Loader2 className="w-3 h-3 animate-spin" /> : <Wand2 className="w-3 h-3" />}
                                {isDreaming ? 'Dreaming...' : 'Dream Concept'}
                            </button>
                        </div>

                        {/* Theme Selection */}
                        <div className="space-y-2">
                            <label className="text-xs text-white/50 uppercase tracking-wider font-bold">Theme</label>

                            {/* Mobile Dropdown */}
                            <div className="md:hidden">
                                <div className="relative">
                                    <select
                                        value={selectedThemeId}
                                        onChange={(e) => {
                                            const val = e.target.value;
                                            setSelectedThemeId(val);
                                            if (val === 'CUSTOM') setSpecificVisuals("");
                                        }}
                                        className="w-full bg-black/40 border border-white/10 rounded-lg p-3 text-base text-white appearance-none focus:outline-none focus:border-emerald-500/50"
                                    >
                                        {themes.map(theme => (
                                            <option key={theme.id} value={theme.id}>{theme.name}</option>
                                        ))}
                                        <option value="CUSTOM">Custom / Manual</option>
                                    </select>
                                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40 pointer-events-none" />
                                </div>
                            </div>

                            {/* Desktop Grid */}
                            <div className="hidden md:grid grid-cols-2 gap-2">
                                {themes.map(theme => (
                                    <button
                                        key={theme.id}
                                        onClick={() => setSelectedThemeId(theme.id)}
                                        className={`text-left p-3 rounded-lg border transition-all duration-200 relative overflow-hidden ${selectedThemeId === theme.id
                                            ? 'bg-white/10 border-white/40 shadow-lg shadow-emerald-900/10'
                                            : 'bg-black/20 border-white/5 hover:bg-white/5 hover:border-white/20'
                                            }`}
                                    >
                                        <div className="flex justify-between items-center z-10 relative">
                                            <span className={`text-sm font-medium ${selectedThemeId === theme.id ? 'text-white' : 'text-white/70'}`}>
                                                {theme.name}
                                            </span>
                                            {selectedThemeId === theme.id && <div className="h-1.5 w-1.5 rounded-full bg-emerald-500" />}
                                        </div>
                                    </button>
                                ))}
                                {/* Manual / Custom Theme Button */}
                                <button
                                    onClick={() => {
                                        setSelectedThemeId('CUSTOM');
                                        setSpecificVisuals(""); // Clear previous
                                    }}
                                    className={`text-left p-3 rounded-lg border transition-all duration-200 relative overflow-hidden ${selectedThemeId === 'CUSTOM'
                                        ? 'bg-gradient-to-r from-blue-900/40 to-indigo-900/40 border-blue-400/50 shadow-lg'
                                        : 'bg-black/20 border-white/5 hover:bg-white/5 hover:border-white/20'
                                        }`}
                                >
                                    <div className="flex justify-between items-center z-10 relative">
                                        <span className={`text-sm font-medium ${selectedThemeId === 'CUSTOM' ? 'text-blue-200' : 'text-white/70'}`}>
                                            Custom / Manual
                                        </span>
                                        {selectedThemeId === 'CUSTOM' && <Edit2 className="w-3 h-3 text-blue-400" />}
                                    </div>
                                </button>
                            </div>
                        </div>

                        {/* Custom Theme Input - Only shown when CUSTOM is selected */}
                        {selectedThemeId === 'CUSTOM' && (
                            <div className="bg-blue-900/10 border border-blue-500/30 rounded-lg p-4">
                                <label className="text-xs text-blue-200 block mb-2 font-medium">Custom Theme or Quote</label>
                                <textarea
                                    value={customTheme}
                                    onChange={(e) => setCustomTheme(e.target.value)}
                                    placeholder="Enter a theme, quote, or concept to base the entire post on... (e.g., 'Embrace the journey, not just the destination' or 'Ethereal forest goddess')"
                                    className="w-full bg-blue-900/20 border border-blue-500/30 rounded-lg p-3 text-base md:text-sm text-white focus:outline-none focus:border-blue-400/70 placeholder:text-blue-200/30 transition-colors min-h-[100px]"
                                />
                                <p className="text-xs text-blue-300/60 mt-2">This will be used as the foundation for generating the concept, visuals, and caption.</p>
                            </div>
                        )}

                        {/* Visual Details Inputs */}
                        <div className="space-y-4">
                            <div>
                                <div className="flex justify-between items-center mb-1">
                                    <label className="text-xs text-white/50 block">Specific Action / Setting</label>
                                    <label className="cursor-pointer text-xs flex items-center gap-1 text-emerald-500 hover:text-emerald-400">
                                        <ImagePlus className="w-3 h-3" />
                                        <span className="sr-only">Upload Reference</span>
                                        <input type="file" className="hidden" accept="image/*" onChange={(e) => handleInputImageUpload(e, 'visuals')} />
                                    </label>
                                </div>
                                {selectedThemeId === 'CUSTOM' ? (
                                    <textarea
                                        value={specificVisuals}
                                        onChange={(e) => setSpecificVisuals(e.target.value)}
                                        placeholder="Enter a quote to base the image on, or a custom visual description..."
                                        className="w-full bg-black/40 border border-white/10 rounded-lg p-3 text-base md:text-sm text-white focus:outline-none focus:border-emerald-500/50 placeholder:text-white/20 transition-colors min-h-[80px]"
                                    />
                                ) : (
                                    <input
                                        type="text"
                                        value={specificVisuals}
                                        onChange={(e) => setSpecificVisuals(e.target.value)}
                                        placeholder={(currentTheme as any).defaultSetting || (currentTheme as any).defaultAction || (currentTheme as any).defaultVisuals}
                                        className="w-full bg-black/40 border border-white/10 rounded-lg p-3 text-base md:text-sm text-white focus:outline-none focus:border-emerald-500/50 placeholder:text-white/20 transition-colors"
                                    />
                                )}
                            </div>
                            <div>
                                <div className="flex justify-between items-center mb-1">
                                    <label className="text-xs text-white/50 block">Outfit Details {selectedThemeId === 'CUSTOM' && "(Optional)"}</label>
                                    <label className="cursor-pointer text-xs flex items-center gap-1 text-emerald-500 hover:text-emerald-400">
                                        <ImagePlus className="w-3 h-3" />
                                        <span className="sr-only">Upload Reference</span>
                                        <input type="file" className="hidden" accept="image/*" onChange={(e) => handleInputImageUpload(e, 'outfit')} />
                                    </label>
                                </div>
                                <input
                                    type="text"
                                    value={specificOutfit}
                                    onChange={(e) => setSpecificOutfit(e.target.value)}
                                    placeholder={currentTheme.defaultOutfit}
                                    className="w-full bg-black/40 border border-white/10 rounded-lg p-3 text-base md:text-sm text-white focus:outline-none focus:border-emerald-500/50 placeholder:text-white/20 transition-colors"
                                />
                            </div>
                        </div>

                        {/* Assets */}
                        <div className="border-t border-white/5 pt-4">
                            <AssetUploader
                                assets={assets}
                                onAdd={onAssetsAdd}
                                onRemove={onAssetRemove}
                                onToggleSelection={onAssetToggle}
                                label="Face References (Select Multiple)"
                            />
                        </div>

                        {/* LoRA Controls */}
                        {selectedModel.includes('lora') && (
                            <div className="border-t border-white/5 pt-4 space-y-3">
                                <div className="flex justify-between items-center">
                                    <label className="text-xs text-white/50 font-bold uppercase tracking-widest flex items-center gap-2">
                                        <Layers className="w-3 h-3 text-emerald-500" />
                                        LoRA Weights
                                    </label>
                                    <div className="flex gap-3">
                                        <label className="cursor-pointer text-[10px] text-emerald-400 hover:text-emerald-300 transition-colors flex items-center gap-1">
                                            <Upload className="w-3 h-3" /> Upload LoRA
                                            <input
                                                type="file"
                                                className="hidden"
                                                accept=".safetensors"
                                                onChange={(e) => {
                                                    const file = e.target.files?.[0];
                                                    if (file) onLoRAUpload(file);
                                                }}
                                            />
                                        </label>
                                        <button
                                            onClick={() => setLoras([...loras, { path: '', scale: 1.0 }])}
                                            className="text-[10px] text-emerald-400 hover:text-emerald-300 transition-colors flex items-center gap-1"
                                        >
                                            <Sparkles className="w-3 h-3" /> Add LoRA (via Link)
                                        </button>
                                    </div>
                                </div>

                                {loras.length === 0 ? (
                                    <div className="text-[10px] text-white/20 italic p-3 border border-dashed border-white/10 rounded-lg text-center">
                                        No LoRAs added. Use LoRAs to style your video.
                                    </div>
                                ) : (
                                    <div className="space-y-3">
                                        {loras.map((lora, idx) => (
                                            <div key={idx} className="bg-black/20 border border-white/5 rounded-lg p-3 space-y-2">
                                                <div className="flex justify-between items-center gap-2">
                                                    <input
                                                        type="text"
                                                        placeholder="Safetensors URL or Path"
                                                        value={lora.path}
                                                        onChange={(e) => {
                                                            const newLoras = [...loras];
                                                            newLoras[idx].path = e.target.value;
                                                            setLoras(newLoras);
                                                        }}
                                                        className="flex-1 bg-black/40 border border-white/10 rounded px-2 py-1.5 text-[10px] text-white focus:border-emerald-500/50 outline-none"
                                                    />
                                                    <button
                                                        onClick={() => handleSaveLoRA(lora.path)}
                                                        className="p-1.5 hover:bg-emerald-500/20 text-emerald-400 rounded transition-colors"
                                                        title="Save to WAN LoRA Library"
                                                        disabled={!lora.path}
                                                    >
                                                        <Save className="w-3 h-3" />
                                                    </button>
                                                    <button
                                                        onClick={() => {
                                                            const newLoras = loras.filter((_, i) => i !== idx);
                                                            setLoras(newLoras);
                                                        }}
                                                        className="p-1.5 hover:bg-red-500/20 text-red-400 rounded transition-colors"
                                                    >
                                                        <Trash2 className="w-3 h-3" />
                                                    </button>
                                                </div>
                                                <div className="flex items-center gap-4">
                                                    <div className="flex-1">
                                                        <input
                                                            type="range"
                                                            min="0"
                                                            max="2"
                                                            step="0.05"
                                                            value={lora.scale}
                                                            onChange={(e) => {
                                                                const newLoras = [...loras];
                                                                newLoras[idx].scale = parseFloat(e.target.value);
                                                                setLoras(newLoras);
                                                            }}
                                                            className="w-full h-1 bg-white/10 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                                                        />
                                                    </div>
                                                    <span className="text-[10px] text-white/40 w-8 font-mono">
                                                        {(lora.scale).toFixed(2)}
                                                    </span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Generated Prompt Preview */}
                        <div className="mt-4 pt-4 border-t border-white/5 space-y-3">
                            <div className="flex justify-between items-center">
                                <label className="text-xs text-white/50 font-bold uppercase tracking-widest">
                                    Final Prompt
                                </label>
                                <div className="flex gap-2 items-center">
                                    {presetsDropdown}

                                    <button
                                        onClick={() => handleCopy(generatedPrompt)}
                                        className="text-[10px] flex items-center gap-1 text-white/40 hover:text-white transition-colors"
                                    >
                                        <Copy className="w-3 h-3" /> Copy
                                    </button>
                                </div>
                            </div>
                            <textarea
                                ref={promptRef}
                                value={generatedPrompt}
                                onChange={(e) => setGeneratedPrompt(e.target.value)}
                                className="w-full p-3 bg-black/60 border border-white/10 rounded-lg text-base md:text-[10px] text-white/60 font-mono leading-relaxed focus:outline-none focus:border-emerald-500/50 transition-colors min-h-[100px]"
                            />

                            {/* Settings Bar */}
                            <div className="flex flex-col gap-3 bg-black/40 p-3 rounded-lg border border-white/10">
                                {/* Row 1: Model Selection */}
                                <div className="w-full">
                                    <label className="text-[10px] text-white/40 uppercase tracking-widest block mb-1">AI Model Engine</label>
                                    <div className="relative">
                                        <select
                                            value={selectedModel}
                                            onChange={(e) => setSelectedModel(e.target.value)}
                                            className="w-full bg-white/5 border border-white/10 rounded px-2 py-1.5 text-xs text-white appearance-none focus:outline-none focus:border-emerald-500/50"
                                        >
                                            {mediaType === 'image' ? (
                                                <>
                                                    <option value="nano-banana-pro-preview">Nano Banana Pro (Image)</option>
                                                    <option value="gemini-3.1-flash-image-preview">Nano Banana 2</option>
                                                    <option value="gemini-3-pro-image-preview">Gemini 3 Pro (Multimodal Image)</option>
                                                    <option value="gemini-3-flash-preview">Gemini 3 Flash</option>
                                                    <option value="fal-ai/bytedance/seedream/v5/lite/text-to-image">Seedream 5.1 Lite (t2i)</option>
                                                    <option value="fal-ai/bytedance/seedream/v4.5/text-to-image">Seedream v4.5 (High Fidelity)</option>
                                                    <option value="fal-ai/bytedance/seedream/v4/text-to-image">Seedream v4.0 (Standard)</option>
                                                    <option value="xai/grok-imagine-image/text-to-image">Grok 2 (xAI)</option>
                                                </>
                                            ) : (
                                                <>
                                                    <option value="veo-3.1-generate-preview">Veo 3.1 (Video)</option>
                                                    <option value="fal-ai/wan/v2.2-a14b/image-to-video/lora">Wan 2.2 w/ LoRA (FAL)</option>
                                                    <option value="veo-2.0-generate-001">Veo 2.0 (Video Legacy)</option>
                                                </>
                                            )}
                                        </select>
                                        <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-white/40 pointer-events-none" />
                                    </div>
                                </div>

                                {/* Row 2: Parameters */}
                                <div className="flex items-center gap-3">
                                    <div className="flex-1">
                                        <label className="text-[10px] text-white/40 uppercase tracking-widest block mb-1">Aspect Ratio</label>
                                        <div className="relative">
                                            <select
                                                value={selectedModel.includes('v4.5') ? createImageSize : aspectRatio}
                                                onChange={(e) => {
                                                    if (selectedModel.includes('v4.5') || selectedModel.includes('v5') || selectedModel.includes('seedream/v4')) {
                                                        setCreateImageSize(e.target.value);
                                                    } else {
                                                        setAspectRatio(e.target.value);
                                                    }
                                                }}
                                                className="w-full bg-white/5 border border-white/10 rounded px-2 py-1.5 text-base md:text-xs text-white appearance-none focus:outline-none focus:border-emerald-500/50"
                                            >
                                                {selectedModel.includes('v4.5') || selectedModel.includes('v5') ? (
                                                    <>
                                                        <option value="auto_4K">Auto 4K</option>
                                                        <option value="square_hd">Square 2K</option>
                                                        <option value="portrait_4_3">Portrait 4:3</option>
                                                        <option value="landscape_16_9">Landscape 16:9</option>
                                                    </>
                                                ) : selectedModel.includes('seedream/v4') ? (
                                                    <>
                                                        <option value="square_hd">Square 2K</option>
                                                        <option value="square">Square 1K</option>
                                                        <option value="portrait_hd">Portrait 2K</option>
                                                        <option value="landscape_hd">Landscape 2K</option>
                                                    </>
                                                ) : selectedModel.includes('xai') || selectedModel.includes('nano') || selectedModel.includes('gemini-3.1-flash-image') ? (
                                                    <>
                                                        <option value="1:1">1:1 Square</option>
                                                        <option value="4:3">4:3 Landscape(ish)</option>
                                                        <option value="16:9">16:9 Landscape</option>
                                                    </>
                                                ) : (
                                                    <>
                                                        <option value="1:1">1:1</option>
                                                        <option value="3:4">3:4</option>
                                                        <option value="4:3">4:3</option>
                                                        <option value="9:16">9:16</option>
                                                        <option value="16:9">16:9</option>
                                                    </>
                                                )}
                                            </select>
                                            <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-white/40 pointer-events-none" />
                                        </div>
                                    </div>

                                    {/* Video Duration - Only for Video */}
                                    {mediaType === 'video' && (
                                        <div className="w-24">
                                            <label className="text-[10px] text-white/40 uppercase tracking-widest block mb-1">Duration</label>
                                            <div className="relative">
                                                <select
                                                    value={videoDuration}
                                                    onChange={(e) => setVideoDuration(e.target.value)}
                                                    className="w-full bg-white/5 border border-white/10 rounded px-2 py-1.5 text-base md:text-xs text-white appearance-none focus:outline-none focus:border-emerald-500/50"
                                                >
                                                    {selectedModel.includes('veo-3') ? (
                                                        videoResolution === '1080p' ? (
                                                            <option value="8s">8s</option>
                                                        ) : (
                                                            <>
                                                                <option value="4s">4s</option>
                                                                <option value="6s">6s</option>
                                                                <option value="8s">8s</option>
                                                            </>
                                                        )
                                                    ) : (
                                                        <>
                                                            <option value="5s">5s</option>
                                                            <option value="8s">8s</option>
                                                        </>
                                                    )}
                                                </select>
                                                <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-white/40 pointer-events-none" />
                                            </div>
                                        </div>
                                    )}

                                    {/* Video Resolution - Only for Video */}
                                    {mediaType === 'video' && (
                                        <div className="w-24">
                                            <label className="text-[10px] text-white/40 uppercase tracking-widest block mb-1">Quality</label>
                                            <div className="relative">
                                                <select
                                                    value={videoResolution}
                                                    onChange={(e) => setVideoResolution(e.target.value)}
                                                    className="w-full bg-white/5 border border-white/10 rounded px-2 py-1.5 text-base md:text-xs text-white appearance-none focus:outline-none focus:border-emerald-500/50"
                                                >
                                                    {selectedModel.includes('veo-3') ? (
                                                        <>
                                                            <option value="1080p">1080p</option>
                                                            <option value="720p">720p</option>
                                                        </>
                                                    ) : (
                                                        <>
                                                            <option value="1080p">1080p</option>
                                                            <option value="720p">720p</option>
                                                        </>
                                                    )}
                                                </select>
                                                <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-white/40 pointer-events-none" />
                                            </div>
                                        </div>
                                    )}

                                    {/* Count Selector - Only for Image */}
                                    {mediaType === 'image' && (
                                        <div className="w-24">
                                            <label className="text-[10px] text-white/40 uppercase tracking-widest block mb-1">Batch Count</label>
                                            <div className="relative">
                                                <select
                                                    value={createNumImages}
                                                    onChange={(e) => setCreateNumImages(Number(e.target.value))}
                                                    className="w-full bg-white/5 border border-white/10 rounded px-2 py-1.5 text-base md:text-xs text-white appearance-none focus:outline-none focus:border-emerald-500/50"
                                                >
                                                    <option value={1}>1 Image</option>
                                                    <option value={2}>2 Images</option>
                                                    <option value={3}>3 Images</option>
                                                    <option value={4}>4 Images</option>
                                                    {selectedModel.includes('seedream') && (
                                                        <>
                                                            <option value={5}>5 Images</option>
                                                            <option value={6}>6 Images</option>
                                                        </>
                                                    )}
                                                </select>
                                                <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-white/40 pointer-events-none" />
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* === RIGHT COLUMN: CONTENT & PREVIEW === */}
                <div className="flex flex-col h-full space-y-6">
                    {/* Media Preview Area */}
                    <div className="bg-white/5 border border-white/10 rounded-xl p-6 relative min-h-[400px] flex flex-col items-center justify-center overflow-hidden">
                        {mediaType === 'image' && isGeneratingMedia ? (
                            <div className="flex flex-col items-center gap-4 animate-in fade-in duration-700">
                                <LoadingIndicator
                                    title="Generating Media"
                                    modelName={selectedModel}
                                    type={mediaType}
                                />
                                <div className="grid grid-cols-2 gap-2 w-48 opacity-50">
                                    <div className="aspect-[3/4] bg-white/5 rounded animate-pulse delay-75"></div>
                                    <div className="aspect-[3/4] bg-white/5 rounded animate-pulse delay-150"></div>
                                    <div className="aspect-[3/4] bg-white/5 rounded animate-pulse delay-300"></div>
                                    <div className="aspect-[3/4] bg-white/5 rounded animate-pulse delay-500"></div>
                                </div>
                            </div>
                        ) : generatedMediaUrls.length > 0 ? (
                            <div className="w-full h-full grid grid-cols-2 gap-4">
                                <label className="aspect-[3/4] bg-white/5 border border-white/10 border-dashed rounded-lg flex flex-col items-center justify-center hover:bg-white/10 transition-colors cursor-pointer group hover:border-emerald-500/50">
                                    <Upload className="w-8 h-8 text-white/20 group-hover:text-emerald-400 transition-colors mb-2" />
                                    <span className="text-[10px] text-white/40 font-bold uppercase tracking-widest group-hover:text-emerald-400 transition-colors">Add Media</span>
                                    <input
                                        type="file"
                                        multiple
                                        accept="image/*,video/*"
                                        className="hidden"
                                        onChange={(e) => onUploadToPost(e.target.files)}
                                    />
                                </label>
                                {generatedMediaUrls.map((url, idx) => {
                                    const isVideo = url.startsWith('data:video') || (() => {
                                        const clean = url.split('?')[0].split('#')[0].toLowerCase();
                                        return ['.mp4', '.mov', '.webm', '.m4v', '.ogv'].some(ext => clean.endsWith(ext));
                                    })();
                                    return (
                                        <div key={idx} className="relative group aspect-[3/4]">
                                            {isVideo ? (
                                                <video
                                                    src={url}
                                                    controls
                                                    className="w-full h-full object-cover rounded-lg shadow-2xl cursor-pointer"
                                                    onClick={(e) => {
                                                        e.preventDefault();
                                                        onPreview(url);
                                                    }}
                                                />
                                            ) : (
                                                <img
                                                    src={url}
                                                    alt={`Generated ${idx}`}
                                                    className="w-full h-full object-cover rounded-lg shadow-2xl cursor-pointer"
                                                    onClick={() => onPreview(url)}
                                                />
                                            )}
                                            <div className="absolute top-2 right-2 flex gap-1 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity bg-black/60 rounded-lg p-1">
                                                <button
                                                    onClick={() => handleRefineEntry(url, idx)}
                                                    className="p-1 hover:bg-white/20 rounded"
                                                    title="Refine this image"
                                                >
                                                    <Edit2 className="w-4 h-4 text-white" />
                                                </button>
                                                {!isVideo && (
                                                    <button
                                                        onClick={() => handleI2VEntry(url, idx)}
                                                        className="p-1 hover:bg-white/20 rounded"
                                                        title="Animate this image"
                                                    >
                                                        <VideoIcon className="w-4 h-4 text-white" />
                                                    </button>
                                                )}
                                                <button
                                                    onClick={() => onDownload(url, `simple_generated_${idx}`)}
                                                    className="p-1 hover:bg-white/20 rounded"
                                                    title="Download"
                                                >
                                                    <Download className="w-4 h-4 text-white" />
                                                </button>
                                                <button
                                                    onClick={() => onSaveToAssets(url, isVideo ? 'video' : 'image', `Generated ${isVideo ? 'Video' : 'Image'}`)}
                                                    className="p-1 hover:bg-emerald-500/40 rounded"
                                                    title="Save to Assets"
                                                >
                                                    <Save className="w-4 h-4 text-white" />
                                                </button>
                                                <div className="w-px h-4 bg-white/20 mx-1"></div>
                                                <button
                                                    onClick={() => onRerollMedia(idx)}
                                                    className="p-1 hover:bg-white/20 rounded"
                                                    title="Reroll (Regenerate)"
                                                >
                                                    <RotateCw className="w-4 h-4 text-white" />
                                                </button>
                                                <button
                                                    onClick={() => onRemoveMedia(idx)}
                                                    className="p-1 hover:bg-red-500/40 rounded text-red-400 hover:text-white"
                                                    title="Remove"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        ) : (
                            <label className="flex flex-col items-center justify-center w-full h-full cursor-pointer group opacity-60 hover:opacity-100 transition-opacity">
                                <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center mb-4 group-hover:bg-emerald-500/10 transition-colors border border-white/5 group-hover:border-emerald-500/30">
                                    <Upload className="w-8 h-8 text-white/40 group-hover:text-emerald-400 transition-colors" />
                                </div>
                                <p className="text-sm font-medium tracking-widest uppercase text-white/60 group-hover:text-emerald-400 transition-colors">
                                    Upload Media
                                </p>
                                <p className="text-xs text-white/30 mt-2">
                                    or generate using AI
                                </p>
                                <input
                                    type="file"
                                    multiple
                                    accept="image/*,video/*"
                                    className="hidden"
                                    onChange={(e) => onUploadToPost(e.target.files)}
                                />
                            </label>
                        )}
                    </div>

                    {/* Text Content Area */}
                    <div className="bg-white/5 border border-white/10 rounded-xl p-6 flex-1 flex flex-col">
                        <div className="flex justify-between items-center mb-4 pb-4 border-b border-white/5">
                            <h2 className="text-sm font-bold text-white uppercase tracking-widest">Caption Strategy</h2>
                            <button
                                onClick={onGenerateCaptionOnly}
                                disabled={isGeneratingCaption}
                                className="text-[10px] flex items-center gap-1 text-emerald-400 hover:text-emerald-300 disabled:opacity-50 transition-colors"
                            >
                                {isGeneratingCaption ? <Loader2 className="w-3 h-3 animate-spin" /> : <Wand2 className="w-3 h-3" />}
                                {isGeneratingCaption ? 'Writing...' : 'Generate Caption'}
                            </button>
                        </div>

                        <div className="space-y-4 flex-1">
                            <div className="flex gap-4">
                                <div className="flex-1 space-y-1">
                                    <label className="text-xs text-white/50 uppercase tracking-wider font-bold">Concept / Topic</label>
                                    <input
                                        type="text"
                                        value={topic}
                                        onChange={(e) => setTopic(e.target.value)}
                                        placeholder="e.g. Morning thoughts, The future of AI..."
                                        className="w-full bg-black/40 border border-white/10 rounded-lg p-3 text-base md:text-sm text-white focus:outline-none focus:border-emerald-500/50 transition-colors"
                                    />
                                </div>
                                <div className="w-1/3 space-y-1">
                                    <label className="text-xs text-white/50 uppercase tracking-wider font-bold">Style</label>
                                    <div className="relative">
                                        <select
                                            value={captionType}
                                            onChange={(e) => setCaptionType(e.target.value)}
                                            className="w-full bg-black/40 border border-white/10 rounded-lg p-3 text-base md:text-sm text-white appearance-none focus:outline-none focus:border-emerald-500/50 cursor-pointer"
                                        >
                                            {captionStyles.map(t => (
                                                <option key={t.id} value={t.id}>{t.label}</option>
                                            ))}
                                        </select>
                                        <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                                            <ChevronDown className="w-4 h-4 text-white/40" />
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div className="relative flex-1">
                                <textarea
                                    value={generatedCaption}
                                    onChange={(e) => setGeneratedCaption(e.target.value)}
                                    placeholder="Generated caption will appear here..."
                                    className="w-full h-full min-h-[150px] bg-black/40 border border-white/10 rounded-lg p-4 text-base md:text-sm text-white/90 font-serif leading-relaxed resize-none focus:outline-none focus:border-emerald-500/50 transition-colors"
                                />
                                {isGeneratingCaption && (
                                    <div className="absolute inset-0 bg-black/60 rounded-lg flex items-center justify-center">
                                        <div className="flex items-center gap-2 text-emerald-400 text-sm font-bold uppercase tracking-widest">
                                            <Loader2 className="w-4 h-4 animate-spin" /> Writing...
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* === ACTION BAR === */}
            <div className="fixed bottom-0 left-0 right-0 p-4 md:p-6 pb-[calc(1rem+4rem+env(safe-area-inset-bottom))] md:pb-6 bg-gradient-to-t from-black via-black/95 to-transparent z-50 pointer-events-none flex justify-center">
                <div className="bg-[#0a0a0a] border border-white/10 rounded-2xl shadow-2xl p-1.5 md:p-2 flex flex-wrap md:flex-nowrap items-center justify-center gap-2 md:gap-4 pointer-events-auto backdrop-blur-xl ring-1 ring-white/5 max-w-full overflow-hidden">

                    {/* Left: Mode Toggle */}
                    <div className="flex bg-white/5 rounded-xl p-1 border border-white/5 shrink-0">
                        <button
                            onClick={() => setMediaType('image')}
                            className={`px-3 md:px-4 py-1.5 md:py-2 rounded-lg text-[9px] md:text-[10px] font-bold uppercase tracking-widest transition-all active-scale ${mediaType === 'image'
                                ? 'bg-emerald-500 text-black shadow-lg shadow-emerald-500/20'
                                : 'text-white/40 hover:text-white hover:bg-white/5'
                                }`}
                        >
                            Image
                        </button>
                        <button
                            onClick={() => setMediaType('video')}
                            className={`px-3 md:px-4 py-1.5 md:py-2 rounded-lg text-[9px] md:text-[10px] font-bold uppercase tracking-widest transition-all active-scale ${mediaType === 'video'
                                ? 'bg-emerald-500 text-black shadow-lg shadow-emerald-500/20'
                                : 'text-white/40 hover:text-white hover:bg-white/5'
                                }`}
                        >
                            Video
                        </button>
                    </div>

                    {/* Middle: Save/Library Actions */}
                    <div className="flex items-center gap-2">
                        <button
                            onClick={handleGenerateRandomPost}
                            className="p-3 bg-white/5 hover:bg-emerald-500/10 hover:text-emerald-400 border border-white/10 hover:border-emerald-500/30 rounded-xl transition-all group active-scale"
                            title="Surprise Me (Random Concept)"
                        >
                            <Dices className="w-5 h-5 opacity-60 group-hover:opacity-100 transition-opacity" />
                        </button>

                        <button
                            onClick={() => setShowSaveForm(true)}
                            // disabled={!generatedMediaUrls.length}
                            className={`p-3 bg-white/5 hover:bg-white/10 disabled:opacity-30 border border-white/10 rounded-xl transition-all active-scale ${showSaveForm ? 'text-emerald-400 border-emerald-500/50 bg-emerald-500/10' : ''}`}
                            title="Save to Post Library"
                        >
                            <Save className="w-5 h-5 opacity-60" />
                        </button>
                    </div>

                    {/* Right: Generate Button */}
                    <div className="flex flex-col items-center gap-2">
                        <button
                            onClick={handleGenerateContent}
                            disabled={
                                isGeneratingCaption ||
                                (selectedModel.match(/grok|seedream|seedance|wan|flux/i) ? !apiKeys.fal : !apiKeys.gemini)
                            }
                            className={`
                                    h-10 md:h-12 px-4 md:px-8 rounded-xl font-bold uppercase tracking-widest text-[10px] md:text-sm
                                    bg-gradient-to-r from-emerald-600 to-emerald-500 
                                    hover:from-emerald-500 hover:to-emerald-400 
                                    text-black shadow-lg shadow-emerald-500/20 
                                    hover:shadow-emerald-500/40 hover:-translate-y-0.5
                                    disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0
                                    transition-all flex items-center gap-2 shrink-0
                                `}
                        >
                            {(isGeneratingMedia || isGeneratingCaption) ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4 text-purple-300" />}
                            {(isGeneratingMedia || isGeneratingCaption) ? "Working..." : "Generate"}
                        </button>

                        {/* API Key Warning */}
                        {(() => {
                            const needsFal = !!selectedModel.match(/grok|seedream|seedance|wan|flux/i);
                            const missingFal = needsFal && !apiKeys.fal;
                            const missingGemini = !needsFal && !apiKeys.gemini;

                            if (missingFal) {
                                return (
                                    <p className="text-[9px] font-bold text-red-400 uppercase tracking-tighter animate-pulse">
                                        Fal.ai Key Required
                                    </p>
                                );
                            }
                            if (missingGemini) {
                                return (
                                    <p className="text-[9px] font-bold text-red-400 uppercase tracking-tighter animate-pulse">
                                        Gemini Key Required
                                    </p>
                                );
                            }
                            return null;
                        })()}
                    </div>
                </div>
            </div>

            {/* Mobile Save Post Bottom Sheet */}
            {
                showSaveForm && (
                    <div className="md:hidden fixed inset-0 z-[150] bg-black/60 backdrop-blur-sm animate-in fade-in duration-300" onClick={() => setShowSaveForm(false)}>
                        <div
                            className="bottom-sheet p-6 space-y-6"
                            onClick={e => e.stopPropagation()}
                        >
                            <div className="w-12 h-1.5 bg-white/10 rounded-full mx-auto mb-2" />
                            <div className="flex justify-between items-center">
                                <h3 className="text-xl font-bold font-serif text-white">Save to Library</h3>
                                <button onClick={() => setShowSaveForm(false)} className="p-2 bg-white/5 rounded-full text-white/40">
                                    <X className="w-5 h-5" />
                                </button>
                            </div>

                            <div className="space-y-4">
                                <div className="space-y-2">
                                    <label className="text-[10px] text-white/40 uppercase tracking-widest font-bold">Post Topic / Title</label>
                                    <input
                                        type="text"
                                        value={topic}
                                        onChange={(e) => setTopic(e.target.value)}
                                        placeholder="Enter a title for this post..."
                                        className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 px-6 text-base text-white focus:border-emerald-500 transition-all shadow-inner"
                                        autoFocus
                                    />
                                </div>

                                <button
                                    onClick={() => {
                                        handleSavePost();
                                        setShowSaveForm(false);
                                    }}
                                    disabled={isSaving}
                                    className="w-full py-4 bg-emerald-500 hover:bg-emerald-400 active:scale-95 text-black font-bold text-sm uppercase tracking-widest rounded-2xl transition-all flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20"
                                >
                                    {isSaving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Sparkles className="w-5 h-5" />}
                                    {isSaving ? 'SAVING...' : 'CONFIRM SAVE'}
                                </button>
                            </div>
                        </div>
                    </div>
                )
            }

            {/* Desktop Save Row (Optional inline fallback) */}
            {
                showSaveForm && (
                    <div className="hidden md:flex fixed bottom-24 left-1/2 -translate-x-1/2 bg-[#0a0a0a] border border-white/10 rounded-2xl shadow-2xl p-4 items-center gap-4 animate-in slide-in-from-bottom-4 duration-300 z-50">
                        <input
                            type="text"
                            value={topic}
                            onChange={(e) => setTopic(e.target.value)}
                            placeholder="Post topic..."
                            className="bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-sm text-white focus:border-emerald-500 outline-none w-64"
                            autoFocus
                        />
                        <button
                            onClick={handleSavePost}
                            disabled={isSaving}
                            className="px-6 py-2 bg-emerald-500 hover:bg-emerald-400 text-black font-bold text-xs uppercase tracking-widest rounded-lg transition-all flex items-center gap-2"
                        >
                            {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                            Save Post
                        </button>
                        <button onClick={() => setShowSaveForm(false)} className="text-white/40 hover:text-white">
                            <X className="w-4 h-4" />
                        </button>
                    </div>
                )
            }
        </div >
    );
}

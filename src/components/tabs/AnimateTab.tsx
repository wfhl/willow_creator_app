
import React, { useEffect, useState, type ChangeEvent } from 'react';
import { Video as VideoIcon, ImagePlus, X, RefreshCw, Play, Save, Download, Layers, Sparkles, Upload, Trash2 } from 'lucide-react';
import LoadingIndicator from '../loading-indicator';
import { ImageWithLoader } from '../image-with-loader';
import { dbService } from '../../lib/dbService';
import { generateUUID } from '../../lib/uuid';

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

    onApproveI2V: () => void;
    onDiscardI2V: () => void;
    presetsDropdown: React.ReactNode;
    onSaveToAssets: (url: string, type: 'image' | 'video', name?: string) => void;
    onPreview: (url: string) => void;
    onDownload: (url: string, prefix?: string) => void;

    // New Props for Seedance
    withAudio?: boolean;
    setWithAudio?: (val: boolean) => void;
    cameraFixed?: boolean;
    setCameraFixed?: (val: boolean) => void;

    loras: Array<{ path: string; scale: number }>;
    setLoras: (loras: Array<{ path: string; scale: number }>) => void;
    onLoRAUpload: (file: File) => Promise<void>;
    promptRef?: React.RefObject<HTMLTextAreaElement | null>;
    apiKeys: { gemini: string; fal: string };
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
    onPreview,
    onDownload,
    withAudio,
    setWithAudio,
    cameraFixed,
    setCameraFixed,
    loras,
    setLoras,
    onLoRAUpload,
    promptRef,
    apiKeys
}: AnimateTabProps) {
    const [isDragging, setIsDragging] = useState(false);

    // Ensure we are on a video model when mounting or if model is invalid
    useEffect(() => {
        const isVideoModel = selectedModel.includes('video') || selectedModel.includes('veo') || selectedModel.includes('seedance');
        if (!isVideoModel) {
            // Default to Grok Video
            setSelectedModel('xai/grok-imagine-video/image-to-video');
            setVideoDuration('5s');
            setVideoResolution('720p');
        } else {
            // Validate constraints for current video model
            if (selectedModel.includes('grok')) {
                if (!['5s', '6s', '9s', '10s', '15s'].includes(videoDuration)) setVideoDuration('6s');
                if (videoResolution !== '720p') setVideoResolution('720p');
            } else if (selectedModel.includes('veo-3')) {
                if (videoResolution === '1080p' && videoDuration !== '8s') setVideoDuration('8s');
            } else if (selectedModel.includes('seedance')) {
                // Seedance supports 4-12s, allow standard fallback
            } else if (selectedModel.includes('wan')) {
                // Wan 2.2: 5s, 10s. Wan 2.5: 5, 10. Wan 2.6: 5, 10, 15.
                if (selectedModel.includes('v2.2')) {
                    if (!['5s', '10s'].includes(videoDuration)) setVideoDuration('5s');
                    if (videoResolution !== '720p' && videoResolution !== '480p') setVideoResolution('720p');
                } else {
                    if (!['5s', '10s', '15s'].includes(videoDuration)) setVideoDuration('5s');
                    if (selectedModel.includes('wan-25') && videoDuration === '15s') setVideoDuration('10s');
                    // Wan 2.6 Flash only supports 720p, 1080p
                    if (selectedModel.includes('flash') && videoResolution === '480p') setVideoResolution('720p');
                }
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
        <div className="max-w-[1200px] mx-auto w-full p-4 md:p-8 pb-32">
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
                    <div className="p-4 md:p-8 border-b lg:border-b-0 lg:border-r border-white/5">
                        <div className="aspect-[3/4] bg-black/40 rounded-xl overflow-hidden border border-white/10 shadow-inner group relative">
                            <ImageWithLoader
                                src={i2vTarget.url}
                                alt="Target"
                                className="w-full h-full object-cover cursor-zoom-in"
                                onClick={() => onPreview(i2vTarget.url)}
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity flex flex-col items-end justify-between p-4 pointer-events-none">
                                <label className="pointer-events-auto cursor-pointer bg-white/10 hover:bg-white/20 backdrop-blur-md px-3 py-1.5 rounded-lg border border-white/10 flex items-center gap-2 transition-all shadow-lg">
                                    <ImagePlus className="w-4 h-4 text-emerald-400" />
                                    <span className="text-[10px] text-white font-bold uppercase tracking-widest">Replace</span>
                                    <input
                                        type="file"
                                        accept="image/*"
                                        className="hidden"
                                        onChange={handleI2VImageUpload}
                                    />
                                </label>
                                <p className="text-[10px] text-white/60 uppercase tracking-widest font-bold">Source Reference</p>
                            </div>
                        </div>
                    </div>
                    <div className="p-4 md:p-8 space-y-6 md:space-y-8 flex flex-col justify-center bg-black/20">
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
                                        ref={promptRef}
                                        value={i2vPrompt}
                                        onChange={(e) => setI2VPrompt(e.target.value)}
                                        placeholder="Describe the motion... (e.g., camera pans slowly right, hair blowing in wind, blinking eyes)"
                                        className="w-full h-[150px] p-6 bg-black/40 border border-white/10 rounded-xl text-base md:text-sm text-white focus:border-emerald-500/50 focus:outline-none transition-all resize-none font-serif leading-relaxed"
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
                                                    } else if (newModel.includes('seedance')) {
                                                        setVideoDuration('5s');
                                                        setVideoResolution('720p'); // default
                                                        setWithAudio?.(true);
                                                    } else if (newModel.includes('wan')) {
                                                        setVideoDuration('5s');
                                                        setVideoResolution('1080p');
                                                    } else {
                                                        setVideoDuration('6s');
                                                        setVideoResolution('720p');
                                                    }
                                                }}
                                                className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-base md:text-xs text-white focus:border-emerald-500/50 outline-none"
                                            >
                                                <option value="xai/grok-imagine-video/image-to-video">Grok 2 Video (Beta)</option>
                                                <option value="fal-ai/bytedance/seedance/v1.5/pro/image-to-video">Seedance 1.5 Pro</option>
                                                <option value="fal-ai/wan-25-preview/image-to-video">Wan 2.5 I2V Preview</option>
                                                <option value="wan/v2.6/image-to-video/flash">Wan 2.6 Flash I2V</option>
                                                <option value="fal-ai/wan/v2.2-a14b/image-to-video/lora">Wan 2.2 I2V (LoRA Support)</option>
                                                <option value="veo-3.1-generate-preview">Veo 3.1 (Google)</option>
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
                                                className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-base md:text-xs text-white focus:border-emerald-500/50 outline-none"
                                            >
                                                {selectedModel.includes('grok') ? (
                                                    <option value="720p">720p (Standard)</option>
                                                ) : selectedModel.includes('seedance') ? (
                                                    <>
                                                        <option value="1080p">1080p (Full HD)</option>
                                                        <option value="720p">720p (HD)</option>
                                                        <option value="480p">480p (SD)</option>
                                                    </>
                                                ) : selectedModel.includes('wan') ? (
                                                    <>
                                                        <option value="1080p">1080p (Full HD)</option>
                                                        {selectedModel.includes('wan-25') && <option value="480p">480p (SD)</option>}
                                                        <option value="720p">720p (HD)</option>
                                                    </>
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
                                                className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-base md:text-xs text-white focus:border-emerald-500/50 outline-none"
                                            >
                                                {selectedModel.includes('grok') ? (
                                                    <>
                                                        <option value="5s">5 Seconds</option>
                                                        <option value="6s">6 Seconds</option>
                                                        <option value="9s">9 Seconds</option>
                                                        <option value="10s">10 Seconds</option>
                                                        <option value="15s">15 Seconds</option>
                                                    </>
                                                ) : selectedModel.includes('seedance') ? (
                                                    <>
                                                        {Array.from({ length: 9 }, (_, i) => i + 4).map(s => (
                                                            <option key={s} value={`${s}s`}>{s} Seconds</option>
                                                        ))}
                                                    </>
                                                ) : selectedModel.includes('wan') ? (
                                                    <>
                                                        <option value="5s">5 Seconds</option>
                                                        <option value="10s">10 Seconds</option>
                                                        {selectedModel.includes('2.6') && <option value="15s">15 Seconds</option>}
                                                        {selectedModel.includes('v2.2') && <option value="10s">10 Seconds (Max)</option>}
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
                                                className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-base md:text-xs text-white focus:border-emerald-500/50 outline-none"
                                            >
                                                {selectedModel.includes('wan') && selectedModel.includes('v2.2') ? (
                                                    <>
                                                        <option value="auto">Matches Image (Default)</option>
                                                        <option value="16:9">16:9 Landscape</option>
                                                    </>
                                                ) : selectedModel.includes('veo') ? (
                                                    // Veo 3 usually prefers 16:9 for HQ, but we can try others if supported or force 16:9
                                                    <>
                                                        <option value="16:9">16:9 Landscape (Native)</option>
                                                    </>
                                                ) : selectedModel.includes('wan') && (selectedModel.includes('2.5') || selectedModel.includes('2.6')) ? (
                                                    <>
                                                        <option value="16:9">16:9 Landscape</option>
                                                        <option value="9:16">9:16 Portrait</option>
                                                        <option value="1:1">1:1 Square</option>
                                                        <option value="4:3">4:3 TV</option>
                                                        <option value="3:4">3:4 Vertical TV</option>
                                                        <option value="21:9">21:9 Cinema</option>
                                                    </>
                                                ) : (selectedModel.includes('seedance')) ? (
                                                    <>
                                                        <option value="16:9">16:9 Landscape</option>
                                                        <option value="9:16">9:16 Portrait</option>
                                                        <option value="1:1">1:1 Square</option>
                                                        <option value="4:3">4:3 TV</option>
                                                        <option value="3:4">3:4 Portrait</option>
                                                        <option value="21:9">21:9 Cinema</option>
                                                    </>
                                                ) : (
                                                    <>
                                                        <option value="auto">Matches Image</option>
                                                        <option value="16:9">16:9</option>
                                                        <option value="9:16">9:16</option>
                                                    </>
                                                )}
                                            </select>
                                        </div>
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
                                                    <label className="cursor-pointer text-[10px] text-emerald-400 hover:text-emerald-300 transition-colors flex items-center gap-1 font-bold uppercase tracking-wider">
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
                                                        className="text-[10px] text-emerald-400 hover:text-emerald-300 transition-colors flex items-center gap-1 font-bold uppercase tracking-wider"
                                                    >
                                                        <Sparkles className="w-3 h-3" /> Add Link
                                                    </button>
                                                </div>
                                            </div>

                                            {loras.length === 0 ? (
                                                <div className="text-[10px] text-white/20 italic p-3 border border-dashed border-white/10 rounded-lg text-center">
                                                    No LoRAs added. Use LoRAs to style your animation.
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



                                    {/* Advanced Toggles */}
                                    <div className="grid grid-cols-2 gap-4 pt-2 border-t border-white/5 mt-4">
                                        {selectedModel.includes('seedance') && (
                                            <>
                                                <label className="flex items-center gap-3 cursor-pointer group col-span-2 md:col-span-1 p-2 rounded-lg hover:bg-white/5 transition-colors">
                                                    <div className="relative flex items-center">
                                                        <input
                                                            type="checkbox"
                                                            checked={withAudio}
                                                            onChange={(e) => setWithAudio?.(e.target.checked)}
                                                            className="w-4 h-4 rounded border-white/20 bg-black/40 text-emerald-500 focus:ring-emerald-500/50 focus:ring-offset-0"
                                                        />
                                                    </div>
                                                    <span className="text-xs text-white/60 group-hover:text-white transition-colors select-none">Generate Audio</span>
                                                </label>
                                                <label className="flex items-center gap-3 cursor-pointer group col-span-2 md:col-span-1 p-2 rounded-lg hover:bg-white/5 transition-colors">
                                                    <div className="relative flex items-center">
                                                        <input
                                                            type="checkbox"
                                                            checked={cameraFixed}
                                                            onChange={(e) => setCameraFixed?.(e.target.checked)}
                                                            className="w-4 h-4 rounded border-white/20 bg-black/40 text-emerald-500 focus:ring-emerald-500/50 focus:ring-offset-0"
                                                        />
                                                    </div>
                                                    <span className="text-xs text-white/60 group-hover:text-white transition-colors select-none">Fix Camera</span>
                                                </label>
                                            </>
                                        )}
                                    </div>
                                </div>

                                <div className="space-y-6">
                                    {isGeneratingI2V && (
                                        <div className="flex flex-col items-center justify-center p-6 bg-emerald-500/5 border border-emerald-500/10 rounded-2xl animate-in fade-in zoom-in duration-300">
                                            <LoadingIndicator
                                                title="Animating Video"
                                                modelName={selectedModel}
                                                type="video"
                                            />
                                        </div>
                                    )}

                                    <div className="flex flex-col items-center gap-2">
                                        <button
                                            onClick={onGenerateI2V}
                                            disabled={!i2vPrompt || (selectedModel.toLowerCase().match(/grok|seedance|wan/i) ? !apiKeys.fal : !apiKeys.gemini)}
                                            className={`w-full py-4 rounded-xl text-sm font-bold flex items-center justify-center gap-3 transition-all active-scale ${!i2vPrompt || (selectedModel.toLowerCase().match(/grok|seedance|wan/i) ? !apiKeys.fal : !apiKeys.gemini) ? 'bg-white/5 text-white/20' : 'bg-emerald-600 hover:bg-emerald-500 text-black shadow-lg shadow-emerald-500/20 hover:-translate-y-0.5'
                                                }`}
                                        >
                                            <VideoIcon className={`w-5 h-5 ${isGeneratingI2V ? 'animate-pulse' : ''}`} />
                                            {isGeneratingI2V ? "ANIMATE ANOTHER VERSION" : "GENERATE VIDEO"}
                                        </button>

                                        {/* API Key Warning */}
                                        {(() => {
                                            const needsFal = !!selectedModel.toLowerCase().match(/grok|seedance|wan/i);
                                            const missingFal = needsFal && !apiKeys.fal;
                                            const missingGemini = !needsFal && !apiKeys.gemini;

                                            if (missingFal) return <p className="text-[9px] font-bold text-red-400 uppercase tracking-tighter animate-pulse">Fal.ai Key Required</p>;
                                            if (missingGemini) return <p className="text-[9px] font-bold text-red-400 uppercase tracking-tighter animate-pulse">Gemini Key Required</p>;
                                            return null;
                                        })()}
                                    </div>
                                </div>
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
                                        <div className="absolute top-2 right-2 flex gap-1 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity bg-black/60 rounded-lg p-1">
                                            <button
                                                onClick={() => onDownload(generatedI2VUrl!, `simple_animated_${Date.now()}.mp4`)}
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
                                        className="w-full py-4 bg-emerald-600 hover:bg-emerald-500 text-black rounded-xl font-bold text-xs uppercase tracking-widest transition-all shadow-lg shadow-emerald-900/40 active-scale"
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

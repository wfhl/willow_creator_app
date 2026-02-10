import React, { useRef, useState } from 'react';
import { Upload, X, Check, Image as ImageIcon } from 'lucide-react';

interface Asset {
    id: string;
    type: string; // 'image' | 'video'
    base64: string;
    selected?: boolean;
}

interface AssetUploaderProps {
    assets: Asset[];
    onAdd: (files: FileList) => void;
    onRemove: (id: string) => void;
    onToggleSelection: (id: string) => void;
    onSelectFromLibrary?: () => void;
    label?: string;
}

export function AssetUploader({ assets, onAdd, onRemove, onToggleSelection, label = "Reference Assets" }: AssetUploaderProps) {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [viewMode, setViewMode] = useState<'upload' | 'library'>('upload');
    const [libraryImages, setLibraryImages] = useState<string[]>([]);
    const [isLoadingLibrary, setIsLoadingLibrary] = useState(false);

    // Fetch library content when switching to library view
    React.useEffect(() => {
        if (viewMode === 'library' && libraryImages.length === 0) {
            setIsLoadingLibrary(true);
            fetch('/gen-reference-manifest.json')
                .then(res => res.json())
                .then((files: string[]) => {
                    // Filter for images only just in case
                    const images = files.filter(f => /\.(jpg|jpeg|png|webp|gif)$/i.test(f));
                    setLibraryImages(images);
                })
                .catch(err => console.error("Failed to load library manifest:", err))
                .finally(() => setIsLoadingLibrary(false));
        }
    }, [viewMode, libraryImages.length]);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            onAdd(e.target.files);
        }
        // Reset input
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    const handleLibrarySelect = async (filename: string) => {
        try {
            const response = await fetch(`/GenReference/${filename}`);
            const blob = await response.blob();
            const file = new File([blob], filename, { type: blob.type });

            // Create a fake FileList
            const dataTransfer = new DataTransfer();
            dataTransfer.items.add(file);

            onAdd(dataTransfer.files);

            // Switch back to upload view to see the selected asset
            setViewMode('upload');
        } catch (error) {
            console.error("Error selecting library asset:", error);
        }
    };

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <label className="text-xs font-medium text-white/70 uppercase tracking-wider">{label}</label>
                    <div className="flex bg-white/5 rounded-lg p-0.5 border border-white/10">
                        <button
                            onClick={() => setViewMode('upload')}
                            className={`px-3 py-1 text-[10px] rounded-md uppercase tracking-wider transition-all ${viewMode === 'upload' ? 'bg-white/10 text-white shadow-sm' : 'text-white/40 hover:text-white'}`}
                        >
                            Selected
                        </button>
                        <button
                            onClick={() => setViewMode('library')}
                            className={`px-3 py-1 text-[10px] rounded-md uppercase tracking-wider transition-all ${viewMode === 'library' ? 'bg-white/10 text-white shadow-sm' : 'text-white/40 hover:text-white'}`}
                        >
                            Library
                        </button>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <button
                        onClick={() => fileInputRef.current?.click()}
                        className="text-xs flex items-center gap-1 text-blue-400 hover:text-blue-300 transition-colors"
                    >
                        <Upload className="h-3 w-3" />
                        Add New
                    </button>
                </div>
                <input
                    type="file"
                    ref={fileInputRef}
                    className="hidden"
                    accept="image/*"
                    multiple
                    onChange={handleFileChange}
                />
            </div>

            {viewMode === 'upload' ? (
                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-2 md:gap-3">
                    {assets.map((asset) => (
                        <div
                            key={asset.id}
                            className={`relative aspect-square rounded-lg overflow-hidden group border transition-all cursor-pointer ${asset.selected ? 'border-emerald-500 ring-2 ring-emerald-500/50' : 'border-white/10 hover:border-white/30'
                                }`}
                            onClick={() => onToggleSelection(asset.id)}
                        >
                            <img src={asset.base64} alt="Asset" className="w-full h-full object-cover" />

                            {/* Selection Indicator */}
                            {asset.selected && (
                                <div className="absolute top-1 right-1 bg-emerald-500 rounded-full p-0.5 shadow-lg">
                                    <Check className="h-3 w-3 text-black" />
                                </div>
                            )}

                            {/* Remove Button (Hover) */}
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onRemove(asset.id);
                                }}
                                className="absolute top-1 left-1 bg-black/60 rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-500/80 backdrop-blur-sm"
                            >
                                <X className="h-3 w-3 text-white" />
                            </button>
                        </div>
                    ))}

                    {/* Empty Placeholder */}
                    {assets.length === 0 && (
                        <div
                            onClick={() => fileInputRef.current?.click()}
                            className="col-span-4 aspect-[3/1] rounded-lg border border-dashed border-white/10 flex flex-col items-center justify-center text-white/30 hover:bg-white/5 hover:border-white/20 transition-all cursor-pointer gap-2"
                        >
                            <div className="h-8 w-8 rounded-full bg-white/5 flex items-center justify-center">
                                <ImageIcon className="h-4 w-4 opacity-50" />
                            </div>
                            <span className="text-xs font-medium">Drop or upload reference</span>
                        </div>
                    )}
                </div>
            ) : (
                <div className="space-y-2">
                    <div className="text-[10px] text-white/40 uppercase tracking-widest font-bold px-1">
                        Willow's Archives
                    </div>
                    {isLoadingLibrary ? (
                        <div className="p-8 text-center text-white/30 text-xs">Loading archives...</div>
                    ) : (
                        <div className="grid grid-cols-4 sm:grid-cols-5 gap-2 max-h-[300px] overflow-y-auto custom-scrollbar p-1">
                            {libraryImages.map((filename, idx) => (
                                <div
                                    key={idx}
                                    onClick={() => handleLibrarySelect(filename)}
                                    className="aspect-[3/4] rounded-md overflow-hidden border border-white/5 cursor-pointer relative group hover:border-white/30 transition-all bg-black/20"
                                >
                                    <img
                                        src={`/GenReference/${filename}`}
                                        alt={filename}
                                        loading="lazy"
                                        className="w-full h-full object-cover opacity-70 group-hover:opacity-100 transition-opacity"
                                    />
                                    <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 bg-black/40 transition-opacity">
                                        <div className="bg-white/10 backdrop-blur-md rounded-full p-1">
                                            <Upload className="w-3 h-3 text-white" />
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

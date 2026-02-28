import React, { useRef, useState } from 'react';
import { Upload, X, Check, Image as ImageIcon, Trash2, Plus } from 'lucide-react';
import { dbService, type DBAsset } from '../lib/dbService';
import { generateUUID } from '../lib/uuid';

interface Asset {
    id: string;
    type: string; // 'image' | 'video'
    base64: string;
    name: string;
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
    const [userLibraryAssets, setUserLibraryAssets] = useState<DBAsset[]>([]);
    const userLibInputRef = useRef<HTMLInputElement>(null);

    // Fetch user library content when switching to library view
    React.useEffect(() => {
        if (viewMode === 'library') {
            fetchUserLibrary();
        }
    }, [viewMode]);

    const fetchUserLibrary = async () => {
        try {
            const assets = await dbService.getAssetsByType('face_reference');
            setUserLibraryAssets(assets);
        } catch (error) {
            console.error("Failed to fetch user library:", error);
        }
    };

    const handleUserLibUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            const files = Array.from(e.target.files);
            for (const file of files) {
                const reader = new FileReader();
                reader.onload = async (ev) => {
                    if (ev.target?.result) {
                        const base64 = ev.target.result as string;
                        const newAsset: DBAsset = {
                            id: generateUUID(),
                            name: file.name,
                            type: 'face_reference',
                            base64: base64,
                            folderId: null,
                            timestamp: Date.now()
                        };
                        try {
                            await dbService.saveAsset(newAsset);
                            fetchUserLibrary(); // Refresh list
                        } catch (err) {
                            console.error("Failed to save asset:", err);
                        }
                    }
                };
                reader.readAsDataURL(file);
            }
        }
        if (userLibInputRef.current) userLibInputRef.current.value = '';
    };

    const handleDeleteUserAsset = async (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        if (confirm("Delete this reference image permanently?")) {
            await dbService.deleteAsset(id);
            fetchUserLibrary();
        }
    };

    const handleUserAssetSelect = (asset: DBAsset) => {
        onToggleSelection(asset.id);
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            onAdd(e.target.files);
            // Switch to selected view to see uploads
            setViewMode('upload');
        }
        // Reset input
        if (fileInputRef.current) fileInputRef.current.value = '';
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
                <div className="max-h-[300px] overflow-y-auto custom-scrollbar pr-2">
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

                                {/* Remove Button (Always on mobile, Hover on desktop) */}
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onRemove(asset.id);
                                    }}
                                    className="absolute top-1 left-1 bg-black/60 rounded-full p-1 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity hover:bg-red-500/80 backdrop-blur-sm shadow-xl z-20"
                                >
                                    <X className="h-3 w-3 text-white" />
                                </button>
                            </div>
                        ))}

                        {/* Empty Placeholder */}
                        {assets.length === 0 && (
                            <div
                                onClick={() => fileInputRef.current?.click()}
                                className="col-span-full aspect-[4/1] rounded-lg border border-dashed border-white/10 flex flex-col items-center justify-center text-white/30 hover:bg-white/5 hover:border-white/20 transition-all cursor-pointer gap-2"
                            >
                                <div className="h-8 w-8 rounded-full bg-white/5 flex items-center justify-center">
                                    <ImageIcon className="h-4 w-4 opacity-50" />
                                </div>
                                <span className="text-xs font-medium">No images selected. Upload or choose from Library.</span>
                            </div>
                        )}
                    </div>
                </div>
            ) : (
                <div className="space-y-4">
                    <div className="flex items-center justify-between px-1">
                        <div className="text-[10px] text-white/40 uppercase tracking-widest font-bold">
                            Reference Library
                        </div>
                        <button
                            onClick={() => userLibInputRef.current?.click()}
                            className="text-[10px] flex items-center gap-1 text-emerald-400 hover:text-emerald-300 transition-colors uppercase tracking-wider font-medium"
                        >
                            <Plus className="h-3 w-3" />
                            Add Ref
                        </button>
                        <input
                            type="file"
                            ref={userLibInputRef}
                            className="hidden"
                            accept="image/*"
                            multiple
                            onChange={handleUserLibUpload}
                        />
                    </div>

                    {/* User Library Grid */}
                    {userLibraryAssets.length > 0 ? (
                        <div className="w-full grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-2 mb-6 p-1">
                            {userLibraryAssets.map((asset) => {
                                const isSelected = assets.some(a => a.id === asset.id || a.base64 === asset.base64);
                                return (
                                    <div
                                        key={asset.id}
                                        onClick={() => handleUserAssetSelect(asset)}
                                        className={`aspect-[3/4] rounded-md overflow-hidden border transition-all cursor-pointer relative group bg-black/20 ${isSelected ? 'border-emerald-500 ring-1 ring-emerald-500/30' : 'border-white/5 hover:border-emerald-500/50'}`}
                                    >
                                        <img
                                            src={asset.base64}
                                            alt={asset.name}
                                            loading="lazy"
                                            className={`w-full h-full object-cover transition-opacity ${isSelected ? 'opacity-100 font-bold' : 'opacity-80 group-hover:opacity-100'}`}
                                        />
                                        {/* Selection Indicator */}
                                        {isSelected && (
                                            <div className="absolute top-1 right-1 bg-emerald-500 rounded-full p-0.5 shadow-lg z-10">
                                                <Check className="h-2.5 w-2.5 text-black font-bold" />
                                            </div>
                                        )}
                                        {/* Delete Button (Always on mobile, Hover on desktop) */}
                                        {!isSelected && (
                                            <button
                                                onClick={(e) => handleDeleteUserAsset(asset.id, e)}
                                                className="absolute top-1 right-1 bg-black/60 hover:bg-red-500 rounded p-1 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-all z-10 shadow-lg"
                                            >
                                                <Trash2 className="w-3.5 h-3.5 text-white" />
                                            </button>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    ) : (
                        <div className="text-xs text-white/20 p-12 text-center border-2 border-dashed border-white/5 rounded-2xl italic mb-4">
                            <ImageIcon className="w-8 h-8 mx-auto mb-3 opacity-10" />
                            No personal references uploaded.
                        </div>
                    )}
                </div>
            )
            }
        </div >
    );
}

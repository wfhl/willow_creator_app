import React, { useState, useEffect, useCallback } from 'react';
import {
    Folder as FolderIcon,
    FileVideo,
    ChevronRight,
    Trash2,
    Search,
    Upload,
    FolderPlus,
    X,
    Grid,
    List,
    Image as ImageIcon
} from 'lucide-react';
import { dbService } from '../../lib/dbService';
import type { DBAsset, DBFolder } from '../../lib/dbService';

interface AssetLibraryTabProps {
    onPreview: (url: string) => void;
}

export function AssetLibraryTab({ onPreview }: AssetLibraryTabProps) {
    const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
    const [path, setPath] = useState<DBFolder[]>([]);
    const [folders, setFolders] = useState<DBFolder[]>([]);
    const [assets, setAssets] = useState<DBAsset[]>([]);
    const [searchQuery, setSearchQuery] = useState("");
    const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
    const [showNewFolderModal, setShowNewFolderModal] = useState(false);
    const [newFolderName, setNewFolderName] = useState("");

    const loadContent = useCallback(async () => {
        try {
            const f = await dbService.getFoldersByParent(currentFolderId);
            const a = await dbService.getAssetsByFolder(currentFolderId);
            setFolders(f.sort((x, y) => x.name.localeCompare(y.name)));
            setAssets(a.sort((x, y) => y.timestamp - x.timestamp));
        } catch (err) {
            console.error("Failed to load library content:", err);
        }
    }, [currentFolderId]);

    useEffect(() => {
        loadContent();
    }, [loadContent]);

    const handleNavigate = async (folder: DBFolder | null) => {
        if (!folder) {
            setCurrentFolderId(null);
            setPath([]);
        } else {
            setCurrentFolderId(folder.id);
            // Build path - this is simplified, in a real app you'd fetch parents
            // For now, let's just update based on clicks
            setPath(prev => {
                const idx = prev.findIndex(p => p.id === folder.id);
                if (idx !== -1) return prev.slice(0, idx + 1);
                return [...prev, folder];
            });
        }
    };

    const handleCreateFolder = async () => {
        if (!newFolderName.trim()) return;
        const newFolder: DBFolder = {
            id: crypto.randomUUID(),
            name: newFolderName.trim(),
            parentId: currentFolderId,
            timestamp: Date.now()
        };
        await dbService.saveFolder(newFolder);
        setNewFolderName("");
        setShowNewFolderModal(false);
        loadContent();
    };

    const handleUploadAssets = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files) return;
        const files = Array.from(e.target.files);

        for (const file of files) {
            const reader = new FileReader();
            reader.onload = async (event) => {
                const base64 = event.target?.result as string;
                const newAsset: DBAsset = {
                    id: crypto.randomUUID(),
                    name: file.name,
                    type: file.type.startsWith('video') ? 'video' : 'image',
                    base64,
                    folderId: currentFolderId,
                    timestamp: Date.now()
                };
                await dbService.saveAsset(newAsset);
                loadContent();
            };
            reader.readAsDataURL(file);
        }
    };

    const handleDeleteAsset = async (id: string) => {
        if (!confirm("Delete this asset?")) return;
        await dbService.deleteAsset(id);
        loadContent();
    };

    const handleDeleteFolder = async (id: string, name: string) => {
        if (!confirm(`Delete folder "${name}"? This will move its contents to orphan state (unreachable until root fix).`)) return;
        await dbService.deleteFolder(id);
        loadContent();
    };

    return (
        <div className="max-w-[1600px] mx-auto w-full p-8 pb-32 flex flex-col h-full bg-[#050505]">
            {/* Header / Toolbar */}
            <div className="flex flex-col gap-6 mb-8">
                <div className="flex justify-between items-center">
                    <div className="flex items-center gap-4">
                        <h2 className="text-2xl font-bold font-serif text-white/90">Asset Library</h2>
                        <div className="h-6 w-px bg-white/10 mx-2" />
                        <div className="flex items-center gap-1 text-sm text-white/40">
                            <button
                                onClick={() => handleNavigate(null)}
                                className="hover:text-emerald-400 transition-colors"
                            >
                                Root
                            </button>
                            {path.map((p, i) => (
                                <React.Fragment key={p.id}>
                                    <ChevronRight className="w-3 h-3" />
                                    <button
                                        onClick={() => handleNavigate(p)}
                                        className={`hover:text-emerald-400 transition-colors ${i === path.length - 1 ? 'text-white/80 font-bold' : ''}`}
                                    >
                                        {p.name}
                                    </button>
                                </React.Fragment>
                            ))}
                        </div>
                    </div>

                    <div className="flex gap-3">
                        <button
                            onClick={() => setShowNewFolderModal(true)}
                            className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-xs font-bold uppercase tracking-widest text-white/80 transition-all hover:border-white/20"
                        >
                            <FolderPlus className="w-4 h-4" />
                            New Folder
                        </button>
                        <label className="flex items-center gap-2 px-4 py-2 bg-emerald-500 hover:bg-emerald-400 border border-emerald-400/50 rounded-lg text-xs font-bold uppercase tracking-widest text-black cursor-pointer transition-all shadow-lg shadow-emerald-500/20">
                            <Upload className="w-4 h-4" />
                            Upload
                            <input type="file" multiple className="hidden" onChange={handleUploadAssets} />
                        </label>
                    </div>
                </div>

                {/* Sub-toolbar: Search & View Modes */}
                <div className="flex justify-between items-center gap-4">
                    <div className="relative flex-1 group">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20 group-focus-within:text-emerald-400 transition-colors" />
                        <input
                            type="text"
                            placeholder="Search assets and folders..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full bg-white/[0.03] border border-white/5 rounded-xl py-3 pl-12 pr-4 text-sm text-white placeholder-white/20 focus:outline-none focus:border-emerald-500/50 focus:bg-white/5 transition-all"
                        />
                    </div>
                    <div className="flex bg-white/5 border border-white/10 rounded-xl p-1 shrink-0">
                        <button
                            onClick={() => setViewMode('grid')}
                            className={`p-2 rounded-lg transition-all ${viewMode === 'grid' ? 'bg-white/10 text-emerald-400' : 'text-white/40 hover:text-white'}`}
                        >
                            <Grid className="w-4 h-4" />
                        </button>
                        <button
                            onClick={() => setViewMode('list')}
                            className={`p-2 rounded-lg transition-all ${viewMode === 'list' ? 'bg-white/10 text-emerald-400' : 'text-white/40 hover:text-white'}`}
                        >
                            <List className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            </div>

            {/* Content Area */}
            <div className="flex-1 overflow-y-auto min-h-0">
                {folders.length === 0 && assets.length === 0 ? (
                    <div className="h-64 flex flex-col items-center justify-center text-white/20 border-2 border-dashed border-white/5 rounded-3xl">
                        <ImageIcon className="w-12 h-12 mb-4 opacity-5" />
                        <p className="font-serif italic">This folder is empty</p>
                        <p className="text-[10px] uppercase font-mono mt-2 tracking-widest">Upload assets or create a folder to begin</p>
                    </div>
                ) : (
                    <div className={viewMode === 'grid'
                        ? "grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-4"
                        : "flex flex-col gap-1"
                    }>
                        {/* Render Folders */}
                        {folders.map(folder => (
                            <div
                                key={folder.id}
                                onClick={() => handleNavigate(folder)}
                                className={viewMode === 'grid'
                                    ? "group relative flex flex-col items-center p-4 bg-white/[0.02] border border-white/5 rounded-2xl hover:bg-white/5 hover:border-emerald-500/30 cursor-pointer transition-all animate-in fade-in slide-in-from-bottom-2"
                                    : "group flex items-center gap-4 p-3 bg-white/[0.02] border-b border-white/5 hover:bg-white/5 cursor-pointer transition-all"
                                }
                            >
                                <FolderIcon className={viewMode === 'grid'
                                    ? "w-12 h-12 mb-3 text-emerald-500/60 group-hover:text-emerald-400 group-hover:scale-110 transition-all duration-300"
                                    : "w-5 h-5 text-emerald-500/60"
                                } strokeWidth={1.5} />

                                <span className={viewMode === 'grid'
                                    ? "text-[11px] font-medium text-white/70 text-center line-clamp-2 w-full px-2 group-hover:text-white"
                                    : "text-sm text-white/70 flex-1 group-hover:text-white"
                                }>
                                    {folder.name}
                                </span>

                                <button
                                    onClick={(e) => { e.stopPropagation(); handleDeleteFolder(folder.id, folder.name); }}
                                    className="absolute top-2 right-2 p-1.5 bg-red-500/0 text-red-500/0 group-hover:bg-red-500/10 group-hover:text-red-500/60 hover:text-red-500 rounded-lg transition-all"
                                >
                                    <Trash2 className="w-3 h-3" />
                                </button>
                            </div>
                        ))}

                        {/* Render Assets */}
                        {assets.map(asset => (
                            <div
                                key={asset.id}
                                className={viewMode === 'grid'
                                    ? "group relative aspect-square bg-white/[0.02] border border-white/5 rounded-2xl overflow-hidden hover:border-emerald-500/30 transition-all animate-in fade-in slide-in-from-bottom-4 duration-500"
                                    : "group flex items-center gap-4 p-2 bg-white/[0.02] border-b border-white/5 hover:bg-white/5 transition-all"
                                }
                            >
                                {viewMode === 'grid' ? (
                                    <>
                                        {asset.type === 'video' ? (
                                            <video
                                                src={asset.base64}
                                                className="w-full h-full object-cover opacity-60 group-hover:opacity-100 transition-opacity cursor-zoom-in"
                                                muted
                                                onClick={() => onPreview(asset.base64)}
                                            />
                                        ) : (
                                            <img
                                                src={asset.base64}
                                                className="w-full h-full object-cover opacity-60 group-hover:opacity-100 transition-opacity cursor-zoom-in"
                                                onClick={() => onPreview(asset.base64)}
                                            />
                                        )}

                                        {/* Overlay controls */}
                                        <div className="absolute inset-x-0 bottom-0 p-2 bg-gradient-to-t from-black/80 to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
                                            <p className="text-[9px] text-white/90 truncate font-mono">{asset.name}</p>
                                        </div>

                                        <div className="absolute top-2 right-2 flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-all translate-x-4 group-hover:translate-x-0">
                                            <button
                                                onClick={() => handleDeleteAsset(asset.id)}
                                                className="p-2 bg-red-500/20 text-red-400 hover:bg-red-500 hover:text-white rounded-xl backdrop-blur-md transition-all shadow-lg"
                                            >
                                                <Trash2 className="w-3.5 h-3.5" />
                                            </button>
                                        </div>

                                        {asset.type === 'video' && (
                                            <div className="absolute top-2 left-2 p-1 bg-black/40 backdrop-blur-md border border-white/10 rounded-md">
                                                <FileVideo className="w-3 h-3 text-white/60" />
                                            </div>
                                        )}
                                    </>
                                ) : (
                                    <>
                                        <div className="w-10 h-10 rounded-lg overflow-hidden bg-black shrink-0 border border-white/5">
                                            {asset.type === 'video' ? (
                                                <video src={asset.base64} className="w-full h-full object-cover" />
                                            ) : (
                                                <img src={asset.base64} className="w-full h-full object-cover" />
                                            )}
                                        </div>
                                        <span className="text-sm text-white/60 flex-1 truncate">{asset.name}</span>
                                        <div className="flex gap-2">
                                            <button
                                                onClick={() => handleDeleteAsset(asset.id)}
                                                className="p-2 text-white/20 hover:text-red-500 rounded-lg transition-colors"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* New Folder Modal */}
            {showNewFolderModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-xl animate-in fade-in duration-300">
                    <div className="w-full max-w-sm bg-[#0a0a0a] border border-white/10 rounded-3xl p-8 shadow-2xl animate-in zoom-in-95 duration-300">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-xl font-bold font-serif text-white/90">New Folder</h2>
                            <button onClick={() => setShowNewFolderModal(false)} className="text-white/40 hover:text-white">
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <input
                            type="text"
                            autoFocus
                            placeholder="Folder name..."
                            value={newFolderName}
                            onChange={(e) => setNewFolderName(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleCreateFolder()}
                            className="w-full bg-white/[0.03] border border-white/10 rounded-2xl py-4 px-6 text-white placeholder-white/20 focus:outline-none focus:border-emerald-500 transition-all mb-8 shadow-inner"
                        />
                        <div className="flex gap-4">
                            <button
                                onClick={() => setShowNewFolderModal(false)}
                                className="flex-1 py-4 text-xs font-bold uppercase tracking-widest text-white/40 hover:text-white transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleCreateFolder}
                                className="flex-1 py-4 bg-emerald-500 hover:bg-emerald-400 text-black text-xs font-bold uppercase tracking-widest rounded-2xl transition-all shadow-lg shadow-emerald-500/20"
                            >
                                Create Folder
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

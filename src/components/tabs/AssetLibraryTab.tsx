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
    Image as ImageIcon,
    Edit2,
    Star,
    Heart,
    Camera,
    Music,
    Briefcase,
    Home,
    History
} from 'lucide-react';
import { dbService } from '../../lib/dbService';
import { generateUUID } from '../../lib/uuid';
import type { DBAsset, DBFolder, DBGenerationHistory } from '../../lib/dbService'; // Updated import

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
    const [editingFolder, setEditingFolder] = useState<DBFolder | null>(null);
    const [newFolderName, setNewFolderName] = useState("");
    const [newFolderColor, setNewFolderColor] = useState("");
    const [newFolderIcon, setNewFolderIcon] = useState("");
    const [draggedAssetId, setDraggedAssetId] = useState<string | null>(null);
    const [dragOverTarget, setDragOverTarget] = useState<string | null>(null);

    // New Tab State
    const [subTab, setSubTab] = useState<'saved' | 'history'>('saved');
    const [history, setHistory] = useState<DBGenerationHistory[]>([]);

    const FOLDER_COLORS = ['#10b981', '#ef4444', '#3b82f6', '#f59e0b', '#8b5cf6', '#ec4899', '#6366f1'];
    const FOLDER_ICONS = ['folder', 'star', 'heart', 'camera', 'video', 'music', 'briefcase', 'home'];

    const loadContent = useCallback(async () => {
        try {
            const f = await dbService.getFoldersByParent(currentFolderId);
            const a = await dbService.getAssetsByFolder(currentFolderId);
            // Filter out face_reference assets to keep them distinct
            const filteredAssets = a.filter(asset => asset.type !== 'face_reference');
            setFolders(f.sort((x, y) => x.name.localeCompare(y.name)));
            setAssets(filteredAssets.sort((x, y) => y.timestamp - x.timestamp));
        } catch (err) {
            console.error("Failed to load library content:", err);
        }
    }, [currentFolderId]);

    const loadHistory = useCallback(async () => {
        try {
            const h = await dbService.getAllGenerationHistory();
            setHistory(h.sort((a, b) => b.timestamp - a.timestamp));
        } catch (err) {
            console.error("Failed to load history:", err);
        }
    }, []);

    useEffect(() => {
        if (subTab === 'history') {
            loadHistory();
        }
    }, [subTab, loadHistory]);

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

        if (editingFolder) {
            const updated = { ...editingFolder, name: newFolderName.trim(), color: newFolderColor, icon: newFolderIcon };
            await dbService.saveFolder(updated);
        } else {
            const newFolder: DBFolder = {
                id: generateUUID(),
                name: newFolderName.trim(),
                parentId: currentFolderId,
                timestamp: Date.now(),
                color: newFolderColor,
                icon: newFolderIcon
            };
            await dbService.saveFolder(newFolder);
        }

        setNewFolderName("");
        setNewFolderColor("");
        setNewFolderIcon("");
        setEditingFolder(null);
        setShowNewFolderModal(false);
        loadContent();
    };

    const openEditFolder = (folder: DBFolder) => {
        setEditingFolder(folder);
        setNewFolderName(folder.name);
        setNewFolderColor(folder.color || "");
        setNewFolderIcon(folder.icon || "");
        setShowNewFolderModal(true);
    };

    // Drag and Drop Handlers
    const handleDragStart = (e: React.DragEvent, assetId: string) => {
        setDraggedAssetId(assetId);
        e.dataTransfer.setData('text/plain', assetId);
        e.dataTransfer.effectAllowed = 'move';
    };



    const handleDragEnterTarget = (e: React.DragEvent, targetId: string) => {
        e.preventDefault();
        e.stopPropagation();
        setDragOverTarget(targetId);
    };

    const handleDragLeaveTarget = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        // Only clear if leaving to outside (simple debounce logic or check relatedTarget could be better, but simple is ok for now)
        setDragOverTarget(null);
    };

    // Improved DragLeave needed to avoid flickering:
    // Actually, simplest is to let onDragEnter of new target override old one.
    // If leaving a target to essentially "nothing", we clear.

    const handleDrop = async (e: React.DragEvent, targetFolderId: string | null) => {
        e.preventDefault();
        e.stopPropagation();
        setDragOverTarget(null);

        const assetId = draggedAssetId;
        if (!assetId) return;

        try {
            // Find the asset first (we need its full object to update)
            const assetToMove = assets.find(a => a.id === assetId);
            if (assetToMove) {
                // If moving to same folder, ignore
                if (assetToMove.folderId === targetFolderId) return;

                const updatedAsset = { ...assetToMove, folderId: targetFolderId };
                // Optimistic update locally
                setAssets(prev => prev.filter(a => a.id !== assetId)); // Remove from current view
                await dbService.saveAsset(updatedAsset);

                // If dropped on root or parent crumb, it disappears from current view (assets) which is correct.
                // If dropped on a folder in list, it also disappears (moved into it).
            }
        } catch (error) {
            console.error("Failed to move asset:", error);
            loadContent(); // Revert on failure
        } finally {
            setDraggedAssetId(null);
        }
    };

    const handleUploadAssets = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files) return;
        const files = Array.from(e.target.files);

        for (const file of files) {
            const reader = new FileReader();
            reader.onload = async (event) => {
                const base64 = event.target?.result as string;
                const newAsset: DBAsset = {
                    id: generateUUID(),
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

    const handleDeleteHistory = async (id: string) => {
        if (!confirm("Delete this history entry? This will not delete the saved assets, only the record of generation.")) return;
        await dbService.deleteGenerationHistory(id);
        loadHistory();
    };

    return (
        <div className="max-w-[1600px] mx-auto w-full p-4 md:p-8 pb-32 flex flex-col h-full bg-[#050505] min-h-0">
            {/* Header / Toolbar */}
            <div className="flex flex-col gap-4 mb-6">
                <div className="flex justify-between items-center gap-4">
                    <div className="flex items-center gap-2 md:gap-4 shrink-0 overflow-hidden">
                        <div className="flex items-center gap-4">
                            <button
                                onClick={() => setSubTab('saved')}
                                className={`text-lg md:text-2xl font-bold font-serif transition-all ${subTab === 'saved' ? 'text-white/90' : 'text-white/40 hover:text-white/70'}`}
                            >
                                Saved Assets
                            </button>
                            <div className="h-6 w-px bg-white/10" />
                            <button
                                onClick={() => setSubTab('history')}
                                className={`text-lg md:text-2xl font-bold font-serif transition-all ${subTab === 'history' ? 'text-white/90' : 'text-white/40 hover:text-white/70'}`}
                            >
                                Generation History
                            </button>
                        </div>

                        {subTab === 'saved' && (
                            <>
                                <div className="h-6 w-px bg-white/10 mx-1 md:mx-2 shrink-0" />
                                <div className="flex items-center gap-1 text-[10px] md:text-sm text-white/40 overflow-x-auto no-scrollbar whitespace-nowrap scroll-smooth py-1">
                                    <button
                                        onClick={() => handleNavigate(null)}
                                        onDragOver={(e) => handleDragEnterTarget(e, 'root')}
                                        onDragLeave={handleDragLeaveTarget}
                                        onDrop={(e) => handleDrop(e, null)}
                                        className={`transition-all rounded px-2 py-0.5 uppercase ${dragOverTarget === 'root' ? 'bg-emerald-500/20 text-emerald-400 scale-105 font-bold shadow-lg shadow-emerald-500/10' : 'hover:text-emerald-400'}`}
                                    >
                                        Root
                                    </button>
                                    {path.map((p, i) => (
                                        <React.Fragment key={p.id}>
                                            <ChevronRight className="w-3 h-3 shrink-0" />
                                            <button
                                                onClick={() => handleNavigate(p)}
                                                onDragOver={(e) => handleDragEnterTarget(e, p.id)}
                                                onDragLeave={handleDragLeaveTarget}
                                                onDrop={(e) => handleDrop(e, p.id)}
                                                className={`transition-all rounded px-2 py-0.5 shrink-0 uppercase ${dragOverTarget === p.id
                                                    ? 'bg-emerald-500/20 text-emerald-400 scale-105 font-bold shadow-lg shadow-emerald-500/10'
                                                    : (i === path.length - 1 ? 'text-white/80 font-bold' : 'hover:text-emerald-400')}`}
                                            >
                                                {p.name}
                                            </button>
                                        </React.Fragment>
                                    ))}
                                </div>
                            </>
                        )}
                    </div>

                    <div className="flex gap-2 shrink-0">
                        {subTab === 'saved' && (
                            <>
                                <button
                                    onClick={() => setShowNewFolderModal(true)}
                                    className="flex items-center gap-2 p-2 md:px-4 md:py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-white/80 transition-all"
                                    title="New Folder"
                                >
                                    <FolderPlus className="w-4 h-4" />
                                    <span className="hidden md:inline text-xs font-bold uppercase tracking-widest">New</span>
                                </button>
                                <label className="flex items-center gap-2 p-2 md:px-4 md:py-2 bg-emerald-500 hover:bg-emerald-400 border border-emerald-400/50 rounded-lg text-black cursor-pointer transition-all shadow-lg shadow-emerald-500/20">
                                    <Upload className="w-4 h-4" />
                                    <span className="hidden md:inline text-xs font-bold uppercase tracking-widest">Upload</span>
                                    <input type="file" multiple className="hidden" onChange={handleUploadAssets} />
                                </label>
                            </>
                        )}
                    </div>
                </div>

                {/* Sub-toolbar: Search & View Modes */}
                <div className="flex items-center gap-3">
                    <div className="relative flex-1 group">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20 group-focus-within:text-emerald-400 transition-colors" />
                        <input
                            type="text"
                            placeholder="Search..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full bg-white/[0.03] border border-white/5 rounded-xl py-2.5 pl-11 pr-4 text-base md:text-sm text-white placeholder-white/20 focus:outline-none focus:border-emerald-500/50 transition-all font-sans"
                        />
                    </div>
                    <div className="flex bg-white/5 border border-white/10 rounded-xl p-1 shrink-0">
                        <button
                            onClick={() => setViewMode('grid')}
                            className={`p-2 rounded-lg transition-all active-scale ${viewMode === 'grid' ? 'bg-white/10 text-emerald-400' : 'text-white/40 hover:text-white'}`}
                        >
                            <Grid className="w-4 h-4" />
                        </button>
                        <button
                            onClick={() => setViewMode('list')}
                            className={`p-2 rounded-lg transition-all active-scale ${viewMode === 'list' ? 'bg-white/10 text-emerald-400' : 'text-white/40 hover:text-white'}`}
                        >
                            <List className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            </div>

            {/* Content Area */}
            {subTab === 'saved' ? (
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
                            {folders.map(folder => {
                                const isCustomColor = folder.color && folder.color.startsWith('#');
                                const iconColorClass = isCustomColor ? '' : 'text-emerald-500/60 group-hover:text-emerald-400';
                                const iconStyle = isCustomColor ? { color: folder.color } : {};

                                const isDragOver = dragOverTarget === folder.id;

                                return (
                                    <div
                                        key={folder.id}
                                        onClick={() => handleNavigate(folder)}
                                        onDragOver={(e) => handleDragEnterTarget(e, folder.id)}
                                        onDragLeave={handleDragLeaveTarget}
                                        onDrop={(e) => handleDrop(e, folder.id)}
                                        className={viewMode === 'grid'
                                            ? `group relative flex flex-col items-center justify-center aspect-square p-4 bg-white/[0.02] border rounded-2xl cursor-pointer transition-all animate-in fade-in slide-in-from-bottom-2 ${isDragOver
                                                ? 'border-emerald-500 bg-emerald-500/20 shadow-[0_0_30px_rgba(16,185,129,0.2)] z-10'
                                                : 'border-white/5 hover:bg-white/5 hover:border-emerald-500/30'}`
                                            : `group flex items-center gap-4 p-3 bg-white/[0.02] border-b cursor-pointer transition-all ${isDragOver
                                                ? 'border-emerald-500 bg-emerald-500/10'
                                                : 'border-white/5 hover:bg-white/5'}`
                                        }
                                    >
                                        <div className="relative">
                                            {(() => {
                                                const IconComponent = {
                                                    'folder': FolderIcon,
                                                    'star': Star,
                                                    'heart': Heart,
                                                    'camera': Camera,
                                                    'video': FileVideo,
                                                    'music': Music,
                                                    'briefcase': Briefcase,
                                                    'home': Home
                                                }[folder.icon || 'folder'] || FolderIcon;

                                                return (
                                                    <IconComponent
                                                        className={viewMode === 'grid'
                                                            ? `w-12 h-12 mb-3 ${iconColorClass} group-hover:scale-110 transition-all duration-300`
                                                            : `w-5 h-5 ${iconColorClass}`
                                                        }
                                                        style={iconStyle}
                                                        strokeWidth={1.5}
                                                    />
                                                );
                                            })()}
                                        </div>

                                        <span className={viewMode === 'grid'
                                            ? "text-[10px] md:text-xs font-bold text-white/50 group-hover:text-white uppercase tracking-widest text-center truncate w-full mt-4 transition-colors"
                                            : "text-sm text-white/70 flex-1 group-hover:text-white"
                                        }>
                                            {folder.name}
                                        </span>

                                        <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button
                                                onClick={(e) => { e.stopPropagation(); openEditFolder(folder); }}
                                                className="p-1.5 hover:bg-white/10 text-white/40 hover:text-white rounded-lg transition-all"
                                            >
                                                <Edit2 className="w-3 h-3" />
                                            </button>
                                            <button
                                                onClick={(e) => { e.stopPropagation(); handleDeleteFolder(folder.id, folder.name); }}
                                                className="p-1.5 hover:bg-red-500/10 text-white/40 hover:text-red-500 rounded-lg transition-all"
                                            >
                                                <Trash2 className="w-3 h-3" />
                                            </button>
                                        </div>
                                    </div>
                                )
                            })}

                            {/* Render Assets */}
                            {assets.map(asset => (
                                <div
                                    key={asset.id}
                                    draggable={true}
                                    onDragStart={(e) => handleDragStart(e, asset.id)}
                                    className={viewMode === 'grid'
                                        ? "group relative aspect-square bg-white/[0.02] border border-white/5 rounded-2xl overflow-hidden hover:border-emerald-500/30 transition-all animate-in fade-in slide-in-from-bottom-4 duration-500 cursor-grab active:cursor-grabbing"
                                        : "group flex items-center gap-4 p-2 bg-white/[0.02] border-b border-white/5 hover:bg-white/5 transition-all cursor-grab active:cursor-grabbing"
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
            ) : (
                // GENERATION HISTORY VIEW
                <div className="flex-1 overflow-y-auto min-h-0">
                    <div className="grid grid-cols-1 gap-6 pb-20">
                        {history.length === 0 ? (
                            <div className="h-64 flex flex-col items-center justify-center text-white/20 border-2 border-dashed border-white/5 rounded-3xl">
                                <History className="w-12 h-12 mb-4 opacity-5" />
                                <p className="font-serif italic">No history yet</p>
                                <p className="text-[10px] uppercase font-mono mt-2 tracking-widest">Generate something to see it here</p>
                            </div>
                        ) : (
                            history.map(item => (
                                <div key={item.id} className="bg-white/[0.02] border border-white/5 rounded-2xl p-4 hover:border-white/10 transition-all">
                                    <div className="flex items-start justify-between gap-4 mb-4">
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 mb-1">
                                                <span className={`text-[10px] uppercase font-bold tracking-widest px-1.5 py-0.5 rounded ${item.status === 'success' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'}`}>
                                                    {item.status}
                                                </span>
                                                <span className="text-xs text-white/40 font-mono">
                                                    {new Date(item.timestamp).toLocaleString()}
                                                </span>
                                                <span className="text-xs text-white/40 px-1.5 py-0.5 bg-white/5 rounded-full border border-white/5">
                                                    {item.service} / {item.model}
                                                </span>
                                            </div>
                                            <p className="text-sm text-white/90 line-clamp-2 font-medium mb-1" title={item.prompt}>
                                                {item.prompt}
                                            </p>
                                            <div className="flex items-center gap-4 text-xs text-white/40">
                                                {item.themeName && <span>Theme: {item.themeName}</span>}
                                                {item.aspectRatio && <span>Aspect: {item.aspectRatio}</span>}
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => handleDeleteHistory(item.id)}
                                            className="p-2 text-white/20 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-all"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>

                                    {/* Media Grid for this history item */}
                                    {item.mediaUrls && item.mediaUrls.length > 0 && (
                                        <div className={`grid gap-2 ${item.mediaUrls.length > 1 ? 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4' : 'grid-cols-1 sm:grid-cols-2 md:grid-cols-3'}`}>
                                            {item.mediaUrls.map((url, idx) => (
                                                <div key={idx} className="relative aspect-square rounded-lg overflow-hidden bg-black/50 border border-white/5 group">
                                                    {item.type === 'video' ? (
                                                        <video
                                                            src={url}
                                                            className="w-full h-full object-cover cursor-pointer"
                                                            onClick={() => onPreview(url)}
                                                        />
                                                    ) : (
                                                        <img
                                                            src={url}
                                                            className="w-full h-full object-cover cursor-pointer"
                                                            onClick={() => onPreview(url)}
                                                        />
                                                    )}
                                                    <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                    {item.status === 'failed' && item.errorMessage && (
                                        <div className="mt-2 p-3 bg-red-500/5 border border-red-500/10 rounded-lg text-xs text-red-400">
                                            Error: {item.errorMessage}
                                        </div>
                                    )}
                                </div>
                            ))
                        )}
                    </div>
                </div>
            )}

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
                            className="w-full bg-white/[0.03] border border-white/10 rounded-2xl py-4 px-6 text-base text-white placeholder-white/20 focus:outline-none focus:border-emerald-500 transition-all mb-6 shadow-inner"
                        />

                        {/* Folder Customization */}
                        <div className="space-y-4 mb-8">
                            <div>
                                <label className="text-xs text-white/40 uppercase font-bold tracking-widest block mb-2">Folder Color</label>
                                <div className="flex gap-2">
                                    {FOLDER_COLORS.map(color => (
                                        <button
                                            key={color}
                                            onClick={() => setNewFolderColor(color)}
                                            className={`w-6 h-6 rounded-full border transition-all ${newFolderColor === color ? 'border-white scale-110' : 'border-transparent opacity-60 hover:opacity-100'}`}
                                            style={{ backgroundColor: color }}
                                        />
                                    ))}
                                    <button
                                        onClick={() => setNewFolderColor("")}
                                        className={`w-6 h-6 rounded-full border flex items-center justify-center transition-all ${!newFolderColor ? 'border-white bg-white/10' : 'border-transparent opacity-60 hover:opacity-100'}`}
                                        title="Default"
                                    >
                                        <div className="w-3 h-3 rounded-full bg-emerald-500" />
                                    </button>
                                </div>
                            </div>

                            <div>
                                <label className="text-xs text-white/40 uppercase font-bold tracking-widest block mb-2">Folder Icon</label>
                                <div className="flex gap-2 flex-wrap">
                                    {FOLDER_ICONS.map(iconName => {
                                        const IconC = {
                                            'folder': FolderIcon,
                                            'star': Star,
                                            'heart': Heart,
                                            'camera': Camera,
                                            'video': FileVideo,
                                            'music': Music,
                                            'briefcase': Briefcase,
                                            'home': Home
                                        }[iconName] || FolderIcon;

                                        return (
                                            <button
                                                key={iconName}
                                                onClick={() => setNewFolderIcon(iconName)}
                                                className={`p-2 rounded-lg border transition-all ${newFolderIcon === iconName ? 'bg-white/10 border-white text-white' : 'border-transparent text-white/40 hover:text-white hover:bg-white/5'}`}
                                            >
                                                <IconC className="w-5 h-5" />
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>

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

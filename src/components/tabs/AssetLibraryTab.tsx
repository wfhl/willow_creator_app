import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
    Folder as FolderIcon,
    FileVideo,
    ChevronRight,
    Trash2,
    Search,
    Upload,
    FolderPlus,
    X,
    LayoutGrid,
    List,
    Image as ImageIcon,
    Edit3,
    Star,
    Heart,
    Camera,
    Music,
    Briefcase,
    Home,
    History,
    Layers,
    Copy,
    RotateCcw,
    Download,
    Loader2
} from 'lucide-react';
import { dbService } from '../../lib/dbService';
import { generateUUID } from '../../lib/uuid';
import type { DBAsset, DBFolder, DBGenerationHistory } from '../../lib/dbService';

interface AssetLibraryTabProps {
    onPreview: (url: string) => void;
    onRecall?: (item: DBGenerationHistory) => void;
}

export function AssetLibraryTab({ onPreview, onRecall }: AssetLibraryTabProps) {
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

    // Tab & Pagination State
    const [subTab, setSubTab] = useState<'saved' | 'history'>('saved');
    const [history, setHistory] = useState<DBGenerationHistory[]>([]);
    const [assetsOffset, setAssetsOffset] = useState(0);
    const [historyOffset, setHistoryOffset] = useState(0);
    const [hasMoreAssets, setHasMoreAssets] = useState(true);
    const [hasMoreHistory, setHasMoreHistory] = useState(true);
    const [isLoadingMore, setIsLoadingMore] = useState(false);

    const assetObserverTarget = useRef<HTMLDivElement>(null);
    const historyObserverTarget = useRef<HTMLDivElement>(null);
    const BATCH_SIZE = 24;

    const FOLDER_COLORS = ['#10b981', '#ef4444', '#3b82f6', '#f59e0b', '#8b5cf6', '#ec4899', '#6366f1'];
    const FOLDER_ICONS = ['folder', 'star', 'heart', 'camera', 'video', 'music', 'briefcase', 'home'];

    const isLoadingRef = useRef(false);

    const loadContent = useCallback(async (isLoadMore = false) => {
        if (isLoadingRef.current) return;
        isLoadingRef.current = true;
        setIsLoadingMore(true);
        try {
            if (!isLoadMore) {
                const f = await dbService.getFoldersByParent(currentFolderId);
                setFolders(f.sort((x, y) => x.name.localeCompare(y.name)));
            }

            const offset = isLoadMore ? assetsOffset : 0;
            const a = await dbService.getAssetsBatch(currentFolderId, BATCH_SIZE, offset);

            // Filter out face_reference assets to keep them distinct
            const filteredAssets = a.filter(asset => asset.type !== 'face_reference');

            if (isLoadMore) {
                setAssets(prev => [...prev, ...filteredAssets]);
                setAssetsOffset(prev => prev + BATCH_SIZE);
            } else {
                setAssets(filteredAssets);
                setAssetsOffset(BATCH_SIZE);
            }

            setHasMoreAssets(a.length === BATCH_SIZE);
        } catch (err) {
            console.error("Failed to load library content:", err);
        } finally {
            isLoadingRef.current = false;
            setIsLoadingMore(false);
        }
    }, [currentFolderId, assetsOffset]);

    const loadHistory = useCallback(async (isLoadMore = false) => {
        if (isLoadingRef.current) return;
        isLoadingRef.current = true;
        setIsLoadingMore(true);
        try {
            const offset = isLoadMore ? historyOffset : 0;
            const h = await dbService.getRecentHistoryBatch(BATCH_SIZE, offset);

            if (isLoadMore) {
                setHistory(prev => [...prev, ...h]);
                setHistoryOffset(prev => prev + BATCH_SIZE);
            } else {
                setHistory(h);
                setHistoryOffset(BATCH_SIZE);
            }

            setHasMoreHistory(h.length === BATCH_SIZE);
        } catch (err) {
            console.error("Failed to load history:", err);
        } finally {
            isLoadingRef.current = false;
            setIsLoadingMore(false);
        }
    }, [historyOffset]);

    useEffect(() => {
        loadContent(false);
    }, [currentFolderId]);

    useEffect(() => {
        if (subTab === 'history' && history.length === 0) {
            loadHistory(false);
        } else if (subTab === 'saved') {
            loadContent(false);
        }
    }, [subTab]);

    useEffect(() => {
        const observer = new IntersectionObserver(
            entries => {
                if (entries[0].isIntersecting && !isLoadingMore) {
                    if (subTab === 'saved' && hasMoreAssets) {
                        loadContent(true);
                    } else if (subTab === 'history' && hasMoreHistory) {
                        loadHistory(true);
                    }
                }
            },
            { threshold: 0.1, rootMargin: '200px' }
        );

        const target = subTab === 'saved' ? assetObserverTarget.current : historyObserverTarget.current;
        if (target) observer.observe(target);

        return () => observer.disconnect();
    }, [subTab, hasMoreAssets, hasMoreHistory, isLoadingMore, loadContent, loadHistory]);

    useEffect(() => {
        const unsubscribe = dbService.subscribe((store, type) => {
            if (store === 'assets' || store === 'folders') {
                if (type === 'insert' || type === 'delete' || type === 'update') {
                    loadContent(false);
                }
            } else if (store === 'generation_history') {
                if (subTab === 'history' || history.length === 0) loadHistory(false);
            }
        });
        return () => { unsubscribe(); };
    }, [subTab, loadContent, loadHistory, history.length]);

    // Derived filtered states for search
    const filteredFolders = folders.filter(f =>
        f.name.toLowerCase().includes(searchQuery.toLowerCase())
    );
    const filteredAssets = assets.filter(a =>
        a.name.toLowerCase().includes(searchQuery.toLowerCase())
    );
    const filteredHistory = history.filter(h =>
        h.prompt.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (h.topic && h.topic.toLowerCase().includes(searchQuery.toLowerCase())) ||
        h.model.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const handleNavigate = async (folder: DBFolder | null) => {
        if (!folder) {
            setCurrentFolderId(null);
            setPath([]);
        } else {
            setCurrentFolderId(folder.id);
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
        setDragOverTarget(null);
    };

    const handleDrop = async (e: React.DragEvent, targetFolderId: string | null) => {
        e.preventDefault();
        e.stopPropagation();
        setDragOverTarget(null);
        const assetId = draggedAssetId;
        if (!assetId) return;
        try {
            const assetToMove = assets.find(a => a.id === assetId);
            if (assetToMove) {
                if (assetToMove.folderId === targetFolderId) return;
                const updatedAsset = { ...assetToMove, folderId: targetFolderId };
                setAssets(prev => prev.filter(a => a.id !== assetId));
                await dbService.saveAsset(updatedAsset);
            }
        } catch (error) {
            console.error("Failed to move asset:", error);
            loadContent();
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
        if (!confirm(`Delete folder "${name}"?`)) return;
        await dbService.deleteFolder(id);
        loadContent();
    };

    const handleDeleteHistory = async (id: string) => {
        if (!confirm("Delete this history entry?")) return;
        await dbService.deleteGenerationHistory(id);
        loadHistory();
    };

    const handleDownloadAsset = (url: string, name: string) => {
        const link = document.createElement('a');
        link.href = url;
        link.download = name;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <div className="max-w-[1600px] mx-auto w-full p-4 md:p-8 pb-20 flex flex-col h-full bg-[#050505] min-h-0">
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
                                        className={`transition-all rounded px-2 py-0.5 uppercase ${dragOverTarget === 'root' ? 'bg-emerald-500/20 text-emerald-400 scale-105 font-bold' : 'hover:text-emerald-400'}`}
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
                                                className={`transition-all rounded px-2 py-0.5 uppercase ${dragOverTarget === p.id ? 'bg-emerald-500/20 text-emerald-400 scale-105 font-bold' : (i === path.length - 1 ? 'text-white/80 font-bold' : 'hover:text-emerald-400')}`}
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
                <div className="flex items-center gap-3">
                    <div className="relative flex-1 group">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20 group-focus-within:text-emerald-400 transition-colors" />
                        <input
                            type="text"
                            placeholder="Search..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full bg-white/[0.03] border border-white/5 rounded-xl py-2.5 pl-11 pr-4 text-base md:text-sm text-white focus:outline-none focus:border-emerald-500/50 transition-all"
                        />
                    </div>
                    <div className="flex bg-white/5 border border-white/10 rounded-xl p-1 shrink-0">
                        <button
                            onClick={() => setViewMode('grid')}
                            className={`p-2 rounded-lg transition-all ${viewMode === 'grid' ? 'bg-white/10 text-emerald-400' : 'text-white/40 hover:text-white'}`}
                        >
                            <LayoutGrid className="w-4 h-4" />
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

            {subTab === 'saved' ? (
                <div className="flex-1 overflow-y-auto min-h-0">
                    {filteredFolders.length === 0 && filteredAssets.length === 0 ? (
                        <div className="h-64 flex flex-col items-center justify-center text-white/20 border border-dashed border-white/5 rounded-3xl">
                            <ImageIcon className="w-12 h-12 mb-4 opacity-10" />
                            <p className="font-serif italic text-white/40">
                                {searchQuery ? 'No assets match your search' : (currentFolderId ? 'This folder is empty' : 'Your library is empty')}
                            </p>
                        </div>
                    ) : (
                        <div className={viewMode === 'grid' ? "grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-4" : "flex flex-col gap-1"}>
                            {filteredFolders.map(folder => (
                                <div
                                    key={folder.id}
                                    onClick={() => handleNavigate(folder)}
                                    onDragOver={(e) => handleDragEnterTarget(e, folder.id)}
                                    onDragLeave={handleDragLeaveTarget}
                                    onDrop={(e) => handleDrop(e, folder.id)}
                                    className={viewMode === 'grid'
                                        ? `group relative flex flex-col items-center justify-center aspect-square p-4 bg-white/[0.02] border rounded-2xl cursor-pointer transition-all ${dragOverTarget === folder.id ? 'border-emerald-500 bg-emerald-500/20' : 'border-white/5 hover:bg-white/5'}`
                                        : `group flex items-center gap-4 p-3 bg-white/[0.02] border-b border-white/5 cursor-pointer transition-all ${dragOverTarget === folder.id ? 'border-emerald-500 bg-emerald-500/10' : 'hover:bg-white/5'}`
                                    }
                                >
                                    <div className="relative">
                                        {(() => {
                                            const IconComponent = {
                                                'folder': FolderIcon, 'star': Star, 'heart': Heart, 'camera': Camera,
                                                'video': FileVideo, 'music': Music, 'briefcase': Briefcase, 'home': Home
                                            }[folder.icon || 'folder'] || FolderIcon;
                                            return <IconComponent className={viewMode === 'grid' ? "w-12 h-12 mb-3 text-emerald-500/60 group-hover:scale-110 transition-all" : "w-5 h-5 text-emerald-500/60"} style={folder.color ? { color: folder.color } : {}} />;
                                        })()}
                                    </div>
                                    <span className={viewMode === 'grid' ? "text-[10px] md:text-xs font-bold text-white/50 group-hover:text-white uppercase tracking-widest text-center truncate w-full mt-4" : "text-sm text-white/70 flex-1 truncate"}>
                                        {folder.name}
                                    </span>
                                    <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button onClick={(e) => { e.stopPropagation(); openEditFolder(folder); }} className="p-1.5 hover:bg-white/10 text-white/40 hover:text-white rounded-lg"><Edit3 className="w-3 h-3" /></button>
                                        <button onClick={(e) => { e.stopPropagation(); handleDeleteFolder(folder.id, folder.name); }} className="p-1.5 hover:bg-red-500/10 text-white/40 hover:text-red-500 rounded-lg"><Trash2 className="w-3 h-3" /></button>
                                    </div>
                                </div>
                            ))}
                            {filteredAssets.map(asset => (
                                <div key={asset.id} draggable onDragStart={(e) => handleDragStart(e, asset.id)} className={viewMode === 'grid' ? "group relative aspect-square bg-white/[0.02] border border-white/5 rounded-2xl overflow-hidden hover:border-emerald-500/30 transition-all cursor-grab active:cursor-grabbing" : "group flex items-center gap-4 p-2 bg-white/[0.02] border-b border-white/5 hover:bg-white/5 transition-all cursor-grab"}>
                                    {viewMode === 'grid' ? (
                                        <>
                                            {asset.type === 'video' ? <video src={asset.base64} className="w-full h-full object-cover opacity-60 group-hover:opacity-100" muted onClick={() => onPreview(asset.base64)} /> : asset.type === 'lora' ? <div className="w-full h-full flex flex-col items-center justify-center p-4" onClick={() => { navigator.clipboard.writeText(asset.base64); alert("Copied!"); }}><Layers className="w-12 h-12 mb-2 text-emerald-400 opacity-50" /><div className="text-[9px] uppercase tracking-widest text-emerald-400">Copy LoRA</div></div> : <img src={asset.base64} className="w-full h-full object-cover opacity-60 group-hover:opacity-100" onClick={() => onPreview(asset.base64)} />}
                                            <div className="absolute inset-x-0 bottom-0 p-2 bg-gradient-to-t from-black/80 to-transparent">
                                                <p className="text-[9px] text-white/90 truncate font-mono">{asset.name}</p>
                                            </div>
                                            <div className="absolute top-2 right-2 flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button onClick={() => handleDeleteAsset(asset.id)} className="p-2 bg-red-500/20 text-red-400 hover:bg-red-500 hover:text-white rounded-xl"><Trash2 className="w-3.5 h-3.5" /></button>
                                                <button onClick={() => handleDownloadAsset(asset.base64, asset.name)} className="p-2 bg-white/10 text-white/60 hover:text-white rounded-xl"><Download className="w-3.5 h-3.5" /></button>
                                            </div>
                                        </>
                                    ) : (
                                        <>
                                            <div className="w-10 h-10 rounded-lg overflow-hidden bg-black shrink-0 border border-white/5">
                                                {asset.type === 'video' ? <video src={asset.base64} className="w-full h-full object-cover" /> : asset.type === 'lora' ? <div className="w-full h-10 flex items-center justify-center bg-emerald-900/20 text-emerald-400"><Layers className="w-5 h-5" /></div> : <img src={asset.base64} className="w-full h-full object-cover" />}
                                            </div>
                                            <span className="text-sm text-white/60 flex-1 truncate">{asset.name}</span>
                                            <div className="flex gap-2">
                                                <button onClick={() => handleDownloadAsset(asset.base64, asset.name)} className="p-2 text-white/20 hover:text-white"><Download className="w-4 h-4" /></button>
                                                <button onClick={() => handleDeleteAsset(asset.id)} className="p-2 text-white/20 hover:text-red-500"><Trash2 className="w-4 h-4" /></button>
                                            </div>
                                        </>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                    <div ref={assetObserverTarget} className="h-20 flex items-center justify-center">
                        {isLoadingMore && (
                            <div className="flex items-center gap-2 text-white/20">
                                <Loader2 className="w-4 h-4 animate-spin" />
                                <span className="text-[10px] uppercase tracking-widest font-mono">Loading...</span>
                            </div>
                        )}
                    </div>
                </div>
            ) : (
                <div className="flex-1 overflow-y-auto min-h-0">
                    <div className="grid grid-cols-1 gap-6 pb-20">
                        {filteredHistory.length === 0 ? (
                            <div className="h-64 flex flex-col items-center justify-center text-white/20 border border-dashed border-white/5 rounded-3xl">
                                <History className="w-12 h-12 mb-4 opacity-10" />
                                <p className="font-serif italic text-white/40">{searchQuery ? 'No history matches your search' : 'No history yet'}</p>
                            </div>
                        ) : (
                            filteredHistory.map(item => (
                                <div key={item.id} className="bg-white/[0.02] border border-white/5 rounded-2xl p-4 hover:border-white/10 transition-all">
                                    <div className="flex items-start justify-between gap-4 mb-4">
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 mb-1">
                                                <span className={`text-[10px] uppercase font-bold tracking-widest px-1.5 py-0.5 rounded ${item.status === 'success' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'}`}>{item.status}</span>
                                                <span className="text-xs text-white/40">{new Date(item.timestamp).toLocaleString()}</span>
                                                <span className="text-xs text-white/40 px-1.5 py-0.5 bg-white/5 rounded-full border border-white/5">{item.service} / {item.model}</span>
                                            </div>
                                            <p className="text-sm text-white/90 line-clamp-2 mb-1">{item.prompt}</p>
                                        </div>
                                        <div className="flex gap-2">
                                            <button onClick={() => { navigator.clipboard.writeText(item.prompt); alert("Copied!"); }} className="p-2 text-white/20 hover:text-white" title="Copy Prompt"><Copy className="w-4 h-4" /></button>
                                            <button onClick={() => handleDeleteHistory(item.id)} className="p-2 text-white/20 hover:text-red-500" title="Delete"><Trash2 className="w-4 h-4" /></button>
                                            <button onClick={() => onRecall && onRecall(item)} className="p-2 text-white/20 hover:text-emerald-500" title="Recall"><RotateCcw className="w-4 h-4" /></button>
                                        </div>
                                    </div>
                                    {item.mediaUrls && item.mediaUrls.length > 0 && (
                                        <div className={`grid gap-2 ${item.mediaUrls.length > 1 ? 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4' : 'grid-cols-1 sm:grid-cols-2 md:grid-cols-3'}`}>
                                            {item.mediaUrls.map((url, idx) => (
                                                <div key={idx} className="relative aspect-square rounded-lg overflow-hidden bg-black/50 border border-white/5 group">
                                                    {item.type === 'video' ? <video src={url} className="w-full h-full object-cover cursor-pointer" onClick={() => onPreview(url)} /> : <img src={url} className="w-full h-full object-cover cursor-pointer" onClick={() => onPreview(url)} />}
                                                    <button onClick={() => handleDownloadAsset(url, `history-${idx}`)} className="absolute top-2 right-2 p-1.5 bg-black/60 text-white/60 hover:text-white rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"><Download className="w-3.5 h-3.5" /></button>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            ))
                        )}
                        <div ref={historyObserverTarget} className="h-20 flex items-center justify-center">
                            {isLoadingMore && (
                                <div className="flex items-center gap-2 text-white/20">
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                    <span className="text-[10px] uppercase tracking-widest font-mono">Loading...</span>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {showNewFolderModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-xl">
                    <div className="w-full max-w-sm bg-[#0a0a0a] border border-white/10 rounded-3xl p-8 shadow-2xl">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-xl font-bold font-serif text-white/90">{editingFolder ? 'Edit Folder' : 'New Folder'}</h2>
                            <button onClick={() => setShowNewFolderModal(false)} className="text-white/40 hover:text-white"><X className="w-5 h-5" /></button>
                        </div>
                        <input
                            type="text" autoFocus placeholder="Folder name..." value={newFolderName}
                            onChange={(e) => setNewFolderName(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleCreateFolder()}
                            className="w-full bg-white/[0.03] border border-white/10 rounded-2xl py-4 px-6 text-base text-white focus:border-emerald-500 transition-all mb-6"
                        />

                        <div className="space-y-4 mb-6">
                            <div>
                                <label className="text-[10px] uppercase tracking-widest text-white/40 font-bold block mb-2">Color</label>
                                <div className="flex flex-wrap gap-2">
                                    {FOLDER_COLORS.map(c => (
                                        <button key={c} onClick={() => setNewFolderColor(c)} className={`w-6 h-6 rounded-full border-2 ${newFolderColor === c ? 'border-white' : 'border-transparent'}`} style={{ backgroundColor: c }} />
                                    ))}
                                    <button onClick={() => setNewFolderColor("")} className={`w-6 h-6 rounded-full border-2 bg-emerald-500/20 flex items-center justify-center ${!newFolderColor ? 'border-white' : 'border-transparent'}`}><div className="w-3 h-3 rounded-full bg-emerald-500" /></button>
                                </div>
                            </div>
                            <div>
                                <label className="text-[10px] uppercase tracking-widest text-white/40 font-bold block mb-2">Icon</label>
                                <div className="flex flex-wrap gap-2">
                                    {FOLDER_ICONS.map(icon => {
                                        const IC = { 'folder': FolderIcon, 'star': Star, 'heart': Heart, 'camera': Camera, 'video': FileVideo, 'music': Music, 'briefcase': Briefcase, 'home': Home }[icon] || FolderIcon;
                                        return <button key={icon} onClick={() => setNewFolderIcon(icon)} className={`p-2 rounded-lg border ${newFolderIcon === icon ? 'bg-white/10 border-white' : 'bg-white/5 border-transparent'}`}><IC className="w-4 h-4 text-white" /></button>
                                    })}
                                </div>
                            </div>
                        </div>

                        <div className="flex gap-4">
                            <button onClick={() => setShowNewFolderModal(false)} className="flex-1 py-4 text-xs font-bold uppercase text-white/40">Cancel</button>
                            <button onClick={handleCreateFolder} className="flex-1 py-4 bg-emerald-500 hover:bg-emerald-400 text-black text-xs font-bold uppercase rounded-2xl transition-all">{editingFolder ? 'Update' : 'Create'}</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

import { useState, useEffect } from 'react';
import { Settings, Plus, Trash2, Save, X, ChevronDown, ChevronUp, Cloud, RefreshCw, Key, Eye, EyeOff, Loader2 } from 'lucide-react';
import { migrationService } from '../../lib/migrationService';
import { syncService } from '../../lib/syncService';
import { dbService } from '../../lib/dbService';
import { createThumbnails } from '../../lib/imageUtils';
import { generateUUID } from '../../lib/uuid';
import { useAuth } from '../AuthProvider';

export interface Theme {
    id: string;
    name: string;
    description: string;
    context?: string;
    basePrompt: string;
    defaultOutfit?: string;
    defaultSetting?: string;
    defaultVisuals?: string;
    defaultAction?: string;
}

export interface CreatorProfile {
    subject: string;
    negativePrompt: string;
    defaultParams: string;
}

export interface CaptionStyle {
    id: string;
    label: string;
    prompt: string;
}

interface SettingsTabProps {
    themes: Theme[];
    setThemes: (themes: Theme[]) => void;
    captionStyles: CaptionStyle[];
    setCaptionStyles: (styles: CaptionStyle[]) => void;
    profile: CreatorProfile;
    setProfile: (profile: CreatorProfile) => void;
    apiKeys: { gemini: string; fal: string };
    onUpdateApiKeys: (keys: { gemini: string; fal: string }) => void;
    onExit: () => void;
}

export function SettingsTab({ themes, setThemes, captionStyles, setCaptionStyles, profile, setProfile, apiKeys, onUpdateApiKeys, onExit }: SettingsTabProps) {
    const { user } = useAuth();
    const [activeSection, setActiveSection] = useState<'themes' | 'captions' | 'persona' | 'sync' | 'credentials' | 'maintenance'>('credentials');
    const [editingThemeId, setEditingThemeId] = useState<string | null>(null);
    const [editingStyleId, setEditingStyleId] = useState<string | null>(null);
    const [migrationStatus, setMigrationStatus] = useState<string>('');
    const [isMigrating, setIsMigrating] = useState(false);
    const [isOptimizing, setIsOptimizing] = useState(false);
    const [optProgress, setOptProgress] = useState("");

    const handleOptimizeLibrary = async () => {
        setIsOptimizing(true);
        setOptProgress("Starting optimization...");
        try {
            const posts = await dbService.getRecentPostsBatch(1000, 0, 'prev');
            setOptProgress(`Optimizing ${posts.length} posts...`);
            for (let i = 0; i < posts.length; i++) {
                const post = posts[i];
                if (!post.thumbnailUrls || post.thumbnailUrls.length === 0) {
                    setOptProgress(`Processing post ${i + 1}/${posts.length}...`);
                    post.thumbnailUrls = await createThumbnails(post.mediaUrls);
                    await dbService.savePost(post);
                }
            }

            const history = await dbService.getRecentHistoryBatch(1000, 0, 'prev');
            setOptProgress(`Optimizing ${history.length} history items...`);
            for (let i = 0; i < history.length; i++) {
                const item = history[i];
                if (item.status === 'success' && (!item.thumbnailUrls || item.thumbnailUrls.length === 0)) {
                    setOptProgress(`Processing history ${i + 1}/${history.length}...`);
                    item.thumbnailUrls = await createThumbnails(item.mediaUrls);
                    await dbService.saveGenerationHistory(item);
                }
            }
            setOptProgress("Optimization complete!");
            alert("Library optimization complete! All images now have fast-loading thumbnails.");
        } catch (e) {
            console.error(e);
            alert("Optimization failed.");
        } finally {
            setIsOptimizing(false);
            setOptProgress("");
        }
    };

    // API Keys Local State for editing
    const [localKeys, setLocalKeys] = useState(apiKeys);
    const [showGemini, setShowGemini] = useState(false);
    const [showFal, setShowFal] = useState(false);

    // Profile Local State
    const [localProfile, setLocalProfile] = useState(profile);

    // Temporary state for editing
    const [tempTheme, setTempTheme] = useState<Theme | null>(null);
    const [tempStyle, setTempStyle] = useState<CaptionStyle | null>(null);

    // Sync local state with props (important for async loading)
    useEffect(() => {
        setLocalKeys(apiKeys);
    }, [apiKeys]);

    useEffect(() => {
        setLocalProfile(profile);
    }, [profile]);

    const handleSaveTheme = () => {
        if (!tempTheme) return;
        if (editingThemeId === 'new') {
            setThemes([...themes, { ...tempTheme, id: generateUUID() }]);
        } else {
            setThemes(themes.map(t => t.id === tempTheme.id ? tempTheme : t));
        }
        setEditingThemeId(null);
        setTempTheme(null);
    };

    const handleDeleteTheme = (id: string) => {
        if (confirm("Are you sure you want to delete this theme?")) {
            setThemes(themes.filter(t => t.id !== id));
        }
    };

    const handleSaveStyle = () => {
        if (!tempStyle) return;
        if (editingStyleId === 'new') {
            setCaptionStyles([...captionStyles, { ...tempStyle, id: generateUUID() }]);
        } else {
            setCaptionStyles(captionStyles.map(s => s.id === tempStyle.id ? tempStyle : s));
        }
        setEditingStyleId(null);
        setTempStyle(null);
    };

    const handleDeleteStyle = (id: string) => {
        if (confirm("Are you sure you want to delete this caption style?")) {
            setCaptionStyles(captionStyles.filter(s => s.id !== id));
        }
    };

    const startEditTheme = (theme: Theme | 'new') => {
        if (theme === 'new') {
            setTempTheme({
                id: '',
                name: 'New Theme',
                description: '',
                basePrompt: '',
                defaultOutfit: '',
                defaultSetting: ''
            });
            setEditingThemeId('new');
        } else {
            setTempTheme({ ...theme });
            setEditingThemeId(theme.id);
        }
    };

    const startEditStyle = (style: CaptionStyle | 'new') => {
        if (style === 'new') {
            setTempStyle({
                id: '',
                label: 'New Style',
                prompt: ''
            });
            setEditingStyleId('new');
        } else {
            setTempStyle({ ...style });
            setEditingStyleId(style.id);
        }
    };

    const handleMigration = async () => {
        if (!confirm("This will upload all local data to Supabase. Continue?")) return;

        setIsMigrating(true);
        setMigrationStatus("Initializing...");

        try {
            await migrationService.migrateAll((msg) => setMigrationStatus(msg));
            alert("Migration completed successfully!");
            setMigrationStatus("Completed");
        } catch (e: any) {
            console.error(e);
            alert("Migration failed: " + e.message);
            setMigrationStatus("Failed: " + e.message);
        } finally {
            setIsMigrating(false);
        }
    };

    return (
        <div className="max-w-[1000px] mx-auto w-full p-4 md:p-8 pb-32">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-8 pb-4 border-b border-white/10 gap-4">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-emerald-500/10 rounded-lg border border-emerald-500/20">
                        <Settings className="w-5 h-5 md:w-6 md:h-6 text-emerald-400" />
                    </div>
                    <div>
                        <h2 className="text-xl md:text-2xl font-bold font-serif text-white/90">Configuration</h2>
                        <p className="text-[10px] text-white/40 uppercase tracking-widest font-bold">Themes & Styles</p>
                    </div>
                </div>
                <button
                    onClick={onExit}
                    className="w-full md:w-auto px-4 py-2 hover:bg-white/5 rounded-lg text-white/60 transition-all border border-white/10 flex items-center justify-center gap-2 text-xs font-bold uppercase tracking-widest"
                >
                    <X className="w-4 h-4" /> Close Settings
                </button>
            </div>

            <div className="flex flex-col md:flex-row gap-6 md:gap-8">
                {/* Sidebar / Tabs */}
                <div className="flex md:flex-col gap-2 p-1 bg-white/5 rounded-xl border border-white/5 md:bg-transparent md:border-0 md:p-0 md:w-64 shrink-0 overflow-x-auto no-scrollbar scroll-smooth snap-x">
                    <button
                        onClick={() => setActiveSection('credentials')}
                        className={`flex-1 md:flex-none shrink-0 whitespace-nowrap snap-center text-center md:text-left px-4 py-2.5 md:py-3 rounded-lg md:rounded-xl transition-all font-bold text-[10px] md:text-sm uppercase tracking-wider ${activeSection === 'credentials'
                            ? 'bg-emerald-500 text-black md:bg-emerald-500/10 md:text-emerald-400 md:border md:border-emerald-500/20 shadow-lg shadow-emerald-500/10'
                            : 'text-white/40 hover:bg-white/5 hover:text-white'
                            }`}
                    >
                        Credentials
                    </button>
                    <button
                        onClick={() => setActiveSection('persona')}
                        className={`flex-1 md:flex-none shrink-0 whitespace-nowrap snap-center text-center md:text-left px-4 py-2.5 md:py-3 rounded-lg md:rounded-xl transition-all font-bold text-[10px] md:text-sm uppercase tracking-wider ${activeSection === 'persona'
                            ? 'bg-emerald-500 text-black md:bg-emerald-500/10 md:text-emerald-400 md:border md:border-emerald-500/20 shadow-lg shadow-emerald-500/10'
                            : 'text-white/40 hover:bg-white/5 hover:text-white'
                            }`}
                    >
                        Persona
                    </button>
                    <button
                        onClick={() => setActiveSection('themes')}
                        className={`flex-1 md:flex-none shrink-0 whitespace-nowrap snap-center text-center md:text-left px-4 py-2.5 md:py-3 rounded-lg md:rounded-xl transition-all font-bold text-[10px] md:text-sm uppercase tracking-wider ${activeSection === 'themes'
                            ? 'bg-emerald-500 text-black md:bg-emerald-500/10 md:text-emerald-400 md:border md:border-emerald-500/20 shadow-lg shadow-emerald-500/10'
                            : 'text-white/40 hover:bg-white/5 hover:text-white'
                            }`}
                    >
                        Themes
                    </button>
                    <button
                        onClick={() => setActiveSection('captions')}
                        className={`flex-1 md:flex-none shrink-0 whitespace-nowrap snap-center text-center md:text-left px-4 py-2.5 md:py-3 rounded-lg md:rounded-xl transition-all font-bold text-[10px] md:text-sm uppercase tracking-wider ${activeSection === 'captions'
                            ? 'bg-emerald-500 text-black md:bg-emerald-500/10 md:text-emerald-400 md:border md:border-emerald-500/20 shadow-lg shadow-emerald-500/10'
                            : 'text-white/40 hover:bg-white/5 hover:text-white'
                            }`}
                    >
                        Styles
                    </button>
                    <button
                        onClick={() => setActiveSection('sync')}
                        className={`flex-1 md:flex-none shrink-0 whitespace-nowrap snap-center text-center md:text-left px-4 py-2.5 md:py-3 rounded-lg md:rounded-xl transition-all font-bold text-[10px] md:text-sm uppercase tracking-wider ${activeSection === 'sync'
                            ? 'bg-emerald-500 text-black md:bg-emerald-500/10 md:text-emerald-400 md:border md:border-emerald-500/20 shadow-lg shadow-emerald-500/10'
                            : 'text-white/40 hover:bg-white/5 hover:text-white'
                            }`}
                    >
                        Data Sync
                    </button>
                    <button
                        onClick={() => setActiveSection('maintenance')}
                        className={`flex-1 md:flex-none shrink-0 whitespace-nowrap snap-center text-center md:text-left px-4 py-2.5 md:py-3 rounded-lg md:rounded-xl transition-all font-bold text-[10px] md:text-sm uppercase tracking-wider ${activeSection === 'maintenance'
                            ? 'bg-emerald-500 text-black md:bg-emerald-500/10 md:text-emerald-400 md:border md:border-emerald-500/20 shadow-lg shadow-emerald-500/10'
                            : 'text-white/40 hover:bg-white/5 hover:text-white'
                            }`}
                    >
                        Maintenance
                    </button>
                </div>

                {/* Content Area */}
                <div className="flex-1 bg-white/5 border border-white/10 rounded-2xl p-4 md:p-6 min-h-[50vh]">
                    {activeSection === 'themes' && (
                        <div className="space-y-6">
                            <div className="flex justify-between items-center">
                                <h3 className="text-lg font-bold text-white">Visual Design Themes</h3>
                                <button
                                    onClick={() => startEditTheme('new')}
                                    className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-black text-xs font-bold uppercase tracking-widest rounded-lg flex items-center gap-2"
                                >
                                    <Plus className="w-3 h-3" /> Add Theme
                                </button>
                            </div>

                            <div className="space-y-4">
                                {themes.map(theme => (
                                    <div key={theme.id} className="bg-black/20 border border-white/5 rounded-xl overflow-hidden">
                                        <div className="p-4 flex items-center justify-between hover:bg-white/5 transition-colors cursor-pointer"
                                            onClick={() => editingThemeId === theme.id ? setEditingThemeId(null) : startEditTheme(theme)}
                                        >
                                            <div>
                                                <h4 className="font-bold text-white text-sm">{theme.name}</h4>
                                                <p className="text-xs text-white/40">{theme.description}</p>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); handleDeleteTheme(theme.id); }}
                                                    className="p-2 hover:bg-red-500/20 hover:text-red-400 text-white/20 rounded-lg transition-colors"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                                {editingThemeId === theme.id ? <ChevronUp className="w-4 h-4 text-white/40" /> : <ChevronDown className="w-4 h-4 text-white/40" />}
                                            </div>
                                        </div>

                                        {editingThemeId === theme.id && tempTheme && (
                                            <div className="p-4 border-t border-white/5 bg-black/40 space-y-4">
                                                <div className="grid grid-cols-2 gap-4">
                                                    <div className="space-y-1">
                                                        <label className="text-[10px] text-white/40 uppercase tracking-widest">Name</label>
                                                        <input
                                                            value={tempTheme.name}
                                                            onChange={e => setTempTheme({ ...tempTheme, name: e.target.value })}
                                                            className="w-full bg-white/5 border border-white/10 rounded px-3 py-2 text-base md:text-sm text-white focus:border-emerald-500/50 outline-none"
                                                        />
                                                    </div>
                                                    <div className="space-y-1">
                                                        <label className="text-[10px] text-white/40 uppercase tracking-widest">Description</label>
                                                        <input
                                                            value={tempTheme.description}
                                                            onChange={e => setTempTheme({ ...tempTheme, description: e.target.value })}
                                                            className="w-full bg-white/5 border border-white/10 rounded px-3 py-2 text-base md:text-sm text-white focus:border-emerald-500/50 outline-none"
                                                        />
                                                    </div>
                                                </div>
                                                <div className="space-y-1">
                                                    <label className="text-[10px] text-white/40 uppercase tracking-widest">Base Prompt</label>
                                                    <textarea
                                                        value={tempTheme.basePrompt}
                                                        onChange={e => setTempTheme({ ...tempTheme, basePrompt: e.target.value })}
                                                        rows={3}
                                                        className="w-full bg-white/5 border border-white/10 rounded px-3 py-2 text-base md:text-sm text-white focus:border-emerald-500/50 outline-none font-mono text-xs"
                                                    />
                                                </div>
                                                <div className="grid grid-cols-2 gap-4">
                                                    <div className="space-y-1">
                                                        <label className="text-[10px] text-white/40 uppercase tracking-widest">Default Outfit</label>
                                                        <input
                                                            value={tempTheme.defaultOutfit || ''}
                                                            onChange={e => setTempTheme({ ...tempTheme, defaultOutfit: e.target.value })}
                                                            className="w-full bg-white/5 border border-white/10 rounded px-3 py-2 text-base md:text-sm text-white focus:border-emerald-500/50 outline-none"
                                                        />
                                                    </div>
                                                    <div className="space-y-1">
                                                        <label className="text-[10px] text-white/40 uppercase tracking-widest">Default Setting/Visuals</label>
                                                        <input
                                                            value={tempTheme.defaultSetting || tempTheme.defaultVisuals || ''}
                                                            onChange={e => setTempTheme({ ...tempTheme, defaultSetting: e.target.value, defaultVisuals: e.target.value })}
                                                            className="w-full bg-white/5 border border-white/10 rounded px-3 py-2 text-base md:text-sm text-white focus:border-emerald-500/50 outline-none"
                                                        />
                                                    </div>
                                                </div>
                                                <div className="flex justify-end gap-2 pt-2">
                                                    <button
                                                        onClick={() => { setEditingThemeId(null); setTempTheme(null); }}
                                                        className="px-3 py-2 text-xs text-white/60 hover:text-white"
                                                    >
                                                        Cancel
                                                    </button>
                                                    <button
                                                        onClick={handleSaveTheme}
                                                        className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-black text-xs font-bold uppercase tracking-widest rounded-lg flex items-center gap-2"
                                                    >
                                                        <Save className="w-3 h-3" /> Save Changes
                                                    </button>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                ))}

                                {editingThemeId === 'new' && tempTheme && (
                                    <div className="bg-black/20 border border-emerald-500/30 rounded-xl overflow-hidden p-4 space-y-4">
                                        <h4 className="text-emerald-400 font-bold uppercase text-xs tracking-widest">New Theme</h4>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="space-y-1">
                                                <label className="text-[10px] text-white/40 uppercase tracking-widest">Name</label>
                                                <input
                                                    value={tempTheme.name}
                                                    onChange={e => setTempTheme({ ...tempTheme, name: e.target.value })}
                                                    className="w-full bg-white/5 border border-white/10 rounded px-3 py-2 text-sm text-white focus:border-emerald-500/50 outline-none"
                                                    autoFocus
                                                />
                                            </div>
                                            <div className="space-y-1">
                                                <label className="text-[10px] text-white/40 uppercase tracking-widest">Description</label>
                                                <input
                                                    value={tempTheme.description}
                                                    onChange={e => setTempTheme({ ...tempTheme, description: e.target.value })}
                                                    className="w-full bg-white/5 border border-white/10 rounded px-3 py-2 text-sm text-white focus:border-emerald-500/50 outline-none"
                                                />
                                            </div>
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-[10px] text-white/40 uppercase tracking-widest">Base Prompt</label>
                                            <textarea
                                                value={tempTheme.basePrompt}
                                                onChange={e => setTempTheme({ ...tempTheme, basePrompt: e.target.value })}
                                                rows={3}
                                                className="w-full bg-white/5 border border-white/10 rounded px-3 py-2 text-sm text-white focus:border-emerald-500/50 outline-none font-mono text-xs"
                                                placeholder="Use [Subject Definition], [Outfit], [Setting] placeholders..."
                                            />
                                        </div>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="space-y-1">
                                                <label className="text-[10px] text-white/40 uppercase tracking-widest">Default Outfit</label>
                                                <input
                                                    value={tempTheme.defaultOutfit || ''}
                                                    onChange={e => setTempTheme({ ...tempTheme, defaultOutfit: e.target.value })}
                                                    className="w-full bg-white/5 border border-white/10 rounded px-3 py-2 text-sm text-white focus:border-emerald-500/50 outline-none"
                                                />
                                            </div>
                                            <div className="space-y-1">
                                                <label className="text-[10px] text-white/40 uppercase tracking-widest">Default Setting</label>
                                                <input
                                                    value={tempTheme.defaultSetting || tempTheme.defaultVisuals || ''}
                                                    onChange={e => setTempTheme({ ...tempTheme, defaultSetting: e.target.value, defaultVisuals: e.target.value })}
                                                    className="w-full bg-white/5 border border-white/10 rounded px-3 py-2 text-sm text-white focus:border-emerald-500/50 outline-none"
                                                />
                                            </div>
                                        </div>
                                        <div className="flex justify-end gap-2 pt-2">
                                            <button
                                                onClick={() => { setEditingThemeId(null); setTempTheme(null); }}
                                                className="px-3 py-2 text-xs text-white/60 hover:text-white"
                                            >
                                                Cancel
                                            </button>
                                            <button
                                                onClick={handleSaveTheme}
                                                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-black text-xs font-bold uppercase tracking-widest rounded-lg flex items-center gap-2"
                                            >
                                                <Save className="w-3 h-3" /> Create Theme
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {activeSection === 'captions' && (
                        <div className="space-y-6">
                            <div className="flex justify-between items-center">
                                <h3 className="text-lg font-bold text-white">Caption Strategies</h3>
                                <button
                                    onClick={() => startEditStyle('new')}
                                    className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-black text-xs font-bold uppercase tracking-widest rounded-lg flex items-center gap-2"
                                >
                                    <Plus className="w-3 h-3" /> Add Strategy
                                </button>
                            </div>

                            <div className="space-y-4">
                                {captionStyles.map(style => (
                                    <div key={style.id} className="bg-black/20 border border-white/5 rounded-xl overflow-hidden">
                                        <div className="p-4 flex items-center justify-between hover:bg-white/5 transition-colors cursor-pointer"
                                            onClick={() => editingStyleId === style.id ? setEditingStyleId(null) : startEditStyle(style)}
                                        >
                                            <div>
                                                <h4 className="font-bold text-white text-sm">{style.label}</h4>
                                                <p className="text-xs text-white/40 truncate max-w-md">{style.prompt}</p>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); handleDeleteStyle(style.id); }}
                                                    className="p-2 hover:bg-red-500/20 hover:text-red-400 text-white/20 rounded-lg transition-colors"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                                {editingStyleId === style.id ? <ChevronUp className="w-4 h-4 text-white/40" /> : <ChevronDown className="w-4 h-4 text-white/40" />}
                                            </div>
                                        </div>

                                        {editingStyleId === style.id && tempStyle && (
                                            <div className="p-4 border-t border-white/5 bg-black/40 space-y-4">
                                                <div className="space-y-1">
                                                    <label className="text-[10px] text-white/40 uppercase tracking-widest">Label</label>
                                                    <input
                                                        value={tempStyle.label}
                                                        onChange={e => setTempStyle({ ...tempStyle, label: e.target.value })}
                                                        className="w-full bg-white/5 border border-white/10 rounded px-3 py-2 text-sm text-white focus:border-emerald-500/50 outline-none"
                                                    />
                                                </div>
                                                <div className="space-y-1">
                                                    <label className="text-[10px] text-white/40 uppercase tracking-widest">System Instruction / Prompt</label>
                                                    <textarea
                                                        value={tempStyle.prompt}
                                                        onChange={e => setTempStyle({ ...tempStyle, prompt: e.target.value })}
                                                        rows={4}
                                                        className="w-full bg-white/5 border border-white/10 rounded px-3 py-2 text-base md:text-sm text-white focus:border-emerald-500/50 outline-none font-sans"
                                                    />
                                                </div>
                                                <div className="flex justify-end gap-2 pt-2">
                                                    <button
                                                        onClick={() => { setEditingStyleId(null); setTempStyle(null); }}
                                                        className="px-3 py-2 text-xs text-white/60 hover:text-white"
                                                    >
                                                        Cancel
                                                    </button>
                                                    <button
                                                        onClick={handleSaveStyle}
                                                        className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-black text-xs font-bold uppercase tracking-widest rounded-lg flex items-center gap-2"
                                                    >
                                                        <Save className="w-3 h-3" /> Save Changes
                                                    </button>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                ))}

                                {editingStyleId === 'new' && tempStyle && (
                                    <div className="bg-black/20 border border-emerald-500/30 rounded-xl overflow-hidden p-4 space-y-4">
                                        <h4 className="text-emerald-400 font-bold uppercase text-xs tracking-widest">New Strategy</h4>
                                        <div className="space-y-1">
                                            <label className="text-[10px] text-white/40 uppercase tracking-widest">Label</label>
                                            <input
                                                value={tempStyle.label}
                                                onChange={e => setTempStyle({ ...tempStyle, label: e.target.value })}
                                                className="w-full bg-white/5 border border-white/10 rounded px-3 py-2 text-sm text-white focus:border-emerald-500/50 outline-none"
                                                autoFocus
                                            />
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-[10px] text-white/40 uppercase tracking-widest">System Instruction / Prompt</label>
                                            <textarea
                                                value={tempStyle.prompt}
                                                onChange={e => setTempStyle({ ...tempStyle, prompt: e.target.value })}
                                                rows={4}
                                                className="w-full bg-white/5 border border-white/10 rounded px-3 py-2 text-sm text-white focus:border-emerald-500/50 outline-none font-sans"
                                                placeholder="Describe how the caption should be written..."
                                            />
                                        </div>
                                        <div className="flex justify-end gap-2 pt-2">
                                            <button
                                                onClick={() => { setEditingStyleId(null); setTempStyle(null); }}
                                                className="px-3 py-2 text-xs text-white/60 hover:text-white"
                                            >
                                                Cancel
                                            </button>
                                            <button
                                                onClick={handleSaveStyle}
                                                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-black text-xs font-bold uppercase tracking-widest rounded-lg flex items-center gap-2"
                                            >
                                                <Save className="w-3 h-3" /> Create Strategy
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {activeSection === 'persona' && (
                        <div className="space-y-6">
                            <div className="flex justify-between items-center">
                                <h3 className="text-lg font-bold text-white">Core Persona & Identity</h3>
                            </div>

                            <div className="bg-white/5 border border-white/10 rounded-xl p-6 space-y-6">
                                <div className="space-y-2">
                                    <label className="text-[10px] text-white/40 uppercase tracking-widest font-bold">Base Subject Definition</label>
                                    <textarea
                                        value={localProfile.subject}
                                        onChange={e => setLocalProfile({ ...localProfile, subject: e.target.value })}
                                        rows={4}
                                        className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:border-emerald-500/50 outline-none transition-all font-serif italic"
                                        placeholder="Describe the core persona (face, age, hair, mood)..."
                                    />
                                    <p className="text-[10px] text-white/30 italic">This is the [Subject Definition] used in all automated prompts.</p>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-[10px] text-white/40 uppercase tracking-widest font-bold">Global Negative Prompt</label>
                                    <textarea
                                        value={localProfile.negativePrompt}
                                        onChange={e => setLocalProfile({ ...localProfile, negativePrompt: e.target.value })}
                                        rows={3}
                                        className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:border-emerald-500/50 outline-none transition-all font-mono text-xs"
                                        placeholder="Enter negative prompts to avoid..."
                                    />
                                </div>

                                <div className="space-y-2">
                                    <label className="text-[10px] text-white/40 uppercase tracking-widest font-bold">Default Parameters</label>
                                    <input
                                        type="text"
                                        value={localProfile.defaultParams}
                                        onChange={e => setLocalProfile({ ...localProfile, defaultParams: e.target.value })}
                                        className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:border-emerald-500/50 outline-none transition-all"
                                        placeholder="e.g. --v 6.0 --stylize 250"
                                    />
                                </div>

                                <button
                                    onClick={() => {
                                        setProfile(localProfile);
                                        alert("Persona settings saved!");
                                    }}
                                    className="w-full py-3 bg-emerald-500 hover:bg-emerald-400 text-black font-bold uppercase tracking-widest rounded-xl transition-all shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2"
                                >
                                    <Save className="w-4 h-4" /> Save Persona
                                </button>
                            </div>
                        </div>
                    )}

                    {activeSection === 'sync' && (
                        <div className="space-y-6">
                            <div className="flex justify-between items-center">
                                <h3 className="text-lg font-bold text-white">Data Synchronization</h3>
                            </div>

                            <div className="bg-white/5 border border-white/10 rounded-xl p-6 space-y-4">
                                <div className="p-4 bg-emerald-500/5 border border-emerald-500/10 rounded-2xl flex items-start gap-4">
                                    <div className="p-2 bg-emerald-500/10 rounded-xl">
                                        <Cloud className="w-5 h-5 text-emerald-400" />
                                    </div>
                                    <div className="flex-1">
                                        <h4 className="text-sm font-bold text-white pr-1">Cloud Sync Status</h4>
                                        <p className="text-[10px] text-white/40 uppercase tracking-widest mt-0.5">
                                            {user ? `Logged in as ${user.email}` : "Not logged in"}
                                        </p>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <button
                                        onClick={handleMigration}
                                        disabled={!user || isMigrating}
                                        className="flex flex-col items-center justify-center gap-3 p-6 bg-white/[0.03] hover:bg-white/[0.05] border border-white/10 rounded-3xl transition-all group disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        <div className="w-12 h-12 bg-emerald-500/10 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform">
                                            <Cloud className="w-6 h-6 text-emerald-400" />
                                        </div>
                                        <div className="text-center">
                                            <span className="block text-xs font-bold uppercase tracking-widest text-white/90">Push to Cloud</span>
                                            <span className="block text-[9px] text-white/40 uppercase tracking-tighter mt-1 whitespace-nowrap">Local &rarr; Supabase</span>
                                        </div>
                                    </button>

                                    <button
                                        onClick={async () => {
                                            if (!user) return;
                                            setMigrationStatus("Syncing...");
                                            await syncService.fullSync();
                                            setMigrationStatus("Sync Completed");
                                            alert("Cloud data synchronized!");
                                        }}
                                        disabled={!user || isMigrating}
                                        className="flex flex-col items-center justify-center gap-3 p-6 bg-white/[0.03] hover:bg-white/[0.05] border border-white/10 rounded-3xl transition-all group disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        <div className="w-12 h-12 bg-blue-500/10 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform">
                                            <RefreshCw className="w-6 h-6 text-blue-400" />
                                        </div>
                                        <div className="text-center">
                                            <span className="block text-xs font-bold uppercase tracking-widest text-white/90">Force Full Sync</span>
                                            <span className="block text-[9px] text-white/40 uppercase tracking-tighter mt-1 whitespace-nowrap">Bi-directional Reconciliation</span>
                                        </div>
                                    </button>
                                </div>

                                {migrationStatus && (
                                    <div className="p-4 bg-black/40 border border-white/5 rounded-2xl">
                                        <p className="text-[10px] font-mono uppercase tracking-widest text-white/40 mb-2">Progress Status</p>
                                        <div className="flex items-center gap-3">
                                            <div className="h-1.5 flex-1 bg-white/5 rounded-full overflow-hidden">
                                                <div
                                                    className={`h-full bg-emerald-500 transition-all duration-500 ${isMigrating ? 'animate-pulse' : ''}`}
                                                    style={{ width: migrationStatus.includes('Complete') ? '100%' : '50%' }}
                                                />
                                            </div>
                                            <span className="text-[10px] font-bold text-emerald-400 uppercase">{migrationStatus}</span>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {activeSection === 'credentials' && (
                        <div className="space-y-6">
                            <div className="flex justify-between items-center">
                                <h3 className="text-lg font-bold text-white">API Credentials</h3>
                            </div>

                            <div className="bg-white/5 border border-white/10 rounded-xl p-6 space-y-8">
                                <div className="space-y-4">
                                    <div className="flex items-center gap-3 mb-2">
                                        <div className="p-2 bg-purple-500/10 rounded-lg border border-purple-500/20">
                                            <Key className="w-4 h-4 text-purple-400" />
                                        </div>
                                        <div>
                                            <h4 className="font-bold text-white text-sm">Google Gemini API</h4>
                                            <p className="text-[10px] text-white/40 uppercase tracking-widest">Required for logic and captioning</p>
                                        </div>
                                    </div>

                                    <div className="relative group">
                                        <input
                                            type={showGemini ? "text" : "password"}
                                            value={localKeys.gemini}
                                            onChange={e => setLocalKeys({ ...localKeys, gemini: e.target.value })}
                                            placeholder="Enter your Gemini API Key..."
                                            className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:border-purple-500/50 outline-none transition-all pr-12"
                                        />
                                        <button
                                            onClick={() => setShowGemini(!showGemini)}
                                            className="absolute right-3 top-1/2 -translate-y-1/2 p-2 text-white/20 hover:text-white/60 transition-colors"
                                        >
                                            {showGemini ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                        </button>
                                    </div>
                                    <p className="text-[10px] text-white/30 italic">Get your key from the <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noopener noreferrer" className="text-purple-400 hover:underline">Google AI Studio</a>.</p>
                                </div>

                                <div className="space-y-4">
                                    <div className="flex items-center gap-3 mb-2">
                                        <div className="p-2 bg-orange-500/10 rounded-lg border border-orange-500/20">
                                            <Key className="w-4 h-4 text-orange-400" />
                                        </div>
                                        <div>
                                            <h4 className="font-bold text-white text-sm">Fal.ai API</h4>
                                            <p className="text-[10px] text-white/40 uppercase tracking-widest">Required for image and video generation</p>
                                        </div>
                                    </div>

                                    <div className="relative group">
                                        <input
                                            type={showFal ? "text" : "password"}
                                            value={localKeys.fal}
                                            onChange={e => setLocalKeys({ ...localKeys, fal: e.target.value })}
                                            placeholder="Enter your Fal.ai API Key..."
                                            className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:border-orange-500/50 outline-none transition-all pr-12"
                                        />
                                        <button
                                            onClick={() => setShowFal(!showFal)}
                                            className="absolute right-3 top-1/2 -translate-y-1/2 p-2 text-white/20 hover:text-white/60 transition-colors"
                                        >
                                            {showFal ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                        </button>
                                    </div>
                                    <p className="text-[10px] text-white/30 italic">Get your key from the <a href="https://fal.ai/dashboard/keys" target="_blank" rel="noopener noreferrer" className="text-orange-400 hover:underline">Fal.ai Dashboard</a>.</p>
                                </div>

                                <button
                                    onClick={() => {
                                        onUpdateApiKeys(localKeys);
                                        const msg = user
                                            ? "API Credentials Saved!\n\nYour keys are stored securely and synced across your devices via your Cloud account. They are only accessible to you when logged in."
                                            : "API Credentials Saved Securely!\n\nYour keys are currently stored in your browser's private local storage. Log in to sync them cross-device.";
                                        alert(msg);
                                    }}
                                    className="w-full py-3 bg-emerald-500 hover:bg-emerald-400 text-black font-bold uppercase tracking-widest rounded-xl transition-all shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2"
                                >
                                    <Save className="w-4 h-4" /> Save Credentials
                                </button>
                            </div>

                            <div className="p-4 bg-white/5 rounded-xl border border-white/5 space-y-2">
                                <h4 className="text-[10px] font-bold text-white/40 uppercase tracking-widest">Security & Privacy Architecture</h4>
                                <p className="text-[10px] text-white/30 leading-relaxed">
                                    Your API credentials utilize **Hybrid Persistence**.
                                    <br /><br />
                                    {user
                                        ? "Because you are logged in, your keys are securely synced to your private Cloud metadata. This allows you to jump between devices (e.g., Mobile and Desktop) without re-entering your credentials."
                                        : "You are currently in **Local-Only Mode**. Your keys are saved exclusively in your browser's private IndexedDB instance. Login to enable Cross-Device synchronization."
                                    }
                                </p>
                            </div>
                        </div>
                    )}

                    {activeSection === 'maintenance' && (
                        <div className="space-y-6">
                            <div className="flex justify-between items-center">
                                <h3 className="text-lg font-bold text-white">System Maintenance</h3>
                            </div>

                            <div className="bg-white/5 border border-white/10 rounded-xl p-6 space-y-6">
                                <div className="space-y-2">
                                    <h4 className="text-sm font-bold text-white">Optimize Library Performance</h4>
                                    <p className="text-xs text-white/40 leading-relaxed">
                                        Generates small, fast-loading thumbnails for all your existing saved posts and generation history.
                                        This significantly improves performance when browsing your library and history pages.
                                    </p>
                                </div>

                                <div className="p-4 bg-emerald-500/5 border border-emerald-500/10 rounded-xl space-y-3">
                                    <div className="flex items-center gap-3">
                                        <div className={`p-2 rounded-lg ${isOptimizing ? 'bg-emerald-500/20 text-emerald-400 animate-spin' : 'bg-emerald-500/10 text-emerald-400'}`}>
                                            <RefreshCw className="w-4 h-4" />
                                        </div>
                                        <div>
                                            <p className="text-xs font-bold text-white">Thumbnail Optimization</p>
                                            <p className="text-[10px] text-white/40 uppercase tracking-widest">{optProgress || "System Ready"}</p>
                                        </div>
                                    </div>

                                    <button
                                        onClick={handleOptimizeLibrary}
                                        disabled={isOptimizing}
                                        className="w-full py-2.5 bg-emerald-500 hover:bg-emerald-400 text-black text-xs font-bold uppercase tracking-widest rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                                    >
                                        {isOptimizing ? (
                                            <>
                                                <Loader2 className="w-4 h-4 animate-spin" />
                                                Optimizing...
                                            </>
                                        ) : (
                                            "Run Optimization"
                                        )}
                                    </button>
                                </div>

                                <div className="p-4 bg-white/5 rounded-xl border border-white/5">
                                    <p className="text-[10px] text-white/30 leading-relaxed italic">
                                        Note: This process may take a few minutes depending on the size of your library.
                                        Once complete, your generation history and saved posts will load noticeably faster.
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

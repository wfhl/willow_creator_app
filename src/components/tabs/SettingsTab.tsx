import { useState } from 'react';
import { Settings, Plus, Trash2, Save, X, ChevronDown, ChevronUp, Cloud, Database, Key, Eye, EyeOff } from 'lucide-react';
import { migrationService } from '../../lib/migrationService';
import { generateUUID } from '../../lib/uuid';

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
    const [activeSection, setActiveSection] = useState<'themes' | 'captions' | 'persona' | 'sync' | 'credentials'>('themes');
    const [editingThemeId, setEditingThemeId] = useState<string | null>(null);
    const [editingStyleId, setEditingStyleId] = useState<string | null>(null);
    const [migrationStatus, setMigrationStatus] = useState<string>('');
    const [isMigrating, setIsMigrating] = useState(false);

    // API Keys Local State for editing
    const [localKeys, setLocalKeys] = useState(apiKeys);
    const [showGemini, setShowGemini] = useState(false);
    const [showFal, setShowFal] = useState(false);

    // Profile Local State
    const [localProfile, setLocalProfile] = useState(profile);

    // Temporary state for editing
    const [tempTheme, setTempTheme] = useState<Theme | null>(null);
    const [tempStyle, setTempStyle] = useState<CaptionStyle | null>(null);

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
                <div className="flex md:flex-col gap-2 p-1 bg-white/5 rounded-xl border border-white/5 md:bg-transparent md:border-0 md:p-0 md:w-64 shrink-0">
                    <button
                        onClick={() => setActiveSection('themes')}
                        className={`flex-1 md:flex-none text-center md:text-left px-4 py-2.5 md:py-3 rounded-lg md:rounded-xl transition-all font-bold text-[10px] md:text-sm uppercase tracking-wider ${activeSection === 'themes'
                            ? 'bg-emerald-500 text-black md:bg-emerald-500/10 md:text-emerald-400 md:border md:border-emerald-500/20 shadow-lg shadow-emerald-500/10'
                            : 'text-white/40 hover:bg-white/5 hover:text-white'
                            }`}
                    >
                        Themes
                    </button>
                    <button
                        onClick={() => setActiveSection('captions')}
                        className={`flex-1 md:flex-none text-center md:text-left px-4 py-2.5 md:py-3 rounded-lg md:rounded-xl transition-all font-bold text-[10px] md:text-sm uppercase tracking-wider ${activeSection === 'captions'
                            ? 'bg-emerald-500 text-black md:bg-emerald-500/10 md:text-emerald-400 md:border md:border-emerald-500/20 shadow-lg shadow-emerald-500/10'
                            : 'text-white/40 hover:bg-white/5 hover:text-white'
                            }`}
                    >
                        Styles
                    </button>
                    <button
                        onClick={() => setActiveSection('persona')}
                        className={`flex-1 md:flex-none text-center md:text-left px-4 py-2.5 md:py-3 rounded-lg md:rounded-xl transition-all font-bold text-[10px] md:text-sm uppercase tracking-wider ${activeSection === 'persona'
                            ? 'bg-emerald-500 text-black md:bg-emerald-500/10 md:text-emerald-400 md:border md:border-emerald-500/20 shadow-lg shadow-emerald-500/10'
                            : 'text-white/40 hover:bg-white/5 hover:text-white'
                            }`}
                    >
                        Persona
                    </button>
                    <button
                        onClick={() => setActiveSection('sync')}
                        className={`flex-1 md:flex-none text-center md:text-left px-4 py-2.5 md:py-3 rounded-lg md:rounded-xl transition-all font-bold text-[10px] md:text-sm uppercase tracking-wider ${activeSection === 'sync'
                            ? 'bg-emerald-500 text-black md:bg-emerald-500/10 md:text-emerald-400 md:border md:border-emerald-500/20 shadow-lg shadow-emerald-500/10'
                            : 'text-white/40 hover:bg-white/5 hover:text-white'
                            }`}
                    >
                        Data Sync
                    </button>
                    <button
                        onClick={() => setActiveSection('credentials')}
                        className={`flex-1 md:flex-none text-center md:text-left px-4 py-2.5 md:py-3 rounded-lg md:rounded-xl transition-all font-bold text-[10px] md:text-sm uppercase tracking-wider ${activeSection === 'credentials'
                            ? 'bg-emerald-500 text-black md:bg-emerald-500/10 md:text-emerald-400 md:border md:border-emerald-500/20 shadow-lg shadow-emerald-500/10'
                            : 'text-white/40 hover:bg-white/5 hover:text-white'
                            }`}
                    >
                        Credentials
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
                                <div className="flex items-start gap-4">
                                    <div className="p-3 bg-blue-500/10 rounded-lg border border-blue-500/20 shrink-0">
                                        <Cloud className="w-6 h-6 text-blue-400" />
                                    </div>
                                    <div>
                                        <h4 className="font-bold text-white mb-1">Migrate Local to Cloud</h4>
                                        <p className="text-xs text-white/60 mb-4">
                                            Move all your locally stored Assets, Strategies, and Themes to your Supabase cloud account.
                                            This allows you to access your data from any device.
                                        </p>
                                        <button
                                            className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold uppercase tracking-widest rounded-lg flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                                            onClick={handleMigration}
                                            disabled={isMigrating}
                                        >
                                            <Database className="w-3 h-3" /> {isMigrating ? 'Migrating...' : 'Start Migration'}
                                        </button>
                                        {migrationStatus && (
                                            <p className="text-[10px] text-blue-400 mt-2 font-mono">{migrationStatus}</p>
                                        )}
                                    </div>
                                </div>
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
                                        alert("API Keys saved successfully!");
                                    }}
                                    className="w-full py-3 bg-emerald-500 hover:bg-emerald-400 text-black font-bold uppercase tracking-widest rounded-xl transition-all shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2"
                                >
                                    <Save className="w-4 h-4" /> Save Credentials
                                </button>
                            </div>

                            <div className="p-4 bg-white/5 rounded-xl border border-white/5 space-y-2">
                                <h4 className="text-[10px] font-bold text-white/40 uppercase tracking-widest">Security Note</h4>
                                <p className="text-[10px] text-white/30 leading-relaxed">
                                    Keys are stored locally in your browser's IndexedDB. They are never sent to our servers or included in cloud sync.
                                    However, anyone with access to your browser profile may be able to retrieve them.
                                </p>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

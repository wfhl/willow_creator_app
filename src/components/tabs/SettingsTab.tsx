import { useState } from 'react';
import { Settings, Plus, Trash2, Save, X, ChevronDown, ChevronUp } from 'lucide-react';

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
    onExit: () => void;
}

export function SettingsTab({ themes, setThemes, captionStyles, setCaptionStyles, onExit }: SettingsTabProps) {
    const [activeSection, setActiveSection] = useState<'themes' | 'captions'>('themes');
    const [editingThemeId, setEditingThemeId] = useState<string | null>(null);
    const [editingStyleId, setEditingStyleId] = useState<string | null>(null);

    // Temporary state for editing
    const [tempTheme, setTempTheme] = useState<Theme | null>(null);
    const [tempStyle, setTempStyle] = useState<CaptionStyle | null>(null);

    const handleSaveTheme = () => {
        if (!tempTheme) return;
        if (editingThemeId === 'new') {
            setThemes([...themes, { ...tempTheme, id: crypto.randomUUID() }]);
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
            setCaptionStyles([...captionStyles, { ...tempStyle, id: crypto.randomUUID() }]);
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

    return (
        <div className="max-w-[1000px] mx-auto w-full p-8 pb-32">
            <div className="flex items-center justify-between mb-8 pb-4 border-b border-white/10">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-emerald-500/10 rounded-lg border border-emerald-500/20">
                        <Settings className="w-6 h-6 text-emerald-400" />
                    </div>
                    <div>
                        <h2 className="text-2xl font-bold font-serif text-white/90">Configuration</h2>
                        <p className="text-xs text-white/40 uppercase tracking-widest">Manage Themes & Styles</p>
                    </div>
                </div>
                <button
                    onClick={onExit}
                    className="px-4 py-2 hover:bg-white/5 rounded-lg text-white/60 transition-all border border-white/10 flex items-center gap-2"
                >
                    <X className="w-4 h-4" /> Close Settings
                </button>
            </div>

            <div className="flex gap-8">
                {/* Sidebar */}
                <div className="w-64 space-y-2">
                    <button
                        onClick={() => setActiveSection('themes')}
                        className={`w-full text-left px-4 py-3 rounded-xl transition-all font-bold text-sm uppercase tracking-wider ${activeSection === 'themes'
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                            : 'text-white/40 hover:bg-white/5 hover:text-white'
                            }`}
                    >
                        Visual Themes
                    </button>
                    <button
                        onClick={() => setActiveSection('captions')}
                        className={`w-full text-left px-4 py-3 rounded-xl transition-all font-bold text-sm uppercase tracking-wider ${activeSection === 'captions'
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                            : 'text-white/40 hover:bg-white/5 hover:text-white'
                            }`}
                    >
                        Caption Styles
                    </button>
                </div>

                {/* Content Area */}
                <div className="flex-1 bg-white/5 border border-white/10 rounded-2xl p-6 min-h-[60vh]">
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
                                                            className="w-full bg-white/5 border border-white/10 rounded px-3 py-2 text-sm text-white focus:border-emerald-500/50 outline-none"
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
                                                        <label className="text-[10px] text-white/40 uppercase tracking-widest">Default Setting/Visuals</label>
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
                                                        className="w-full bg-white/5 border border-white/10 rounded px-3 py-2 text-sm text-white focus:border-emerald-500/50 outline-none font-sans"
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
                </div>
            </div>
        </div>
    );
}

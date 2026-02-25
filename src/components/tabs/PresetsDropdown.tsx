import React, { useRef, useEffect } from 'react';
import { ChevronDown, Sparkles, Trash2 } from 'lucide-react';

interface PresetsDropdownProps {
    isOpen: boolean;
    setIsOpen: (val: boolean) => void;
    showSaveForm: boolean;
    setShowSaveForm: (val: boolean) => void;
    currentPostData: any; // Using any for simplicity in props, but typed in logic
    onSavePost: (data: any, name?: string) => Promise<string | undefined>; // Returns ID
    onLoadPreset: (preset: any) => void;
    presetsList: any[]; // List of presets (saved posts)
    onDeletePreset: (id: string) => void;
    direction?: 'up' | 'down';
    tab: string;
}

export function PresetsDropdown({
    isOpen,
    setIsOpen,
    showSaveForm,
    setShowSaveForm,
    currentPostData,
    onSavePost,
    onLoadPreset,
    presetsList,
    onDeletePreset,
    direction = 'up',
    tab
}: PresetsDropdownProps) {
    const dropdownRef = useRef<HTMLDivElement>(null);
    const [presetName, setPresetName] = React.useState("");

    const filteredPresets = presetsList.filter(p => p.tab === tab || (!p.tab && tab === 'create'));

    // Close on click outside
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [isOpen, setIsOpen]);

    // Reset name when form opens
    useEffect(() => {
        if (showSaveForm) setPresetName("");
    }, [showSaveForm]);

    // Update the onSavePost type in props potentially or just cast
    // But since onSavePost is typed as `(data: any) => ...` in interface, we should update interface first or assume it accepts extra args if it was flexible. 
    // In simple-creator it will be updated.

    return (
        <div ref={dropdownRef} className="relative">
            <div className="flex justify-end">
                <button
                    onClick={() => {
                        setIsOpen(!isOpen);
                        setShowSaveForm(false);
                    }}
                    className={`text-[10px] font-bold uppercase tracking-widest flex items-center gap-1 transition-all active-scale ${isOpen ? 'text-emerald-400' : 'text-white/40 hover:text-emerald-400'}`}
                >
                    <div className={`w-1.5 h-1.5 rounded-full ${isOpen ? 'bg-emerald-500' : 'bg-white/20'}`}></div>
                    Presets
                    <ChevronDown className={`w-3 h-3 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                </button>
            </div>

            {isOpen && (
                <div ref={dropdownRef} className={`absolute right-0 w-72 bg-[#0a0a0a] border border-white/10 rounded-xl shadow-2xl overflow-hidden flex flex-col ring-1 ring-white/10 z-[100] animate-in fade-in duration-200 ${direction === 'up' ? 'bottom-full mb-2 slide-in-from-bottom-2' : 'top-full mt-2 slide-in-from-top-2'}`}>

                    {/* Header Actions */}
                    <div className="p-2 border-b border-white/5 bg-white/5 flex gap-2">
                        <button
                            onClick={() => setShowSaveForm(true)}
                            className={`w-full py-2 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 active-scale ${showSaveForm ? 'bg-emerald-500/30' : ''}`}
                        >
                            <Sparkles className="w-3 h-3" /> Save Context
                        </button>
                    </div>

                    {/* Mobile Save Form Modal */}
                    {showSaveForm && (
                        <div className="md:hidden fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-300" onClick={() => setShowSaveForm(false)}>
                            <div className="w-full max-w-[320px] bg-[#0a0a0a] border border-white/10 rounded-[2.5rem] p-8 space-y-6 shadow-2xl animate-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
                                <div className="text-center space-y-2">
                                    <div className="w-12 h-12 bg-emerald-500/10 rounded-full flex items-center justify-center mx-auto mb-2 text-emerald-400">
                                        <Sparkles className="w-6 h-6" />
                                    </div>
                                    <h3 className="text-2xl font-bold font-serif text-white tracking-tight">Save Preset</h3>
                                    <p className="text-[10px] text-white/40 uppercase tracking-widest font-bold">Store your current setup</p>
                                </div>

                                <form
                                    onSubmit={(e) => {
                                        e.preventDefault();
                                        onSavePost(currentPostData, presetName);
                                        setShowSaveForm(false);
                                    }}
                                    className="space-y-6"
                                >
                                    <div className="space-y-2">
                                        <input
                                            type="text"
                                            placeholder="Name this preset..."
                                            className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 px-6 text-base text-white focus:border-emerald-500 transition-all shadow-inner text-center"
                                            autoFocus
                                            value={presetName}
                                            onChange={(e) => setPresetName(e.target.value)}
                                        />
                                    </div>
                                    <div className="flex flex-col gap-3">
                                        <button
                                            type="submit"
                                            className="w-full py-5 bg-emerald-500 text-black rounded-2xl text-xs font-black uppercase tracking-widest shadow-lg shadow-emerald-500/20 active-scale"
                                        >
                                            Confirm & Save
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setShowSaveForm(false)}
                                            className="w-full py-4 text-white/40 text-[10px] font-bold uppercase tracking-widest"
                                        >
                                            Cancel
                                        </button>
                                    </div>
                                </form>
                            </div>
                        </div>
                    )}

                    {/* Desktop Inline Form */}
                    {showSaveForm && (
                        <div className="hidden md:block p-2 border-b border-white/10 bg-emerald-500/5 animate-in slide-in-from-top-2 duration-200">
                            <form
                                onSubmit={(e) => {
                                    e.preventDefault();
                                    onSavePost(currentPostData, presetName);
                                    setShowSaveForm(false);
                                }}
                                className="space-y-2"
                            >
                                <input
                                    type="text"
                                    placeholder="Name this preset..."
                                    className="w-full bg-black/40 border border-white/10 rounded px-2 py-1 text-xs text-white focus:border-emerald-500/50 outline-none"
                                    autoFocus
                                    value={presetName}
                                    onChange={(e) => setPresetName(e.target.value)}
                                />
                                <div className="flex gap-1">
                                    <button type="submit" className="flex-1 py-1 bg-emerald-500 text-black rounded text-[10px] font-bold uppercase">Confirm</button>
                                    <button type="button" onClick={() => setShowSaveForm(false)} className="px-2 py-1 bg-white/10 text-white rounded text-[10px]">Cancel</button>
                                </div>
                            </form>
                        </div>
                    )}

                    {/* Presets List */}
                    <div className="max-h-64 overflow-y-auto custom-scrollbar p-1 space-y-0.5">
                        {filteredPresets.length === 0 ? (
                            <div className="p-4 text-center text-white/20 text-[10px] uppercase font-bold tracking-widest">
                                No {tab} presets
                            </div>
                        ) : (
                            filteredPresets.slice(0, 10).map((post) => ( // Limit to 10 recent for dropdown
                                <div key={post.id} className="group relative flex items-center justify-between px-3 py-2 hover:bg-white/5 rounded-lg transition-colors cursor-pointer"
                                    onClick={() => onLoadPreset(post)}
                                >
                                    <span className="text-white/80 text-xs font-medium truncate pr-6">{post.name || post.topic || "Untitled"}</span>
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            onDeletePreset(post.id);
                                        }}
                                        className="opacity-0 group-hover:opacity-100 p-1 hover:text-red-400 text-white/20 transition-all absolute right-2"
                                    >
                                        <Trash2 className="w-3 h-3" />
                                    </button>
                                </div>
                            ))
                        )}
                    </div>

                    {filteredPresets.length > 10 && (
                        <div className="p-2 border-t border-white/5 bg-black/20 text-center">
                            <span className="text-[9px] text-white/30 italic">View all in Library</span>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

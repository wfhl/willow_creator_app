import { PenTool, Archive, Edit2, Play, Terminal, Settings } from 'lucide-react';

interface CreatorHeaderProps {
    activeTab: 'create' | 'saved' | 'edit' | 'animate' | 'scripts' | 'settings';
    setActiveTab: (tab: 'create' | 'saved' | 'edit' | 'animate' | 'scripts' | 'settings') => void;
    savedCount: number;
}

export function CreatorHeader({ activeTab, setActiveTab, savedCount }: CreatorHeaderProps) {
    return (
        <div className="fixed top-0 left-0 right-0 h-16 bg-black/80 backdrop-blur-md border-b border-white/10 z-50 flex items-center justify-between px-8">
            <div className="flex items-center gap-4">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center shadow-lg shadow-emerald-500/20">
                    <span className="font-serif font-bold text-black text-lg">W</span>
                </div>
                <div>
                    <h1 className="text-sm font-bold text-white tracking-widest uppercase">Willow Creator</h1>
                    <p className="text-[10px] text-white/40 font-mono tracking-wider">STUDIO V2.1</p>
                </div>
            </div>

            <nav className="flex items-center gap-1 bg-white/5 p-1 rounded-xl border border-white/5">
                <button
                    onClick={() => setActiveTab('create')}
                    className={`px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-widest flex items-center gap-2 transition-all ${activeTab === 'create' ? 'bg-white/10 text-white shadow-sm' : 'text-white/40 hover:text-white hover:bg-white/5'
                        }`}
                >
                    <PenTool className="w-3 h-3" /> Create
                </button>
                <button
                    onClick={() => setActiveTab('saved')}
                    className={`px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-widest flex items-center gap-2 transition-all ${activeTab === 'saved' ? 'bg-white/10 text-white shadow-sm' : 'text-white/40 hover:text-white hover:bg-white/5'
                        }`}
                >
                    <Archive className="w-3 h-3" /> Library
                    <span className="bg-white/10 px-1.5 py-0.5 rounded text-[9px] min-w-[20px] text-center">{savedCount}</span>
                </button>
                <button
                    onClick={() => setActiveTab('edit')}
                    className={`px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-widest flex items-center gap-2 transition-all ${activeTab === 'edit' ? 'bg-white/10 text-white shadow-sm' : 'text-white/40 hover:text-white hover:bg-white/5'
                        }`}
                >
                    <Edit2 className="w-3 h-3" /> Refine
                </button>
                <button
                    onClick={() => setActiveTab('animate')}
                    className={`px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-widest flex items-center gap-2 transition-all ${activeTab === 'animate' ? 'bg-white/10 text-white shadow-sm' : 'text-white/40 hover:text-white hover:bg-white/5'
                        }`}
                >
                    <Play className="w-3 h-3" /> Animate
                </button>
                <button
                    onClick={() => setActiveTab('scripts')}
                    className={`px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-widest flex items-center gap-2 transition-all ${activeTab === 'scripts' ? 'bg-white/10 text-white shadow-sm' : 'text-white/40 hover:text-white hover:bg-white/5'
                        }`}
                >
                    <Terminal className="w-3 h-3" /> Scripts
                </button>
                <button
                    onClick={() => setActiveTab('settings')}
                    className={`px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-widest flex items-center gap-2 transition-all ${activeTab === 'settings' ? 'bg-white/10 text-white shadow-sm' : 'text-white/40 hover:text-white hover:bg-white/5'
                        }`}
                >
                    <Settings className="w-3 h-3" /> Settings
                </button>
            </nav>

            <div className="flex items-center gap-4">
                <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-500/10 border border-emerald-500/20 rounded-full">
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></div>
                    <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest">System Online</span>
                </div>
            </div>
        </div>
    );
}

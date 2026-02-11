import { useState, useEffect } from 'react';
import { PenTool, Archive, Folder, Edit2, Play, Terminal, Settings, User as UserIcon, LogOut } from 'lucide-react';
import { useAuth } from '../../components/AuthProvider';
import { Login } from '../../components/Login';

interface CreatorHeaderProps {
    activeTab: 'create' | 'posts' | 'assets' | 'edit' | 'animate' | 'scripts' | 'settings';
    setActiveTab: (tab: 'create' | 'posts' | 'assets' | 'edit' | 'animate' | 'scripts' | 'settings') => void;
    savedCount: number;
}

export function CreatorHeader({ activeTab, setActiveTab, savedCount }: CreatorHeaderProps) {
    const { user, signOut } = useAuth();
    const [showLogin, setShowLogin] = useState(false);

    // Close login modal when user logs in
    useEffect(() => {
        if (user) setShowLogin(false);
    }, [user]);

    return (
        <>
            <div className="fixed top-0 left-0 right-0 h-16 bg-black/80 backdrop-blur-md border-b border-white/10 z-50 flex items-center justify-between px-4 md:px-8">

                <div className="flex items-center gap-3 md:gap-4 shrink-0">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center shadow-lg shadow-emerald-500/20 shrink-0">
                        <span className="font-serif font-bold text-black text-lg">W</span>
                    </div>
                    <div className="hidden sm:block">
                        <h1 className="text-sm font-bold text-white tracking-widest uppercase truncate max-w-[120px] md:max-w-none">Willow Creator</h1>
                        <p className="text-[10px] text-white/40 font-mono tracking-wider">STUDIO V2.1</p>
                    </div>
                </div>

                <nav className="hidden md:flex items-center gap-1 bg-white/5 p-1 rounded-xl border border-white/5 overflow-x-auto no-scrollbar mx-2 scroll-smooth">
                    <button
                        onClick={() => setActiveTab('create')}
                        className={`px-3 md:px-4 py-2 rounded-lg text-[10px] md:text-xs font-bold uppercase tracking-widest flex items-center gap-2 transition-all shrink-0 ${activeTab === 'create' ? 'bg-white/10 text-white shadow-sm' : 'text-white/40 hover:text-white hover:bg-white/5'
                            }`}
                    >
                        <PenTool className="w-3 h-3" /> <span className="hidden md:inline">Create</span>
                    </button>

                    <button
                        onClick={() => setActiveTab('edit')}
                        className={`px-3 md:px-4 py-2 rounded-lg text-[10px] md:text-xs font-bold uppercase tracking-widest flex items-center gap-2 transition-all shrink-0 ${activeTab === 'edit' ? 'bg-white/10 text-white shadow-sm' : 'text-white/40 hover:text-white hover:bg-white/5'
                            }`}
                    >
                        <Edit2 className="w-3 h-3" /> <span className="hidden md:inline">Refine</span>
                    </button>
                    <button
                        onClick={() => setActiveTab('animate')}
                        className={`px-3 md:px-4 py-2 rounded-lg text-[10px] md:text-xs font-bold uppercase tracking-widest flex items-center gap-2 transition-all shrink-0 ${activeTab === 'animate' ? 'bg-white/10 text-white shadow-sm' : 'text-white/40 hover:text-white hover:bg-white/5'
                            }`}
                    >
                        <Play className="w-3 h-3" /> <span className="hidden md:inline">Animate</span>
                    </button>
                    <button
                        onClick={() => setActiveTab('scripts')}
                        className={`px-3 md:px-4 py-2 rounded-lg text-[10px] md:text-xs font-bold uppercase tracking-widest flex items-center gap-2 transition-all shrink-0 ${activeTab === 'scripts' ? 'bg-white/10 text-white shadow-sm' : 'text-white/40 hover:text-white hover:bg-white/5'
                            }`}
                    >
                        <Terminal className="w-3 h-3" /> <span className="hidden md:inline">Scripts</span>
                    </button>
                    <button
                        onClick={() => setActiveTab('settings')}
                        className={`px-3 md:px-4 py-2 rounded-lg text-[10px] md:text-xs font-bold uppercase tracking-widest flex items-center gap-2 transition-all shrink-0 ${activeTab === 'settings' ? 'bg-white/10 text-white shadow-sm' : 'text-white/40 hover:text-white hover:bg-white/5'
                            }`}
                    >
                        <Settings className="w-3 h-3" /> <span className="hidden md:inline">Settings</span>
                    </button>
                    <button
                        onClick={() => setActiveTab('posts')}
                        className={`px-3 md:px-4 py-2 rounded-lg text-[10px] md:text-xs font-bold uppercase tracking-widest flex items-center gap-2 transition-all shrink-0 ${activeTab === 'posts' ? 'bg-white/10 text-white shadow-sm' : 'text-white/40 hover:text-white hover:bg-white/5'
                            }`}
                    >
                        <Archive className="w-3 h-3" /> <span className="hidden md:inline">Posts</span>
                        <span className="bg-white/10 px-1.5 py-0.5 rounded text-[9px] min-w-[18px] text-center">{savedCount}</span>
                    </button>
                    <button
                        onClick={() => setActiveTab('assets')}
                        className={`px-3 md:px-4 py-2 rounded-lg text-[10px] md:text-xs font-bold uppercase tracking-widest flex items-center gap-2 transition-all shrink-0 ${activeTab === 'assets' ? 'bg-white/10 text-white shadow-sm' : 'text-white/40 hover:text-white hover:bg-white/5'
                            }`}
                    >
                        <Folder className="w-3 h-3" /> <span className="hidden md:inline">Assets</span>
                    </button>
                </nav>

                <div className="flex items-center gap-4 shrink-0">
                    <div className={`hidden md:flex items-center gap-2 px-3 py-1.5 border rounded-full transition-colors ${user ? 'bg-emerald-500/10 border-emerald-500/20' : 'bg-white/5 border-white/10'}`}>
                        <div className={`w-1.5 h-1.5 rounded-full ${user ? 'bg-emerald-500 animate-pulse' : 'bg-yellow-500'}`}></div>
                        <span className={`text-[10px] font-bold uppercase tracking-widest ${user ? 'text-emerald-400' : 'text-yellow-500/80'}`}>
                            {user ? 'Cloud Sync' : 'Local Only'}
                        </span>
                    </div>

                    {user ? (
                        <div className="flex items-center gap-3">
                            <div className="hidden lg:block text-right">
                                <p className="text-[10px] text-white/40 font-bold uppercase tracking-widest">Logged In</p>
                                <p className="text-xs text-white truncate max-w-[150px]">{user.email}</p>
                            </div>
                            <button
                                onClick={signOut}
                                className="p-2 hover:bg-white/10 rounded-full text-white/40 hover:text-white transition-colors"
                                title="Sign Out"
                            >
                                <LogOut className="w-4 h-4" />
                            </button>
                            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-purple-500 to-blue-500 flex items-center justify-center text-xs font-bold text-white shadow-lg">
                                {user.email?.[0].toUpperCase()}
                            </div>
                        </div>
                    ) : (
                        <button
                            onClick={() => setShowLogin(true)}
                            className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 text-white text-[10px] font-bold uppercase tracking-widest rounded-lg transition-all"
                        >
                            <UserIcon className="w-3 h-3" />
                            <span>Login</span>
                        </button>
                    )}
                </div>
            </div>

            {/* Login Modal Overlay */}
            {showLogin && (
                <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
                    <div className="relative w-full max-w-md">
                        <button
                            onClick={() => setShowLogin(false)}
                            className="absolute top-4 right-4 z-10 p-2 bg-white/10 hover:bg-white/20 rounded-full text-white/60 hover:text-white transition-colors"
                        >
                            <LogOut className="w-4 h-4 rotate-180" /> {/* Using logout icon as 'back/close' metaphor or just use X if imported */}
                        </button>
                        <Login />
                    </div>
                </div>
            )}
        </>
    );
}

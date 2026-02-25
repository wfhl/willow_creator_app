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
            <div className="fixed top-0 left-0 right-0 z-[100] bg-black/90 backdrop-blur-xl border-b border-white/5 px-3 md:px-6 pt-[calc(0.25rem+env(safe-area-inset-top))] pb-2 flex items-center justify-between h-14 md:h-16 shadow-lg shadow-black/50">

                <div className="flex items-center gap-2 md:gap-3 shrink-0">
                    <div className="w-7 h-7 md:w-8 md:h-8 rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center shadow-lg shadow-emerald-500/10 shrink-0 border border-white/10">
                        <span className="font-serif font-bold text-black text-sm md:text-base">S</span>
                    </div>
                    <div className="hidden sm:block leading-tight">
                        <h1 className="text-xs font-bold text-white tracking-widest uppercase truncate">Simple-Creator</h1>
                        <p className="text-[8px] text-white/30 font-mono tracking-wider">STUDIO V2.2</p>
                    </div>
                </div>

                <nav className="hidden md:flex items-center gap-0.5 bg-white/[0.03] p-0.5 rounded-lg border border-white/5 mx-4 overflow-hidden">
                    <button
                        onClick={() => setActiveTab('create')}
                        className={`px-3 py-1.5 rounded-md text-[10px] font-bold uppercase tracking-widest flex items-center gap-1.5 transition-all ${activeTab === 'create' ? 'bg-white/10 text-white shadow-sm' : 'text-white/40 hover:text-white hover:bg-white/5'
                            }`}
                    >
                        <PenTool className="w-3 h-3" /> <span>Create</span>
                    </button>

                    <button
                        onClick={() => setActiveTab('edit')}
                        className={`px-3 py-1.5 rounded-md text-[10px] font-bold uppercase tracking-widest flex items-center gap-1.5 transition-all ${activeTab === 'edit' ? 'bg-white/10 text-white shadow-sm' : 'text-white/40 hover:text-white hover:bg-white/5'
                            }`}
                    >
                        <Edit2 className="w-3 h-3" /> <span>Refine</span>
                    </button>
                    <button
                        onClick={() => setActiveTab('animate')}
                        className={`px-3 py-1.5 rounded-md text-[10px] font-bold uppercase tracking-widest flex items-center gap-1.5 transition-all ${activeTab === 'animate' ? 'bg-white/10 text-white shadow-sm' : 'text-white/40 hover:text-white hover:bg-white/5'
                            }`}
                    >
                        <Play className="w-3 h-3" /> <span>Animate</span>
                    </button>
                    <button
                        onClick={() => setActiveTab('scripts')}
                        className={`px-3 py-1.5 rounded-md text-[10px] font-bold uppercase tracking-widest flex items-center gap-1.5 transition-all ${activeTab === 'scripts' ? 'bg-white/10 text-white shadow-sm' : 'text-white/40 hover:text-white hover:bg-white/5'
                            }`}
                    >
                        <Terminal className="w-3 h-3" /> <span>Scripts</span>
                    </button>
                    <button
                        onClick={() => setActiveTab('settings')}
                        className={`px-3 py-1.5 rounded-md text-[10px] font-bold uppercase tracking-widest flex items-center gap-1.5 transition-all ${activeTab === 'settings' ? 'bg-white/10 text-white shadow-sm' : 'text-white/40 hover:text-white hover:bg-white/5'
                            }`}
                    >
                        <Settings className="w-3 h-3" /> <span>Settings</span>
                    </button>
                    <button
                        onClick={() => setActiveTab('posts')}
                        className={`px-3 py-1.5 rounded-md text-[10px] font-bold uppercase tracking-widest flex items-center gap-1.5 transition-all ${activeTab === 'posts' ? 'bg-white/10 text-white shadow-sm' : 'text-white/40 hover:text-white hover:bg-white/5'
                            }`}
                    >
                        <Archive className="w-3 h-3" /> <span>Posts</span>
                        <span className="bg-white/10 px-1.5 py-0.5 rounded text-[9px] min-w-[16px] text-center ml-1">{savedCount}</span>
                    </button>
                    <button
                        onClick={() => setActiveTab('assets')}
                        className={`px-3 py-1.5 rounded-md text-[10px] font-bold uppercase tracking-widest flex items-center gap-1.5 transition-all ${activeTab === 'assets' ? 'bg-white/10 text-white shadow-sm' : 'text-white/40 hover:text-white hover:bg-white/5'
                            }`}
                    >
                        <Folder className="w-3 h-3" /> <span>Assets</span>
                    </button>
                </nav>

                <div className="flex items-center gap-2 md:gap-4 shrink-0">
                    <div className="hidden min-[450px]:flex items-center gap-2 px-2 md:px-3 py-1.5 border border-white/10 rounded-full bg-white/5 transition-colors">
                        <div className={`w-1 h-1 md:w-1.5 md:h-1.5 rounded-full ${user ? 'bg-emerald-500 animate-pulse' : 'bg-yellow-500'}`}></div>
                        <span className="text-[8px] md:text-[10px] font-bold uppercase tracking-widest text-white/40">
                            {user ? 'Cloud' : 'Local'}
                        </span>
                    </div>

                    {user ? (
                        <div className="flex items-center gap-2 md:gap-3">
                            <div className="hidden lg:block text-right leading-none">
                                <p className="text-[8px] text-white/30 font-bold uppercase tracking-widest mb-0.5">Logged In</p>
                                <p className="text-[10px] text-white truncate max-w-[120px]">{user.email}</p>
                            </div>
                            <div className="w-6 h-6 md:w-7 md:h-7 rounded-full bg-gradient-to-tr from-purple-500 to-blue-500 flex items-center justify-center text-[9px] md:text-[10px] font-bold text-white shadow-lg border border-white/20">
                                {user.email?.[0].toUpperCase()}
                            </div>
                            <button
                                onClick={signOut}
                                className="p-1.5 hover:bg-white/10 rounded-full text-white/40 hover:text-white transition-colors"
                                title="Sign Out"
                            >
                                <LogOut className="w-3 h-3" />
                            </button>
                        </div>
                    ) : (
                        <button
                            onClick={() => {
                                console.log("Login clicked");
                                setShowLogin(true);
                            }}
                            className="flex items-center gap-2 px-3 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-black text-[10px] font-black uppercase tracking-widest rounded-full transition-all shadow-lg shadow-emerald-500/30 active:scale-95 border border-emerald-400/50"
                        >
                            <UserIcon className="w-3 h-3" />
                            <span>Login</span>
                        </button>
                    )}
                </div>
            </div>

            {/* Login Modal Overlay */}
            {showLogin && (
                <div
                    className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-300"
                    onClick={() => setShowLogin(false)}
                >
                    <div className="relative w-full max-w-sm" onClick={e => e.stopPropagation()}>
                        <div className="bg-[#0a0a0a] border border-white/10 rounded-[2.5rem] shadow-2xl overflow-hidden ring-1 ring-white/5 animate-in zoom-in-95 duration-200">
                            <Login />
                        </div>
                        <button
                            onClick={() => setShowLogin(false)}
                            className="mt-6 w-full py-4 text-white/30 text-[10px] font-bold uppercase tracking-widest hover:text-white transition-colors"
                        >
                            Close
                        </button>
                    </div>
                </div>
            )}
        </>
    );
}

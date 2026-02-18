
import React, { useState } from 'react';
import { useAuth } from './AuthProvider';
import { Loader2, Mail, Lock, LogIn } from 'lucide-react';

export function Login() {
    const { signInWithEmail, signUp, signInWithGoogle } = useAuth();
    const [isLogin, setIsLogin] = useState(true);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setIsLoading(true);

        try {
            if (isLogin) {
                const { error } = await signInWithEmail(email, password);
                if (error) setError(error.message);
            } else {
                const { error } = await signUp(email, password);
                if (error) setError(error.message);
                else setError('Check your email for confirmation link!');
            }
        } catch (err: any) {
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="flex flex-col items-center justify-center w-full text-white p-4 md:p-8">
            <div className="w-full space-y-6">
                <div className="text-center mb-8">
                    <h1 className="text-3xl font-serif font-bold mb-2">Willow Creator</h1>
                    <p className="text-white/40 text-sm">Sign in to manage your assets and creations.</p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-2">
                        <label className="text-xs uppercase font-bold tracking-widest text-white/40">Email</label>
                        <div className="relative">
                            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="w-full bg-black/40 border border-white/10 rounded-lg py-3 pl-10 pr-4 text-white focus:border-emerald-500 outline-none transition-colors"
                                placeholder="name@example.com"
                                required
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-xs uppercase font-bold tracking-widest text-white/40">Password</label>
                        <div className="relative">
                            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
                            <input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full bg-black/40 border border-white/10 rounded-lg py-3 pl-10 pr-4 text-white focus:border-emerald-500 outline-none transition-colors"
                                placeholder="••••••••"
                                required
                            />
                        </div>
                    </div>

                    {error && (
                        <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-xs">
                            {error}
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={isLoading}
                        className="w-full py-3 bg-emerald-500 hover:bg-emerald-400 text-black font-bold uppercase tracking-widest rounded-lg transition-all flex items-center justify-center gap-2 active:scale-95 touch-manipulation"
                    >
                        {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <LogIn className="w-4 h-4" />}
                        {isLogin ? 'Sign In' : 'Sign Up'}
                    </button>

                    <div className="relative my-6">
                        <div className="absolute inset-0 flex items-center">
                            <div className="w-full border-t border-white/10"></div>
                        </div>
                        <div className="relative flex justify-center text-xs uppercase">
                            <span className="bg-[#0a0a0a] px-2 text-white/40">Or continue with</span>
                        </div>
                    </div>

                    <button
                        type="button"
                        onClick={signInWithGoogle}
                        className="w-full py-3 bg-white/5 hover:bg-white/10 border border-white/10 text-white font-bold uppercase tracking-widest rounded-lg transition-all flex items-center justify-center gap-2 active:scale-95 touch-manipulation"
                    >
                        <span className="text-lg">G</span> Google
                    </button>

                </form>

                <div className="mt-8 text-center">
                    <button
                        onClick={() => setIsLogin(!isLogin)}
                        className="text-xs text-white/40 hover:text-white transition-colors py-2 px-4"
                    >
                        {isLogin ? "Don't have an account? Sign up" : "Already have an account? Sign in"}
                    </button>
                </div>

                <div className="mt-8 pt-8 border-t border-white/5 text-center">
                    <p className="text-[10px] text-white/20 uppercase tracking-widest font-bold">
                        Sync requires an account
                    </p>
                </div>
            </div>
        </div>
    );
}

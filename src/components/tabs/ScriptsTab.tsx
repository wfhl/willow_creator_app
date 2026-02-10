import { Terminal } from 'lucide-react';

export function ScriptsTab() {
    return (
        <div className="max-w-[1200px] mx-auto w-full p-4 md:p-8 pb-32 flex flex-col items-center justify-center min-h-[60vh]">
            <div className="text-center space-y-6 max-w-lg">
                <div className="p-4 bg-emerald-500/10 rounded-2xl border border-emerald-500/20 inline-block">
                    <Terminal className="w-12 h-12 text-emerald-400" />
                </div>
                <div>
                    <h2 className="text-3xl font-bold font-serif text-white mb-2">Scripts & utilities</h2>
                    <p className="text-white/40">Repository for automated scripts and utility functions.</p>
                </div>
                <div className="p-8 bg-white/5 border border-white/10 rounded-xl text-white/30 font-mono text-sm">
                    Coming Soon...
                </div>
            </div>
        </div>
    );
}

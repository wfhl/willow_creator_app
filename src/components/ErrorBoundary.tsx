
import type { ErrorInfo, ReactNode } from 'react';
import { Component } from 'react';

interface Props {
    children?: ReactNode;
}

interface State {
    hasError: boolean;
    error: Error | null;
}

class ErrorBoundary extends Component<Props, State> {
    public state: State = {
        hasError: false,
        error: null
    };

    public static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error };
    }

    public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        console.error('Uncaught error:', error, errorInfo);
    }

    public render() {
        if (this.state.hasError) {
            return (
                <div className="min-h-screen bg-black text-red-500 p-8 flex flex-col items-center justify-center font-mono text-sm leading-relaxed overflow-auto">
                    <h1 className="text-2xl font-bold mb-4">Application Error</h1>
                    <div className="bg-white/5 border border-red-500/30 p-4 rounded-lg w-full max-w-2xl">
                        <p className="font-bold mb-2">{this.state.error?.name}: {this.state.error?.message}</p>
                        <pre className="text-[10px] text-white/60 whitespace-pre-wrap">
                            {this.state.error?.stack}
                        </pre>
                    </div>
                    <button
                        onClick={() => window.location.reload()}
                        className="mt-8 px-6 py-2 bg-red-500 text-white rounded-lg font-bold"
                    >
                        Reload Application
                    </button>
                </div>
            );
        }

        return this.props.children;
    }
}

export default ErrorBoundary;

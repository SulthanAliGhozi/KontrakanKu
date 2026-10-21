import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children?: ReactNode;
  fallbackMessage?: string;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false
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
        <div className="p-6 m-4 bg-red-900/20 border border-red-500/50 rounded-2xl flex flex-col items-center justify-center text-center">
          <h2 className="text-xl font-bold text-red-500 mb-2">Terjadi Kesalahan di Fitur Ini</h2>
          <p className="text-red-300 text-sm mb-4">
            {this.props.fallbackMessage || 'Maaf, bagian ini mengalami masalah dan tidak dapat ditampilkan.'}
          </p>
          <pre className="text-xs text-red-400 bg-red-950 p-2 rounded w-full overflow-x-auto text-left">
            {this.state.error?.message}
          </pre>
          <button 
            onClick={() => this.setState({ hasError: false })}
            className="mt-4 px-4 py-2 bg-red-500 hover:bg-red-400 text-white rounded-lg text-sm font-bold"
          >
            Coba Lagi
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

import React, { StrictMode, Component, ErrorInfo, ReactNode } from 'react';
import { createRoot } from 'react-dom/client';
import './lib/sensitiveLocalCache';
import App from './App';
import { AppLockGate } from './components/AppLockGate';
import { LanguageProvider } from './lib/LanguageContext';
import './index.css';

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  props: ErrorBoundaryProps;
  state: ErrorBoundaryState = { hasError: false, error: null };

  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.props = props;
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("App Root Error caught by ErrorBoundary:", error, errorInfo);
  }

  handleReset = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#0f1d31] flex flex-col items-center justify-center p-6 text-center text-white" dir="rtl">
          <div className="w-16 h-16 rounded-2xl bg-rose-950/60 border border-rose-500/40 flex items-center justify-center mb-4 shadow-xl">
            <span className="text-2xl">⚠️</span>
          </div>
          <h1 className="text-xl font-black text-white mb-2">حدث خطأ أثناء تحميل المعاينة</h1>
          <p className="text-stone-300 text-xs max-w-md mb-6 leading-relaxed">
            {this.state.error?.message || "تعذر إكمال تصيير الصفحة، يمكنك إعادة التحميل."}
          </p>
          <button
            type="button"
            onClick={this.handleReset}
            className="px-6 py-2.5 bg-[#c9a84c] hover:bg-[#d8b759] active:scale-95 text-[#172a46] rounded-xl font-black text-xs shadow-lg transition-all"
          >
            إعادة تحميل التطبيق
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

const container = document.getElementById('root');
if (container) {
  const root = createRoot(container);
  root.render(
    <StrictMode>
      <ErrorBoundary>
        <LanguageProvider>
          <AppLockGate>
            <App />
          </AppLockGate>
        </LanguageProvider>
      </ErrorBoundary>
    </StrictMode>
  );
}

import { Component, type ErrorInfo, type ReactNode } from 'react';
import { RotateCcw, AlertTriangle } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught React Error:', error, errorInfo);
  }

  public handleReset = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen w-full flex items-center justify-center bg-[#f5f5f7] p-4 font-sans text-[#1d1d1f]">
          <div className="w-full max-w-md bg-white/95 backdrop-blur-3xl border border-black/10 rounded-[28px] p-7 shadow-2xl shadow-black/10 text-center space-y-5 animate-apple-spring">
            {/* Header */}
            <div className="flex items-center justify-between pb-2 border-b border-black/[0.06]">
              <span className="text-xs font-semibold text-[#86868b]">Knowledge Base System</span>
            </div>

            <div className="w-14 h-14 rounded-2xl bg-[#ff3b30]/10 border border-[#ff3b30]/20 flex items-center justify-center text-[#ff3b30] mx-auto">
              <AlertTriangle className="w-7 h-7" />
            </div>

            <div>
              <h2 className="text-base font-semibold text-[#1d1d1f]">
                Đã xảy ra sự cố hiển thị
              </h2>
              <p className="text-xs text-[#6e6e73] mt-1.5 leading-relaxed">
                Ứng dụng vừa phát hiện một lỗi giao diện không mong muốn. Dữ liệu của bạn vẫn được an toàn.
              </p>
              {this.state.error?.message && (
                <p className="text-[11px] font-mono text-[#ff3b30] bg-[#ff3b30]/5 border border-[#ff3b30]/15 rounded-xl p-2.5 mt-3 text-left overflow-x-auto">
                  {this.state.error.message}
                </p>
              )}
            </div>

            <button
              type="button"
              onClick={this.handleReset}
              className="w-full py-2.5 px-4 rounded-xl bg-[#0071e3] hover:bg-[#0077ed] text-white text-xs font-medium shadow-md shadow-blue-500/20 transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-95"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Tải lại trang</span>
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

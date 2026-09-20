import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  Eye,
  EyeOff,
  Lock,
  Mail,
  Loader2,
  FolderGit2,
  ArrowRight,
} from 'lucide-react';
import { authApi } from '../api/auth';
import { useAuthStore } from '../store/authStore';
import { AppleToast, type ToastType } from '../components/AppleToast';

export const Login: React.FC = () => {
  const navigate = useNavigate();
  const setAuth = useAuthStore((state) => state.setAuth);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [toastType, setToastType] = useState<ToastType>('error');
  const [isShaking, setIsShaking] = useState(false);

  const triggerShake = () => {
    setIsShaking(true);
    setTimeout(() => setIsShaking(false), 450);
  };

  const showToast = (msg: string, type: ToastType = 'error') => {
    setToastMessage(msg);
    setToastType(type);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email.trim() || !password) {
      showToast('Vui lòng nhập đầy đủ Email và Mật khẩu.', 'warning');
      triggerShake();
      return;
    }

    setIsLoading(true);
    try {
      const response = await authApi.login({
        email: email.trim(),
        password,
      });

      if (response.success && response.data) {
        setAuth(response.data.user, response.data.tokens);
        navigate('/dashboard');
      }
    } catch (err: any) {
      const msg =
        err.response?.data?.message ||
        'Đăng nhập không thành công. Vui lòng kiểm tra lại thông tin.';
      showToast(msg, 'error');
      triggerShake();
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center bg-[#f5f5f7] relative overflow-hidden px-4 py-12 selection:bg-[#0071e3]/20">
      {/* Apple Ambient Pastel Glow Orbs */}
      <div className="absolute -top-32 -right-32 w-96 h-96 rounded-full bg-gradient-to-br from-[#0071e3]/10 to-[#5856d6]/10 blur-[120px] pointer-events-none" />
      <div className="absolute -bottom-32 -left-32 w-96 h-96 rounded-full bg-gradient-to-tr from-[#ff9500]/10 to-[#af52de]/10 blur-[120px] pointer-events-none" />

      {/* Main Container */}
      <div className="w-full max-w-[440px] relative z-10 animate-apple-spring">
        {/* Apple Brand Squircle Glyph */}
        <div className="text-center mb-7">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-[22px] bg-gradient-to-b from-[#0077ed] to-[#005bb5] shadow-[0_12px_28px_rgba(0,113,227,0.28)] border border-white/30 mb-3.5 transition-transform hover:scale-105 duration-300">
            <FolderGit2 className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-semibold tracking-tight text-[#1d1d1f]">
            Knowledge ID
          </h1>
          <p className="text-xs text-[#86868b] mt-1 font-normal">
            Một tài khoản cho tất cả dự án và tài liệu tri thức
          </p>
        </div>

        {/* Apple Glass Card */}
        <div className={`bg-white/90 backdrop-blur-2xl border border-black/[0.08] rounded-[32px] p-7 sm:p-9 shadow-[0_20px_50px_-15px_rgba(0,0,0,0.08)] space-y-5 ${isShaking ? 'animate-apple-shake' : ''}`}>
          {/* Unified Apple ID Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Unified Input Group (Apple ID Style) */}
            <div className="rounded-2xl border border-black/[0.12] bg-[#fbfbfd] focus-within:bg-white focus-within:border-[#0071e3] focus-within:ring-4 focus-within:ring-[#0071e3]/12 transition-all overflow-hidden shadow-xs">
              {/* Email Row */}
              <div className="relative flex items-center px-4 py-3">
                <Mail className="w-4 h-4 text-[#86868b] mr-3 flex-shrink-0" />
                <div className="flex-1">
                  <label className="block text-[10px] uppercase font-semibold text-[#86868b] tracking-wider mb-0.5">
                    Email
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@example.com"
                    className="w-full text-xs text-[#1d1d1f] placeholder-[#86868b] bg-transparent border-none p-0 focus:outline-none focus:ring-0 font-medium"
                    required
                    autoComplete="email"
                  />
                </div>
              </div>

              {/* Hairline Divider */}
              <div className="h-px bg-black/[0.06] w-full" />

              {/* Password Row */}
              <div className="relative flex items-center px-4 py-3">
                <Lock className="w-4 h-4 text-[#86868b] mr-3 flex-shrink-0" />
                <div className="flex-1">
                  <label className="block text-[10px] uppercase font-semibold text-[#86868b] tracking-wider mb-0.5">
                    Mật khẩu
                  </label>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full text-xs text-[#1d1d1f] placeholder-[#86868b] bg-transparent border-none p-0 focus:outline-none focus:ring-0 font-medium"
                    required
                    autoComplete="current-password"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="ml-2 text-[#86868b] hover:text-[#1d1d1f] transition-colors p-1 cursor-pointer"
                  tabIndex={-1}
                  aria-label={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                >
                  {showPassword ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>

            {/* Remember Me & System Info */}
            <div className="flex items-center justify-between text-xs px-1">
              <label className="flex items-center gap-2 text-[#6e6e73] hover:text-[#1d1d1f] cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="w-3.5 h-3.5 rounded border-black/20 text-[#0071e3] focus:ring-[#0071e3]/20 cursor-pointer"
                />
                <span>Ghi nhớ Knowledge ID</span>
              </label>
              <span className="text-[#86868b] text-[11px]">
                Hệ thống nội bộ
              </span>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 px-5 rounded-xl bg-[#0071e3] hover:bg-[#0077ed] active:bg-[#005bb5] text-white font-medium text-xs shadow-md shadow-blue-500/20 flex items-center justify-center gap-2 transition-all active:scale-[0.99] disabled:opacity-50 cursor-pointer mt-2"
            >
              {isLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <span>Tiếp tục</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </>
              )}
            </button>
          </form>

          {/* Card Footer */}
          <div className="pt-4 border-t border-black/[0.06] text-center text-xs text-[#86868b]">
            Chưa có tài khoản?{' '}
            <Link
              to="/register"
              className="text-[#0071e3] hover:underline font-medium transition-colors"
            >
              Đăng ký tài khoản mới
            </Link>
          </div>
        </div>

        {/* Minimalist Apple Privacy & Security Footer */}
        <div className="mt-8 text-center text-[11px] text-[#86868b] flex items-center justify-center gap-2">
          <span>Knowledge Base</span>
          <span>•</span>
          <span>Bảo mật JWT</span>
          <span>•</span>
          <span>Phân quyền RBAC</span>
        </div>
      </div>

      {/* Apple Notification Toast (Top-Right) */}
      <AppleToast
        message={toastMessage}
        type={toastType}
        onClose={() => setToastMessage(null)}
      />
    </div>
  );
};

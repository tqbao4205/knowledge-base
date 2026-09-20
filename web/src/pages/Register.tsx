import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { UserPlus, User, Lock, Mail, FolderGit2, Check } from 'lucide-react';
import { authApi } from '../api/auth';
import { AppleToast, type ToastType } from '../components/AppleToast';

export const Register: React.FC = () => {
  const navigate = useNavigate();

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
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

  const isPasswordValid = password.length >= 8;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!fullName.trim() || !email.trim() || !password) {
      showToast('Vui lòng điền đầy đủ tất cả các trường.', 'warning');
      triggerShake();
      return;
    }

    if (!isPasswordValid) {
      showToast('Mật khẩu bắt buộc phải có tối thiểu 8 ký tự.', 'warning');
      triggerShake();
      return;
    }

    setIsLoading(true);
    try {
      const response = await authApi.register({
        fullName: fullName.trim(),
        email: email.trim(),
        password,
      });

      if (response.success) {
        showToast('Đăng ký tài khoản thành công! Đang chuyển hướng...', 'success');
        setTimeout(() => {
          navigate('/login');
        }, 1500);
      }
    } catch (err: any) {
      const msg =
        err.response?.data?.message ||
        'Đăng ký không thành công. Vui lòng kiểm tra lại thông tin.';
      showToast(msg, 'error');
      triggerShake();
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-[#f5f5f7] relative overflow-hidden px-4 py-12">
      {/* Subtle Apple Pastel Radial Glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[500px] rounded-full bg-gradient-to-b from-blue-500/8 to-transparent blur-[140px] pointer-events-none" />

      {/* Main Container */}
      <div className="w-full max-w-[460px] relative z-10 animate-apple-spring">
        {/* Apple Brand Squircle Glyph */}
        <div className="text-center mb-7">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-[22px] bg-gradient-to-b from-[#0077ed] to-[#005bb5] shadow-[0_12px_28px_rgba(0,113,227,0.28)] border border-white/30 mb-3.5 transition-transform hover:scale-105 duration-300">
            <FolderGit2 className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-semibold tracking-tight text-[#1d1d1f]">
            Tạo tài khoản mới
          </h1>
          <p className="text-xs text-[#86868b] mt-1 font-normal">
            Gia nhập không gian làm việc Knowledge Base
          </p>
        </div>

        {/* White Apple Card */}
        <div className={`bg-white/90 backdrop-blur-2xl border border-black/[0.08] rounded-[32px] p-7 sm:p-9 shadow-[0_20px_50px_-15px_rgba(0,0,0,0.08)] space-y-6 ${isShaking ? 'animate-apple-shake' : ''}`}>
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Unified Input Group (Apple ID Style) */}
            <div className="rounded-2xl border border-black/[0.12] bg-[#fbfbfd] focus-within:bg-white focus-within:border-[#0071e3] focus-within:ring-4 focus-within:ring-[#0071e3]/12 transition-all overflow-hidden shadow-xs">
              {/* Full Name Row */}
              <div className="relative flex items-center px-4 py-3">
                <User className="w-4 h-4 text-[#86868b] mr-3 flex-shrink-0" />
                <div className="flex-1">
                  <label className="block text-[10px] uppercase font-semibold text-[#86868b] tracking-wider mb-0.5">
                    Họ và tên
                  </label>
                  <input
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Nguyễn Văn A"
                    className="w-full text-xs text-[#1d1d1f] placeholder-[#86868b] bg-transparent border-none p-0 focus:outline-none focus:ring-0 font-medium"
                    required
                  />
                </div>
              </div>

              {/* Hairline Divider */}
              <div className="h-px bg-black/[0.06] w-full" />

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
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Tối thiểu 8 ký tự"
                    className="w-full text-xs text-[#1d1d1f] placeholder-[#86868b] bg-transparent border-none p-0 focus:outline-none focus:ring-0 font-medium"
                    required
                    autoComplete="new-password"
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center gap-1.5 text-[11px] px-1">
              <div
                className={`w-3.5 h-3.5 rounded-full flex items-center justify-center border ${
                  isPasswordValid
                    ? 'bg-[#34c759]/15 text-[#16a34a] border-[#34c759]/30'
                    : 'bg-black/[0.04] text-[#86868b] border-black/[0.08]'
                }`}
              >
                <Check className="w-2.5 h-2.5" />
              </div>
              <span className={isPasswordValid ? 'text-[#16a34a] font-medium' : 'text-[#86868b]'}>
                Mật khẩu tối thiểu 8 ký tự
              </span>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 px-5 rounded-xl bg-[#0071e3] hover:bg-[#0077ed] active:bg-[#005bb5] text-white font-medium text-xs shadow-md shadow-blue-500/20 flex items-center justify-center gap-2 transition-all active:scale-[0.99] disabled:opacity-50 cursor-pointer mt-3"
            >
              {isLoading ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <UserPlus className="w-3.5 h-3.5" />
                  <span>Đăng ký tài khoản</span>
                </>
              )}
            </button>
          </form>

          <div className="mt-6 pt-4 border-t border-black/[0.06] text-center text-xs text-[#6e6e73]">
            Đã có tài khoản?{' '}
            <Link
              to="/login"
              className="text-[#0071e3] hover:underline font-medium transition-colors"
            >
              Đăng nhập ngay
            </Link>
          </div>
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

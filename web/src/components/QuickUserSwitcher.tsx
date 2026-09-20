import React, { useState } from 'react';
import {
  Crown,
  ShieldCheck,
  FileEdit,
  Eye,
  Sparkles,
  ArrowRightLeft,
  X,
  Check,
  Loader2,
} from 'lucide-react';
import { authApi } from '../api/auth';
import { useAuthStore } from '../store/authStore';

export interface DemoAccount {
  email: string;
  password: string;
  name: string;
  role: string;
  roleVi: string;
  desc: string;
  badgeClass: string;
  accentColor: string;
  icon: React.ComponentType<{ className?: string }>;
}

export const DEMO_ACCOUNTS: DemoAccount[] = [
  {
    email: 'owner@knowledgebase.com',
    password: 'Password123',
    name: 'Nguyễn Văn Owner',
    role: 'Owner',
    roleVi: 'Chủ sở hữu',
    desc: 'Toàn quyền dự án, quản lý thành viên & xóa mọi tài liệu',
    badgeClass: 'bg-[#ff9500]/10 text-[#d97706] border-[#ff9500]/25',
    accentColor: '#ff9500',
    icon: Crown,
  },
  {
    email: 'manager@knowledgebase.com',
    password: 'Password123',
    name: 'Trần Thị Manager',
    role: 'Manager',
    roleVi: 'Quản lý dự án',
    desc: 'Thêm/quản lý thành viên, sửa dự án & quản lý tài liệu',
    badgeClass: 'bg-[#0071e3]/10 text-[#0071e3] border-[#0071e3]/25',
    accentColor: '#0071e3',
    icon: ShieldCheck,
  },
  {
    email: 'editor@knowledgebase.com',
    password: 'Password123',
    name: 'Lê Văn Editor',
    role: 'Editor',
    roleVi: 'Biên tập viên',
    desc: 'Tải lên tài liệu mới & xóa tài liệu do chính mình tạo',
    badgeClass: 'bg-[#34c759]/10 text-[#16a34a] border-[#34c759]/25',
    accentColor: '#34c759',
    icon: FileEdit,
  },
  {
    email: 'viewer@knowledgebase.com',
    password: 'Password123',
    name: 'Phạm Thị Viewer',
    role: 'Viewer',
    roleVi: 'Người xem',
    desc: 'Chỉ xem và tải về tài liệu qua Presigned S3 (Read-only)',
    badgeClass: 'bg-[#af52de]/10 text-[#9333ea] border-[#af52de]/25',
    accentColor: '#af52de',
    icon: Eye,
  },
  {
    email: 'admin@knowledgebase.com',
    password: 'Admin12345',
    name: 'System Admin',
    role: 'Admin',
    roleVi: 'Quản trị hệ thống',
    desc: 'Toàn quyền tối cao cấp hệ thống Knowledge Base',
    badgeClass: 'bg-[#ff3b30]/10 text-[#dc2626] border-[#ff3b30]/25',
    accentColor: '#ff3b30',
    icon: Sparkles,
  },
];

export const QuickUserSwitcher: React.FC = () => {
  const { user, setAuth } = useAuthStore();
  const [isOpen, setIsOpen] = useState(false);
  const [switchingEmail, setSwitchingEmail] = useState<string | null>(null);

  const handleSwitchAccount = async (account: DemoAccount) => {
    if (user?.email === account.email) {
      setIsOpen(false);
      return;
    }

    setSwitchingEmail(account.email);
    try {
      const response = await authApi.login({
        email: account.email,
        password: account.password,
      });

      if (response.success && response.data) {
        setAuth(response.data.user, response.data.tokens);
        setIsOpen(false);
        window.location.reload();
      }
    } catch (error) {
      console.error('Switch account failed', error);
    } finally {
      setSwitchingEmail(null);
    }
  };

  const currentAccount = DEMO_ACCOUNTS.find((acc) => acc.email === user?.email);

  return (
    <div className="fixed bottom-6 right-6 z-50">
      {/* Popover Card */}
      {isOpen && (
        <div className="absolute bottom-14 right-0 w-84 bg-white/95 backdrop-blur-3xl border border-black/10 rounded-3xl p-4 shadow-2xl shadow-black/15 mb-2 animate-apple-spring">
          <div className="flex items-center justify-between pb-3 border-b border-black/[0.06]">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-xl bg-[#0071e3]/10 text-[#0071e3]">
                <ArrowRightLeft className="w-3.5 h-3.5" />
              </div>
              <div>
                <h4 className="text-xs font-semibold text-[#1d1d1f]">Chuyển vai trò test</h4>
                <p className="text-[10px] text-[#86868b]">Kiểm tra phân quyền RBAC tức thì</p>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="text-[#86868b] hover:text-[#1d1d1f] p-1 rounded-full hover:bg-black/5 transition-colors cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="mt-3 space-y-2 max-h-[360px] overflow-y-auto pr-1">
            {DEMO_ACCOUNTS.map((acc) => {
              const isCurrent = user?.email === acc.email;
              const isSwitching = switchingEmail === acc.email;
              const Icon = acc.icon;

              return (
                <button
                  key={acc.email}
                  disabled={isSwitching}
                  onClick={() => handleSwitchAccount(acc)}
                  className={`w-full text-left p-2.5 rounded-2xl border transition-all flex items-start gap-3 group cursor-pointer ${
                    isCurrent
                      ? 'bg-[#0071e3]/5 border-[#0071e3]/30'
                      : 'bg-black/[0.02] border-black/[0.06] hover:bg-black/[0.05] hover:border-black/10'
                  }`}
                >
                  <div
                    className={`mt-0.5 p-2 rounded-xl border flex-shrink-0 ${acc.badgeClass}`}
                  >
                    {isSwitching ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-[#0071e3]" />
                    ) : (
                      <Icon className="w-3.5 h-3.5" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1">
                      <span className="text-xs font-semibold text-[#1d1d1f] truncate">
                        {acc.name}
                      </span>
                      {isCurrent ? (
                        <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-[#0071e3] bg-[#0071e3]/10 px-1.5 py-0.5 rounded-md border border-[#0071e3]/25">
                          <Check className="w-2.5 h-2.5" /> Đang dùng
                        </span>
                      ) : (
                        <span
                          className={`text-[10px] font-medium px-1.5 py-0.5 rounded-md border ${acc.badgeClass}`}
                        >
                          {acc.role}
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] font-mono text-[#86868b] truncate mt-0.5">{acc.email}</p>
                    <p className="text-[10px] text-[#6e6e73] mt-1 leading-snug line-clamp-2">
                      {acc.desc}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Apple Floating Pill Action Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2.5 px-4 py-2 rounded-full bg-white/95 hover:bg-white text-[#1d1d1f] border border-black/10 shadow-xl shadow-black/10 backdrop-blur-2xl transition-all duration-200 hover:scale-105 active:scale-95 group cursor-pointer"
        title="Chuyển nhanh vai trò kiểm thử phân quyền (RBAC)"
      >
        <div className="w-2 h-2 rounded-full bg-[#34c759] animate-pulse" />
        <div className="flex items-center gap-1.5 text-xs font-medium">
          <ArrowRightLeft className="w-3.5 h-3.5 text-[#0071e3] group-hover:rotate-180 transition-transform duration-300" />
          <span className="text-[#86868b]">Vai trò:</span>
          <span className="font-semibold text-[#1d1d1f]">
            {currentAccount?.role || user?.fullName || 'Tài khoản'}
          </span>
        </div>
      </button>
    </div>
  );
};

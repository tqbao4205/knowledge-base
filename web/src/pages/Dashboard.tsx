import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  LogOut,
  FolderGit2,
  Plus,
  Users,
  ArrowRight,
  FolderPlus,
  Search,
  X,
  ShieldCheck,
} from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { authApi } from '../api/auth';
import { projectApi } from '../api/project';
import type { Project } from '../types/project';
import { AppleToast, type ToastType } from '../components/AppleToast';

export const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const { user, logout, setUser } = useAuthStore();

  // Toast Notification State
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [toastType, setToastType] = useState<ToastType>('success');

  const showToast = (msg: string, type: ToastType = 'success') => {
    setToastMessage(msg);
    setToastType(type);
  };

  // Projects State
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoadingProjects, setIsLoadingProjects] = useState(true);
  const [searchProjectQuery, setSearchProjectQuery] = useState('');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [projectName, setProjectName] = useState('');
  const [projectDesc, setProjectDesc] = useState('');
  const [isCreatingProject, setIsCreatingProject] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  const fetchProjects = async () => {
    setIsLoadingProjects(true);
    try {
      const res = await projectApi.getMyProjects();
      if (res.success && res.data) {
        setProjects(res.data.content);
      }
    } catch {
      // Handled by axios interceptor
    } finally {
      setIsLoadingProjects(false);
    }
  };

  useEffect(() => {
    authApi
      .getProfile()
      .then((res) => {
        if (res.success && res.data) {
          setUser(res.data);
        }
      })
      .catch(() => {});

    fetchProjects();
  }, [setUser]);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!projectName.trim()) return;

    setIsCreatingProject(true);
    setCreateError(null);

    try {
      const res = await projectApi.createProject({
        name: projectName.trim(),
        description: projectDesc.trim() || undefined,
      });

      if (res.success && res.data) {
        setIsCreateModalOpen(false);
        setProjectName('');
        setProjectDesc('');
        showToast(`Đã tạo dự án "${res.data.name}" thành công!`, 'success');
        navigate(`/projects/${res.data.id}`);
      }
    } catch (err: any) {
      setCreateError(
        err.response?.data?.message || 'Không thể tạo dự án. Vui lòng thử lại.'
      );
    } finally {
      setIsCreatingProject(false);
    }
  };

  // Filtered projects by search query
  const filteredProjects = useMemo(() => {
    if (!searchProjectQuery.trim()) return projects;
    const q = searchProjectQuery.toLowerCase();
    return projects.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        (p.description && p.description.toLowerCase().includes(q))
    );
  }, [projects, searchProjectQuery]);

  return (
    <div className="min-h-screen bg-[#f5f5f7] text-[#1d1d1f] flex flex-col font-sans selection:bg-[#0071e3]/20">

      {/* Apple macOS Top Navigation Bar */}
      <header className="border-b border-black/[0.06] bg-white/80 backdrop-blur-2xl sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-[12px] bg-white border border-black/[0.08] flex items-center justify-center shadow-sm">
              <FolderGit2 className="w-5 h-5 text-[#0071e3]" />
            </div>
            <div>
              <span className="font-semibold text-[#1d1d1f] text-sm tracking-tight">
                Knowledge Base
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {user?.systemRoles?.includes('ROLE_SYSTEM_ADMIN') && (
              <Link
                to="/admin"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#0071e3]/10 hover:bg-[#0071e3]/15 text-[#0071e3] text-xs font-semibold border border-[#0071e3]/20 shadow-sm transition-all duration-200 cursor-pointer"
              >
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Admin Portal</span>
              </Link>
            )}
            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-black/[0.03] border border-black/[0.06] text-xs">
              <div className="w-2 h-2 rounded-full bg-[#34c759] animate-pulse" />
              <span className="text-[#6e6e73] font-medium">{user?.fullName || user?.email}</span>
            </div>
            <button
              onClick={handleLogout}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-black/[0.03] hover:bg-[#ff3b30]/10 text-[#6e6e73] hover:text-[#ff3b30] text-xs font-medium border border-black/[0.06] hover:border-[#ff3b30]/20 transition-all duration-200 cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Đăng xuất</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 animate-apple-spring">
        {/* Projects Section Header with Live Search & New Project Button */}
        <section className="space-y-5">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-[#1d1d1f] flex items-center gap-2">
                <FolderGit2 className="w-4 h-4 text-[#0071e3]" />
                Dự án của bạn ({filteredProjects.length})
              </h2>
              <p className="text-xs text-[#86868b] mt-0.5">
                Các dự án bạn đang tham gia hoặc sở hữu quyền quản trị
              </p>
            </div>

            <div className="flex items-center gap-2.5">
              {/* Spotlight Project Search Input */}
              <div className="relative group min-w-[200px] sm:min-w-[240px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#86868b] group-focus-within:text-[#0071e3] transition-colors" />
                <input
                  type="text"
                  value={searchProjectQuery}
                  onChange={(e) => setSearchProjectQuery(e.target.value)}
                  placeholder="Lọc tên dự án..."
                  className="w-full pl-8 pr-7 py-1.5 rounded-full bg-white hover:bg-black/[0.02] focus:bg-white border border-black/[0.08] focus:border-[#0071e3] text-[#1d1d1f] placeholder-[#86868b] text-xs focus:outline-none focus:ring-2 focus:ring-[#0071e3]/15 transition-all shadow-sm"
                />
                {searchProjectQuery && (
                  <button
                    onClick={() => setSearchProjectQuery('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 rounded-full text-[#86868b] hover:text-[#1d1d1f]"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>

              <button
                onClick={() => setIsCreateModalOpen(true)}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full bg-[#0071e3] hover:bg-[#0077ed] text-white text-xs font-semibold shadow-md shadow-blue-500/20 transition-all duration-200 active:scale-95 cursor-pointer whitespace-nowrap"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Tạo Dự án</span>
              </button>
            </div>
          </div>

          {/* Project List / Grid */}
          {isLoadingProjects ? (
            <div className="p-16 text-center text-[#86868b] text-xs">Đang tải danh sách dự án...</div>
          ) : filteredProjects.length === 0 ? (
            <div className="p-12 rounded-[28px] bg-white border border-black/[0.08] text-center space-y-3 shadow-sm">
              <div className="w-12 h-12 rounded-2xl bg-black/[0.03] border border-black/[0.06] flex items-center justify-center text-[#0071e3] mx-auto">
                <FolderPlus className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-[#1d1d1f]">
                  {searchProjectQuery ? 'Không tìm thấy dự án phù hợp' : 'Chưa có dự án nào'}
                </h3>
                <p className="text-xs text-[#86868b] mt-1 max-w-sm mx-auto">
                  {searchProjectQuery
                    ? 'Thử thay đổi từ khóa tìm kiếm của bạn.'
                    : 'Bắt đầu bằng cách tạo dự án đầu tiên để lưu trữ tài liệu trên MinIO S3.'}
                </p>
              </div>
              {!searchProjectQuery && (
                <button
                  onClick={() => setIsCreateModalOpen(true)}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-[#0071e3] hover:bg-[#0077ed] text-white text-xs font-medium cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Tạo dự án mới</span>
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {filteredProjects.map((proj) => {
                const isOwner = proj.myRole === 'Owner';
                const isManager = proj.myRole === 'Manager';
                const isEditor = proj.myRole === 'Editor';

                return (
                  <Link
                    key={proj.id}
                    to={`/projects/${proj.id}`}
                    className="apple-glass-card rounded-[24px] p-5 flex flex-col justify-between group cursor-pointer"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-3 mb-3">
                        <div className="w-10 h-10 rounded-[14px] bg-[#0071e3]/10 border border-[#0071e3]/20 flex items-center justify-center text-[#0071e3] group-hover:bg-[#0071e3]/20 transition-colors">
                          <FolderGit2 className="w-5 h-5" />
                        </div>
                        <span
                          className={`text-[10px] px-2.5 py-0.5 rounded-full font-semibold border ${
                            isOwner
                              ? 'bg-[#ff9500]/10 text-[#d97706] border-[#ff9500]/25'
                              : isManager
                              ? 'bg-[#0071e3]/10 text-[#0071e3] border-[#0071e3]/25'
                              : isEditor
                              ? 'bg-[#34c759]/10 text-[#16a34a] border-[#34c759]/25'
                              : 'bg-[#af52de]/10 text-[#9333ea] border-[#af52de]/25'
                          }`}
                        >
                          {proj.myRole}
                        </span>
                      </div>

                      <h3 className="font-semibold text-[#1d1d1f] text-sm tracking-tight group-hover:text-[#0071e3] transition-colors line-clamp-1">
                        {proj.name}
                      </h3>
                      <p className="text-[#6e6e73] text-xs mt-1 line-clamp-2 min-h-[32px] font-normal leading-relaxed">
                        {proj.description || 'Không có mô tả chi tiết'}
                      </p>
                    </div>

                    <div className="pt-4 mt-4 border-t border-black/[0.06] flex items-center justify-between text-xs text-[#86868b]">
                      <div className="flex items-center gap-1.5 text-[11px]">
                        <Users className="w-3.5 h-3.5 text-[#86868b]" />
                        <span>{proj.memberCount} thành viên</span>
                      </div>
                      <div className="flex items-center gap-1 text-[#0071e3] text-xs font-medium group-hover:translate-x-0.5 transition-transform">
                        <span>Chi tiết</span>
                        <ArrowRight className="w-3 h-3" />
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </section>
      </main>

      {/* macOS Sheet Style Modal: Create Project */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div
            className="fixed inset-0 bg-black/30 backdrop-blur-md"
            onClick={() => setIsCreateModalOpen(false)}
          />

          <div className="relative w-full max-w-md bg-white/95 backdrop-blur-3xl border border-black/10 rounded-[30px] p-6 shadow-2xl shadow-black/15 space-y-5 animate-apple-spring z-10">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 border-b border-black/[0.06]">
              <h3 className="text-sm font-semibold text-[#1d1d1f]">
                Tạo Dự án Mới
              </h3>
              <button
                type="button"
                onClick={() => setIsCreateModalOpen(false)}
                className="p-1 rounded-full text-[#86868b] hover:text-[#1d1d1f] hover:bg-black/5 transition-colors cursor-pointer"
                title="Đóng"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {createError && (
              <div className="p-3 rounded-xl bg-[#ff3b30]/10 border border-[#ff3b30]/20 text-[#ff3b30] text-xs">
                {createError}
              </div>
            )}

            <form onSubmit={handleCreateProject} className="space-y-4">
              <div>
                <label className="block text-[11px] font-medium text-[#6e6e73] mb-1.5 uppercase tracking-wider">
                  Tên dự án *
                </label>
                <input
                  type="text"
                  value={projectName}
                  onChange={(e) => setProjectName(e.target.value)}
                  placeholder="Ví dụ: Báo cáo Chiến lược 2026"
                  className="w-full px-3.5 py-2 rounded-2xl bg-black/[0.02] border border-black/[0.08] focus:border-[#0071e3] text-[#1d1d1f] placeholder-[#86868b] text-xs focus:outline-none focus:ring-2 focus:ring-[#0071e3]/15 transition-all"
                  required
                />
              </div>

              <div>
                <label className="block text-[11px] font-medium text-[#6e6e73] mb-1.5 uppercase tracking-wider">
                  Mô tả dự án
                </label>
                <textarea
                  rows={3}
                  value={projectDesc}
                  onChange={(e) => setProjectDesc(e.target.value)}
                  placeholder="Mục tiêu tài liệu và phân quyền thành viên..."
                  className="w-full px-3.5 py-2 rounded-2xl bg-black/[0.02] border border-black/[0.08] focus:border-[#0071e3] text-[#1d1d1f] placeholder-[#86868b] text-xs focus:outline-none focus:ring-2 focus:ring-[#0071e3]/15 transition-all resize-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-black/[0.06]">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2 rounded-full text-xs text-[#6e6e73] hover:text-[#1d1d1f] hover:bg-black/[0.04] transition-colors cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={isCreatingProject}
                  className="px-5 py-2 rounded-full bg-[#0071e3] hover:bg-[#0077ed] text-white text-xs font-semibold shadow-md shadow-blue-500/20 transition-all cursor-pointer disabled:opacity-50 active:scale-95"
                >
                  {isCreatingProject ? 'Đang tạo...' : 'Tạo dự án'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Top-Right macOS Notification Banner */}
      <AppleToast
        message={toastMessage}
        type={toastType}
        onClose={() => setToastMessage(null)}
      />
    </div>
  );
};

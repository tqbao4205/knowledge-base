import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  ShieldCheck,
  Users,
  FolderGit2,
  FileText,
  Database,
  Search,
  Lock,
  Unlock,
  UserCog,
  ArrowLeft,
  LogOut,
  RefreshCw,
  X,
  Shield,
} from 'lucide-react';
import {
  PieChart,
  Pie,
  Cell,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
} from 'recharts';
import { useAuthStore } from '../store/authStore';
import { adminApi } from '../api/admin';
import type {
  AdminDashboardStats,
  AdminUser,
  AdminProject,
  AdminProjectMember,
} from '../types/admin';
import { AppleToast, type ToastType } from '../components/AppleToast';

export const AdminDashboard: React.FC = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();

  // Check admin role
  const isAdmin = user?.systemRoles?.includes('ROLE_SYSTEM_ADMIN');

  useEffect(() => {
    if (!isAdmin) {
      navigate('/dashboard', { replace: true });
    }
  }, [isAdmin, navigate]);

  // Toast State
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [toastType, setToastType] = useState<ToastType>('success');

  const showToast = (msg: string, type: ToastType = 'success') => {
    setToastMessage(msg);
    setToastType(type);
  };

  // Active Tab: 'overview' | 'users' | 'projects'
  const [activeTab, setActiveTab] = useState<'overview' | 'users' | 'projects'>('overview');

  // 1. Dashboard Stats
  const [stats, setStats] = useState<AdminDashboardStats | null>(null);
  const [isLoadingStats, setIsLoadingStats] = useState(false);

  // 2. Users Management
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);
  const [userSearchQuery, setUserSearchQuery] = useState('');
  const [userPage, setUserPage] = useState(0);

  // 3. Projects Overview
  const [projects, setProjects] = useState<AdminProject[]>([]);
  const [isLoadingProjects, setIsLoadingProjects] = useState(false);
  const [projectSearchQuery, setProjectSearchQuery] = useState('');
  const [projectPage, setProjectPage] = useState(0);

  // Modal: View Project Members
  const [selectedProject, setSelectedProject] = useState<AdminProject | null>(null);
  const [projectMembers, setProjectMembers] = useState<AdminProjectMember[]>([]);
  const [isLoadingMembers, setIsLoadingMembers] = useState(false);

  // Modal: Edit User Roles
  const [editingUser, setEditingUser] = useState<AdminUser | null>(null);
  const [selectedRoles, setSelectedRoles] = useState<string[]>([]);
  const [isUpdatingRoles, setIsUpdatingRoles] = useState(false);

  // Fetch Stats
  const fetchStats = async () => {
    setIsLoadingStats(true);
    try {
      const res = await adminApi.getDashboardStats();
      if (res.success && res.data) {
        setStats(res.data);
      }
    } catch {
      showToast('Không thể tải số liệu thống kê', 'error');
    } finally {
      setIsLoadingStats(false);
    }
  };

  // Fetch Users
  const fetchUsers = async (page = 0, search = userSearchQuery) => {
    setIsLoadingUsers(true);
    try {
      const res = await adminApi.getUsers(page, 15, search);
      if (res.success && res.data) {
        setUsers(res.data.content);
        setUserPage(res.data.page);
      }
    } catch {
      showToast('Không thể tải danh sách người dùng', 'error');
    } finally {
      setIsLoadingUsers(false);
    }
  };

  // Fetch Projects
  const fetchProjects = async (page = 0, search = projectSearchQuery) => {
    setIsLoadingProjects(true);
    try {
      const res = await adminApi.getProjects(page, 15, search);
      if (res.success && res.data) {
        setProjects(res.data.content);
        setProjectPage(res.data.page);
      }
    } catch {
      showToast('Không thể tải danh sách dự án', 'error');
    } finally {
      setIsLoadingProjects(false);
    }
  };

  useEffect(() => {
    fetchStats();
    fetchUsers(0, '');
    fetchProjects(0, '');
  }, []);

  // Visual Chart Data 1: Ingestion Status Pie/Donut Chart
  const ingestionChartData = useMemo(() => {
    if (!stats?.documentStatus) return [];
    return [
      { name: 'Thành công (Indexed)', value: stats.documentStatus.indexed, color: '#10b981' },
      { name: 'Đang xử lý (Processing)', value: stats.documentStatus.processing, color: '#f59e0b' },
      { name: 'Lỗi (Failed)', value: stats.documentStatus.failed, color: '#ef4444' },
    ].filter((item) => item.value > 0);
  }, [stats]);

  // Visual Chart Data 2: Top Projects Bar Chart
  const projectsChartData = useMemo(() => {
    if (!projects || projects.length === 0) return [];
    return [...projects]
      .sort((a, b) => b.documentCount - a.documentCount || b.memberCount - a.memberCount)
      .slice(0, 6)
      .map((p) => ({
        name: p.name.length > 14 ? p.name.slice(0, 13) + '…' : p.name,
        fullName: p.name,
        'Tài liệu': p.documentCount,
        'Thành viên': p.memberCount,
      }));
  }, [projects]);

  // Derived Metrics
  const totalDocs = stats?.totalDocuments || 0;
  const indexedDocs = stats?.documentStatus?.indexed || 0;
  const successRate = totalDocs > 0 ? Math.round((indexedDocs / totalDocs) * 100) : 100;

  // Handle Toggle User Status (Ban / Unban)
  const handleToggleStatus = async (targetUser: AdminUser) => {
    if (targetUser.email.toLowerCase() === user?.email.toLowerCase()) {
      showToast('Bạn không thể tự khóa tài khoản của chính mình', 'error');
      return;
    }

    const nextStatus = !targetUser.isActive;
    try {
      const res = await adminApi.updateUserStatus(targetUser.id, nextStatus);
      if (res.success) {
        setUsers((prev) =>
          prev.map((u) => (u.id === targetUser.id ? { ...u, isActive: nextStatus } : u))
        );
        showToast(
          nextStatus
            ? `Đã mở khóa tài khoản cho "${targetUser.fullName}"`
            : `Đã khóa tài khoản "${targetUser.fullName}"`,
          nextStatus ? 'success' : 'info'
        );
        fetchStats();
      }
    } catch (err: any) {
      showToast(err.response?.data?.message || 'Thao tác thất bại', 'error');
    }
  };

  // Open Edit Roles Modal
  const handleOpenEditRoles = (targetUser: AdminUser) => {
    setEditingUser(targetUser);
    setSelectedRoles([...targetUser.roles]);
  };

  // Save Roles
  const handleSaveRoles = async () => {
    if (!editingUser) return;
    if (selectedRoles.length === 0) {
      showToast('Phải chọn ít nhất một vai trò hệ thống', 'error');
      return;
    }

    setIsUpdatingRoles(true);
    try {
      const res = await adminApi.updateUserRoles(editingUser.id, selectedRoles);
      if (res.success && res.data) {
        setUsers((prev) =>
          prev.map((u) => (u.id === editingUser.id ? { ...u, roles: res.data.roles } : u))
        );
        showToast(`Đã cập nhật quyền cho "${editingUser.fullName}"`, 'success');
        setEditingUser(null);
      }
    } catch (err: any) {
      showToast(err.response?.data?.message || 'Cập nhật quyền thất bại', 'error');
    } finally {
      setIsUpdatingRoles(false);
    }
  };

  // Open Members Modal
  const handleViewMembers = async (proj: AdminProject) => {
    setSelectedProject(proj);
    setIsLoadingMembers(true);
    try {
      const res = await adminApi.getProjectMembers(proj.id);
      if (res.success && res.data) {
        setProjectMembers(res.data);
      }
    } catch {
      showToast('Không thể tải thành viên dự án', 'error');
    } finally {
      setIsLoadingMembers(false);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-[#f5f5f7] text-[#1d1d1f] flex flex-col font-sans selection:bg-[#0071e3]/20">
      {/* Top Header */}
      <header className="border-b border-black/[0.06] bg-white/80 backdrop-blur-2xl sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link
              to="/dashboard"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-black/[0.03] hover:bg-black/[0.06] text-[#1d1d1f] text-xs font-medium border border-black/[0.06] transition-all"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Về Dự án</span>
            </Link>
            <div className="h-4 w-[1px] bg-black/[0.08]" />
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-[10px] bg-[#0071e3]/10 border border-[#0071e3]/20 flex items-center justify-center shadow-sm">
                <ShieldCheck className="w-4 h-4 text-[#0071e3]" />
              </div>
              <div>
                <span className="font-semibold text-[#1d1d1f] text-sm tracking-tight flex items-center gap-1.5">
                  Admin Analytics & Portal
                  <span className="px-2 py-0.5 rounded-full bg-[#0071e3] text-white text-[10px] font-semibold tracking-wide">
                    PRIVACY-FIRST
                  </span>
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                fetchStats();
                if (activeTab === 'users') fetchUsers(userPage, userSearchQuery);
                if (activeTab === 'projects') fetchProjects(projectPage, projectSearchQuery);
              }}
              title="Làm mới dữ liệu"
              className="p-2 rounded-full hover:bg-black/[0.04] text-[#6e6e73] hover:text-[#1d1d1f] transition-all"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-black/[0.03] border border-black/[0.06] text-xs">
              <div className="w-2 h-2 rounded-full bg-[#0071e3] animate-pulse" />
              <span className="text-[#1d1d1f] font-medium">{user?.fullName || user?.email}</span>
            </div>
            <button
              onClick={handleLogout}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-black/[0.03] hover:bg-[#ff3b30]/10 text-[#6e6e73] hover:text-[#ff3b30] text-xs font-medium border border-black/[0.06] hover:border-[#ff3b30]/20 transition-all cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Đăng xuất</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6 animate-apple-spring">
        {/* Navigation Tabs (Apple Segmented Control) */}
        <div className="flex items-center justify-between flex-wrap gap-4 border-b border-black/[0.06] pb-4">
          <div className="flex items-center p-1 bg-black/[0.04] rounded-full border border-black/[0.04] text-xs font-medium">
            <button
              onClick={() => setActiveTab('overview')}
              className={`px-4 py-1.5 rounded-full transition-all duration-200 cursor-pointer ${
                activeTab === 'overview'
                  ? 'bg-white text-[#1d1d1f] shadow-sm font-semibold'
                  : 'text-[#86868b] hover:text-[#1d1d1f]'
              }`}
            >
              Biểu đồ & Tổng quan
            </button>
            <button
              onClick={() => setActiveTab('users')}
              className={`px-4 py-1.5 rounded-full transition-all duration-200 cursor-pointer ${
                activeTab === 'users'
                  ? 'bg-white text-[#1d1d1f] shadow-sm font-semibold'
                  : 'text-[#86868b] hover:text-[#1d1d1f]'
              }`}
            >
              Người dùng ({stats?.totalUsers ?? '...'})
            </button>
            <button
              onClick={() => setActiveTab('projects')}
              className={`px-4 py-1.5 rounded-full transition-all duration-200 cursor-pointer ${
                activeTab === 'projects'
                  ? 'bg-white text-[#1d1d1f] shadow-sm font-semibold'
                  : 'text-[#86868b] hover:text-[#1d1d1f]'
              }`}
            >
              Giám sát Dự án ({stats?.totalProjects ?? '...'})
            </button>
          </div>

          <div className="text-xs text-[#86868b] flex items-center gap-1.5">
            <Shield className="w-3.5 h-3.5 text-[#34c759]" />
            <span>Nội dung tài liệu & chat được bảo vệ theo dự án</span>
          </div>
        </div>

        {/* TAB 1: OVERVIEW WITH CLEAN VISUAL CHARTS */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* 4 Crisp Metric Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Total Users */}
              <div className="p-5 rounded-[22px] bg-white border border-black/[0.06] shadow-sm hover:shadow-md transition-all duration-200">
                <div className="flex items-center justify-between text-[#86868b]">
                  <span className="text-xs font-medium">Người dùng</span>
                  <Users className="w-4 h-4 text-[#0071e3]" />
                </div>
                <div className="mt-3 flex items-baseline gap-2">
                  <span className="text-2xl sm:text-3xl font-bold tracking-tight text-[#1d1d1f]">
                    {isLoadingStats ? '...' : stats?.totalUsers ?? 0}
                  </span>
                  {stats && stats.bannedUsers > 0 && (
                    <span className="text-[10px] font-semibold text-[#ff3b30] bg-[#ff3b30]/10 px-2 py-0.5 rounded-full">
                      {stats.bannedUsers} khóa
                    </span>
                  )}
                </div>
              </div>

              {/* Total Projects */}
              <div className="p-5 rounded-[22px] bg-white border border-black/[0.06] shadow-sm hover:shadow-md transition-all duration-200">
                <div className="flex items-center justify-between text-[#86868b]">
                  <span className="text-xs font-medium">Dự án</span>
                  <FolderGit2 className="w-4 h-4 text-purple-600" />
                </div>
                <div className="mt-3">
                  <span className="text-2xl sm:text-3xl font-bold tracking-tight text-[#1d1d1f]">
                    {isLoadingStats ? '...' : stats?.totalProjects ?? 0}
                  </span>
                </div>
              </div>

              {/* Total Documents */}
              <div className="p-5 rounded-[22px] bg-white border border-black/[0.06] shadow-sm hover:shadow-md transition-all duration-200">
                <div className="flex items-center justify-between text-[#86868b]">
                  <span className="text-xs font-medium">Tài liệu</span>
                  <FileText className="w-4 h-4 text-emerald-600" />
                </div>
                <div className="mt-3">
                  <span className="text-2xl sm:text-3xl font-bold tracking-tight text-[#1d1d1f]">
                    {isLoadingStats ? '...' : stats?.totalDocuments ?? 0}
                  </span>
                </div>
              </div>

              {/* Vector Chunks */}
              <div className="p-5 rounded-[22px] bg-white border border-black/[0.06] shadow-sm hover:shadow-md transition-all duration-200">
                <div className="flex items-center justify-between text-[#86868b]">
                  <span className="text-xs font-medium">Vector Chunks</span>
                  <Database className="w-4 h-4 text-amber-600" />
                </div>
                <div className="mt-3">
                  <span className="text-2xl sm:text-3xl font-bold tracking-tight text-[#1d1d1f]">
                    {isLoadingStats ? '...' : stats?.totalChunks ?? 0}
                  </span>
                </div>
              </div>
            </div>

            {/* VISUAL CHARTS SECTION */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
              {/* Chart 1: Donut Ingestion Status */}
              <div className="lg:col-span-5 p-6 rounded-[24px] bg-white border border-black/[0.06] shadow-sm flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-semibold text-[#1d1d1f]">Trạng thái Xử lý Tài liệu</h3>
                      <p className="text-[11px] text-[#86868b] mt-0.5">Tiến trình bóc tách và vector hóa RAG</p>
                    </div>
                    <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
                      {successRate}% thành công
                    </span>
                  </div>

                  {/* Donut Chart with Center Label */}
                  <div className="h-60 relative flex items-center justify-center my-2">
                    {ingestionChartData.length === 0 ? (
                      <div className="text-xs text-[#86868b]">Chưa có dữ liệu tài liệu</div>
                    ) : (
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={ingestionChartData}
                            cx="50%"
                            cy="50%"
                            innerRadius={68}
                            outerRadius={92}
                            paddingAngle={4}
                            dataKey="value"
                          >
                            {ingestionChartData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.color} stroke="none" />
                            ))}
                          </Pie>
                          <RechartsTooltip
                            content={({ active, payload }) => {
                              if (active && payload && payload.length) {
                                const data = payload[0];
                                return (
                                  <div className="bg-white/95 backdrop-blur-md px-3 py-2 rounded-xl shadow-lg border border-black/[0.08] text-xs">
                                    <div className="font-semibold text-[#1d1d1f]">{data.name}</div>
                                    <div className="text-[#6e6e73] mt-0.5">
                                      Số lượng: <strong className="text-[#1d1d1f]">{data.value}</strong>
                                    </div>
                                  </div>
                                );
                              }
                              return null;
                            }}
                          />
                        </PieChart>
                      </ResponsiveContainer>
                    )}

                    {/* Center Stat */}
                    {ingestionChartData.length > 0 && (
                      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                        <span className="text-2xl font-bold text-[#1d1d1f] tracking-tight">
                          {totalDocs}
                        </span>
                        <span className="text-[10px] font-medium text-[#86868b] uppercase tracking-wider">
                          Tài liệu
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Clean Horizontal Legend */}
                <div className="flex items-center justify-around pt-3 border-t border-black/[0.06] text-xs">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#10b981]" />
                    <span className="text-[#6e6e73]">Thành công: <strong>{stats?.documentStatus?.indexed ?? 0}</strong></span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#f59e0b]" />
                    <span className="text-[#6e6e73]">Đang chạy: <strong>{stats?.documentStatus?.processing ?? 0}</strong></span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#ef4444]" />
                    <span className="text-[#6e6e73]">Lỗi: <strong>{stats?.documentStatus?.failed ?? 0}</strong></span>
                  </div>
                </div>
              </div>

              {/* Chart 2: Top Projects Bar Chart */}
              <div className="lg:col-span-7 p-6 rounded-[24px] bg-white border border-black/[0.06] shadow-sm flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-semibold text-[#1d1d1f]">Quy mô Dự án Hàng đầu</h3>
                      <p className="text-[11px] text-[#86868b] mt-0.5">So sánh tài liệu và thành viên giữa các dự án</p>
                    </div>
                  </div>

                  {/* Bar Chart */}
                  <div className="h-60 mt-2">
                    {projectsChartData.length === 0 ? (
                      <div className="h-full flex items-center justify-center text-xs text-[#86868b]">
                        Chưa có dữ liệu dự án
                      </div>
                    ) : (
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                          data={projectsChartData}
                          margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                          barGap={4}
                        >
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f2f2f2" />
                          <XAxis
                            dataKey="name"
                            tick={{ fontSize: 11, fill: '#86868b' }}
                            axisLine={false}
                            tickLine={false}
                          />
                          <YAxis
                            allowDecimals={false}
                            tick={{ fontSize: 11, fill: '#86868b' }}
                            axisLine={false}
                            tickLine={false}
                          />
                          <RechartsTooltip
                            content={({ active, payload }) => {
                              if (active && payload && payload.length) {
                                const data = payload[0].payload;
                                return (
                                  <div className="bg-white/95 backdrop-blur-md px-3 py-2 rounded-xl shadow-lg border border-black/[0.08] text-xs space-y-1">
                                    <div className="font-semibold text-[#1d1d1f]">{data.fullName}</div>
                                    <div className="text-[#0071e3]">
                                      Tài liệu: <strong>{data['Tài liệu']}</strong>
                                    </div>
                                    <div className="text-purple-600">
                                      Thành viên: <strong>{data['Thành viên']}</strong>
                                    </div>
                                  </div>
                                );
                              }
                              return null;
                            }}
                          />
                          <Bar
                            dataKey="Tài liệu"
                            fill="#0071e3"
                            radius={[6, 6, 0, 0]}
                            maxBarSize={28}
                          />
                          <Bar
                            dataKey="Thành viên"
                            fill="#8b5cf6"
                            radius={[6, 6, 0, 0]}
                            maxBarSize={28}
                          />
                        </BarChart>
                      </ResponsiveContainer>
                    )}
                  </div>
                </div>

                {/* Bar Chart Legend */}
                <div className="flex items-center justify-center gap-6 pt-3 border-t border-black/[0.06] text-xs">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#0071e3]" />
                    <span className="text-[#6e6e73]">Tài liệu</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#8b5cf6]" />
                    <span className="text-[#6e6e73]">Thành viên</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: USER MANAGEMENT */}
        {activeTab === 'users' && (
          <div className="space-y-4">
            {/* Search Header */}
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <div>
                <h3 className="text-base font-semibold text-[#1d1d1f]">Quản lý Tài khoản Người dùng</h3>
                <p className="text-xs text-[#86868b]">Xem danh sách, phân quyền và khóa/mở khóa tài khoản trên hệ thống</p>
              </div>

              <div className="flex items-center gap-2">
                <div className="relative min-w-[240px]">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#86868b]" />
                  <input
                    type="text"
                    value={userSearchQuery}
                    onChange={(e) => {
                      setUserSearchQuery(e.target.value);
                      fetchUsers(0, e.target.value);
                    }}
                    placeholder="Tìm theo email hoặc họ tên..."
                    className="w-full pl-8 pr-7 py-1.5 rounded-full bg-white border border-black/[0.08] text-xs focus:outline-none focus:ring-2 focus:ring-[#0071e3]/20 shadow-sm"
                  />
                  {userSearchQuery && (
                    <button
                      onClick={() => {
                        setUserSearchQuery('');
                        fetchUsers(0, '');
                      }}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#86868b]"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Users Table */}
            <div className="rounded-[22px] bg-white border border-black/[0.06] shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-black/[0.02] border-b border-black/[0.06] text-[#86868b]">
                    <tr>
                      <th className="py-3 px-4 font-medium">Họ & Tên</th>
                      <th className="py-3 px-4 font-medium">Email</th>
                      <th className="py-3 px-4 font-medium">Vai trò hệ thống</th>
                      <th className="py-3 px-4 font-medium">Trạng thái</th>
                      <th className="py-3 px-4 font-medium">Ngày tạo</th>
                      <th className="py-3 px-4 font-medium text-right">Thao tác</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-black/[0.04]">
                    {isLoadingUsers ? (
                      <tr>
                        <td colSpan={6} className="py-12 text-center text-[#86868b]">
                          Đang tải danh sách người dùng...
                        </td>
                      </tr>
                    ) : users.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-12 text-center text-[#86868b]">
                          Không tìm thấy người dùng nào phù hợp
                        </td>
                      </tr>
                    ) : (
                      users.map((u) => {
                        const isSelf = u.email.toLowerCase() === user?.email.toLowerCase();

                        return (
                          <tr key={u.id} className="hover:bg-black/[0.01] transition-colors">
                            <td className="py-3 px-4 font-medium text-[#1d1d1f]">
                              {u.fullName}
                              {isSelf && (
                                <span className="ml-2 text-[10px] bg-[#0071e3]/10 text-[#0071e3] px-1.5 py-0.5 rounded-full font-semibold">
                                  Bạn
                                </span>
                              )}
                            </td>
                            <td className="py-3 px-4 text-[#6e6e73]">{u.email}</td>
                            <td className="py-3 px-4">
                              <div className="flex flex-wrap gap-1">
                                {u.roles.map((role) => (
                                  <span
                                    key={role}
                                    className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                                      role.includes('ADMIN')
                                        ? 'bg-[#0071e3]/10 text-[#0071e3] border border-[#0071e3]/20'
                                        : 'bg-black/[0.04] text-[#6e6e73]'
                                    }`}
                                  >
                                    {role.replace('ROLE_SYSTEM_', '')}
                                  </span>
                                ))}
                              </div>
                            </td>
                            <td className="py-3 px-4">
                              {u.isActive ? (
                                <span className="inline-flex items-center gap-1 text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full text-[11px] font-medium border border-emerald-200">
                                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                  Hoạt động
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 text-[#ff3b30] bg-[#ff3b30]/10 px-2 py-0.5 rounded-full text-[11px] font-medium border border-[#ff3b30]/20">
                                  <Lock className="w-3 h-3" />
                                  Đã bị khóa
                                </span>
                              )}
                            </td>
                            <td className="py-3 px-4 text-[#86868b]">
                              {new Date(u.createdAt).toLocaleDateString('vi-VN')}
                            </td>
                            <td className="py-3 px-4 text-right space-x-2">
                              {/* Phân quyền */}
                              <button
                                onClick={() => handleOpenEditRoles(u)}
                                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-black/[0.03] hover:bg-black/[0.06] text-[#1d1d1f] text-[11px] font-medium transition-all cursor-pointer"
                              >
                                <UserCog className="w-3.5 h-3.5 text-[#0071e3]" />
                                <span>Phân quyền</span>
                              </button>

                              {/* Khóa / Mở khóa */}
                              {!isSelf && (
                                <button
                                  onClick={() => handleToggleStatus(u)}
                                  className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium transition-all cursor-pointer ${
                                    u.isActive
                                      ? 'bg-rose-50 hover:bg-rose-100 text-[#ff3b30] border border-rose-200'
                                      : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200'
                                  }`}
                                >
                                  {u.isActive ? (
                                    <>
                                      <Lock className="w-3.5 h-3.5" />
                                      <span>Khóa</span>
                                    </>
                                  ) : (
                                    <>
                                      <Unlock className="w-3.5 h-3.5" />
                                      <span>Mở khóa</span>
                                    </>
                                  )}
                                </button>
                              )}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: PROJECT MANAGEMENT */}
        {activeTab === 'projects' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <div>
                <h3 className="text-base font-semibold text-[#1d1d1f]">Giám sát Dự án Toàn Hệ thống</h3>
                <p className="text-xs text-[#86868b]">
                  Quan sát quy mô các không gian tri thức (vỏ dự án, số thành viên và số tài liệu)
                </p>
              </div>

              <div className="flex items-center gap-2">
                <div className="relative min-w-[240px]">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#86868b]" />
                  <input
                    type="text"
                    value={projectSearchQuery}
                    onChange={(e) => {
                      setProjectSearchQuery(e.target.value);
                      fetchProjects(0, e.target.value);
                    }}
                    placeholder="Tìm theo tên dự án..."
                    className="w-full pl-8 pr-7 py-1.5 rounded-full bg-white border border-black/[0.08] text-xs focus:outline-none focus:ring-2 focus:ring-[#0071e3]/20 shadow-sm"
                  />
                  {projectSearchQuery && (
                    <button
                      onClick={() => {
                        setProjectSearchQuery('');
                        fetchProjects(0, '');
                      }}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#86868b]"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Projects Table */}
            <div className="rounded-[22px] bg-white border border-black/[0.06] shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-black/[0.02] border-b border-black/[0.06] text-[#86868b]">
                    <tr>
                      <th className="py-3 px-4 font-medium">Tên Dự án</th>
                      <th className="py-3 px-4 font-medium">Mô tả</th>
                      <th className="py-3 px-4 font-medium text-center">Thành viên</th>
                      <th className="py-3 px-4 font-medium text-center">Tài liệu lưu trữ</th>
                      <th className="py-3 px-4 font-medium">Ngày khởi tạo</th>
                      <th className="py-3 px-4 font-medium text-right">Chi tiết</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-black/[0.04]">
                    {isLoadingProjects ? (
                      <tr>
                        <td colSpan={6} className="py-12 text-center text-[#86868b]">
                          Đang tải danh sách dự án...
                        </td>
                      </tr>
                    ) : projects.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-12 text-center text-[#86868b]">
                          Không có dự án nào
                        </td>
                      </tr>
                    ) : (
                      projects.map((p) => (
                        <tr key={p.id} className="hover:bg-black/[0.01] transition-colors">
                          <td className="py-3 px-4 font-semibold text-[#1d1d1f] flex items-center gap-2">
                            <FolderGit2 className="w-4 h-4 text-[#0071e3]" />
                            {p.name}
                          </td>
                          <td className="py-3 px-4 text-[#86868b] max-w-xs truncate">
                            {p.description || 'Không có mô tả'}
                          </td>
                          <td className="py-3 px-4 text-center">
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-blue-50 text-[#0071e3] font-semibold text-[11px]">
                              <Users className="w-3 h-3" />
                              {p.memberCount}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-center">
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-semibold text-[11px]">
                              <FileText className="w-3 h-3" />
                              {p.documentCount}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-[#86868b]">
                            {new Date(p.createdAt).toLocaleDateString('vi-VN')}
                          </td>
                          <td className="py-3 px-4 text-right">
                            <button
                              onClick={() => handleViewMembers(p)}
                              className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-black/[0.03] hover:bg-black/[0.06] text-[#1d1d1f] text-[11px] font-medium transition-all cursor-pointer"
                            >
                              <Users className="w-3.5 h-3.5 text-[#0071e3]" />
                              <span>Thành viên</span>
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* MODAL: EDIT USER ROLES */}
      {editingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-md bg-white rounded-[28px] border border-black/[0.08] shadow-2xl p-6 space-y-5 animate-apple-spring">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-[#0071e3]/10 text-[#0071e3] flex items-center justify-center">
                  <UserCog className="w-4 h-4" />
                </div>
                <h3 className="text-sm font-semibold text-[#1d1d1f]">Phân quyền Hệ thống</h3>
              </div>
              <button
                onClick={() => setEditingUser(null)}
                className="p-1 rounded-full text-[#86868b] hover:text-[#1d1d1f]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="text-xs text-[#6e6e73] space-y-1">
              <p>Người dùng: <strong className="text-[#1d1d1f]">{editingUser.fullName}</strong></p>
              <p>Email: <span className="font-mono">{editingUser.email}</span></p>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold text-[#1d1d1f]">Chọn vai trò hệ thống:</label>
              
              {/* ADMIN Option */}
              <label className="flex items-start gap-3 p-3 rounded-2xl border border-black/[0.08] hover:bg-black/[0.01] cursor-pointer">
                <input
                  type="checkbox"
                  checked={selectedRoles.some((r) => r.includes('ADMIN'))}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setSelectedRoles((prev) => [...prev.filter((r) => !r.includes('ADMIN')), 'ROLE_SYSTEM_ADMIN']);
                    } else {
                      setSelectedRoles((prev) => prev.filter((r) => !r.includes('ADMIN')));
                    }
                  }}
                  className="mt-0.5"
                />
                <div>
                  <span className="text-xs font-semibold text-[#1d1d1f] block">Super Admin (ROLE_SYSTEM_ADMIN)</span>
                  <span className="text-[11px] text-[#86868b]">Toàn quyền truy cập Admin Portal, quản lý user và giám sát hệ thống</span>
                </div>
              </label>

              {/* USER Option */}
              <label className="flex items-start gap-3 p-3 rounded-2xl border border-black/[0.08] hover:bg-black/[0.01] cursor-pointer">
                <input
                  type="checkbox"
                  checked={selectedRoles.some((r) => r.includes('USER'))}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setSelectedRoles((prev) => [...prev.filter((r) => !r.includes('USER')), 'ROLE_SYSTEM_USER']);
                    } else {
                      setSelectedRoles((prev) => prev.filter((r) => !r.includes('USER')));
                    }
                  }}
                  className="mt-0.5"
                />
                <div>
                  <span className="text-xs font-semibold text-[#1d1d1f] block">Người dùng chuẩn (ROLE_SYSTEM_USER)</span>
                  <span className="text-[11px] text-[#86868b]">Tự do tạo dự án, tải tài liệu và trò chuyện AI RAG</span>
                </div>
              </label>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-black/[0.06]">
              <button
                type="button"
                onClick={() => setEditingUser(null)}
                className="px-4 py-2 rounded-full text-xs font-medium text-[#6e6e73] hover:bg-black/[0.04]"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={handleSaveRoles}
                disabled={isUpdatingRoles}
                className="px-4 py-2 rounded-full bg-[#0071e3] hover:bg-[#0077ed] text-white text-xs font-semibold shadow-sm transition-all"
              >
                {isUpdatingRoles ? 'Đang lưu...' : 'Lưu thay đổi'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: VIEW PROJECT MEMBERS */}
      {selectedProject && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-lg bg-white rounded-[28px] border border-black/[0.08] shadow-2xl p-6 space-y-4 animate-apple-spring">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
                  <Users className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-[#1d1d1f]">Thành viên dự án</h3>
                  <p className="text-[11px] text-[#86868b]">{selectedProject.name}</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedProject(null)}
                className="p-1 rounded-full text-[#86868b] hover:text-[#1d1d1f]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="max-h-72 overflow-y-auto divide-y divide-black/[0.04]">
              {isLoadingMembers ? (
                <div className="py-8 text-center text-[#86868b] text-xs">Đang tải thành viên...</div>
              ) : projectMembers.length === 0 ? (
                <div className="py-8 text-center text-[#86868b] text-xs">Chưa có thành viên nào</div>
              ) : (
                projectMembers.map((m) => (
                  <div key={m.userId} className="py-2.5 flex items-center justify-between text-xs">
                    <div>
                      <span className="font-semibold text-[#1d1d1f] block">{m.fullName}</span>
                      <span className="text-[11px] text-[#86868b] font-mono">{m.email}</span>
                    </div>
                    <div className="text-right">
                      <span className="inline-block px-2.5 py-0.5 rounded-full bg-purple-50 text-purple-700 font-semibold text-[10px] border border-purple-200">
                        {m.roleName}
                      </span>
                      <span className="block text-[10px] text-[#86868b] mt-0.5">
                        Gia nhập: {new Date(m.joinedAt).toLocaleDateString('vi-VN')}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="pt-2 border-t border-black/[0.06] text-right">
              <button
                onClick={() => setSelectedProject(null)}
                className="px-4 py-2 rounded-full bg-black/[0.04] hover:bg-black/[0.08] text-xs font-semibold text-[#1d1d1f]"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast Notification */}
      {toastMessage && (
        <AppleToast
          message={toastMessage}
          type={toastType}
          onClose={() => setToastMessage(null)}
        />
      )}
    </div>
  );
};

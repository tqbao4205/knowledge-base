import React, { useEffect, useState, useMemo, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  ArrowLeft,
  Users,
  FileText,
  Settings,
  Plus,
  Trash2,
  AlertTriangle,
  Upload,
  Download,
  FileSpreadsheet,
  FileCode,
  Image as ImageIcon,
  Film,
  Loader2,
  FileUp,
  Eye,
  X,
  Sparkles,
} from 'lucide-react';
import { projectApi } from '../api/project';
import { documentApi } from '../api/document';
import type { ProjectDetail, ProjectRole } from '../types/project';
import type { DocumentItem, DocumentIndexingStatus } from '../types/document';
import { useAuthStore } from '../store/authStore';
import { AppleSegmentedControl, type SegmentOption } from '../components/AppleSegmentedControl';
import { SpotlightSearch, type FileFilterCategory } from '../components/SpotlightSearch';
import { DocumentQuickLook } from '../components/DocumentQuickLook';
import { AppleToast, type ToastType } from '../components/AppleToast';
import { AIChatDrawer } from '../components/AIChatDrawer';

export const ProjectDetailView: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const currentUser = useAuthStore((state) => state.user);

  const [projectData, setProjectData] = useState<ProjectDetail | null>(null);
  const [availableRoles, setAvailableRoles] = useState<ProjectRole[]>([]);
  const [activeTab, setActiveTab] = useState<'documents' | 'members' | 'settings'>('documents');
  const [isLoading, setIsLoading] = useState(true);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [chatInitialDocId, setChatInitialDocId] = useState<string | null>(null);

  // Toast notifications
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [toastType, setToastType] = useState<ToastType>('success');

  const showToast = (msg: string, type: ToastType = 'success') => {
    setToastMessage(msg);
    setToastType(type);
  };

  // Supported file extensions (matches Backend DocumentService)
  const ALLOWED_EXTENSIONS = [
    'pdf', 'docx', 'xlsx', 'pptx', 'txt', 'md', 'csv',
    'jpg', 'jpeg', 'png', 'webp', 'gif', 'mp4'
  ];

  const getFileExtension = (filename: string): string => {
    const lastDot = filename.lastIndexOf('.');
    if (lastDot === -1) return '';
    return filename.substring(lastDot + 1).toLowerCase();
  };

  const validateAndSelectFile = (file: File): boolean => {
    const ext = getFileExtension(file.name);
    if (!ALLOWED_EXTENSIONS.includes(ext)) {
      showToast(
        `Định dạng tập tin .${ext || 'không xác định'} không được hỗ trợ. Các định dạng cho phép: PDF, DOCX, XLSX, PPTX, TXT, MD, CSV, JPG, PNG, WEBP, GIF, MP4`,
        'error'
      );
      setSelectedFile(null);
      return false;
    }

    if (file.size > 100 * 1024 * 1024) {
      showToast('Kích thước tập tin vượt quá giới hạn 100MB cho phép.', 'error');
      setSelectedFile(null);
      return false;
    }

    setSelectedFile(file);
    return true;
  };

  // Add Member Modal State
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRoleId, setInviteRoleId] = useState('');
  const [isInviting, setIsInviting] = useState(false);

  // Settings State
  const [editName, setEditName] = useState('');
  const [editDesc, setEditDesc] = useState('');
  const [isSavingSettings, setIsSavingSettings] = useState(false);
  const [isDeletingProject, setIsDeletingProject] = useState(false);

  // Document State
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [isLoadingDocs, setIsLoadingDocs] = useState(false);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploadingDoc, setIsUploadingDoc] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  // Quick Look Preview Modal State
  const [quickLookDoc, setQuickLookDoc] = useState<DocumentItem | null>(null);
  const [isQuickLookOpen, setIsQuickLookOpen] = useState(false);

  // Delete Document Modal State
  const [docToDelete, setDocToDelete] = useState<DocumentItem | null>(null);
  const [isDeletingDoc, setIsDeletingDoc] = useState(false);

  // Spotlight Search & Filter State
  const [searchDocQuery, setSearchDocQuery] = useState('');
  const [selectedFilter, setSelectedFilter] = useState<FileFilterCategory>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  const fetchProjectDetail = async () => {
    if (!id) return;
    setIsLoading(true);
    try {
      const res = await projectApi.getProjectDetail(id);
      if (res.success && res.data) {
        setProjectData(res.data);
        setEditName(res.data.project.name);
        setEditDesc(res.data.project.description || '');
      }
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Không thể tải thông tin dự án';
      showToast(msg, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchAvailableRoles = async () => {
    try {
      const res = await projectApi.getProjectRoles();
      if (res.success && res.data) {
        setAvailableRoles(res.data);
        const editorRole = res.data.find((r) => r.name === 'Editor');
        if (editorRole) {
          setInviteRoleId(editorRole.id);
        } else if (res.data.length > 0) {
          setInviteRoleId(res.data[0].id);
        }
      }
    } catch {
      // Ignored
    }
  };

  const fetchDocuments = async (silent = false) => {
    if (!id) return;
    if (!silent) setIsLoadingDocs(true);
    try {
      const res = await documentApi.getDocuments(id);
      if (res.success && res.data) {
        setDocuments(res.data.content);
      }
    } catch {
      // Handled by interceptor
    } finally {
      if (!silent) setIsLoadingDocs(false);
    }
  };

  useEffect(() => {
    fetchProjectDetail();
    fetchAvailableRoles();
    fetchDocuments();
  }, [id]);

  // Check if any document is currently pending or processing AI indexing
  const hasProcessingDocs = useMemo(() => {
    return documents.some(
      (doc) => doc.indexingStatus === 'PENDING' || doc.indexingStatus === 'PROCESSING'
    );
  }, [documents]);

  // Track previous document statuses to show real-time notifications on transition
  const prevDocsStatusRef = useRef<Record<string, DocumentIndexingStatus>>({});

  useEffect(() => {
    documents.forEach((doc) => {
      const prev = prevDocsStatusRef.current[doc.id];
      if (prev && (prev === 'PENDING' || prev === 'PROCESSING')) {
        if (doc.indexingStatus === 'INDEXED') {
          showToast(
            `✨ Đã nạp AI thành công cho "${doc.originalName}" (${doc.chunkCount || 0} đoạn)!`,
            'success'
          );
        } else if (doc.indexingStatus === 'FAILED') {
          showToast(`⚠️ Không thể lập chỉ mục AI cho "${doc.originalName}".`, 'error');
        }
      }
    });

    const statusMap: Record<string, DocumentIndexingStatus> = {};
    documents.forEach((doc) => {
      if (doc.indexingStatus) {
        statusMap[doc.id] = doc.indexingStatus;
      }
    });
    prevDocsStatusRef.current = statusMap;
  }, [documents]);

  // Auto-poll silently while any document is in PENDING or PROCESSING state
  useEffect(() => {
    if (!hasProcessingDocs || !id) return;

    const intervalId = setInterval(() => {
      fetchDocuments(true);
    }, 2500);

    return () => clearInterval(intervalId);
  }, [hasProcessingDocs, id]);

  // Permissions helpers
  const myPermissions = useMemo(
    () => projectData?.project.myPermissions || [],
    [projectData?.project.myPermissions]
  );
  const canManageMembers = myPermissions.includes('PROJECT_MANAGE_MEMBERS');
  const canUpdateProject = myPermissions.includes('PROJECT_UPDATE');
  const canDeleteProject = myPermissions.includes('PROJECT_DELETE');
  const canUploadDoc = myPermissions.includes('DOC_CREATE');

  const canDeleteDoc = (doc: DocumentItem) => {
    if (myPermissions.includes('DOC_DELETE')) return true;
    return doc.uploadedBy?.id === currentUser?.id;
  };

  // Document formatting helpers
  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
  };

  const formatDate = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleDateString('vi-VN', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      });
    } catch {
      return dateStr;
    }
  };

  const getFileCategory = (name: string, type: string): FileFilterCategory => {
    const ext = (name || '').toLowerCase();
    const mime = (type || '').toLowerCase();

    // 1. PDF
    if (mime.includes('pdf') || ext.endsWith('.pdf')) {
      return 'pdf';
    }

    // 2. Video
    if (
      mime.startsWith('video/') ||
      /\.(mp4|mkv|webm|mov|m4v|ogg|avi|wmv|flv|3gp)$/i.test(ext)
    ) {
      return 'video';
    }

    // 3. Image
    if (
      mime.startsWith('image/') ||
      /\.(jpg|jpeg|png|webp|gif|svg|bmp|ico|heic)$/i.test(ext)
    ) {
      return 'image';
    }

    // 4. Markdown
    if (
      ext.endsWith('.md') ||
      ext.endsWith('.markdown') ||
      mime.includes('markdown')
    ) {
      return 'markdown';
    }

    // 5. Office / Documents (Word, Text, Sheets, etc.)
    return 'word';
  };

  const getFileIcon = (fileType: string, name: string) => {
    const ext = (name || '').toLowerCase();
    const mime = (fileType || '').toLowerCase();

    if (mime.includes('pdf') || ext.endsWith('.pdf')) {
      return <FileText className="w-6 h-6 text-[#ff3b30]" />;
    }
    if (
      mime.startsWith('video/') ||
      /\.(mp4|mkv|webm|mov|m4v|ogg|avi|wmv|flv|3gp)$/i.test(ext)
    ) {
      return <Film className="w-6 h-6 text-[#ff9500]" />;
    }
    if (
      mime.startsWith('image/') ||
      /\.(jpg|jpeg|png|webp|gif|svg|bmp|ico|heic)$/i.test(ext)
    ) {
      return <ImageIcon className="w-6 h-6 text-[#af52de]" />;
    }
    if (
      mime.includes('sheet') ||
      /\.(xls|xlsx|csv)$/i.test(ext)
    ) {
      return <FileSpreadsheet className="w-6 h-6 text-[#34c759]" />;
    }
    if (
      mime.includes('word') ||
      mime.includes('officedocument.wordprocessingml') ||
      /\.(doc|docx|odt|rtf)$/i.test(ext)
    ) {
      return <FileText className="w-6 h-6 text-[#0071e3]" />;
    }
    if (ext.endsWith('.md') || ext.endsWith('.markdown')) {
      return <FileCode className="w-6 h-6 text-[#34c759]" />;
    }
    return <FileText className="w-6 h-6 text-[#86868b]" />;
  };

  const handleReindex = async (docId: string) => {
    if (!id) return;
    try {
      await documentApi.reindexDocument(id, docId);
      showToast('Đã gửi yêu cầu nạp lại AI cho tài liệu!', 'info');
      fetchDocuments();
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Không thể gửi yêu cầu nạp lại AI.';
      showToast(msg, 'error');
    }
  };

  const renderIndexingBadge = (doc: DocumentItem) => {
    const status = doc.indexingStatus;
    if (status === 'INDEXED') {
      return (
        <span
          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-semibold bg-[#34c759]/10 text-[#248a3d] border border-[#34c759]/20 shrink-0"
          title="Tài liệu đã được phân đoạn và lập chỉ mục AI"
        >
          <Sparkles className="w-2.5 h-2.5 text-[#34c759]" />
          <span>{doc.chunkCount ? `${doc.chunkCount} đoạn` : 'Đã nạp AI'}</span>
        </span>
      );
    }
    if (status === 'PROCESSING') {
      return (
        <span
          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-semibold bg-[#0071e3]/10 text-[#0071e3] border border-[#0071e3]/20 animate-pulse shrink-0"
          title="Đang trích xuất và tạo vector embedding"
        >
          <Loader2 className="w-2.5 h-2.5 animate-spin" />
          <span>Đang nạp AI...</span>
        </span>
      );
    }
    if (status === 'FAILED') {
      return (
        <span
          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-semibold bg-[#ff3b30]/10 text-[#ff3b30] border border-[#ff3b30]/20 shrink-0"
          title="Không thể lập chỉ mục tài liệu"
        >
          <AlertTriangle className="w-2.5 h-2.5" />
          <span>Lỗi AI</span>
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleReindex(doc.id);
            }}
            className="ml-1 underline hover:opacity-80 cursor-pointer"
          >
            Thử lại
          </button>
        </span>
      );
    }
    return (
      <span
        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-semibold bg-black/[0.04] text-[#86868b] border border-black/[0.06] shrink-0"
        title="Chờ tiến trình AI"
      >
        <span>Chờ nạp AI</span>
      </span>
    );
  };

  // Filtered & Searched Documents Memo
  const filteredDocuments = useMemo(() => {
    return documents.filter((doc) => {
      // Category filter
      if (selectedFilter !== 'all') {
        const cat = getFileCategory(doc.originalName, doc.fileType);
        if (cat !== selectedFilter) return false;
      }

      // Search query filter
      if (searchDocQuery.trim()) {
        const q = searchDocQuery.toLowerCase();
        const matchesName = doc.originalName.toLowerCase().includes(q);
        const matchesUploader =
          doc.uploadedBy?.fullName.toLowerCase().includes(q) || false;
        if (!matchesName && !matchesUploader) return false;
      }

      return true;
    });
  }, [documents, selectedFilter, searchDocQuery]);

  // Document category counts
  const categoryCounts = useMemo(() => {
    const counts = { all: documents.length, pdf: 0, word: 0, image: 0, video: 0, markdown: 0 };
    documents.forEach((d) => {
      const cat = getFileCategory(d.originalName, d.fileType);
      counts[cat]++;
    });
    return counts;
  }, [documents]);

  // Open Quick Look preview
  const handleOpenQuickLook = (doc: DocumentItem) => {
    setQuickLookDoc(doc);
    setIsQuickLookOpen(true);
  };

  // Direct download handler (downloads directly on the current page without jumping to a new tab)
  const handleDownload = async (doc: DocumentItem) => {
    if (!id) return;
    showToast(`Đang chuẩn bị tải "${doc.originalName}"...`, 'info');

    try {
      const res = await documentApi.getDownloadUrl(id, doc.id);
      if (res.success && res.data) {
        try {
          // Fetch as blob to force native browser download on current page
          const response = await fetch(res.data.url);
          if (!response.ok) throw new Error('Fetch failed');
          const blob = await response.blob();
          const blobUrl = window.URL.createObjectURL(blob);

          const link = document.createElement('a');
          link.href = blobUrl;
          link.download = doc.originalName;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);

          setTimeout(() => window.URL.revokeObjectURL(blobUrl), 2000);
          showToast(`Đã tải xuống "${doc.originalName}" thành công!`, 'success');
        } catch {
          // Fallback direct link without opening a new tab
          const link = document.createElement('a');
          link.href = res.data.url;
          link.download = doc.originalName;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          showToast(`Bắt đầu tải xuống "${doc.originalName}"`, 'info');
        }
      }
    } catch {
      showToast('Không thể lấy đường dẫn tải xuống.', 'error');
    }
  };

  // Upload handler
  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id || !selectedFile) return;

    const ext = getFileExtension(selectedFile.name);
    if (!ALLOWED_EXTENSIONS.includes(ext)) {
      showToast(
        `Định dạng tập tin .${ext || 'không xác định'} không được hỗ trợ. Các định dạng cho phép: PDF, DOCX, XLSX, PPTX, TXT, MD, CSV, JPG, PNG, WEBP, GIF, MP4`,
        'error'
      );
      return;
    }

    if (selectedFile.size > 100 * 1024 * 1024) {
      showToast('Kích thước tập tin vượt quá giới hạn 100MB cho phép.', 'error');
      return;
    }

    setIsUploadingDoc(true);
    setUploadProgress(0);

    try {
      const res = await documentApi.uploadDocument(
        id,
        selectedFile,
        (percent) => {
          setUploadProgress(typeof percent === 'number' ? Math.min(100, Math.max(0, percent)) : 0);
        }
      );

      if (res.success && res.data) {
        showToast(`Tải lên "${selectedFile.name}" thành công!`, 'success');
        setIsUploadModalOpen(false);
        setSelectedFile(null);
        fetchDocuments();
      }
    } catch (err: any) {
      const msg =
        err.response?.data?.message ||
        'Tải lên tài liệu thất bại. Vui lòng kiểm tra lại định dạng tệp.';
      showToast(msg, 'error');
    } finally {
      setIsUploadingDoc(false);
    }
  };

  // Confirm delete document
  const handleConfirmDeleteDoc = async () => {
    if (!id || !docToDelete) return;
    setIsDeletingDoc(true);

    try {
      const res = await documentApi.deleteDocument(id, docToDelete.id);
      if (res.success) {
        showToast(`Đã xóa tài liệu "${docToDelete.originalName}" thành công!`, 'success');
        setDocToDelete(null);
        if (quickLookDoc?.id === docToDelete.id) {
          setIsQuickLookOpen(false);
        }
        fetchDocuments();
      }
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Không thể xóa tài liệu.';
      showToast(msg, 'error');
    } finally {
      setIsDeletingDoc(false);
    }
  };

  // Member management handlers
  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id || !inviteEmail.trim() || !inviteRoleId) return;

    setIsInviting(true);
    try {
      const res = await projectApi.addMember(id, {
        email: inviteEmail.trim(),
        roleId: inviteRoleId,
      });

      if (res.success && res.data) {
        showToast(`Đã thêm ${res.data.fullName} vào dự án!`, 'success');
        setIsAddModalOpen(false);
        setInviteEmail('');
        fetchProjectDetail();
      }
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Không thể thêm thành viên.';
      showToast(msg, 'error');
    } finally {
      setIsInviting(false);
    }
  };

  const handleUpdateMemberRole = async (userId: string, newRoleId: string) => {
    if (!id) return;
    try {
      const res = await projectApi.updateMemberRole(id, userId, { roleId: newRoleId });
      if (res.success && res.data) {
        showToast(`Đã cập nhật vai trò của ${res.data.fullName} thành ${res.data.roleName}!`, 'success');
        fetchProjectDetail();
      }
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Cập nhật vai trò thất bại.';
      showToast(msg, 'error');
    }
  };

  const handleRemoveMember = async (userId: string, memberName: string) => {
    if (!id) return;
    if (!window.confirm(`Bạn có chắc chắn muốn xóa thành viên "${memberName}" khỏi dự án không?`)) {
      return;
    }

    try {
      const res = await projectApi.removeMember(id, userId);
      if (res.success) {
        showToast(`Đã xóa thành viên "${memberName}" khỏi dự án!`, 'success');
        fetchProjectDetail();
      }
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Không thể xóa thành viên.';
      showToast(msg, 'error');
    }
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id || !editName.trim()) return;

    setIsSavingSettings(true);
    try {
      const res = await projectApi.updateProject(id, {
        name: editName.trim(),
        description: editDesc.trim() || undefined,
      });

      if (res.success && res.data) {
        showToast('Cập nhật thông tin dự án thành công!', 'success');
        fetchProjectDetail();
      }
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Không thể cập nhật dự án.';
      showToast(msg, 'error');
    } finally {
      setIsSavingSettings(false);
    }
  };

  const handleDeleteProject = async () => {
    if (!id) return;
    if (!window.confirm('CẢNH BÁO: Bạn có chắc chắn muốn xóa vĩnh viễn dự án này? Thao tác này không thể hoàn tác.')) {
      return;
    }

    setIsDeletingProject(true);
    try {
      const res = await projectApi.deleteProject(id);
      if (res.success) {
        navigate('/dashboard');
      }
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Xóa dự án thất bại.';
      showToast(msg, 'error');
      setIsDeletingProject(false);
    }
  };

  if (isLoading && !projectData) {
    return (
      <div className="min-h-screen bg-[#f5f5f7] text-[#86868b] flex items-center justify-center text-xs">
        <Loader2 className="w-6 h-6 animate-spin text-[#0071e3] mr-2" />
        Đang nạp dữ liệu dự án...
      </div>
    );
  }

  if (!projectData) {
    return (
      <div className="min-h-screen bg-[#f5f5f7] text-[#1d1d1f] flex flex-col items-center justify-center p-4">
        <h2 className="text-lg font-semibold text-[#ff3b30] mb-2">Không tìm thấy dự án</h2>
        <p className="text-xs text-[#86868b] mb-4">Dự án không tồn tại hoặc bạn không có quyền truy cập.</p>
        <Link
          to="/dashboard"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-black/[0.05] text-[#1d1d1f] text-xs hover:bg-black/[0.1]"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Quay về Dashboard
        </Link>
      </div>
    );
  }

  // Segmented control tab options
  const tabOptions: SegmentOption<'documents' | 'members' | 'settings'>[] = [
    { id: 'documents', label: 'Tài liệu', icon: FileText, count: documents.length },
    { id: 'members', label: 'Thành viên', icon: Users, count: projectData.members?.length },
  ];
  if (canUpdateProject || canDeleteProject) {
    tabOptions.push({ id: 'settings', label: 'Cài đặt', icon: Settings });
  }

  return (
    <div className="min-h-screen bg-[#f5f5f7] text-[#1d1d1f] flex flex-col font-sans selection:bg-[#0071e3]/20">

      {/* macOS Quick Look Preview Window */}
      <DocumentQuickLook
        document={quickLookDoc}
        isOpen={isQuickLookOpen}
        onClose={() => setIsQuickLookOpen(false)}
        onDownload={handleDownload}
      />

      {/* Apple Frosted Glass Header */}
      <header className="border-b border-black/[0.06] bg-white/80 backdrop-blur-2xl sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <Link
              to="/dashboard"
              className="p-2 rounded-full bg-black/[0.03] hover:bg-black/[0.08] text-[#86868b] hover:text-[#1d1d1f] transition-colors cursor-pointer"
              title="Quay lại Dashboard"
            >
              <ArrowLeft className="w-4 h-4" />
            </Link>

            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h1 className="text-sm font-semibold text-[#1d1d1f] truncate">
                  {projectData.project.name}
                </h1>
                <span
                  className={`text-[10px] px-2 py-0.2 rounded-full font-semibold border ${projectData.project.myRole === 'Owner'
                      ? 'bg-[#ff9500]/10 text-[#d97706] border-[#ff9500]/25'
                      : projectData.project.myRole === 'Manager'
                        ? 'bg-[#0071e3]/10 text-[#0071e3] border-[#0071e3]/25'
                        : projectData.project.myRole === 'Editor'
                          ? 'bg-[#34c759]/10 text-[#16a34a] border-[#34c759]/25'
                          : 'bg-[#af52de]/10 text-[#9333ea] border-[#af52de]/25'
                    }`}
                >
                  {projectData.project.myRole}
                </span>
              </div>
              <p className="text-[11px] text-[#86868b] truncate max-w-md">
                {projectData.project.description || 'Không có mô tả chi tiết'}
              </p>
            </div>
          </div>

          {/* Apple Segmented Control in Topbar for Desktop */}
          <div className="hidden md:block">
            <AppleSegmentedControl
              options={tabOptions}
              activeId={activeTab}
              onChange={(t) => setActiveTab(t)}
            />
          </div>

          <div className="flex items-center gap-2">
            {activeTab === 'documents' && canUploadDoc && (
              <button
                onClick={() => setIsUploadModalOpen(true)}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-[#0071e3] hover:bg-[#0077ed] text-white text-xs font-semibold shadow-md shadow-blue-500/20 transition-all duration-200 active:scale-95 cursor-pointer whitespace-nowrap"
              >
                <Upload className="w-3.5 h-3.5" />
                <span>Tải tệp lên</span>
              </button>
            )}

            {activeTab === 'members' && canManageMembers && (
              <button
                onClick={() => setIsAddModalOpen(true)}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-[#0071e3] hover:bg-[#0077ed] text-white text-xs font-semibold shadow-md shadow-blue-500/20 transition-all duration-200 active:scale-95 cursor-pointer whitespace-nowrap"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Mời thành viên</span>
              </button>
            )}
          </div>
        </div>

        {/* Mobile Segmented Control */}
        <div className="md:hidden px-4 pb-3 flex justify-center">
          <AppleSegmentedControl
            options={tabOptions}
            activeId={activeTab}
            onChange={(t) => setActiveTab(t)}
            className="w-full justify-center"
          />
        </div>
      </header>

      {/* Main Content View */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6 animate-apple-spring">
        {/* TAB 1: DOCUMENTS (Phase 3 & Phase 4 Apple Quick Look) */}
        {activeTab === 'documents' && (
          <div className="space-y-4">
            {/* Spotlight Search Toolbar */}
            <SpotlightSearch
              searchQuery={searchDocQuery}
              onSearchChange={setSearchDocQuery}
              selectedFilter={selectedFilter}
              onFilterChange={setSelectedFilter}
              viewMode={viewMode}
              onViewModeChange={setViewMode}
              counts={categoryCounts}
              placeholder="Tìm kiếm tài liệu theo tên hoặc người upload (⌘K)..."
            />

            {/* Document Content */}
            {isLoadingDocs ? (
              <div className="p-16 text-center text-[#86868b] text-xs">
                <Loader2 className="w-6 h-6 animate-spin text-[#0071e3] mx-auto mb-2" />
                Đang tải danh sách tài liệu từ MinIO...
              </div>
            ) : filteredDocuments.length === 0 ? (
              <div className="p-16 rounded-[28px] bg-white border border-black/[0.08] text-center space-y-3 shadow-sm">
                <div className="w-14 h-14 rounded-2xl bg-black/[0.03] border border-black/[0.06] flex items-center justify-center text-[#0071e3] mx-auto">
                  <FileText className="w-7 h-7" />
                </div>
                <h3 className="text-sm font-semibold text-[#1d1d1f]">
                  {searchDocQuery || selectedFilter !== 'all'
                    ? 'Không tìm thấy tài liệu phù hợp'
                    : 'Chưa có tài liệu nào trong dự án'}
                </h3>
                <p className="text-xs text-[#86868b] max-w-sm mx-auto">
                  {searchDocQuery || selectedFilter !== 'all'
                    ? 'Thử xóa từ khóa tìm kiếm hoặc chọn bộ lọc "Tất cả".'
                    : 'Tải lên tài liệu PDF, Word, Ảnh hoặc Markdown đầu tiên để lưu trữ bảo mật trên MinIO S3.'}
                </p>
                {canUploadDoc && !searchDocQuery && selectedFilter === 'all' && (
                  <button
                    onClick={() => setIsUploadModalOpen(true)}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-[#0071e3] hover:bg-[#0077ed] text-white text-xs font-medium cursor-pointer mt-2"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    <span>Tải tệp đầu tiên</span>
                  </button>
                )}
              </div>
            ) : viewMode === 'grid' ? (
              /* macOS Grid View */
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {filteredDocuments.map((doc) => {
                  const userCanDelete = canDeleteDoc(doc);

                  return (
                    <div
                      key={doc.id}
                      onClick={() => handleOpenQuickLook(doc)}
                      className="apple-glass-card rounded-[22px] p-4 flex flex-col justify-between group cursor-pointer relative select-none"
                    >
                      <div>
                        {/* Top Icon & Actions */}
                        <div className="flex items-start justify-between gap-2 mb-3">
                          <div className="p-2.5 rounded-2xl bg-black/[0.03] border border-black/[0.06] transition-transform group-hover:scale-105">
                            {getFileIcon(doc.fileType, doc.originalName)}
                          </div>

                          <div
                            className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <button
                              onClick={() => {
                                setChatInitialDocId(doc.id);
                                setIsChatOpen(true);
                              }}
                              className="p-1.5 rounded-full bg-white hover:bg-purple-50 text-[#8b5cf6] shadow-sm border border-black/[0.08] transition-colors"
                              title="Hỏi AI về tài liệu này"
                            >
                              <Sparkles className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleOpenQuickLook(doc)}
                              className="p-1.5 rounded-full bg-white hover:bg-black/[0.05] text-[#1d1d1f] shadow-sm border border-black/[0.08] transition-colors"
                              title="Xem trước (Quick Look)"
                            >
                              <Eye className="w-3.5 h-3.5 text-[#0071e3]" />
                            </button>
                            <button
                              onClick={() => handleDownload(doc)}
                              className="p-1.5 rounded-full bg-white hover:bg-black/[0.05] text-[#1d1d1f] shadow-sm border border-black/[0.08] transition-colors"
                              title="Tải về"
                            >
                              <Download className="w-3.5 h-3.5" />
                            </button>
                            {userCanDelete && (
                              <button
                                onClick={() => setDocToDelete(doc)}
                                className="p-1.5 rounded-full bg-[#ff3b30]/10 hover:bg-[#ff3b30]/20 text-[#ff3b30] transition-colors"
                                title="Xóa tài liệu"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Title & Metadata */}
                        <h4 className="text-xs font-semibold text-[#1d1d1f] group-hover:text-[#0071e3] transition-colors truncate mb-1">
                          {doc.originalName}
                        </h4>
                        <div className="flex items-center gap-2 text-[10px] text-[#86868b] font-mono">
                          <span>{formatFileSize(doc.fileSizeBytes)}</span>
                          <span>•</span>
                          <span>{formatDate(doc.createdAt)}</span>
                        </div>
                      </div>

                      {/* Uploader Pill & AI Indexing Status */}
                      <div className="mt-4 pt-3 border-t border-black/[0.06] flex items-center justify-between gap-1 text-[10px] text-[#86868b]">
                        <span className="truncate max-w-[120px]">
                          bởi <strong className="text-[#1d1d1f]">{doc.uploadedBy?.fullName || 'Hệ thống'}</strong>
                        </span>
                        {renderIndexingBadge(doc)}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              /* macOS Finder List View */
              <div className="apple-glass rounded-[24px] overflow-hidden border border-black/[0.08]">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-black/[0.06] bg-black/[0.02] text-[#6e6e73] text-[11px] uppercase tracking-wider">
                      <th className="py-3 px-4 font-medium">Tên tài liệu</th>
                      <th className="py-3 px-4 font-medium hidden sm:table-cell">Kích thước</th>
                      <th className="py-3 px-4 font-medium hidden md:table-cell">Người tải</th>
                      <th className="py-3 px-4 font-medium hidden md:table-cell">AI RAG</th>
                      <th className="py-3 px-4 font-medium hidden lg:table-cell">Ngày tạo</th>
                      <th className="py-3 px-4 font-medium text-right">Thao tác</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-black/[0.04]">
                    {filteredDocuments.map((doc) => {
                      const userCanDelete = canDeleteDoc(doc);

                      return (
                        <tr
                          key={doc.id}
                          onClick={() => handleOpenQuickLook(doc)}
                          className="hover:bg-black/[0.02] transition-colors cursor-pointer group"
                        >
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-3">
                              <div className="p-1.5 rounded-xl bg-black/[0.03] border border-black/[0.06]">
                                {getFileIcon(doc.fileType, doc.originalName)}
                              </div>
                              <span className="font-medium text-[#1d1d1f] group-hover:text-[#0071e3] transition-colors truncate max-w-xs">
                                {doc.originalName}
                              </span>
                            </div>
                          </td>
                          <td className="py-3 px-4 text-[#86868b] font-mono text-[11px] hidden sm:table-cell">
                            {formatFileSize(doc.fileSizeBytes)}
                          </td>
                          <td className="py-3 px-4 text-[#86868b] hidden md:table-cell truncate max-w-[120px]">
                            {doc.uploadedBy?.fullName || 'Hệ thống'}
                          </td>
                          <td className="py-3 px-4 hidden md:table-cell">
                            {renderIndexingBadge(doc)}
                          </td>
                          <td className="py-3 px-4 text-[#86868b] text-[11px] hidden lg:table-cell">
                            {formatDate(doc.createdAt)}
                          </td>
                          <td
                            className="py-3 px-4 text-right"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                onClick={() => {
                                  setChatInitialDocId(doc.id);
                                  setIsChatOpen(true);
                                }}
                                className="p-1.5 rounded-full text-[#8b5cf6] hover:bg-purple-50 transition-colors"
                                title="Hỏi AI về tài liệu này"
                              >
                                <Sparkles className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => handleOpenQuickLook(doc)}
                                className="p-1.5 rounded-full text-[#86868b] hover:text-[#1d1d1f] hover:bg-black/[0.05] transition-colors"
                                title="Xem trước"
                              >
                                <Eye className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => handleDownload(doc)}
                                className="p-1.5 rounded-full text-[#86868b] hover:text-[#0071e3] hover:bg-black/[0.05] transition-colors"
                                title="Tải về máy"
                              >
                                <Download className="w-3.5 h-3.5" />
                              </button>
                              {userCanDelete && (
                                <button
                                  onClick={() => setDocToDelete(doc)}
                                  className="p-1.5 rounded-full text-[#86868b] hover:text-[#ff3b30] hover:bg-[#ff3b30]/10 transition-colors"
                                  title="Xóa tài liệu"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* TAB 2: MEMBERS */}
        {activeTab === 'members' && (
          <div className="space-y-4">
            <div>
              <h3 className="text-sm font-semibold text-[#1d1d1f]">
                Thành viên dự án ({projectData.members?.length || 0})
              </h3>
              <p className="text-xs text-[#86868b] mt-0.5">
                Danh sách những người dùng có quyền truy cập vào tài liệu của dự án này
              </p>
            </div>

            <div className="apple-glass rounded-[24px] overflow-hidden border border-black/[0.08]">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-black/[0.06] bg-black/[0.02] text-[#6e6e73] text-[11px] uppercase tracking-wider">
                    <th className="py-3 px-4 font-medium">Thành viên</th>
                    <th className="py-3 px-4 font-medium">Vai trò</th>
                    <th className="py-3 px-4 font-medium hidden md:table-cell">Ngày tham gia</th>
                    {canManageMembers && <th className="py-3 px-4 font-medium text-right">Quản lý</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-black/[0.04]">
                  {projectData.members?.map((m) => {
                    const isSelf = m.userId === currentUser?.id;
                    const isOwnerRole = m.roleName === 'Owner';

                    return (
                      <tr key={m.userId} className="hover:bg-black/[0.02] transition-colors">
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-[#0071e3]/10 border border-[#0071e3]/20 flex items-center justify-center font-bold text-[#0071e3] text-xs">
                              {m.fullName.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <div className="flex items-center gap-1.5">
                                <span className="font-medium text-[#1d1d1f]">{m.fullName}</span>
                                {isSelf && (
                                  <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-black/[0.05] text-[#6e6e73]">
                                    Bạn
                                  </span>
                                )}
                              </div>
                              <span className="text-[11px] text-[#86868b]">{m.email}</span>
                            </div>
                          </div>
                        </td>

                        <td className="py-3 px-4">
                          {canManageMembers && !isOwnerRole ? (
                            <select
                              value={
                                availableRoles.find((r) => r.name === m.roleName)?.id || ''
                              }
                              onChange={(e) => handleUpdateMemberRole(m.userId, e.target.value)}
                              className="px-2.5 py-1 rounded-xl bg-white border border-black/[0.1] text-[#1d1d1f] text-xs focus:outline-none focus:ring-1 focus:ring-[#0071e3] cursor-pointer shadow-sm"
                            >
                              {availableRoles.map((r) => (
                                <option key={r.id} value={r.id} className="bg-white text-[#1d1d1f]">
                                  {r.name}
                                </option>
                              ))}
                            </select>
                          ) : (
                            <span
                              className={`text-[10px] px-2 py-0.5 rounded-full font-semibold border ${m.roleName === 'Owner'
                                  ? 'bg-[#ff9500]/10 text-[#d97706] border-[#ff9500]/25'
                                  : m.roleName === 'Manager'
                                    ? 'bg-[#0071e3]/10 text-[#0071e3] border-[#0071e3]/25'
                                    : m.roleName === 'Editor'
                                      ? 'bg-[#34c759]/10 text-[#16a34a] border-[#34c759]/25'
                                      : 'bg-[#af52de]/10 text-[#9333ea] border-[#af52de]/25'
                                }`}
                            >
                              {m.roleName}
                            </span>
                          )}
                        </td>

                        <td className="py-3 px-4 text-[#86868b] text-[11px] hidden md:table-cell">
                          {formatDate(m.joinedAt)}
                        </td>

                        {canManageMembers && (
                          <td className="py-3 px-4 text-right">
                            {!isOwnerRole ? (
                              <button
                                onClick={() => handleRemoveMember(m.userId, m.fullName)}
                                className="p-1.5 rounded-full text-[#86868b] hover:text-[#ff3b30] hover:bg-[#ff3b30]/10 transition-colors cursor-pointer"
                                title="Xóa khỏi dự án"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            ) : (
                              <span className="text-[10px] text-[#86868b]">Chủ dự án</span>
                            )}
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 3: SETTINGS */}
        {activeTab === 'settings' && (canUpdateProject || canDeleteProject) && (
          <div className="max-w-2xl space-y-6">
            {canUpdateProject && (
              <div className="apple-glass rounded-[28px] p-6 border border-black/[0.08] space-y-4">
                <div>
                  <h3 className="text-sm font-semibold text-[#1d1d1f]">Thông tin dự án</h3>
                  <p className="text-xs text-[#86868b] mt-0.5">
                    Cập nhật tên và mô tả dự án hiển thị cho toàn bộ thành viên
                  </p>
                </div>

                <form onSubmit={handleSaveSettings} className="space-y-4">
                  <div>
                    <label className="block text-[11px] font-medium text-[#6e6e73] mb-1.5 uppercase tracking-wider">
                      Tên dự án *
                    </label>
                    <input
                      type="text"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      className="w-full px-3.5 py-2 rounded-2xl bg-white border border-black/[0.1] focus:border-[#0071e3] text-[#1d1d1f] text-xs focus:outline-none focus:ring-2 focus:ring-[#0071e3]/15 shadow-sm"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-medium text-[#6e6e73] mb-1.5 uppercase tracking-wider">
                      Mô tả dự án
                    </label>
                    <textarea
                      rows={3}
                      value={editDesc}
                      onChange={(e) => setEditDesc(e.target.value)}
                      className="w-full px-3.5 py-2 rounded-2xl bg-white border border-black/[0.1] focus:border-[#0071e3] text-[#1d1d1f] text-xs focus:outline-none focus:ring-2 focus:ring-[#0071e3]/15 resize-none shadow-sm"
                    />
                  </div>

                  <div className="flex justify-end">
                    <button
                      type="submit"
                      disabled={isSavingSettings}
                      className="px-4 py-2 rounded-full bg-[#0071e3] hover:bg-[#0077ed] text-white text-xs font-semibold shadow-md shadow-blue-500/20 transition-all cursor-pointer disabled:opacity-50"
                    >
                      {isSavingSettings ? 'Đang lưu...' : 'Lưu thay đổi'}
                    </button>
                  </div>
                </form>
              </div>
            )}

            {canDeleteProject && (
              <div className="rounded-[28px] bg-[#ff3b30]/5 border border-[#ff3b30]/20 p-6 space-y-4">
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-2xl bg-[#ff3b30]/15 text-[#ff3b30]">
                    <AlertTriangle className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-[#ff3b30]">Xóa dự án vĩnh viễn</h3>
                    <p className="text-xs text-[#86868b] mt-1">
                      Xóa dự án này cùng toàn bộ quyền hạn thành viên và liên kết tài liệu. Thao tác này chỉ có thể thực hiện bởi Owner.
                    </p>
                  </div>
                </div>

                <div className="flex justify-end pt-2">
                  <button
                    type="button"
                    onClick={handleDeleteProject}
                    disabled={isDeletingProject}
                    className="px-4 py-2 rounded-full bg-[#ff3b30] hover:bg-[#e03126] text-white text-xs font-semibold shadow-md shadow-red-500/20 transition-all cursor-pointer disabled:opacity-50"
                  >
                    {isDeletingProject ? 'Đang xóa dự án...' : 'Xác nhận xóa dự án'}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </main>

      {/* MODAL 1: macOS Sheet Style - Upload Document */}
      {isUploadModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div
            className="fixed inset-0 bg-black/30 backdrop-blur-md"
            onClick={() => !isUploadingDoc && setIsUploadModalOpen(false)}
          />

          <div className="relative w-full max-w-md bg-white/95 backdrop-blur-3xl border border-black/10 rounded-[30px] p-6 shadow-2xl shadow-black/15 space-y-5 animate-apple-spring z-10">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 border-b border-black/[0.06]">
              <h3 className="text-sm font-semibold text-[#1d1d1f]">
                Tải lên tài liệu mới
              </h3>
              <button
                type="button"
                disabled={isUploadingDoc}
                onClick={() => setIsUploadModalOpen(false)}
                className="p-1 rounded-full text-[#86868b] hover:text-[#1d1d1f] hover:bg-black/5 transition-colors cursor-pointer"
                title="Đóng"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleUploadSubmit} className="space-y-4">
              {/* Drag and Drop Zone */}
              <div
                className={`border-2 border-dashed rounded-[22px] p-6 text-center transition-all cursor-pointer ${selectedFile
                    ? 'border-[#0071e3]/50 bg-[#0071e3]/5'
                    : 'border-black/15 hover:border-black/30 bg-black/[0.01]'
                  }`}
                onClick={() => document.getElementById('file-upload-input')?.click()}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                    validateAndSelectFile(e.dataTransfer.files[0]);
                  }
                }}
              >
                <input
                  id="file-upload-input"
                  type="file"
                  className="hidden"
                  accept=".pdf,.docx,.xlsx,.pptx,.txt,.md,.csv,.jpg,.jpeg,.png,.webp,.gif,.mp4"
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      validateAndSelectFile(e.target.files[0]);
                    }
                  }}
                />

                <div className="w-12 h-12 rounded-2xl bg-[#0071e3]/10 border border-[#0071e3]/20 flex items-center justify-center text-[#0071e3] mx-auto mb-3">
                  <FileUp className="w-6 h-6" />
                </div>

                {selectedFile ? (
                  <div>
                    <p className="text-xs font-semibold text-[#1d1d1f] truncate max-w-xs mx-auto">
                      {selectedFile.name}
                    </p>
                    <p className="text-[10px] text-[#86868b] font-mono mt-1">
                      {formatFileSize(selectedFile.size)}
                    </p>
                    <span className="inline-block text-[10px] text-[#0071e3] mt-2 underline">
                      Chọn file khác
                    </span>
                  </div>
                ) : (
                  <div>
                    <p className="text-xs font-medium text-[#1d1d1f]">
                      Kéo thả tệp vào đây hoặc <span className="text-[#0071e3]">duyệt tệp</span>
                    </p>
                    <p className="text-[10px] text-[#86868b] mt-1">
                      Hỗ trợ PDF, DOCX, XLSX, Ảnh, Markdown (Tối đa 100MB)
                    </p>
                  </div>
                )}
              </div>

              {/* Progress Bar if Uploading */}
              {isUploadingDoc && (
                <div className="space-y-1.5 pt-1">
                  <div className="flex justify-between text-[11px] text-[#86868b]">
                    <span>Đang tải lên MinIO S3...</span>
                    <span>{typeof uploadProgress === 'number' ? uploadProgress : 0}%</span>
                  </div>
                  <div className="w-full h-1.5 bg-black/[0.06] rounded-full overflow-hidden">
                    <div
                      className="h-full bg-[#0071e3] transition-all duration-200 rounded-full"
                      style={{ width: `${typeof uploadProgress === 'number' ? uploadProgress : 0}%` }}
                    />
                  </div>
                </div>
              )}

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-black/[0.06]">
                <button
                  type="button"
                  disabled={isUploadingDoc}
                  onClick={() => setIsUploadModalOpen(false)}
                  className="px-4 py-2 rounded-full text-xs text-[#6e6e73] hover:text-[#1d1d1f] cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={!selectedFile || isUploadingDoc}
                  className="px-5 py-2 rounded-full bg-[#0071e3] hover:bg-[#0077ed] text-white text-xs font-semibold shadow-md shadow-blue-500/20 transition-all cursor-pointer disabled:opacity-50 active:scale-95"
                >
                  {isUploadingDoc ? 'Đang tải lên...' : 'Bắt đầu tải lên'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: Add Member Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div
            className="fixed inset-0 bg-black/30 backdrop-blur-md"
            onClick={() => setIsAddModalOpen(false)}
          />

          <div className="relative w-full max-w-md bg-white/95 backdrop-blur-3xl border border-black/10 rounded-[30px] p-6 shadow-2xl shadow-black/15 space-y-5 animate-apple-spring z-10">
            <div className="flex items-center justify-between pb-3 border-b border-black/[0.06]">
              <h3 className="text-sm font-semibold text-[#1d1d1f]">
                Thêm thành viên mới
              </h3>
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="p-1 rounded-full text-[#86868b] hover:text-[#1d1d1f] hover:bg-black/5 transition-colors cursor-pointer"
                title="Đóng"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddMember} className="space-y-4">
              <div>
                <label className="block text-[11px] font-medium text-[#6e6e73] mb-1.5 uppercase tracking-wider">
                  Email thành viên *
                </label>
                <input
                  type="email"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder="editor@knowledgebase.com"
                  className="w-full px-3.5 py-2 rounded-2xl bg-black/[0.02] border border-black/[0.08] focus:border-[#0071e3] text-[#1d1d1f] placeholder-[#86868b] text-xs focus:outline-none focus:ring-2 focus:ring-[#0071e3]/15 transition-all"
                  required
                />
              </div>

              <div>
                <label className="block text-[11px] font-medium text-[#6e6e73] mb-1.5 uppercase tracking-wider">
                  Vai trò dự án *
                </label>
                <select
                  value={inviteRoleId}
                  onChange={(e) => setInviteRoleId(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-2xl bg-white border border-black/[0.1] focus:border-[#0071e3] text-[#1d1d1f] text-xs focus:outline-none focus:ring-1 focus:ring-[#0071e3]/30 cursor-pointer shadow-sm"
                  required
                >
                  {availableRoles
                    .filter((r) => r.name !== 'Owner')
                    .map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.name}
                      </option>
                    ))}
                </select>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-black/[0.06]">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 rounded-full text-xs text-[#6e6e73] hover:text-[#1d1d1f] cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={isInviting}
                  className="px-5 py-2 rounded-full bg-[#0071e3] hover:bg-[#0077ed] text-white text-xs font-semibold shadow-md shadow-blue-500/20 transition-all cursor-pointer disabled:opacity-50 active:scale-95"
                >
                  {isInviting ? 'Đang thêm...' : 'Thêm vào dự án'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: Delete Document Confirmation */}
      {docToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div
            className="fixed inset-0 bg-black/30 backdrop-blur-md"
            onClick={() => !isDeletingDoc && setDocToDelete(null)}
          />

          <div className="relative w-full max-w-sm bg-white/95 backdrop-blur-3xl border border-black/10 rounded-[30px] p-6 shadow-2xl shadow-black/15 space-y-4 animate-apple-spring z-10 text-center">
            <div className="w-12 h-12 rounded-2xl bg-[#ff3b30]/15 text-[#ff3b30] flex items-center justify-center mx-auto mb-2">
              <Trash2 className="w-6 h-6" />
            </div>

            <h3 className="text-sm font-semibold text-[#1d1d1f]">
              Xác nhận xóa tài liệu?
            </h3>
            <p className="text-xs text-[#86868b] leading-relaxed">
              Bạn có chắc chắn muốn xóa tệp <strong className="text-[#1d1d1f]">"{docToDelete.originalName}"</strong> khỏi dự án? Thao tác này sẽ xóa mềm metadata và thu hồi liên kết S3.
            </p>

            <div className="flex items-center justify-center gap-2.5 pt-2">
              <button
                type="button"
                disabled={isDeletingDoc}
                onClick={() => setDocToDelete(null)}
                className="px-4 py-2 rounded-full text-xs text-[#6e6e73] hover:text-[#1d1d1f] cursor-pointer"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteDoc}
                disabled={isDeletingDoc}
                className="px-5 py-2 rounded-full bg-[#ff3b30] hover:bg-[#e03126] text-white text-xs font-semibold shadow-md shadow-red-500/20 transition-all cursor-pointer disabled:opacity-50 active:scale-95"
              >
                {isDeletingDoc ? 'Đang xóa...' : 'Xác nhận xóa'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* AI Chatbot RAG Floating Widget & Bottom-Right FAB */}
      <AIChatDrawer
        isOpen={isChatOpen}
        onOpen={() => setIsChatOpen(true)}
        onClose={() => {
          setIsChatOpen(false);
          setChatInitialDocId(null);
        }}
        projectId={id || ''}
        projectName={projectData.project.name}
        documents={documents}
        initialSelectedDocId={chatInitialDocId}
        onOpenDocumentPreview={(docId) => {
          const targetDoc = documents.find((d) => d.id === docId);
          if (targetDoc) {
            handleOpenQuickLook(targetDoc);
          }
        }}
      />

      {/* Top-Right macOS Notification Banner */}
      <AppleToast
        message={toastMessage}
        type={toastType}
        onClose={() => setToastMessage(null)}
      />
    </div>
  );
};

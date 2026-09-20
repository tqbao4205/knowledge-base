import React, { useEffect, useState, useRef } from 'react';
import {
  X,
  Download,
  FileText,
  ExternalLink,
  Loader2,
  Calendar,
  User,
  Film,
  Music,
} from 'lucide-react';
import { renderAsync } from 'docx-preview';
import type { DocumentItem } from '../types/document';
import { documentApi } from '../api/document';

interface DocumentQuickLookProps {
  document: DocumentItem | null;
  isOpen: boolean;
  onClose: () => void;
  onDownload: (doc: DocumentItem) => void;
}

export const DocumentQuickLook: React.FC<DocumentQuickLookProps> = ({
  document,
  isOpen,
  onClose,
  onDownload,
}) => {
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const [isLoadingUrl, setIsLoadingUrl] = useState(false);
  const [textContent, setTextContent] = useState<string | null>(null);
  const [isLoadingText, setIsLoadingText] = useState(false);
  const [isLoadingDocx, setIsLoadingDocx] = useState(false);
  const [docxError, setDocxError] = useState<string | null>(null);
  const docxContainerRef = useRef<HTMLDivElement>(null);

  // Esc key listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Fetch download/preview URL when document changes
  useEffect(() => {
    if (!isOpen || !document) {
      setDownloadUrl(null);
      setTextContent(null);
      setDocxError(null);
      return;
    }

    let isMounted = true;
    setIsLoadingUrl(true);

    documentApi
      .getDownloadUrl(document.projectId, document.id)
      .then(async (res) => {
        if (!isMounted) return;
        if (res.success && res.data) {
          const url = res.data.url;
          setDownloadUrl(url);

          const isText =
            document.fileType.includes('text') ||
            /\.(md|txt|json|yaml|yml|log|csv)$/i.test(document.originalName);

          if (isText) {
            setIsLoadingText(true);
            try {
              const textRes = await fetch(url);
              const text = await textRes.text();
              if (isMounted) setTextContent(text);
            } catch {
              // fallback
            } finally {
              if (isMounted) setIsLoadingText(false);
            }
          }
        }
      })
      .catch((err) => console.error('Failed to get preview URL', err))
      .finally(() => {
        if (isMounted) setIsLoadingUrl(false);
      });

    return () => {
      isMounted = false;
    };
  }, [isOpen, document]);

  const isDocx =
    document?.fileType?.includes('officedocument.wordprocessingml') ||
    Boolean(document?.originalName?.toLowerCase().endsWith('.docx'));

  // Render DOCX preview in-browser when downloadUrl is available
  useEffect(() => {
    if (!isOpen || !document || !downloadUrl || !isDocx) {
      setIsLoadingDocx(false);
      return;
    }

    let isMounted = true;
    setIsLoadingDocx(true);
    setDocxError(null);

    fetch(downloadUrl)
      .then((res) => {
        if (!res.ok) throw new Error(`Lỗi nạp tệp: HTTP ${res.status}`);
        return res.blob();
      })
      .then(async (blob) => {
        if (!isMounted) return;
        if (docxContainerRef.current) {
          docxContainerRef.current.innerHTML = '';
          await renderAsync(blob, docxContainerRef.current, undefined, {
            className: 'docx-preview-body',
            inWrapper: false,
            ignoreWidth: true,
            ignoreHeight: true,
            breakPages: true,
            renderHeaders: true,
            renderFooters: true,
          });
        }
      })
      .catch((err) => {
        console.error('Lỗi khi phân tích tệp DOCX:', err);
        if (isMounted) {
          setDocxError('Không thể phân tích định dạng Word trực tiếp. Bạn vui lòng tải tệp về để xem toàn bộ nội dung.');
        }
      })
      .finally(() => {
        if (isMounted) setIsLoadingDocx(false);
      });

    return () => {
      isMounted = false;
    };
  }, [isOpen, document, downloadUrl, isDocx]);

  if (!isOpen || !document) return null;

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
  };

  const formatDate = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleString('vi-VN', {
        dateStyle: 'medium',
        timeStyle: 'short',
      });
    } catch {
      return dateStr;
    }
  };

  const isPdf =
    document.fileType.includes('pdf') || document.originalName.toLowerCase().endsWith('.pdf');
  const isVideo =
    document.fileType.startsWith('video/') ||
    /\.(mp4|webm|mov|m4v|ogg|mkv)$/i.test(document.originalName);
  const isAudio =
    document.fileType.startsWith('audio/') ||
    /\.(mp3|wav|m4a|aac|flac|ogg)$/i.test(document.originalName);
  const isImage =
    document.fileType.startsWith('image/') ||
    /\.(jpg|jpeg|png|webp|gif|svg)$/i.test(document.originalName);
  const isLegacyDoc =
    (document.fileType.includes('msword') || document.originalName.toLowerCase().endsWith('.doc')) &&
    !isDocx;
  const isMarkdownOrText =
    document.fileType.includes('text') ||
    /\.(md|txt|json|yaml|yml|log|csv)$/i.test(document.originalName);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 md:p-10 animate-in fade-in duration-200">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/40 backdrop-blur-md transition-opacity"
        onClick={onClose}
      />

      {/* macOS Light Quick Look Window */}
      <div className="relative w-full max-w-4xl max-h-[90vh] bg-white/95 backdrop-blur-3xl border border-black/10 rounded-[28px] shadow-2xl shadow-black/20 flex flex-col overflow-hidden z-10 animate-apple-spring">
        {/* macOS Window Header Bar */}
        <div className="flex items-center justify-between px-5 py-3.5 bg-black/[0.02] border-b border-black/[0.06] select-none">
          {/* Document Title Left */}
          <div className="flex items-center gap-2 max-w-[65%] truncate">
            <span className="text-xs font-semibold text-[#1d1d1f] truncate">
              {document.originalName}
            </span>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-black/[0.05] text-[#6e6e73] font-mono">
              {formatFileSize(document.fileSizeBytes)}
            </span>
          </div>

          {/* Action Buttons Right */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => onDownload(document)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-black/[0.05] hover:bg-black/[0.1] text-[#1d1d1f] text-xs font-medium border border-black/[0.06] transition-colors cursor-pointer"
              title="Tải về máy"
            >
              <Download className="w-3.5 h-3.5 text-[#0071e3]" />
              <span className="hidden sm:inline">Tải về</span>
            </button>
            {downloadUrl && (
              <a
                href={downloadUrl}
                target="_blank"
                rel="noreferrer"
                className="p-1.5 rounded-xl text-[#86868b] hover:text-[#1d1d1f] hover:bg-black/[0.05] transition-colors"
                title="Mở tab mới"
              >
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            )}
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-xl text-[#86868b] hover:text-[#1d1d1f] hover:bg-black/[0.05] transition-colors ml-1 cursor-pointer"
              title="Đóng (Esc)"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Content Viewer Body */}
        <div className="flex-1 overflow-auto p-4 flex items-center justify-center min-h-[380px] max-h-[72vh] bg-[#fbfbfd]">
          {isLoadingUrl ? (
            <div className="flex flex-col items-center justify-center gap-3 py-16 text-[#86868b]">
              <Loader2 className="w-8 h-8 animate-spin text-[#0071e3]" />
              <p className="text-xs">Đang nạp xem trước từ MinIO S3...</p>
            </div>
          ) : !downloadUrl ? (
            <div className="text-center py-12 text-[#86868b] text-xs">
              Không thể tải đường dẫn xem trước tài liệu.
            </div>
          ) : isPdf ? (
            /* PDF Viewer */
            <div className="w-full h-[65vh] rounded-2xl overflow-hidden border border-black/[0.08] bg-white shadow-sm">
              <iframe
                src={`${downloadUrl}#toolbar=0&navpanes=0`}
                title={document.originalName}
                className="w-full h-full border-0"
              />
            </div>
          ) : isVideo ? (
            /* Video Player (QuickTime / macOS Style) */
            <div className="w-full flex flex-col items-center justify-center p-2">
              <div className="w-full max-w-3xl rounded-2xl overflow-hidden bg-black shadow-2xl border border-black/20 flex items-center justify-center">
                <video
                  key={downloadUrl}
                  src={downloadUrl}
                  controls
                  playsInline
                  autoPlay={false}
                  className="max-h-[62vh] w-full object-contain rounded-2xl outline-none"
                >
                  Trình duyệt của bạn không hỗ trợ phát trực tiếp video này.
                </video>
              </div>
              <div className="mt-2.5 flex items-center gap-1.5 text-xs text-[#86868b]">
                <Film className="w-3.5 h-3.5 text-[#ff9500]" />
                <span>Trình phát QuickTime nhúng từ MinIO S3</span>
              </div>
            </div>
          ) : isAudio ? (
            /* Audio Player */
            <div className="flex flex-col items-center justify-center p-8 max-w-md w-full bg-white rounded-3xl border border-black/[0.08] shadow-lg">
              <div className="w-16 h-16 rounded-2xl bg-[#0071e3]/10 flex items-center justify-center text-[#0071e3] mb-4">
                <Music className="w-8 h-8" />
              </div>
              <h4 className="text-sm font-semibold text-[#1d1d1f] mb-1 truncate max-w-full">
                {document.originalName}
              </h4>
              <p className="text-xs text-[#86868b] mb-5">{formatFileSize(document.fileSizeBytes)}</p>
              <audio key={downloadUrl} src={downloadUrl} controls className="w-full" />
            </div>
          ) : isImage ? (
            /* Image Viewer */
            <div className="flex items-center justify-center max-w-full max-h-full p-2">
              <img
                src={downloadUrl}
                alt={document.originalName}
                className="max-h-[62vh] max-w-full object-contain rounded-2xl shadow-xl border border-black/10"
              />
            </div>
          ) : isMarkdownOrText ? (
            /* Markdown / Plain Text Viewer */
            <div className="w-full h-[62vh] overflow-y-auto p-6 rounded-2xl bg-white border border-black/[0.08] shadow-sm text-left">
              {isLoadingText ? (
                <div className="flex items-center justify-center h-full text-[#86868b]">
                  <Loader2 className="w-6 h-6 animate-spin text-[#0071e3]" />
                </div>
              ) : textContent ? (
                <pre className="text-xs font-mono text-[#1d1d1f] whitespace-pre-wrap leading-relaxed">
                  {textContent}
                </pre>
              ) : (
                <div className="text-center py-12 text-[#86868b] text-xs">
                  Không thể đọc nội dung văn bản trực tiếp. Bạn có thể bấm "Tải về" để mở trên máy.
                </div>
              )}
            </div>
          ) : isDocx ? (
            /* Word .docx in-browser viewer */
            <div className="w-full h-[65vh] overflow-y-auto p-4 sm:p-6 flex flex-col items-center bg-[#f5f5f7] rounded-2xl border border-black/[0.08]">
              {isLoadingDocx && (
                <div className="flex flex-col items-center justify-center my-auto py-16 gap-3 text-[#86868b]">
                  <Loader2 className="w-7 h-7 animate-spin text-[#0071e3]" />
                  <p className="text-xs font-medium">Đang kết xuất văn bản Word...</p>
                </div>
              )}
              {docxError && !isLoadingDocx && (
                <div className="flex flex-col items-center justify-center text-center my-auto p-8 max-w-md">
                  <div className="w-16 h-16 rounded-2xl bg-amber-500/10 flex items-center justify-center mb-3">
                    <FileText className="w-8 h-8 text-amber-600" />
                  </div>
                  <h4 className="text-sm font-semibold text-[#1d1d1f] mb-1">
                    {document.originalName}
                  </h4>
                  <p className="text-xs text-[#86868b] mb-5">{docxError}</p>
                  <button
                    onClick={() => onDownload(document)}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#0071e3] hover:bg-[#0077ed] text-white text-xs font-semibold shadow-sm transition-all cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Tải tệp Word về máy</span>
                  </button>
                </div>
              )}
              <div
                ref={docxContainerRef}
                className={`docx-render-target w-full max-w-3xl bg-white p-8 sm:p-12 rounded-2xl shadow-sm border border-black/[0.06] text-[#1d1d1f] text-sm leading-relaxed ${
                  isLoadingDocx || docxError ? 'hidden' : 'block'
                }`}
              />
            </div>
          ) : isLegacyDoc ? (
            /* Word 97-2003 .doc binary format */
            <div className="flex flex-col items-center justify-center text-center p-8 max-w-md">
              <div className="w-20 h-20 rounded-3xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center shadow-sm mb-4">
                <FileText className="w-10 h-10 text-[#0071e3]" />
              </div>
              <h3 className="text-base font-semibold text-[#1d1d1f] mb-1">
                {document.originalName}
              </h3>
              <p className="text-xs text-[#86868b] mb-6">
                Tệp tin Word định dạng cũ (.doc / Word 97-2003) là mã nhị phân không hỗ trợ dựng layout trực tiếp trên trình duyệt. Bạn có thể tải về để mở trên máy hoặc lưu sang định dạng .docx để xem trước trực tiếp.
              </p>
              <button
                onClick={() => onDownload(document)}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-[#0071e3] hover:bg-[#0077ed] text-white text-xs font-semibold shadow-md shadow-blue-500/20 transition-all active:scale-95 cursor-pointer"
              >
                <Download className="w-4 h-4" />
                <span>Tải tệp xuống ({formatFileSize(document.fileSizeBytes)})</span>
              </button>
            </div>
          ) : (
            /* Generic / Office File Card */
            <div className="flex flex-col items-center justify-center text-center p-8 max-w-md">
              <div className="w-20 h-20 rounded-3xl bg-black/[0.04] border border-black/[0.08] flex items-center justify-center shadow-sm mb-4">
                <FileText className="w-10 h-10 text-[#0071e3]" />
              </div>
              <h3 className="text-base font-semibold text-[#1d1d1f] mb-1">
                {document.originalName}
              </h3>
              <p className="text-xs text-[#86868b] mb-6">
                Định dạng này không hỗ trợ xem trực tiếp trong trình duyệt. Bạn có thể tải tệp an toàn về máy để mở bằng ứng dụng chuyên dụng.
              </p>
              <button
                onClick={() => onDownload(document)}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-[#0071e3] hover:bg-[#0077ed] text-white text-xs font-semibold shadow-md shadow-blue-500/20 transition-all active:scale-95 cursor-pointer"
              >
                <Download className="w-4 h-4" />
                <span>Tải tệp xuống ({formatFileSize(document.fileSizeBytes)})</span>
              </button>
            </div>
          )}
        </div>

        {/* Quick Look Footer Details */}
        <div className="px-6 py-2.5 bg-black/[0.02] border-t border-black/[0.06] flex items-center justify-between text-[11px] text-[#86868b]">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-[#86868b]" />
              Người tải: <strong className="text-[#1d1d1f]">{document.uploadedBy?.fullName || 'Hệ thống'}</strong>
            </span>
            <span className="flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-[#86868b]" />
              Ngày tải: {formatDate(document.createdAt)}
            </span>
          </div>
          <span className="text-[10px] text-[#86868b]">Nhấn phím Esc để đóng</span>
        </div>
      </div>
    </div>
  );
};

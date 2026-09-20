import React, { useState, useEffect, useRef } from 'react';
import {
  Sparkles,
  Send,
  Square,
  Plus,
  Trash2,
  X,
  MessageSquare,
  FileText,
  ChevronDown,
  Loader2,
  Check,
} from 'lucide-react';
import { chatApi, type StreamDonePayload } from '../api/chat';
import type { ChatConversationItem, ChatMessageItem } from '../types/chat';
import type { DocumentItem } from '../types/document';

export interface AIChatDrawerProps {
  isOpen: boolean;
  onOpen?: () => void;
  onClose: () => void;
  projectId: string;
  projectName: string;
  documents?: DocumentItem[];
  initialSelectedDocId?: string | null;
  onOpenDocumentPreview?: (documentId: string) => void;
}

export const AIChatDrawer: React.FC<AIChatDrawerProps> = ({
  isOpen,
  onOpen,
  onClose,
  projectId,
  projectName,
  documents = [],
  initialSelectedDocId = null,
  onOpenDocumentPreview,
}) => {
  const [conversations, setConversations] = useState<ChatConversationItem[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessageItem[]>([]);
  const [inputQuery, setInputQuery] = useState('');
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingTokenContent, setStreamingTokenContent] = useState('');
  const [showHistory, setShowHistory] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Document selection
  const [selectedDocIds, setSelectedDocIds] = useState<string[]>([]);
  const [isDocSelectorOpen, setIsDocSelectorOpen] = useState(false);

  const abortControllerRef = useRef<AbortController | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const docSelectorRef = useRef<HTMLDivElement>(null);

  // Sync initialSelectedDocId
  useEffect(() => {
    if (isOpen && initialSelectedDocId) {
      setSelectedDocIds([initialSelectedDocId]);
    }
  }, [isOpen, initialSelectedDocId]);

  // Click outside to close document selector
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (docSelectorRef.current && !docSelectorRef.current.contains(e.target as Node)) {
        setIsDocSelectorOpen(false);
      }
    };
    if (isDocSelectorOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isDocSelectorOpen]);

  // Auto scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, streamingTokenContent]);

  // Load conversations
  useEffect(() => {
    if (isOpen && projectId) {
      loadConversations();
    } else if (!isOpen && abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
  }, [isOpen, projectId]);

  // Load messages
  useEffect(() => {
    if (activeConversationId && projectId) {
      loadMessages(activeConversationId);
    } else {
      setMessages([]);
    }
  }, [activeConversationId]);

  const loadConversations = async () => {
    try {
      const res = await chatApi.getConversations(projectId);
      if (res.success && res.data) {
        setConversations(res.data);
        if (res.data.length > 0 && !activeConversationId) {
          setActiveConversationId(res.data[0].id);
        } else if (res.data.length === 0) {
          setActiveConversationId(null);
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  const loadMessages = async (convId: string) => {
    setIsLoadingMessages(true);
    setErrorMessage(null);
    try {
      const res = await chatApi.getMessages(projectId, convId);
      if (res.success && res.data) {
        setMessages(res.data);
      }
    } catch {
      setErrorMessage('Không thể tải tin nhắn.');
    } finally {
      setIsLoadingMessages(false);
    }
  };

  const handleCreateNewConversation = async () => {
    const title = `Hội thoại ${new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}`;
    try {
      const res = await chatApi.createConversation(projectId, title);
      if (res.success && res.data) {
        setConversations((prev) => [res.data, ...prev]);
        setActiveConversationId(res.data.id);
        setShowHistory(false);
        textareaRef.current?.focus();
        return res.data.id;
      }
    } catch {
      setErrorMessage('Không thể tạo cuộc trò chuyện mới.');
    }
    return null;
  };

  const handleDeleteConversation = async (convId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await chatApi.deleteConversation(projectId, convId);
      const remaining = conversations.filter((c) => c.id !== convId);
      setConversations(remaining);
      if (activeConversationId === convId) {
        setActiveConversationId(remaining.length > 0 ? remaining[0].id : null);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const toggleDocSelection = (docId: string) => {
    setSelectedDocIds((prev) =>
      prev.includes(docId) ? prev.filter((id) => id !== docId) : [...prev, docId]
    );
  };

  const handleSendMessage = async (customQuestion?: string) => {
    const question = (customQuestion || inputQuery).trim();
    if (!question || isStreaming) return;

    setInputQuery('');
    setErrorMessage(null);

    let convId = activeConversationId;
    if (!convId) {
      convId = await handleCreateNewConversation();
      if (!convId) return;
    }

    const currentDocIds = [...selectedDocIds];
    const scopeNote =
      currentDocIds.length === 0
        ? ''
        : currentDocIds.length === 1
        ? documents.find((d) => d.id === currentDocIds[0])?.originalName || '1 tài liệu'
        : `${currentDocIds.length} tài liệu`;

    const optimisticUserMsg: ChatMessageItem = {
      id: 'temp-user-' + Date.now(),
      conversationId: convId,
      senderType: 'USER',
      content: question,
      scopeNote: scopeNote ? `Phạm vi: ${scopeNote}` : undefined,
      createdAt: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, optimisticUserMsg]);
    setIsStreaming(true);
    setStreamingTokenContent('');

    const controller = new AbortController();
    abortControllerRef.current = controller;

    let accumulatedTokens = '';

    await chatApi.streamMessage(
      projectId,
      convId,
      question,
      currentDocIds.length > 0 ? currentDocIds : undefined,
      {
        onToken: (token) => {
          accumulatedTokens += token;
          setStreamingTokenContent(accumulatedTokens);
        },
        onDone: (payload: StreamDonePayload) => {
          setIsStreaming(false);
          setStreamingTokenContent('');
          const newAssistantMsg: ChatMessageItem = {
            id: payload.messageId || 'msg-' + Date.now(),
            conversationId: convId!,
            senderType: 'ASSISTANT',
            content: payload.fullContent,
            citations: payload.citations || [],
            createdAt: new Date().toISOString(),
          };
          setMessages((prev) => [...prev, newAssistantMsg]);
          chatApi.getConversations(projectId).then((r) => {
            if (r.success && r.data) setConversations(r.data);
          });
        },
        onError: (err) => {
          setIsStreaming(false);
          setStreamingTokenContent('');
          setErrorMessage(err);
        },
      },
      controller.signal
    );
  };

  const handleStopStreaming = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      setIsStreaming(false);
      if (streamingTokenContent.trim()) {
        const stoppedMsg: ChatMessageItem = {
          id: 'stopped-' + Date.now(),
          conversationId: activeConversationId!,
          senderType: 'ASSISTANT',
          content: streamingTokenContent,
          createdAt: new Date().toISOString(),
        };
        setMessages((prev) => [...prev, stoppedMsg]);
      }
      setStreamingTokenContent('');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <>
      {/* Nút tròn nổi góc dưới bên phải */}
      <div className="fixed bottom-6 right-6 z-40">
        <button
          type="button"
          onClick={() => (isOpen ? onClose() : onOpen?.())}
          className="w-13 h-13 rounded-full bg-white shadow-lg border border-black/10 hover:shadow-xl hover:scale-105 active:scale-95 transition-all duration-200 cursor-pointer flex items-center justify-center relative group"
          title={isOpen ? 'Đóng hỏi đáp' : `Hỏi đáp AI • ${projectName}`}
        >
          {isOpen ? (
            <X className="w-5 h-5 text-[#1d1d1f]" />
          ) : (
            <>
              <Sparkles className="w-5 h-5 text-[#0071e3]" />
              <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-[#34c759]" />
            </>
          )}
        </button>
      </div>

      {/* Cửa sổ chat đơn giản, tinh gọn */}
      {isOpen && (
        <div className="fixed bottom-22 right-6 z-50 w-[400px] max-w-[calc(100vw-32px)] h-[560px] max-h-[calc(100vh-110px)] bg-white rounded-[22px] border border-black/10 shadow-2xl flex flex-col overflow-hidden animate-apple-spring">
          
          {/* Header thanh lịch */}
          <div className="px-4 py-3 border-b border-black/[0.06] flex items-center justify-between shrink-0 bg-white">
            <div className="flex items-center gap-2 min-w-0 pr-2">
              <span className="w-2 h-2 rounded-full bg-[#34c759] shrink-0" />
              <h3 className="text-sm font-semibold text-[#1d1d1f] truncate">
                Hỏi đáp AI {projectName ? `• ${projectName}` : ''}
              </h3>
            </div>

            <div className="flex items-center gap-0.5">
              {/* Nút tạo chat mới */}
              <button
                type="button"
                onClick={handleCreateNewConversation}
                className="p-1.5 rounded-lg text-[#8e8e93] hover:text-[#1d1d1f] hover:bg-[#f2f2f7] transition-colors cursor-pointer"
                title="Hội thoại mới"
              >
                <Plus className="w-4 h-4" />
              </button>

              {/* Lịch sử */}
              <button
                type="button"
                onClick={() => setShowHistory(!showHistory)}
                className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                  showHistory
                    ? 'text-[#0071e3] bg-[#0071e3]/10'
                    : 'text-[#8e8e93] hover:text-[#1d1d1f] hover:bg-[#f2f2f7]'
                }`}
                title="Lịch sử trò chuyện"
              >
                <MessageSquare className="w-4 h-4" />
              </button>

              {/* Đóng */}
              <button
                type="button"
                onClick={onClose}
                className="p-1.5 rounded-lg text-[#8e8e93] hover:text-[#1d1d1f] hover:bg-[#f2f2f7] transition-colors cursor-pointer"
                title="Đóng"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Menu lịch sử cuộc trò chuyện (hiện dạng overlay nhẹ) */}
          {showHistory && (
            <div className="absolute top-12 inset-x-0 bottom-0 bg-white z-20 p-3 flex flex-col animate-in fade-in duration-100">
              <div className="flex items-center justify-between pb-2 border-b border-black/[0.06]">
                <span className="text-xs font-semibold text-[#1d1d1f]">Các phiên hỏi đáp</span>
                <button
                  type="button"
                  onClick={() => setShowHistory(false)}
                  className="text-xs text-[#8e8e93] hover:text-[#1d1d1f] cursor-pointer"
                >
                  Đóng
                </button>
              </div>
              <div className="flex-1 overflow-y-auto pt-2 space-y-1">
                {conversations.length === 0 ? (
                  <p className="text-xs text-[#8e8e93] text-center py-6">Chưa có lịch sử trò chuyện</p>
                ) : (
                  conversations.map((c) => (
                    <div
                      key={c.id}
                      onClick={() => {
                        setActiveConversationId(c.id);
                        setShowHistory(false);
                      }}
                      className={`flex items-center justify-between p-2 rounded-xl text-xs cursor-pointer ${
                        c.id === activeConversationId
                          ? 'bg-[#0071e3]/10 text-[#0071e3] font-medium'
                          : 'hover:bg-[#f2f2f7] text-[#1d1d1f]'
                      }`}
                    >
                      <span className="truncate">{c.title}</span>
                      <button
                        type="button"
                        onClick={(e) => handleDeleteConversation(c.id, e)}
                        className="text-[#8e8e93] hover:text-[#ff3b30] p-1 cursor-pointer"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* Danh sách tin nhắn */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-white">
            {isLoadingMessages ? (
              <div className="h-full flex items-center justify-center text-xs text-[#8e8e93] gap-2">
                <Loader2 className="w-4 h-4 animate-spin text-[#0071e3]" />
                Đang tải...
              </div>
            ) : messages.length === 0 && !isStreaming ? (
              /* Màn hình chào đơn giản */
              <div className="h-full flex flex-col items-center justify-center text-center p-4 space-y-3">
                <div className="w-10 h-10 rounded-full bg-[#f2f2f7] flex items-center justify-center">
                  <Sparkles className="w-5 h-5 text-[#0071e3]" />
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-[#1d1d1f]">Bạn cần tra cứu điều gì?</h4>
                  <p className="text-xs text-[#8e8e93] mt-0.5">Đặt câu hỏi dựa trên các tài liệu trong dự án</p>
                </div>
                <div className="w-full pt-1 flex flex-col gap-1.5 max-w-xs">
                  {[
                    'Tóm tắt nội dung chính trong tài liệu?',
                    'Quy định hoặc chính sách cần lưu ý là gì?',
                  ].map((prompt, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleSendMessage(prompt)}
                      className="w-full text-left px-3 py-2 rounded-xl bg-[#f2f2f7] hover:bg-[#e5e5ea] text-xs text-[#1d1d1f] transition-colors cursor-pointer truncate"
                    >
                      {prompt}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <>
                {messages.map((msg) => {
                  const isUser = msg.senderType === 'USER';
                  return (
                    <div key={msg.id} className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
                      <div
                        className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm ${
                          isUser
                            ? 'bg-[#0071e3] text-white rounded-br-xs'
                            : 'bg-[#f2f2f7] text-[#1d1d1f] rounded-bl-xs leading-relaxed'
                        }`}
                      >
                        <div className="whitespace-pre-wrap">{msg.content}</div>

                        {/* Tag phạm vi tài liệu nhỏ gọn */}
                        {isUser && msg.scopeNote && (
                          <div className="mt-1 text-[10px] text-white/70">
                            {msg.scopeNote}
                          </div>
                        )}

                        {/* Nguồn trích dẫn tinh gọn */}
                        {!isUser && msg.citations && msg.citations.length > 0 && (
                          <div className="mt-2 pt-2 border-t border-black/[0.06] flex flex-wrap items-center gap-1.5">
                            <span className="text-[10px] text-[#8e8e93]">Nguồn:</span>
                            {msg.citations.map((cit, idx) => (
                              <button
                                key={idx}
                                onClick={() => onOpenDocumentPreview?.(cit.documentId)}
                                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-white border border-black/[0.08] hover:border-[#0071e3] text-[11px] text-[#0071e3] font-medium transition-colors cursor-pointer shadow-2xs"
                                title={`Trang ${cit.pageNumber || 'N/A'}`}
                              >
                                <FileText className="w-2.5 h-2.5" />
                                <span className="max-w-[120px] truncate">{cit.documentName}</span>
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}

                {/* Bong bóng đang sinh câu trả lời */}
                {isStreaming && (
                  <div className="flex justify-start">
                    <div className="max-w-[85%] rounded-2xl rounded-bl-xs px-3.5 py-2.5 bg-[#f2f2f7] text-[#1d1d1f] text-sm leading-relaxed">
                      <div className="whitespace-pre-wrap">
                        {streamingTokenContent || (
                          <span className="text-[#8e8e93] text-xs inline-flex items-center gap-1.5">
                            <Loader2 className="w-3 h-3 animate-spin text-[#0071e3]" />
                            Đang trả lời...
                          </span>
                        )}
                        <span className="inline-block w-1.5 h-3 ml-0.5 bg-[#0071e3] animate-pulse align-middle" />
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}

            {errorMessage && (
              <div className="p-2 rounded-xl bg-[#ff3b30]/10 text-[#ff3b30] text-xs">
                {errorMessage}
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Chân trang nhập câu hỏi + chọn tài liệu gọn gàng */}
          <div className="p-3 border-t border-black/[0.06] bg-white space-y-2">
            
            {/* Bộ chọn tài liệu dạng pill nhỏ gọn */}
            <div className="flex items-center justify-between px-1">
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setIsDocSelectorOpen(!isDocSelectorOpen)}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#f2f2f7] hover:bg-[#e5e5ea] text-[#1d1d1f] text-xs font-medium transition-colors cursor-pointer"
                >
                  <FileText className="w-3 h-3 text-[#0071e3]" />
                  <span>
                    {selectedDocIds.length === 0
                      ? `Tất cả tài liệu (${documents.length})`
                      : `${selectedDocIds.length} tài liệu đã chọn`}
                  </span>
                  <ChevronDown className="w-3 h-3 text-[#8e8e93]" />
                </button>

                {/* Popover checklist tài liệu */}
                {isDocSelectorOpen && (
                  <div
                    ref={docSelectorRef}
                    className="absolute bottom-full left-0 mb-2 w-64 bg-white rounded-2xl border border-black/10 shadow-xl p-3 z-30 animate-in fade-in zoom-in-95 duration-150"
                  >
                    <div className="flex items-center justify-between pb-1.5 border-b border-black/[0.06]">
                      <span className="text-xs font-semibold text-[#1d1d1f]">Chọn tài liệu</span>
                      <button
                        type="button"
                        onClick={() => setSelectedDocIds([])}
                        className="text-[11px] text-[#0071e3] hover:underline cursor-pointer"
                      >
                        Tất cả
                      </button>
                    </div>

                    <div className="max-h-44 overflow-y-auto py-1 space-y-0.5">
                      {documents.length === 0 ? (
                        <p className="text-xs text-[#8e8e93] py-2 text-center">Chưa có tài liệu</p>
                      ) : (
                        documents.map((doc) => {
                          const isSelected = selectedDocIds.includes(doc.id);
                          return (
                            <div
                              key={doc.id}
                              onClick={() => toggleDocSelection(doc.id)}
                              className={`flex items-center gap-2 p-1.5 rounded-lg text-xs cursor-pointer transition-colors ${
                                isSelected
                                  ? 'bg-[#0071e3]/10 text-[#0071e3] font-medium'
                                  : 'hover:bg-[#f2f2f7] text-[#1d1d1f]'
                              }`}
                            >
                              <div
                                className={`w-3.5 h-3.5 rounded flex items-center justify-center border ${
                                  isSelected
                                    ? 'bg-[#0071e3] border-[#0071e3] text-white'
                                    : 'border-black/20 bg-white'
                                }`}
                              >
                                {isSelected && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                              </div>
                              <span className="truncate flex-1">{doc.originalName}</span>
                            </div>
                          );
                        })
                      )}
                    </div>

                    <div className="pt-1.5 mt-1 border-t border-black/[0.06] flex justify-end">
                      <button
                        type="button"
                        onClick={() => setIsDocSelectorOpen(false)}
                        className="px-2.5 py-1 bg-[#0071e3] text-white rounded-lg text-xs font-medium cursor-pointer"
                      >
                        Xong
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {selectedDocIds.length > 0 && (
                <button
                  type="button"
                  onClick={() => setSelectedDocIds([])}
                  className="text-[11px] text-[#8e8e93] hover:text-[#ff3b30] cursor-pointer"
                >
                  Bỏ lọc
                </button>
              )}
            </div>

            {/* Khung nhập tin nhắn phong cách iMessage */}
            <div className="flex items-center gap-2 bg-[#f2f2f7] rounded-full px-3.5 py-1.5 focus-within:bg-white focus-within:ring-2 focus-within:ring-[#0071e3]/20 border border-black/[0.06] transition-all">
              <textarea
                ref={textareaRef}
                value={inputQuery}
                onChange={(e) => setInputQuery(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Nhập câu hỏi... (Enter để gửi)"
                rows={1}
                className="flex-1 max-h-24 min-h-[30px] py-1 bg-transparent text-xs text-[#1d1d1f] placeholder-[#8e8e93] resize-none focus:outline-none"
                style={{ height: 'auto' }}
              />

              {isStreaming ? (
                <button
                  type="button"
                  onClick={handleStopStreaming}
                  className="w-7 h-7 rounded-full bg-[#ff3b30] text-white flex items-center justify-center shrink-0 cursor-pointer shadow-xs hover:bg-[#e0342a]"
                  title="Dừng"
                >
                  <Square className="w-3 h-3 fill-white" />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => handleSendMessage()}
                  disabled={!inputQuery.trim()}
                  className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 transition-all ${
                    inputQuery.trim()
                      ? 'bg-[#0071e3] text-white cursor-pointer hover:bg-[#0077ed] active:scale-90'
                      : 'bg-black/10 text-white/50 cursor-not-allowed'
                  }`}
                  title="Gửi"
                >
                  <Send className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

          </div>
        </div>
      )}
    </>
  );
};

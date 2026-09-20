import apiClient from '../lib/axios';
import { useAuthStore } from '../store/authStore';
import type { ApiResponse } from '../types/auth';
import type { ChatConversationItem, ChatMessageItem, CitationItem } from '../types/chat';

export interface StreamDonePayload {
  messageId: string;
  fullContent: string;
  citations: CitationItem[];
}

export const chatApi = {
  getConversations: async (projectId: string) => {
    const res = await apiClient.get<ApiResponse<ChatConversationItem[]>>(
      `/projects/${projectId}/chat/conversations`
    );
    return res.data;
  },

  createConversation: async (projectId: string, title: string) => {
    const res = await apiClient.post<ApiResponse<ChatConversationItem>>(
      `/projects/${projectId}/chat/conversations`,
      { title }
    );
    return res.data;
  },

  getMessages: async (projectId: string, conversationId: string) => {
    const res = await apiClient.get<ApiResponse<ChatMessageItem[]>>(
      `/projects/${projectId}/chat/conversations/${conversationId}/messages`
    );
    return res.data;
  },

  deleteConversation: async (projectId: string, conversationId: string) => {
    const res = await apiClient.delete<ApiResponse<null>>(
      `/projects/${projectId}/chat/conversations/${conversationId}`
    );
    return res.data;
  },

  /**
   * Streams chat answers via SSE over fetch
   */
  streamMessage: async (
    projectId: string,
    conversationId: string,
    question: string,
    documentIds: string[] | undefined,
    callbacks: {
      onToken: (token: string) => void;
      onDone: (payload: StreamDonePayload) => void;
      onError: (errorMessage: string) => void;
    },
    signal?: AbortSignal
  ) => {
    const token = useAuthStore.getState().accessToken;

    try {
      const response = await fetch(
        `/api/v1/projects/${projectId}/chat/conversations/${conversationId}/messages/stream`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({
            question,
            ...(documentIds && documentIds.length > 0 ? { documentIds } : {}),
          }),
          signal,
        }
      );

      if (!response.ok) {
        let errMessage = `HTTP error ${response.status}`;
        try {
          const errJson = await response.json();
          if (errJson.message) errMessage = errJson.message;
        } catch {
          // ignore
        }
        callbacks.onError(errMessage);
        return;
      }

      const reader = response.body?.getReader();
      if (!reader) {
        callbacks.onError('Trình duyệt không hỗ trợ đọc stream.');
        return;
      }

      const decoder = new TextDecoder('utf-8');
      let buffer = '';

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });

        // SSE messages are separated by double newlines (\n\n or \r\n\r\n)
        const parts = buffer.split(/\r?\n\r?\n/);
        buffer = parts.pop() || ''; // keep the last incomplete chunk

        for (const part of parts) {
          const lines = part.split(/\r?\n/);
          let eventName = 'message';
          let dataStr = '';

          for (const line of lines) {
            if (line.startsWith('event:')) {
              eventName = line.substring(6).trim();
            } else if (line.startsWith('data:')) {
              dataStr = line.substring(5).trim();
            }
          }

          if (!dataStr) continue;

          try {
            const parsed = JSON.parse(dataStr);
            if (eventName === 'token' || parsed.token !== undefined) {
              if (parsed.token) {
                callbacks.onToken(parsed.token);
              }
            } else if (eventName === 'done' || parsed.fullContent !== undefined) {
              callbacks.onDone({
                messageId: parsed.messageId,
                fullContent: parsed.fullContent,
                citations: parsed.citations || [],
              });
            } else if (eventName === 'error' || parsed.error) {
              callbacks.onError(parsed.error || 'Đã có lỗi xảy ra từ AI');
            }
          } catch {
            // If not JSON, it could be raw text token
            if (eventName === 'token') {
              callbacks.onToken(dataStr);
            }
          }
        }
      }
    } catch (err: any) {
      if (err.name === 'AbortError') {
        // User aborted the stream intentionally
        return;
      }
      callbacks.onError(err.message || 'Lỗi kết nối khi nhận phản hồi từ AI');
    }
  },
};

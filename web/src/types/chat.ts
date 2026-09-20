export interface CitationItem {
  documentId: string;
  documentName: string;
  pageNumber: number | null;
  snippet: string;
  similarity: number;
}

export interface ChatMessageItem {
  id: string;
  conversationId: string;
  senderType: 'USER' | 'ASSISTANT';
  content: string;
  citations?: CitationItem[];
  scopeNote?: string;
  createdAt: string;
}

export interface ChatConversationItem {
  id: string;
  projectId: string;
  title: string;
  createdAt: string;
  updatedAt: string;
}

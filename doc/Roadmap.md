# Project Roadmap & Phases
Dựa trên phương pháp **Feature-based** (Làm cuốn chiếu Fullstack) và ưu tiên **Logic trước, Đẹp sau**, dự án được chia thành các Giai đoạn (Phases) rõ ràng như sau:

## Phase 0: Infrastructure & Setup (Đã hoàn thành)
Mục tiêu: Đặt nền móng cho toàn bộ dự án.
- **DevOps**: Chạy PostgreSQL (`pgvector/pgvector:pg16`) và MinIO qua Docker Compose.
- **Backend**: Khởi tạo Spring Boot (Maven, Java 21), kết nối DB, cấu hình MinIO.
- **Frontend**: Khởi tạo React (Vite, TypeScript, Tailwind), cấu hình Router & Axios.

## Phase 1: Identity & Security (Đã hoàn thành)
Mục tiêu: Đảm bảo người dùng có thể đăng ký, đăng nhập an toàn.
- **Backend**: Entity `User`, `Role`, `Permission`, Spring Security & JWT Filter, Token Refresh, DataInitializer.
- **Frontend**: Trang Đăng ký, Đăng nhập phong cách Apple ID, Zustand Auth store, Axios Interceptors.

## Phase 2: Project Management & Members RBAC (Đã hoàn thành)
Mục tiêu: Hệ thống tạo Project và quản lý thành viên phân quyền 4 cấp độ.
- **Backend**: Entity `Project`, `ProjectMember`, ProjectSecurityService, bảo vệ Owner duy nhất, MapStruct mappers, Enum `ProjectRole`, `SystemRole`, `AppPermission`.
- **Frontend**: Trang Dashboard, Chi tiết dự án, Modal mời thành viên, đổi quyền trực tiếp, bảo vệ xóa Owner.

## Phase 3: Knowledge Base (Đã hoàn thành)
Mục tiêu: Tải lên, tải xuống và quản lý file với MinIO.
- **Backend**: Entity `Document`, MinIO storage upload/presigned download, soft delete, phân quyền tài liệu.
- **Frontend**: Kéo thả upload file, danh sách tài liệu, tải trực tiếp trên trang, chống lỗi màn hình trắng với Error Boundary.

## Phase 4: Polish UI/UX (Đã hoàn thành)
Mục tiêu: Trải nghiệm Apple Ecosystem cao cấp, mượt mà.
- Hệ thống thông báo Apple Toast notification tự viết không phụ thuộc thư viện ngoài.
- Đăng nhập chuẩn Apple ID tối giản, xóa các nút quick login rườm rà.
- Apple Error Boundary toàn cục.

## Phase 5: AI Chatbot Hỏi Đáp Tài Liệu - RAG (Đã hoàn thành)
Mục tiêu: Đưa AI cục bộ (Ollama Local) vào hỏi đáp thông minh trên tài liệu dự án, bảo mật 100% On-Premise.
- **Quy cách chi tiết**: Xem tại [Phase_5_AI_Chatbot_RAG.md](file:///Users/tqbao4205/Documents/Project/doc/phases/Phase_5_AI_Chatbot_RAG.md).
- **Hạ tầng Vector**: PostgreSQL 16 `pgvector 0.8.6`, vector 768 chiều với index HNSW cosine similarity.
- **Mô hình AI**: Ollama Local trên Apple Silicon M2 Metal (`nomic-embed-text` cho Vector Embeddings + `llama3.2:3b` cho Streaming Chat).
- **Text Extraction & Ingestion**: Tự động bóc tách PDF (PDFBox), Word DOCX (Apache POI), Text/Markdown và Semantic Overlapping Chunker (2500 chars, 400 overlap).
- **Bảo mật RAG**: Cách ly tuyệt đối theo `project_id = :projectId`, yêu cầu quyền `DOC_READ`, chống rò rỉ dữ liệu chéo dự án.
- **Giao diện & Trải nghiệm**: Apple Glassmorphism AIChatDrawer, Server-Sent Events (SSE) streaming gõ chữ thời gian thực, thẻ trích dẫn nguồn tài liệu (Citations) kèm % tương quan, huy hiệu trạng thái Indexing trên danh sách tài liệu.

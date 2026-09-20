import puppeteer from 'puppeteer-core';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CHROME_PATH = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';

function toBase64(filename) {
    const filePath = path.join(__dirname, filename);
    if (!fs.existsSync(filePath)) return '';
    const bitmap = fs.readFileSync(filePath);
    return `data:image/png;base64,${bitmap.toString('base64')}`;
}

const imgLogin = toBase64('01_login_page.png');
const imgProjectDetail = toBase64('03_project_detail_documents.png');
const imgAiChat = toBase64('04_ai_rag_chat_active.png');
const imgAdmin = toBase64('05_admin_dashboard.png');
const imgSwagger = toBase64('06_swagger_api_expanded.png');
const imgDatabase = toBase64('08_database_postgres.png');

const htmlContent = `<!DOCTYPE html>
<html lang="vi">
<head>
<meta charset="UTF-8">
<title>Báo Cáo Đồ Án - Enterprise Knowledge Base</title>
<style>
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600&display=swap');

  @page {
    size: A4 portrait;
    margin: 10mm 12mm 10mm 12mm;
  }

  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
    color: #1d1d1f;
    line-height: 1.45;
    background: #ffffff;
    font-size: 9pt;
  }

  .sheet {
    page-break-after: always;
    height: 100%;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
  }
  .sheet:last-child {
    page-break-after: avoid;
  }

  /* Header Cover / Hero */
  .cover-header {
    border-bottom: 2px solid #0071e3;
    padding-bottom: 12px;
    margin-bottom: 14px;
  }
  .tagline {
    font-size: 8pt;
    text-transform: uppercase;
    letter-spacing: 1.5px;
    color: #0071e3;
    font-weight: 700;
    margin-bottom: 4px;
  }
  h1.project-title {
    font-size: 17pt;
    font-weight: 800;
    color: #1d1d1f;
    line-height: 1.2;
    margin-bottom: 4px;
  }
  h2.project-subtitle {
    font-size: 9.5pt;
    font-weight: 500;
    color: #6e6e73;
    margin-bottom: 12px;
  }

  .meta-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 8px;
    background: #f5f5f7;
    padding: 10px 14px;
    border-radius: 8px;
    border: 1px solid #e5e5ea;
    font-size: 8.5pt;
  }
  .meta-item strong {
    color: #1d1d1f;
    display: inline-block;
    min-width: 95px;
  }
  .meta-item a {
    color: #0071e3;
    text-decoration: none;
    font-weight: 600;
  }

  /* Section Styles */
  h2.section-title {
    font-size: 11.5pt;
    font-weight: 700;
    color: #1d1d1f;
    border-left: 3.5px solid #0071e3;
    padding-left: 8px;
    margin-top: 10px;
    margin-bottom: 8px;
  }
  h3.subsection-title {
    font-size: 9.5pt;
    font-weight: 600;
    color: #333336;
    margin-top: 8px;
    margin-bottom: 4px;
  }
  p {
    margin-bottom: 6px;
    color: #3a3a3c;
    text-align: justify;
    font-size: 8.5pt;
  }

  /* Badges */
  .badge-list {
    display: flex;
    flex-wrap: wrap;
    gap: 5px;
    margin: 6px 0 10px 0;
  }
  .badge {
    background: #e8f2fe;
    color: #0071e3;
    font-size: 7.2pt;
    font-weight: 600;
    padding: 2.5px 7px;
    border-radius: 4px;
    border: 1px solid #c7e0fc;
  }

  /* Screenshot Figure */
  .figure-card {
    background: #ffffff;
    border: 1px solid #d2d2d7;
    border-radius: 8px;
    overflow: hidden;
    margin: 8px 0;
    box-shadow: 0 2px 8px rgba(0,0,0,0.05);
  }
  .figure-card img {
    width: 100%;
    display: block;
    object-fit: cover;
    object-position: top;
  }
  .figure-caption {
    padding: 5px 10px;
    background: #fbfbfd;
    border-top: 1px solid #e5e5ea;
    font-size: 7.5pt;
    color: #515154;
    display: flex;
    justify-content: space-between;
  }
  .figure-caption span.fig-num {
    font-weight: 700;
    color: #0071e3;
  }

  /* Tables */
  table {
    width: 100%;
    border-collapse: collapse;
    margin: 6px 0;
    font-size: 8pt;
  }
  th, td {
    padding: 5px 8px;
    border: 1px solid #d2d2d7;
    text-align: left;
  }
  th {
    background: #f5f5f7;
    font-weight: 600;
    color: #1d1d1f;
  }
  tr:nth-child(even) td {
    background: #fafafc;
  }

  /* Code block */
  pre {
    background: #1c1c1e;
    color: #30d158;
    padding: 8px 12px;
    border-radius: 6px;
    font-family: 'JetBrains Mono', monospace;
    font-size: 7.5pt;
    line-height: 1.4;
    overflow-x: auto;
    margin: 6px 0;
  }

  /* Feature Checklist */
  .feature-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 6px;
    margin: 6px 0;
  }
  .feature-item {
    background: #fbfbfd;
    border: 1px solid #e5e5ea;
    border-radius: 6px;
    padding: 6px 8px;
    font-size: 8pt;
  }
  .feature-item strong {
    color: #1d1d1f;
    display: block;
    margin-bottom: 2px;
  }

  .sheet-footer {
    display: flex;
    justify-content: space-between;
    align-items: center;
    border-top: 1px solid #e5e5ea;
    padding-top: 6px;
    margin-top: 8px;
    font-size: 7.5pt;
    color: #86868b;
  }
</style>
</head>
<body>

  <!-- ==================== TRANG 1: BÌA & TỔNG QUAN ==================== -->
  <div class="sheet">
    <div>
      <div class="cover-header">
        <div class="tagline">BÁO CÁO NGHIỆM THU ĐỒ ÁN / DỰ ÁN PHẦN MỀM CHUYÊN SÂU</div>
        <h1 class="project-title">📚 Enterprise Knowledge Base System</h1>
        <h2 class="project-subtitle">Hệ Thống Quản Trị Tri Thức Doanh Nghiệp & Trợ Lý RAG AI Cục Bộ (On-Premise / Privacy-First)</h2>

        <div class="meta-grid">
          <div class="meta-item">
            <strong>Sinh viên / Tác giả:</strong> Trần Quốc Bảo<br>
            <strong>Email liên hệ:</strong> tqbao4205@gmail.com<br>
            <strong>Thời gian hoàn thành:</strong> Tháng 09/2026
          </div>
          <div class="meta-item">
            <strong>GitHub Repository:</strong> <a href="https://github.com/tqbao4205/knowledge-base">github.com/tqbao4205/knowledge-base</a><br>
            <strong>Nhánh chính (Branch):</strong> <code>main</code> (Đã commit & push đầy đủ)<br>
            <strong>Trạng thái triển khai:</strong> Hoàn tất toàn bộ tính năng & kiểm thử live
          </div>
        </div>
      </div>

      <div class="badge-list">
        <span class="badge">Java 21 LTS</span>
        <span class="badge">Spring Boot 3.4+</span>
        <span class="badge">React 19</span>
        <span class="badge">TypeScript 5</span>
        <span class="badge">PostgreSQL 16</span>
        <span class="badge">pgvector (HNSW Index)</span>
        <span class="badge">MinIO S3 Storage</span>
        <span class="badge">Ollama (Llama 3.2:3b & Nomic-Embed)</span>
        <span class="badge">SpringDoc OpenAPI 3.1 & Swagger UI</span>
        <span class="badge">Docker Compose</span>
      </div>

      <h2 class="section-title">1. Mục Tiêu & Điểm Nhấn Công Nghệ Cốt Lõi</h2>
      <p>
        <strong>Enterprise Knowledge Base System</strong> là nền tảng quản trị tài liệu và tri thức nội bộ được thiết kế đặc thù cho các tổ chức, doanh nghiệp có yêu cầu bảo mật dữ liệu khắt khe. Điểm nổi bật nhất của dự án là kiến trúc <strong>Privacy-First 100% On-Premise/Offline</strong>: toàn bộ quá trình trích xuất văn bản, sinh vector nhúng (embedding), lập chỉ mục tìm kiếm và mô hình ngôn ngữ lớn (LLM) đều vận hành cục bộ mà không gửi bất kỳ byte dữ liệu nào ra máy chủ bên thứ ba.
      </p>

      <div class="feature-grid">
        <div class="feature-item">
          <strong>🔐 Phân Quyền 2 Tầng (RBAC Multi-Level)</strong>
          Hệ thống xác thực JWT (Access 15p, Refresh 7d). Quản trị 2 cấp: Hệ thống (System Admin, User) và Dự án (Owner, Manager, Editor, Viewer).
        </div>
        <div class="feature-item">
          <strong>🤖 Trợ Lý RAG AI Đọc Bảng Biểu Phức Tạp</strong>
          Trích xuất Apache PDFBox (PDF) & Apache POI (DOCX bao gồm toàn bộ Table). Lập chỉ mục HNSW vector Cosine 768 chiều.
        </div>
        <div class="feature-item">
          <strong>📁 MinIO S3 Storage & Document QuickLook</strong>
          Lưu trữ đám mây riêng MinIO tương thích S3. Tải/xem trực tiếp PDF, Word, Markdown ngay trên web qua Presigned URL bảo mật.
        </div>
        <div class="feature-item">
          <strong>📊 Admin Dashboard & Swagger UI OpenAPI 3.1</strong>
          Thống kê thời gian thực với biểu đồ Recharts. Tích hợp đầy đủ Swagger UI tương tác trực tiếp với JWT Bearer Auth.
        </div>
      </div>

      <h3 class="subsection-title">1.1. Giao Diện Đăng Nhập & Quick User Switcher</h3>
      <p>
        Thiết kế theo ngôn ngữ <strong>Apple Glassmorphism</strong> hiện đại với bảng màu HSL cao cấp. Tích hợp sẵn công cụ <em>Quick User Switcher</em> giúp người đánh giá chuyển nhanh giữa các vai trò (Admin, Owner, Manager, Editor, Viewer) chỉ với 1 click chuột.
      </p>

      <div class="figure-card">
        <img src="${imgLogin}" style="max-height: 220px;" alt="Giao diện đăng nhập">
        <div class="figure-caption">
          <span><span class="fig-num">Hình 1.1:</span> Màn hình đăng nhập hệ thống bảo mật JWT và hỗ trợ Quick Switcher chuyển đổi tài khoản mẫu.</span>
          <span>Client: React 19 + Tailwind CSS</span>
        </div>
      </div>
    </div>

    <div class="sheet-footer">
      <span>Enterprise Knowledge Base System • Báo Cáo Nghiệm Thu</span>
      <span>Trang 1 / 5</span>
    </div>
  </div>

  <!-- ==================== TRANG 2: CƠ SỞ DỮ LIỆU & PGVECTOR ==================== -->
  <div class="sheet">
    <div>
      <h2 class="section-title">2. Thiết Kế Cơ Sở Dữ Liệu PostgreSQL 16 & Extension pgvector</h2>
      <p>
        Hệ thống sử dụng <strong>PostgreSQL 16</strong> với 11 bảng chuẩn quan hệ, chia thành 4 phân hệ chính. Điểm cốt lõi là extension <strong>pgvector</strong> được tích hợp để lưu trữ vector nhúng 768 chiều (từ mô hình <code>nomic-embed-text</code>) và tăng tốc tìm kiếm độ tương đồng Cosine bằng chỉ mục <strong>HNSW (Hierarchical Navigable Small World)</strong>: <code>CREATE INDEX idx_document_chunks_embedding ON document_chunks USING hnsw (embedding vector_cosine_ops);</code>
      </p>

      <div class="figure-card">
        <img src="${imgDatabase}" style="max-height: 245px;" alt="PostgreSQL Schema & HNSW Index">
        <div class="figure-caption">
          <span><span class="fig-num">Hình 2.1:</span> Ảnh chụp thực tế terminal PostgreSQL: Danh sách 11 bảng quan hệ (\dt+) và cấu trúc bảng document_chunks với vector(768) + chỉ mục HNSW.</span>
          <span>PostgreSQL 16.15 + pgvector</span>
        </div>
      </div>

      <h3 class="subsection-title">2.1. Bảng Tổng Hợp 11 Quan Hệ Dữ Liệu</h3>
      <table>
        <thead>
          <tr>
            <th style="width: 22%;">Bảng Quan Hệ</th>
            <th style="width: 20%;">Phân Hệ</th>
            <th style="width: 58%;">Chức Năng & Ràng Buộc Khóa Ngoại (Foreign Keys)</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td><strong>users</strong>, <strong>user_roles</strong></td>
            <td>Auth & Identity</td>
            <td>Lưu tài khoản, mật khẩu băm BCrypt, liên kết Many-to-Many với bảng <code>roles</code>.</td>
          </tr>
          <tr>
            <td><strong>roles</strong>, <strong>permissions</strong></td>
            <td>RBAC Definitions</td>
            <td>Quyền Hệ thống (<code>ROLE_SYSTEM_ADMIN</code>) và Dự án. Ràng buộc quan hệ qua <code>role_permissions</code>.</td>
          </tr>
          <tr>
            <td><strong>projects</strong></td>
            <td>Workspaces</td>
            <td>Không gian làm việc cô lập (Multi-tenancy), hỗ trợ Soft Delete và JPA Auditing (<code>created_by</code>, <code>created_at</code>).</td>
          </tr>
          <tr>
            <td><strong>project_members</strong></td>
            <td>Membership</td>
            <td>Thành viên tham gia từng dự án kèm vai trò tương ứng (Owner, Manager, Editor, Viewer).</td>
          </tr>
          <tr>
            <td><strong>documents</strong></td>
            <td>Object Storage</td>
            <td>Siêu dữ liệu file (MinIO S3 object key, size, MIME type, trạng thái <code>INDEXED/PENDING</code>).</td>
          </tr>
          <tr>
            <td><strong>document_chunks</strong></td>
            <td>Vector Store AI</td>
            <td>Đoạn văn bản, số trang và <strong>vector(768)</strong>. Khóa ngoại liên kết <code>documents(id) ON DELETE CASCADE</code>.</td>
          </tr>
          <tr>
            <td><strong>chat_conversations</strong>, <strong>chat_messages</strong></td>
            <td>RAG Conversations</td>
            <td>Lịch sử phiên chat theo ngữ cảnh từng dự án; tin nhắn phản hồi của LLM kèm <strong>JSON citations</strong>.</td>
          </tr>
        </tbody>
      </table>
    </div>

    <div class="sheet-footer">
      <span>Enterprise Knowledge Base System • Báo Cáo Nghiệm Thu</span>
      <span>Trang 2 / 5</span>
    </div>
  </div>

  <!-- ==================== TRANG 3: REST API & SWAGGER UI ==================== -->
  <div class="sheet">
    <div>
      <h2 class="section-title">3. Tài Liệu Hóa & Kiểm Thử REST API với Swagger UI (OpenAPI 3.1)</h2>
      <p>
        Dự án tích hợp đầy đủ thư viện <strong>SpringDoc OpenAPI 3.1</strong> (<code>springdoc-openapi-starter-webmvc-ui</code>). Toàn bộ 5 nhóm Controllers được phân nhóm trực quan kèm tài liệu hóa chi tiết tại <code>http://localhost:8080/swagger-ui.html</code>. Hệ thống tích hợp sẵn <strong>JWT Bearer Authentication</strong> giúp kiểm thử trực tiếp mọi API có bảo mật.
      </p>

      <div class="figure-card">
        <img src="${imgSwagger}" style="max-height: 250px;" alt="Swagger UI OpenAPI 3.1">
        <div class="figure-caption">
          <span><span class="fig-num">Hình 3.1:</span> Giao diện Swagger UI (OpenAPI 3.1) với nút Authorize (JWT Bearer Token) và các nhóm API được phân loại rõ ràng.</span>
          <span>OpenAPI 3.1.0 • SpringDoc</span>
        </div>
      </div>

      <h3 class="subsection-title">3.1. Danh Sách Các Endpoint REST API Chủ Đạo</h3>
      <table>
        <thead>
          <tr>
            <th style="width: 10%;">Method</th>
            <th style="width: 38%;">Endpoint</th>
            <th style="width: 36%;">Mô Tả Chức Năng</th>
            <th style="width: 16%;">Quyền Yêu Cầu</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td><strong style="color: #28a745;">POST</strong></td>
            <td><code>/api/v1/auth/login</code></td>
            <td>Đăng nhập hệ thống, trả JWT Access & Refresh Token</td>
            <td>Public</td>
          </tr>
          <tr>
            <td><strong style="color: #28a745;">POST</strong></td>
            <td><code>/api/v1/auth/register</code></td>
            <td>Đăng ký tài khoản người dùng mới</td>
            <td>Public</td>
          </tr>
          <tr>
            <td><strong style="color: #0071e3;">GET</strong></td>
            <td><code>/api/v1/projects</code></td>
            <td>Lấy danh sách các dự án người dùng tham gia</td>
            <td>Authenticated</td>
          </tr>
          <tr>
            <td><strong style="color: #28a745;">POST</strong></td>
            <td><code>/api/v1/projects/{id}/documents</code></td>
            <td>Upload file lên MinIO S3 và kích hoạt bóc tách vector hóa</td>
            <td>Editor / Owner</td>
          </tr>
          <tr>
            <td><strong style="color: #0071e3;">GET</strong></td>
            <td><code>/api/v1/projects/{id}/documents/{docId}/download-url</code></td>
            <td>Sinh Presigned URL xem trước file bảo mật trong 1 giờ</td>
            <td>Project Viewer+</td>
          </tr>
          <tr>
            <td><strong style="color: #28a745;">POST</strong></td>
            <td><code>/api/v1/projects/{id}/chat/conversations/.../stream</code></td>
            <td>Hỏi đáp RAG phát luồng thời gian thực (Server-Sent Events)</td>
            <td>Project Member</td>
          </tr>
          <tr>
            <td><strong style="color: #0071e3;">GET</strong></td>
            <td><code>/api/v1/admin/dashboard/stats</code></td>
            <td>Lấy chỉ số phân tích người dùng, dự án, vector chunks</td>
            <td>System Admin</td>
          </tr>
        </tbody>
      </table>
    </div>

    <div class="sheet-footer">
      <span>Enterprise Knowledge Base System • Báo Cáo Nghiệm Thu</span>
      <span>Trang 3 / 5</span>
    </div>
  </div>

  <!-- ==================== TRANG 4: TÀI LIỆU & RAG AI CHAT ==================== -->
  <div class="sheet">
    <div>
      <h2 class="section-title">4. Quản Lý Tài Liệu & Trợ Lý RAG AI Trích Dẫn Nguồn (Citations)</h2>
      <p>
        Hệ thống hỗ trợ nạp nhiều định dạng tài liệu (PDF, Word DOCX, Markdown, Text). Cơ chế bóc tách thông minh hỗ trợ <strong>đọc toàn bộ bảng biểu trong file Word</strong> (vượt qua hạn chế thông thường của Apache POI paragraphs), tự động chia đoạn sliding window và đẩy vào pgvector.
      </p>

      <h3 class="subsection-title">4.1. Quản Lý Tài Liệu Đã Vector Hóa Trong Dự Án</h3>
      <div class="figure-card">
        <img src="${imgProjectDetail}" style="max-height: 195px;" alt="Danh sách tài liệu dự án">
        <div class="figure-caption">
          <span><span class="fig-num">Hình 4.1:</span> Chi tiết dự án: Tệp Speaking.docx được bóc tách hoàn tất 5 đoạn (✨ 5 đoạn) kèm các nút QuickLook và Tải về.</span>
          <span>UI: React 19</span>
        </div>
      </div>

      <h3 class="subsection-title">4.2. Trợ Lý RAG AI Trả Lời Câu Hỏi Kèm Trích Dẫn Số Trang & Nguồn File</h3>
      <p>
        Khi người dùng gửi câu hỏi, hệ thống chuyển câu hỏi thành vector qua <code>nomic-embed-text</code>, truy vấn 5 đoạn văn bản tương đồng nhất từ pgvector, và truyền ngữ cảnh vào mô hình <code>llama3.2:3b</code> trên Ollama. Câu trả lời được hiển thị dạng streaming kèm <strong>các nút trích dẫn nguồn tài liệu tham chiếu</strong>.
      </p>

      <div class="figure-card">
        <img src="${imgAiChat}" style="max-height: 220px;" alt="Hội thoại RAG AI có trích dẫn">
        <div class="figure-caption">
          <span><span class="fig-num">Hình 4.2:</span> Cửa sổ hỏi đáp AI RAG: Mô hình trích xuất thông tin chính xác từ bảng dữ liệu trong Speaking.docx kèm danh sách citations nguồn.</span>
          <span>Ollama • Llama 3.2:3b</span>
        </div>
      </div>
    </div>

    <div class="sheet-footer">
      <span>Enterprise Knowledge Base System • Báo Cáo Nghiệm Thu</span>
      <span>Trang 4 / 5</span>
    </div>
  </div>

  <!-- ==================== TRANG 5: ADMIN PORTAL & HƯỚNG DẪN ==================== -->
  <div class="sheet">
    <div>
      <h2 class="section-title">5. Cổng Quản Trị Hệ Thống (Admin Analytics Portal)</h2>
      <p>
        Cung cấp bảng điều khiển toàn diện cho quản trị viên cấp cao: theo dõi tổng người dùng, dự án, tài liệu, tổng số lượng vector chunks, tỷ lệ xử lý tài liệu (100% hoàn tất) và biểu đồ trực quan hóa số lượng thành viên/tài liệu bằng thư viện <strong>Recharts</strong>.
      </p>

      <div class="figure-card">
        <img src="${imgAdmin}" style="max-height: 190px;" alt="Bảng điều khiển Admin Portal">
        <div class="figure-caption">
          <span><span class="fig-num">Hình 5.1:</span> Admin Analytics Portal: Thống kê số lượng người dùng (5), dự án (2), vector chunks (7) và biểu đồ tiến trình.</span>
          <span>Recharts • Analytics</span>
        </div>
      </div>

      <h2 class="section-title">6. Hướng Dẫn Khởi Chạy Hệ Thống & Tài Khoản Kiểm Thử</h2>
      <pre><code># 1. Khởi động PostgreSQL 16 (pgvector) & MinIO Storage:  docker compose up -d
# 2. Tải mô hình AI trên Ollama (Local RAG):             ollama pull nomic-embed-text && ollama pull llama3.2:3b
# 3. Chạy Backend API (Cổng 8080):                        cd api && ./mvnw spring-boot:run
# 4. Chạy Frontend Web (Cổng 5173):                       cd web && npm install && npm run dev</code></pre>

      <h3 class="subsection-title">6.1. Danh Sách Tài Khoản Mẫu Thiết Lập Sẵn (Data Seeding)</h3>
      <table>
        <thead>
          <tr>
            <th>Vai Trò</th>
            <th>Tài Khoản Email</th>
            <th>Mật Khẩu</th>
            <th>Phạm Vi Quyền Hạn</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td><strong>System Admin</strong></td>
            <td><code>admin@knowledgebase.com</code></td>
            <td><code>Admin12345</code></td>
            <td>Toàn quyền hệ thống, Admin Dashboard, Quản lý tài khoản toàn cục</td>
          </tr>
          <tr>
            <td><strong>Project Owner</strong></td>
            <td><code>owner@knowledgebase.com</code></td>
            <td><code>Password123</code></td>
            <td>Quản lý dự án mẫu, thêm/xóa thành viên, tải lên và xóa tài liệu</td>
          </tr>
          <tr>
            <td><strong>Project Editor</strong></td>
            <td><code>editor@knowledgebase.com</code></td>
            <td><code>Password123</code></td>
            <td>Tải lên tài liệu, xem trước, tải về, tương tác hỏi đáp với AI RAG</td>
          </tr>
          <tr>
            <td><strong>Project Viewer</strong></td>
            <td><code>viewer@knowledgebase.com</code></td>
            <td><code>Password123</code></td>
            <td>Chỉ có quyền xem và tải về tài liệu, sử dụng AI tra cứu</td>
          </tr>
        </tbody>
      </table>

      <h2 class="section-title">7. Kết Luận & Liên Kết Mã Nguồn GitHub</h2>
      <p>
        Dự án đã đáp ứng hoàn chỉnh tất cả các tiêu chí kỹ thuật: kiến trúc bảo mật phân tầng, lưu trữ đám mây tương thích S3, trích xuất dữ liệu đa định dạng, vector search hiệu năng cao với PostgreSQL pgvector HNSW, và trải nghiệm AI RAG cục bộ ổn định.
      </p>
      <p>
        🌐 <strong>Kho mã nguồn GitHub chính thức:</strong> <a href="https://github.com/tqbao4205/knowledge-base" style="color: #0071e3; font-weight: 700; text-decoration: underline;">https://github.com/tqbao4205/knowledge-base</a>
      </p>
    </div>

    <div class="sheet-footer">
      <span>© 2026 Trần Quốc Bảo (tqbao4205@gmail.com) • Enterprise Knowledge Base System</span>
      <span>Trang 5 / 5</span>
    </div>
  </div>

</body>
</html>
`;

async function generatePdf() {
    console.log('Generating perfected 5-page PDF report...');
    const browser = await puppeteer.launch({
        executablePath: CHROME_PATH,
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu']
    });

    const page = await browser.newPage();
    await page.setContent(htmlContent, { waitUntil: 'networkidle0' });

    const outputPath = path.join(__dirname, '..', 'BaoCao_DoAn_KnowledgeBase_TranQuocBao.pdf');
    await page.pdf({
        path: outputPath,
        format: 'A4',
        printBackground: true,
        margin: {
            top: '8mm',
            bottom: '8mm',
            left: '10mm',
            right: '10mm'
        }
    });

    console.log('PDF Report successfully generated at:', outputPath);
    await browser.close();
}

generatePdf();

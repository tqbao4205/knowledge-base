# Detailed Specification - Phase 6: System Administration (Admin)

## 1. Tổng quan & Quy tắc nghiệp vụ (Business Rules)
Module này quản lý các tính năng giám sát toàn cục dành riêng cho Quản trị viên (Super Admin) của hệ thống RAG Knowledge Base.
- **Cô lập dữ liệu (Privacy-First)**: Đảm bảo tính riêng tư dữ liệu đa dự án. Admin **không được phép** xem nội dung chi tiết của bất kỳ tài liệu (`Document` / `DocumentChunk`) hay lịch sử trò chuyện (`ChatConversation`) nào thuộc các Project mà Admin không tham gia với tư cách thành viên.
- **Tính tối giản (Minimalist)**: Các chức năng được thu gọn, tập trung vào việc quản lý trạng thái tài khoản và quan sát vỏ dự án do người dùng đã tự có luồng tự đăng ký (Self-Registration).
- **Quyền hạn (RBAC)**: Chỉ những người dùng mang `SystemRole` là `ROLE_ADMIN` mới có thể gọi các API thuộc module này.

## 2. Thiết kế Cơ sở dữ liệu (Database Schema Updates)

Bảng **`users`**
Cần bổ sung một cột mới để lưu trạng thái kích hoạt/khóa tài khoản:
| Column Name | Data Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `is_active` | BOOLEAN | DEFAULT TRUE, NOT NULL | Trạng thái hoạt động của tài khoản. Admin có thể set về FALSE để Block (Khóa) truy cập của người dùng. |

*Ghi chú: Việc block user qua `is_active` an toàn hơn so với việc dùng `is_deleted` vì chúng ta vẫn muốn giữ lại log và tài khoản mà không coi như xóa mềm.*

## 3. Dữ liệu mẫu (DTOs & Responses)
Cần bổ sung các Response DTOs tinh gọn dùng cho Admin (giấu đi các thông tin không cần thiết hoặc quá chi tiết).
- `AdminUserResponse`: Bổ sung thêm trạng thái `isActive`, `createdAt`, và danh sách roles.
- `AdminProjectResponse`: Chỉ hiển thị metadata cơ bản của Project (Id, name, description, memberCount, documentCount, createdAt).

## 4. Đặc tả API (API Specification)

Tất cả các API dưới đây đều yêu cầu Authentication Header: `Bearer <token>` và phân quyền ở controller bằng `@PreAuthorize("hasAuthority('ROLE_ADMIN')")`.
Tiền tố URL (Base Path): `/api/v1/admin`

### 4.1. Quản lý Người dùng (User Management)

#### 4.1.1. Lấy danh sách toàn bộ người dùng
- **Endpoint**: `GET /users`
- **Mô tả**: Xem danh sách toàn bộ tài khoản trên hệ thống.
- **Query Params**:
  - `page` (default: 0)
  - `size` (default: 20)
  - `search` (optional) - Tìm theo email hoặc họ tên.
- **Response**: `PagedResponse<AdminUserResponse>`

#### 4.1.2. Khóa / Mở khóa người dùng
- **Endpoint**: `PUT /users/{id}/status`
- **Mô tả**: Bật/tắt trạng thái `isActive` của một user để khóa (Ban) không cho đăng nhập/gọi API.
- **Request Body**:
  ```json
  {
      "isActive": false
  }
  ```
- **Response**: `200 OK`

#### 4.1.3. Cập nhật phân quyền (Roles)
- **Endpoint**: `PUT /users/{id}/roles`
- **Mô tả**: Thăng cấp một User thành Admin, hoặc hạ cấp.
- **Request Body**:
  ```json
  {
      "roleNames": ["ADMIN", "USER"]
  }
  ```
- **Response**: `200 OK`

### 4.2. Quản lý Dự án (Project Management)

#### 4.2.1. Lấy danh sách toàn bộ Dự án
- **Endpoint**: `GET /projects`
- **Mô tả**: Lấy danh sách toàn bộ "vỏ" dự án đang có trên hệ thống để giám sát, không bao gồm nội dung tài liệu bên trong.
- **Query Params**:
  - `page` (default: 0)
  - `size` (default: 20)
  - `search` (optional) - Tìm theo tên dự án.
- **Response**: `PagedResponse<AdminProjectResponse>`

#### 4.2.2. Xem danh sách thành viên của một Dự án
- **Endpoint**: `GET /projects/{id}/members`
- **Mô tả**: Cho phép Admin xem ai đang nằm trong một dự án để tiện quản lý và hỗ trợ khi có khiếu nại/sự cố.
- **Response**: `List<ProjectMemberResponse>`

## 5. Bảng Điều Khiển (Admin Dashboard - Đề Xuất)

Để Admin có cái nhìn tổng quan về sức khỏe của toàn bộ hệ thống RAG mà không vi phạm quyền riêng tư, hệ thống đề xuất xây dựng một giao diện Dashboard tổng hợp các chỉ số (Metrics).

### 5.1. Các chỉ số thống kê (System Metrics)
- **Tổng số Người dùng**: (Tổng số tài khoản, Số user đang bị khóa).
- **Tổng số Dự án (Projects)**: Cho biết mức độ sử dụng nền tảng.
- **Tổng số Tài liệu (Documents)**: Cho biết tổng lượng file đã được upload lên MinIO.
- **Tổng số Vector Chunks**: (Tổng số records trong bảng `document_chunks`). Rất quan trọng để theo dõi dung lượng bộ nhớ của Postgres `pgvector` và dự báo chi phí hạ tầng.
- **Trạng thái Xử lý Tài liệu (Ingestion Status)**:
  - Số tài liệu `INDEXED` (Thành công).
  - Số tài liệu `PROCESSING` (Đang chạy).
  - Số tài liệu `FAILED` (Bị lỗi).

### 5.2. API Đề xuất cho Dashboard
#### 5.2.1. Lấy chỉ số thống kê tổng hợp
- **Endpoint**: `GET /dashboard/stats`
- **Mô tả**: Trả về tất cả các con số đếm (Count) tổng hợp trên toàn hệ thống.
- **Response**:
  ```json
  {
      "totalUsers": 150,
      "bannedUsers": 3,
      "totalProjects": 45,
      "totalDocuments": 1200,
      "totalChunks": 45000,
      "documentStatus": {
          "indexed": 1150,
          "processing": 30,
          "failed": 20
      }
  }
  ```

## 6. Các bước triển khai Code
1. Sửa `User.java`: Thêm thuộc tính `@Column(name = "is_active") private Boolean isActive = true;`.
2. Sửa `SecurityConfig` (hoặc Controller) thêm constraint quyền `ADMIN`.
3. Tạo các DTOs `AdminUserResponse`, `AdminProjectResponse`, `AdminDashboardStatsResponse`.
4. Viết `AdminService` thực hiện logic phân trang, cập nhật user, và gom nhóm query đếm số lượng cho Dashboard.
5. Viết `AdminController` map với các endpoint trên.

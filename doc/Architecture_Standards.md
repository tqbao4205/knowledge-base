# Architecture Standards & Suggestions
Tài liệu này định nghĩa các quy chuẩn chung cho toàn bộ dự án để đảm bảo tính nhất quán giữa Backend và Frontend, cũng như các gợi ý nâng cấp (Best Practices) để hệ thống chuyên nghiệp hơn.

## 1. Chuẩn hóa API Response
Tất cả các REST API (dù thành công hay thất bại) đều phải trả về một format JSON đồng nhất. Điều này giúp Frontend dễ dàng cấu hình một Axios Interceptor duy nhất để xử lý.

### 1.1 Khi Thành công (Success)
HTTP Status Code: `200 OK` hoặc `201 Created`
```json
{
  "success": true,
  "message": "Lấy danh sách dự án thành công",
  "data": { ... } // Payload thực tế (Object hoặc Array)
}
```

### 1.2 Khi Có danh sách phân trang (Pagination)
```json
{
  "success": true,
  "message": "Thành công",
  "data": [ ... ],
  "meta": {
    "page": 1,
    "size": 20,
    "totalElements": 150,
    "totalPages": 8
  }
}
```

## 2. Chuẩn hóa Xử lý Ngoại lệ (Exception Handling)
Tại Backend (Spring Boot), áp dụng `@RestControllerAdvice` để bắt toàn bộ Exception và format lại trước khi trả về Client.

### 2.1 Cấu trúc Lỗi chung (Error Response)
HTTP Status Code: `400 (Bad Request)`, `401 (Unauthorized)`, `403 (Forbidden)`, `404 (Not Found)`, `500 (Internal Server Error)`.
```json
{
  "success": false,
  "message": "Tên dự án không được để trống",
  "errorCode": "VALIDATION_FAILED", 
  "timestamp": "2026-09-16T18:48:00Z"
}
```

### 2.2 Quy ước Mã Lỗi (Error Codes)
- `AUTH_FAILED`: Sai email hoặc mật khẩu.
- `TOKEN_EXPIRED`: JWT hết hạn (Frontend dựa vào lỗi này để đá văng ra màn Login hoặc gọi refresh).
- `ACCESS_DENIED`: Không có quyền (VD: Member cố tình xóa Project).
- `RESOURCE_NOT_FOUND`: Không tìm thấy dữ liệu.

## 3. Gợi ý thêm từ chuyên gia (Suggestions)
Để hệ thống hoàn hảo hơn, tôi đề xuất tích hợp thêm 3 tiêu chuẩn sau ngay từ Phase 1:

1. **JPA Auditing (Dấu vết dữ liệu)**: Mọi bảng trong Database đều tự động có 4 cột: `created_at`, `updated_at`, `created_by`, `updated_by`. Backend tự động điền dữ liệu này dựa trên JWT Token của người đang Request (không cần code tay từng hàm).
2. **Soft Delete (Xóa mềm)**: Khi người dùng xóa một Project hoặc File, ta không lệnh `DELETE` thẳng trong DB, mà chỉ update cột `is_deleted = true`. Giúp phục hồi dữ liệu khi lỡ tay xóa nhầm.
3. **Cơ chế Refresh Token**: JWT Token thông thường chỉ nên sống 15 phút để bảo mật. Khi hết hạn, Frontend dùng một `Refresh Token` (sống 7 ngày) để âm thầm xin lại JWT mới mà không bắt User phải gõ lại password. (Rất quan trọng cho UX).

---
> [!IMPORTANT]
> Đây là các tiêu chuẩn cốt lõi. Nếu bạn đồng ý với các **Chuẩn hóa** và **Gợi ý thêm** này, hãy bấm **Proceed**. Sau khi chốt tiêu chuẩn, tôi sẽ tạo thư mục `doc/phases/` và generate ra chi tiết API/Logic cho TỪNG PHASE một theo đúng form chuẩn này!

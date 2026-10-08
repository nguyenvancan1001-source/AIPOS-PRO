# AIPOS·PRO — Bản thương mại đầy đủ 5 app

Đối tác **tự đăng ký** ở trang chủ → chọn gói → đăng nhập **một lần** → mở app nào cũng vào thẳng.
Mọi đối tác dùng chung **một project Supabase (AIPOS-PRO)**; dữ liệu tách riêng từng doanh nghiệp bằng `tenant_id` + RLS.
App không có trong gói → tự chặn, mời nâng gói. Doanh nghiệp tạm khoá / tài khoản bị khoá → chặn.

## Các file
| File | Việc |
|---|---|
| `index.html` | Cổng AIPOS·PRO: đăng ký, bảng giá & gói, đăng nhập, mời thành viên, chi nhánh, sao lưu (bản của bạn + quay lại app đang mở sau khi đăng nhập, đăng xuất xoá bộ nhớ đệm) |
| `pos_aipos.html` | **Bán hàng (POS) v15.80** — kết ca 3 cột, tem giá A4, giá KM trên tem, khuyến mãi, khách hàng, HĐĐT |
| `kho_aipos.html` | **Kho v5.69** — tồn kho, PO, nhận hàng, phiếu nhập, điều chuyển, kiểm kê, hủy hàng, HSD, NXT, công nợ NCC |
| `ncc_aipos.html` | **Nhà cung cấp v4.5** — đặt hàng tự động, PO, xác nhận, công nợ, quy cách, duyệt giá |
| `ketoan_aipos.html` | **Kế toán v6.48** — sổ sách TT200, thuế, ngân hàng, công nợ, TSCĐ, khoá sổ, trợ lý AI |
| `luong_aipos.html` | **Lương & Nhân sự** — chấm công, bảng lương, phiếu lương, quỹ ngành, KPI |
| `aipos-guard.js` | Kiểm tra cho mọi app: phiên đăng nhập, gói dịch vụ, tài khoản/doanh nghiệp bị khoá |
| `aipos-tenant.js` | Tên công ty, MST, chi nhánh của doanh nghiệp đang đăng nhập; gắn phiên người dùng vào mọi truy vấn |
| `aipos-supabase.js` | Thư viện Supabase (bản cục bộ, không phụ thuộc CDN) |
| `supabase/aipos_*.sql` | Chuẩn bị máy chủ cho từng app |

## Cài đặt
1. **Máy chủ** — Supabase project AIPOS-PRO → SQL Editor (Supabase hỏi RLS → bấm "Run without RLS"):
   - Chạy **`aipos_6_tao_bang_ham.sql` trước**: tạo bảng/view/hàm còn thiếu (đã gắn doanh nghiệp + RLS) và kho tệp. Chỉ tạo cái chưa có, không ghi đè. Cuối file hiện bảng kết quả + các dòng LỖI (nếu có).
   - Rồi chạy lần lượt: `aipos_pos_v15.sql` → `aipos_kho_v569.sql` → `aipos_ncc_v45.sql` → `aipos_ketoan_v648.sql` → `aipos_luong.sql`
   - **Phần 1** báo bảng/hàm **còn thiếu** → tạo từ cấu trúc gốc rồi chạy lại file.
   - **Phần 2–3** gắn `tenant_id` + RLS, đổi các khoá (SĐT khách, SKU, số PO, kỳ lương…) theo doanh nghiệp.
   - **Phần 4** liệt kê việc PHẢI sửa tay trước khi mở bán: hàm quyền cao chưa lọc doanh nghiệp, chính sách mở cửa, khoá duy nhất chưa kèm doanh nghiệp.
2. **Web** — tải tất cả file lên **repo AIPOS-PRO** (KHÔNG phải repo Vicomart), ghi đè bản cũ.
3. **Kiểm tra tách dữ liệu** — đăng ký 2 tài khoản thử, mỗi bên bán vài đơn, thêm khách cùng SĐT, tạo PO, chấm công: bên này không được thấy dữ liệu bên kia.

## Giới hạn hiện tại
- Tệp đính kèm (chứng từ thu chi, ảnh hủy hàng, hồ sơ thành viên) tự lưu vào thư mục riêng của doanh nghiệp; ảnh hủy hàng và hồ sơ thành viên mở bằng đường link công khai (khó đoán) như bản gốc.
- "Đơn online" ở POS chỉ hiện đơn khi doanh nghiệp có app đặt hàng riêng ghi vào `don_ban_le`; các quy tắc điểm/số dư/tồn tiệm của hệ SALEME không mang sang.
- Trợ lý AI kế toán không tự chạy câu lệnh SQL (để không đọc chéo dữ liệu doanh nghiệp khác).
- App Lương quản lý tối đa 3 chi nhánh (theo thứ tự chi nhánh của doanh nghiệp) + Văn phòng.
- Hệ thống tài khoản TT200 (`acc_chart_of_accounts`) và danh sách nhà cung cấp HĐĐT dùng chung cho mọi doanh nghiệp.
- Edge function (gửi phiếu lương, HĐĐT, AI, ngân hàng…) phải tự kiểm tra doanh nghiệp của người gọi.

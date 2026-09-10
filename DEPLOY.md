# Public CookingDual để hai người chơi qua Internet

Bản hiện tại đã có phòng online cho **hai thiết bị**. Máy chủ Node.js chạy luật chơi và gửi trạng thái chung qua WebSocket; trình duyệt chỉ gửi điều khiển. Cần triển khai cả máy chủ và giao diện. Mở `publish.html` qua server để xem hướng dẫn có giao diện tiếng Việt.

## Cách đề xuất: một Web Service trên Render

1. Giải nén `artifacts/CookingDual-web.zip`. Đưa **nội dung** lên repository GitHub, giữ nguyên cấu trúc `src/`, `vendor/`, `scripts/`. `package.json`, `package-lock.json`, `server.mjs`, `render.yaml` nằm ở gốc repository. [Hướng dẫn tải file của GitHub](https://docs.github.com/en/repositories/working-with-files/managing-files/adding-a-file-to-a-repository).
2. Render → **New → Blueprint** → kết nối repository → kiểm tra cấu hình trong `render.yaml` → triển khai. Cấu hình đã đặt Node, Singapore, Free, build `npm ci --omit=dev`, start `npm start`, health check `/health`, `NODE_VERSION=24.18.0`. Nếu chọn New → Web Service, điền các giá trị này bằng tay. [Blueprint](https://render.com/docs/blueprint-spec), [phiên bản Node](https://render.com/docs/node-version).
3. Khi dịch vụ Live, mở địa chỉ HTTPS của dịch vụ (`…onrender.com`). Game tự dùng `wss://` trên cùng địa chỉ; không cần nhập URL backend, mở cổng router hoặc cấu hình CORS. Server đã bind `0.0.0.0` và đọc biến `PORT`. [Web Services](https://render.com/docs/web-services), [WebSocket](https://render.com/docs/websocket).
4. Bạn: **Chơi cùng bạn → tên → Tạo phòng mới → Sao chép liên kết**. Bạn bè: mở liên kết trên Safari iPad → tên → Vào phòng. Đủ 2/2, chủ phòng bắt đầu. Hai máy có thể dùng mạng khác nhau.

Gói Free phù hợp thử nghiệm: ngủ sau 15 phút không có lưu lượng vào và khởi động lại có thể mất khoảng một phút. Kiểm tra [điều kiện và giới hạn Free](https://render.com/docs/free) trước khi chọn gói; gói trả phí là lựa chọn sau nếu cần mở ngay và ổn định hơn. Dịch vụ hiện tại: https://cookingdual.onrender.com/ — service ID `srv-dahdfjuq1p3s73eg74p0`, repository `ggcaochihieu602/CookingDual`, nhánh `main`. Khi cập nhật mã nguồn, theo dõi deployment trong Render và xác nhận `/health` cùng kết nối phòng. Triển khai lại làm mất các phòng đang nằm trong RAM.

## iPad

Safari cần hỗ trợ WebGL 2. Xoay ngang, dùng joystick trái và các nút bên phải. Chạm một nút trong game để cho phép âm thanh; nhạc nền và hiệu ứng có cài đặt riêng, được lưu trên từng trình duyệt. [Web Audio và thao tác người dùng](https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API/Best_practices).

Có manifest để thêm game ra màn hình chính; trong Safari dùng menu Chia sẻ → Add to Home Screen theo [hướng dẫn Apple](https://support.apple.com/guide/ipad/bookmark-a-website-ipadc602b75b/ipados). Bản này không có chế độ offline đã lưu cache. Online luôn cần Internet. Kiểm tra cảm ứng hiện là mô phỏng Chromium; chưa xác nhận bằng iPad thật.

## Vận hành bản thử nghiệm

- Hai người mỗi phòng, tối đa 20 phòng trên một tiến trình. Đây là giới hạn phần mềm, không phải cam kết tải của gói Free; cần thử tải trước khi mở cho nhiều người.
- Máy chủ là nguồn quyết định vật phẩm, điểm, đồng hồ và va chạm. Client không gửi tọa độ hay điểm tùy ý. Nhận điều khiển và phát trạng thái 20 lần/giây; vị trí hiển thị được làm mượt. Chưa có dự đoán chuyển động tại client nên mạng trễ cao sẽ cảm nhận độ trễ điều khiển.
- Một người mở hướng dẫn/cài đặt, tạm dừng, ẩn trang hoặc mất mạng thì cả bếp tạm dừng. Chỉ tiếp tục khi đủ hai người kết nối.
- Mất mạng giữ chỗ và đồ đang cầm trong 3 phút, miễn tiến trình máy chủ còn chạy. Client thử kết nối lại; tải lại đúng tab cũng dùng mã nhận diện trong sessionStorage. Nếu đã đóng tab, hết thời gian hoặc máy chủ khởi động lại, tạo phòng mới.
- Nút **Rời phòng** đóng phòng cho cả hai. Không có chuyển chủ phòng. Chủ phòng mở ca tiếp theo từ kết quả; khách chờ.
- Phòng và ca đang chơi ở RAM; triển khai lại, restart hoặc đổi máy chủ sẽ xóa. Dùng **một instance**; muốn mở rộng cần lưu trạng thái/chuyển tiếp giữa máy chủ hoặc điều phối phòng. [Lưu ý kết nối và nhiều instance của Render](https://render.com/docs/websocket).
- Không yêu cầu tài khoản game. Người biết mã mời có thể lấy chỗ thứ hai khi phòng còn trống; mã reconnect riêng chỉ được giữ trong sessionStorage.

## Chạy máy chủ khác

Node 24, chạy `npm ci --omit=dev` rồi `npm start`. Cổng mặc định 5173; có thể đổi bằng biến môi trường `PORT`. Hoặc build Dockerfile đi kèm và ánh xạ cổng 5173. Reverse proxy cần HTTPS và chuyển tiếp WebSocket upgrade `/ws` tới cùng tiến trình HTTP. Không cần cơ sở dữ liệu cho bản này.

`localhost` là địa chỉ máy đang mở trình duyệt, không phải liên kết mời qua Internet. Public web service ở trên cung cấp một địa chỉ chung mà cả máy tính và iPad truy cập được.

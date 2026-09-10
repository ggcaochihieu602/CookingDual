# CookingDual · Bếp đảo xanh

Game bếp 3D tiếng Việt, một màn 180 giây, chơi đơn hoặc hai người trên hai thiết bị qua Internet.

**Bản public:** https://cookingdual.onrender.com/
**Mã nguồn:** https://github.com/ggcaochihieu602/CookingDual

## Chơi tại máy

Nhấp đúp `Choi-CookingDual.cmd`, hoặc chạy với Node.js 24:

```sh
npm ci
npm start
```

Mở http://localhost:5173. Tài nguyên 3D, ảnh món và nhạc đều nằm trong dự án. Chơi đơn tại máy không cần Internet sau khi cài thư viện. Trình duyệt cần WebGL 2; nên xoay ngang điện thoại/iPad.

## Chơi chung

Chọn **Chơi cùng bạn → nhập tên → Tạo phòng mới**, gửi liên kết hoặc mã phòng cho bạn. Người thứ hai mở liên kết, nhập tên và vào phòng; chủ phòng bắt đầu khi đủ 2/2. Người đầu tiên là chó vàng áo vá; người thứ hai là nhân vật xanh. Cả hai chia sẻ đồ vật, đơn, điểm, lửa và đồng hồ. Khi mất mạng, phòng giữ chỗ ba phút nếu máy chủ vẫn chạy.

## Điều khiển

| Thao tác | Bàn phím | Cảm ứng |
|---|---|---|
| Di chuyển | WASD / mũi tên | Joystick trái |
| Cầm / đặt / ghép / giao | Space | Chạm nút tương tác |
| Cắt / rửa / xịt chữa cháy | Giữ E | Giữ nút tương tác |
| Thả đồ xuống đất | Q, hoặc Space khi không có mục tiêu | Nút Thả |
| Ngắm và ném | Giữ R, đưa chuột đến điểm rơi, thả R | Giữ Ném, kéo ngón tay, thả |
| Dash liên tục | Giữ Shift | Giữ nút Lướt |
| Tạm dừng | Escape | Nút tạm dừng |

Đứng gần và hướng về vật muốn tương tác. Viền vàng chọn quầy; vòng sáng chọn đồ dưới đất. Chạm nhanh nút tương tác để nhặt đồ khỏi thớt/bồn, giữ để cắt/rửa. Khi đang cầm bình chữa cháy, giữ để xịt theo hướng nhìn; có thể di chuyển trong lúc xịt.

## Nấu bánh mì

1. Lấy thịt từ nguồn ở dãy trên cùng, đặt lên thớt lớn và cắt 2,2 giây.
2. Cho thịt đã cắt vào chảo trên bếp; rán 6 giây. Có 21 giây sau khi chín trước khi cháy; tiếng cảnh báo bắt đầu ở giây 14.
3. Nếu phiếu có rau, cắt rau trên thớt. Bánh mì và tương ớt dùng ngay.
4. Ghép nguyên liệu đã sẵn sàng bằng Space. Hai nhóm chưa có đĩa sẽ ghép và nằm trên tay. Có thể lấy thêm nguyên liệu từ bàn hoặc dưới đất; không ghép sống/cháy/trùng loại.
5. Thêm món vào đĩa trên bàn, hoặc cầm đĩa lấy món. Mang hoặc ném đĩa tới một trong ba ô xe bánh mì để giao đúng đơn.

| Phiếu | Thành phần |
|---|---|
| Thịt nguyên bản | Bánh mì + thịt chín |
| Thịt & rau | Bánh mì + thịt chín + rau đã cắt |
| Thịt & tương ớt | Bánh mì + thịt chín + tương ớt |
| Đầy đủ | Bánh mì + thịt chín + rau đã cắt + tương ớt |

Món phải khớp chính xác một đơn đang chờ. Phiếu chỉ hiện ảnh món, các nguyên liệu và thanh thời gian. Khách trên vỉa hè tương ứng với đơn: hoàn thành đơn thì khách rời hàng, đơn mới có khách tới.

## Đồ vật, chảo, đĩa và lửa

- Mọi ô trống đều nhận đồ, kể cả nguồn nguyên liệu, thớt, bếp và bồn. Nguồn chỉ phát nguyên liệu khi tay và mặt quầy đều trống. Ô đang có đồ không bị ghi đè.
- Ban đầu có **bốn đĩa thật** trên các ô gần xe bánh mì. Giao xong, đĩa bẩn xuất hiện cạnh xe. Cầm tới bồn ở bếp trên, đặt xuống và giữ để rửa hai giây. Đĩa sạch nằm cạnh bồn. Nếu hết mặt bàn trống, đĩa được đặt xuống sàn gần đó; không biến mất.
- Mỗi bếp có một chảo có thể nhấc đi. Chảo chỉ nấu khi nằm trên bếp; nhấc khỏi bếp sẽ dừng nấu/cháy. Cầm chảo có thịt chín tới đĩa hoặc nguyên liệu để trút, chảo rỗng vẫn ở trên tay. Hoặc cầm đĩa/món lấy thịt từ chảo đang đặt xuống.
- Đồ có thể thả, nhặt, ghép dưới đất hoặc ném theo đường ngắm. Đồng đội đứng tại điểm rơi có thể bắt; mặt quầy trống nhận đồ, chảo nhận thịt đã cắt, xe nhận món đúng đơn. Điểm không nhận được đồ sẽ làm đồ rơi xuống sàn an toàn.
- Thịt cháy gây lửa, lan sang các ô sát bên mỗi sáu giây. Lấy bình chữa cháy ở đầu trái dãy thớt, giữ để xịt. Dập lửa trước khi lấy đồ khỏi quầy cháy. Mang đồ hỏng tới thùng rác bên phải xe; thức ăn bị bỏ, chảo/đĩa vẫn dùng tiếp.

## Điểm và nhịp chơi

Ca bếp 180 giây, tối đa ba đơn chờ, thêm đơn mỗi 26 giây; mỗi đơn có 100 giây. Giao đúng được 100 điểm cộng thưởng thời gian và chuỗi. Hết hạn đơn trừ 15 điểm (không âm), mất chuỗi. Các mốc sao: 100 / 300 / 550 điểm. Kỷ lục và cài đặt âm thanh/đồ họa được lưu trên trình duyệt.

Mở hướng dẫn/cài đặt hoặc ẩn trang sẽ tạm dừng. Khi online, tạm dừng áp dụng cho cả phòng. Nhạc nền gốc tổng hợp bằng Web Audio bắt đầu sau thao tác chạm/bấm đầu tiên.

## iPad và đồ họa

Cảm ứng mặc định chế độ **Tiết kiệm · 30 FPS**. Nút đồ họa ở thanh trên cho phép chọn 60 FPS. Bản này giảm mật độ điểm ảnh, bỏ bóng động tốn tài nguyên trên cảm ứng, gộp mô hình tĩnh, giảm chi tiết hình học nhỏ và dùng mặt nước đơn giản. Vẫn giữ bóng sát chân và các vật phẩm/nhân vật 3D.

Phép đo cùng khung hình 1180 × 820, mô phỏng cảm ứng DPR 2 trên Chromium:

| Chỉ số | Bản trước | Bản này |
|---|---:|---:|
| Tam giác mỗi khung hình | 1.206.666 | 130.974 |
| Lệnh vẽ mỗi khung hình | 413 | 93 |
| Điểm ảnh dựng hình | 3.135.024 | 967.600 |
| Giới hạn FPS mặc định | 60 | 30 |

Đây là số tải dựng hình, không phải cam kết FPS hoặc nhiệt độ trên thiết bị thật. Chưa kiểm thử Safari/iPad vật lý. Mạng trễ cao vẫn có thể làm điều khiển online chậm; hiện máy chủ xử lý trạng thái chung ở 20 Hz, client nội suy vị trí.

## Tài nguyên và cấu trúc

- `src/game.js`, `src/level.js`: luật chơi và sơ đồ theo ảnh chú thích.
- `src/scene.js`, `src/environment.js`, `src/materials.js`: dựng hình, đồ vật, vật liệu và tối ưu.
- `src/dynamics.js`: đồ dưới đất, đường ném, lửa/bọt và hàng khách.
- `src/main.js`, `src/controls.css`: giao diện, bàn phím/cảm ứng và âm thanh.
- `src/rooms.mjs`, `src/online.js`, `server.mjs`: phòng WebSocket và máy chủ cùng địa chỉ với web.
- `assets/characters.blend`: hai nhân vật low-poly tạo trong Blender theo ảnh tham chiếu; `scripts/build-characters.py` dựng/xuất lại.
- `assets/kitchen.blend`: đồ ăn/đĩa và bốn kiểu bánh; `scripts/build-assets.py` dựng/xuất lại.
- `vendor/`: Three.js 0.185.1 cùng giấy phép MIT.
- `tests/`: kiểm thử luật, phòng, trình duyệt và chơi online.
- `artifacts/`: ảnh và báo cáo kiểm tra, gói `CookingDual-web.zip`.

Mô hình nhân vật được dựng mới theo hình tham khảo; bản low-poly ưu tiên nhận diện và hiệu năng. Không lấy mô hình hoặc sprite từ Overcooked. Chưa có nhiều màn, tài khoản, lưu ca qua restart máy chủ hoặc cache offline.

## Kiểm tra và đóng gói

```sh
npm test
npm run check
node tests/browser.cjs
node tests/features.cjs
node tests/online.cjs
```

Kiểm thử trình duyệt cần Playwright/Chromium; có thể đặt `PLAYWRIGHT_MODULE` và `CHROME_PATH`. Browser/features cần server ở 5173; online tự mở server riêng. `?test=1` cung cấp trạng thái kiểm tra phía client, không cấp quyền sửa trạng thái server. Chạy `scripts/package.ps1` để tạo gói web. Cấu hình vận hành ở [DEPLOY.md](DEPLOY.md).

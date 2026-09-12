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

Đứng gần vật muốn tương tác: game hỗ trợ chọn ô/vật gần nhất kể cả khi nhìn ngang hoặc quay lưng. Hướng thẳng vào ô giúp chọn chính xác ở góc quầy. Viền trắng chọn quầy; vòng trắng chọn đồ dưới đất. Vòng màu và mũi tên dưới chân báo hướng đầu bếp. Chạm nhanh nút tương tác để nhặt đồ khỏi thớt/bồn, giữ để cắt/rửa. Khi đang cầm bình chữa cháy, giữ để xịt theo hướng nhìn; có thể di chuyển trong lúc xịt.

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
- Ban đầu có **bốn đĩa thật** trên các ô gần xe bánh mì. Giao xong, đĩa bẩn xếp thành chồng cạnh xe. Mang cả chồng tới bồn ở bếp trên; có thể thêm đĩa bẩn vào bồn đang có đĩa, giữ nguyên tiến độ. Giữ nút để rửa liên tục, hai giây mỗi đĩa. Đĩa sạch nằm cạnh bồn. Nếu hết mặt bàn trống, đĩa được đặt xuống sàn cạnh khay ra; không biến mất hoặc làm gián đoạn việc rửa.
- Mỗi bếp có một chảo có thể nhấc đi. Chảo chỉ nấu khi nằm trên bếp; nhấc khỏi bếp sẽ dừng nấu/cháy. Cầm chảo có thịt chín tới đĩa hoặc nguyên liệu để trút, chảo rỗng vẫn ở trên tay. Hoặc cầm đĩa/món lấy thịt từ chảo đang đặt xuống.
- Đồ có thể thả, nhặt, ghép dưới đất hoặc ném theo đường ngắm. Đường ném bắt đầu từ món trên tay, góc xuất phát khoảng 30° so với mặt đất. Đồng đội đứng tại điểm rơi có thể bắt; mặt quầy trống nhận đồ, chảo nhận thịt đã cắt, xe nhận món đúng đơn. Điểm không nhận được đồ sẽ làm đồ rơi xuống sàn an toàn.
- Thịt cháy gây lửa, lan sang các ô sát bên mỗi sáu giây. Lấy bình chữa cháy ở đầu trái dãy bếp rán, giữ để xịt. Dập lửa trước khi lấy đồ khỏi quầy cháy. Mang đồ hỏng tới thùng rác bên phải xe; thức ăn bị bỏ, chảo/đĩa vẫn dùng tiếp.

## Điểm và nhịp chơi

Ca bếp 180 giây, tối đa ba đơn chờ, thêm đơn mỗi 26 giây; mỗi đơn có 100 giây. Giá bánh thịt nguyên bản 100, thêm rau hoặc tương ớt 110, đầy đủ 120. Thanh thời gian còn ít nhất 50% là xanh (100% giá), từ 25% đến dưới 50% là vàng (90%), dưới 25% là đỏ (80%).

Giao theo thứ tự phiếu từ trái sang phải giữ chuỗi: món thứ nhất chưa có tip, chuỗi 2 thêm 10, chuỗi 3 thêm 20, từ chuỗi 4 thêm 40 mỗi món. Giao vượt thứ tự vẫn có tiền món nhưng mất chuỗi và không tip; đơn hết hạn cũng làm mất chuỗi, trừ tối đa 15 điểm để điểm không âm.

Các mốc **1–5 sao: 100 / 240 / 380 / 520 / 660**. Mốc tối đa 660 cao hơn 550 cũ đúng 20%. Năm đơn đầu giao đúng thứ tự khi còn xanh cho 550 tiền món + 110 tip = 660; giao chậm phải làm thêm món. Bảng kết quả toàn màn hình hiện sao, tiền món, tip, phạt, tổng điểm và hai nhân vật; có nút chia sẻ/chơi lại. Kỷ lục và cài đặt âm thanh/đồ họa được lưu trên trình duyệt.

Mở hướng dẫn/cài đặt hoặc ẩn trang sẽ tạm dừng. Khi online, tạm dừng áp dụng cho cả phòng. Nhạc nền gốc tổng hợp bằng Web Audio bắt đầu sau thao tác chạm/bấm đầu tiên.

## iPhone / iPad và đồ họa

Bản 1.3 giữ mô hình, khử răng cưa, ánh sáng phản chiếu, bóng mềm và mặt nước trên cả điện thoại. Mặc định **Tự động** hướng tới 60 FPS, mật độ điểm ảnh tối đa 1,5. Nếu tải cao kéo dài, game giảm nhẹ mật độ rồi mới chuyển 30 FPS; tự tăng lại khi máy ổn định. Chọn **Sắc nét** để giữ 60 FPS/mật độ tối đa 2, hoặc **Tiết kiệm** để giữ 30 FPS/mật độ tối đa 1,25. Không chế độ nào bỏ mô hình hoặc thay mặt nước bằng mảng màu.

Riêng màn hình tablet (hai chiều tối thiểu 700 × 600 CSS pixel), joystick còn 80% (128 px), cao hơn 30 px; cả hai cụm điều khiển cách mép 94–126 px. Kích thước trên điện thoại giữ nguyên. Hành lang giữa hai bếp rộng ba ô; thớt đôi chuyển xuống trái phía trước, bếp chuyển lên dãy sau và cách hành lang một ô. Dãy quầy dưới được bịt kín, vỉa hè chỉ dành cho khách.

Quầy và trang trí được gộp theo vật liệu; dùng chung hình học đồ ăn; giao diện chỉ thay nội dung khi cần. Bóng được giữ lại khi cảnh đứng yên; khi di chuyển, bóng cập nhật cùng từng tư thế được vẽ để tránh nhấp nháy. Mesh nhân vật vẫn đổ bóng ra sàn nhưng không tự nhận bóng gây nhiễu trên da/áo. Khi tạm dừng chỉ vẽ 8 FPS; tab ẩn ngừng vẽ. Hai GLB được giảm hình học nhỏ trước khi xuất, giữ nguyên dáng và chi tiết lớn.

Các kiểm tra màn hình dùng kích thước iPhone 12 Pro Max (926 × 428 / 428 × 926, DPR 3) và iPad trên Chromium. Chưa đo FPS/nhiệt độ trên Safari iPhone thật; không thể cam kết máy không nóng. Mạng trễ cao vẫn có thể làm điều khiển online chậm; máy chủ xử lý trạng thái chung ở 20 Hz, client nội suy vị trí.

## Tài nguyên và cấu trúc

- `src/game.js`, `src/level.js`: luật chơi và sơ đồ theo ảnh chú thích.
- `src/scene.js`, `src/environment.js`, `src/materials.js`: dựng hình, đồ vật, vật liệu và tối ưu.
- `src/dynamics.js`: đồ dưới đất, đường ném, lửa/bọt và hàng khách.
- `src/main.js`, `src/controls.css`: giao diện, bàn phím/cảm ứng và âm thanh.
- `src/rooms.mjs`, `src/online.js`, `server.mjs`: phòng WebSocket và máy chủ cùng địa chỉ với web.
- `assets/ragged-dog.glb`, `assets/dog-tick.glb`: hai mô hình gốc do người dùng cung cấp, giữ nguyên.
- `assets/ragged-dog-rigged.blend`, `assets/dog-tick-rigged.blend`: mô hình Blender có xương, trọng số da, màu và sáu chuyển động Idle / Walk / Carry / CarryWalk / Work / Throw. `scripts/rig-characters.py` xuất lại các file `*-rigged.glb` dùng trong game.
- `src/character-animation.js`: phát và chuyển tiếp các chuyển động của bộ xương. `src/movement.js`: bù phối cảnh cho tốc độ di chuyển. `src/render-budget.js`: tự điều chỉnh tải dựng hình.
- `assets/characters.blend`, `scripts/build-characters.py`: bộ nhân vật cũ dự phòng nếu GLB không tải được.
- `assets/kitchen.blend`: đồ ăn/đĩa và bốn kiểu bánh; `scripts/build-assets.py` dựng/xuất lại.
- `vendor/`: Three.js 0.185.1 cùng giấy phép MIT.
- `tests/`: kiểm thử luật, phòng, trình duyệt và chơi online.
- `artifacts/`: ảnh và báo cáo kiểm tra, gói `CookingDual-web.zip`.

Hai nhân vật chính dùng chính hình học GLB người dùng cung cấp. File gốc không có màu/texture; bản rig được tô màu theo ảnh tham chiếu, dùng vật liệu nhám cho thân/áo và bóng cho mắt/mũi. Không lấy mô hình hoặc sprite từ Overcooked. Chưa có nhiều màn, tài khoản, lưu ca qua restart máy chủ hoặc cache offline.

## Kiểm tra và đóng gói

```sh
npm test
npm run check
node tests/browser.cjs
node tests/features.cjs
node tests/online.cjs
node tests/reference-polish.cjs
node tests/update-13.cjs
node tests/interaction-visuals.cjs
```

Kiểm thử trình duyệt cần Playwright/Chromium; có thể đặt `PLAYWRIGHT_MODULE` và `CHROME_PATH`. Browser/features cần server ở 5173; online tự mở server riêng. `?test=1` cung cấp trạng thái kiểm tra phía client, không cấp quyền sửa trạng thái server. Chạy `scripts/package.ps1` để tạo gói web. Cấu hình vận hành ở [DEPLOY.md](DEPLOY.md).

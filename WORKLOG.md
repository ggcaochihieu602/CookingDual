# CookingDual — bản cập nhật 12/09/2026

## Bản 1.3.0 — sơ đồ, đĩa chồng, tương tác và kết quả

- [x] Riêng iPad/tablet: joystick 128 px (80%), cao thêm 30 px, hai cụm nút dịch vào mép 94–126 px. iPhone ngang/dọc giữ kích thước cũ.
- [x] Hành lang giữa hai khu rộng ba ô; đổi vị trí hai thớt đôi và hai bếp; bếp cách lối đi một ô đệm. Thêm quầy bịt kín lối ra vỉa hè dưới, kiểm tra đường đi tới mọi trạm.
- [x] Đĩa bẩn tự xếp chồng cạnh xe, cầm/ném/gom chồng và thêm vào bồn đang có đĩa. Giữ rửa liên tục, giữ tiến độ; đĩa sạch ra bên cạnh. Sửa lỗi đĩa xuất hiện làm mất mục tiêu đang rửa. Bảo toàn đủ bốn đĩa.
- [x] Bóng chuyển động lấy cùng tư thế với khung hình, giữ cache khi đứng yên; bỏ nhiễu tự đổ bóng trên mesh nhân vật. Giữ khử răng cưa, ánh sáng và mô hình trên di động.
- [x] Thang năm sao 100/240/380/520/660, mốc cao nhất tăng 20%. Giá món 100/110/110/120, ba mức xanh/vàng/đỏ 100%/90%/80%. Tip đúng thứ tự 0/10/20/40, giữ tối đa 40. Năm món đầu còn xanh cho 550+110=660.
- [x] Đường ném xuất phát tại món trên tay, góc 30°, dùng chung công thức với chuyến ném thật cho cả hai nhân vật.
- [x] Chọn quầy/đồ gần nhất kể cả nhìn ngang/quay lưng, có viền trắng; vẫn hướng chọn được ô góc, không tương tác xuyên quầy. Vòng màu dưới chân có mũi tên quay theo hướng.
- [x] Kết quả toàn màn hình theo reference: ribbon, năm sao, tiền món/tip/phạt/tổng, chân dung GLB và tên hai người, chia sẻ/chơi lại. Chụp ảnh sRGB bằng renderer đang dùng, không thêm WebGL context.
- [x] 63 kiểm tra luật/HTTP/phòng đạt, gồm hai WebSocket thật rửa chung một chồng trong lúc thêm đĩa, đồng bộ ledger/kết quả và chơi lại. Kiểm tra cú pháp đạt.
- [x] Browser (15), features (9), online (9), reference-polish (8), update-13 (10) và interaction-visuals (6) đạt; không có lỗi runtime trình duyệt.
- [x] Kiểm tra Chromium mô phỏng iPad gen 9 1080×810/810×1080, iPhone 12 Pro Max 926×428/428×926. Kiểm tra bóng: 60 khung chuyển động cập nhật bóng 60 lần, đứng yên 0 lần. Chưa đo FPS/nhiệt trên Safari thiết bị thật.

## Bản 1.2.0 — rig GLB và cải thiện theo reference

- [x] Dùng đúng `assets/ragged-dog.glb` và `assets/dog-tick.glb`; giữ nguyên hai nguồn.
- [x] Tạo hai file Blender có xương, skin, màu và sáu clip; xuất GLB 54.000 / 32.000 tam giác, 17 / 16 xương. Kiểm tra tổng trọng số và clip trực tiếp trong file xuất.
- [x] Áp dụng rig thật vào game, clone bộ xương riêng cho mỗi người, chuyển động/cầm/làm việc/ném. Sửa méo bụng/chân và tư thế cầm của nhân vật xanh.
- [x] Đồng nhất kích thước đồ trên tay/bàn/đất; chiều cao cầm theo tay mỗi nhân vật. Biểu tượng nhỏ báo vật khi quay lưng che khuất.
- [x] Bù phối cảnh cho di chuyển dọc, analog và dash; giữ tốc độ nhìn thấy bằng hướng ngang và kiểm tra va chạm.
- [x] Joystick và nút trắng trong suốt theo cung ngón cái, tách khỏi mép màn hình; phiếu món, đồng hồ và điểm theo reference.
- [x] Khôi phục khử răng cưa, PMREM, bóng mềm, mặt nước trên di động. Bóng tĩnh được giữ lại, bóng chuyển động cập nhật 15 Hz; gộp mô hình, dùng chung đồ ăn, tránh dựng lại HUD.
- [x] Tự động bắt đầu 60 FPS / DPR tối đa 1,5, điều chỉnh theo tải với sàn chất lượng; cài đặt Sắc nét / Tiết kiệm. Thay DPR không nhảy camera.
- [x] Sửa lỗi ném đĩa vào chảo thịt chín dưới đất làm mất thịt; thêm kiểm tra bảo toàn đồ vật.
- [x] 39 kiểm tra luật/phòng/HTTP, 15 browser, 9 cơ chế, 9 online và 8 kiểm tra rig/tỉ lệ/giao diện mới đều đạt; không có lỗi runtime hay tải asset.
- [x] Mô phỏng Chromium màn hình iPhone 12 Pro Max: 926×428 và 428×926 / DPR 3; iPad 1180×820. Chưa kiểm tra Safari trên máy thật.
- [x] GitHub main nhận bản 1.2.0, commit `c8ed208`. Website đã xác nhận ngày 12/09/2026: hai GLB có hash trùng bản kiểm tra, sáu clip mỗi nhân vật, phòng WSS hai người, dash đồng bộ, pause và đóng phòng thử đều đạt.

Phép đo hai nhân vật trong khung hình iPhone ngang: bản 1.1 dùng 79 lệnh vẽ/132.294 tam giác, 396.328 điểm ảnh và 30 FPS (không bóng/AA/PMREM). Bản 1.2 đứng yên 73 lệnh/196.994 tam giác, chuyển động trung bình 88 lệnh/247.452 tam giác (gồm shadow pass); 891.738 điểm ảnh, mục tiêu 60 FPS với đầy đủ ánh sáng. 120 khung chuyển động chỉ cần 30 lần vẽ bóng; đứng yên không vẽ bóng lại. Đây là so sánh tải dựng hình, không phải số FPS đo trên điện thoại.

## Bản 1.1.0 đã public

Hoàn thành 14 mục yêu cầu trong bản 1.1.0.

- [x] Tốc độ/kích thước +30%, dash liên tục.
- [x] Sơ đồ mới, nguồn nguyên liệu vuông, hai thớt đôi, bồn rửa phía trên, sidewalk.
- [x] Ghép trên tay; đồ dưới đất; ném có ngắm, bắt/đặt/giao món.
- [x] Bốn đĩa vật lý, trả cạnh serve, mang đi rửa, lấy cạnh bồn.
- [x] Chảo di động; chỉ nấu trên bếp; cảnh báo, 21 giây tới cháy; rác giữ chảo.
- [x] Cháy lan và bình chữa cháy có hiệu ứng xịt.
- [x] Hai nhân vật Blender theo ảnh, gán theo thứ tự vào phòng.
- [x] Khách xếp hàng theo đơn, đến/rời, hướng đứng theo người trước.
- [x] Điều khiển cảm ứng lớn, ném bằng giữ/kéo/thả; hủy thao tác không mất đồ.
- [x] Tối ưu iPad, chế độ 30/60 FPS, nhạc và các cài đặt tiếp tục hoạt động.
- [x] 30 kiểm tra luật/phòng/HTTP, 15 kiểm tra browser, 9 kiểm tra tính năng mới, 9 kiểm tra hai phiên online đều đạt; không có lỗi runtime trình duyệt.
- [x] File Blender và gói web tại `assets/characters.blend`, `artifacts/CookingDual-web.zip`.
- [x] Push nhánh main GitHub, commit `146c6a8`.
- [x] Website nhận bản mới, tải character mesh gzip, tạo phòng hai người qua WSS, xác nhận hai nhân vật/bốn đĩa/hai chảo, dash đồng bộ, pause và đóng phòng thử thành công.

Hiệu năng Chromium mô phỏng iPad 1180×820/DPR2: 1.206.666 → 130.974 tam giác/khung, 413 → 93 lệnh vẽ, 3.135.024 → 967.600 điểm ảnh. Mặc định cảm ứng 30 FPS; chưa đo nhiệt hoặc FPS trên thiết bị iPad thật.

Không tạo hẹn giờ và không dùng credit reset theo lời người dùng. Thực hiện trực tiếp trong task này.

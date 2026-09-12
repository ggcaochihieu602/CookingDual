# Màn 01 — Bếp đảo xanh

## Bố cục và hình ảnh

Hai khu bếp rộng nối bằng cầu, camera 3/4 chính diện khoảng 38°, dãy quầy chiếu ngang màn hình. Bố cục 1.3 theo ảnh vẽ tay mới: ba nguồn bánh/thịt/rau ở giữa dãy trên cùng; bồn rửa đôi ở dãy trước khu trên bên trái. Hành lang giữa hai khu rộng ba ô (4,2 đơn vị), hai bên cầu không có quầy lấn vào. Hai thớt đôi chuyển xuống dãy trước bên trái; hai bếp chuyển lên dãy sau, mỗi bếp cách hành lang một ô đệm. Xe bánh mì ba ô bên phải, thùng rác ngoài cùng phải. Bình chữa cháy ở đầu trái dãy bếp. Dãy quầy trước khép kín cả cửa cũ; vỉa hè phía trước dành cho hàng khách và chỉ tương tác qua xe bánh mì.

Nguồn nguyên liệu có khay vuông phủ gần hết mặt quầy và vật thể 3D ở giữa; khay ẩn khi người chơi đặt vật thật lên ô. Mỗi thớt/bồn đôi là một trạm lớn nhận một vật. Mọi ô còn lại dùng cùng kích thước cho mặt bàn, va chạm và chọn mục tiêu. Bốn đĩa được đặt trên các bàn gần xe từ đầu màn.

Nhân vật thứ nhất là chó vàng áo vá, nhân vật thứ hai màu xanh, dùng hai GLB người dùng cung cấp. Blender thêm armature, trọng số tối đa bốn xương mỗi đỉnh, vertex color và sáu clip chuyển động. Client clone bộ xương riêng cho từng người và chuyển tiếp giữa đứng, chạy, cầm, cầm khi chạy, làm việc và ném. Tốc độ nền tăng 30%, dash không có thời gian chờ; tốc độ trục sâu bù phép chiếu camera để khoảng cách nhìn thấy trên màn hình bằng hướng ngang, kể cả analog và dash.

Đồ cầm, trên quầy và dưới đất dùng cùng mô hình và cùng tỉ lệ thế giới, ngoài transform nhân vật. Bánh mì luôn đặt theo hướng ngang dễ đọc, không bị xoay thành cạnh mỏng khi người chơi quay. Độ cao cầm khớp với tay từng nhân vật. Khi quay lưng che mất món, một biểu tượng nhỏ báo vật đang cầm; mô hình vẫn nằm trên tay. Nút cảm ứng là vòng trắng trong suốt, joystick trái và cụm tương tác/nhảy lướt/ném/thả theo cung ngón cái bên phải, có khoảng cách mép màn hình. Khách hàng là các nhân vật low-poly gọn, mỗi đơn gắn một khách; người đầu quay về xe, người sau quay về người trước.

## Tương tác và bảo toàn đồ vật

Tay trống lấy vật trên bàn/đất; cầm vật đặt vào ô trống. Nguồn chỉ cấp đồ khi tay và mặt quầy trống. Không ghi đè ô đã có vật. Hỗ trợ chọn mục tiêu gần nhất trong tầm tay, kể cả khi không hướng mặt vào; hướng thẳng vào tâm ô trong góc hẹp ưu tiên chọn chính xác ô góc. Không với xuyên quầy hoặc qua khoảng trống giữa sàn. Viền trắng báo quầy/vật đã chọn. Trong lúc giữ cắt/rửa, mục tiêu công việc được giữ cho đến khi thả nút, di chuyển hoặc hết tầm.

Hai nhóm nguyên liệu sẵn sàng không có đĩa ghép thành món ở trên tay. Đĩa đặt trên bàn nhận thức ăn và nằm lại; đĩa cầm trên tay lấy thức ăn vào tay. Chỉ ghép phần đúng trạng thái, không trùng loại, không dùng đĩa bẩn. Bánh mì bắt buộc có thịt chín; rau và tương là hai lựa chọn độc lập, khớp chính xác đơn trước khi giao.

Pan là vật chứa có thức ăn, tiến độ và nhiệt riêng. Bếp chỉ cập nhật chảo nằm trên nó. Cầm chảo trút thịt chín vào đĩa/món đặt xuống rồi giữ chảo rỗng; cầm đĩa/món cũng lấy được thịt từ chảo. Rán 6 giây; chín đến cháy 21 giây, cảnh báo từ giây 14. Bỏ thức ăn vào rác giữ chảo/đĩa/bình.

Đĩa giao xong chuyển thành đĩa bẩn và xếp chung chồng cạnh xe. Dirty plate có count; tổng đĩa vật lý tính cả số đĩa trong chồng. Cầm, đặt, ném, thêm vào bồn đang có đĩa đều giữ đủ số lượng và tiến độ rửa. Giữ rửa liên tục hai giây/đĩa, xuất từng đĩa sạch ra cạnh bồn. Ưu tiên mặt bàn trống, nếu hết chỗ thì dùng sàn cạnh khay ra, không làm đổi mục tiêu đang rửa. Tổng bốn đĩa bảo toàn trên tay, bàn, đất và trong chuyến ném.

Thả đồ tạo vật trên sàn có thể chọn, nhặt và ghép. Ném hiển thị đường parabol từ vị trí đồ cầm và vòng điểm rơi, giới hạn tám đơn vị. Với khoảng ngang d và chênh cao dy, độ vồng a=(d×tan(30°)−dy)/4; y(t)=y0+dy×t+4a×t×(1−t). Hai đầu bếp có độ cao tay khác nhau; client và server dùng chung công thức. Góc xuất phát 30° trừ mục tiêu rất gần và cao hơn tay, khi cần hướng thẳng lên mục tiêu. Máy chủ quyết định bắt, ghép, cho vào chảo, giao hoặc rơi. Đồ không nhận được tại điểm rơi được đặt lên sàn an toàn. Hủy ngắm không làm mất hay ném vật.

Thịt cháy tạo lửa chặn tương tác tại ô. Mỗi sáu giây lan sang ô tiếp giáp, không nhảy qua lối đi. Bình xịt theo hình nón phía trước, tầm 3,5; một ô lửa đầy cần khoảng 1,2 giây xịt. Ô vừa xịt có thời gian chống bắt lửa lại ngắn để dập cả dãy được.

## Mô phỏng và hiển thị

Máy chủ cập nhật phòng 20 Hz, xử lý tương tác tuần tự để không nhân đôi vật. Mỗi đầu bếp có tay, hướng và công việc riêng. Snapshot có đồ trên đất, chuyến ném, lửa, chảo, khách dựa theo đơn và nhân vật theo chỗ phòng. Client nội suy vị trí và chuyến ném; không quyết định kết quả online.

Mọi thiết bị giữ khử răng cưa, PMREM, nước shader và shadow map 1024. Tự động bắt đầu 60 FPS/DPR tối đa 1,5; tải cao liên tục mới hạ DPR theo bước 0,15 đến sàn 1,15 rồi 30 FPS. Phục hồi chậm để tránh đổi qua lại. Sắc nét giữ 60 FPS/DPR tối đa 2; Tiết kiệm giữ 30 FPS/DPR tối đa 1,25. Thay mật độ điểm ảnh không đặt lại vị trí camera. Camera bám theo có vùng đệm để việc chạy dọc vẫn nhìn thấy rõ.

Gộp hình học tĩnh bằng vertex color/material tương thích và dùng chung mesh vật phẩm. Giữ shadow map khi đứng yên; cập nhật bóng cùng từng khung chuyển động/chuyển clip để không lấy bóng từ tư thế cũ. Mesh nhân vật castShadow nhưng không receiveShadow nhằm tránh nhiễu tự đổ bóng trên chi tiết rig. Vòng màu dưới chân có mũi tên nối liền quay theo hướng nhân vật. Giao diện HUD giữ SVG khi nội dung không đổi; thanh đơn dùng transform. Khi tạm dừng/menu phòng/kết quả chỉ vẽ 8 FPS; tab ẩn ngừng vẽ. Giới hạn render không thay đổi tốc độ mô phỏng game.

Tablet có cả hai cạnh CSS tối thiểu 700×600: joystick 128 px bằng 80% của 160 px cũ, núm 54,4 px, cao thêm 30 px; khoảng mép hai cụm là clamp(94px,10vw,126px). Điều kiện kích thước này không áp dụng lên iPhone ngang/dọc. Màn kết quả dùng chân dung GLB chụp riêng trong render target sRGB rồi lưu cache, không tạo thêm WebGL context.

## Điểm và kết quả

Giá gốc classic100, herb110, spicy110, loaded120. Thanh xanh ≥50% thời gian: giá đầy đủ; vàng ≥25%:90%; đỏ:80%. Chỉ giao phiếu đầu hàng mới tăng chuỗi, tối đa4. Tip chuỗi2/3/4 tương ứng10/20/40; tiếp tục đúng thứ tự giữtip40. Giao phiếu phía sau hoặc hết hạn làm mất chuỗi; phạt hết hạn tối đa15 không làm điểm âm. Ledger lưu riêng revenue/tips/penalties trong snapshot, tổng revenue+tips−penalties bằng score.

Sao1–5 tại100/240/380/520/660. Mốc tối đa660=550×1,2. Năm phiếu đầu còn xanh và giao đúng thứ tự cho550 tiền món+110tip=660. Kết quả toàn màn hình có ribbon,5sao,ledger,nhân vật/tên người chơi và thao tác chia sẻ/chơi lại; online chỉ chủ phòng mở ca tiếp.

## Kiểm chứng

Kiểm tra đơn vị bảo toàn đĩa, ghép hai chiều, chảo di động, cháy lan/dập lửa, ném/bắt/giao, input mạng sai và tiếp cận mọi trạm bằng đường đi thật. Kiểm tra trình duyệt hoàn thành công thức bằng phím, rửa đĩa thật, bố cục iPad/điện thoại, cảm ứng, đường ném, khách, cài đặt đồ họa. Kiểm tra hai phiên online gồm tạo/vào phòng, thao tác chung, ném bắt, phục hồi mạng, tạm dừng và chơi lại. Hiệu năng được đo trên Chromium mô phỏng, chưa trên iPad thật.

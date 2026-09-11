# Màn 01 — Bếp đảo xanh

## Bố cục và hình ảnh

Hai khu bếp rộng nối bằng cầu, camera 3/4 chính diện khoảng 38°, dãy quầy chiếu ngang màn hình. Bố cục mới theo ảnh vẽ tay: ba nguồn bánh/thịt/rau ở giữa dãy trên cùng; bồn rửa đôi ở dãy trước khu trên bên trái; hai thớt rộng hai ô nằm hai bên lối giữa dãy sau khu dưới. Những thiết bị có gạch đỏ được bỏ, giữ mặt quầy trống. Hai bếp ở dãy trước, xe bánh mì ba ô bên phải, thùng rác ngoài cùng phải. Bình chữa cháy ở đầu trái dãy thớt. Vỉa hè phía trước dành cho hàng khách, không phải vùng đi lại của đầu bếp.

Nguồn nguyên liệu có khay vuông phủ gần hết mặt quầy và vật thể 3D ở giữa; khay ẩn khi người chơi đặt vật thật lên ô. Mỗi thớt/bồn đôi là một trạm lớn nhận một vật. Mọi ô còn lại dùng cùng kích thước cho mặt bàn, va chạm và chọn mục tiêu. Bốn đĩa được đặt trên các bàn gần xe từ đầu màn.

Nhân vật thứ nhất là chó vàng áo vá, nhân vật thứ hai màu xanh, dùng hai GLB người dùng cung cấp. Blender thêm armature, trọng số tối đa bốn xương mỗi đỉnh, vertex color và sáu clip chuyển động. Client clone bộ xương riêng cho từng người và chuyển tiếp giữa đứng, chạy, cầm, cầm khi chạy, làm việc và ném. Tốc độ nền tăng 30%, dash không có thời gian chờ; tốc độ trục sâu bù phép chiếu camera để khoảng cách nhìn thấy trên màn hình bằng hướng ngang, kể cả analog và dash.

Đồ cầm, trên quầy và dưới đất dùng cùng mô hình và cùng tỉ lệ thế giới, ngoài transform nhân vật. Bánh mì luôn đặt theo hướng ngang dễ đọc, không bị xoay thành cạnh mỏng khi người chơi quay. Độ cao cầm khớp với tay từng nhân vật. Khi quay lưng che mất món, một biểu tượng nhỏ báo vật đang cầm; mô hình vẫn nằm trên tay. Nút cảm ứng là vòng trắng trong suốt, joystick trái và cụm tương tác/nhảy lướt/ném/thả theo cung ngón cái bên phải, có khoảng cách mép màn hình. Khách hàng là các nhân vật low-poly gọn, mỗi đơn gắn một khách; người đầu quay về xe, người sau quay về người trước.

## Tương tác và bảo toàn đồ vật

Tay trống lấy vật trên bàn/đất; cầm vật đặt vào ô trống. Nguồn chỉ cấp đồ khi tay và mặt quầy trống. Không ghi đè ô đã có vật.

Hai nhóm nguyên liệu sẵn sàng không có đĩa ghép thành món ở trên tay. Đĩa đặt trên bàn nhận thức ăn và nằm lại; đĩa cầm trên tay lấy thức ăn vào tay. Chỉ ghép phần đúng trạng thái, không trùng loại, không dùng đĩa bẩn. Bánh mì bắt buộc có thịt chín; rau và tương là hai lựa chọn độc lập, khớp chính xác đơn trước khi giao.

Pan là vật chứa có thức ăn, tiến độ và nhiệt riêng. Bếp chỉ cập nhật chảo nằm trên nó. Cầm chảo trút thịt chín vào đĩa/món đặt xuống rồi giữ chảo rỗng; cầm đĩa/món cũng lấy được thịt từ chảo. Rán 6 giây; chín đến cháy 21 giây, cảnh báo từ giây 14. Bỏ thức ăn vào rác giữ chảo/đĩa/bình.

Đĩa giao xong chuyển thành đĩa bẩn và đặt cạnh xe. Người chơi mang tới bồn, giữ rửa hai giây; đĩa sạch đặt cạnh bồn. Ưu tiên mặt bàn trống, nếu hết chỗ thì dùng sàn gần đó. Tổng bốn đĩa bảo toàn trên tay, bàn, đất và trong chuyến ném.

Thả đồ tạo vật trên sàn có thể chọn, nhặt và ghép. Ném hiển thị đường parabol và vòng điểm rơi, giới hạn tám đơn vị. Máy chủ quyết định bắt, ghép, cho vào chảo, giao hoặc rơi. Đồ không nhận được tại điểm rơi được đặt lên sàn an toàn. Hủy ngắm không làm mất hay ném vật.

Thịt cháy tạo lửa chặn tương tác tại ô. Mỗi sáu giây lan sang ô tiếp giáp, không nhảy qua lối đi. Bình xịt theo hình nón phía trước, tầm 3,5; một ô lửa đầy cần khoảng 1,2 giây xịt. Ô vừa xịt có thời gian chống bắt lửa lại ngắn để dập cả dãy được.

## Mô phỏng và hiển thị

Máy chủ cập nhật phòng 20 Hz, xử lý tương tác tuần tự để không nhân đôi vật. Mỗi đầu bếp có tay, hướng và công việc riêng. Snapshot có đồ trên đất, chuyến ném, lửa, chảo, khách dựa theo đơn và nhân vật theo chỗ phòng. Client nội suy vị trí và chuyến ném; không quyết định kết quả online.

Mọi thiết bị giữ khử răng cưa, PMREM, nước shader và shadow map 1024. Tự động bắt đầu 60 FPS/DPR tối đa 1,5; tải cao liên tục mới hạ DPR theo bước 0,15 đến sàn 1,15 rồi 30 FPS. Phục hồi chậm để tránh đổi qua lại. Sắc nét giữ 60 FPS/DPR tối đa 2; Tiết kiệm giữ 30 FPS/DPR tối đa 1,25. Thay mật độ điểm ảnh không đặt lại vị trí camera. Camera bám theo có vùng đệm để việc chạy dọc vẫn nhìn thấy rõ.

Gộp hình học tĩnh bằng vertex color/material tương thích và dùng chung mesh vật phẩm. Chỉ cập nhật shadow map khi đồ vật thay đổi hoặc tối đa 15 Hz lúc chuyển động, kể cả kết thúc/chuyển clip. Giao diện HUD giữ SVG khi nội dung không đổi; thanh đơn dùng transform. Khi tạm dừng/menu phòng/kết quả chỉ vẽ 8 FPS; tab ẩn ngừng vẽ. Giới hạn render không thay đổi tốc độ mô phỏng game.

## Kiểm chứng

Kiểm tra đơn vị bảo toàn đĩa, ghép hai chiều, chảo di động, cháy lan/dập lửa, ném/bắt/giao, input mạng sai và tiếp cận mọi trạm bằng đường đi thật. Kiểm tra trình duyệt hoàn thành công thức bằng phím, rửa đĩa thật, bố cục iPad/điện thoại, cảm ứng, đường ném, khách, cài đặt đồ họa. Kiểm tra hai phiên online gồm tạo/vào phòng, thao tác chung, ném bắt, phục hồi mạng, tạm dừng và chơi lại. Hiệu năng được đo trên Chromium mô phỏng, chưa trên iPad thật.

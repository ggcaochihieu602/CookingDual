# Màn 01 — Bếp đảo xanh

## Bố cục và hình ảnh

Hai khu bếp rộng nối bằng cầu, camera 3/4 chính diện khoảng 38°, dãy quầy chiếu ngang màn hình. Bố cục mới theo ảnh vẽ tay: ba nguồn bánh/thịt/rau ở giữa dãy trên cùng; bồn rửa đôi ở dãy trước khu trên bên trái; hai thớt rộng hai ô nằm hai bên lối giữa dãy sau khu dưới. Những thiết bị có gạch đỏ được bỏ, giữ mặt quầy trống. Hai bếp ở dãy trước, xe bánh mì ba ô bên phải, thùng rác ngoài cùng phải. Bình chữa cháy ở đầu trái dãy thớt. Vỉa hè phía trước dành cho hàng khách, không phải vùng đi lại của đầu bếp.

Nguồn nguyên liệu có khay vuông phủ gần hết mặt quầy và vật thể 3D ở giữa; khay ẩn khi người chơi đặt vật thật lên ô. Mỗi thớt/bồn đôi là một trạm lớn nhận một vật. Mọi ô còn lại dùng cùng kích thước cho mặt bàn, va chạm và chọn mục tiêu. Bốn đĩa được đặt trên các bàn gần xe từ đầu màn.

Nhân vật thứ nhất là chó vàng áo vá, nhân vật thứ hai màu xanh, dựng bằng Blender theo ảnh. Các bộ phận tay/chân tách nhóm để chuyển động; thân dùng vertex color. Tốc độ và kích thước hiển thị tăng 30%, dash không có thời gian chờ. Khách hàng là các nhân vật low-poly gọn, mỗi đơn gắn một khách; người đầu quay về xe, người sau quay về người trước.

## Tương tác và bảo toàn đồ vật

Tay trống lấy vật trên bàn/đất; cầm vật đặt vào ô trống. Nguồn chỉ cấp đồ khi tay và mặt quầy trống. Không ghi đè ô đã có vật.

Hai nhóm nguyên liệu sẵn sàng không có đĩa ghép thành món ở trên tay. Đĩa đặt trên bàn nhận thức ăn và nằm lại; đĩa cầm trên tay lấy thức ăn vào tay. Chỉ ghép phần đúng trạng thái, không trùng loại, không dùng đĩa bẩn. Bánh mì bắt buộc có thịt chín; rau và tương là hai lựa chọn độc lập, khớp chính xác đơn trước khi giao.

Pan là vật chứa có thức ăn, tiến độ và nhiệt riêng. Bếp chỉ cập nhật chảo nằm trên nó. Cầm chảo trút thịt chín vào đĩa/món đặt xuống rồi giữ chảo rỗng; cầm đĩa/món cũng lấy được thịt từ chảo. Rán 6 giây; chín đến cháy 21 giây, cảnh báo từ giây 14. Bỏ thức ăn vào rác giữ chảo/đĩa/bình.

Đĩa giao xong chuyển thành đĩa bẩn và đặt cạnh xe. Người chơi mang tới bồn, giữ rửa hai giây; đĩa sạch đặt cạnh bồn. Ưu tiên mặt bàn trống, nếu hết chỗ thì dùng sàn gần đó. Tổng bốn đĩa bảo toàn trên tay, bàn, đất và trong chuyến ném.

Thả đồ tạo vật trên sàn có thể chọn, nhặt và ghép. Ném hiển thị đường parabol và vòng điểm rơi, giới hạn tám đơn vị. Máy chủ quyết định bắt, ghép, cho vào chảo, giao hoặc rơi. Đồ không nhận được tại điểm rơi được đặt lên sàn an toàn. Hủy ngắm không làm mất hay ném vật.

Thịt cháy tạo lửa chặn tương tác tại ô. Mỗi sáu giây lan sang ô tiếp giáp, không nhảy qua lối đi. Bình xịt theo hình nón phía trước, tầm 3,5; một ô lửa đầy cần khoảng 1,2 giây xịt. Ô vừa xịt có thời gian chống bắt lửa lại ngắn để dập cả dãy được.

## Mô phỏng và hiển thị

Máy chủ cập nhật phòng 20 Hz, xử lý tương tác tuần tự để không nhân đôi vật. Mỗi đầu bếp có tay, hướng và công việc riêng. Snapshot có đồ trên đất, chuyến ném, lửa, chảo, khách dựa theo đơn và nhân vật theo chỗ phòng. Client nội suy vị trí và chuyến ném; không quyết định kết quả online.

Cảm ứng mặc định 30 FPS/DPR 1, không bóng động/PMREM, mặt nước tĩnh nhẹ. Desktop 60 FPS, DPR tối đa 1,5 và shadow map 1024. Gộp hình học tĩnh bằng vertex color/material tương thích, giảm bevel nhỏ và dùng chung mesh vật phẩm. Vật phẩm, dao, chảo, lửa và người vẫn cập nhật riêng. Khi tạm dừng/menu phòng/kết quả chỉ vẽ 8 FPS; tab ẩn ngừng vẽ. Giới hạn render không thay đổi tốc độ mô phỏng game.

## Kiểm chứng

Kiểm tra đơn vị bảo toàn đĩa, ghép hai chiều, chảo di động, cháy lan/dập lửa, ném/bắt/giao, input mạng sai và tiếp cận mọi trạm bằng đường đi thật. Kiểm tra trình duyệt hoàn thành công thức bằng phím, rửa đĩa thật, bố cục iPad/điện thoại, cảm ứng, đường ném, khách, cài đặt đồ họa. Kiểm tra hai phiên online gồm tạo/vào phòng, thao tác chung, ném bắt, phục hồi mạng, tạm dừng và chơi lại. Hiệu năng được đo trên Chromium mô phỏng, chưa trên iPad thật.

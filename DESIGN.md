# Màn 01 — Bếp đảo xanh

## Hướng hình ảnh hiện tại

Theo ảnh người dùng cung cấp: góc 3/4 chính diện, bếp rộng, các ô quầy vàng nối liền, sàn xanh, nước xanh ngọc, đường ray và đá xung quanh. Một màn, chơi đơn hoặc hai người trên hai thiết bị qua Internet, hai khu nối bằng lối đi thật; không có dịch chuyển.

55 ô kích thước 1,38 trên lưới bước 1,4. Khu chính rộng 21,4 × 10,3; khu sau rộng 15,5 × 7,4. Tổng diện tích hai khu lớn hơn khoảng 3,4 lần mặt bếp ban đầu, chưa tính cầu và lối vào.

Camera nhìn xuống khoảng 38 độ, không có góc xoay ngang. Trục X chiếu ngang màn hình. Máy tính giữ toàn cảnh; màn hình hẹp theo nhân vật hoặc theo chiều sâu nhưng không thay đổi góc chính diện. Góc thấp hơn cho thấy rõ mặt trước quầy và chiều cao nhân vật.

Phiếu đơn không hiện chữ: ảnh món hoàn chỉnh trên bảng kẹp xanh, hình các nguyên liệu trong vòng tròn và thanh thời gian xanh. Đồng hồ có huy hiệu tròn xanh; điểm có huy hiệu cam và nhãn chuỗi; ba sao ở khay riêng bên dưới. Tên/công thức vẫn có mô tả trợ năng. Bỏ nhãn chữ trên map, lời chào bếp, hướng dẫn từng bước và hộp thao tác; giữ biểu tượng/thanh tiến độ cho thiết bị đang làm việc và nút mở hướng dẫn. Tên hai người online giúp nhận diện đồng đội, không hiện ở chơi đơn.

Chất liệu tách theo bề mặt: gạch men, gỗ, vỏ bánh, kim loại, men bếp, gốm và lá. Texture được tạo bằng canvas, phản chiếu môi trường dùng PMREM từ bầu trời vẽ bằng mã. Mặt nước dùng hai lớp vệt sáng với UV chuyển động nhẹ; không đổi trạng thái mô phỏng. Giảm chuyển động hoặc tạm dừng sẽ dừng hiệu ứng nước. Ánh sáng mặt trời ấm, ánh sáng bù xanh và bóng mềm sát chân vật giúp làm rõ hình khối. Mô hình tĩnh được gộp theo chất liệu và cờ đổ/nhận bóng; vật trên bàn, dao, chảo, đầu bếp và mái che vẫn cập nhật riêng.

Đầu bếp có khăn cổ, tóc, nếp mũ, túi tạp dề và mắt có điểm sáng. Bánh mì có vỏ hạt nhỏ, vết rạch, từng lát thịt và các thành phần tùy chọn riêng. Khay nguồn trưng nhiều nguyên liệu ở mép sau, giữ trống vị trí đặt đồ phía trước. Mái xe tự mờ khi đầu bếp đến gần, giữ nhìn rõ nhân vật và đĩa.

## Quy tắc một ô, một vật

Mỗi ô dùng cùng vị trí và kích thước cho mô hình, va chạm và chọn mục tiêu. Mỗi ô có một vật phẩm và một điểm gắn trên mặt quầy.

1. Cầm vật + ô trống: đặt vào ô, bất kể loại trạm. Đĩa hoàn chỉnh tại quầy giao được giao ngay nếu khớp một đơn chờ; nếu không khớp, giữ trên tay và báo lý do.
2. Tay trống + ô có vật: lấy chính vật đó; không lấy xuyên qua vật để truy cập kho bên dưới.
3. Cầm thức ăn + đĩa trên ô: thêm thành phần vào đĩa, tay trống.
4. Cầm đĩa + thức ăn trên ô: thêm thành phần vào đĩa đang cầm, ô trống.
5. Cầm nguyên liệu đã sẵn sàng + nguyên liệu/nhóm nguyên liệu trên ô: ghép thành một `meal`, để lại trên bàn và thả trống tay. Không yêu cầu đĩa; không ghép sống/cháy/trùng loại. Thêm đĩa sau theo hai chiều như trên. Hai vật không ghép được giữ nguyên và báo lý do.
6. Tay trống + nguồn/kệ trống: lấy một nguyên liệu/đĩa từ kho.

Tồn kho tách biệt với vật phẩm trên mặt bàn. Đặt tạm tại nguồn/kệ không tiêu thụ kho hoặc tự đổi loại vật.

## Thiết bị và phục hồi

- Thớt: giữ E chỉ cắt thịt/rau sống. Đĩa nằm yên.
- Bếp: tự rán đúng thịt đã cắt. Rau, bánh, thịt sống và đĩa được đặt tạm an toàn. Chảo hiện khi có thịt đúng trạng thái; điểm đặt thức ăn nâng theo chảo.
- Bồn: rửa khi tay trống và mặt quầy trống. Lấy đồ đặt tạm ra trước khi rửa.
- Dọn: Space để đặt, giữ E để bỏ thức ăn. Đĩa được giữ lại trên quầy.
- Ghép có/không đĩa chỉ nhận các thành phần đúng trạng thái và không trùng loại. `meal` không bị nấu/cắt, nhưng cần đĩa trước khi giao.
- Tương ớt lấy ở nguồn có trạng thái dùng ngay. Có thể đặt tạm ở bất kỳ ô nào; thớt và bếp không chế biến tương ớt.

## Bốn công thức bánh mì

Bắt buộc bánh mì và thịt chín; rau đã cắt và tương ớt là hai lựa chọn độc lập: thịt nguyên bản, thịt rau, thịt tương ớt, đầy đủ. Đĩa có thể có 2–4 thành phần. Sau khi đủ bánh và thịt, vẫn có thể thêm rau/tương ớt theo cả hai chiều ghép. Không thêm trùng nguyên liệu.

Mỗi đơn lưu `recipeId`. So khớp chính xác tập thành phần và trạng thái, chọn đơn phù hợp xuất hiện sớm nhất. Không giao nhầm đơn đầu hàng đợi. Khi giao sai không mất đồ, đĩa, điểm hay chuỗi. Đơn đầu là thịt rau để học cắt/rán; tiếp theo lần lượt nguyên bản, thịt tương ớt và đầy đủ, rồi lặp lại. Phiếu và hướng dẫn dùng chung định nghĩa công thức. Hình bánh chỉ hiện rau và tương ớt khi đã thêm chúng. Blender xuất mesh và ảnh sản phẩm từ cùng mô hình.

## Hai đầu bếp

Server xử lý vòng bếp chung ở 20 Hz; người chơi có input, tay, hướng nhìn và công việc độc lập. Timer, chảo, đơn và đĩa chỉ cập nhật một lần mỗi tick. Tương tác xử lý tuần tự trên server, nên hai người cùng lấy một vật không làm nhân đôi đồ. Snapshot chọn đúng chef địa phương cho HUD; hiển thị hai tạp dề và vòng chân khác màu. Vị trí được nội suy trên client; chưa dự đoán di chuyển. Phòng có mã mời, token nối lại, tạm dừng chung và giữ chỗ khi mất mạng 3 phút. Chỉ host bắt đầu/chơi lại; rời phòng kết thúc phòng cho cả hai. Không lưu qua lần restart server.

## Bố cục chức năng

Khu trước có một dãy dài phía sau: nguồn bánh, thịt, rau, kệ đĩa, hai thớt, bồn rửa, nguồn tương ớt xen giữa các ô trống. Mặt thớt 1,31 × 1,26 gần kín ô bàn, có viền gỗ dày, rãnh và dao lớn. Dãy phía trước có hai bếp, xe bánh mì rộng ba ô và ô dọn, cùng nhiều bàn trống. Xe có tủ kính trưng bánh, mái sọc, biển hiệu và bánh xe; ba vị trí giao vẫn là ba ô độc lập, mỗi ô chứa một vật. Lối giữa hai dãy rộng và thông suốt.

Khu sau có dãy bàn bao quanh, thêm ba nguồn nguyên liệu, một thớt và một bếp. Lối đi giữa kết nối cả hai khu, mọi bàn đều tiếp cận được từ vị trí xuất phát. Các ống trang trí chừa lối qua cầu.

## Kiểm chứng

Kiểm tra mọi ô với 10 loại/trạng thái vật, ghép đĩa hai chiều tại cả 55 ô, không ghi đè, không chế biến sai vật và đường đi giữa tất cả vị trí. Kiểm tra bốn công thức, từ chối món thừa/thiếu/sai thành phần, chọn đúng đơn, thêm tương ớt hai chiều và cả ba vị trí giao. Thử qua trình duyệt bằng bàn phím và cảm ứng, gồm đặt đĩa trên bếp, dùng đĩa lấy thức ăn trên thớt, lấy tương ớt, soạn bánh đủ bốn thành phần trên xe, giao/rửa, tạm dừng, kết quả và chơi lại. Thiết bị cảm ứng hiện được kiểm tra bằng mô phỏng trình duyệt.

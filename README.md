# CookingDual · Bếp đảo xanh

Bản game mới, viết lại từ đầu: **một màn bếp 3D, chơi đơn hoặc hai người qua Internet, 180 giây**. Màn hiện tại có **55 ô quầy** trên hai khu bếp rộng nối bằng cầu, sàn xanh và quầy vàng theo ảnh tham khảo. Camera 3/4 chính diện hạ xuống khoảng **38°**; trái/phải trên màn hình trùng hướng di chuyển. Giao diện tiếng Việt; hỗ trợ bàn phím và cảm ứng.

## Chơi ngay

Nhấp đúp **`Choi-CookingDual.cmd`** để khởi động và mở game trong trình duyệt. Máy hiện tại đã có Node.js.

Hoặc chạy trong thư mục này:

```sh
npm ci
npm start
```

Mở **http://localhost:5173**. Cần Node.js 24; lần đầu cần Internet để cài gói WebSocket. Sau khi cài, chơi đơn tại máy không cần Internet; tài nguyên 3D và âm thanh đều nằm trong dự án. Trình duyệt cần hỗ trợ WebGL 2. Nên chơi ngang trên điện thoại và iPad. File khởi động Windows tự cài gói khi thiếu.

## Chơi chung trên hai máy

Chọn **Chơi cùng bạn → nhập tên → Tạo phòng mới**, gửi liên kết hoặc mã 6 ký tự cho người thứ hai. Đủ 2/2 người, chủ phòng bắt đầu. Hai đầu bếp cam/xanh chia sẻ bàn, vật phẩm, đơn, điểm và thời gian. Có thể đặt nguyên liệu hoặc món đang ghép lên bàn để người kia lấy tiếp. Tạm dừng áp dụng cho cả phòng; mất mạng giữ chỗ 3 phút để nối lại.

Để bạn bè ở mạng khác mở được game, cần đưa cả server lên web. Hướng dẫn đầy đủ trong **[DEPLOY.md](DEPLOY.md)** hoặc **http://localhost:5173/publish.html**; có sẵn `render.yaml`, `Dockerfile` và gói `artifacts/CookingDual-web.zip`. Chưa có địa chỉ public được triển khai tự động.

## Điều khiển

| Thao tác | Bàn phím | Cảm ứng |
|---|---|---|
| Di chuyển | WASD hoặc phím mũi tên | Cần bên trái |
| Cầm / đặt / ghép / giao | Space | Chạm nút bên phải |
| Cắt / rửa / dọn chảo | Giữ E | Giữ nút khi hiện “Giữ” |
| Lướt nhanh | Shift | Nút tia chớp |
| Tạm dừng | Escape | Nút tạm dừng phía trên |

Đứng gần và hướng về quầy. Viền vàng là quầy đang được chọn. Thao tác cầm/đặt và giữ để chế biến là hai thao tác riêng: thả nút sau khi đặt rồi giữ lại để cắt. Map không còn nhãn chữ hoặc hộp hướng dẫn nổi; nút **?** mở đầy đủ cách chơi. Thanh tiến độ và biểu tượng báo đang cắt/rán, đã chín hoặc sắp cháy.

## Công thức màn đầu

1. Lấy thịt → đặt lên thớt → giữ E cắt trong 2,2 giây.
2. Lấy thịt đã cắt → đặt lên bếp → rán 6 giây. Lấy thịt trong 14 giây tiếp theo để tránh cháy.
3. Nếu phiếu có rau: lấy rau → đặt lên thớt → giữ E để cắt. Nếu phiếu có tương ớt: lấy tại quầy **Tương ớt** bên phải bồn rửa; dùng ngay.
4. Đặt **bánh mì + thịt chín** cùng rau/tương ớt theo phiếu lên cùng ô bằng Space để ghép thành món, **chưa cần đĩa**. Có thể ghép các phần nhân trước, thêm bánh sau. Khi cần giao, cầm đĩa lấy món hoặc mang món tới đĩa trên bàn. Bánh mì từ quầy dùng ngay.
5. Cầm đĩa đến một trong **ba ô giao của xe bánh mì**, phía trước bên phải → Space để giao.

| Phiếu | Thành phần trên đĩa |
|---|---|
| Thịt nguyên bản | Bánh mì + thịt chín |
| Thịt & rau | Bánh mì + thịt chín + rau đã cắt |
| Thịt & tương ớt | Bánh mì + thịt chín + tương ớt |
| Bánh mì đầy đủ | Bánh mì + thịt chín + rau đã cắt + tương ớt |

Rau và tương ớt là hai lựa chọn độc lập. Có thể thêm một hoặc cả hai vào bánh đã có thịt. Món phải khớp **chính xác** một đơn đang chờ; giao sai giữ nguyên món trên tay và không tính điểm. Có thể giao đơn phù hợp ở bất kỳ vị trí nào trong hàng đợi. Phiếu chỉ hiện **ảnh bánh sau khi ghép, hình các nguyên liệu cần có và thanh thời gian**. Hình bánh trên đĩa thay đổi theo thành phần.

Có thể cầm thức ăn hoặc cả món đã ghép để thêm vào đĩa đặt trên quầy, hoặc cầm đĩa để lấy món đang đặt trên quầy. Hai nhóm nguyên liệu chưa có đĩa cũng ghép được với nhau. Không ghép nguyên liệu sống, cháy hoặc trùng loại. Hệ thống ghép hoạt động trên mọi loại ô; cần đĩa sạch trước khi giao.

**Mọi ô trống đều nhận vật phẩm**, kể cả thớt, bếp, nguồn nguyên liệu, kệ đĩa, bồn rửa và quầy giao món. Ô đã có đồ không bị ghi đè. Vật đang đặt trên mặt quầy được ưu tiên nhặt/ghép trước; muốn lấy nguyên liệu mới hoặc đĩa mới từ kho, cần để trống tay và mặt quầy. Bếp chỉ rán thịt đã cắt; đĩa hoặc rau đặt tạm trên bếp không bị nấu. Thớt chỉ xử lý thịt/rau sống, không xử lý đĩa.

Ba đĩa luân chuyển: giao món → đĩa bẩn trả về bồn sau 3 giây → giữ E rửa 2 giây với tay và mặt bồn trống → đĩa trở lại kệ. Để bỏ thức ăn, dùng Space đặt lên ô Dọn thức ăn rồi giữ E; đĩa được giữ lại trên quầy. Thịt cháy được dọn bằng cách giữ E tại bếp với tay trống.

## Nhịp ca bếp

- Một đơn lúc bắt đầu, thêm đơn mỗi 26 giây, tối đa 3 đơn chờ; mỗi đơn có 100 giây.
- Giao đúng: 100 điểm + thưởng thời gian còn lại + thưởng chuỗi liên tiếp (tối đa 40 điểm).
- Đơn hết giờ: trừ 15 điểm, không âm; chuỗi liên tiếp về 0.
- 1 / 2 / 3 sao tại 100 / 300 / 550 điểm.
- Đồng hồ đứng yên ở menu, đếm ngược, tạm dừng và bảng kết quả.
- Mở hướng dẫn, âm lượng hoặc ẩn trang sẽ tạm dừng. Online chỉ mất focus cửa sổ thì thả điều khiển; ẩn tab/mất mạng mới dừng cả ca.
- Lưu kỷ lục và tùy chọn âm thanh trên trình duyệt. Bản đầu chưa lưu ca đang chơi.

## Phạm vi bản làm lại

Đã có: nhân vật 3D có chuyển động, 55 ô quầy với va chạm theo từng ô, chọn quầy theo hướng nhìn, vật phẩm trên tay/mặt bàn, ba thớt lớn và ba bếp, bốn công thức bánh mì, tương ớt, xe giao bánh mì rộng ba ô với tủ kính và mái sọc, cháy/dọn, luân chuyển đĩa, đơn hàng, điểm/sao, hướng dẫn theo bước, âm thanh, tạm dừng, chơi lại và điều khiển cảm ứng. Điện thoại dọc theo nhân vật; điện thoại ngang theo chiều sâu để đồ vật đủ lớn. Mọi chế độ giữ camera nhìn chính diện.

Đã có multiplayer hai người qua WebSocket, phòng/mã mời, nối lại, nhạc nền tự tổng hợp, tùy chỉnh nhạc/hiệu ứng riêng và manifest thêm ra màn hình chính. Nhạc bắt đầu sau thao tác bấm/chạm; không tải nhạc của bên thứ ba. Phiếu món dùng ảnh 3D, HUD có đồng hồ xanh, huy hiệu điểm cam và ba sao.

Màn này tập trung kiểm chứng vòng chơi cơ bản. Chưa có ném đồ, nhiều màn, tài khoản, cache chơi offline, lưu phòng qua lần khởi động server hay bản Unity/native. Kiểm tra cảm ứng và hai phiên trình duyệt hiện thực hiện bằng Chromium mô phỏng; chưa kiểm chứng trên thiết bị iPad/iPhone thật. Phòng nằm trong RAM của một tiến trình server; xem giới hạn ở DEPLOY.md.

Tài liệu được tham khảo từ `E:\CookingDou`: Product Brief, Game Design, Research & Technical Reference, Asset Specification và kế hoạch tương tác không gian V4. Dự án cũ được giữ nguyên. Bản mới chọn phạm vi một màn nhỏ; các yêu cầu mở rộng trong tài liệu cũ không tự động đưa vào màn này.

## Cấu trúc

- `src/game.js`: luật chơi, vòng đời vật phẩm, trạm, va chạm và điểm.
- `src/level.js`: hai vùng sàn, cầu nối, 55 ô quầy và điểm tiếp cận.
- `src/environment.js`: sàn xanh, quầy vàng, nước, đường ray, đá và thiết bị.
- `src/materials.js`: chất liệu, texture tạo bằng mã, môi trường phản chiếu và hiệu ứng nước.
- `src/scene.js`: căn bếp và nhân vật 3D, hiệu ứng, vật phẩm và nhãn trạm.
- `src/main.js`: điều khiển, giao diện, âm thanh, menu và kết quả.
- `src/rooms.mjs`: máy chủ phòng, vòng mô phỏng chung và nối lại.
- `src/online.js`: kết nối và điều khiển client online.
- `src/music.js`: nhạc nền gốc được tổng hợp bằng Web Audio.
- `src/assets.js`: tải mesh Blender và chia sẻ geometry/material giữa các vật phẩm.
- `src/style.css`: giao diện máy tính / cảm ứng.
- `src/island.css`: HUD nổi toàn màn hình theo ảnh tham khảo.
- `src/hud.css`: phiếu hình ảnh, đồng hồ/huy hiệu/sao và map không nhãn chữ.
- `src/social.css`: menu phòng, lời mời và cài đặt âm thanh.
- `assets/`: mô hình và ảnh món render từ Blender; `kitchen.blend` là file nguồn chỉnh sửa.
- `scripts/build-assets.py`: dựng và xuất 13 mẫu đồ ăn/đĩa cùng ảnh phiếu bằng Blender 5.2.
- `vendor/`: Three.js 0.185.1 và RoundedBoxGeometry, giấy phép MIT đi kèm.
- `tests/`: kiểm tra luật chơi và chơi thử tự động trong trình duyệt.
- `artifacts/`: ảnh màn chơi và báo cáo kiểm tra trình duyệt.

Tất cả mô hình bếp, nhân vật, đồ ăn, icon và đồ họa của bản này được dựng mới trong dự án; không sử dụng mô hình hay sprite của Overcooked hoặc Kitchen Chaos. Bộ đồ ăn/đĩa hiện tại được dựng bằng Blender: bánh có vết rạch/vừng, thịt có vân mỡ/vết nướng, rau có gân lá, chai tương có nhãn hình ớt; bốn chiếc bánh phản ánh đúng rau và tương đã thêm. Ảnh trên phiếu được render từ chính bộ model này. Mesh được nén khi truyền qua HTTP; mô hình dựng sẵn bằng mã là phương án dự phòng nếu không tải được asset.

Đồ họa có sàn gạch men bo cạnh, vân gỗ, chất liệu kim loại/gốm, ánh sáng môi trường và bóng sát chân vật thể. Mặt nước có các vệt sáng và gợn chuyển động; cây lá, đầu bếp, khay nguyên liệu và bánh mì được bổ sung chi tiết. Mái xe tự mờ khi đến gần để không che đầu bếp. Texture được tạo ngay trong game, không cần tải từ Internet; hiệu ứng nước đứng yên khi tạm dừng hoặc bật giảm chuyển động.

## Kiểm tra

```sh
npm test
npm run check
```

Kiểm thử trình duyệt cần Playwright và Chromium. Bộ kiểm thử trong môi trường hiện tại chạy bằng:

```sh
node tests/browser.cjs
node tests/online.cjs
```

Có thể chỉ định đường dẫn khác bằng `PLAYWRIGHT_MODULE` và `CHROME_PATH`. Bộ browser.cjs cần máy chủ đang chạy ở cổng 5173; online.cjs tự mở server thử nghiệm. Chế độ kiểm tra `?test=1` mới xuất đối tượng kiểm tra phía client; không mở API sửa trạng thái phía server.

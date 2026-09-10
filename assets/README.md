# Bộ asset gốc của CookingDual

`kitchen.blend` chứa 13 collection: bánh mì, bốn trạng thái thịt, rau sống/đã cắt, tương ớt, đĩa và bốn chiếc bánh đã ghép. Mở file trong Blender 5.2; bộ bánh đầy đủ và đĩa được bật sẵn. Bật collection khác trong Outliner để xem/sửa từng mẫu.

Được dựng mới cho dự án bằng `scripts/build-assets.py`, không lấy model từ game khác. Các chi tiết vết rạch bánh, hạt vừng, mỡ thịt, vết nướng, gân rau và nhãn ớt là hình học, không cần texture ngoài.

Chạy lại với Blender:

```powershell
& 'C:/Program Files/Blender Foundation/Blender 5.2/blender.exe' --background --python scripts/build-assets.py
```

Script xuất mesh sang `kitchen-meshes.json`, bản nén `.json.gz`, ảnh PNG nền trong suốt để dùng trên phiếu món và file Blender. Game tải mesh qua `src/assets.js`; không cần cài Blender để chơi. Tọa độ Blender Z-up được chuyển sang Three.js Y-up lúc xuất. Các lần chạy script sẽ tạo lại asset từ mã; nếu sửa thủ công file blend, lưu thành file khác để giữ bản chỉnh sửa trước khi chạy lại.

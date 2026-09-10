# Bộ asset gốc của CookingDual

`kitchen.blend` chứa 13 collection: bánh mì, bốn trạng thái thịt, rau sống/đã cắt, tương ớt, đĩa và bốn chiếc bánh đã ghép. Mở file trong Blender 5.2; bộ bánh đầy đủ và đĩa được bật sẵn. Bật collection khác trong Outliner để xem/sửa từng mẫu.

Được dựng mới cho dự án bằng `scripts/build-assets.py`, không lấy model từ game khác. Các chi tiết vết rạch bánh, hạt vừng, mỡ thịt, vết nướng, gân rau và nhãn ớt là hình học, không cần texture ngoài.

Chạy lại với Blender:

```powershell
& 'C:/Program Files/Blender Foundation/Blender 5.2/blender.exe' --background --python scripts/build-assets.py
```

Script xuất mesh sang `kitchen-meshes.json`, bản nén `.json.gz`, ảnh PNG nền trong suốt để dùng trên phiếu món và file Blender. Game tải mesh qua `src/assets.js`; không cần cài Blender để chơi. Tọa độ Blender Z-up được chuyển sang Three.js Y-up lúc xuất. Các lần chạy script sẽ tạo lại asset từ mã; nếu sửa thủ công file blend, lưu thành file khác để giữ bản chỉnh sửa trước khi chạy lại.

## Hai nhân vật mới

`characters.blend` chứa chó vàng áo vá (ragged-dog) và nhân vật xanh (dog-tick), dựng mới theo ảnh tham chiếu của người dùng. File `characters-meshes.json` và bản gzip là tài nguyên game; PNG là ảnh xem trước. Người chơi thứ nhất dùng chó vàng, người thứ hai dùng nhân vật xanh.

```powershell
& 'C:/Program Files/Blender Foundation/Blender 5.2/blender.exe' --background --python scripts/build-characters.py
```

Mô hình có nhóm thân, tay trái/phải và chân trái/phải; pivot được xuất cùng vertex color để game tạo chuyển động. Chó vàng có 12.252 tam giác, nhân vật xanh 9.792 tam giác. Đây là bản low-poly theo hình dáng và trang phục tham chiếu, không dùng lông tóc dạng sợi để giữ nhẹ trên thiết bị di động.

# Hệ Thống IoT Giám Sát Nhiệt Độ, Độ Ẩm, Ánh Sáng & Điều Khiển Thiết Bị

> **Học viện Công nghệ Bưu chính Viễn thông (PTIT)**  
> **Sinh viên thực hiện:** Nguyễn Thành Nam — **MSV:** B23DCCN587
---

## 1. Giới thiệu đề tài

Dự án xây dựng một hệ thống IoT hoàn chỉnh theo mô hình **End-to-End** từ phần cứng (Hardware) đến phần mềm (Web Fullstack):
* **Giám sát môi trường thời gian thực:** Thu thập các chỉ số nhiệt độ (°C), độ ẩm (%), và cường độ ánh sáng (lux) từ các cảm biến vật lý định kỳ 2 giây/lần.
* **Trực quan hóa dữ liệu:** Hiển thị trực tiếp lên giao diện Dashboard gồm các thẻ trạng thái (StatCard) và biểu đồ đường biến thiên thời gian thực (Line Chart).
* **Điều khiển thiết bị từ xa:** Cho phép người dùng bật/tắt 2 đèn LED (`LED_1`, `LED_2`) qua giao diện Web với cơ chế phản hồi trạng thái thật và chống treo lệnh (Timeout 5 giây).
* **Tra cứu và quản lý lịch sử:** Hỗ trợ tìm kiếm, lọc dữ liệu cảm biến đa cấp (theo năm/tháng/ngày/giờ/phút/giây), phân trang và xem lại nhật ký thao tác thiết bị.

### Kiến trúc tổng thể:
```
[ Cảm biến: DHT11, LDR ] 
           │
           ▼
     [ Vi điều khiển ESP32 ]
           │ (Wi-Fi / MQTT Pub-Sub)
           ▼
[ Mosquitto MQTT Broker (Port 8386) ]
           │
           ▼
[ Backend: Node.js Express (RESTful API :3000) ] ◄──► [ Database: MySQL (iot_db) ]
           │ (HTTP REST / Polling 2s)
           ▼
[ Frontend: React + Vite + Recharts (:5173) ]
```

---

## 2. Danh sách phần cứng

| STT | Thiết bị / Linh kiện | Model / Thông số | Số lượng | Vai trò |
|:---:|---|---|:---:|---|
| 1 | **Vi điều khiển ESP32** | NodeMCU ESP-32S (ESP-WROOM-32) | 01 | Bộ xử lý trung tâm, đọc cảm biến, kết nối WiFi & MQTT |
| 2 | **Cảm biến nhiệt độ & độ ẩm** | Module DHT11 (1-Wire Digital) | 01 | Đo nhiệt độ ($0-50^\circ\text{C}$) và độ ẩm ($20-90\%$) |
| 3 | **Cảm biến ánh sáng** | Module Quang trở LDR (Analog Out) | 01 | Đo cường độ ánh sáng môi trường (ADC 12-bit) |
| 4 | **Đèn LED đơn 5mm** | LED Đỏ / Xanh | 02 | Mô phỏng 2 thiết bị điện trong phòng (`LED_1`, `LED_2`) |
| 5 | **Điện trở hạn dòng** | Điện trở cố định $220\Omega$ (hoặc $330\Omega$) | 02 | Hạn dòng bảo vệ chân GPIO của ESP32 khi nối LED |
| 6 | **Testboard cắm mạch** | Breadboard MB-102 (830 lỗ) | 01 | Cố định và kết nối linh kiện |
| 7 | **Dây cắm mạch** | Jumper Wires (Đực - Đực, Đực - Cái) | 1 bộ | Đấu nối tín hiệu và cấp nguồn |
| 8 | **Cáp kết nối** | Cáp Micro-USB | 01 | Cấp nguồn và nạp code cho ESP32 từ máy tính |

---

### Bảng sơ đồ nối chân (Pinout Mapping):

| Linh kiện ngoại vi | Chân trên linh kiện | Chân kết nối ESP32 | Loại tín hiệu | Điện áp |
|---|:---:|:---:|:---:|:---:|
| **Cảm biến DHT11** | VCC (+) | **3V3** | Nguồn dương | 3.3V |
| | GND (-) | **GND** | Mass / Đất | 0V |
| | DATA (Tín hiệu) | **GPIO 4** | Digital I/O | 3.3V |
| **Cảm biến Ánh sáng (LDR)** | VCC | **3V3** | Nguồn dương | 3.3V |
| | GND | **GND** | Mass / Đất | 0V |
| | AO (Analog Out) | **GPIO 34** | Analog Input (ADC1) | 0 - 3.3V |
| **Đèn LED 1 (`LED_1`)** | Anode (+) | **GPIO 12** *(nối tiếp trở $220\Omega$)* | Digital Output | 3.3V |
| | Cathode (-) | **GND** | Mass / Đất | 0V |
| **Đèn LED 2 (`LED_2`)** | Anode (+) | **GPIO 13** *(nối tiếp trở $220\Omega$)* | Digital Output | 3.3V |
| | Cathode (-) | **GND** | Mass / Đất | 0V |

## 3. Hướng dẫn cài đặt & Khởi chạy dự án

### Yêu cầu môi trường:
* **Node.js** (Phiên bản v18 trở lên)
* **MySQL Server** (Khởi chạy trên cổng mặc định `3306`)
* **Eclipse Mosquitto MQTT Broker** (Cổng `8386`)
* **Arduino IDE** (Đã cài ESP32 Board package và các thư viện `PubSubClient`, `DHT sensor library`, `ArduinoJson`)

---

### Bước 1: Khởi tạo Cơ sở dữ liệu (MySQL)
1. Mở **MySQL Workbench** hoặc terminal MySQL.
2. Mở và thực thi file cấu trúc bảng:
   ```bash
   000docs/scripts/schema.sql
   ```
3. Mở và thực thi file dữ liệu mẫu:
   ```bash
   000docs/scripts/seed.sql
   ```

---

### Bước 2: Khởi động MQTT Broker (Mosquitto)
Khởi động Mosquitto với file cấu hình của đồ án:
```bash
mosquitto -c "000docs/mosquitto.conf" -v
```
*(Broker lắng nghe tại cổng `8386`, yêu cầu xác thực user `nguyenthanhnam` / pass `123`).*

---

### Bước 3: Khởi chạy Backend (Node.js)
1. Di chuyển vào thư mục backend:
   ```bash
   cd BTL_IOT/backend
   ```
2. Cài đặt các thư viện phụ thuộc:
   ```bash
   npm install
   ```
3. Cấu hình file `backend/.env` (nếu có thay đổi mật khẩu MySQL/MQTT):
   ```env
   PORT=3000
   DB_HOST=127.0.0.1
   DB_PORT=3306
   DB_USER=root
   DB_PASSWORD=123123
   DB_NAME=iot_db
   MQTT_URL=mqtt://127.0.0.1:8386
   MQTT_USERNAME=nguyenthanhnam
   MQTT_PASSWORD=123
   ```
4. Khởi động máy chủ backend:
   ```bash
   npm run dev
   # Server chạy tại: http://localhost:3000/api
   ```

---

### Bước 4: Khởi chạy Frontend (React Vite)
1. Mở một cửa sổ dòng lệnh mới và di chuyển vào thư mục frontend:
   ```bash
   cd BTL_IOT/frontend
   ```
2. Cài đặt các gói thư viện:
   ```bash
   npm install
   ```
3. Khởi chạy giao diện nhà phát triển:
   ```bash
   npm run dev
   ```
4. Mở trình duyệt và truy cập: **`http://localhost:5173`**

---

### Bước 5: Nạp code phần cứng ESP32
1. Mở file Arduino: `000docs/002_arduino_code/code_iot/code_iot.ino` bằng **Arduino IDE**.
2. Kiểm tra và chỉnh sửa lại tên Wi-Fi & Mật khẩu cùng địa chỉ IP máy tính chạy MQTT Broker:
   ```cpp
   const char* ssid = "Tên_WiFi_Của_Bạn";
   const char* password = "Mat_Khau_WiFi";
   const char* mqtt_server = "192.168.1.X"; // Địa chỉ IPv4 của máy tính chạy Mosquitto
   const int mqtt_port = 8386;
   ```
3. Cắm ESP32 vào máy tính, chọn đúng cổng COM và bấm nút **Upload**.
4. Mở **Serial Monitor** (Baud rate `115200`) để theo dõi ESP32 kết nối WiFi và bắt đầu gửi dữ liệu cảm biến lên hệ thống.

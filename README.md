# IoT_PTIT_Project — Hệ thống Giám sát và Điều khiển Thiết bị qua MQTT

## 1. Giới thiệu

Đây là bài tập lớn môn **IoT (Internet of Things)** — môn học tại **PTIT (Học viện Bưu chính Viễn thông)**.

Hệ thống cho phép **giám sát trực tiếp** 3 chỉ số môi trường (nhiệt độ, độ ẩm, ánh sáng) từ cảm biến vật lý (ESP32 + DHT11 + LDR), hiển thị dữ liệu trên **bảng điều khiển realtime**, đồng thời **điều khiển 2 đèn LED** qua giao thức **MQTT** — tích hợp tất cả trên một ứng dụng web hiện đại.

> **Tác giả:** Nguyễn Thành Nam  
> **Mã số sinh viên:** B23DCCN587  
> **Lớp:** 11  
> **GitHub:** [https://github.com/NamThanh102](https://github.com/NamThanh102)

---

## 2. Tính năng

### Dashboard
- Hiển thị **3 chỉ số sensor realtime** (nhiệt độ °C, độ ẩm %, ánh sáng lux) trên các thẻ màu động (đổi màu theo giá trị).
- **Biểu đồ realtime** (Recharts LineChart) với trục Y đôi — temps/humidity trái, ánh sáng phải.
- Chỉ báo **Live / Sensor Offline** tự động (dựa trên độ mới của dữ liệu).
- **Bảng điều khiển LED 1 & LED 2**: nút ON/OFF, xác nhận trạng thái thật qua MQTT; hiển thị toast “bật thành công” / “thất bại”.
- Mỗi thẻ LED đổi nền xanh lá khi đang ON.

### Dữ liệu cảm biến (DataSensor)
- Bảng phân trang hiển thị toàn bộ mẫu dữ liệu đã lưu.
- **Bộ lọc**: Sensor ID, Loại cảm biến, Giá trị, Khoảng thời gian.
- Mỗi dòng hiển thị đơn vị đúng (°C / % / lux), color-code theo loại sensor.

### Lịch sử điều khiển (ActionHistory)
- Bảng phân trang hiển thị toàn bộ lệnh ON/OFF đã gửi.
- **Bộ lọc**: Sensor ID, Thiết bị, Hành động, Trạng thái, Thời gian.
- Trạng thái hiển thị màu: ON (xanh lá), OFF (viền xám), LOADING (xanh dương + spinner), FAILED (đỏ).

### Profile
- Hiển thị thông tin sinh viên + đường dẫn nhanh đến GitHub, Figma, API Docs, Báo cáo.

---

## 3. Kiến trúc & Luồng dữ liệu

```
┌─────────────────┐      MQTT (topic: sensor_data)      ┌─────────────────────────┐
│    ESP32        │  ──────────────────────────────────►  │      Mosquitto Broker   │
│  DHT11 + LDR   │                                      │       (port 8386)       │
│  LED1 + LED2    │  ◄──────────────────────────────────  │                         │
│                 │      MQTT (topic: device_control)     │                         │
│                 │      MQTT (topic: device_response)    │                         │
└─────────────────┘                                      └───────────┬─────────────┘
                                                                     │
                                    ┌────────────────────────────────┘
                                    │
                     ┌──────────────▼──────────────────────────────┐
                     │              Node.js Backend                │
                     │         Express + mysql2 + mqtt             │
                     │            http://localhost:3000            │
                     │                                             │
                     │  saveSensorSample()  ──► MySQL iot_db       │
                     │  getDeviceStatus()   ◄── MySQL              │
                     │  handleDeviceResponse() ◄── device_response │
                     │  publishDeviceControl() ──► device_control  │
                     └──────────────────────┬──────────────────────┘
                                            │  REST API  /api
                                            │  (proxy từ Vite :5173 → :3000)
                     ┌──────────────────────▼──────────────────────┐
                     │              React Frontend                 │
                     │         Vite + Recharts + Axios             │
                     │           http://localhost:5173             │
                     └─────────────────────────────────────────────┘
```

**Luồng sensor:**  
ESP32 (mỗi 2s) → publish JSON `{device_id, temp, humi, light}` → topic `sensor_data` → Backend subscribes → `saveSensorSample()` → INSERT 3 dòng vào bảng `datasensors`

**Luồng điều khiển LED:**  
Frontend click ON/OFF → POST `/api/device/action` `{device_id, action}` → Backend INSERT dòng `loading` vào bảng `action` → publish `{room_id, led1:'on'}` → topic `device_control` → ESP32 nhận → LED bật/tắt → publish `{led1:'ON'}` → topic `device_response` → Backend INSERT dòng `ON/OFF` (giữ lại dòng `loading`)

**Luồng timeout (ESP32 không phản hồi):**  
Backend chờ `ACTION_TIMEOUT_MS` (5s) → INSERT dòng `FAILED` vào `action` → LED button tự revert OFF trên frontend

---

## 4. Công nghệ

| Lớp | Công nghệ | Phiên bản |
|------|-----------|-----------|
| Vi điều khiển | ESP32 (Arduino framework) + DHT11 + LDR | — |
| MQTT Broker | Mosquitto | 2.x |
| Backend | Node.js + Express + mysql2 + mqtt.js | Node 18+, Express 4.19 |
| Frontend | React 18 + Vite 5 + Recharts + Axios | React 18.3 |
| Database | MySQL | 8.x |
| ORM / Query | Raw SQL + queryBuilder utility | — |
| Design | Figma | — |

---

## 5. Cấu trúc project

```
BTL_IOT/
├── backend/
│   ├── server.js                  # Entry point, Mount routes + MQTT wiring
│   ├── .env                       # Thông tin kết nối (KHÔNG push lên git)
│   ├── config/
│   │   ├── env.js                 # Đọc biến môi trường + fallback
│   │   ├── db.js                  # MySQL connection pool
│   │   └── mqtt.js                # MQTT client + subscribe/publish
│   ├── controllers/
│   │   ├── sensorController.js    # CRUD sensor data + MQTT ingestion
│   │   ├── deviceController.js    # Điều khiển LED + action history + timeout
│   │   └── profileController.js   # Trả về thông tin user
│   ├── models/
│   │   ├── User.js, Sensor.js, Device.js, DataSensor.js, Action.js
│   ├── middleware/
│   │   └── error.middleware.js    # 404 + error handler
│   ├── routes/
│   │   └── api.js                 # Định nghĩa tất cả endpoint
│   └── utils/
│       ├── queryBuilder.js        # SELECT/INSERT/UPDATE builder
│       ├── response.js            # ok() response helper
│       └── timeRange.js           # Parse time range filter
│
├── frontend/
│   ├── index.html
│   ├── vite.config.js             # Proxy /api → localhost:3000
│   ├── public/avatar.jpg          # Avatar Profile
│   └── src/
│       ├── App.jsx                # Routes + React.lazy + Suspense
│       ├── index.js               # ReactDOM + BrowserRouter
│       ├── api/index.js           # Axios client + tất cả API functions
│       ├── hooks/usePolling.js    # Custom hook: polling + cache + refetch
│       ├── components/
│       │   ├── Layout.jsx         # Sidebar + Header + Outlet
│       │   ├── Sidebar.jsx, Header.jsx, Icons.jsx
│       │   ├── StatCard.jsx       # Thẻ chỉ số màu động + progress bar
│       │   ├── StatusBadge.jsx    # Badge ON/OFF/LOADING/FAILED
│       │   ├── ToggleSwitch.jsx   # Nút ON/OFF với loading state
│       │   ├── Toast.jsx          # Thông báo thành công/thất bại
│       │   └── Pagination.jsx     # Phân trang
│       ├── pages/
│       │   ├── Dashboard.jsx      # realtime + chart + device control
│       │   ├── DataSensor.jsx     # bảng sensor data + filter + reload
│       │   ├── ActionHistory.jsx  # bảng action history + filter + reload
│       │   └── Profile.jsx        # thông tin cá nhân
│       └── styles/
│           └── app.css            # Toàn bộ styling
│
├── 000docs/                       # Tài liệu + scripts (giữ riêng, KHÔNG push)
│   ├── scripts/
│   │   ├── schema.sql             # Tạo bảng iot_db
│   │   └── seed.sql               # Dữ liệu mẫu (user, sensor, device, data)
│   ├── hardware/
│   │   └── code_iot2.ino          # Code ESP32 (Arduino)
│   ├── mosquitto.conf             # Cấu hình Mosquitto broker
│   ├── iot_api.postman_collection.json
│   └── figma/                     # Wireframe các trang
│
└── .gitignore
```

---

## 6. Yêu cầu hệ thống

- **Node.js** ≥ 18
- **MySQL Server** ≥ 8 (hoặc XAMPP/WAMP có MySQL 8)
- **Mosquitto** MQTT Broker (port 8386)
- **Arduino IDE** + thư viện: `WiFi`, `PubSubClient`, `DHT sensor library`, `ArduinoJson` (nếu dùng ESP32 vật lý)
- Trình duyệt modern (Chrome/Edge/Firefox)

---

## 7. Hướng dẫn chạy

### 7.1 MySQL — Tạo database & dữ liệu mẫu

```sql
-- Mở MySQL Workbench (hoặc CLI), chạy lần lượt:
SOURCE 000docs/scripts/schema.sql;
SOURCE 000docs/scripts/seed.sql;
```

Kết quả: database `iot_db` với 5 bảng `users`, `sensors`, `devices`, `datasensors`, `action`, chứa sẵn 1 user, 3 sensor, 2 device, 108 mẫu sensor và 11 lịch sử hành động.

### 7.2 Mosquitto — Khởi động MQTT Broker

Sửa nội dung `000docs/mosquitto.conf` cho đúng đường dẫn trên máy, rồi chạy:

```bash
# Linux/macOS
mosquitto -c /path/to/mosquitto.conf -d

# Windows
"C:\Program Files\mosquitto\mosquitto.exe" -c C:\path\to\mosquitto.conf -d
```

Tạo user MQTT (nếu chưa có):

```bash
mosquitto_passwd -c /path/to/passwd nguyenthanhnam
# Nhập password: 123
```

Cấu hình Broker (sửa `000docs/mosquitto.conf`):

```
listener 8386 0.0.0.0
allow_anonymous false
password_file /path/to/passwd
persistence false
```

### 7.3 Backend — Khởi động API server

```bash
cd backend

# Cài dependencies
npm install

# Tạo file .env từ mẫu (xem Section 7.3.1)
# Hoặc copy nội dung .env đã có sẵn

# Chạy dev server (tự reload khi sửa code)
npm run dev
# → http://localhost:3000/api
```

#### 7.3.1 File `.env` (backend/.env)

```ini
PORT=3000

DB_HOST=127.0.0.1
DB_PORT=3306
DB_USER=root
DB_PASSWORD=123123
DB_NAME=iot_db
DB_POOL_SIZE=10

MQTT_URL=mqtt://127.0.0.1:8386
MQTT_USERNAME=nguyenthanhnam
MQTT_PASSWORD=123
MQTT_CLIENT_ID=iot-backend
MQTT_ROOM=room1
ACTION_TIMEOUT_MS=5000

SENSOR_NODE_DEVICE_ID=1
DEFAULT_USER_ID=1
```

> **Lưu ý:** `.env` nằm trong `.gitignore` và **không được push lên GitHub**.

### 7.4 Frontend — Khởi động giao diện

```bash
cd frontend

# Cài dependencies
npm install

# Chạy dev server
npm run dev
# → http://localhost:5173
```

Vite sẽ tự động proxy mọi request `/api/*` sang `http://localhost:3000`.

**Build bản production:**

```bash
npm run build          # → frontend/dist/
npm run preview        # Xem bản build tại http://localhost:4173
```

Để dùng production với backend trên server khác, set biến môi trường trước khi build:

```bash
VITE_API_BASE_URL=https://your-domain.com/api npm run build
```

### 7.5 Kiểm tra nhanh

```bash
# Health check backend
curl http://localhost:3000/health

# Lấy dashboard data
curl http://localhost:3000/api/dashboard

# Điều khiển LED (bật LED 1)
curl -X POST http://localhost:3000/api/device/action \
  -H "Content-Type: application/json" \
  -d '{"device_id":"LED_01","action":"ON"}'
```

---

## 8. API Docs

Base URL: `http://localhost:3000/api`  
Content-Type: `application/json`

> Có thể import file `000docs/iot_api.postman_collection.json` vào Postman để test nhanh.

### 8.1 Health Check

```
GET /health
```

```json
{
  "status": "success",
  "message": "IoT Backend running",
  "uptime": 123.456
}
```

### 8.2 Dashboard (gộp)

```
GET /api/dashboard?limit=30
```

Trả về kết hợp: giá trị mới nhất + N mẫu gần nhất (cho biểu đồ) + trạng thái tất cả thiết bị.

```json
{
  "status": "success",
  "message": "Lay dashboard thanh cong",
  "data": {
    "latest": {
      "id": 324,
      "temperature": 29.5,
      "humidity": 58.8,
      "light": 2700,
      "time": "2026-09-14 09:50:00"
    },
    "chart": [
      {
        "time": "2026-09-14 09:30:00",
        "temperature": 29.6,
        "humidity": 59.6,
        "light": 2500
      }
    ],
    "devices": [
      {
        "device_id": "LED_01",
        "name": "LED 1",
        "state": "ON",
        "last_action": "ON",
        "last_status": "ON",
        "updated_at": "2026-09-14 09:05:00"
      },
      {
        "device_id": "LED_02",
        "name": "LED 2",
        "state": "OFF",
        "last_action": "OFF",
        "last_status": "OFF",
        "updated_at": "2026-09-14 09:15:00"
      }
    ]
  }
}
```

| Param | Kiểu | Mặc định | Mô tả |
|-------|------|----------|-------|
| `limit` | number | 30 | Số mẫu cho chart (max 100) |

---

### 8.3 Dữ liệu cảm biến

#### Lấy mẫu mới nhất

```
GET /api/data/latest
```

```json
{
  "status": "success",
  "data": [
    { "code": "TEMP", "name": "Temperature", "value": 29.5, "time": "2026-09-14 09:50:00" },
    { "code": "HUMI", "name": "Humidity",    "value": 58.8, "time": "2026-09-14 09:50:00" },
    { "code": "LIGHT","name": "Light",       "value": 2700, "time": "2026-09-14 09:50:00" }
  ]
}
```

#### Lấy N mẫu gần nhất (cho biểu đồ)

```
GET /api/data/chart?limit=30
```

#### Lấy toàn bộ dữ liệu (phân trang + lọc)

```
GET /api/data/getall?page=1&limit=10&sensorId=TEMP_A3F8B2C1&type=TEMP&time=2026-09
```

| Param | Kiểu | Mô tả |
|-------|------|-------|
| `page` | number | Trang hiện tại (mặc định 1) |
| `limit` | number | Số dòng/trang (1-100, mặc định 10) |
| `sensorId` | string | Lọc theo sensor UID (VD: `TEMP_A3F8B2C1`) |
| `type` | string | `TEMP`, `HUMI`, hoặc `LIGHT` |
| `value` | string | Lọc chính xác giá trị |
| `time` | string | Khoảng thời gian linh hoạt (VD: `2026-09-14 09`) |

```json
{
  "status": "success",
  "data": [
    {
      "id": 324,
      "sensorID": "TEMP_A3F8B2C1",
      "name": "Temperature",
      "sensorCode": "TEMP",
      "value": 29.5,
      "time": "2026-09-14 09:50:00"
    }
  ],
  "pagination": {
    "current_page": 1,
    "total_pages": 11,
    "total_records": 108
  }
}
```

---

### 8.4 Điều khiển thiết bị

#### Lấy trạng thái thiết bị

```
GET /api/device/status
```

```json
{
  "status": "success",
  "data": [
    { "device_id": "LED_01", "name": "LED 1", "state": "ON",  "last_action": "ON",  "updated_at": "2026-09-14 09:05:00" },
    { "device_id": "LED_02", "name": "LED 2", "state": "OFF", "last_action": "OFF", "updated_at": "2026-09-14 09:15:00" }
  ]
}
```

#### Gửi lệnh ON/OFF

```
POST /api/device/action
```

Body:
```json
{
  "device_id": "LED_01",
  "action": "ON"
}
```

| Field | Kiểu | Giá trị |
|-------|------|---------|
| `device_id` | string | `LED_01` hoặc `LED_02` |
| `action` | string | `ON` hoặc `OFF` |

Trả về (HTTP 202 Accepted):
```json
{
  "status": "success",
  "message": "Lenh dang duoc xu ly",
  "data": {
    "action_id": 325,
    "device_id": "LED_01",
    "requested_action": "ON",
    "current_status": "loading"
  }
}
```

Trạng thái thiết bị sẽ tự cập nhật qua polling: `loading` → `ON` / `OFF` / `FAILED` (timeout 5s).

---

### 8.5 Lịch sử hành động

```
GET /api/device/history?page=1&limit=10&status=ON&deviceId=LED_01&time=2026-09-14
```

| Param | Kiểu | Giá trị |
|-------|------|---------|
| `page` | number | Trang hiện tại |
| `limit` | number | Số dòng/trang |
| `status` | string | `ALL`, `ON`, `OFF`, `LOADING`, `FAILED` |
| `deviceId` | string | `ALL`, `LED_01`, `LED_02` |
| `action` | string | `ALL`, `ON`, `OFF` |
| `time` | string | Khoảng thời gian |

```json
{
  "status": "success",
  "data": [
    {
      "id": 11,
      "device_id": "LED_01",
      "device_name": "LED 1",
      "action": "ON",
      "status": "ON",
      "created_at": "2026-09-14 09:05:00"
    }
  ],
  "pagination": {
    "current_page": 1,
    "total_pages": 2,
    "total_records": 11
  }
}
```

> **Lưu ý:** Trang 1 hiển thị bản ghi **mới nhất** trước.

---

### 8.6 Profile

```
GET /api/profile
```

```json
{
  "status": "success",
  "data": {
    "id": 1,
    "name": "Nguyen Thanh Nam",
    "student_id": "B23DCCN587",
    "class_name": "11",
    "github_link": "https://github.com/NamThanh102",
    "figma_link": "https://www.figma.com/...",
    "apidocs_link": "https://postman.com/...",
    "baocao_link": "https://drive.google.com/..."
  }
}
```

---

## 9. MQTT Topics

| Topic | Chiều | Publisher | Subscriber | Payload mẫu |
|-------|-------|-----------|------------|-------------|
| `sensor_data` | ESP32 → Backend | ESP32 | Backend | `{"device_id":"B23DCCN587","temp":29.5,"humi":58.8,"light":2700}` |
| `device_control` | Backend → ESP32 | Backend | ESP32 | `{"room_id":"room1","led1":"on"}` |
| `device_response` | ESP32 → Backend | ESP32 | Backend | `{"led1":"ON","led2":"OFF"}` |

- `device_id` trong `sensor_data` được dùng làm định danh node sensor.
- `room_id` trong `device_control` là room identifier (cấu hình trong `.env`).
- `led1`/`led2` trong `device_control`: giá trị `"on"` / `"off"` (không phân biệt hoa thường).

---

## 10. Setup thiết bị (ESP32 + Linh kiện)

### 10.1 Danh sách linh kiện

| Linh kiện | Thông số | Ghi chú |
|-----------|----------|---------|
| ESP32 DevKit V1 | WiFi + Bluetooth | Board chính |
| DHT11 | Temperature + Humidity sensor | Kết nối digital |
| LED 1 | Giao diện | Gợi ý: LED đỏ |
| LED 2 | Giao diện | Gợi ý: LED xanh |
| Nភfort 220Ω | Mỗi LED 1 resistor | Bảo vệ LED |
| LDR (Photoresistor) | Analog light sensor | Kết nối ADC |
| Nguồn USB | 5V/2A | Cấp nguồn cho ESP32 |

### 10.2 Sơ đồ chân kết nối

```
ESP32               Component
─────               ─────────
GPIO 4         ◄──► DHT11 DATA (+ pull-up 10kΩ)
GPIO 12        ◄──► LED 1 Anode (qua resistor 220Ω → GND)
GPIO 13        ◄──► LED 2 Anode (qua resistor 220Ω → GND)
GPIO 34 (ADC)  ◄──► LDR voltage divider (LDR → VCC, resistor → GND)
3.3V           ───► DHT11 VCC, LDR
GND            ───► Tất cả GND
```

### 10.3 Code ESP32

File: `000docs/hardware/code_iot2.ino`

**Thư viện cần cài (Arduino Library Manager):**

| Thư viện | Tác giả |
|----------|---------|
| `DHT sensor library` | Adafruit |
| `PubSubClient` | Nick O'Leary |
| `ArduinoJson` | Benoit Blanchon |
| `WiFi` | ESP32 built-in |

**Sửa thông tin kết nối trước khi nạp:**

```cpp
// WiFi — đổi thành WiFi của bạn
const char* ssid = "NamThanh";
const char* password = "66668888";

// MQTT — đổi thành IP & tài khoản Mosquitto của bạn
const char* mqtt_server = "10.246.145.70";
const int mqtt_port = 8386;
const char* mqtt_user = "nguyenthanhnam";
const char* mqtt_pass = "123";
```

> **Lưu ý:** `device_id` trong code là `B23DCCN587` (mã số sinh viên). Nếu dùng MSSV khác, đổi tại dòng `doc["device_id"]`.

### 10.4 Nạp code

1. Mở Arduino IDE → Cài Board Manager: **esp32** by Espressif (v3.x)
2. Chọn board: **Tools → Board → ESP32 Arduino → ESP32 Dev Module**
3. Chọn port USB tương ứng
4. Upload code

### 10.5 Kiểm tra hoạt động

1. Mở **Serial Monitor** (115200 baud) — xem log WiFi + MQTT kết nối
2. Truy cập `http://localhost:5173/dashboard` — dữ liệu sensor sẽ xuất hiện sau 2 giây
3. Click nút ON/OFF trên dashboard → đèn LED vật lý trên ESP32 sáng/tắt
4. Kiểm tra `ActionHistory` trên web — trạng thái `ON` / `OFF` hiển thị đúng

---

## 11. Ghi chú

- **Bảo mật:** File `.env` chứa thông tin database/MQTT đã bị `.gitignore`. Không push `.env` lên GitHub.
- **Dữ liệu ảo:** `000docs/scripts/seed.sql` chứa 108 mẫu sensor và 11 lệnh điều khiển mẫu để demo ngay mà không cần ESP32 vật lý.
- **Polling interval:** Dashboard 2s, DataSensor 3s, ActionHistory 3s. Tab bị ẩn tự暂停 để giảm tải.
- **MQTT Timeout:** Nếu ESP32 không phản hồi trong 5s → trạng thái chuyển thành `FAILED`.
- **Postman:** Import `000docs/iot_api.postman_collection.json` để test nhanh tất cả API.

---

**© 2026 — Nguyen Thanh Nam — B23DCCN587 — PTIT**

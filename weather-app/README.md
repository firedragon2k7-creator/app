# SkyLens — Ứng dụng dự báo thời tiết

## Chạy nhanh (local)

```
weather-app/
├── index.html
├── assets/
│   ├── css/style.css
│   └── js/main.js
└── README.md
```

Chỉ cần mở `index.html` trong trình duyệt — không cần server, không cần cài gì thêm.

1. Nhấn ⚙️ (góc trên phải) → dán API Key OpenWeatherMap
2. Key được lưu vào `localStorage` của trình duyệt
3. Nhập thành phố và tìm kiếm

---

## Tính năng

| Tính năng | Mô tả |
|---|---|
| Tìm kiếm thành phố | Nhiệt độ, độ ẩm, gió, tầm nhìn |
| Định vị GPS | Tự động lấy vị trí hiện tại |
| Dự báo 5 ngày | High/low mỗi ngày |
| Lịch sử tìm kiếm | Lưu 8 lần tìm gần nhất |
| So sánh 2 thành phố | Đặt cạnh nhau, highlight thành phố mát hơn |
| Biểu đồ nhiệt độ | Line chart 5 ngày bằng Chart.js |

---

## Bảo mật API Key

### Vấn đề hiện tại
Ứng dụng chạy thuần frontend → API Key nằm trong `localStorage` của trình duyệt.
Nếu ai mở DevTools họ có thể thấy key. **Không push key lên GitHub.**

---

### Phương án 1 — Dùng file `.env` + Netlify Functions (Đơn giản nhất)

**Bước 1:** Tạo file `netlify/functions/weather.js`:

```js
// netlify/functions/weather.js
exports.handler = async (event) => {
  const { city, lat, lon, type } = event.queryStringParameters;
  const KEY = process.env.OWM_KEY; // lấy từ biến môi trường, không bao giờ lộ ra ngoài

  let url;
  if (type === 'forecast') {
    url = lat
      ? `https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lon}&appid=${KEY}&units=metric&lang=vi`
      : `https://api.openweathermap.org/data/2.5/forecast?q=${city}&appid=${KEY}&units=metric&lang=vi`;
  } else {
    url = lat
      ? `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${KEY}&units=metric&lang=vi`
      : `https://api.openweathermap.org/data/2.5/weather?q=${city}&appid=${KEY}&units=metric&lang=vi`;
  }

  const res  = await fetch(url);
  const data = await res.json();

  return {
    statusCode: 200,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  };
};
```

**Bước 2:** Trong Netlify dashboard → Site settings → Environment variables:
```
OWM_KEY = your_actual_api_key_here
```

**Bước 3:** Cập nhật `main.js` — đổi BASE_URL:
```js
// Thay vì gọi thẳng OpenWeatherMap:
const BASE_URL = 'https://api.openweathermap.org/data/2.5';

// Gọi qua Netlify Function (key ẩn trên server):
const BASE_URL = '/.netlify/functions/weather';

// Và cập nhật hàm fetch:
async function getCurrentWeather(cityName) {
  const res  = await fetch(`${BASE_URL}?city=${encodeURIComponent(cityName)}&type=current`);
  const data = await res.json();
  if (data.cod && data.cod !== 200) throw new Error(data.message);
  return data;
}
```

**Bước 4:** Tạo `.gitignore`:
```
.env
.env.local
node_modules/
```

---

### Phương án 2 — Node.js + Express Backend

Phù hợp nếu bạn muốn học backend hoặc deploy lên VPS/Railway.

**Cài đặt:**
```bash
npm init -y
npm install express node-fetch dotenv cors
```

**Tạo `server.js`:**
```js
import 'dotenv/config';
import express from 'express';
import fetch   from 'node-fetch';
import cors    from 'cors';

const app = express();
app.use(cors());
app.use(express.static('.')); // serve index.html

const KEY = process.env.OWM_KEY;

app.get('/api/weather', async (req, res) => {
  const { city, lat, lon, type = 'current' } = req.query;
  const endpoint = type === 'forecast' ? 'forecast' : 'weather';

  let url = `https://api.openweathermap.org/data/2.5/${endpoint}?appid=${KEY}&units=metric&lang=vi`;
  if (city) url += `&q=${encodeURIComponent(city)}`;
  if (lat)  url += `&lat=${lat}&lon=${lon}`;

  try {
    const data = await fetch(url).then(r => r.json());
    res.json(data);
  } catch (e) {
    res.status(500).json({ message: 'Server error' });
  }
});

app.listen(3000, () => console.log('SkyLens running at http://localhost:3000'));
```

**Tạo `.env`:**
```
OWM_KEY=your_actual_api_key_here
```

**Chạy:**
```bash
node server.js
```

**Cập nhật `main.js`:**
```js
const BASE_URL = 'http://localhost:3000/api/weather';

async function getCurrentWeather(cityName) {
  const res  = await fetch(`${BASE_URL}?city=${encodeURIComponent(cityName)}&type=current`);
  const data = await res.json();
  if (data.cod && data.cod !== 200) throw new Error(data.message);
  return data;
}
```

---

### Phương án 3 — GitHub Actions Secret (Nếu deploy tĩnh)

Nếu bạn dùng GitHub Pages, dùng secret trong Actions:

```yaml
# .github/workflows/deploy.yml
- name: Inject API Key
  run: |
    sed -i "s/YOUR_API_KEY_PLACEHOLDER/${{ secrets.OWM_KEY }}/g" assets/js/main.js
```

Trong `main.js` đặt placeholder:
```js
const API_KEY = 'YOUR_API_KEY_PLACEHOLDER';
```

---

## Tổng kết lựa chọn bảo mật

| Phương án | Độ khó | Phù hợp khi |
|---|---|---|
| Netlify Functions | ⭐⭐ | Deploy nhanh, không cần server riêng |
| Node.js Express | ⭐⭐⭐ | Học backend, có VPS |
| GitHub Actions | ⭐⭐ | Dùng GitHub Pages, app tĩnh |
| localStorage (hiện tại) | ⭐ | Chỉ dùng local, không push lên mạng |

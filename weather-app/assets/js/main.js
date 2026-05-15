/* ────────────────────────────────────────────────
   SkyLens — main.js
   ──────────────────────────────────────────────── */

const BASE_URL = 'https://api.openweathermap.org/data/2.5';
const GEO_URL = 'https://api.openweathermap.org/geo/1.0/direct';
const FIXED_API_KEY = '797acd83fae0ee28a0438aa86dc03742';

const WEATHER_ICONS = {
  clear: '☀️', clouds: '☁️', rain: '🌧️', drizzle: '🌦️',
  thunderstorm: '⛈️', snow: '❄️', mist: '🌫️', fog: '🌫️',
  haze: '🌫️', smoke: '🌫️', dust: '🌪️', tornado: '🌪️',
};
function updateDynamicBackground(weatherMain) {
  const body = document.body;
  const weather = (weatherMain || '').toLowerCase();
  const backgrounds = {
    clear: 'https://images.unsplash.com/photo-1504608524841-42fe6f032b4b?q=80&w=1920&auto=format&fit=crop',
    clouds: 'https://images.unsplash.com/photo-1534088568595-a066f410bcda?q=80&w=1920&auto=format&fit=crop',
    rain: 'https://images.unsplash.com/photo-1519692938311-5870636f4068?q=80&w=1920&auto=format&fit=crop',
    drizzle: 'https://images.unsplash.com/photo-1541675154750-0444c7d51e8e?q=80&w=1920&auto=format&fit=crop',
    thunderstorm: 'https://images.unsplash.com/photo-1605727282302-149f66aabc3a?q=80&w=1920&auto=format&fit=crop',
    snow: 'https://images.unsplash.com/photo-1478265409131-1f65c88f965c?q=80&w=1920&auto=format&fit=crop',
    mist: 'https://images.unsplash.com/photo-1485236715598-c8879a098917?q=80&w=1920&auto=format&fit=crop',
    haze: 'https://images.unsplash.com/photo-1522163182402-834f871fd851?q=80&w=1920&auto=format&fit=crop',
    smoke: 'https://images.unsplash.com/photo-1533313018115-d8134017a6f0?q=80&w=1920&auto=format&fit=crop'
  };
  const bgUrl = backgrounds[weather] || backgrounds['clear'];
  body.style.backgroundImage = `linear-gradient(rgba(0, 0, 0, 0.4), rgba(0, 0, 0, 0.4)), url('${bgUrl}')`;
}

const DAYS_SHORT = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];
const MONTHS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];

let ALL_PROVINCES = []; // Lưu object gốc từ API (có code)
let DYNAMIC_VN_CITIES = []; // Chỉ lưu tên hiển thị
let LAST_FOCUSED_COMPARE_INPUT = null; // Theo dõi ô input nào đang được focus trong tab So sánh
let map, marker;

/* ── 1. Helpers ── */
function getApiKey() {
  return FIXED_API_KEY;
}

function getIcon(mainStr) {
  return WEATHER_ICONS[(mainStr || '').toLowerCase()] || '🌡️';
}

function formatDate(d) {
  return `${DAYS_SHORT[d.getDay()]} ${d.getDate()}/${MONTHS[d.getMonth()]}`;
}

function kmh(ms) {
  return Math.round(ms * 3.6);
}

function showError(msg) {
  const el = document.getElementById('errorMsg');
  if (el) {
    el.textContent = msg;
    el.style.display = 'block';
  }
}

function hideError() {
  const el = document.getElementById('errorMsg');
  if (el) el.style.display = 'none';
}

/* ── 2. API Functions ── */

async function getCoordsBySearch(query) {
  const url = `${GEO_URL}?q=${encodeURIComponent(query)}&limit=1&appid=${getApiKey()}`;
  const res = await fetch(url);
  const data = await res.json();
  if (data && data.length > 0) return {lat: data[0].lat, lon: data[0].lon, name: data[0].name};
  return null;
}

async function getWeatherByCoords(lat, lon) {
  const url = `${BASE_URL}/weather?lat=${lat}&lon=${lon}&appid=${getApiKey()}&units=metric&lang=vi`;
  const res = await fetch(url);
  return await res.json();
}

async function getForecastByCoords(lat, lon) {
  const url = `${BASE_URL}/forecast?lat=${lat}&lon=${lon}&appid=${getApiKey()}&units=metric&lang=vi`;
  const res = await fetch(url);
  return await res.json();
}

async function getCurrentWeather(cityName) {
  const url = `${BASE_URL}/weather?q=${encodeURIComponent(cityName)}&appid=${getApiKey()}&units=metric&lang=vi`;
  const res = await fetch(url);
  return await res.json();
}
async function handleLocationClick() {
  if (!navigator.geolocation) {
    showError("Trình duyệt của bạn không hỗ trợ định vị.");
    return;
  }
  async function getWeatherByCoords(lat, lon) {
    const url = `${BASE_URL}/weather?lat=${lat}&lon=${lon}&appid=${getApiKey()}&units=metric&lang=vi`;
    const res = await fetch(url);
    if (!res.ok) throw new Error('Không thể lấy dữ liệu thời tiết.');
    return await res.json();
  }

  async function getForecastByCoords(lat, lon) {
    const url = `${BASE_URL}/forecast?lat=${lat}&lon=${lon}&appid=${getApiKey()}&units=metric&lang=vi`;
    const res = await fetch(url);
    if (!res.ok) throw new Error('Không thể lấy dữ liệu dự báo.');
    return await res.json();
  }
  // Hiệu ứng chờ trên nút
  const locateBtn = document.getElementById('locateBtn');
  locateBtn.style.opacity = "0.5";
  locateBtn.disabled = true;

  navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        hideError();

        try {
          const [current, forecast] = await Promise.all([
            getWeatherByCoords(latitude, longitude),
            getForecastByCoords(latitude, longitude)
          ]);

          renderCurrentWeather(current);
          renderForecast(forecast);
          addToHistory(current.name);
        } catch (err) {
          showError("Lỗi kết nối API khi định vị.");
        } finally {
          locateBtn.style.opacity = "1";
          locateBtn.disabled = false;
        }
      },
      (error) => {
        locateBtn.style.opacity = "1";
        locateBtn.disabled = false;
        let msg = "Không thể lấy vị trí của bạn.";
        if (error.code === 1) msg = "Vui lòng cho phép quyền truy cập vị trí.";
        showError(msg);
      }
  );
}
function renderHourlyForecast(list) {
  const container = document.getElementById('hourlyList');
  if (!container) return;

  // Lấy 8 mốc thời gian đầu tiên (tương đương 24 giờ)
  const hourlyData = list.slice(0, 8);

  container.innerHTML = hourlyData.map(item => {
    const date = new Date(item.dt * 1000);
    const hours = date.getHours().toString().padStart(2, '0');
    const icon = getIcon(item.weather[0].main);
    const temp = Math.round(item.main.temp);

    return `
      <div class="hourly-item">
        <span class="hourly-time">${hours}:00</span>
        <span class="hourly-icon">${icon}</span>
        <span class="hourly-temp">${temp}°</span>
      </div>
    `;
  }).join('');
}

/* ── 3. Search & Forecast Logic ── */

async function doSearch(cityName) {
  if (!cityName.trim()) return;
  hideError();
  document.getElementById('weatherCard').style.display = 'none';
  document.getElementById('forecastRow').style.display = 'none';

  try {
    let coords = await getCoordsBySearch(cityName);
    if (!coords && !cityName.toLowerCase().includes('vn')) {
      coords = await getCoordsBySearch(cityName + ', VN');
    }
    if (!coords) throw new Error('Không tìm thấy vị trí.');

    const [current, forecast] = await Promise.all([
      getWeatherByCoords(coords.lat, coords.lon),
      getForecastByCoords(coords.lat, coords.lon)
    ]);

    renderCurrentWeather(current);
    renderForecast(forecast);
    addToHistory(current.name);
  } catch (err) {
    showError(err.message);
  }
}

function renderCurrentWeather(data) {
  document.getElementById('cityLabel').textContent = `${data.name}, ${data.sys.country}`;
  document.getElementById('dateLabel').textContent = formatDate(new Date());
  document.getElementById('tempBig').textContent = `${Math.round(data.main.temp)}°C`;
  document.getElementById('descLabel').textContent = data.weather[0].description;
  document.getElementById('weatherEmoji').textContent = getIcon(data.weather[0].main);
  document.getElementById('statHumidity').textContent = `${data.main.humidity}%`;
  document.getElementById('statWind').textContent = `${kmh(data.wind.speed)} km/h`;
  document.getElementById('statFeels').textContent = `${Math.round(data.main.feels_like)}°C`;
  document.getElementById('statVis').textContent = `${(data.visibility / 1000).toFixed(1)} km`;
  document.getElementById('weatherCard').style.display = 'block';
  document.getElementById('weatherCard').style.display = 'block';
  updateMap(data.coord.lat, data.coord.lon, data.name, data.main.temp, data.weather[0].main);

  updateMap(data.coord.lat, data.coord.lon, data.name, data.main.temp, data.weather[0].main);
  updateDynamicBackground(data.weather[0].main);
}

function renderForecast(data) {
  // 1. Gọi hàm hiển thị theo giờ (Hourly) đã hướng dẫn ở bước trước
  if (typeof renderHourlyForecast === "function") {
    renderHourlyForecast(data.list);
  }

  const row = document.getElementById('forecastRow');
  if (!row) return;

  // 2. Gom nhóm dữ liệu theo ngày
  const daily = {};
  data.list.forEach(item => {
    const key = new Date(item.dt * 1000).toDateString();
    if (!daily[key]) daily[key] = [];
    daily[key].push(item);
  });

  // 3. Hiển thị dự báo 5 ngày tiếp theo
  // slice(1, 6) để bỏ qua ngày hiện tại và lấy 5 ngày tới
  row.innerHTML = Object.values(daily).slice(1, 6).map(items => {
    // Tìm mốc 12h trưa để lấy icon đại diện cho ngày đó
    const noon = items.find(i => new Date(i.dt * 1000).getHours() === 12) || items[0];

    // Tính nhiệt độ Cao nhất (Hi) và Thấp nhất (Lo) trong ngày đó
    const hi = Math.round(Math.max(...items.map(i => i.main.temp_max)));
    const lo = Math.round(Math.min(...items.map(i => i.main.temp_min)));

    const d = new Date(noon.dt * 1000);

    return `
      <div class="fc-card">
        <div class="fc-day">${DAYS_SHORT[d.getDay()]}</div>
        <div class="fc-date">${d.getDate()}/${MONTHS[d.getMonth()]}</div>
        <div class="fc-emoji">${getIcon(noon.weather[0].main)}</div>
        <div class="fc-temp-range">
          <span class="fc-hi">${hi}°</span>
          <span class="fc-lo">${lo}°</span>
        </div>
      </div>`;
  }).join('');

  row.style.display = 'grid';
}

/* ── 4. Provinces List Module ── */

async function initQuickCities() {
  try {
    const res = await fetch('https://provinces.open-api.vn/api/p/');
    const data = await res.json();
    ALL_PROVINCES = data; // Keep full province data if needed later
    DYNAMIC_VN_CITIES = data.map(p => ({
      name: p.name.replace(/^(Tỉnh|Thành phố)\s+/i, ''),
      code: p.code // Keep code if needed for other API calls
    }));
    renderAllQuickLists();
  } catch (e) {
    // Fallback nếu API lỗi
    DYNAMIC_VN_CITIES = [{name: 'Hà Nội', code: ''}, {name: 'Hồ Chí Minh', code: ''}, {
      name: 'Đà Nẵng',
      code: ''
    }, {name: 'Hải Phòng', code: ''}, {name: 'Cần Thơ', code: ''}];
    renderAllQuickLists();
  }
}

function renderAllQuickLists(filterText = "") {
  const containers = document.querySelectorAll('.quick-cities');
  containers.forEach(container => renderQuickList(container, filterText));
}

function renderQuickList(container, filterText = "") {
  const filtered = DYNAMIC_VN_CITIES.filter(city =>
      city.name.toLowerCase().includes(filterText.toLowerCase())
  );

  const type = container.dataset.type;
  const isCompareTab = type === 'compare';

  container.innerHTML = filtered.map(city => `
    <div class="city-tag province-item" data-city="${city.name}" data-code="${city.code}">
      <span class="tag-name">${city.name}</span>
      ${isCompareTab ? '' : '<div class="tag-info"><span class="tag-temp">—°</span><span class="tag-emoji">⌛</span></div>'}
    </div>
  `).join('');

  container.querySelectorAll('.province-item').forEach(tag => {
    tag.addEventListener('click', () => {
      const cityName = tag.dataset.city;
      handleCitySelection(cityName, type);

      // Ẩn danh sách sau khi chọn cho tất cả các tab
      const parentContainer = container.closest('.quick-cities-container');
      if (parentContainer) parentContainer.style.display = 'none';
    });
  });

  // Load weather for Search and Chart tabs (not for Compare)
  if (!isCompareTab) {
    filtered.slice(0, 5).forEach(async (city) => {
      try {
        const data = await getCurrentWeather(city.name);
        container.querySelectorAll(`.city-tag[data-city="${city.name}"]`).forEach(tag => {
          const tempEl = tag.querySelector('.tag-temp');
          const emojiEl = tag.querySelector('.tag-emoji');
          if (tempEl) tempEl.textContent = `${Math.round(data.main.temp)}°`;
          if (emojiEl) emojiEl.textContent = getIcon(data.weather[0].main);
        });
      } catch (e) {
      }
    });
  }
}

function handleCitySelection(cityName, type) {
  if (type === 'search') {
    document.getElementById('cityInput').value = cityName;
    doSearch(cityName);
  } else if (type === 'compare') {
    const inputA = document.getElementById('cityA');
    const inputB = document.getElementById('cityB');
    if (LAST_FOCUSED_COMPARE_INPUT === 'cityB') {
      inputB.value = cityName;
    } else {
      inputA.value = cityName;
    }
  } else if (type === 'chart') {
    document.getElementById('chartCity').value = cityName;
    document.getElementById('chartBtn').click();
  }
}

/* ── 5. Compare Module ── */

document.getElementById('compareBtn')?.addEventListener('click', async () => {
  const a = document.getElementById('cityA').value.trim();
  const b = document.getElementById('cityB').value.trim();
  if (!a || !b) {
    alert('Vui lòng chọn 2 tỉnh.');
    return;
  }
  const resultEl = document.getElementById('compareResult');
  resultEl.style.display = 'none';

  try {
    const [dA, dB] = await Promise.all([getCurrentWeather(a), getCurrentWeather(b)]);
    const winnerIdx = dA.main.temp <= dB.main.temp ? 0 : 1;
    resultEl.innerHTML = [dA, dB].map((d, i) => `
      <div class="cmp-card ${i === winnerIdx ? 'winner' : ''}">
        <div class="cmp-city">${d.name}</div>
        <div class="cmp-temp">${Math.round(d.main.temp)}°C</div>
        <div class="cmp-row"><span>Độ ẩm</span><span>${d.main.humidity}%</span></div>
        <div class="cmp-row"><span>Gió</span><span>${kmh(d.wind.speed)} km/h</span></div>
        ${i === winnerIdx ? '<div class="winner-badge">🌿 Mát hơn</div>' : ''}
      </div>`).join('');
    resultEl.style.display = 'grid';
  } catch (e) {
    alert(e.message);
  }
});

/* ── 6. Chart Module ── */

let chartInstance = null;
document.getElementById('chartBtn')?.addEventListener('click', async () => {
  const city = document.getElementById('chartCity').value.trim();
  if (!city) return;
  try {
    const coords = await getCoordsBySearch(city);
    if (!coords) throw new Error('Không tìm thấy vị trí.');
    const data = await getForecastByCoords(coords.lat, coords.lon);
    renderTempChart(city, data);
  } catch (e) {
    alert(e.message);
  }
});

function renderTempChart(city, forecastData) {
  const daily = {};
  forecastData.list.forEach(item => {
    const key = new Date(item.dt * 1000).toLocaleDateString();
    if (!daily[key]) daily[key] = {temps: [], day: new Date(item.dt * 1000)};
    daily[key].temps.push(item.main.temp);
  });

  const labels = [], highs = [], lows = [];
  Object.values(daily).slice(0, 6).forEach(v => {
    labels.push(`${DAYS_SHORT[v.day.getDay()]} ${v.day.getDate()}/${v.day.getMonth() + 1}`);
    highs.push(Math.max(...v.temps));
    lows.push(Math.min(...v.temps));
  });

  document.getElementById('chartTitle').textContent = `Nhiệt độ — ${city}`;
  document.getElementById('chartContainer').style.display = 'block';
  const ctx = document.getElementById('tempChart').getContext('2d');
  if (chartInstance) chartInstance.destroy();
  chartInstance = new Chart(ctx, {
    type: 'line',
    data: {
      labels,
      datasets: [
        {label: 'Cao nhất', data: highs, borderColor: '#f97316', tension: 0.4},
        {label: 'Thấp nhất', data: lows, borderColor: '#38bdf8', tension: 0.4}
      ]
    },
    options: {
      // ... các cấu hình khác ...
      scales: {
        y: {
          // Chỉnh đường trục tung (Y)
          border: {
            display: true,
            color: '#ffffff', // Màu trục trắng rõ nét
            width: 2          // Độ dày trục
          },
          grid: {
            // Đường lưới ngang (nếu muốn mờ thì để opacity thấp, muốn đậm thì tăng lên)
            color: 'rgba(255, 255, 255, 0.1)',
          },
          ticks: {
            color: '#ffffff', // Màu chữ số trục Y đậm hơn
            font: {
              weight: 'bold'  // Chữ đậm
            }
          }
        },
        x: {
          // Chỉnh đường trục hoành (X)
          border: {
            display: true,
            color: '#ffffff', // Màu trục trắng rõ nét
            width: 2          // Độ dày trục
          },
          grid: {
            display: false    // Trục X thường ẩn lưới dọc sẽ đẹp hơn
          },
          ticks: {
            color: '#ffffff', // Màu chữ số trục X đậm hơn
            font: {
              weight: 'bold'
            }
          }
        }
      }
    }
  });
}

/* ── 7. Map Module (Leaflet với nhãn thông số đặt bên cạnh) ── */

function initMap() {
  if (map) return;

  // 1. Lớp bản đồ nền (Các con đường, địa danh)
  const baseLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap'
  });

  // 2. Các lớp thời tiết từ OpenWeatherMap
  const apiKey = getApiKey();
  const clouds = L.tileLayer(`https://tile.openweathermap.org/map/clouds_new/{z}/{x}/{y}.png?appid=${apiKey}`, { opacity: 0.7 });
  const rain = L.tileLayer(`https://tile.openweathermap.org/map/precipitation_new/{z}/{x}/{y}.png?appid=${apiKey}`, { opacity: 0.7 });
  const temp = L.tileLayer(`https://tile.openweathermap.org/map/temp_new/{z}/{x}/{y}.png?appid=${apiKey}`, { opacity: 0.7 });

  // 3. Khởi tạo bản đồ với lớp nền và lớp mây mặc định
  map = L.map('map', {
    zoomControl: false,
    layers: [baseLayer, clouds]
  }).setView([21.0285, 105.8542], 10);

  // 4. Tự động tạo nút chọn lớp (Không cần sửa HTML)
  const weatherLayers = {
    "<span style='color: #000'>☁️ Đám mây</span>": clouds,
    "<span style='color: #000'>🌧️ Lượng mưa</span>": rain,
    "<span style='color: #000'>🌡️ Nhiệt độ</span>": temp
  };

  // Thêm nút điều khiển vào góc trên bên phải bản đồ
  L.control.layers(null, weatherLayers, { collapsed: true }).addTo(map);

  if (marker) marker.addTo(map);
}

function updateMap(lat, lon, title, temp, weatherMain) {
  document.getElementById('map').style.display = 'block';
  if (!map) initMap();

  const pos = [lat, lon];
  map.setView(pos, 11);

  if (marker) map.removeLayer(marker);

  const customIcon = L.divIcon({
    html: `
      <div class="map-weather-label">
        <span class="tag-emoji">${getIcon(weatherMain)}</span>
        <span class="map-weather-temp">${Math.round(temp)}°C</span>
        <span class="map-weather-city">${title}</span>
      </div>
    `,
    className: '',
    iconSize: [0, 0],
    iconAnchor: [0, 20]
  });

  marker = L.marker(pos, {icon: customIcon}).addTo(map);

  setTimeout(() => map.invalidateSize(), 200);
}

/* ── 8. Events ── */
document.getElementById('searchBtn')?.addEventListener('click', () => doSearch(document.getElementById('cityInput').value));
document.getElementById('locateBtn')?.addEventListener('click', handleLocationClick);
const setupFilter = (inputId, containerId) => {
  const input = document.getElementById(inputId);
  const container = document.getElementById(containerId);
  if (!input || !container) return;

  input.addEventListener('input', (e) => {
    const val = e.target.value;
    const list = container.querySelector('.quick-cities');
    renderQuickList(list, val); // Always render provinces
    container.style.display = 'block';
  });
  input.addEventListener('focus', () => {
    if (inputId === 'cityA' || inputId === 'cityB') LAST_FOCUSED_COMPARE_INPUT = inputId;
    const list = container.querySelector('.quick-cities');
    renderQuickList(list); // Render full list of provinces on focus
    container.style.display = 'block';
  });
};

setupFilter('cityInput', 'container-search');
setupFilter('cityA', 'container-compare');
setupFilter('cityB', 'container-compare');
setupFilter('chartCity', 'container-chart');

document.querySelectorAll('.tab').forEach(tab => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
    tab.classList.add('active');
    document.getElementById(`tab-${tab.dataset.tab}`).classList.add('active');
    renderAllQuickLists(); // Re-render quick lists for the newly active tab
  });
});

document.addEventListener('DOMContentLoaded', () => {
  initQuickCities();
  initMap();
  renderHistory();
});

// History Logic (Simplified)
function addToHistory(name) {
  let h = JSON.parse(localStorage.getItem('search_history') || '[]');
  h = h.filter(c => c !== name);
  h.unshift(name);
  localStorage.setItem('search_history', JSON.stringify(h.slice(0, 8)));
  renderHistory();
}

function renderHistory() {
  const list = document.getElementById('historyList');
  const section = document.getElementById('historySection');
  const h = JSON.parse(localStorage.getItem('search_history') || '[]');
  if (!list || !section) return;
  if (!h.length) {
    section.style.display = 'none';
    return;
  }
  section.style.display = 'block';
  list.innerHTML = h.map(c => `<button class="history-chip">${c}</button>`).join('');
  list.querySelectorAll('.history-chip').forEach(btn => {
    btn.addEventListener('click', () => {
      document.getElementById('cityInput').value = btn.textContent;
      doSearch(btn.textContent);
    });
  });
}
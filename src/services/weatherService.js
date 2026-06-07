const API_KEY = 'd4ce58291563d75e99b7ef190f9b155b';
const BANDIRMA_LAT = 40.3522;
const BANDIRMA_LON = 27.9767;

const CACHE_DURATION_MS = 5 * 60 * 1000;

let currentWeatherCache = null;
let currentWeatherCacheTime = 0;

let forecastCache = null;
let forecastCacheTime = 0;

function isCacheValid(cacheTime) {
  return Date.now() - cacheTime < CACHE_DURATION_MS;
}

async function fetchWithTimeout(url, timeoutMs = 8000) {
  return Promise.race([
    fetch(url),

    new Promise((_, reject) => {
      setTimeout(() => {
        reject(new Error("Hava durumu isteği zaman aşımına uğradı."));
      }, timeoutMs);
    }),
  ]);
}

export async function getBandirmaWeather() {
  if (currentWeatherCache && isCacheValid(currentWeatherCacheTime)) {
    return currentWeatherCache;
  }

  const url =
    `https://api.openweathermap.org/data/2.5/weather` +
    `?lat=${BANDIRMA_LAT}` +
    `&lon=${BANDIRMA_LON}` +
    `&appid=${API_KEY}` +
    `&units=metric` +
    `&lang=tr`;

  const response = await fetchWithTimeout(url);

  if (!response.ok) {
    throw new Error("Güncel hava durumu verisi alınamadı.");
  }

  const data = await response.json();

  currentWeatherCache = data;
  currentWeatherCacheTime = Date.now();

  return data;
}

export async function getBandirmaForecast() {
  if (forecastCache && isCacheValid(forecastCacheTime)) {
    return forecastCache;
  }

  const url =
    `https://api.openweathermap.org/data/2.5/forecast` +
    `?lat=${BANDIRMA_LAT}` +
    `&lon=${BANDIRMA_LON}` +
    `&appid=${API_KEY}` +
    `&units=metric` +
    `&lang=tr`;

  const response = await fetchWithTimeout(url);

  if (!response.ok) {
    throw new Error("5 günlük tahmin verisi alınamadı.");
  }

  const data = await response.json();

  if (!data.list || !Array.isArray(data.list)) {
    throw new Error("Tahmin verisi formatı beklenenden farklı.");
  }

  const simplifiedForecast = simplifyForecast(data.list);

  forecastCache = simplifiedForecast;
  forecastCacheTime = Date.now();

  return simplifiedForecast;
}

function simplifyForecast(list) {
  const dailyMap = {};

  for (const item of list) {
    const date = item.dt_txt?.split(" ")[0];
    const time = item.dt_txt?.split(" ")[1];

    if (!date) {
      continue;
    }

    if (!dailyMap[date]) {
      dailyMap[date] = item;
    }

    if (time === "12:00:00") {
      dailyMap[date] = item;
    }
  }

  return Object.values(dailyMap)
    .slice(0, 5)
    .map((item) => ({
      date: item.dt_txt,
      temp: Math.round(item.main.temp),
      tempMin: Math.round(item.main.temp_min),
      tempMax: Math.round(item.main.temp_max),
      description: item.weather?.[0]?.description || "",
      main: item.weather?.[0]?.main || "",
    }));
}
import type { WeatherData } from "./hydration";

const API_KEY = import.meta.env.VITE_WEATHER_API_KEY || "fa1a86bf8d3d3f0c3a097ec917840d69";
const CACHE_TTL_MS = 15 * 60 * 1000; // 15 minutes

interface CachedItem {
  timestamp: number;
  data: WeatherData;
}

function getCache(key: string): WeatherData | null {
  try {
    const raw = localStorage.getItem("hydrosmart_weather_cache");
    if (!raw) return null;
    const cache = JSON.parse(raw) as Record<string, CachedItem>;
    const cached = cache[key.toLowerCase()];
    if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
      console.log(`HydroSmart: Using cached weather for key "${key}"`);
      return cached.data;
    }
  } catch (e) {
    console.warn("Failed to parse weather cache:", e);
  }
  return null;
}

function setCache(key: string, data: WeatherData) {
  try {
    const raw = localStorage.getItem("hydrosmart_weather_cache");
    const cache = raw ? JSON.parse(raw) : {};
    cache[key.toLowerCase()] = {
      timestamp: Date.now(),
      data,
    };
    localStorage.setItem("hydrosmart_weather_cache", JSON.stringify(cache));
  } catch (e) {
    console.warn("Failed to write to weather cache:", e);
  }
}

export async function fetchWeather(city: string): Promise<WeatherData> {
  const trimmedCity = city.trim();
  if (!trimmedCity) {
    return {
      ...getFallbackWeather("Mumbai"),
      isMock: true,
    };
  }

  // Check cache first
  const cached = getCache(trimmedCity);
  if (cached) return cached;

  try {
    const res = await fetch(
      `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(trimmedCity)}&appid=${API_KEY}&units=metric`
    );

    if (!res.ok) {
      throw new Error(`OpenWeatherMap error: ${res.status} ${res.statusText}`);
    }

    const data = await res.json();
    const weatherData: WeatherData = {
      temp: Math.round(data.main.temp),
      humidity: data.main.humidity,
      description: data.weather[0]?.description || "Clear",
      icon: getWeatherEmoji(data.weather[0]?.icon || "01d"),
      city: data.name,
      isMock: false,
    };

    setCache(trimmedCity, weatherData);
    return weatherData;
  } catch (error) {
    console.error(`Failed to fetch weather for "${trimmedCity}" (key: ${API_KEY.slice(0, 5)}...):`, error);
    const fallback = {
      ...getFallbackWeather(trimmedCity),
      isMock: true,
    };
    return fallback;
  }
}

export async function fetchWeatherByCoords(lat: number, lon: number): Promise<WeatherData> {
  const cacheKey = `coords:${lat.toFixed(2)},${lon.toFixed(2)}`;
  
  // Check cache first
  const cached = getCache(cacheKey);
  if (cached) return cached;

  try {
    const res = await fetch(
      `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${API_KEY}&units=metric`
    );

    if (!res.ok) {
      throw new Error(`OpenWeatherMap error: ${res.status} ${res.statusText}`);
    }

    const data = await res.json();
    const weatherData: WeatherData = {
      temp: Math.round(data.main.temp),
      humidity: data.main.humidity,
      description: data.weather[0]?.description || "Clear",
      icon: getWeatherEmoji(data.weather[0]?.icon || "01d"),
      city: data.name || `Coords: ${lat.toFixed(2)}, ${lon.toFixed(2)}`,
      isMock: false,
    };

    setCache(cacheKey, weatherData);
    // Also cache by city name as secondary lookup
    if (data.name) {
      setCache(data.name, weatherData);
    }
    return weatherData;
  } catch (error) {
    console.error(`Failed to fetch weather for coords ${lat}, ${lon}:`, error);
    const fallback = {
      ...getFallbackWeather(`Coords: ${lat.toFixed(2)}, ${lon.toFixed(2)}`),
      isMock: true,
    };
    return fallback;
  }
}

function getWeatherEmoji(iconCode: string): string {
  if (iconCode.startsWith("01")) return "☀️"; // clear sky
  if (iconCode.startsWith("02") || iconCode.startsWith("03") || iconCode.startsWith("04")) return "⛅"; // clouds
  if (iconCode.startsWith("09") || iconCode.startsWith("10")) return "🌧️"; // rain
  if (iconCode.startsWith("11")) return "⛈️"; // thunderstorm
  if (iconCode.startsWith("13")) return "❄️"; // snow
  if (iconCode.startsWith("50")) return "🌫️"; // mist/fog
  return "🌤️";
}

export function getFallbackWeather(city: string): WeatherData {
  const lowercaseCity = city.toLowerCase();
  let temp = 22;
  let humidity = 50;
  let description = "Clear sky";
  let icon = "☀️";

  if (lowercaseCity.includes("london") || lowercaseCity.includes("uk")) {
    temp = 16;
    humidity = 82;
    description = "Light rain";
    icon = "🌧️";
  } else if (lowercaseCity.includes("dubai") || lowercaseCity.includes("sahara")) {
    temp = 42;
    humidity = 18;
    description = "Sunny and hot";
    icon = "☀️";
  } else if (
    lowercaseCity.includes("delhi") ||
    lowercaseCity.includes("chennai") ||
    lowercaseCity.includes("india") ||
    lowercaseCity.includes("mumbai") ||
    lowercaseCity.includes("bangalore")
  ) {
    temp = 34;
    humidity = 65;
    description = "Scattered clouds";
    icon = "⛅";
  } else if (lowercaseCity.includes("sydney") || lowercaseCity.includes("australia")) {
    temp = 22;
    humidity = 55;
    description = "Clear sky";
    icon = "☀️";
  } else {
    const hash = city.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0);
    temp = 15 + (hash % 26); // 15 to 40
    humidity = 30 + ((hash * 3) % 60); // 30 to 90
    description = temp > 32 ? "Sunny and clear" : temp < 20 ? "Overcast" : "Partly cloudy";
    icon = temp > 32 ? "☀️" : temp < 20 ? "🌫️" : "⛅";
  }

  return {
    temp,
    humidity,
    description,
    icon,
    city: city.charAt(0).toUpperCase() + city.slice(1),
    isMock: true,
  };
}

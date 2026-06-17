import type { WeatherData } from "./hydration";

// Uses Open-Meteo (free, no API key needed)
export async function fetchWeather(city: string): Promise<WeatherData> {
  // Geocode city name
  const geoRes = await fetch(
    `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city)}&count=1`
  );
  const geoData = await geoRes.json();

  if (!geoData.results?.length) {
    throw new Error("City not found");
  }

  const { latitude, longitude, name } = geoData.results[0];

  // Get weather
  const weatherRes = await fetch(
    `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,relative_humidity_2m,weather_code`
  );
  const weatherData = await weatherRes.json();
  const current = weatherData.current;

  return {
    temp: Math.round(current.temperature_2m),
    humidity: current.relative_humidity_2m,
    description: getWeatherDescription(current.weather_code),
    icon: getWeatherIcon(current.weather_code),
    city: name,
  };
}

function getWeatherDescription(code: number): string {
  if (code === 0) return "Clear sky";
  if (code <= 3) return "Partly cloudy";
  if (code <= 49) return "Foggy";
  if (code <= 69) return "Rainy";
  if (code <= 79) return "Snowy";
  if (code <= 99) return "Thunderstorm";
  return "Unknown";
}

function getWeatherIcon(code: number): string {
  if (code === 0) return "☀️";
  if (code <= 3) return "⛅";
  if (code <= 49) return "🌫️";
  if (code <= 69) return "🌧️";
  if (code <= 79) return "❄️";
  if (code <= 99) return "⛈️";
  return "🌤️";
}

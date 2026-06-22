import type { WeatherData } from "./hydration";

const API_KEY = "fa1a86bf8d3d3f0c3a097ec917840d69";

export async function fetchWeather(city: string): Promise<WeatherData> {
  try {
    const res = await fetch(
      `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(city)}&appid=${API_KEY}&units=metric`
    );
    if (!res.ok) {
      throw new Error(`OpenWeatherMap error: ${res.status}`);
    }
    const data = await res.json();
    return {
      temp: Math.round(data.main.temp),
      humidity: data.main.humidity,
      description: data.weather[0]?.description || "Clear",
      icon: getWeatherEmoji(data.weather[0]?.icon || "01d"),
      city: data.name,
    };
  } catch (error) {
    console.warn("Failed to fetch weather from OpenWeatherMap, using fallback mock weather:", error);
    return getFallbackWeather(city);
  }
}

function getWeatherEmoji(iconCode: string): string {
  // Map OpenWeatherMap icon codes to emojis
  if (iconCode.startsWith("01")) return "☀️"; // clear sky
  if (iconCode.startsWith("02") || iconCode.startsWith("03") || iconCode.startsWith("04")) return "⛅"; // clouds
  if (iconCode.startsWith("09") || iconCode.startsWith("10")) return "🌧️"; // rain
  if (iconCode.startsWith("11")) return "⛈️"; // thunderstorm
  if (iconCode.startsWith("13")) return "❄️"; // snow
  if (iconCode.startsWith("50")) return "🌫️"; // mist/fog
  return "🌤️";
}

export function getFallbackWeather(city: string): WeatherData {
  // Generate consistent mock weather based on city name for simulation
  const lowercaseCity = city.toLowerCase();
  let temp = 22; // default comfortable temp
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
  } else if (lowercaseCity.includes("delhi") || lowercaseCity.includes("chennai") || lowercaseCity.includes("india")) {
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
    // Semi-random deterministic based on city name characters
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
  };
}

/**
 * Open-Meteo Weather API Service
 * Fetches daily weather forecasts for given lat/lng coordinates and date range.
 * Free, open source, no API key required.
 */

const DEFAULT_COORDS = { lat: 6.9271, lng: 79.8612 }; // Colombo

// City lookup coordinates for common Sri Lankan destinations
export const CITY_COORDINATES = {
  colombo: { lat: 6.9271, lng: 79.8612 },
  kandy: { lat: 7.2906, lng: 80.6337 },
  galle: { lat: 6.0535, lng: 80.2210 },
  ella: { lat: 6.8667, lng: 81.0466 },
  sigiriya: { lat: 7.9570, lng: 80.7603 },
  nuwaraeliya: { lat: 6.9497, lng: 80.7891 },
  mirissa: { lat: 5.9483, lng: 80.4716 },
  trincomalee: { lat: 8.5874, lng: 81.2152 },
  jaffna: { lat: 9.6615, lng: 80.0255 },
  bentota: { lat: 6.4259, lng: 79.9971 },
  negombo: { lat: 7.2008, lng: 79.8737 },
  dambulla: { lat: 7.8742, lng: 80.6511 },
  yala: { lat: 6.3727, lng: 81.5170 },
  arugambay: { lat: 6.8415, lng: 81.8358 },
};

export function getCityCoords(cityName) {
  if (!cityName) return DEFAULT_COORDS;
  const key = String(cityName).toLowerCase().replace(/[^a-z]/g, "");
  return CITY_COORDINATES[key] || DEFAULT_COORDS;
}

/**
 * Interpret WMO Weather Code
 */
export function interpretWmoCode(code, rainProb = 0) {
  if (code === 0) {
    return { condition: "Clear Sky", icon: "☀️", type: "clear", outdoorFriendly: true };
  } else if (code >= 1 && code <= 3) {
    return { condition: code === 3 ? "Overcast" : "Partly Cloudy", icon: "⛅", type: "cloudy", outdoorFriendly: rainProb < 40 };
  } else if (code >= 45 && code <= 48) {
    return { condition: "Foggy", icon: "🌫️", type: "fog", outdoorFriendly: true };
  } else if ((code >= 51 && code <= 67) || (code >= 80 && code <= 82)) {
    return { condition: "Passing Rain / Showers", icon: "🌧️", type: "rain", outdoorFriendly: false };
  } else if (code >= 95) {
    return { condition: "Thunderstorm", icon: "⛈️", type: "storm", outdoorFriendly: false };
  }
  return { condition: "Fair Weather", icon: "🌤️", type: "clear", outdoorFriendly: true };
}

/**
 * Fetch daily forecast from Open-Meteo API
 * @param {number} lat
 * @param {number} lng
 * @param {string} startDate YYYY-MM-DD
 * @param {string} endDate YYYY-MM-DD
 * @returns {Promise<Array<{date: string, tempMax: number, tempMin: number, rainProb: number, condition: string, icon: string, outdoorFriendly: boolean}>>}
 */
export async function getWeatherForecast(lat = DEFAULT_COORDS.lat, lng = DEFAULT_COORDS.lng, startDate, endDate) {
  try {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&daily=weathercode,temperature_2m_max,temperature_2m_min,precipitation_probability_max,rain_sum&timezone=auto`;

    const res = await fetch(url);
    if (!res.ok) throw new Error(`Open-Meteo HTTP ${res.status}`);

    const data = await res.json();
    const daily = data.daily || {};
    const dates = daily.time || [];

    const forecasts = dates.map((dateStr, idx) => {
      const weatherCode = daily.weathercode?.[idx] ?? 0;
      const rainProb = daily.precipitation_probability_max?.[idx] ?? 10;
      const tempMax = Math.round(daily.temperature_2m_max?.[idx] ?? 30);
      const tempMin = Math.round(daily.temperature_2m_min?.[idx] ?? 24);

      const parsed = interpretWmoCode(weatherCode, rainProb);
      return {
        date: dateStr,
        tempMax,
        tempMin,
        rainProb,
        condition: parsed.condition,
        icon: parsed.icon,
        type: parsed.type,
        outdoorFriendly: parsed.outdoorFriendly,
        recommendation: parsed.outdoorFriendly
          ? "Ideal weather for outdoor activities, beaches & nature tours"
          : "Higher rain chance — recommended indoor sights, museums, spa, or local dining",
      };
    });

    if (startDate && endDate) {
      const filtered = forecasts.filter((f) => f.date >= startDate && f.date <= endDate);
      if (filtered.length > 0) return filtered;
    }

    return forecasts.length > 0 ? forecasts : createFallbackForecast(startDate, endDate);
  } catch (err) {
    console.warn("[weather] Failed to fetch live weather from Open-Meteo, using fallback:", err.message);
    return createFallbackForecast(startDate, endDate);
  }
}

function createFallbackForecast(startDate, endDate) {
  const start = startDate ? new Date(startDate) : new Date();
  const end = endDate ? new Date(endDate) : new Date(start.getTime() + 3 * 86400000);
  const list = [];
  const curr = new Date(start);

  while (curr <= end) {
    const dateStr = curr.toISOString().split("T")[0];
    list.push({
      date: dateStr,
      tempMax: 30,
      tempMin: 24,
      rainProb: 20,
      condition: "Partly Cloudy",
      icon: "⛅",
      type: "cloudy",
      outdoorFriendly: true,
      recommendation: "Ideal weather for outdoor activities, beaches & nature tours",
    });
    curr.setDate(curr.getDate() + 1);
  }
  return list;
}

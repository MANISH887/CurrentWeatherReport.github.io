const cityInput = document.getElementById("cityInput");
const searchBtn = document.getElementById("searchBtn");
const locationBtn = document.getElementById("locationBtn");

let map;
let marker;
let chart;

function getIcon(code) {
  if (code === 0) return "☀️";
  if ([1, 2, 3].includes(code)) return "⛅";
  if ([45, 48].includes(code)) return "🌫️";
  if ([51, 53, 55, 61, 63, 65].includes(code)) return "🌧️";
  if ([71, 73, 75].includes(code)) return "❄️";
  if ([95, 96, 99].includes(code)) return "⛈️";
  return "🌤️";
}

document.getElementById("hourlySection").style.display = "none";
document.getElementById("forecastSection").style.display = "none";
document.getElementById("mapSection").style.display = "none";

async function fetchWeather(lat, lon, name = "Your Location") {
  const res = await fetch(
    `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true&hourly=temperature_2m&daily=temperature_2m_max,temperature_2m_min,sunrise,sunset&timezone=auto`,
  );

  const data = await res.json();

  if (!data || !data.current_weather) {
    console.warn("Weather data not available");
    return null;
  }

  displayCurrent(data, name);
  displaySun(data);

  if (data.hourly && data.hourly.temperature_2m.length > 0) {
    document.getElementById("hourlySection").style.display = "block";
    displayChart(data);
  }

  if (data.daily && data.daily.temperature_2m_max.length > 0) {
    document.getElementById("forecastSection").style.display = "block";
    displayForecast(data);
  }

  document.getElementById("mapSection").style.display = "block";
  loadMap(lat, lon);
}

function displayCurrent(data, name) {
  const current = data.current_weather;
  document.getElementById("currentWeather").innerHTML = `<h2>${name}</h2>
        ${getIcon(current.weathercode)} 
        ${current.temperature}°C | Wind ${current.windspeed} km/h`;
}

function displaySun(data) {
  const sunrise = data.daily.sunrise[0];
  const sunset = data.daily.sunset[0];

  document.getElementById("sunTime").innerHTML =
    `🌅 Sunrise: ${sunrise.split("T")[1]} |
         🌇 Sunset: ${sunset.split("T")[1]}`;
}

function displayForecast(data) {
  const forecastDiv = document.getElementById("forecast");
  forecastDiv.innerHTML = "";

  data.daily.time.forEach((day, i) => {
    forecastDiv.innerHTML += `
            <div class="card">
                <strong>${day}</strong><br>
                🌡️ ${data.daily.temperature_2m_min[i]}° / ${data.daily.temperature_2m_max[i]}°
            </div>
        `;
  });
}

function displayChart(data) {
  const ctx = document.getElementById("hourlyChart");

  if (chart) chart.destroy();

  chart = new Chart(ctx, {
    type: "line",
    data: {
      labels: data.hourly.time.slice(0, 24),
      datasets: [
        {
          label: "Temperature °C",
          data: data.hourly.temperature_2m.slice(0, 24),
          fill: false,
        },
      ],
    },
  });
}

function loadMap(lat, lon) {
  if (!map) {
    map = L.map("map").setView([lat, lon], 10);
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "© OpenStreetMap",
    }).addTo(map);
    marker = L.marker([lat, lon]).addTo(map);
  } else {
    map.setView([lat, lon], 10);
    marker.setLatLng([lat, lon]);
  }
}

searchBtn.addEventListener("click", async () => {
  const city = cityInput.value;
  if (!city) return null;

  const geoRes = await fetch(
    `https://geocoding-api.open-meteo.com/v1/search?name=${city}`,
  );
  const geoData = await geoRes.json();
  if (!geoData.results) return console.warn("City not found");

  const { latitude, longitude, name, country } = geoData.results[0];
  fetchWeather(latitude, longitude, `${name}, ${country}`);
});

locationBtn.addEventListener("click", () => {
  navigator.geolocation.getCurrentPosition((pos) => {
    fetchWeather(pos.coords.latitude, pos.coords.longitude);
  });
});

const resultsList = document.getElementById("searchResults");

searchBtn.addEventListener("click", async () => {
  const city = cityInput.value.trim();
  if (!city) return null;

  const geoRes = await fetch(
    `https://geocoding-api.open-meteo.com/v1/search?name=${city}&count=10`,
  );

  const geoData = await geoRes.json();

  resultsList.innerHTML = "";

  if (!geoData.results) {
    resultsList.innerHTML = "<li>No results found</li>";
    return null;
  }

  geoData.results.forEach((place) => {
    const li = document.createElement("li");

    li.textContent = `${place.name}, ${place.admin1 || ""}, ${place.country}`;

    li.addEventListener("click", () => {
      fetchWeather(
        place.latitude,
        place.longitude,
        `${place.name}, ${place.country}`,
      );

      resultsList.innerHTML = "";
    });

    resultsList.appendChild(li);
  });
});

cityInput.addEventListener("input", debounceSearch);

let debounceTimer;

function debounceSearch() {
  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => {
    searchBtn.click();
  }, 500);
}

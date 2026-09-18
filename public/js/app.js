/* global MapRenderer, WeightSliderPanel, PresetSelector, ScoreBreakdownCard */

/* ═══════════════════════════════════════════════════════════════════
 * WORLD SAMPLE TRIPS
 * Organised by region; each trip has a centre lat/lon for flyTo.
 * ═══════════════════════════════════════════════════════════════════*/
const WORLD_TRIPS = {
  asia: [
    {
      id: 'bangalore', flag: '🇮🇳', name: 'Bangalore', centerLat: 12.9716, centerLon: 77.5946, zoom: 13,
      stops: [
        { name: 'Cubbon Park',              lat: 12.9763, lon: 77.5929 },
        { name: 'Visvesvaraya Museum',      lat: 12.9752, lon: 77.5963 },
        { name: 'Commercial Street',        lat: 12.9822, lon: 77.6083 },
        { name: 'Lalbagh Botanical Garden', lat: 12.9507, lon: 77.5848 },
        { name: 'UB City Mall',             lat: 12.9719, lon: 77.5958 },
      ],
    },
    {
      id: 'delhi', flag: '🇮🇳', name: 'Delhi', centerLat: 28.6139, centerLon: 77.2090, zoom: 12,
      stops: [
        { name: 'India Gate',            lat: 28.6129, lon: 77.2295 },
        { name: 'Red Fort',              lat: 28.6562, lon: 77.2410 },
        { name: 'Qutub Minar',           lat: 28.5244, lon: 77.1855 },
        { name: 'Lotus Temple',          lat: 28.5535, lon: 77.2588 },
        { name: 'Humayun Tomb',          lat: 28.5933, lon: 77.2507 },
        { name: 'Chandni Chowk Market',  lat: 28.6507, lon: 77.2300 },
      ],
    },
    {
      id: 'mumbai', flag: '🇮🇳', name: 'Mumbai', centerLat: 18.9388, centerLon: 72.8353, zoom: 12,
      stops: [
        { name: 'Gateway of India',    lat: 18.9220, lon: 72.8347 },
        { name: 'Marine Drive',        lat: 18.9440, lon: 72.8232 },
        { name: 'Elephanta Caves Dock',lat: 18.9067, lon: 72.8425 },
        { name: 'Bandra Worli Sea Link',lat: 19.0337, lon: 72.8159 },
        { name: 'Chhatrapati Shivaji Terminus', lat: 18.9398, lon: 72.8355 },
      ],
    },
    {
      id: 'tokyo', flag: '🇯🇵', name: 'Tokyo', centerLat: 35.6762, centerLon: 139.6503, zoom: 12,
      stops: [
        { name: 'Shibuya Crossing',    lat: 35.6595, lon: 139.7004 },
        { name: 'Senso-ji Temple',     lat: 35.7148, lon: 139.7967 },
        { name: 'Shinjuku Gyoen',      lat: 35.6852, lon: 139.7100 },
        { name: 'Tokyo Tower',         lat: 35.6586, lon: 139.7454 },
        { name: 'Akihabara District',  lat: 35.7022, lon: 139.7742 },
        { name: 'Tsukiji Outer Market',lat: 35.6654, lon: 139.7706 },
      ],
    },
    {
      id: 'singapore', flag: '🇸🇬', name: 'Singapore', centerLat: 1.3521, centerLon: 103.8198, zoom: 13,
      stops: [
        { name: 'Marina Bay Sands',    lat: 1.2838, lon: 103.8607 },
        { name: 'Gardens by the Bay', lat: 1.2816, lon: 103.8636 },
        { name: 'Chinatown',           lat: 1.2830, lon: 103.8448 },
        { name: 'Orchard Road',        lat: 1.3048, lon: 103.8318 },
        { name: 'Sentosa Island',      lat: 1.2494, lon: 103.8303 },
      ],
    },
    {
      id: 'bangkok', flag: '🇹🇭', name: 'Bangkok', centerLat: 13.7563, centerLon: 100.5018, zoom: 13,
      stops: [
        { name: 'Grand Palace',           lat: 13.7500, lon: 100.4913 },
        { name: 'Wat Pho',                lat: 13.7465, lon: 100.4929 },
        { name: 'Chatuchak Market',       lat: 13.7999, lon: 100.5500 },
        { name: 'Wat Arun',               lat: 13.7438, lon: 100.4888 },
        { name: 'Khao San Road',          lat: 13.7587, lon: 100.4972 },
      ],
    },
    {
      id: 'dubai', flag: '🇦🇪', name: 'Dubai', centerLat: 25.2048, centerLon: 55.2708, zoom: 12,
      stops: [
        { name: 'Burj Khalifa',        lat: 25.1972, lon: 55.2744 },
        { name: 'Dubai Mall',          lat: 25.1980, lon: 55.2796 },
        { name: 'Palm Jumeirah',       lat: 25.1124, lon: 55.1390 },
        { name: 'Dubai Museum',        lat: 25.2630, lon: 55.2970 },
        { name: 'Gold Souk',           lat: 25.2697, lon: 55.3094 },
        { name: 'Burj Al Arab',        lat: 25.1412, lon: 55.1853 },
      ],
    },
  ],
  europe: [
    {
      id: 'paris', flag: '🇫🇷', name: 'Paris', centerLat: 48.8566, centerLon: 2.3522, zoom: 13,
      stops: [
        { name: 'Eiffel Tower',         lat: 48.8584, lon: 2.2945 },
        { name: 'Louvre Museum',        lat: 48.8606, lon: 2.3376 },
        { name: 'Notre-Dame Cathedral', lat: 48.8530, lon: 2.3499 },
        { name: 'Champs-Élysées',       lat: 48.8698, lon: 2.3078 },
        { name: 'Musée d\'Orsay',        lat: 48.8600, lon: 2.3266 },
        { name: 'Sacré-Cœur',           lat: 48.8867, lon: 2.3431 },
      ],
    },
    {
      id: 'london', flag: '🇬🇧', name: 'London', centerLat: 51.5074, centerLon: -0.1278, zoom: 13,
      stops: [
        { name: 'Tower of London',     lat: 51.5081, lon: -0.0759 },
        { name: 'British Museum',      lat: 51.5194, lon: -0.1270 },
        { name: 'Buckingham Palace',   lat: 51.5014, lon: -0.1419 },
        { name: 'Hyde Park',           lat: 51.5074, lon: -0.1657 },
        { name: 'Tate Modern',         lat: 51.5076, lon: -0.0994 },
        { name: 'Camden Market',       lat: 51.5415, lon: -0.1474 },
      ],
    },
    {
      id: 'rome', flag: '🇮🇹', name: 'Rome', centerLat: 41.9028, centerLon: 12.4964, zoom: 13,
      stops: [
        { name: 'Colosseum',           lat: 41.8902, lon: 12.4922 },
        { name: 'Vatican Museums',     lat: 41.9065, lon: 12.4536 },
        { name: 'Trevi Fountain',      lat: 41.9009, lon: 12.4833 },
        { name: 'Pantheon',            lat: 41.8986, lon: 12.4769 },
        { name: 'Spanish Steps',       lat: 41.9058, lon: 12.4823 },
        { name: 'Piazza Navona',       lat: 41.8992, lon: 12.4731 },
      ],
    },
    {
      id: 'barcelona', flag: '🇪🇸', name: 'Barcelona', centerLat: 41.3851, centerLon: 2.1734, zoom: 13,
      stops: [
        { name: 'Sagrada Família',     lat: 41.4036, lon: 2.1744 },
        { name: 'Park Güell',          lat: 41.4145, lon: 2.1527 },
        { name: 'Las Ramblas',         lat: 41.3809, lon: 2.1734 },
        { name: 'Camp Nou',            lat: 41.3809, lon: 2.1228 },
        { name: 'Gothic Quarter',      lat: 41.3833, lon: 2.1774 },
      ],
    },
    {
      id: 'berlin', flag: '🇩🇪', name: 'Berlin', centerLat: 52.5200, centerLon: 13.4050, zoom: 12,
      stops: [
        { name: 'Brandenburg Gate',     lat: 52.5163, lon: 13.3777 },
        { name: 'Reichstag Building',   lat: 52.5186, lon: 13.3762 },
        { name: 'Berlin Wall Memorial', lat: 52.5351, lon: 13.3900 },
        { name: 'Checkpoint Charlie',   lat: 52.5075, lon: 13.3904 },
        { name: 'Museum Island',        lat: 52.5169, lon: 13.4013 },
      ],
    },
    {
      id: 'amsterdam', flag: '🇳🇱', name: 'Amsterdam', centerLat: 52.3676, centerLon: 4.9041, zoom: 13,
      stops: [
        { name: 'Rijksmuseum',          lat: 52.3600, lon: 4.8852 },
        { name: 'Anne Frank House',     lat: 52.3752, lon: 4.8839 },
        { name: 'Van Gogh Museum',      lat: 52.3584, lon: 4.8811 },
        { name: 'Dam Square',           lat: 52.3731, lon: 4.8932 },
        { name: 'Vondelpark',           lat: 52.3579, lon: 4.8686 },
      ],
    },
  ],
  americas: [
    {
      id: 'newyork', flag: '🇺🇸', name: 'New York', centerLat: 40.7128, centerLon: -74.0060, zoom: 13,
      stops: [
        { name: 'Statue of Liberty Ferry', lat: 40.6892, lon: -74.0445 },
        { name: 'Central Park',            lat: 40.7851, lon: -73.9683 },
        { name: 'Times Square',            lat: 40.7580, lon: -73.9855 },
        { name: 'Empire State Building',   lat: 40.7484, lon: -73.9967 },
        { name: 'Brooklyn Bridge',         lat: 40.7061, lon: -73.9969 },
        { name: 'MoMA',                    lat: 40.7614, lon: -73.9776 },
      ],
    },
    {
      id: 'chicago', flag: '🇺🇸', name: 'Chicago', centerLat: 41.8781, centerLon: -87.6298, zoom: 13,
      stops: [
        { name: 'Millennium Park',     lat: 41.8827, lon: -87.6233 },
        { name: 'Art Institute',       lat: 41.8796, lon: -87.6237 },
        { name: 'Navy Pier',           lat: 41.8916, lon: -87.6085 },
        { name: 'Willis Tower',        lat: 41.8789, lon: -87.6359 },
        { name: 'Lincoln Park Zoo',    lat: 41.9211, lon: -87.6336 },
      ],
    },
    {
      id: 'rio', flag: '🇧🇷', name: 'Rio de Janeiro', centerLat: -22.9068, centerLon: -43.1729, zoom: 12,
      stops: [
        { name: 'Christ the Redeemer', lat: -22.9519, lon: -43.2105 },
        { name: 'Copacabana Beach',    lat: -22.9711, lon: -43.1822 },
        { name: 'Sugarloaf Mountain', lat: -22.9488, lon: -43.1576 },
        { name: 'Ipanema Beach',       lat: -22.9838, lon: -43.2038 },
        { name: 'Maracanã Stadium',    lat: -22.9122, lon: -43.2302 },
      ],
    },
    {
      id: 'sanfrancisco', flag: '🇺🇸', name: 'San Francisco', centerLat: 37.7749, centerLon: -122.4194, zoom: 13,
      stops: [
        { name: 'Golden Gate Bridge',  lat: 37.8199, lon: -122.4783 },
        { name: 'Alcatraz Island',     lat: 37.8270, lon: -122.4230 },
        { name: 'Fisherman\'s Wharf',   lat: 37.8080, lon: -122.4177 },
        { name: 'Chinatown SF',        lat: 37.7941, lon: -122.4078 },
        { name: 'Mission Dolores Park',lat: 37.7596, lon: -122.4269 },
      ],
    },
    {
      id: 'mexico', flag: '🇲🇽', name: 'Mexico City', centerLat: 19.4326, centerLon: -99.1332, zoom: 13,
      stops: [
        { name: 'Zócalo Plaza',           lat: 19.4326, lon: -99.1332 },
        { name: 'Chapultepec Castle',     lat: 19.4202, lon: -99.1817 },
        { name: 'Teotihuacán Pyramids',   lat: 19.6925, lon: -98.8438 },
        { name: 'Frida Kahlo Museum',     lat: 19.3559, lon: -99.1627 },
        { name: 'Xochimilco',             lat: 19.2590, lon: -99.1035 },
      ],
    },
  ],
  other: [
    {
      id: 'sydney', flag: '🇦🇺', name: 'Sydney', centerLat: -33.8688, centerLon: 151.2093, zoom: 13,
      stops: [
        { name: 'Sydney Opera House',  lat: -33.8568, lon: 151.2153 },
        { name: 'Harbour Bridge',      lat: -33.8523, lon: 151.2108 },
        { name: 'Bondi Beach',         lat: -33.8909, lon: 151.2774 },
        { name: 'Taronga Zoo',         lat: -33.8433, lon: 151.2414 },
        { name: 'The Rocks',           lat: -33.8599, lon: 151.2090 },
      ],
    },
    {
      id: 'capetown', flag: '🇿🇦', name: 'Cape Town', centerLat: -33.9249, centerLon: 18.4241, zoom: 12,
      stops: [
        { name: 'Table Mountain',      lat: -33.9628, lon: 18.4098 },
        { name: 'Boulders Beach',      lat: -34.1973, lon: 18.4510 },
        { name: 'V&A Waterfront',      lat: -33.9035, lon: 18.4218 },
        { name: 'Robben Island Ferry', lat: -33.9063, lon: 18.4220 },
        { name: 'Kirstenbosch Gardens',lat: -33.9877, lon: 18.4321 },
      ],
    },
    {
      id: 'istanbul', flag: '🇹🇷', name: 'Istanbul', centerLat: 41.0082, centerLon: 28.9784, zoom: 13,
      stops: [
        { name: 'Hagia Sophia',        lat: 41.0086, lon: 28.9802 },
        { name: 'Blue Mosque',         lat: 41.0054, lon: 28.9768 },
        { name: 'Grand Bazaar',        lat: 41.0107, lon: 28.9682 },
        { name: 'Topkapi Palace',      lat: 41.0115, lon: 28.9833 },
        { name: 'Bosphorus Bridge',    lat: 41.0457, lon: 29.0337 },
      ],
    },
    {
      id: 'cairo', flag: '🇪🇬', name: 'Cairo', centerLat: 30.0444, centerLon: 31.2357, zoom: 12,
      stops: [
        { name: 'Great Pyramid of Giza',    lat: 29.9792, lon: 31.1342 },
        { name: 'Egyptian Museum',          lat: 30.0478, lon: 31.2336 },
        { name: 'Khan el-Khalili Bazaar',   lat: 30.0480, lon: 31.2625 },
        { name: 'Citadel of Saladin',       lat: 30.0286, lon: 31.2597 },
        { name: 'Al-Azhar Mosque',          lat: 30.0459, lon: 31.2626 },
      ],
    },
    {
      id: 'moscow', flag: '🇷🇺', name: 'Moscow', centerLat: 55.7558, centerLon: 37.6173, zoom: 13,
      stops: [
        { name: 'Red Square',          lat: 55.7539, lon: 37.6208 },
        { name: 'St. Basil\'s Cathedral',lat: 55.7525, lon: 37.6231 },
        { name: 'Kremlin',             lat: 55.7520, lon: 37.6175 },
        { name: 'Gorky Park',          lat: 55.7296, lon: 37.6014 },
        { name: 'Tretyakov Gallery',   lat: 55.7414, lon: 37.6202 },
      ],
    },
  ],
};

/* ═══════════════════════════════════════════════════════════════════
 * APP BOOTSTRAP
 * ═══════════════════════════════════════════════════════════════════*/
document.addEventListener('DOMContentLoaded', () => {
  /* ── STATE ──────────────────────────────────────────────────────*/
  let pendingLat           = null;
  let pendingLon           = null;
  let pendingHoursStopId   = null;
  let pendingHoursStopName = null;
  let currentStops         = [];
  let activeRegion         = 'asia';

  /* ── MODAL HELPERS ──────────────────────────────────────────────*/
  function openModal(id)  { document.getElementById(id)?.classList.add('open'); }
  function closeModal(id) { document.getElementById(id)?.classList.remove('open'); }

  document.querySelectorAll('.modal-overlay').forEach((overlay) =>
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) overlay.classList.remove('open');
    })
  );
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape')
      document.querySelectorAll('.modal-overlay.open').forEach((m) => m.classList.remove('open'));
  });

  /* ── ADD STOP MODAL ─────────────────────────────────────────────*/
  const inputName   = document.getElementById('input-stop-name');
  const inputCoords = document.getElementById('input-stop-coords');

  document.getElementById('btn-modal-close')?.addEventListener('click',  () => closeModal('modal-add-stop'));
  document.getElementById('btn-modal-cancel')?.addEventListener('click', () => closeModal('modal-add-stop'));

  document.getElementById('btn-modal-confirm')?.addEventListener('click', async () => {
    const name = inputName.value.trim();
    if (!name) {
      inputName.focus();
      inputName.style.borderColor = 'var(--danger)';
      setTimeout(() => (inputName.style.borderColor = ''), 1200);
      return;
    }
    closeModal('modal-add-stop');
    await addStop(name, pendingLat, pendingLon);
    inputName.value = '';
  });
  inputName?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') document.getElementById('btn-modal-confirm').click();
  });

  /* ── OPENING HOURS MODAL ────────────────────────────────────────*/
  document.getElementById('btn-hours-close')?.addEventListener('click',  () => closeModal('modal-hours'));
  document.getElementById('btn-hours-cancel')?.addEventListener('click', () => closeModal('modal-hours'));

  document.getElementById('btn-hours-confirm')?.addEventListener('click', async () => {
    const openTime  = document.getElementById('input-hours-open').value;
    const closeTime = document.getElementById('input-hours-close').value;
    closeModal('modal-hours');
    const res = await fetch(`/api/stops/${pendingHoursStopId}/constraints`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'OPENING_HOURS', openTime, closeTime }),
    });
    const data = await res.json();
    if (!res.ok) showToast(`⚠️ ${data.error}`, 'warning');
    else await syncState();
  });

  /* ── GLOBAL HELPERS (called from map popups) ────────────────────*/
  window.addOpeningHoursPrompt = function (stopId) {
    const stop = currentStops.find((s) => s.id === stopId);
    pendingHoursStopId   = stopId;
    pendingHoursStopName = stop?.name || stopId;
    const label = document.getElementById('modal-hours-stopname');
    if (label) label.textContent = `Setting hours for: ${pendingHoursStopName}`;
    document.getElementById('input-hours-open').value  = '10:00';
    document.getElementById('input-hours-close').value = '17:00';
    openModal('modal-hours');
  };

  window.removeStop = async function (id) {
    await fetch(`/api/stops/${id}`, { method: 'DELETE' });
    await syncState();
  };

  /* ── MAP RENDERER ───────────────────────────────────────────────*/
  const mapRenderer = new MapRenderer('map-container', {
    onMapClick: (lat, lon) => {
      pendingLat = lat;
      pendingLon = lon;
      inputCoords.value = `${lat.toFixed(5)}, ${lon.toFixed(5)}`;
      inputName.value = '';
      openModal('modal-add-stop');
      setTimeout(() => inputName.focus(), 120);
    },
    onMarkerDrag: async (stopId, lat, lon) => {
      await fetch(`/api/stops/${stopId}/position`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lat, lon }),
      });
      await syncState();
    },
  });

  /* ── WEIGHT SLIDER PANEL ────────────────────────────────────────*/
  const sliderPanel = new WeightSliderPanel('slider-panel', async (weights) => {
    await fetch('/api/weights', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(weights),
    });
    await syncState();
  });

  /* ── PRESET SELECTOR ────────────────────────────────────────────*/
  new PresetSelector('preset-container', async (presetName) => {
    const res  = await fetch('/api/presets/select', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ presetName }),
    });
    const data = await res.json();
    if (data.weights) sliderPanel.setWeights(data.weights);
    await syncState();
  });

  /* ── SCORE BREAKDOWN CARD ───────────────────────────────────────*/
  const scoreCard = new ScoreBreakdownCard('factor-bars-container');

  /* ── WORLD TRIP PICKER ──────────────────────────────────────────*/
  function renderTripCards(region) {
    activeRegion = region;
    const grid = document.getElementById('trip-cards-grid');
    if (!grid) return;

    const trips = WORLD_TRIPS[region] || [];
    grid.innerHTML = trips
      .map(
        (t) => `
        <div class="trip-card" id="tc-${t.id}" title="${t.name} — ${t.stops.length} stops" onclick="window.loadWorldTrip('${t.id}','${region}')">
          <div class="tc-flag">${t.flag}</div>
          <div class="tc-name">${t.name}</div>
          <div class="tc-stops">${t.stops.length} stops</div>
        </div>`
      )
      .join('');
  }

  // Region tab clicks
  document.getElementById('trip-region-tabs')?.addEventListener('click', (e) => {
    const btn = e.target.closest('.region-tab');
    if (!btn) return;
    document.querySelectorAll('.region-tab').forEach((b) => b.classList.remove('active'));
    btn.classList.add('active');
    renderTripCards(btn.dataset.region);
  });

  window.loadWorldTrip = async function (tripId, region) {
    const trips = WORLD_TRIPS[region] || [];
    const trip  = trips.find((t) => t.id === tripId);
    if (!trip) return;

    showSpinner(true);

    // Clear existing stops first
    for (const s of [...currentStops]) {
      await fetch(`/api/stops/${s.id}`, { method: 'DELETE' });
    }

    // Fly the map to the city centre before stops render
    mapRenderer.flyTo(trip.centerLat, trip.centerLon, trip.zoom);

    // Load new stops
    for (const stop of trip.stops) {
      await fetch('/api/stops', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(stop),
      });
    }

    await syncState();
    showToast(`${trip.flag} ${trip.name} trip loaded!`);
  };

  // Wire the header "Load Trip" button to load the first Asia trip by default
  document.getElementById('btn-sample-data')?.addEventListener('click', () => {
    window.loadWorldTrip('bangalore', 'asia');
  });

  // Initial render
  renderTripCards('asia');

  /* ── HEADER BUTTONS ─────────────────────────────────────────────*/
  document.getElementById('btn-save-trip')?.addEventListener('click', async () => {
    const res  = await fetch('/api/trip/save', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tripId: 'default-trip' }),
    });
    const data = await res.json();
    showToast(data.message || '✅ Trip saved to SQLite');
  });

  document.getElementById('btn-load-trip')?.addEventListener('click', async () => {
    const res = await fetch('/api/trip/load/default-trip');
    if (!res.ok) { showToast('⚠️ No saved trip found.', 'warning'); return; }
    await syncState();
    showToast('📂 Saved trip reloaded from SQLite');
  });

  document.getElementById('btn-clear-all')?.addEventListener('click', async () => {
    if (!currentStops.length) return;
    showSpinner(true);
    for (const s of [...currentStops]) {
      await fetch(`/api/stops/${s.id}`, { method: 'DELETE' });
    }
    await syncState();
    showToast('🗑️ All stops cleared');
  });

  /* ── CORE ADD STOP ──────────────────────────────────────────────*/
  async function addStop(name, lat, lon) {
    showSpinner(true);
    await fetch('/api/stops', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, lat, lon }),
    });
    await syncState();
  }

  /* ── SYNC STATE — central update loop ──────────────────────────*/
  async function syncState() {
    showSpinner(true);
    try {
      const res   = await fetch('/api/state');
      const state = await res.json();
      const report = state.routeReport;
      currentStops = (state.rawRoute ? state.rawRoute.stops : state.stops) || [];

      // Stats
      const hasStops = currentStops.length > 0;
      document.getElementById('stat-dist').textContent  = hasStops ? `${report.totalDistanceKm} km` : '—';
      document.getElementById('stat-time').textContent  = hasStops ? `${report.totalTravelTimeMin} min` : '—';
      document.getElementById('stat-score').textContent = hasStops ? report.score : '—';

      // Status badge
      const badge = document.getElementById('badge-status');
      if (!hasStops) {
        badge.textContent = 'Ready';
        badge.className = 'badge';
      } else if (report.violationCount > 0) {
        badge.textContent = `${report.violationCount} Issue${report.violationCount > 1 ? 's' : ''}`;
        badge.className = 'badge badge-warning';
      } else {
        badge.textContent = 'Valid ✓';
        badge.className = 'badge badge-success';
      }

      // Violations
      const vContainer = document.getElementById('violation-container');
      vContainer.innerHTML =
        report.violations?.length > 0
          ? report.violations.map((v) => `<div class="alert-box">⚠️ <b>${v.type}</b>: ${v.message}</div>`).join('')
          : '';

      // Map
      mapRenderer.renderStops(currentStops);
      mapRenderer.renderRoutePolyline(state.rawRoute);

      // Score breakdown
      scoreCard.render(state.scoreBreakdown);

      // Stop count badge
      document.getElementById('badge-count').textContent =
        `${currentStops.length} Stop${currentStops.length !== 1 ? 's' : ''}`;

      // Stops list
      renderStopList(currentStops);

      // Toast hint
      const toast = document.getElementById('map-toast');
      if (toast) toast.classList.toggle('hidden', currentStops.length > 0);

    } catch (err) {
      console.error('syncState error', err);
    } finally {
      showSpinner(false);
    }
  }

  /* ── STOP LIST ──────────────────────────────────────────────────*/
  function renderStopList(stops) {
    const container = document.getElementById('stops-container');
    if (!stops.length) {
      container.innerHTML = `<div class="empty-state"><span class="icon">📍</span>Click on the map to add your first stop</div>`;
      return;
    }
    container.innerHTML = stops
      .map(
        (s, idx) => `
        <div class="stop-item">
          <div class="stop-badge">${idx + 1}</div>
          <div class="stop-info">
            <div class="stop-title">${escHtml(s.name)}</div>
            <div class="stop-meta">
              ${s.scheduledArrival ? `<span class="tag">🕐 ${s.scheduledArrival}</span>` : ''}
              <span style="color:var(--text-muted)">${s.lat.toFixed(4)}, ${s.lon.toFixed(4)}</span>
            </div>
          </div>
          <div class="stop-actions">
            <button class="btn-icon btn-icon-info"  title="Set opening hours" onclick="window.addOpeningHoursPrompt('${s.id}')">🕐</button>
            <button class="btn-icon btn-icon-danger" title="Remove stop"       onclick="window.removeStop('${s.id}')">✕</button>
          </div>
        </div>`
      )
      .join('');
  }

  /* ── UTILITIES ──────────────────────────────────────────────────*/
  function showSpinner(visible) {
    document.getElementById('route-spinner')?.classList.toggle('visible', visible);
  }

  let toastTimer = null;
  function showToast(msg, type = 'info') {
    document.getElementById('app-toast')?.remove();
    clearTimeout(toastTimer);
    const el = document.createElement('div');
    el.id = 'app-toast';
    el.style.cssText = `
      position:fixed;top:72px;left:50%;transform:translateX(-50%);
      background:var(--bg-surface-elevated);border:1px solid var(--border-hover);
      color:var(--text);padding:9px 20px;border-radius:var(--radius-full);
      font-size:0.82rem;font-weight:600;z-index:99999;
      box-shadow:var(--shadow-md);opacity:0;transition:opacity .2s;
      pointer-events:none;font-family:'Plus Jakarta Sans',sans-serif;white-space:nowrap;
    `;
    if (type === 'warning') el.style.borderColor = 'rgba(245,158,11,.5)';
    el.textContent = msg;
    document.body.appendChild(el);
    requestAnimationFrame(() => (el.style.opacity = '1'));
    toastTimer = setTimeout(() => {
      el.style.opacity = '0';
      setTimeout(() => el.remove(), 250);
    }, 2800);
  }

  function escHtml(str) {
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  /* ── INIT ───────────────────────────────────────────────────────*/
  syncState();
});

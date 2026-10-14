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
  let pendingLat                = null;
  let pendingLon                = null;
  let pendingHoursStopId        = null;
  let pendingHoursStopName      = null;
  let pendingPrecedenceStopId   = null;
  let pendingPrecedenceStopName = null;
  let currentStops              = [];
  let currentTripConfig         = { startTime: '09:00', startLat: 12.9716, startLon: 77.5946 };
  let currentTransitMode        = 'driving';
  let isRoundTripActive         = false;
  let activeRegion              = 'asia';
  let originalAiRouteStats      = null;
  let isManualReordered         = false;
  let lastReport                = null;

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
    const prefStart = document.getElementById('input-pref-start')?.value || null;
    const prefEnd   = document.getElementById('input-pref-end')?.value || null;
    const dwellMin  = Number(document.getElementById('input-stop-dwell')?.value || 30);
    closeModal('modal-add-stop');
    await addStop(name, pendingLat, pendingLon, prefStart, prefEnd, dwellMin);
    inputName.value = '';
    const ps = document.getElementById('input-pref-start');
    if (ps) ps.value = '';
    const pe = document.getElementById('input-pref-end');
    if (pe) pe.value = '';
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

  /* ── PRECEDENCE RULE MODAL ──────────────────────────────────────*/
  document.getElementById('btn-precedence-close')?.addEventListener('click',  () => closeModal('modal-precedence'));
  document.getElementById('btn-precedence-cancel')?.addEventListener('click', () => closeModal('modal-precedence'));

  document.getElementById('btn-precedence-confirm')?.addEventListener('click', async () => {
    const select = document.getElementById('select-precedes-stop');
    const precedesStopId = select?.value;
    if (!precedesStopId) {
      showToast('⚠️ Please select a target stop', 'warning');
      return;
    }
    closeModal('modal-precedence');
    const res = await fetch(`/api/stops/${pendingPrecedenceStopId}/constraints`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'PRECEDENCE', precedesStopId }),
    });
    const data = await res.json();
    if (!res.ok) {
      showToast(`⚠️ ${data.error}`, 'warning');
    } else {
      showToast('🔀 Precedence order rule attached!');
      await syncState();
    }
  });

  /* ── SAVE TRIP MODAL ────────────────────────────────────────────*/
  document.getElementById('btn-save-close')?.addEventListener('click',  () => closeModal('modal-save-trip'));
  document.getElementById('btn-save-cancel')?.addEventListener('click', () => closeModal('modal-save-trip'));

  document.getElementById('btn-save-confirm')?.addEventListener('click', async () => {
    const inputTripName = document.getElementById('input-save-trip-name');
    const tripName = inputTripName?.value.trim() || `Trip-${new Date().toLocaleDateString()}`;
    closeModal('modal-save-trip');
    const res = await fetch('/api/trip/save', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tripId: tripName }),
    });
    const data = await res.json();
    showToast(data.message || `✅ Saved "${tripName}" to SQLite`);
  });

  /* ── MY TRIPS MODAL ─────────────────────────────────────────────*/
  document.getElementById('btn-trips-close')?.addEventListener('click', () => closeModal('modal-my-trips'));
  document.getElementById('btn-trips-done')?.addEventListener('click',  () => closeModal('modal-my-trips'));

  async function openMyTripsModal() {
    const listEl = document.getElementById('trips-list-container');
    if (!listEl) return;
    listEl.innerHTML = '<div style="color:var(--text-muted);font-size:0.8rem;text-align:center;padding:20px 0">Loading saved trips…</div>';
    openModal('modal-my-trips');

    try {
      const res = await fetch('/api/trips');
      const data = await res.json();
      const trips = data.trips || [];
      if (trips.length === 0) {
        listEl.innerHTML = '<div style="color:var(--text-muted);font-size:0.8rem;text-align:center;padding:24px 0">No saved trips yet. Save your current itinerary!</div>';
        return;
      }

      listEl.innerHTML = trips.map((t) => {
        const dateStr = t.createdAt ? new Date(t.createdAt).toLocaleDateString() : '';
        const distStr = t.totalDistance != null ? `${Number(t.totalDistance).toFixed(1)} km` : '';
        const timeStr = t.totalTime != null ? `${Number(t.totalTime).toFixed(0)} min` : '';
        const metaParts = [`${t.stopCount || 0} stops`, distStr, timeStr, dateStr].filter(Boolean).join(' · ');

        return `
          <div class="saved-trip-card">
            <div>
              <div class="st-title">📍 ${escHtml(t.tripId)}</div>
              <div class="st-meta">${metaParts}</div>
            </div>
            <div class="st-actions">
              <button class="btn-sm btn-sm-primary" onclick="window.loadSavedTripById('${escHtml(t.tripId)}')">Load</button>
              <button class="btn-sm btn-sm-danger" onclick="window.deleteSavedTripById('${escHtml(t.tripId)}')">✕</button>
            </div>
          </div>`;
      }).join('');
    } catch {
      listEl.innerHTML = '<div style="color:var(--danger);font-size:0.8rem;text-align:center;padding:20px 0">Failed to load saved trips</div>';
    }
  }

  window.loadSavedTripById = async function (tripId) {
    closeModal('modal-my-trips');
    showSpinner(true);
    const res = await fetch(`/api/trip/load/${encodeURIComponent(tripId)}`);
    if (!res.ok) {
      showToast('⚠️ Could not load trip', 'warning');
      showSpinner(false);
      return;
    }
    const data = await res.json();
    isManualReordered = false;
    document.getElementById('ai-comparison-banner')?.classList.add('hidden');
    await syncState();
    if (data.trip?.stops?.[0]) {
      mapRenderer.flyTo(data.trip.stops[0].lat, data.trip.stops[0].lon, 13);
    }
    showToast(`📂 Loaded trip: ${tripId}`);
  };

  window.deleteSavedTripById = async function (tripId) {
    if (!confirm(`Delete saved trip "${tripId}"?`)) return;
    await fetch(`/api/trip/${encodeURIComponent(tripId)}`, { method: 'DELETE' });
    showToast(`🗑️ Deleted ${tripId}`);
    openMyTripsModal();
  };

  /* ── EXPORT MODAL ───────────────────────────────────────────────*/
  document.getElementById('btn-export-close')?.addEventListener('click', () => closeModal('modal-export'));
  document.getElementById('btn-export-done')?.addEventListener('click',  () => closeModal('modal-export'));

  function buildGoogleMapsUrl() {
    if (!currentStops.length) return null;
    if (currentStops.length === 1) {
      return `https://www.google.com/maps/search/?api=1&query=${currentStops[0].lat},${currentStops[0].lon}`;
    }
    const origin = `${currentStops[0].lat},${currentStops[0].lon}`;
    const destination = isRoundTripActive
      ? origin
      : `${currentStops[currentStops.length - 1].lat},${currentStops[currentStops.length - 1].lon}`;
    const intermediateStops = isRoundTripActive
      ? currentStops.slice(1)
      : currentStops.slice(1, -1);
    const waypoints = intermediateStops.map((s) => `${s.lat},${s.lon}`).join('|');
    const mode = currentTransitMode === 'walking' ? 'walking' : currentTransitMode === 'cycling' ? 'bicycling' : 'driving';

    let url = `https://www.google.com/maps/dir/?api=1&origin=${origin}&destination=${destination}&travelmode=${mode}`;
    if (waypoints) url += `&waypoints=${waypoints}`;
    return url;
  }

  function buildMarkdownItinerary() {
    if (!currentStops.length) return 'No stops in itinerary.';
    const lines = [
      `# RouteFlow Itinerary Summary`,
      `Total Stops: ${currentStops.length}`,
      `Total Distance: ${lastReport ? lastReport.totalDistanceKm : 0} km`,
      `Total Duration: ${lastReport ? lastReport.totalTravelTimeMin : 0} mins`,
      `Departure Time: ${currentTripConfig.startTime || '09:00'}`,
      `Transit Mode: ${currentTransitMode.toUpperCase()}`,
      `Round Trip: ${isRoundTripActive ? 'Yes' : 'No'}`,
      '',
      `## Scheduled Sequence:`,
    ];

    currentStops.forEach((s, idx) => {
      const arr = s.scheduledArrival || '—';
      const dep = s.scheduledDeparture || arr;
      const dwell = s.dwellMin || 30;
      lines.push(`${idx + 1}. **${s.name}**`);
      lines.push(`   - 🕐 Arrive: ${arr} | Depart: ${dep} (${dwell}m visit)`);
      lines.push(`   - 📍 Coordinates: ${s.lat.toFixed(5)}, ${s.lon.toFixed(5)}`);
      if (s.reasoning && s.reasoning.length > 0) {
        lines.push(`   - 💡 Reasoning: ${s.reasoning.join('; ')}`);
      }
    });

    return lines.join('\n');
  }

  function openExportModal() {
    const preview = document.getElementById('export-preview-text');
    if (preview) preview.value = buildMarkdownItinerary();
    openModal('modal-export');
  }

  document.getElementById('btn-export-gmaps')?.addEventListener('click', () => {
    const url = buildGoogleMapsUrl();
    if (!url) { showToast('⚠️ Add stops first to navigate', 'warning'); return; }
    window.open(url, '_blank');
  });

  document.getElementById('btn-nav-gmaps')?.addEventListener('click', () => {
    const url = buildGoogleMapsUrl();
    if (!url) { showToast('⚠️ Add stops first to navigate', 'warning'); return; }
    window.open(url, '_blank');
  });

  document.getElementById('btn-export-copy')?.addEventListener('click', () => {
    const text = buildMarkdownItinerary();
    navigator.clipboard.writeText(text).then(() => {
      showToast('📋 Itinerary copied to clipboard!');
    }).catch(() => {
      showToast('⚠️ Clipboard copy failed', 'warning');
    });
  });

  document.getElementById('btn-export-gpx')?.addEventListener('click', () => {
    if (!currentStops.length) return;
    let gpx = `<?xml version="1.0" encoding="UTF-8"?>\n<gpx version="1.1" creator="RouteFlow">\n  <metadata><name>RouteFlow Itinerary</name></metadata>\n`;
    currentStops.forEach((s) => {
      gpx += `  <wpt lat="${s.lat}" lon="${s.lon}"><name>${escHtml(s.name)}</name></wpt>\n`;
    });
    gpx += `  <rte>\n    <name>RouteFlow Optimized Tour</name>\n`;
    currentStops.forEach((s) => {
      gpx += `    <rtept lat="${s.lat}" lon="${s.lon}"><name>${escHtml(s.name)}</name></rtept>\n`;
    });
    if (isRoundTripActive && currentStops.length > 1) {
      gpx += `    <rtept lat="${currentStops[0].lat}" lon="${currentStops[0].lon}"><name>${escHtml(currentStops[0].name)}</name></rtept>\n`;
    }
    gpx += `  </rte>\n</gpx>`;

    const blob = new Blob([gpx], { type: 'application/gpx+xml' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `routeflow-itinerary-${Date.now()}.gpx`;
    a.click();
    showToast('📁 GPX file downloaded');
  });

  document.getElementById('btn-export-geojson')?.addEventListener('click', () => {
    if (!currentStops.length) return;
    const features = currentStops.map((s, idx) => ({
      type: 'Feature',
      geometry: { type: 'Point', coordinates: [s.lon, s.lat] },
      properties: {
        sequence: idx + 1,
        name: s.name,
        scheduledArrival: s.scheduledArrival,
        scheduledDeparture: s.scheduledDeparture,
      },
    }));

    const coords = currentStops.map((s) => [s.lon, s.lat]);
    if (isRoundTripActive && currentStops.length > 1) coords.push([currentStops[0].lon, currentStops[0].lat]);

    features.push({
      type: 'Feature',
      geometry: { type: 'LineString', coordinates: coords },
      properties: { name: 'RouteFlow Sequence' },
    });

    const geojson = { type: 'FeatureCollection', features };
    const blob = new Blob([JSON.stringify(geojson, null, 2)], { type: 'application/geo+json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `routeflow-itinerary-${Date.now()}.geojson`;
    a.click();
    showToast('🌐 GeoJSON file downloaded');
  });

  document.getElementById('btn-export-print')?.addEventListener('click', () => {
    window.print();
  });

  /* ── GLOBAL HELPERS (called from popups & stop list) ────────────*/
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

  window.addPrecedencePrompt = function (stopId) {
    const stop = currentStops.find((s) => s.id === stopId);
    const otherStops = currentStops.filter((s) => s.id !== stopId);
    if (otherStops.length === 0) {
      showToast('⚠️ Add another stop first to configure a precedence rule', 'warning');
      return;
    }
    pendingPrecedenceStopId   = stopId;
    pendingPrecedenceStopName = stop?.name || stopId;
    const label = document.getElementById('modal-precedence-stopname');
    if (label) label.textContent = `Rule for: ${pendingPrecedenceStopName}`;

    const select = document.getElementById('select-precedes-stop');
    if (select) {
      select.innerHTML = otherStops
        .map((s, idx) => `<option value="${s.id}">Stop #${idx + 1}: ${escHtml(s.name)}</option>`)
        .join('');
    }
    openModal('modal-precedence');
  };

  window.removeConstraint = async function (stopId, constraintId) {
    const res = await fetch(`/api/stops/${stopId}/constraints/${constraintId}`, {
      method: 'DELETE',
    });
    if (res.ok) {
      showToast('🗑️ Constraint removed');
      await syncState();
    }
  };

  window.removeStop = async function (id) {
    await fetch(`/api/stops/${id}`, { method: 'DELETE' });
    await syncState();
  };

  /* ── MANUAL REORDER (MOVE UP / DOWN) ───────────────────────────*/
  window.moveStopUp = async function (index) {
    if (index <= 0 || index >= currentStops.length) return;
    const stopIds = currentStops.map((s) => s.id);
    const temp = stopIds[index];
    stopIds[index] = stopIds[index - 1];
    stopIds[index - 1] = temp;
    await applyManualReorder(stopIds);
  };

  window.moveStopDown = async function (index) {
    if (index < 0 || index >= currentStops.length - 1) return;
    const stopIds = currentStops.map((s) => s.id);
    const temp = stopIds[index];
    stopIds[index] = stopIds[index + 1];
    stopIds[index + 1] = temp;
    await applyManualReorder(stopIds);
  };

  async function applyManualReorder(orderedStopIds) {
    showSpinner(true);
    isManualReordered = true;
    await fetch('/api/stops/reorder', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ orderedStopIds }),
    });
    await syncState();
    showToast('↕️ Stops manually reordered');
  }

  window.reoptimizeRoute = async function () {
    showSpinner(true);
    isManualReordered = false;
    document.getElementById('ai-comparison-banner')?.classList.add('hidden');
    const activePreset = presetSelector?.getActive?.() || 'Fastest';
    await fetch('/api/presets/select', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ presetName: activePreset }),
    });
    await syncState();
    showToast('⚡ Route re-optimized with RouteFlow AI');
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

  /* ── PLACE SEARCH (OpenStreetMap Nominatim) ─────────────────────*/
  const inputSearch = document.getElementById('input-map-search');
  const searchResultsDropdown = document.getElementById('search-results-dropdown');
  const btnSearchClear = document.getElementById('btn-search-clear');
  let searchDebounceTimer = null;

  inputSearch?.addEventListener('input', () => {
    const q = inputSearch.value.trim();
    btnSearchClear?.classList.toggle('hidden', !q);
    clearTimeout(searchDebounceTimer);
    if (!q || q.length < 2) {
      if (searchResultsDropdown) searchResultsDropdown.classList.add('hidden');
      return;
    }
    searchDebounceTimer = setTimeout(async () => {
      try {
        const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(q)}&limit=5&addressdetails=1`;
        const res = await fetch(url, { headers: { 'Accept-Language': 'en' } });
        if (!res.ok) return;
        const results = await res.json();
        renderSearchResults(results);
      } catch {
        // network or rate limit
      }
    }, 350);
  });

  btnSearchClear?.addEventListener('click', () => {
    if (inputSearch) inputSearch.value = '';
    btnSearchClear.classList.add('hidden');
    searchResultsDropdown?.classList.add('hidden');
  });

  function renderSearchResults(results) {
    if (!searchResultsDropdown) return;
    if (!results || results.length === 0) {
      searchResultsDropdown.innerHTML = '<div style="padding:10px 14px;font-size:0.75rem;color:var(--text-muted)">No matching places found</div>';
      searchResultsDropdown.classList.remove('hidden');
      return;
    }

    searchResultsDropdown.innerHTML = results.map((r) => {
      const parts = r.display_name.split(',');
      const title = parts[0];
      const desc = parts.slice(1, 4).join(',').trim();
      const icon = r.type === 'city' || r.type === 'administrative' ? '🏙️' : r.class === 'tourism' ? '🏛️' : '📍';
      return `
        <div class="search-result-item" data-lat="${r.lat}" data-lon="${r.lon}" data-name="${escHtml(title)}">
          <span class="sr-icon">${icon}</span>
          <div class="sr-text">
            <div class="sr-title">${escHtml(title)}</div>
            <div class="sr-desc">${escHtml(desc)}</div>
          </div>
        </div>`;
    }).join('');

    searchResultsDropdown.classList.remove('hidden');

    searchResultsDropdown.querySelectorAll('.search-result-item').forEach((item) => {
      item.addEventListener('click', () => {
        const lat = parseFloat(item.dataset.lat);
        const lon = parseFloat(item.dataset.lon);
        const name = item.dataset.name;
        searchResultsDropdown.classList.add('hidden');
        if (inputSearch) inputSearch.value = name;
        mapRenderer.showSearchResult(lat, lon, name, async (stopName, stopLat, stopLon) => {
          await addStop(stopName, stopLat, stopLon);
        });
      });
    });
  }

  // Close search dropdown on click outside
  document.addEventListener('click', (e) => {
    if (!document.getElementById('map-search-bar')?.contains(e.target)) {
      searchResultsDropdown?.classList.add('hidden');
    }
  });

  /* ── TRANSIT MODE CONTROLS ──────────────────────────────────────*/
  document.getElementById('transit-mode-pills')?.addEventListener('click', async (e) => {
    const btn = e.target.closest('.mode-pill');
    if (!btn) return;
    document.querySelectorAll('.mode-pill').forEach((b) => b.classList.remove('active'));
    btn.classList.add('active');
    currentTransitMode = btn.dataset.mode || 'driving';
    mapRenderer.setTransitMode(currentTransitMode);

    await fetch('/api/trip/config', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        startTime: currentTripConfig.startTime || '09:00',
        startLat: currentTripConfig.startLat,
        startLon: currentTripConfig.startLon,
        transitMode: currentTransitMode,
        roundTrip: isRoundTripActive,
      }),
    });
    await syncState();
    showToast(`Mode set to ${btn.textContent.trim()}`);
  });

  /* ── FIT ROUTE BUTTON ───────────────────────────────────────────*/
  document.getElementById('btn-fit-route')?.addEventListener('click', () => {
    mapRenderer.fitRoute();
  });

  /* ── ROUND TRIP TOGGLE ──────────────────────────────────────────*/
  const chkRoundTrip = document.getElementById('chk-round-trip');
  chkRoundTrip?.addEventListener('change', async () => {
    isRoundTripActive = Boolean(chkRoundTrip.checked);
    await fetch('/api/trip/config', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        startTime: currentTripConfig.startTime || '09:00',
        startLat: currentTripConfig.startLat,
        startLon: currentTripConfig.startLon,
        transitMode: currentTransitMode,
        roundTrip: isRoundTripActive,
      }),
    });
    await syncState();
    showToast(isRoundTripActive ? '🔄 Round trip loop enabled' : '➡️ One-way tour enabled');
  });

  /* ── DEPARTURE TIME INPUT ───────────────────────────────────────*/
  const inputTripStart = document.getElementById('input-trip-start-time');
  inputTripStart?.addEventListener('change', async () => {
    const startTime = inputTripStart.value;
    if (!startTime) return;
    await fetch('/api/trip/config', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        startTime,
        startLat: currentTripConfig.startLat,
        startLon: currentTripConfig.startLon,
        transitMode: currentTransitMode,
        roundTrip: isRoundTripActive,
      }),
    });
    await syncState();
    showToast(`⏰ Trip departure time set to ${startTime}`);
  });

  /* ── WEIGHT SLIDER PANEL ────────────────────────────────────────*/
  const sliderPanel = new WeightSliderPanel('slider-panel', async (weights) => {
    isManualReordered = false;
    document.getElementById('ai-comparison-banner')?.classList.add('hidden');
    await fetch('/api/weights', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(weights),
    });
    await syncState();
  });

  /* ── PRESET SELECTOR ────────────────────────────────────────────*/
  const presetSelector = new PresetSelector('preset-container', async (presetName) => {
    isManualReordered = false;
    document.getElementById('ai-comparison-banner')?.classList.add('hidden');
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
    isManualReordered = false;
    document.getElementById('ai-comparison-banner')?.classList.add('hidden');

    // Clear existing stops first
    for (const s of [...currentStops]) {
      await fetch(`/api/stops/${s.id}`, { method: 'DELETE' });
    }

    // Set trip departure config directly for the selected city coordinates!
    currentTripConfig = {
      startTime: currentTripConfig.startTime || '09:00',
      startLat: trip.centerLat,
      startLon: trip.centerLon,
      transitMode: currentTransitMode,
      roundTrip: isRoundTripActive,
    };
    await fetch('/api/trip/config', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(currentTripConfig),
    });

    // Fly the map to the city centre before stops render
    mapRenderer.flyTo(trip.centerLat, trip.centerLon, trip.zoom);

    // Load new stops with realistic visit duration (30 min)
    for (const stop of trip.stops) {
      await fetch('/api/stops', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...stop, dwellMin: 30 }),
      });
    }

    await syncState();
    showToast(`${trip.flag} ${trip.name} trip loaded!`);

    const chip = document.getElementById('header-active-city-chip');
    const chipName = document.getElementById('header-active-city-name');
    if (chip && chipName) {
      chipName.textContent = `${trip.flag} ${trip.name}`;
      chip.classList.remove('hidden');
    }
    window.switchSidebarTab?.('tab-itinerary');
  };

  /* ── SIDEBAR TAB SWITCHING ──────────────────────────────────────*/
  window.switchSidebarTab = function (tabId) {
    document.querySelectorAll('.s-tab').forEach((tab) => {
      tab.classList.toggle('active', tab.dataset.tab === tabId);
    });
    document.querySelectorAll('.tab-pane').forEach((pane) => {
      pane.classList.toggle('active', pane.id === tabId);
    });
  };

  document.querySelectorAll('.s-tab').forEach((tab) => {
    tab.addEventListener('click', () => {
      window.switchSidebarTab(tab.dataset.tab);
    });
  });

  // Wire header buttons
  document.getElementById('btn-sample-data')?.addEventListener('click', () => {
    window.switchSidebarTab('tab-explore');
    renderTripCards(activeRegion);
  });

  // Sidebar collapse toggle button
  document.getElementById('btn-toggle-sidebar')?.addEventListener('click', () => {
    const layout = document.getElementById('app-layout');
    layout?.classList.toggle('sidebar-collapsed');
    setTimeout(() => {
      mapRenderer?.map?.invalidateSize();
    }, 250);
  });

  // Shortcuts modal
  document.getElementById('btn-shortcuts')?.addEventListener('click', () => {
    openModal('modal-shortcuts');
  });
  document.getElementById('btn-shortcuts-close')?.addEventListener('click', () => {
    closeModal('modal-shortcuts');
  });
  document.getElementById('btn-shortcuts-done')?.addEventListener('click', () => {
    closeModal('modal-shortcuts');
  });

  // Global Keyboard Shortcuts
  window.addEventListener('keydown', (e) => {
    const activeEl = document.activeElement;
    const tag = activeEl?.tagName?.toLowerCase();
    if (tag === 'input' || tag === 'textarea' || tag === 'select') {
      if (e.key === 'Escape') {
        activeEl.blur();
        closeAllModals();
        document.getElementById('search-results-dropdown')?.classList.add('hidden');
      }
      return;
    }

    if (e.key === '/') {
      e.preventDefault();
      const searchInput = document.getElementById('input-map-search');
      searchInput?.focus();
      searchInput?.select();
    } else if (e.key.toLowerCase() === 'f') {
      mapRenderer?.fitRoute();
    } else if (e.key.toLowerCase() === 'b') {
      document.getElementById('app-layout')?.classList.toggle('sidebar-collapsed');
      setTimeout(() => mapRenderer?.map?.invalidateSize(), 250);
    } else if (e.key === '1') {
      window.switchSidebarTab('tab-itinerary');
    } else if (e.key === '2') {
      window.switchSidebarTab('tab-tuning');
    } else if (e.key === '3') {
      window.switchSidebarTab('tab-explore');
    } else if (e.key === '?') {
      openModal('modal-shortcuts');
    } else if (e.key === 'Escape') {
      closeAllModals();
      document.getElementById('search-results-dropdown')?.classList.add('hidden');
    }
  });

  document.getElementById('btn-save-trip')?.addEventListener('click', () => {
    const inputTripName = document.getElementById('input-save-trip-name');
    if (inputTripName) inputTripName.value = `My-Trip-${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    openModal('modal-save-trip');
  });

  document.getElementById('btn-my-trips')?.addEventListener('click', () => {
    openMyTripsModal();
  });

  document.getElementById('btn-export')?.addEventListener('click', () => {
    openExportModal();
  });

  document.getElementById('btn-clear-all')?.addEventListener('click', async () => {
    if (!currentStops.length) return;
    showSpinner(true);
    isManualReordered = false;
    document.getElementById('ai-comparison-banner')?.classList.add('hidden');
    document.getElementById('header-active-city-chip')?.classList.add('hidden');
    for (const s of [...currentStops]) {
      await fetch(`/api/stops/${s.id}`, { method: 'DELETE' });
    }
    await syncState();
    showToast('🗑️ All stops cleared');
  });

  // Initial render of sample cards
  renderTripCards('asia');

  /* ── CORE ADD STOP ──────────────────────────────────────────────*/
  async function addStop(name, lat, lon, prefStart = null, prefEnd = null, dwellMin = 30) {
    showSpinner(true);

    // If canvas was empty, anchor trip start location to the first stop!
    if (currentStops.length === 0) {
      currentTripConfig = {
        startTime: currentTripConfig.startTime || '09:00',
        startLat: lat,
        startLon: lon,
        transitMode: currentTransitMode,
        roundTrip: isRoundTripActive,
      };
      await fetch('/api/trip/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(currentTripConfig),
      });
    }

    await fetch('/api/stops', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, lat, lon, prefStart, prefEnd, dwellMin }),
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
      lastReport = report;
      currentStops = (state.rawRoute ? state.rawRoute.stops : state.stops) || [];

      // Trip config sync
      if (state.tripConfig) {
        currentTripConfig = state.tripConfig;
        const depInput = document.getElementById('input-trip-start-time');
        if (depInput && state.tripConfig.startTime && depInput !== document.activeElement) {
          depInput.value = state.tripConfig.startTime;
        }
      }

      // Track AI baseline stats for comparison banner
      if (!isManualReordered && currentStops.length >= 2) {
        originalAiRouteStats = {
          distanceKm: report.totalDistanceKm,
          travelTimeMin: report.totalTravelTimeMin,
        };
      }

      // Update AI Comparison Banner
      const compBanner = document.getElementById('ai-comparison-banner');
      if (compBanner) {
        if (isManualReordered && originalAiRouteStats && currentStops.length >= 2) {
          const diffKm = Number((report.totalDistanceKm - originalAiRouteStats.distanceKm).toFixed(1));
          const diffTime = Math.round(report.totalTravelTimeMin - originalAiRouteStats.travelTimeMin);
          const aiSavings = diffKm > 0
            ? `AI saves ${diffKm} km & ${diffTime > 0 ? diffTime : 0} min`
            : `AI and custom sequences are balanced`;

          compBanner.innerHTML = `
            <div>
              <b>Custom Sequence:</b> ${report.totalDistanceKm} km · ${report.totalTravelTimeMin} min
              <span style="display:block;font-size:0.67rem;color:var(--text-dim);margin-top:1px">${aiSavings}</span>
            </div>
            <button class="btn-reoptimize" onclick="window.reoptimizeRoute()">⚡ AI Optimize</button>`;
          compBanner.classList.remove('hidden');
        } else {
          compBanner.classList.add('hidden');
        }
      }

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

      // Map polyline & markers
      mapRenderer.renderStops(currentStops);
      mapRenderer.renderRoutePolyline(state.rawRoute, currentTransitMode);

      // Score breakdown card
      scoreCard.render(state.scoreBreakdown);

      // Stop count badge
      document.getElementById('badge-count').textContent =
        `${currentStops.length} Stop${currentStops.length !== 1 ? 's' : ''}`;

      // Stops list with connecting legs, dwell times, and explainability tags
      renderStopList(currentStops, report);

      // Preset badge + active pill
      if (state.activePreset) {
        const badgePreset = document.getElementById('badge-preset');
        if (badgePreset) badgePreset.textContent = state.activePreset;
        presetSelector.setActive(state.activePreset);
      }

      // Toast hint
      const toast = document.getElementById('map-toast');
      if (toast) toast.classList.toggle('hidden', currentStops.length > 0);

    } catch (err) {
      console.error('syncState error', err);
    } finally {
      showSpinner(false);
    }
  }

  /* ── STOP LIST RENDERER (with timeline, legs, & explainability) ──*/
  function renderStopList(stops, report = null) {
    const container = document.getElementById('stops-container');
    if (!stops.length) {
      container.innerHTML = `<div class="empty-state"><span class="icon">📍</span>Search a place above or click on the map to add stops</div>`;
      return;
    }

    const legs = report?.legs || [];
    let html = '';

    stops.forEach((s, idx) => {
      // If not the first stop, render the connecting leg connector
      if (idx > 0 && legs[idx - 1]) {
        const leg = legs[idx - 1];
        const modeIcon = currentTransitMode === 'walking' ? '🚶' : currentTransitMode === 'cycling' ? '🚲' : '🚗';
        html += `
          <div class="leg-connector">
            <span class="leg-badge">${modeIcon} ${leg.distanceKm} km · ${leg.travelTimeMin} min</span>
          </div>`;
      }

      // Constraint tags
      const constraintBadges = [];
      if (s.constraints && Array.isArray(s.constraints)) {
        for (const c of s.constraints) {
          const cType = c.name || c.type;
          const cId = c.id || c.constraint_id;
          if (cType === 'OPENING_HOURS') {
            const ot = c.openTime || c.open_time;
            const ct = c.closeTime || c.close_time;
            constraintBadges.push(
              `<span class="tag tag-constraint" title="Opening Hours">🕐 ${ot}–${ct} <button class="tag-del" title="Remove constraint" onclick="window.removeConstraint('${s.id}','${cId}')">✕</button></span>`
            );
          } else if (cType === 'PRECEDENCE') {
            const targetId = c.precedesStopId || c.precedes_stop_id;
            const targetStop = currentStops.find((st) => st.id === targetId);
            const targetName = targetStop?.name ? targetStop.name.slice(0, 16) : 'Stop';
            constraintBadges.push(
              `<span class="tag tag-constraint" title="Precedence Rule">🔀 Before: ${escHtml(targetName)} <button class="tag-del" title="Remove constraint" onclick="window.removeConstraint('${s.id}','${cId}')">✕</button></span>`
            );
          }
        }
      }
      if (s.prefStart && s.prefEnd) {
        constraintBadges.push(
          `<span class="tag tag-pref" title="User Preferred Arrival Time">🎯 ${s.prefStart}–${s.prefEnd}</span>`
        );
      }

      // Timing info
      const arr = s.scheduledArrival || '—';
      const dep = s.scheduledDeparture || arr;
      const dwell = s.dwellMin || 30;

      // Explainability reasons
      const reasonTag = s.reasoning && s.reasoning[0]
        ? `<div class="chip-reason">💡 ${escHtml(s.reasoning[0])}</div>`
        : '';

      // Environmental factors
      let envPills = '';
      if (s.factors) {
        const wScore = Math.round((s.factors.weatherScore || 0) * 100);
        const cScore = Math.round((s.factors.crowdScore || 0) * 100);
        const sScore = Math.round((s.factors.scenicScore || 0) * 100);
        envPills = `
          <div class="factor-mini-pills">
            <span class="f-pill f-pill-weather" title="Weather Pleasantness">🌤️ ${wScore}%</span>
            <span class="f-pill f-pill-crowd"   title="Inverse Crowd Density">👥 ${cScore}%</span>
            <span class="f-pill f-pill-scenic"  title="Scenic Rating">🌲 ${sScore}%</span>
          </div>`;
      }

      // Up/Down reordering controls
      const canMoveUp = idx > 0;
      const canMoveDown = idx < stops.length - 1;

      html += `
        <div class="stop-item" id="stop-card-${s.id}"
          onmouseenter="mapRenderer.highlightMarker('${s.id}', true)"
          onmouseleave="mapRenderer.highlightMarker('${s.id}', false)">
          <div class="stop-badge" onclick="mapRenderer.flyTo(${s.lat}, ${s.lon}, 15)" style="cursor:pointer" title="Zoom to stop">${idx + 1}</div>
          <div class="stop-info">
            <div class="stop-title" onclick="mapRenderer.flyTo(${s.lat}, ${s.lon}, 15)" style="cursor:pointer" title="Zoom to stop">${escHtml(s.name)}</div>
            <div class="stop-meta">
              <span class="tag" style="background:rgba(56,189,248,0.1);color:var(--primary);border-color:rgba(56,189,248,0.25)">
                🕐 ${arr} → ${dep} <span style="opacity:0.7">(${dwell}m)</span>
              </span>
              <span style="color:var(--text-muted);font-size:0.67rem">${s.lat.toFixed(4)}, ${s.lon.toFixed(4)}</span>
              ${constraintBadges.join(' ')}
            </div>
            ${reasonTag}
            ${envPills}
          </div>
          <div class="stop-actions">
            ${canMoveUp ? `<button class="btn-icon" title="Move stop earlier in sequence" onclick="window.moveStopUp(${idx})">▲</button>` : ''}
            ${canMoveDown ? `<button class="btn-icon" title="Move stop later in sequence" onclick="window.moveStopDown(${idx})">▼</button>` : ''}
            <button class="btn-icon btn-icon-info"      title="Set opening hours"        onclick="window.addOpeningHoursPrompt('${s.id}')">🕐</button>
            <button class="btn-icon btn-icon-secondary" title="Set precedence order rule" onclick="window.addPrecedencePrompt('${s.id}')">🔀</button>
            <button class="btn-icon btn-icon-danger"    title="Remove stop"              onclick="window.removeStop('${s.id}')">✕</button>
          </div>
        </div>`;
    });

    container.innerHTML = html;
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

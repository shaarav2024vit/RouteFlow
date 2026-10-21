// RouteFlow Client Controller
let map = null;
let markersLayer = null;
let polylineLayer = null;
let esriDarkLayer = null;
let esriLightLayer = null;
let osmLayer = null;
let osmDarkLayer = null;
let hotLayer = null;
let customTileLayer = null;
let currentStops = [];
let currentTripConfig = null;
let activePreset = 'BALANCED';
let isRoundTrip = false;

// Weight tuner state — mirrors BALANCED preset defaults
const WEIGHT_DEFAULTS = {
  travelTime: 25,
  timeWindowFit: 20,
  crowdAvoidance: 20,
  scenic: 15,
  attractionsOpen: 20,
  mustVisit: 0,
};

// Seed values for slider positions per preset
const PRESET_SEEDS = {
  BALANCED:        { travelTime: 25, timeWindowFit: 20, crowdAvoidance: 20, scenic: 15, attractionsOpen: 20, mustVisit: 0 },
  FASTEST:         { travelTime: 60, timeWindowFit: 20, crowdAvoidance:  5, scenic:  5, attractionsOpen: 10, mustVisit: 0 },
  CROWD_AVOIDER:   { travelTime: 15, timeWindowFit: 15, crowdAvoidance: 45, scenic: 10, attractionsOpen: 15, mustVisit: 0 },
  SCENIC_EXPLORER: { travelTime: 15, timeWindowFit: 15, crowdAvoidance: 10, scenic: 45, attractionsOpen: 15, mustVisit: 0 },
  MOST_OPEN:       { travelTime: 15, timeWindowFit: 15, crowdAvoidance: 10, scenic: 10, attractionsOpen: 50, mustVisit: 0 },
};

const SEGMENT_COLORS = ['#0284c7', '#38bdf8', '#10b981', '#f59e0b', '#a78bfa', '#f43f5e'];

// Toast Notification Helper
function showToast(message, type = 'info') {
  const container = document.getElementById('toastContainer');
  if (!container) return;
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.innerHTML = `<span>${message}</span>`;
  container.appendChild(toast);
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(-8px) scale(0.96)';
    setTimeout(() => toast.remove(), 250);
  }, 3200);
}

// Reposition a stop via drag
async function repositionStop(stopId, lat, lon) {
  try {
    const res = await fetch(`/api/stops/${stopId}/reposition`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ lat, lon }),
    });
    if (res.ok) {
      showToast('Stop location updated.', 'success');
      await loadTripState();
      await planRoute(activePreset);
    }
  } catch (err) {
    showToast('Failed to reposition stop.', 'error');
  }
}

// Initialize Leaflet Map
function initMap() {
  if (typeof L === 'undefined') {
    return;
  }

  L.Icon.Default.imagePath = '/vendor/leaflet/images/';

  map = L.map('map', {
    zoomControl: true,
  }).setView([48.8584, 2.2945], 13);

  // 1. Standard OpenStreetMap (100% Free, Official, No API Key Required)
  osmLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    subdomains: ['a', 'b', 'c'],
    maxZoom: 19,
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a> contributors',
  });

  // 2. OpenStreetMap with Dark Mode CSS Filter (100% Free, No API Key Required)
  osmDarkLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    subdomains: ['a', 'b', 'c'],
    maxZoom: 19,
    className: 'osm-dark-tiles',
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a> contributors',
  });

  // 3. Esri World Dark Gray Canvas (World-class dark canvas, 100% Free, No Key Required, No Watermark)
  esriDarkLayer = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}', {
    maxZoom: 19,
    maxNativeZoom: 16,
    attribution: 'Tiles &copy; Esri &mdash; Esri, DeLorme, NAVTEQ',
  });

  // 4. Esri World Light Gray Canvas (World-class light canvas, 100% Free, No Key Required)
  esriLightLayer = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}', {
    maxZoom: 19,
    maxNativeZoom: 16,
    attribution: 'Tiles &copy; Esri &mdash; Esri, DeLorme, NAVTEQ',
  });

  // 5. Humanitarian OpenStreetMap (High-contrast, 100% Free, No Key)
  hotLayer = L.tileLayer('https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png', {
    subdomains: ['a', 'b', 'c'],
    maxZoom: 19,
    attribution: '&copy; OpenStreetMap contributors, Tiles courtesy of Humanitarian OpenStreetMap Team',
  });

  // Automatic tileerror fallback to standard OpenStreetMap (ensures zero broken tile squares)
  const fallbackToOSM = () => {
    if (map && !map.hasLayer(osmLayer)) {
      [esriDarkLayer, esriLightLayer, osmDarkLayer, hotLayer, customTileLayer].forEach((l) => {
        if (l && map.hasLayer(l)) map.removeLayer(l);
      });
      osmLayer.addTo(map);
    }
  };
  esriDarkLayer.on('tileerror', fallbackToOSM);
  esriLightLayer.on('tileerror', fallbackToOSM);
  osmDarkLayer.on('tileerror', fallbackToOSM);
  hotLayer.on('tileerror', fallbackToOSM);

  const savedTheme = localStorage.getItem('routeflow_theme') || 'dark';
  let savedProvider = localStorage.getItem('routeflow_map_provider') || 'auto';
  // Migrate away from any legacy carto values
  if (savedProvider === 'carto_dark' || savedProvider === 'carto_light') {
    savedProvider = 'auto';
    localStorage.setItem('routeflow_map_provider', 'auto');
  }

  if (savedProvider === 'osm') {
    osmLayer.addTo(map);
  } else if (savedProvider === 'osm_dark') {
    osmDarkLayer.addTo(map);
  } else if (savedProvider === 'esri_dark') {
    esriDarkLayer.addTo(map);
  } else if (savedProvider === 'esri_light') {
    esriLightLayer.addTo(map);
  } else if (savedProvider === 'hot') {
    hotLayer.addTo(map);
  } else if (savedProvider === 'custom') {
    const savedKey = localStorage.getItem('routeflow_map_key') || '';
    if (savedKey) {
      applyCustomMapKey(savedKey);
    } else {
      if (savedTheme === 'light') esriLightLayer.addTo(map);
      else esriDarkLayer.addTo(map);
    }
  } else {
    // Auto mode matches theme
    if (savedTheme === 'light') {
      esriLightLayer.addTo(map);
    } else {
      esriDarkLayer.addTo(map);
    }
  }

  const baseLayers = {
    'Auto Theme': esriDarkLayer,
    'Esri Dark Gray (No Key)': esriDarkLayer,
    'OpenStreetMap (No Key)': osmLayer,
    'OSM Dark Inverted (No Key)': osmDarkLayer,
    'Esri Light Gray (No Key)': esriLightLayer,
    'Humanitarian OSM (No Key)': hotLayer,
  };
  L.control.layers(baseLayers, null, { position: 'topright' }).addTo(map);

  markersLayer = L.layerGroup().addTo(map);
  polylineLayer = L.layerGroup().addTo(map);

  // Multi-stage auto-resize to guarantee zero grey tiles
  setTimeout(() => { if (map) map.invalidateSize(); }, 60);
  setTimeout(() => { if (map) map.invalidateSize(); }, 250);
  setTimeout(() => { if (map) map.invalidateSize(); }, 700);
  window.addEventListener('resize', () => { if (map) map.invalidateSize(); });

  // Map click opens an in-map popup (smooth, no native prompt)
  map.on('click', (e) => {
    const lat = Number(e.latlng.lat.toFixed(5));
    const lon = Number(e.latlng.lng.toFixed(5));

    const popupContent = document.createElement('div');
    popupContent.style.padding = '4px';
    popupContent.innerHTML = `
      <div style="font-size:12px; font-weight:700; margin-bottom:2px; color:#38bdf8;">Add Waypoint</div>
      <div style="font-size:11px; color:#94a3b8; margin-bottom:6px;">${lat}, ${lon}</div>
      <input type="text" id="mapPopupName" placeholder="Destination name..." style="width:100%; font-size:12px; padding:6px 8px; background:#0f172a; color:#f8fafc; border:1px solid #334155; border-radius:4px; margin-bottom:6px; outline:none; box-sizing:border-box;">
      <button id="btnMapPopupAdd" style="background:#0284c7; color:#fff; border:none; border-radius:4px; padding:6px 10px; font-size:11px; font-weight:600; cursor:pointer; width:100%;">Add Stop Here</button>
    `;

    L.popup()
      .setLatLng([lat, lon])
      .setContent(popupContent)
      .openOn(map);

    setTimeout(() => {
      const input = popupContent.querySelector('#mapPopupName');
      const btn = popupContent.querySelector('#btnMapPopupAdd');
      if (input) input.focus();

      const submitAdd = async () => {
        const val = input.value.trim();
        if (val) {
          map.closePopup();
          await addNewStop(val, lat, lon);
        }
      };

      if (btn) btn.onclick = submitAdd;
      if (input) {
        input.onkeydown = (ke) => {
          if (ke.key === 'Enter') submitAdd();
        };
      }
    }, 50);
  });

  setTimeout(() => { if (map) map.invalidateSize(); }, 150);
}

// App Initialization
async function initApp() {
  initMap();
  setupWeightTuner();
  setupEventListeners();
  await loadSavedTripsList();
  await loadTripState();
  await planRoute(activePreset);
}

// Theme Management
function initTheme() {
  const savedTheme = localStorage.getItem('routeflow_theme') || 'dark';
  applyTheme(savedTheme);

  const toggleBtn = document.getElementById('btnThemeToggle');
  if (toggleBtn) {
    toggleBtn.addEventListener('click', () => {
      const current = document.documentElement.getAttribute('data-theme') || 'dark';
      const next = current === 'dark' ? 'light' : 'dark';
      applyTheme(next);
      localStorage.setItem('routeflow_theme', next);
    });
  }
}

function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  const icon = document.getElementById('themeToggleIcon');
  const text = document.getElementById('themeToggleText');
  if (icon) icon.textContent = theme === 'dark' ? '☀️' : '🌙';
  if (text) text.textContent = theme === 'dark' ? 'Light' : 'Dark';

  const savedProvider = localStorage.getItem('routeflow_map_provider') || 'auto';
  if (savedProvider === 'auto' && map && esriDarkLayer && esriLightLayer) {
    if (theme === 'dark') {
      if (map.hasLayer(esriLightLayer)) map.removeLayer(esriLightLayer);
      if (map.hasLayer(osmLayer)) map.removeLayer(osmLayer);
      if (map.hasLayer(osmDarkLayer)) map.removeLayer(osmDarkLayer);
      if (!map.hasLayer(esriDarkLayer)) esriDarkLayer.addTo(map);
    } else {
      if (map.hasLayer(esriDarkLayer)) map.removeLayer(esriDarkLayer);
      if (map.hasLayer(osmLayer)) map.removeLayer(osmLayer);
      if (map.hasLayer(osmDarkLayer)) map.removeLayer(osmDarkLayer);
      if (!map.hasLayer(esriLightLayer)) esriLightLayer.addTo(map);
    }
  }
}

// Map Tile Source & Provider settings (100% Free, No API Key Required)
function setupMapProviderSettings() {
  const select = document.getElementById('mapProviderSelect');
  const customRow = document.getElementById('customApiKeyRow');
  const keyInput = document.getElementById('mapApiKeyInput');
  const statusEl = document.querySelector('.status-badge-free');
  if (!select) return;

  let savedProvider = localStorage.getItem('routeflow_map_provider') || 'auto';
  if (savedProvider === 'carto_dark' || savedProvider === 'carto_light') {
    savedProvider = 'auto';
    localStorage.setItem('routeflow_map_provider', 'auto');
  }
  select.value = savedProvider;
  if (savedProvider === 'custom' && customRow) customRow.classList.remove('hidden');

  const savedKey = localStorage.getItem('routeflow_map_key') || '';
  if (keyInput) keyInput.value = savedKey;

  const updateStatusText = (val) => {
    if (!statusEl) return;
    if (val === 'custom') {
      statusEl.textContent = 'Custom Tile Layer Active';
      statusEl.style.color = 'var(--accent-blue)';
    } else {
      statusEl.textContent = '✓ 100% Free & Open-Source — No API Key Required';
      statusEl.style.color = 'var(--accent-green)';
    }
  };
  updateStatusText(savedProvider);

  select.addEventListener('change', () => {
    const val = select.value;
    localStorage.setItem('routeflow_map_provider', val);
    updateStatusText(val);

    if (val === 'custom') {
      if (customRow) customRow.classList.remove('hidden');
      applyCustomMapKey(keyInput ? keyInput.value.trim() : '');
    } else {
      if (customRow) customRow.classList.add('hidden');
      [osmLayer, osmDarkLayer, esriDarkLayer, esriLightLayer, hotLayer, customTileLayer].forEach((layer) => {
        if (layer && map.hasLayer(layer)) map.removeLayer(layer);
      });

      const currentTheme = document.documentElement.getAttribute('data-theme') || 'dark';
      if (val === 'osm') osmLayer.addTo(map);
      else if (val === 'osm_dark') osmDarkLayer.addTo(map);
      else if (val === 'esri_dark') esriDarkLayer.addTo(map);
      else if (val === 'esri_light') esriLightLayer.addTo(map);
      else if (val === 'hot') hotLayer.addTo(map);
      else {
        // Auto
        if (currentTheme === 'light') esriLightLayer.addTo(map);
        else esriDarkLayer.addTo(map);
      }
      showToast('Map tile layer updated (100% free, no API key needed).', 'info');
    }
  });

  if (keyInput) {
    keyInput.addEventListener('change', () => {
      const key = keyInput.value.trim();
      localStorage.setItem('routeflow_map_key', key);
      if (select.value === 'custom') {
        applyCustomMapKey(key);
      }
    });
  }
}

function applyCustomMapKey(key) {
  if (!key) {
    showToast('Please enter a tile URL template or Mapbox token.', 'info');
    return;
  }
  let tileUrl = key;
  if (!key.startsWith('http')) {
    // Mapbox access token format
    tileUrl = `https://api.mapbox.com/styles/v1/mapbox/streets-v11/tiles/{z}/{x}/{y}?access_token=${key}`;
  }
  try {
    if (customTileLayer && map.hasLayer(customTileLayer)) {
      map.removeLayer(customTileLayer);
    }
    [osmLayer, osmDarkLayer, esriDarkLayer, esriLightLayer, hotLayer].forEach((layer) => {
      if (layer && map.hasLayer(layer)) map.removeLayer(layer);
    });
    customTileLayer = L.tileLayer(tileUrl, { maxZoom: 19, attribution: 'Custom Tile Provider' });
    customTileLayer.on('tileerror', () => {
      showToast('Custom tile error. Falling back to OpenStreetMap.', 'error');
      if (map && !map.hasLayer(osmLayer)) osmLayer.addTo(map);
    });
    customTileLayer.addTo(map);
    showToast('Custom map tile layer connected.', 'success');
  } catch (err) {
    showToast('Invalid custom tile URL or token.', 'error');
  }
}

// UI Event Handlers
function setupEventListeners() {
  initTheme();
  setupMapProviderSettings();

  // Quick departure sync
  const quickStart = document.getElementById('quickStartTime');
  const fullStart = document.getElementById('startTimeInput');
  if (quickStart) {
    quickStart.addEventListener('change', async () => {
      if (fullStart) fullStart.value = quickStart.value;
      const startTime = quickStart.value || '09:00';
      const coordsStr = document.getElementById('startCoordsInput')?.value || '48.8584, 2.2945';
      const parts = coordsStr.split(',').map((p) => parseFloat(p.trim()));
      const startLat = (parts.length === 2 && !isNaN(parts[0])) ? parts[0] : 48.8584;
      const startLon = (parts.length === 2 && !isNaN(parts[1])) ? parts[1] : 2.2945;
      try {
        await fetch('/api/trip-config', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ startTime, startLat, startLon, roundTrip: isRoundTrip }),
        });
        await planRoute(activePreset);
      } catch (err) {
        showToast('Failed to update departure time.', 'error');
      }
    });
  }
  // Strategy Preset selector — CUSTOM toggle is handled in setupWeightTuner
  document.querySelectorAll('.strategy-btn:not(#btnToggleWeightTuner)').forEach((btn) => {
    btn.addEventListener('click', async (e) => {
      document.querySelectorAll('.strategy-btn').forEach((b) => b.classList.remove('active'));
      e.target.classList.add('active');
      activePreset = e.target.dataset.preset;
      // Close tuner drawer when switching to a fixed preset
      document.getElementById('weightTunerDrawer').classList.add('hidden');
      // Seed sliders to match selected preset for context
      if (PRESET_SEEDS[activePreset]) seedSlidersFromPreset(activePreset);
      await planRoute(activePreset);
    });
  });

  // Optimize button
  document.getElementById('btnOptimize').addEventListener('click', () => {
    planRoute(activePreset);
  });

  // Example trips
  document.getElementById('sampleTripSelect').addEventListener('change', async (e) => {
    const key = e.target.value;
    try {
      const res = await fetch(`/api/samples/${key}/load`, { method: 'POST' });
      if (res.ok) {
        await loadTripState();
        await planRoute(activePreset);
      }
    } catch (err) {
      console.error('Failed to load example trip', err);
    }
  });

  // Saved database trips
  const savedTripsSelect = document.getElementById('savedTripsSelect');
  if (savedTripsSelect) {
    savedTripsSelect.addEventListener('change', async (e) => {
      const tripId = e.target.value;
      if (!tripId) return;
      try {
        const res = await fetch(`/api/trips/${tripId}/load`, { method: 'POST' });
        if (res.ok) {
          await loadTripState();
          await planRoute(activePreset);
        }
      } catch (err) {
        console.error('Failed to load saved trip', err);
      }
    });
  }

  // Recenter map
  document.getElementById('btnFitMap').addEventListener('click', () => {
    fitMapToBounds();
  });

  // Update Trip Config
  document.getElementById('btnUpdateTripConfig').addEventListener('click', async () => {
    const startTime = document.getElementById('startTimeInput').value || '09:00';
    const coordsStr = document.getElementById('startCoordsInput').value;

    const parts = coordsStr.split(',').map((p) => parseFloat(p.trim()));
    if (parts.length !== 2 || isNaN(parts[0]) || isNaN(parts[1])) {
      showToast('Enter coordinates in format: latitude, longitude', 'error');
      return;
    }

    try {
      const res = await fetch('/api/trip-config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          startTime,
          startLat: parts[0],
          startLon: parts[1],
          roundTrip: isRoundTrip,
        }),
      });
      if (res.ok) {
        showToast('Trip settings updated.', 'success');
        await planRoute(activePreset);
      }
    } catch (err) {
      showToast('Failed to update trip config', 'error');
    }
  });

  // Setup Dropdowns and Route Mode Toggle
  setupTripsMenu();
  setupExportMenu();
  setupRouteModeToggle();

  // Place search autocomplete
  setupPlaceSearch();

  // Tab navigation
  document.querySelectorAll('.tab-link').forEach((tab) => {
    tab.addEventListener('click', (e) => {
      const link = e.currentTarget;
      document.querySelectorAll('.tab-link').forEach((t) => t.classList.remove('active'));
      document.querySelectorAll('.tab-pane').forEach((p) => p.classList.remove('active'));

      link.classList.add('active');
      const targetId = link.dataset.tab;
      const targetPane = document.getElementById(targetId);
      if (targetPane) targetPane.classList.add('active');

      if (targetId === 'tabPresetComparison' || targetId === 'tabAnalytics') {
        loadPresetComparison();
      }
    });
  });

  // Add stop toggle & submit
  const addStopForm = document.getElementById('addStopForm');
  document.getElementById('btnOpenAddStop').addEventListener('click', () => {
    addStopForm.classList.toggle('hidden');
  });

  document.getElementById('btnCancelAddStop').addEventListener('click', () => {
    addStopForm.classList.add('hidden');
  });

  document.getElementById('btnSaveNewStop').addEventListener('click', async () => {
    const name = document.getElementById('newStopName').value.trim();
    const lat = parseFloat(document.getElementById('newStopLat').value);
    const lon = parseFloat(document.getElementById('newStopLon').value);
    const prefStart = document.getElementById('newStopPrefStart').value || null;
    const prefEnd = document.getElementById('newStopPrefEnd').value || null;
    const dwell = parseInt(document.getElementById('newStopDwell').value, 10) || 30;
    const mustVisit = document.getElementById('newStopMustVisit').checked;

    if (!name || isNaN(lat) || isNaN(lon)) {
      showToast('Please enter a destination name and coordinates.', 'error');
      return;
    }

    await addNewStop(name, lat, lon, { prefStart, prefEnd, dwellTimeMin: dwell, mustVisit });
    addStopForm.classList.add('hidden');
    document.getElementById('newStopName').value = '';
    document.getElementById('newStopLat').value = '';
    document.getElementById('newStopLon').value = '';
    showToast(`Added '${name}' to itinerary.`, 'success');
  });

  // Save Trip Modal
  const saveModal = document.getElementById('saveTripModal');
  document.getElementById('btnSaveTripModal').addEventListener('click', () => {
    saveModal.classList.remove('hidden');
  });
  document.getElementById('btnCloseSaveModal').addEventListener('click', () => {
    saveModal.classList.add('hidden');
  });
  document.getElementById('btnCancelSave').addEventListener('click', () => {
    saveModal.classList.add('hidden');
  });
  saveModal.addEventListener('click', (e) => {
    if (e.target === saveModal) saveModal.classList.add('hidden');
  });

  document.getElementById('btnConfirmSave').addEventListener('click', async () => {
    const name = document.getElementById('saveTripName').value.trim();
    const desc = document.getElementById('saveTripDesc').value.trim();
    if (!name) return;
    try {
      const res = await fetch('/api/trips', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, description: desc }),
      });
      if (res.ok) {
        saveModal.classList.add('hidden');
        await loadSavedTripsList();
        showToast('Trip saved to SQLite database.', 'success');
      }
    } catch (err) {
      showToast('Failed to save trip.', 'error');
    }
  });

  // Global Escape key listener
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      document.querySelectorAll('.modal-backdrop').forEach((m) => m.classList.add('hidden'));
      const dd = document.getElementById('placeSearchResults');
      if (dd) dd.classList.add('hidden');
      if (map) map.closePopup();
    }
  });

  // Setup Edit Destination Modal
  setupEditStopModal();

  // Trip Summary Modal
  const summaryModal = document.getElementById('tripSummaryModal');
  document.getElementById('btnTripSummaryModal').addEventListener('click', async () => {
    summaryModal.classList.remove('hidden');
    await renderTripSummaryModal();
  });
  document.getElementById('btnCloseSummaryModal').addEventListener('click', () => {
    summaryModal.classList.add('hidden');
  });
  summaryModal.addEventListener('click', (e) => {
    if (e.target === summaryModal) summaryModal.classList.add('hidden');
  });
  document.getElementById('btnPrintSummary').addEventListener('click', () => {
    window.print();
  });

  // Constraint Attachment Modal
  setupConstraintModal();

  // What-If Sandbox
  document.getElementById('btnRunWhatIf').addEventListener('click', async () => {
    const removeStopId = document.getElementById('whatIfRemoveSelect').value;
    if (!removeStopId) return;
    try {
      const res = await fetch('/api/what-if', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ removeStopId, preset: activePreset }),
      });
      if (res.ok) {
        const data = await res.json();
        renderWhatIfResult(data);
      }
    } catch (err) {
      console.error('What-if preview failed', err);
    }
  });
}

// ─── Weight Tuner ────────────────────────────────────────────────────────────

/**
 * Reads all slider values and returns raw (unnormalized) weights object
 */
function readSliderRaw() {
  const sliders = document.querySelectorAll('.weight-range');
  const raw = {};
  sliders.forEach((s) => { raw[s.dataset.key] = parseInt(s.value, 10); });
  return raw;
}

/**
 * Normalizes raw slider values to [0..1] range summing to 1.0
 * If total is 0, returns equal weights.
 */
function normalizeWeights(raw) {
  const keys = Object.keys(raw);
  const total = keys.reduce((s, k) => s + raw[k], 0);
  if (total === 0) {
    const eq = 1 / keys.length;
    return Object.fromEntries(keys.map((k) => [k, eq]));
  }
  return Object.fromEntries(keys.map((k) => [k, raw[k] / total]));
}

/**
 * Seeds all sliders from a preset key (e.g. 'FASTEST')
 */
function seedSlidersFromPreset(presetKey) {
  const seed = PRESET_SEEDS[presetKey];
  if (!seed) return;
  Object.entries(seed).forEach(([key, val]) => {
    const slider = document.querySelector(`.weight-range[data-key="${key}"]`);
    if (slider) slider.value = val;
  });
  updateWeightTunerUI();
}

/**
 * Updates the % labels, zeroed classes, and stacked segment bar
 */
function updateWeightTunerUI() {
  const raw = readSliderRaw();
  const total = Object.values(raw).reduce((s, v) => s + v, 0);
  const keys = Object.keys(WEIGHT_DEFAULTS);

  // Update individual labels
  const valIds = {
    travelTime: 'valTravelTime',
    timeWindowFit: 'valTimeWindowFit',
    crowdAvoidance: 'valCrowdAvoidance',
    scenic: 'valScenic',
    attractionsOpen: 'valAttractionsOpen',
    mustVisit: 'valMustVisit',
  };

  keys.forEach((key) => {
    const el = document.getElementById(valIds[key]);
    if (!el) return;
    const pct = total > 0 ? Math.round((raw[key] / total) * 100) : 0;
    el.textContent = `${pct}%`;
    el.classList.toggle('zeroed', raw[key] === 0);
  });

  // Total bar — stacked colored segments
  const segContainer = document.getElementById('weightTotalSegments');
  const totalPctEl = document.getElementById('weightTotalPct');
  if (segContainer) {
    segContainer.innerHTML = '';
    if (total > 0) {
      keys.forEach((key, i) => {
        if (raw[key] === 0) return;
        const seg = document.createElement('div');
        seg.className = 'weight-segment';
        seg.style.width = `${(raw[key] / total) * 100}%`;
        seg.style.background = SEGMENT_COLORS[i % SEGMENT_COLORS.length];
        seg.title = `${key}: ${Math.round((raw[key] / total) * 100)}%`;
        segContainer.appendChild(seg);
      });
    }
  }
  if (totalPctEl) {
    totalPctEl.textContent = '100%';
    totalPctEl.style.color = 'var(--accent-green)';
  }
}

/**
 * Builds and wires the Custom Weight Tuner drawer
 */
function setupWeightTuner() {
  const tunerBtn = document.getElementById('btnToggleWeightTuner');
  const drawer = document.getElementById('weightTunerDrawer');
  if (!tunerBtn || !drawer) return;

  // Toggle drawer on CUSTOM button click
  tunerBtn.addEventListener('click', () => {
    const isHidden = drawer.classList.contains('hidden');
    if (isHidden) {
      // Opening: activate CUSTOM, deactivate others
      document.querySelectorAll('.strategy-btn').forEach((b) => b.classList.remove('active'));
      tunerBtn.classList.add('active');
      drawer.classList.remove('hidden');
      activePreset = 'CUSTOM';
    } else {
      // Closing: go back to BALANCED
      drawer.classList.add('hidden');
      tunerBtn.classList.remove('active');
      activePreset = 'BALANCED';
      document.querySelector('.strategy-btn[data-preset="BALANCED"]').classList.add('active');
      planRoute('BALANCED');
    }
  });

  // Live update labels on any slider change
  document.querySelectorAll('.weight-range').forEach((slider) => {
    slider.addEventListener('input', () => {
      updateWeightTunerUI();
    });
  });

  // Apply button
  document.getElementById('btnApplyWeights').addEventListener('click', async () => {
    const raw = readSliderRaw();
    const normalized = normalizeWeights(raw);
    document.querySelectorAll('.strategy-btn').forEach((b) => b.classList.remove('active'));
    tunerBtn.classList.add('active');
    activePreset = 'CUSTOM';

    try {
      const res = await fetch('/api/plan-route', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ customWeights: normalized }),
      });
      if (res.ok) {
        const data = await res.json();
        const { optimalRoute, comparison, conflictSuggestions, explanation } = data;
        updateMetricsRibbon(optimalRoute, explanation, comparison);
        renderMapRoute(optimalRoute);
        renderReasoning(explanation, comparison, conflictSuggestions);
        showToast('Custom weights applied.', 'success');
      }
    } catch (err) {
      showToast('Failed to apply custom weights.', 'error');
    }
  });

  // Reset button — back to BALANCED defaults
  document.getElementById('btnResetWeights').addEventListener('click', () => {
    Object.entries(WEIGHT_DEFAULTS).forEach(([key, val]) => {
      const slider = document.querySelector(`.weight-range[data-key="${key}"]`);
      if (slider) slider.value = val;
    });
    updateWeightTunerUI();
    showToast('Weights reset to Balanced defaults.', 'info');
  });

  // Initial UI render
  updateWeightTunerUI();
}

// ─── Route Mode (Round-Trip vs One-Way) ────────────────────────────────────────

function updateRoundTripUI(enabled) {
  isRoundTrip = Boolean(enabled);
  const btn = document.getElementById('btnToggleRoundTrip');
  const icon = document.getElementById('roundTripIcon');
  const label = document.getElementById('roundTripLabel');
  if (!btn || !icon || !label) return;

  if (isRoundTrip) {
    btn.classList.add('roundtrip-active');
    icon.textContent = '↺';
    label.textContent = 'Round-Trip';
    btn.title = 'Round-Trip enabled: routes return leg back to starting origin point';
  } else {
    btn.classList.remove('roundtrip-active');
    icon.textContent = '➜';
    label.textContent = 'One-Way';
    btn.title = 'One-Way enabled: route ends at the final stop';
  }
}

function setupRouteModeToggle() {
  const roundTripBtn = document.getElementById('btnToggleRoundTrip');
  if (!roundTripBtn) return;

  roundTripBtn.addEventListener('click', async () => {
    const nextState = !isRoundTrip;
    updateRoundTripUI(nextState);

    const startTime = document.getElementById('startTimeInput').value || '09:00';
    const coordsStr = document.getElementById('startCoordsInput').value;
    const parts = coordsStr.split(',').map((p) => parseFloat(p.trim()));
    const startLat = (parts.length === 2 && !isNaN(parts[0])) ? parts[0] : 48.8584;
    const startLon = (parts.length === 2 && !isNaN(parts[1])) ? parts[1] : 2.2945;

    try {
      const res = await fetch('/api/trip-config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          startTime,
          startLat,
          startLon,
          roundTrip: nextState,
        }),
      });
      if (res.ok) {
        showToast(nextState ? 'Round-trip enabled (returns to origin)' : 'One-way route mode set', 'info');
        await planRoute(activePreset);
      }
    } catch (err) {
      showToast('Failed to toggle route mode', 'error');
    }
  });
}

// ─── Trips Menu Dropdown ───────────────────────────────────────────────────────

function setupTripsMenu() {
  const tripsBtn = document.getElementById('btnTripsMenu');
  const tripsDropdown = document.getElementById('tripsMenuDropdown');
  const exportDropdown = document.getElementById('exportDropdownMenu');
  if (!tripsBtn || !tripsDropdown) return;

  tripsBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    if (exportDropdown) exportDropdown.classList.add('hidden');
    tripsDropdown.classList.toggle('hidden');
  });

  // Sample trip item buttons in the dropdown
  tripsDropdown.querySelectorAll('.trips-menu-item').forEach((btn) => {
    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      const tripKey = btn.dataset.tripKey;
      if (!tripKey) return;

      tripsDropdown.querySelectorAll('.trips-menu-item').forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      tripsDropdown.classList.add('hidden');

      try {
        const res = await fetch(`/api/samples/${tripKey}/load`, { method: 'POST' });
        if (res.ok) {
          const title = btn.querySelector('.trip-item-title')?.textContent || tripKey;
          await loadTripState();
          await planRoute(activePreset);
          fitMapToBounds();
          showToast(`Loaded ${title}.`, 'success');
        } else {
          showToast('Failed to load sample trip', 'error');
        }
      } catch (err) {
        showToast('Error loading sample trip', 'error');
      }
    });
  });

  // New Empty Trip button
  const newTripBtn = document.getElementById('btnNewTrip');
  if (newTripBtn) {
    newTripBtn.addEventListener('click', async (e) => {
      e.stopPropagation();
      tripsDropdown.classList.add('hidden');
      try {
        const getRes = await fetch('/api/stops');
        const data = await getRes.json();
        for (const stop of (data.stops || [])) {
          await fetch(`/api/stops/${stop.id}`, { method: 'DELETE' });
        }
        await loadTripState();
        await planRoute(activePreset);
        showToast('Started new empty trip. Click map or search to add destinations!', 'info');
      } catch (err) {
        showToast('Failed to reset trip.', 'error');
      }
    });
  }

  // Dismiss on click outside
  document.addEventListener('click', (e) => {
    if (!tripsDropdown.contains(e.target) && !tripsBtn.contains(e.target)) {
      tripsDropdown.classList.add('hidden');
    }
  });

  // Keep compatibility with select elements if present
  const sampleSelect = document.getElementById('sampleTripSelect');
  if (sampleSelect) {
    sampleSelect.addEventListener('change', async (e) => {
      const key = e.target.value;
      if (!key) return;
      tripsDropdown.classList.add('hidden');
      try {
        const res = await fetch(`/api/samples/${key}/load`, { method: 'POST' });
        if (res.ok) {
          await loadTripState();
          await planRoute(activePreset);
          fitMapToBounds();
        }
      } catch (err) {
        console.error('Failed to load sample trip', err);
      }
    });
  }
}

// ─── Export Menu Dropdown ──────────────────────────────────────────────────────

function setupExportMenu() {
  const exportBtn = document.getElementById('btnExportMenu');
  const exportDropdown = document.getElementById('exportDropdownMenu');
  const tripsDropdown = document.getElementById('tripsMenuDropdown');
  if (!exportBtn || !exportDropdown) return;

  exportBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    if (tripsDropdown) tripsDropdown.classList.add('hidden');
    exportDropdown.classList.toggle('hidden');
  });

  document.addEventListener('click', (e) => {
    if (!exportDropdown.contains(e.target) && !exportBtn.contains(e.target)) {
      exportDropdown.classList.add('hidden');
    }
  });

  const printBtn = document.getElementById('btnTripSummaryModal');
  if (printBtn) {
    printBtn.addEventListener('click', () => {
      exportDropdown.classList.add('hidden');
    });
  }

  exportDropdown.querySelectorAll('a.dropdown-menu-item').forEach((item) => {
    item.addEventListener('click', () => {
      exportDropdown.classList.add('hidden');
      showToast('Export file downloaded.', 'success');
    });
  });
}

// Setup Edit Destination Modal
function setupEditStopModal() {
  const modal = document.getElementById('editStopModal');
  if (!modal) return;
  document.getElementById('btnCloseEditStopModal').onclick = () => modal.classList.add('hidden');
  document.getElementById('btnCancelEditStop').onclick = () => modal.classList.add('hidden');
  modal.onclick = (e) => { if (e.target === modal) modal.classList.add('hidden'); };

  document.getElementById('btnSaveEditStop').onclick = async () => {
    const stopId = document.getElementById('editStopId').value;
    const name = document.getElementById('editStopName').value.trim();
    const dwell = parseInt(document.getElementById('editStopDwell').value, 10) || 30;
    const prefStart = document.getElementById('editStopPrefStart').value || null;
    const prefEnd = document.getElementById('editStopPrefEnd').value || null;
    const mustVisit = document.getElementById('editStopMustVisit').checked;

    if (!name) {
      showToast('Please enter a destination name.', 'error');
      return;
    }

    try {
      const res = await fetch(`/api/stops/${stopId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          dwellTimeMin: dwell,
          prefStart,
          prefEnd,
          mustVisit,
        }),
      });

      if (res.ok) {
        modal.classList.add('hidden');
        showToast(`Updated '${name}'.`, 'success');
        await loadTripState();
        await planRoute(activePreset);
      } else {
        const errData = await res.json();
        showToast(errData.error || 'Failed to update destination', 'error');
      }
    } catch (err) {
      showToast('Network error updating destination.', 'error');
    }
  };

  const btnConstraintFromEdit = document.getElementById('btnOpenConstraintFromEdit');
  if (btnConstraintFromEdit) {
    btnConstraintFromEdit.onclick = () => {
      const stopId = document.getElementById('editStopId').value;
      const stop = currentStops.find((s) => s.id === stopId);
      if (stop) {
        modal.classList.add('hidden');
        openConstraintModal(stop);
      }
    };
  }
}

function openEditStopModal(stop) {
  const modal = document.getElementById('editStopModal');
  if (!modal) return;

  document.getElementById('editStopId').value = stop.id;
  document.getElementById('editStopName').value = stop.name;
  document.getElementById('editStopDwell').value = stop.dwellTimeMin || 30;
  document.getElementById('editStopPrefStart').value = stop.prefStart || '';
  document.getElementById('editStopPrefEnd').value = stop.prefEnd || '';
  document.getElementById('editStopMustVisit').checked = Boolean(stop.mustVisit);

  modal.classList.remove('hidden');
}

// Remove a constraint from a stop
async function deleteConstraint(stopId, constraintId) {
  try {
    const res = await fetch(`/api/stops/${stopId}/constraints/${constraintId}`, {
      method: 'DELETE',
    });
    if (res.ok) {
      showToast('Constraint removed.', 'info');
      await loadTripState();
      await planRoute(activePreset);
    } else {
      showToast('Failed to remove constraint.', 'error');
    }
  } catch (err) {
    showToast('Network error removing constraint.', 'error');
  }
}

// Constraint Modal setup
function setupConstraintModal() {
  const modal = document.getElementById('constraintModal');
  if (!modal) return;

  document.getElementById('btnCloseConstraintModal').onclick = () => modal.classList.add('hidden');
  document.getElementById('btnCancelConstraint').onclick = () => modal.classList.add('hidden');
  modal.onclick = (e) => { if (e.target === modal) modal.classList.add('hidden'); };

  const typeSelect = document.getElementById('constraintTypeSelect');
  const ohFields = document.getElementById('ohFields');
  const precFields = document.getElementById('precFields');

  typeSelect.onchange = () => {
    if (typeSelect.value === 'OPENING_HOURS') {
      ohFields.classList.remove('hidden');
      precFields.classList.add('hidden');
    } else {
      ohFields.classList.add('hidden');
      precFields.classList.remove('hidden');
    }
  };

  document.getElementById('btnSaveConstraint').onclick = async () => {
    const stopId = document.getElementById('constraintStopId').value;
    const type = typeSelect.value;
    let payload = { type };

    if (type === 'OPENING_HOURS') {
      payload.openTime = document.getElementById('ohOpenTime').value || '09:00';
      payload.closeTime = document.getElementById('ohCloseTime').value || '18:00';
    } else {
      payload.precedesStopId = document.getElementById('precTargetStopSelect').value;
      if (!payload.precedesStopId) {
        showToast('Please select a target stop for precedence.', 'error');
        return;
      }
    }

    try {
      const res = await fetch(`/api/stops/${stopId}/constraints`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        modal.classList.add('hidden');
        showToast('Constraint attached.', 'success');
        await loadTripState();
        await planRoute(activePreset);
      } else {
        const errData = await res.json();
        showToast(errData.error || 'Failed to attach constraint', 'error');
      }
    } catch (err) {
      showToast('Network error attaching constraint.', 'error');
    }
  };
}

function openConstraintModal(stop) {
  const modal = document.getElementById('constraintModal');
  if (!modal) return;

  document.getElementById('constraintStopId').value = stop.id;
  document.getElementById('constraintModalTitle').textContent = `Add Constraint for ${stop.name}`;

  const typeSelect = document.getElementById('constraintTypeSelect');
  const ohFields = document.getElementById('ohFields');
  const precFields = document.getElementById('precFields');

  typeSelect.value = 'OPENING_HOURS';
  ohFields.classList.remove('hidden');
  precFields.classList.add('hidden');

  const precSelect = document.getElementById('precTargetStopSelect');
  precSelect.innerHTML = '';
  const availableStops = currentStops.filter((s) => s.id !== stop.id);

  if (availableStops.length === 0) {
    const opt = document.createElement('option');
    opt.value = '';
    opt.textContent = '-- No other stops available --';
    precSelect.appendChild(opt);
  } else {
    availableStops.forEach((s) => {
      const opt = document.createElement('option');
      opt.value = s.id;
      opt.textContent = s.name;
      precSelect.appendChild(opt);
    });
  }

  modal.classList.remove('hidden');
}

// Place Search with Enter key support and outside-click dismiss
function setupPlaceSearch() {
  const input = document.getElementById('placeSearchInput');
  const dropdown = document.getElementById('placeSearchResults');
  let debounceTimer = null;

  input.addEventListener('input', () => {
    clearTimeout(debounceTimer);
    const q = input.value.trim();
    if (!q) {
      dropdown.classList.add('hidden');
      return;
    }

    debounceTimer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/search-places?q=${encodeURIComponent(q)}`);
        if (res.ok) {
          const data = await res.json();
          renderSearchResults(data.results);
        }
      } catch (err) {
        console.error('Search failed', err);
      }
    }, 200);
  });

  input.addEventListener('keydown', async (e) => {
    if (e.key === 'Enter') {
      const q = input.value.trim();
      if (!q) return;

      const firstItem = dropdown.querySelector('.search-item');
      if (firstItem) {
        firstItem.click();
      } else {
        try {
          const res = await fetch(`/api/search-places?q=${encodeURIComponent(q)}`);
          if (res.ok) {
            const data = await res.json();
            if (data.results && data.results.length > 0) {
              const best = data.results[0];
              dropdown.classList.add('hidden');
              input.value = '';
              await addNewStop(best.name, best.lat, best.lon);
            }
          }
        } catch (err) {
          // ignore
        }
      }
    }
  });

  document.addEventListener('click', (e) => {
    if (!input.contains(e.target) && !dropdown.contains(e.target)) {
      dropdown.classList.add('hidden');
    }
  });
}

function renderSearchResults(results) {
  const dropdown = document.getElementById('placeSearchResults');
  dropdown.innerHTML = '';

  if (!results || results.length === 0) {
    dropdown.innerHTML = '<div style="padding:8px 12px; font-size:12px; color:#64748b;">No matching places found</div>';
    dropdown.classList.remove('hidden');
    return;
  }

  results.forEach((item) => {
    const el = document.createElement('div');
    el.className = 'search-item';
    el.innerHTML = `
      <span>${item.name}</span>
      <span style="font-size:11px; color:#38bdf8;">+ Add</span>
    `;
    el.addEventListener('click', async () => {
      dropdown.classList.add('hidden');
      document.getElementById('placeSearchInput').value = '';
      await addNewStop(item.name, item.lat, item.lon);
    });
    dropdown.appendChild(el);
  });

  dropdown.classList.remove('hidden');
}

async function addNewStop(name, lat, lon, extra = {}) {
  try {
    const res = await fetch('/api/stops', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, lat, lon, ...extra }),
    });
    if (res.ok) {
      await loadTripState();
      await planRoute(activePreset);
    }
  } catch (err) {
    console.error('Add stop failed', err);
  }
}

// Load list of saved trips from SQLite database
async function loadSavedTripsList() {
  const select = document.getElementById('savedTripsSelect');
  const dynamicList = document.getElementById('savedTripsDynamicList');
  const countBadge = document.getElementById('savedTripsCountBadge');
  const tripsDropdown = document.getElementById('tripsMenuDropdown');

  try {
    const res = await fetch('/api/trips');
    if (res.ok) {
      const data = await res.json();
      const trips = data.trips || [];

      if (countBadge) countBadge.textContent = String(trips.length);

      if (select) {
        select.innerHTML = '<option value="">Saved Trips (SQLite)...</option>';
        trips.forEach((t) => {
          const opt = document.createElement('option');
          opt.value = t.id;
          opt.textContent = `${t.name} (${t.stopCount} stops)`;
          select.appendChild(opt);
        });
      }

      if (dynamicList) {
        if (trips.length === 0) {
          dynamicList.innerHTML = '<div class="trips-empty-hint">No saved trips yet. Click "Save" in header to store one.</div>';
        } else {
          dynamicList.innerHTML = '';
          trips.forEach((t) => {
            const row = document.createElement('div');
            row.className = 'saved-trip-row';

            const loadBtn = document.createElement('button');
            loadBtn.type = 'button';
            loadBtn.className = 'btn-load-saved-trip';
            loadBtn.innerHTML = `
              <span class="trip-item-icon">🗺️</span>
              <div class="trip-item-details">
                <div class="trip-item-title-row">
                  <strong class="trip-item-title">${t.name}</strong>
                  <span class="trip-item-badge">${t.stopCount} stops</span>
                </div>
                <span class="trip-item-desc">${t.description || 'Saved custom itinerary'}</span>
              </div>
            `;
            loadBtn.onclick = async (e) => {
              e.stopPropagation();
              if (tripsDropdown) tripsDropdown.classList.add('hidden');
              try {
                const loadRes = await fetch(`/api/trips/${t.id}/load`, { method: 'POST' });
                if (loadRes.ok) {
                  await loadTripState();
                  await planRoute(activePreset);
                  fitMapToBounds();
                  showToast(`Loaded saved trip: "${t.name}"`, 'success');
                } else {
                  showToast('Failed to load saved trip.', 'error');
                }
              } catch (err) {
                showToast('Error loading saved trip', 'error');
              }
            };

            const delBtn = document.createElement('button');
            delBtn.type = 'button';
            delBtn.className = 'btn-delete-saved-trip';
            delBtn.title = `Delete ${t.name}`;
            delBtn.innerHTML = '🗑️';
            delBtn.onclick = async (e) => {
              e.stopPropagation();
              if (!confirm(`Delete saved trip "${t.name}"?`)) return;
              try {
                const delRes = await fetch(`/api/trips/${t.id}`, { method: 'DELETE' });
                if (delRes.ok) {
                  showToast(`Trip "${t.name}" deleted.`, 'info');
                  await loadSavedTripsList();
                }
              } catch (err) {
                showToast('Failed to delete trip', 'error');
              }
            };

            row.appendChild(loadBtn);
            row.appendChild(delBtn);
            dynamicList.appendChild(row);
          });
        }
      }
    }
  } catch (err) {
    console.error('Failed to load trips from database', err);
  }
}

// Load current trip state
async function loadTripState() {
  try {
    const res = await fetch('/api/stops');
    const data = await res.json();
    currentStops = data.stops || [];
    currentTripConfig = data.tripConfig;

    if (currentTripConfig) {
      document.getElementById('startTimeInput').value = currentTripConfig.startTime || '09:00';
      const quickStart = document.getElementById('quickStartTime');
      if (quickStart) quickStart.value = currentTripConfig.startTime || '09:00';
      document.getElementById('startCoordsInput').value = `${currentTripConfig.startLat}, ${currentTripConfig.startLon}`;
      updateRoundTripUI(Boolean(currentTripConfig.roundTrip));
    }

    document.getElementById('stopsCountBadge').textContent = `${currentStops.length} stops`;
    renderStopsList();
    populateWhatIfSelect();
  } catch (err) {
    console.error('Load trip state failed', err);
  }
}

function populateWhatIfSelect() {
  const select = document.getElementById('whatIfRemoveSelect');
  if (!select) return;
  select.innerHTML = '<option value="">-- Choose destination to simulate removing --</option>';
  currentStops.forEach((s) => {
    const opt = document.createElement('option');
    opt.value = s.id;
    opt.textContent = s.name;
    select.appendChild(opt);
  });
}

// Move stop up or down in inputOrder
async function moveStop(stopId, direction) {
  try {
    const res = await fetch(`/api/stops/${stopId}/move`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ direction }),
    });
    if (res.ok) {
      await loadTripState();
      await planRoute(activePreset);
    }
  } catch (err) {
    console.error('Move stop failed', err);
  }
}

// Render stops in sidebar with minimal, clean cards
function renderStopsList() {
  const container = document.getElementById('stopsList');
  container.innerHTML = '';

  if (currentStops.length === 0) {
    container.innerHTML = '<p style="text-align:center; padding:24px 16px; font-size:12px; color:var(--text-muted);">No stops added yet. Click map to add a waypoint.</p>';
    return;
  }

  currentStops.forEach((stop, idx) => {
    const card = document.createElement('div');
    card.className = 'stop-card';

    const openC = (stop.constraints || []).find((c) => c.name === 'OPENING_HOURS');
    const hasPrec = (stop.constraints || []).some((c) => c.name === 'PRECEDENCE');
    const isFirst = idx === 0;
    const isLast = idx === currentStops.length - 1;

    card.innerHTML = `
      <div class="stop-rank">
        <button class="rank-arrow btn-move-up" title="Move Up" ${isFirst ? 'disabled style="opacity:0.2;"' : ''}>▲</button>
        <span class="rank-num">${idx + 1}</span>
        <button class="rank-arrow btn-move-down" title="Move Down" ${isLast ? 'disabled style="opacity:0.2;"' : ''}>▼</button>
      </div>
      <div class="stop-info">
        <div class="stop-title-row">
          <span class="stop-title" title="${stop.name}">${stop.name}</span>
          ${stop.mustVisit ? '<span class="tag-must" title="Must-Visit Attraction">★ Must</span>' : ''}
        </div>
        <div class="stop-meta-row">
          <span class="meta-item">⏱ ${stop.dwellTimeMin || 45}m dwell</span>
          ${openC ? `<span class="meta-item meta-hours" title="Opening Hours">⏰ ${openC.openTime}–${openC.closeTime}</span>` : ''}
          ${hasPrec ? `<span class="meta-item meta-prec" title="Precedence constraint attached">↳ Precedence</span>` : ''}
        </div>
      </div>
      <div class="stop-actions">
        <button class="btn-card-action btn-edit" title="Edit Destination & Times">✎</button>
        <button class="btn-card-action btn-ctrl-del" data-id="${stop.id}" title="Remove Destination">✕</button>
      </div>
    `;

    // Click card to fly map
    card.addEventListener('click', (e) => {
      if (e.target.closest('.btn-card-action') || e.target.closest('.rank-arrow')) return;
      if (map) {
        map.flyTo([stop.lat, stop.lon], 15, { duration: 0.8 });
      }
    });

    const btnUp = card.querySelector('.btn-move-up');
    if (btnUp && !isFirst) {
      btnUp.onclick = async (e) => {
        e.stopPropagation();
        await moveStop(stop.id, 'up');
      };
    }

    const btnDown = card.querySelector('.btn-move-down');
    if (btnDown && !isLast) {
      btnDown.onclick = async (e) => {
        e.stopPropagation();
        await moveStop(stop.id, 'down');
      };
    }

    const btnEdit = card.querySelector('.btn-edit');
    if (btnEdit) {
      btnEdit.onclick = (e) => {
        e.stopPropagation();
        openEditStopModal(stop);
      };
    }

    card.querySelector('.btn-ctrl-del').addEventListener('click', async (e) => {
      e.stopPropagation();
      await deleteStop(stop.id);
    });

    container.appendChild(card);
  });
}

async function deleteStop(stopId) {
  try {
    const res = await fetch(`/api/stops/${stopId}`, { method: 'DELETE' });
    if (res.ok) {
      await loadTripState();
      await planRoute(activePreset);
    }
  } catch (err) {
    console.error('Delete stop failed', err);
  }
}

// Plan Route
async function planRoute(preset) {
  try {
    const payload = {};
    if (preset === 'CUSTOM') {
      payload.customWeights = normalizeWeights(readSliderRaw());
    } else if (preset) {
      payload.preset = preset;
    }

    const res = await fetch('/api/plan-route', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!res.ok) return;
    const data = await res.json();
    const { optimalRoute, comparison, conflictSuggestions, explanation } = data;

    updateMetricsRibbon(optimalRoute, explanation, comparison);
    renderMapRoute(optimalRoute);
    renderReasoning(explanation, comparison, conflictSuggestions);
  } catch (err) {
    console.error('Plan route failed', err);
  }
}

function updateMetricsRibbon(optimalRoute, explanation, comparison) {
  if (!optimalRoute) return;

  const distKm = optimalRoute.totalDistanceKm != null ? Number(optimalRoute.totalDistanceKm).toFixed(1) : '--';
  const distEl = document.getElementById('metricDistance');
  if (distEl) distEl.textContent = `${distKm} km`;

  const durMin = Math.round(optimalRoute.totalDurationMin);
  const durStr = durMin >= 60 ? `${Math.floor(durMin / 60)}h ${durMin % 60}m` : `${durMin} min`;
  document.getElementById('metricDuration').textContent = durStr;

  const crowdStr = explanation?.metrics?.avgCrowdLevel || '--%';
  document.getElementById('metricCrowd').textContent = crowdStr;

  const isFeasible = explanation?.metrics?.isFeasible ?? true;
  const feasibilityBadge = document.getElementById('metricFeasibility');
  if (isFeasible) {
    feasibilityBadge.className = 'status-indicator-green';
    feasibilityBadge.style.color = '#34d399';
    feasibilityBadge.textContent = '100% Satisfied';
  } else {
    feasibilityBadge.className = 'status-indicator-green';
    feasibilityBadge.style.color = '#f43f5e';
    feasibilityBadge.textContent = 'Conflict Detected';
  }

  // Optimization banner
  const savingsBanner = document.getElementById('optimizationSavingsBanner');
  if (comparison && comparison.distanceSavedKm > 0) {
    savingsBanner.classList.remove('hidden');
    document.getElementById('savingsText').textContent =
      `Route optimization saved ${comparison.distanceSavedKm} km (${comparison.percentDistanceSaved}%) and ~${comparison.timeSavedMin} min vs manual order.`;
  } else {
    savingsBanner.classList.add('hidden');
  }
}

// Render map routes
function renderMapRoute(route) {
  markersLayer.clearLayers();
  polylineLayer.clearLayers();

  if (!route || !route.stops || route.stops.length === 0) return;

  const points = [];

  // Start origin pin
  if (route.tripConfig) {
    const originLat = route.tripConfig.startLat;
    const originLon = route.tripConfig.startLon;
    points.push([originLat, originLon]);

    const originIcon = L.divIcon({
      className: 'custom-origin-marker',
      html: '<div style="width:12px; height:12px;"></div>',
      iconSize: [12, 12],
      iconAnchor: [6, 6],
      popupAnchor: [0, -8],
    });

    L.marker([originLat, originLon], { icon: originIcon })
      .bindPopup(`<div style="color:#f8fafc; font-size:12px;"><strong style="color:#10b981;">Start Location</strong><br>Depart: <b>${route.tripConfig.startTime}</b></div>`)
      .addTo(markersLayer);
  }

  // Waypoint markers
  route.stops.forEach((stop, index) => {
    const leg = route.legs[index];
    points.push([stop.lat, stop.lon]);

    const stopIcon = L.divIcon({
      className: 'custom-stop-marker',
      html: `<div>${index + 1}</div>`,
      iconSize: [24, 24],
      iconAnchor: [12, 12],
      popupAnchor: [0, -14],
    });

    const popupHtml = `
      <div style="font-family: inherit; font-size: 12px; color: #f8fafc;">
        <strong style="color: #38bdf8; font-size: 13px;">#${index + 1}: ${stop.name}</strong><br>
        Arrival: <b>${leg ? leg.arrivalTime : 'N/A'}</b><br>
        Visit Duration: ${leg ? leg.dwellTimeMin : 30} min<br>
        Departure: <b>${leg ? leg.departureTime : 'N/A'}</b><br>
        <span style="font-size: 10px; color: #94a3b8; display: block; margin-top: 4px;">(Drag marker to adjust location)</span>
      </div>
    `;

    const marker = L.marker([stop.lat, stop.lon], { icon: stopIcon, draggable: true })
      .bindPopup(popupHtml)
      .addTo(markersLayer);

    marker.on('dragend', async (ev) => {
      const pos = ev.target.getLatLng();
      const newLat = Number(pos.lat.toFixed(5));
      const newLon = Number(pos.lng.toFixed(5));
      await repositionStop(stop.id, newLat, newLon);
    });
  });

  // Polyline
  if (points.length > 1) {
    if (route.tripConfig && route.tripConfig.roundTrip) {
      points.push([route.tripConfig.startLat, route.tripConfig.startLon]);
    }
    const polyline = L.polyline(points, {
      color: '#0284c7',
      weight: 3.5,
      opacity: 0.9,
      dashArray: '6, 6',
    }).addTo(polylineLayer);

    setTimeout(() => {
      if (map) {
        map.invalidateSize();
        map.fitBounds(polyline.getBounds(), { padding: [40, 40], maxZoom: 15 });
      }
    }, 50);
  } else if (points.length === 1) {
    map.setView(points[0], 13);
  }
}

function fitMapToBounds() {
  const allBounds = [];
  markersLayer.eachLayer((layer) => {
    if (layer.getLatLng) allBounds.push(layer.getLatLng());
  });
  if (allBounds.length > 0) {
    map.fitBounds(L.latLngBounds(allBounds), { padding: [40, 40], maxZoom: 15 });
  }
}

// Render Reasoning and Analytics
function renderReasoning(explanation, comparison, conflictSuggestions) {
  if (!explanation) return;

  // Conflict Banner
  const conflictBanner = document.getElementById('conflictAlertBanner');
  const remediesList = document.getElementById('conflictRemediesList');
  if (conflictSuggestions && conflictSuggestions.length > 0) {
    conflictBanner.classList.remove('hidden');
    remediesList.innerHTML = '';
    conflictSuggestions.forEach((sugg) => {
      const item = document.createElement('div');
      item.innerHTML = `<strong>${sugg.title}:</strong> ${sugg.action}`;
      remediesList.appendChild(item);
    });
  } else {
    conflictBanner.classList.add('hidden');
  }

  // Reordering Notice
  const reorderNotice = document.getElementById('reorderingNotice');
  if (explanation.reorderingRationale && explanation.reorderingRationale.reordered) {
    reorderNotice.classList.remove('hidden');
    document.getElementById('reorderingText').textContent = explanation.reorderingRationale.message;
  } else {
    reorderNotice.classList.add('hidden');
  }

  // Turn-by-Turn Timeline
  const timelineList = document.getElementById('timelineList');
  timelineList.innerHTML = '';
  const itinerary = explanation.itinerary || [];

  if (itinerary.length === 0) {
    timelineList.innerHTML = '<p style="text-align:center; padding:24px 16px; font-size:12px; color:var(--text-muted);">No itinerary available yet. Click ⚡ Optimize Route to generate your schedule.</p>';
  } else {
    itinerary.forEach((item) => {
      const step = document.createElement('div');
      step.className = 'timeline-step';
      step.innerHTML = `
        <div class="step-header">
          <span class="step-title">#${item.stepNumber}: ${item.stopName}</span>
          <span class="step-timing">${item.arrivalTime} — ${item.departureTime}</span>
        </div>
        <ul class="step-notes">
          ${item.reasons.map((r) => `<li>${r}</li>`).join('')}
        </ul>
      `;

      step.addEventListener('click', () => {
        if (map) {
          map.flyTo([item.lat, item.lon], 15, { duration: 0.6 });
        }
      });

      timelineList.appendChild(step);
    });
  }

  // 6 Factors Layout
  const factorsContainer = document.getElementById('factorsContainer');
  factorsContainer.innerHTML = '';
  const factors = explanation.factors || {};

  Object.keys(factors).forEach((fKey) => {
    const f = factors[fKey];
    const el = document.createElement('div');
    el.className = 'factor-item';
    const pct = Math.round(f.score * 100);

    el.innerHTML = `
      <div class="factor-top">
        <span>${f.label}</span>
        <span style="color:#38bdf8;">${pct}%</span>
      </div>
      <div class="factor-bar">
        <div class="factor-fill" style="width: ${pct}%"></div>
      </div>
      <div class="factor-note">${f.description}</div>
    `;
    factorsContainer.appendChild(el);
  });

  // Constraint Audit
  const tableBody = document.getElementById('constraintTableBody');
  tableBody.innerHTML = '';
  const decisions = explanation.constraintDecisions || [];

  if (decisions.length === 0) {
    tableBody.innerHTML = '<tr><td colspan="6" style="text-align:center; color:#64748b; padding:12px;">No explicit constraints attached.</td></tr>';
  } else {
    decisions.forEach((d) => {
      const tr = document.createElement('tr');
      const statusColor = d.status === 'SATISFIED' ? '#34d399' : '#f43f5e';
      tr.innerHTML = `
        <td><strong>${d.stopName}</strong></td>
        <td><code>${d.type}</code></td>
        <td>${d.rule}</td>
        <td><span style="color:${statusColor}; font-weight:700;">${d.status}</span></td>
        <td style="color:#94a3b8;">${d.explanation}</td>
        <td><button class="btn btn-xs btn-ghost btn-del-c" title="Delete Constraint" style="color:#f43f5e; font-size:11px; padding:2px 6px;">✕</button></td>
      `;
      const delBtn = tr.querySelector('.btn-del-c');
      if (delBtn) {
        delBtn.onclick = async () => {
          await deleteConstraint(d.stopId, d.id);
        };
      }
      tableBody.appendChild(tr);
    });
  }
}

// Preset Comparison
async function loadPresetComparison() {
  const tbody = document.getElementById('presetComparisonTableBody');
  tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; padding:10px;">Evaluating strategies...</td></tr>';

  try {
    const res = await fetch('/api/compare-presets', { method: 'POST' });
    if (res.ok) {
      const data = await res.json();
      tbody.innerHTML = '';
      (data.comparison || []).forEach((row) => {
        const tr = document.createElement('tr');
        const isActive = row.presetKey === activePreset;
        tr.className = `preset-row ${isActive ? 'active-preset-row' : ''}`;
        tr.title = 'Click to switch to this strategy';
        const badgeColor = row.isFeasible ? '#34d399' : '#f43f5e';
        tr.innerHTML = `
          <td>
            <strong>${row.presetName}</strong>
            ${isActive ? '<span class="badge-active-preset">Active</span>' : ''}
          </td>
          <td><b>${row.totalDistanceKm} km</b></td>
          <td><b>${row.totalDurationMin} min</b></td>
          <td><span style="color:${badgeColor}; font-weight:700;">${row.isFeasible ? 'Satisfied' : 'Conflict'}</span></td>
          <td style="font-size:11px; color:#cbd5e1;">${row.stopOrderNames.join(' → ')}</td>
        `;
        tr.onclick = async () => {
          activePreset = row.presetKey;
          document.querySelectorAll('.strategy-btn').forEach((b) => {
            b.classList.toggle('active', b.dataset.preset === row.presetKey);
          });
          await planRoute(activePreset);
          await loadPresetComparison();
        };
        tbody.appendChild(tr);
      });
    }
  } catch (err) {
    tbody.innerHTML = '<tr><td colspan="5" style="color:#ef4444; text-align:center;">Failed to compare strategies</td></tr>';
  }
}

// What-If Simulation
function renderWhatIfResult(data) {
  const box = document.getElementById('whatIfResultBox');
  box.classList.remove('hidden');

  const distDiff = data.delta.distanceKm;
  const timeDiff = data.delta.durationMin;

  const distStr = distDiff <= 0 ? `${distDiff} km` : `+${distDiff} km`;
  const timeStr = timeDiff <= 0 ? `${timeDiff} min` : `+${timeDiff} min`;

  box.innerHTML = `
    <strong>Scenario Preview</strong>
    <p style="margin-top:2px; color:#94a3b8;">Simulated removing stop: Route reduced to ${data.preview.stopsCount} stops.</p>
    <div style="display:flex; gap:16px; margin-top:6px;">
      <div>Distance Delta: <b style="color:#34d399;">${distStr}</b> (from ${data.base.totalDistanceKm} to ${data.preview.totalDistanceKm} km)</div>
      <div>Duration Delta: <b style="color:#34d399;">${timeStr}</b> (from ${data.base.totalDurationMin} to ${data.preview.totalDurationMin} min)</div>
    </div>
  `;
}

// Printable Summary Modal
async function renderTripSummaryModal() {
  const body = document.getElementById('summaryModalBody');
  body.innerHTML = '<p style="text-align:center;">Loading itinerary...</p>';

  try {
    const res = await fetch('/api/trip-summary');
    if (res.ok) {
      const s = await res.json();
      document.getElementById('summaryModalTitle').textContent = s.tripTitle;

      let html = `
        <div style="margin-bottom:12px;">
          <h2 style="font-size:16px; margin-bottom:2px; color:var(--text-primary);">${s.tripTitle}</h2>
          <p style="font-size:12px; color:var(--text-muted);">${s.stopsCount} Waypoints • ${s.totalDistanceKm} km • ~${s.totalDurationMin} min total</p>
        </div>
        <div class="notice-box" style="margin-bottom:12px; font-size:12px;">
          <strong>Executive Rationale:</strong> ${s.narrative}
        </div>
        <div class="table-wrap">
          <table class="data-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Destination</th>
                <th>Arrival</th>
                <th>Visit</th>
                <th>Departure</th>
              </tr>
            </thead>
            <tbody>
      `;

      s.stops.forEach((st) => {
        html += `
          <tr>
            <td><b>${st.step}</b></td>
            <td><strong>${st.name}</strong></td>
            <td>${st.arrival || 'N/A'}</td>
            <td>${st.dwellMin || 30} min</td>
            <td>${st.departure || 'N/A'}</td>
          </tr>
        `;
      });

      html += '</tbody></table></div>';
      body.innerHTML = html;
    }
  } catch (err) {
    body.innerHTML = '<p style="color:#ef4444;">Failed to load summary</p>';
  }
}

document.addEventListener('DOMContentLoaded', initApp);

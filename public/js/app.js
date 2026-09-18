/* global MapRenderer, WeightSliderPanel, PresetSelector, ScoreBreakdownCard */

document.addEventListener('DOMContentLoaded', () => {
  const mapRenderer = new MapRenderer('map-container', {
    onMapClick: async (lat, lon) => {
      const name = prompt('Enter stop name:', `Location ${Date.now() % 1000}`);
      if (!name) return;
      await addStop(name, lat, lon);
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

  const sliderPanel = new WeightSliderPanel('slider-panel', async (weights) => {
    await fetch('/api/weights', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(weights),
    });
    await syncState();
  });

  const presetSelector = new PresetSelector('preset-container', async (presetName) => {
    const res = await fetch('/api/presets/select', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ presetName }),
    });
    const data = await res.json();
    if (data.weights) {
      sliderPanel.setWeights(data.weights);
    }
    await syncState();
  });

  const scoreCard = new ScoreBreakdownCard('factor-bars-container');

  // Persistence Buttons
  document.getElementById('btn-save-trip')?.addEventListener('click', async () => {
    const res = await fetch('/api/trip/save', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tripId: 'default-trip' }),
    });
    const data = await res.json();
    alert(data.message || 'Saved successfully!');
  });

  document.getElementById('btn-load-trip')?.addEventListener('click', async () => {
    const res = await fetch('/api/trip/load/default-trip');
    if (!res.ok) {
      alert('No saved trip found in SQLite.');
      return;
    }
    await syncState();
    alert('Saved trip reloaded from SQLite!');
  });

  // Load sample itinerary button
  document.getElementById('btn-sample-data')?.addEventListener('click', async () => {
    const sampleStops = [
      { name: 'Cubbon Park', lat: 12.9763, lon: 77.5929 },
      { name: 'Visvesvaraya Museum', lat: 12.9752, lon: 77.5963 },
      { name: 'Commercial Street', lat: 12.9822, lon: 77.6083 },
      { name: 'Lalbagh Botanical Garden', lat: 12.9507, lon: 77.5848 },
      { name: 'UB City', lat: 12.9719, lon: 77.5958 },
    ];

    for (const stop of sampleStops) {
      await fetch('/api/stops', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(stop),
      });
    }
    await syncState();
  });

  window.addOpeningHoursPrompt = async function(stopId) {
    const openTime = prompt('Enter opening time (HH:mm):', '10:00');
    if (!openTime) return;
    const closeTime = prompt('Enter closing time (HH:mm):', '17:00');
    if (!closeTime) return;

    const res = await fetch(`/api/stops/${stopId}/constraints`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'OPENING_HOURS', openTime, closeTime }),
    });
    const data = await res.json();
    if (!res.ok) {
      alert(`Error: ${data.error}`);
    } else {
      await syncState();
    }
  };

  async function addStop(name, lat, lon) {
    await fetch('/api/stops', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, lat, lon }),
    });
    await syncState();
  }

  window.removeStop = async function (id) {
    await fetch(`/api/stops/${id}`, { method: 'DELETE' });
    await syncState();
  };

  async function syncState() {
    const res = await fetch('/api/state');
    const state = await res.json();

    // 1. Update stats
    const report = state.routeReport;
    document.getElementById('stat-dist').textContent = `${report.totalDistanceKm} km`;
    document.getElementById('stat-time').textContent = `${report.totalTravelTimeMin} min`;
    document.getElementById('stat-score').textContent = report.score;

    // 2. Update violations alert
    const vContainer = document.getElementById('violation-container');
    if (report.violations && report.violations.length > 0) {
      vContainer.innerHTML = report.violations
        .map((v) => `<div class="alert-box">⚠️ <b>${v.type}</b>: ${v.message}</div>`)
        .join('');
    } else {
      vContainer.innerHTML = '';
    }

    // 3. Render map markers & polyline
    const activeRoute = state.rawRoute;
    mapRenderer.renderStops(activeRoute ? activeRoute.stops : state.stops);
    mapRenderer.renderRoutePolyline(activeRoute);

    // 4. Render score breakdown
    scoreCard.render(state.scoreBreakdown);

    // 5. Render stops list
    const stopsContainer = document.getElementById('stops-container');
    stopsContainer.innerHTML = (activeRoute ? activeRoute.stops : state.stops)
      .map(
        (s, idx) => `
      <div class="stop-item">
        <div class="stop-info">
          <div class="stop-title">${idx + 1}. ${s.name}</div>
          <div class="stop-meta">Arrival: ${s.scheduledArrival || 'N/A'} | (${s.lat.toFixed(4)}, ${s.lon.toFixed(4)})</div>
        </div>
        <button class="btn btn-danger" onclick="removeStop('${s.id}')">✕</button>
      </div>
    `
      )
      .join('');
  }

  // Initial load
  syncState();
});

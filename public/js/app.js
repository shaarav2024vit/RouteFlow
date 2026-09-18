/* global MapRenderer, WeightSliderPanel, PresetSelector, ScoreBreakdownCard */

document.addEventListener('DOMContentLoaded', () => {
  /* ─────────────────────────────────────────────────────────
   * STATE
   * ─────────────────────────────────────────────────────────*/
  let pendingLat = null;
  let pendingLon = null;
  let pendingHoursStopId = null;
  let pendingHoursStopName = null;
  let currentStops = [];

  /* ─────────────────────────────────────────────────────────
   * MODAL HELPERS
   * ─────────────────────────────────────────────────────────*/
  function openModal(id) {
    const el = document.getElementById(id);
    if (el) el.classList.add('open');
  }

  function closeModal(id) {
    const el = document.getElementById(id);
    if (el) el.classList.remove('open');
  }

  // Close on backdrop click
  document.querySelectorAll('.modal-overlay').forEach((overlay) => {
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) overlay.classList.remove('open');
    });
  });

  // Escape key closes any open modal
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      document.querySelectorAll('.modal-overlay.open').forEach((m) =>
        m.classList.remove('open')
      );
    }
  });

  /* ─────────────────────────────────────────────────────────
   * ADD STOP MODAL
   * ─────────────────────────────────────────────────────────*/
  const inputName = document.getElementById('input-stop-name');
  const inputCoords = document.getElementById('input-stop-coords');

  document.getElementById('btn-modal-close')?.addEventListener('click', () => closeModal('modal-add-stop'));
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

  // Confirm on Enter key in the name field
  inputName?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') document.getElementById('btn-modal-confirm').click();
  });

  /* ─────────────────────────────────────────────────────────
   * OPENING HOURS MODAL
   * ─────────────────────────────────────────────────────────*/
  document.getElementById('btn-hours-close')?.addEventListener('click', () => closeModal('modal-hours'));
  document.getElementById('btn-hours-cancel')?.addEventListener('click', () => closeModal('modal-hours'));

  document.getElementById('btn-hours-confirm')?.addEventListener('click', async () => {
    const openTime = document.getElementById('input-hours-open').value;
    const closeTime = document.getElementById('input-hours-close').value;
    closeModal('modal-hours');
    const res = await fetch(`/api/stops/${pendingHoursStopId}/constraints`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'OPENING_HOURS', openTime, closeTime }),
    });
    const data = await res.json();
    if (!res.ok) {
      showToast(`⚠️ ${data.error}`, 'warning');
    } else {
      await syncState();
    }
  });

  /* ─────────────────────────────────────────────────────────
   * GLOBAL HELPERS (called from map popups)
   * ─────────────────────────────────────────────────────────*/
  window.addOpeningHoursPrompt = function (stopId) {
    const stop = currentStops.find((s) => s.id === stopId);
    pendingHoursStopId = stopId;
    pendingHoursStopName = stop?.name || stopId;
    const label = document.getElementById('modal-hours-stopname');
    if (label) label.textContent = `Setting hours for: ${pendingHoursStopName}`;
    // Reset defaults
    document.getElementById('input-hours-open').value = '10:00';
    document.getElementById('input-hours-close').value = '17:00';
    openModal('modal-hours');
  };

  window.removeStop = async function (id) {
    await fetch(`/api/stops/${id}`, { method: 'DELETE' });
    await syncState();
  };

  /* ─────────────────────────────────────────────────────────
   * MAP RENDERER
   * ─────────────────────────────────────────────────────────*/
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

  /* ─────────────────────────────────────────────────────────
   * WEIGHT SLIDER PANEL
   * ─────────────────────────────────────────────────────────*/
  const sliderPanel = new WeightSliderPanel('slider-panel', async (weights) => {
    await fetch('/api/weights', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(weights),
    });
    await syncState();
  });

  /* ─────────────────────────────────────────────────────────
   * PRESET SELECTOR
   * ─────────────────────────────────────────────────────────*/
  const presetSelector = new PresetSelector('preset-container', async (presetName) => {
    const res = await fetch('/api/presets/select', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ presetName }),
    });
    const data = await res.json();
    if (data.weights) sliderPanel.setWeights(data.weights);
    await syncState();
  });

  /* ─────────────────────────────────────────────────────────
   * SCORE BREAKDOWN CARD
   * ─────────────────────────────────────────────────────────*/
  const scoreCard = new ScoreBreakdownCard('factor-bars-container');

  /* ─────────────────────────────────────────────────────────
   * HEADER BUTTON ACTIONS
   * ─────────────────────────────────────────────────────────*/
  document.getElementById('btn-save-trip')?.addEventListener('click', async () => {
    const res = await fetch('/api/trip/save', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tripId: 'default-trip' }),
    });
    const data = await res.json();
    showToast(data.message || '✅ Trip saved to SQLite');
  });

  document.getElementById('btn-load-trip')?.addEventListener('click', async () => {
    const res = await fetch('/api/trip/load/default-trip');
    if (!res.ok) {
      showToast('⚠️ No saved trip found.', 'warning');
      return;
    }
    await syncState();
    showToast('📂 Saved trip reloaded from SQLite');
  });

  document.getElementById('btn-clear-all')?.addEventListener('click', async () => {
    if (!currentStops.length) return;
    // Delete all stops
    for (const s of [...currentStops]) {
      await fetch(`/api/stops/${s.id}`, { method: 'DELETE' });
    }
    await syncState();
    showToast('🗑️ All stops cleared');
  });

  document.getElementById('btn-sample-data')?.addEventListener('click', async () => {
    const sampleStops = [
      { name: 'Cubbon Park',              lat: 12.9763, lon: 77.5929 },
      { name: 'Visvesvaraya Museum',      lat: 12.9752, lon: 77.5963 },
      { name: 'Commercial Street',        lat: 12.9822, lon: 77.6083 },
      { name: 'Lalbagh Botanical Garden', lat: 12.9507, lon: 77.5848 },
      { name: 'UB City Mall',             lat: 12.9719, lon: 77.5958 },
    ];
    showSpinner(true);
    for (const stop of sampleStops) {
      await fetch('/api/stops', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(stop),
      });
    }
    await syncState();
    showToast('✨ Sample Bangalore trip loaded!');
  });

  /* ─────────────────────────────────────────────────────────
   * CORE ACTIONS
   * ─────────────────────────────────────────────────────────*/
  async function addStop(name, lat, lon) {
    showSpinner(true);
    await fetch('/api/stops', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, lat, lon }),
    });
    await syncState();
  }

  /* ─────────────────────────────────────────────────────────
   * SYNC STATE — central update loop
   * ─────────────────────────────────────────────────────────*/
  async function syncState() {
    showSpinner(true);
    try {
      const res = await fetch('/api/state');
      const state = await res.json();

      const report = state.routeReport;
      currentStops = (state.rawRoute ? state.rawRoute.stops : state.stops) || [];

      // ① Stats
      const hasStops = currentStops.length > 0;
      document.getElementById('stat-dist').textContent =
        hasStops ? `${report.totalDistanceKm} km` : '—';
      document.getElementById('stat-time').textContent =
        hasStops ? `${report.totalTravelTimeMin} min` : '—';
      document.getElementById('stat-score').textContent =
        hasStops ? report.score : '—';

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

      // ② Violations
      const vContainer = document.getElementById('violation-container');
      vContainer.innerHTML =
        report.violations?.length > 0
          ? report.violations
              .map((v) => `<div class="alert-box">⚠️ <b>${v.type}</b>: ${v.message}</div>`)
              .join('')
          : '';

      // ③ Map
      mapRenderer.renderStops(currentStops);
      mapRenderer.renderRoutePolyline(state.rawRoute);

      // ④ Score breakdown
      scoreCard.render(state.scoreBreakdown);

      // ⑤ Stop count badge
      document.getElementById('badge-count').textContent =
        `${currentStops.length} Stop${currentStops.length !== 1 ? 's' : ''}`;

      // ⑥ Stops list
      renderStopList(currentStops);

      // Hide toast hint once stops exist
      const toast = document.getElementById('map-toast');
      if (toast) toast.classList.toggle('hidden', currentStops.length > 0);

    } catch (err) {
      console.error('syncState error', err);
    } finally {
      showSpinner(false);
    }
  }

  /* ─────────────────────────────────────────────────────────
   * RENDER STOP LIST
   * ─────────────────────────────────────────────────────────*/
  function renderStopList(stops) {
    const container = document.getElementById('stops-container');
    if (!stops.length) {
      container.innerHTML = `
        <div class="empty-state">
          <span class="icon">📍</span>
          Click on the map to add your first stop
        </div>`;
      return;
    }

    container.innerHTML = stops
      .map(
        (s, idx) => `
        <div class="stop-item" id="stop-item-${s.id}">
          <div class="stop-badge">${idx + 1}</div>
          <div class="stop-info">
            <div class="stop-title">${escHtml(s.name)}</div>
            <div class="stop-meta">
              ${s.scheduledArrival
                ? `<span class="tag">🕐 ${s.scheduledArrival}</span>`
                : ''}
              <span style="color:var(--text-muted)">${s.lat.toFixed(4)}, ${s.lon.toFixed(4)}</span>
            </div>
          </div>
          <div class="stop-actions">
            <button
              class="btn-icon btn-icon-info"
              title="Set opening hours"
              onclick="window.addOpeningHoursPrompt('${s.id}')"
            >🕐</button>
            <button
              class="btn-icon btn-icon-danger"
              title="Remove stop"
              onclick="window.removeStop('${s.id}')"
            >✕</button>
          </div>
        </div>`
      )
      .join('');
  }

  /* ─────────────────────────────────────────────────────────
   * UTILITIES
   * ─────────────────────────────────────────────────────────*/
  function showSpinner(visible) {
    const el = document.getElementById('route-spinner');
    if (el) el.classList.toggle('visible', visible);
  }

  let toastTimer = null;
  function showToast(msg, type = 'info') {
    // Reuse map-toast or create an ephemeral notification
    // We create a floating notification at the top-center
    const existing = document.getElementById('app-toast');
    if (existing) existing.remove();
    clearTimeout(toastTimer);

    const el = document.createElement('div');
    el.id = 'app-toast';
    el.style.cssText = `
      position:fixed;top:72px;left:50%;transform:translateX(-50%);
      background:var(--bg-surface-elevated);
      border:1px solid var(--border-hover);
      color:var(--text);padding:9px 20px;border-radius:var(--radius-full);
      font-size:0.82rem;font-weight:600;z-index:99999;
      box-shadow:var(--shadow-md);
      opacity:0;transition:opacity 0.2s;pointer-events:none;
      font-family:'Plus Jakarta Sans',sans-serif;
    `;
    if (type === 'warning') el.style.borderColor = 'rgba(245,158,11,0.5)';
    el.textContent = msg;
    document.body.appendChild(el);
    requestAnimationFrame(() => { el.style.opacity = '1'; });
    toastTimer = setTimeout(() => {
      el.style.opacity = '0';
      setTimeout(() => el.remove(), 250);
    }, 2800);
  }

  function escHtml(str) {
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  /* ─────────────────────────────────────────────────────────
   * INIT
   * ─────────────────────────────────────────────────────────*/
  syncState();
});

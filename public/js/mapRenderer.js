/* global L */

/**
 * MapRenderer
 * Traces to: 3.1.1, FR-1, FR-3; Week 4 §2.2.
 * Handles Leaflet map rendering, click-to-add stop markers, and polyline route drawing.
 *
 * Stale-request fix: each renderRoutePolyline() call increments `_renderGen`.
 * If the OSRM fetch resolves after a newer call has already started, the old
 * result is silently discarded — preventing ghost routes from appearing after
 * a Clear All.
 */
class MapRenderer {
  constructor(containerId, { onMapClick, onMarkerDrag }) {
    this.onMapClick    = onMapClick;
    this.onMarkerDrag  = onMarkerDrag;
    this.markers       = new Map();
    this.polyline      = null;
    this.searchMarker  = null;
    this.transitMode   = 'driving';
    this._renderGen    = 0;          // incremented on every renderRoutePolyline call

    this.map = L.map(containerId, { zoomControl: false }).setView([20, 0], 2);

    L.control.zoom({ position: 'bottomleft' }).addTo(this.map);

    L.tileLayer(
      'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
      {
        attribution:
          '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        maxZoom: 19,
      }
    ).addTo(this.map);

    this.map.on('click', (e) => {
      if (this.onMapClick) this.onMapClick(e.latlng.lat, e.latlng.lng);
    });
  }

  /* ─────────────────────────────────────────────────────────
   * SET TRANSIT MODE (driving, walking, cycling)
   * ─────────────────────────────────────────────────────────*/
  setTransitMode(mode) {
    if (['driving', 'walking', 'cycling'].includes(mode)) {
      this.transitMode = mode;
    }
  }

  /* ─────────────────────────────────────────────────────────
   * FLY TO a lat/lon (used after loading a sample trip)
   * ─────────────────────────────────────────────────────────*/
  flyTo(lat, lon, zoom = 13) {
    this.map.flyTo([lat, lon], zoom, { duration: 1.2 });
  }

  /* ─────────────────────────────────────────────────────────
   * FIT ROUTE BOUNDS
   * ─────────────────────────────────────────────────────────*/
  fitRoute() {
    if (this.polyline) {
      this.map.fitBounds(this.polyline.getBounds(), { padding: [60, 60], maxZoom: 16 });
      return;
    }
    if (this.markers.size > 0) {
      const latlngs = Array.from(this.markers.values()).map((m) => m.getLatLng());
      this.map.fitBounds(L.latLngBounds(latlngs), { padding: [60, 60], maxZoom: 16 });
    }
  }

  /* ─────────────────────────────────────────────────────────
   * HIGHLIGHT MARKER (pulsing glow on hover in sidebar)
   * ─────────────────────────────────────────────────────────*/
  highlightMarker(stopId, isHovered) {
    const marker = this.markers.get(stopId);
    if (!marker) return;
    const el = marker.getElement();
    if (!el) return;
    const wrap = el.querySelector('.marker-wrap');
    if (wrap) {
      if (isHovered) wrap.classList.add('pulse-highlight');
      else wrap.classList.remove('pulse-highlight');
    }
  }

  /* ─────────────────────────────────────────────────────────
   * SHOW SEARCH RESULT PIN
   * ─────────────────────────────────────────────────────────*/
  showSearchResult(lat, lon, name, onAdd) {
    if (this.searchMarker) {
      this.map.removeLayer(this.searchMarker);
      this.searchMarker = null;
    }

    const icon = L.divIcon({
      className: '',
      html: `
        <div style="width:38px;height:38px;display:flex;align-items:center;justify-content:center;
          background:linear-gradient(135deg,#f59e0b,#d97706);color:#fff;border-radius:50%;
          border:3px solid #fff;box-shadow:0 0 20px rgba(245,158,11,0.8);font-size:16px;cursor:pointer;">
          📍
        </div>`,
      iconSize: [38, 38],
      iconAnchor: [19, 19],
      popupAnchor: [0, -22],
    });

    this.searchMarker = L.marker([lat, lon], { icon }).addTo(this.map);
    const popupContent = document.createElement('div');
    popupContent.style.cssText = "font-family:'Plus Jakarta Sans',sans-serif;padding:8px;min-width:180px;background:#111827;border-radius:10px;";
    popupContent.innerHTML = `
      <div style="font-size:11px;color:#f59e0b;font-weight:700;text-transform:uppercase;margin-bottom:3px">Search Result</div>
      <div style="font-size:13px;font-weight:700;color:#f1f5f9;margin-bottom:8px">${name}</div>
      <button id="btn-quick-add-search" style="width:100%;background:linear-gradient(135deg,#38bdf8,#818cf8);color:#fff;border:none;border-radius:6px;padding:6px 12px;font-weight:700;font-size:12px;cursor:pointer;font-family:inherit">
        + Add to Itinerary
      </button>`;

    this.searchMarker.bindPopup(popupContent).openPopup();

    popupContent.querySelector('#btn-quick-add-search')?.addEventListener('click', () => {
      if (this.searchMarker) {
        this.map.removeLayer(this.searchMarker);
        this.searchMarker = null;
      }
      if (onAdd) onAdd(name, lat, lon);
    });

    this.flyTo(lat, lon, 14);
  }

  /* ─────────────────────────────────────────────────────────
   * RENDER STOP MARKERS
   * ─────────────────────────────────────────────────────────*/
  renderStops(stops) {
    const currentIds = new Set(stops.map((s) => s.id));
    for (const [id, marker] of this.markers.entries()) {
      if (!currentIds.has(id)) {
        this.map.removeLayer(marker);
        this.markers.delete(id);
      }
    }

    stops.forEach((stop, index) => {
      const isFirst = index === 0;
      const isLast  = index === stops.length - 1 && stops.length > 1;

      if (this.markers.has(stop.id)) {
        const marker = this.markers.get(stop.id);
        marker.setLatLng([stop.lat, stop.lon]);
        const el = marker.getElement();
        if (el) {
          const num  = el.querySelector('.marker-num');
          const wrap = el.querySelector('.marker-wrap');
          if (num)  num.textContent = index + 1;
          if (wrap) wrap.className = `marker-wrap${isFirst ? ' first' : isLast ? ' last' : ''}`;
        }
        marker.setPopupContent(this._buildPopup(stop, index));
      } else {
        const icon = L.divIcon({
          className: '',
          html: this._buildMarkerHtml(index + 1, isFirst, isLast),
          iconSize:    [36, 36],
          iconAnchor:  [18, 18],
          popupAnchor: [0, -20],
        });

        const marker = L.marker([stop.lat, stop.lon], { draggable: true, icon })
          .addTo(this.map)
          .bindPopup(this._buildPopup(stop, index), { maxWidth: 260, className: 'rf-popup' });

        marker.on('dragend', () => {
          const pos = marker.getLatLng();
          if (this.onMarkerDrag) this.onMarkerDrag(stop.id, pos.lat, pos.lng);
        });

        this.markers.set(stop.id, marker);
      }
    });
  }

  /* ─────────────────────────────────────────────────────────
   * RENDER ROUTE POLYLINE  (stale-request safe & multi-modal)
   * ─────────────────────────────────────────────────────────*/
  async renderRoutePolyline(route, transitMode = null) {
    // Always remove whatever polyline is currently on the map
    if (this.polyline) {
      this.map.removeLayer(this.polyline);
      this.polyline = null;
    }

    if (!route || !route.stops || route.stops.length < 2) return;

    const mode = transitMode || this.transitMode || 'driving';

    // Capture the generation token for this call
    const gen = ++this._renderGen;

    const coords = route.stops.map((s) => [s.lon, s.lat]); // OSRM lon,lat
    if (route.isRoundTrip && coords.length >= 2) {
      coords.push([route.stops[0].lon, route.stops[0].lat]);
    }

    try {
      const coordsStr = coords.map((c) => `${c[0]},${c[1]}`).join(';');
      const profile = mode === 'walking' ? 'walking' : mode === 'cycling' ? 'cycling' : 'driving';
      const url = `https://router.project-osrm.org/route/v1/${profile}/${coordsStr}?overview=full&geometries=geojson`;

      const controller = new AbortController();
      const tid = setTimeout(() => controller.abort(), 4500);
      const resp = await fetch(url, { signal: controller.signal });
      clearTimeout(tid);

      // Discard if a newer renderRoutePolyline has started since we began fetching
      if (gen !== this._renderGen) return;

      if (resp.ok) {
        const data = await resp.json();
        if (data.routes?.[0]?.geometry) {
          const latlngs = data.routes[0].geometry.coordinates.map((c) => [c[1], c[0]]);
          if (gen !== this._renderGen) return;
          this._drawPolyline(latlngs, false);
          return;
        }
      }
    } catch {
      // OSRM timeout or network error — fall through to great-circle fallback
    }

    // Discard stale fallback too
    if (gen !== this._renderGen) return;

    const latlngs = route.stops.map((s) => [s.lat, s.lon]);
    if (route.isRoundTrip && latlngs.length >= 2) {
      latlngs.push([route.stops[0].lat, route.stops[0].lon]);
    }
    this._drawPolyline(latlngs, true);
  }

  /* ─────────────────────────────────────────────────────────
   * INTERNAL HELPERS
   * ─────────────────────────────────────────────────────────*/
  _drawPolyline(latlngs, isDashed) {
    const opts = isDashed
      ? { color: '#38bdf8', weight: 3, opacity: 0.7, dashArray: '8 8', lineJoin: 'round' }
      : { color: '#38bdf8', weight: 5, opacity: 0.9, lineJoin: 'round', lineCap: 'round' };

    this.polyline = L.polyline(latlngs, opts).addTo(this.map);
  }

  _buildMarkerHtml(num, isFirst, isLast) {
    const bg = isFirst
      ? 'linear-gradient(135deg,#10b981,#059669);box-shadow:0 4px 16px rgba(16,185,129,0.6)'
      : isLast
      ? 'linear-gradient(135deg,#ef4444,#b91c1c);box-shadow:0 4px 16px rgba(239,68,68,0.6)'
      : 'linear-gradient(135deg,#38bdf8,#818cf8);box-shadow:0 4px 16px rgba(56,189,248,0.55)';

    return `<div class="marker-wrap${isFirst ? ' first' : isLast ? ' last' : ''}" style="
      width:36px;height:36px;display:flex;align-items:center;justify-content:center;
      background:${bg};color:#fff;border-radius:50%;border:2.5px solid rgba(255,255,255,0.85);
      font-weight:800;font-size:14px;font-family:'Plus Jakarta Sans',sans-serif;
      cursor:pointer;user-select:none;">
        <span class="marker-num">${num}</span>
      </div>`;
  }

  _buildPopup(stop, index) {
    const arrival = stop.scheduledArrival || '—';
    return `
      <div style="font-family:'Plus Jakarta Sans',sans-serif;padding:14px 16px;min-width:200px;background:#111827;border-radius:12px;">
        <div style="font-size:11px;color:#94a3b8;font-weight:600;text-transform:uppercase;letter-spacing:.05em;margin-bottom:4px">Stop #${index + 1}</div>
        <div style="font-size:15px;font-weight:700;color:#f1f5f9;margin-bottom:10px">${stop.name}</div>
        <div style="font-size:12px;color:#64748b;margin-bottom:10px">
          🕐 Arrival: <b style="color:#38bdf8">${arrival}</b>
          &nbsp;·&nbsp;
          <span style="font-family:'JetBrains Mono',monospace;font-size:11px">${stop.lat.toFixed(4)}, ${stop.lon.toFixed(4)}</span>
        </div>
        <div style="border-top:1px solid rgba(255,255,255,0.08);padding-top:10px;display:flex;flex-wrap:wrap;gap:6px">
          <button onclick="window.addOpeningHoursPrompt('${stop.id}')"
            style="flex:1;min-width:70px;background:rgba(56,189,248,0.15);color:#38bdf8;border:1px solid rgba(56,189,248,0.3);border-radius:6px;padding:6px 8px;font-size:11px;font-weight:600;cursor:pointer;font-family:inherit"
            onmouseover="this.style.background='rgba(56,189,248,0.28)'" onmouseout="this.style.background='rgba(56,189,248,0.15)'">🕐 Hours</button>
          <button onclick="window.addPrecedencePrompt('${stop.id}')"
            style="flex:1;min-width:70px;background:rgba(129,140,248,0.15);color:#a5b4fc;border:1px solid rgba(129,140,248,0.3);border-radius:6px;padding:6px 8px;font-size:11px;font-weight:600;cursor:pointer;font-family:inherit"
            onmouseover="this.style.background='rgba(129,140,248,0.28)'" onmouseout="this.style.background='rgba(129,140,248,0.15)'">🔀 Order</button>
          <button onclick="window.removeStop('${stop.id}')"
            style="flex:1;min-width:60px;background:rgba(239,68,68,0.12);color:#fca5a5;border:1px solid rgba(239,68,68,0.3);border-radius:6px;padding:6px 8px;font-size:11px;font-weight:600;cursor:pointer;font-family:inherit"
            onmouseover="this.style.background='rgba(239,68,68,0.28)'" onmouseout="this.style.background='rgba(239,68,68,0.12)'">✕ Delete</button>
        </div>
      </div>`;
  }
}

window.MapRenderer = MapRenderer;

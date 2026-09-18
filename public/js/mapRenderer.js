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
    this._renderGen    = 0;          // incremented on every renderRoutePolyline call

    this.map = L.map(containerId, { zoomControl: false }).setView([20, 0], 2);

    L.control.zoom({ position: 'bottomleft' }).addTo(this.map);

    L.tileLayer(
      'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png',
      {
        attribution:
          '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
        maxZoom: 19,
        subdomains: 'abcd',
      }
    ).addTo(this.map);

    this.map.on('click', (e) => {
      if (this.onMapClick) this.onMapClick(e.latlng.lat, e.latlng.lng);
    });
  }

  /* ─────────────────────────────────────────────────────────
   * FLY TO a lat/lon (used after loading a sample trip)
   * ─────────────────────────────────────────────────────────*/
  flyTo(lat, lon, zoom = 13) {
    this.map.flyTo([lat, lon], zoom, { duration: 1.2 });
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
   * RENDER ROUTE POLYLINE  (stale-request safe)
   * ─────────────────────────────────────────────────────────*/
  async renderRoutePolyline(route) {
    // Always remove whatever polyline is currently on the map
    if (this.polyline) {
      this.map.removeLayer(this.polyline);
      this.polyline = null;
    }

    if (!route || !route.stops || route.stops.length < 2) return;

    // Capture the generation token for this call
    const gen = ++this._renderGen;

    const coordinates = route.stops.map((s) => [s.lon, s.lat]); // OSRM lon,lat

    try {
      const coordsStr = coordinates.map((c) => `${c[0]},${c[1]}`).join(';');
      const url = `https://router.project-osrm.org/route/v1/driving/${coordsStr}?overview=full&geometries=geojson`;

      const controller = new AbortController();
      const tid = setTimeout(() => controller.abort(), 4000);
      const resp = await fetch(url, { signal: controller.signal });
      clearTimeout(tid);

      // Discard if a newer renderRoutePolyline has started since we began fetching
      if (gen !== this._renderGen) return;

      if (resp.ok) {
        const data = await resp.json();
        if (data.routes?.[0]?.geometry) {
          const latlngs = data.routes[0].geometry.coordinates.map((c) => [c[1], c[0]]);
          if (gen !== this._renderGen) return; // one more guard after await
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
    this.map.fitBounds(this.polyline.getBounds(), { padding: [55, 55], maxZoom: 15 });
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
        <div style="border-top:1px solid rgba(255,255,255,0.08);padding-top:10px;display:flex;gap:6px">
          <button onclick="window.addOpeningHoursPrompt('${stop.id}')"
            style="flex:1;background:rgba(56,189,248,0.15);color:#38bdf8;border:1px solid rgba(56,189,248,0.3);border-radius:6px;padding:6px 8px;font-size:11px;font-weight:600;cursor:pointer;font-family:inherit"
            onmouseover="this.style.background='rgba(56,189,248,0.28)'" onmouseout="this.style.background='rgba(56,189,248,0.15)'">🕐 Set Hours</button>
          <button onclick="window.removeStop('${stop.id}')"
            style="flex:1;background:rgba(239,68,68,0.12);color:#fca5a5;border:1px solid rgba(239,68,68,0.3);border-radius:6px;padding:6px 8px;font-size:11px;font-weight:600;cursor:pointer;font-family:inherit"
            onmouseover="this.style.background='rgba(239,68,68,0.28)'" onmouseout="this.style.background='rgba(239,68,68,0.12)'">✕ Remove</button>
        </div>
      </div>`;
  }
}

window.MapRenderer = MapRenderer;

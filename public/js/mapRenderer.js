/* global L */

/**
 * MapRenderer
 * Traces to: 3.1.1, FR-1, FR-3; Week 4 §2.2.
 * Handles Leaflet map rendering, click-to-add stop markers, and polyline route drawing.
 */
class MapRenderer {
  constructor(containerId, { onMapClick, onMarkerDrag }) {
    this.onMapClick = onMapClick;
    this.onMarkerDrag = onMarkerDrag;
    this.markers = new Map();
    this.polyline = null;
    this.animFrame = null;

    // Centre on Bangalore (12.9716, 77.5946)
    this.map = L.map(containerId, { zoomControl: false }).setView([12.9716, 77.5946], 13);

    // Zoom control bottom-left
    L.control.zoom({ position: 'bottomleft' }).addTo(this.map);

    // CartoDB Voyager tile — clean, readable, works in dark UI
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
   * RENDER STOP MARKERS
   * ─────────────────────────────────────────────────────────*/
  renderStops(stops) {
    // Remove stale markers
    const currentIds = new Set(stops.map((s) => s.id));
    for (const [id, marker] of this.markers.entries()) {
      if (!currentIds.has(id)) {
        this.map.removeLayer(marker);
        this.markers.delete(id);
      }
    }

    stops.forEach((stop, index) => {
      const isFirst = index === 0;
      const isLast = index === stops.length - 1 && stops.length > 1;
      const markerHtml = this._buildMarkerHtml(index + 1, isFirst, isLast);

      if (this.markers.has(stop.id)) {
        const marker = this.markers.get(stop.id);
        marker.setLatLng([stop.lat, stop.lon]);

        // Update pin number
        const el = marker.getElement();
        if (el) {
          const pin = el.querySelector('.marker-num');
          if (pin) pin.textContent = index + 1;
          // Update colour class
          const wrap = el.querySelector('.marker-wrap');
          if (wrap) {
            wrap.className = `marker-wrap${isFirst ? ' first' : isLast ? ' last' : ''}`;
          }
        }
        marker.setPopupContent(this._buildPopup(stop, index));
      } else {
        const icon = L.divIcon({
          className: '',
          html: markerHtml,
          iconSize: [36, 36],
          iconAnchor: [18, 18],
          popupAnchor: [0, -20],
        });

        const marker = L.marker([stop.lat, stop.lon], { draggable: true, icon })
          .addTo(this.map)
          .bindPopup(this._buildPopup(stop, index), {
            maxWidth: 260,
            className: 'rf-popup',
          });

        marker.on('dragend', () => {
          const pos = marker.getLatLng();
          if (this.onMarkerDrag) this.onMarkerDrag(stop.id, pos.lat, pos.lng);
        });

        this.markers.set(stop.id, marker);
      }
    });
  }

  /* ─────────────────────────────────────────────────────────
   * BUILD MARKER HTML
   * ─────────────────────────────────────────────────────────*/
  _buildMarkerHtml(num, isFirst, isLast) {
    const colours = isFirst
      ? 'background:linear-gradient(135deg,#10b981,#059669);box-shadow:0 4px 16px rgba(16,185,129,0.6)'
      : isLast
      ? 'background:linear-gradient(135deg,#ef4444,#b91c1c);box-shadow:0 4px 16px rgba(239,68,68,0.6)'
      : 'background:linear-gradient(135deg,#38bdf8,#818cf8);box-shadow:0 4px 16px rgba(56,189,248,0.55)';

    return `
      <div class="marker-wrap${isFirst ? ' first' : isLast ? ' last' : ''}" style="
        width:36px;height:36px;display:flex;align-items:center;justify-content:center;
        ${colours};
        color:#fff;border-radius:50%;border:2.5px solid rgba(255,255,255,0.85);
        font-weight:800;font-size:14px;
        font-family:'Plus Jakarta Sans',sans-serif;
        cursor:pointer;user-select:none;
        transition:transform 0.15s;
      ">
        <span class="marker-num">${num}</span>
      </div>`;
  }

  /* ─────────────────────────────────────────────────────────
   * BUILD POPUP CONTENT
   * ─────────────────────────────────────────────────────────*/
  _buildPopup(stop, index) {
    const arrivalLabel = stop.scheduledArrival || '09:00';
    return `
      <div style="
        font-family:'Plus Jakarta Sans',sans-serif;
        padding:14px 16px;min-width:200px;
        background:#111827;border-radius:12px;
      ">
        <div style="font-size:12px;color:#94a3b8;font-weight:600;margin-bottom:4px;text-transform:uppercase;letter-spacing:0.05em;">
          Stop #${index + 1}
        </div>
        <div style="font-size:15px;font-weight:700;color:#f1f5f9;margin-bottom:10px;">
          ${stop.name}
        </div>
        <div style="font-size:12px;color:#64748b;margin-bottom:10px;">
          🕐 Arrival: <b style="color:#38bdf8">${arrivalLabel}</b>
          &nbsp;·&nbsp;
          <span style="font-family:'JetBrains Mono',monospace;font-size:11px;">${stop.lat.toFixed(4)}, ${stop.lon.toFixed(4)}</span>
        </div>
        <div style="border-top:1px solid rgba(255,255,255,0.08);padding-top:10px;display:flex;gap:6px;">
          <button onclick="window.addOpeningHoursPrompt('${stop.id}')"
            style="
              flex:1;background:rgba(56,189,248,0.15);color:#38bdf8;
              border:1px solid rgba(56,189,248,0.3);border-radius:6px;
              padding:6px 8px;font-size:11px;font-weight:600;cursor:pointer;
              font-family:'Plus Jakarta Sans',sans-serif;transition:background 0.15s;
            "
            onmouseover="this.style.background='rgba(56,189,248,0.28)'"
            onmouseout="this.style.background='rgba(56,189,248,0.15)'"
          >🕐 Set Hours</button>
          <button onclick="window.removeStop('${stop.id}')"
            style="
              flex:1;background:rgba(239,68,68,0.12);color:#fca5a5;
              border:1px solid rgba(239,68,68,0.3);border-radius:6px;
              padding:6px 8px;font-size:11px;font-weight:600;cursor:pointer;
              font-family:'Plus Jakarta Sans',sans-serif;transition:background 0.15s;
            "
            onmouseover="this.style.background='rgba(239,68,68,0.28)'"
            onmouseout="this.style.background='rgba(239,68,68,0.12)'"
          >✕ Remove</button>
        </div>
      </div>`;
  }

  /* ─────────────────────────────────────────────────────────
   * RENDER ROUTE POLYLINE
   * ─────────────────────────────────────────────────────────*/
  async renderRoutePolyline(route) {
    if (this.polyline) {
      this.map.removeLayer(this.polyline);
      this.polyline = null;
    }

    if (!route || !route.stops || route.stops.length < 2) return;

    const coordinates = route.stops.map((s) => [s.lon, s.lat]); // OSRM: lon,lat

    try {
      const coordsStr = coordinates.map((c) => `${c[0]},${c[1]}`).join(';');
      const url = `https://router.project-osrm.org/route/v1/driving/${coordsStr}?overview=full&geometries=geojson`;

      const controller = new AbortController();
      const tId = setTimeout(() => controller.abort(), 3500);
      const resp = await fetch(url, { signal: controller.signal });
      clearTimeout(tId);

      if (resp.ok) {
        const data = await resp.json();
        if (data.routes?.[0]?.geometry) {
          const latlngs = data.routes[0].geometry.coordinates.map((c) => [c[1], c[0]]);
          this._drawPolyline(latlngs, false);
          return;
        }
      }
    } catch {
      // OSRM unavailable — fall through to great-circle fallback
    }

    // Fallback: straight great-circle line with dashes
    const latlngs = route.stops.map((s) => [s.lat, s.lon]);
    this._drawPolyline(latlngs, true);
  }

  _drawPolyline(latlngs, isDashed) {
    const opts = isDashed
      ? {
          color: '#38bdf8',
          weight: 3,
          opacity: 0.75,
          dashArray: '8, 8',
          lineJoin: 'round',
        }
      : {
          color: '#38bdf8',
          weight: 5,
          opacity: 0.9,
          lineJoin: 'round',
          lineCap: 'round',
        };

    this.polyline = L.polyline(latlngs, opts).addTo(this.map);
    this.map.fitBounds(this.polyline.getBounds(), { padding: [50, 50], maxZoom: 15 });
  }
}

window.MapRenderer = MapRenderer;

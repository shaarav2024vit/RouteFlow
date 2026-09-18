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

    // Center on Bangalore (12.9716, 77.5946)
    this.map = L.map(containerId).setView([12.9716, 77.5946], 13);

    // Modern OpenStreetMap dark/carto tile layer
    L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
      maxZoom: 19,
    }).addTo(this.map);

    this.map.on('click', (e) => {
      if (this.onMapClick) {
        this.onMapClick(e.latlng.lat, e.latlng.lng);
      }
    });
  }

  renderStops(stops) {
    // Clean removed markers
    const currentStopIds = new Set(stops.map((s) => s.id));
    for (const [id, marker] of this.markers.entries()) {
      if (!currentStopIds.has(id)) {
        this.map.removeLayer(marker);
        this.markers.delete(id);
      }
    }

    // Add or update markers
    stops.forEach((stop, index) => {
      if (this.markers.has(stop.id)) {
        const marker = this.markers.get(stop.id);
        marker.setLatLng([stop.lat, stop.lon]);
        const el = marker.getElement();
        if (el && el.querySelector('div')) {
          el.querySelector('div').innerText = index + 1;
        }
        marker.setPopupContent(`
          <div style="font-family: sans-serif; color: #1f2937; padding: 4px;">
            <b style="font-size: 14px; color: #0284c7;">#${index + 1} ${stop.name}</b><br>
            <span style="font-size: 12px; color: #4b5563;">Arrival: <b>${stop.scheduledArrival || '09:00'}</b></span><br>
            <small style="color: #6b7280;">(${stop.lat.toFixed(4)}, ${stop.lon.toFixed(4)})</small>
            <hr style="margin: 8px 0; border: none; border-top: 1px solid #e5e7eb;">
            <div style="display: flex; gap: 4px;">
              <button onclick="window.addOpeningHoursPrompt('${stop.id}')" style="background:#0284c7;color:white;border:none;border-radius:4px;padding:4px 8px;font-size:11px;cursor:pointer;">+ Hours</button>
              <button onclick="window.removeStop('${stop.id}')" style="background:#ef4444;color:white;border:none;border-radius:4px;padding:4px 8px;font-size:11px;cursor:pointer;">Delete</button>
            </div>
          </div>
        `);
      } else {
        const markerHtml = `
          <div style="
            background: linear-gradient(135deg, #38bdf8, #818cf8);
            color: #0d1117;
            border: 2px solid #ffffff;
            border-radius: 50%;
            width: 32px;
            height: 32px;
            display: flex;
            align-items: center;
            justify-content: center;
            font-weight: 700;
            font-size: 14px;
            box-shadow: 0 4px 10px rgba(0,0,0,0.5);
          ">${index + 1}</div>
        `;
        const icon = L.divIcon({
          className: 'custom-marker',
          html: markerHtml,
          iconSize: [32, 32],
          iconAnchor: [16, 16],
          popupAnchor: [0, -18],
        });

        const marker = L.marker([stop.lat, stop.lon], { draggable: true, icon }).addTo(this.map);
        marker.bindPopup(`
          <div style="font-family: sans-serif; color: #1f2937; padding: 4px;">
            <b style="font-size: 14px; color: #0284c7;">#${index + 1} ${stop.name}</b><br>
            <span style="font-size: 12px; color: #4b5563;">Arrival: <b>${stop.scheduledArrival || '09:00'}</b></span><br>
            <small style="color: #6b7280;">(${stop.lat.toFixed(4)}, ${stop.lon.toFixed(4)})</small>
            <hr style="margin: 8px 0; border: none; border-top: 1px solid #e5e7eb;">
            <div style="display: flex; gap: 4px;">
              <button onclick="window.addOpeningHoursPrompt('${stop.id}')" style="background:#0284c7;color:white;border:none;border-radius:4px;padding:4px 8px;font-size:11px;cursor:pointer;">+ Hours</button>
              <button onclick="window.removeStop('${stop.id}')" style="background:#ef4444;color:white;border:none;border-radius:4px;padding:4px 8px;font-size:11px;cursor:pointer;">Delete</button>
            </div>
          </div>
        `);

        marker.on('dragend', () => {
          const pos = marker.getLatLng();
          if (this.onMarkerDrag) {
            this.onMarkerDrag(stop.id, pos.lat, pos.lng);
          }
        });

        this.markers.set(stop.id, marker);
      }
    });
  }

  async renderRoutePolyline(route) {
    if (this.polyline) {
      this.map.removeLayer(this.polyline);
      this.polyline = null;
    }

    if (!route || !route.stops || route.stops.length < 2) return;

    const coordinates = route.stops.map((s) => [s.lon, s.lat]); // OSRM expects lon,lat

    try {
      // Query free public OSRM router for real road geometry
      const coordsString = coordinates.map((c) => `${c[0]},${c[1]}`).join(';');
      const url = `https://router.project-osrm.org/route/v1/driving/${coordsString}?overview=full&geometries=geojson`;
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2500);

      const resp = await fetch(url, { signal: controller.signal });
      clearTimeout(timeoutId);

      if (resp.ok) {
        const data = await resp.json();
        if (data.routes && data.routes[0] && data.routes[0].geometry) {
          const geojsonCoords = data.routes[0].geometry.coordinates; // [lon, lat]
          const latlngs = geojsonCoords.map((c) => [c[1], c[0]]);

          this.polyline = L.polyline(latlngs, {
            color: '#38bdf8',
            weight: 5,
            opacity: 0.9,
            lineJoin: 'round',
          }).addTo(this.map);

          // Fit bounds smoothly
          this.map.fitBounds(this.polyline.getBounds(), { padding: [40, 40] });
          return;
        }
      }
    } catch (e) {
      // OSRM unavailable/timeout - smoothly fall back to great-circle straight segment line
    }

    // Fallback: great-circle straight polyline
    const latlngs = route.stops.map((s) => [s.lat, s.lon]);
    this.polyline = L.polyline(latlngs, {
      color: '#38bdf8',
      weight: 4,
      opacity: 0.85,
      dashArray: '6, 6',
    }).addTo(this.map);
    this.map.fitBounds(this.polyline.getBounds(), { padding: [40, 40] });
  }
}

window.MapRenderer = MapRenderer;

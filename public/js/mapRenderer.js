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
        marker.bindPopup(`<b>${stop.name}</b><br>Sequence: ${index + 1}<br>Arrival: ${stop.scheduledArrival || 'N/A'}`);
      } else {
        const marker = L.marker([stop.lat, stop.lon], { draggable: true }).addTo(this.map);
        marker.bindPopup(`<b>${stop.name}</b><br>Sequence: ${index + 1}<br>Arrival: ${stop.scheduledArrival || 'N/A'}`);

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

  renderRoutePolyline(route) {
    if (this.polyline) {
      this.map.removeLayer(this.polyline);
      this.polyline = null;
    }

    if (!route || !route.stops || route.stops.length < 2) return;

    const latlngs = route.stops.map((s) => [s.lat, s.lon]);
    this.polyline = L.polyline(latlngs, {
      color: '#38bdf8',
      weight: 4,
      opacity: 0.85,
      dashArray: '8, 8',
    }).addTo(this.map);
  }
}

window.MapRenderer = MapRenderer;

const express = require('express');
const path = require('path');
const { StopManager } = require('./stops/StopManager');
const { OpeningHoursConstraint } = require('./stops/OpeningHoursConstraint');
const { PrecedenceConstraint } = require('./stops/PrecedenceConstraint');
const { ResequencingController } = require('./routing/ResequencingController');
const { PRESETS } = require('./scoring/MultiObjectiveScorer');
const { SAMPLE_TRIPS } = require('./data/sampleTrips');
const { TripRepository } = require('./db/database');

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, '../public')));

// Global state instances
const stopManager = new StopManager();
const controller = new ResequencingController(stopManager, { preset: 'BALANCED' });
let activeTripId = 'trip-paris-default';

// Load default initial trip into memory and database
function loadSampleTrip(sampleKey) {
  const sample = SAMPLE_TRIPS[sampleKey] || SAMPLE_TRIPS.paris;
  activeTripId = `trip-${sample.key}`;
  stopManager.stops = [];
  stopManager.tripConfig = null;

  stopManager.setTripConfig(
    sample.tripConfig.startTime,
    sample.tripConfig.startLat,
    sample.tripConfig.startLon
  );
  if (sample.tripConfig.maxDurationMin) {
    stopManager.tripConfig.maxDurationMin = sample.tripConfig.maxDurationMin;
  }
  if (sample.tripConfig.maxDistanceKm) {
    stopManager.tripConfig.maxDistanceKm = sample.tripConfig.maxDistanceKm;
  }

  const createdStops = [];
  for (const s of sample.stops) {
    const added = stopManager.addStop({
      name: s.name,
      lat: s.lat,
      lon: s.lon,
      prefStart: s.prefStart || null,
      prefEnd: s.prefEnd || null,
      dwellTimeMin: s.dwellTimeMin || 30,
      popularity: s.popularity !== undefined ? s.popularity : 0.6,
      scenicScore: s.scenicScore !== undefined ? s.scenicScore : 0.5,
      mustVisit: s.mustVisit !== false,
    });
    createdStops.push({ original: s, added });
  }

  // Attach constraints
  for (const item of createdStops) {
    if (Array.isArray(item.original.constraints)) {
      for (const c of item.original.constraints) {
        if (c.type === 'OPENING_HOURS') {
          stopManager.attachConstraint(
            item.added.id,
            new OpeningHoursConstraint(
              `oh-${item.added.id}`,
              item.added.id,
              c.openTime,
              c.closeTime
            )
          );
        } else if (c.type === 'PRECEDENCE' && c.precedesIndex !== undefined) {
          const target = createdStops[c.precedesIndex];
          if (target) {
            stopManager.attachConstraint(
              item.added.id,
              new PrecedenceConstraint(
                `pc-${item.added.id}`,
                item.added.id,
                target.added.id
              )
            );
          }
        }
      }
    }
  }

  // Save to SQLite
  TripRepository.saveFullTrip({
    id: activeTripId,
    name: sample.name,
    description: sample.description,
    tripConfig: stopManager.tripConfig,
    preset: controller.preset,
    stops: stopManager.stops,
  });

  return controller.recalculate();
}

// Load default data on start
loadSampleTrip('paris');

// --- API Endpoints ---

// Status
app.get('/api/status', (req, res) => {
  res.json({
    status: 'ok',
    version: '0.1.0',
    name: 'RouteFlow Server',
    stopsCount: stopManager.stops.length,
    activePreset: controller.preset,
    activeTripId,
    hasTripConfig: Boolean(stopManager.tripConfig),
  });
});

// Presets
app.get('/api/presets', (req, res) => {
  res.json({ presets: PRESETS });
});

// Compare all 4+ presets side-by-side
app.post('/api/compare-presets', (req, res) => {
  try {
    const stops = stopManager.stops;
    const tripConfig = stopManager.tripConfig;
    const comparison = controller.sequencer.comparePresets(stops, tripConfig);
    res.json({ comparison });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// What-if scenario planning preview
app.post('/api/what-if', (req, res) => {
  try {
    const { addStop, removeStopId, preset } = req.body;
    const preview = controller.sequencer.whatIfPreview(
      stopManager.stops,
      stopManager.tripConfig,
      { addStop, removeStopId, preset }
    );
    res.json(preview);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Place search (Nominatim with offline landmarks fallback)
const POPULAR_LANDMARKS = [
  { name: 'Eiffel Tower, Paris', lat: 48.8584, lon: 2.2945 },
  { name: 'Louvre Museum, Paris', lat: 48.8606, lon: 2.3376 },
  { name: 'Notre-Dame, Paris', lat: 48.8530, lon: 2.3499 },
  { name: 'Arc de Triomphe, Paris', lat: 48.8738, lon: 2.2950 },
  { name: 'Sacré-Cœur, Paris', lat: 48.8867, lon: 2.3431 },
  { name: 'Ferry Building, San Francisco', lat: 37.7955, lon: -122.3937 },
  { name: 'Golden Gate Bridge, San Francisco', lat: 37.8324, lon: -122.4795 },
  { name: 'Fisherman’s Wharf, San Francisco', lat: 37.8080, lon: -122.4177 },
  { name: 'Alcatraz Ferry, San Francisco', lat: 37.8066, lon: -122.4045 },
  { name: 'Times Square, New York', lat: 40.7580, lon: -73.9855 },
  { name: 'Central Park, New York', lat: 40.7829, lon: -73.9654 },
  { name: 'Colosseum, Rome', lat: 41.8902, lon: 12.4922 },
  { name: 'Tokyo Tower, Tokyo', lat: 35.6586, lon: 139.7454 },
  { name: 'Shibuya Crossing, Tokyo', lat: 35.6595, lon: 139.7005 },
  // Indian Landmarks
  { name: 'Red Fort (Lal Qila), Delhi', lat: 28.6562, lon: 77.2410 },
  { name: 'India Gate, New Delhi', lat: 28.6129, lon: 77.2295 },
  { name: 'Qutub Minar, New Delhi', lat: 28.5244, lon: 77.1855 },
  { name: "Humayun's Tomb, New Delhi", lat: 28.5933, lon: 77.2507 },
  { name: 'Lotus Temple, New Delhi', lat: 28.5535, lon: 77.2588 },
  { name: 'Gateway of India, Mumbai', lat: 18.9220, lon: 72.8347 },
  { name: 'Marine Drive, Mumbai', lat: 18.9432, lon: 72.8230 },
  { name: 'CSMT Station, Mumbai', lat: 18.9398, lon: 72.8354 },
  { name: 'Siddhivinayak Temple, Mumbai', lat: 19.0169, lon: 72.8304 },
  { name: 'Lalbagh Botanical Garden, Bengaluru', lat: 12.9507, lon: 77.5848 },
  { name: 'Bangalore Palace, Bengaluru', lat: 12.9982, lon: 77.5921 },
  { name: 'Vidhana Soudha, Bengaluru', lat: 12.9796, lon: 77.5907 },
  { name: 'VIT University, Vellore', lat: 12.9692, lon: 79.1559 },
  { name: 'Vellore Fort, Vellore', lat: 12.9234, lon: 79.1325 },
  { name: 'Sripuram Golden Temple, Vellore', lat: 12.8717, lon: 79.0889 },
];

app.get('/api/search-places', async (req, res) => {
  const query = (req.query.q || '').trim();
  if (!query) return res.json({ results: [] });

  // Check matching offline landmarks first
  const qLower = query.toLowerCase();
  const localMatches = POPULAR_LANDMARKS.filter((l) =>
    l.name.toLowerCase().includes(qLower)
  );

  // If query is broad or not in local landmarks, try Nominatim with 2s timeout
  try {
    const controllerTimeout = new AbortController();
    const timeoutId = setTimeout(() => controllerTimeout.abort(), 2000);

    const nominatimUrl = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=5`;
    const response = await fetch(nominatimUrl, {
      signal: controllerTimeout.signal,
      headers: { 'User-Agent': 'RouteFlow-Educational-Planner/1.0' },
    });
    clearTimeout(timeoutId);

    if (response.ok) {
      const data = await response.json();
      const onlineResults = data.map((item) => ({
        name: item.display_name.split(',').slice(0, 3).join(','),
        lat: parseFloat(item.lat),
        lon: parseFloat(item.lon),
      }));

      // Combine unique
      const combined = [...localMatches, ...onlineResults];
      return res.json({ results: combined.slice(0, 6) });
    }
  } catch (err) {
    // Graceful offline fallback
  }

  res.json({ results: localMatches });
});

// Trip Management (Database CRUD)
app.get('/api/trips', (req, res) => {
  try {
    const trips = TripRepository.listTrips();
    res.json({ trips });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/trips', (req, res) => {
  try {
    const { name, description } = req.body;
    const newId = `trip-${Date.now()}`;
    const saved = TripRepository.saveFullTrip({
      id: newId,
      name: name || 'Custom Saved Trip',
      description: description || '',
      tripConfig: stopManager.tripConfig,
      preset: controller.preset,
      stops: stopManager.stops,
    });
    activeTripId = newId;
    res.status(201).json({ trip: saved });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.get('/api/trips/:id', (req, res) => {
  try {
    const trip = TripRepository.getTrip(req.params.id);
    if (!trip) return res.status(404).json({ error: 'Trip not found.' });
    res.json({ trip });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/trips/:id/load', (req, res) => {
  try {
    const trip = TripRepository.getTrip(req.params.id);
    if (!trip) return res.status(404).json({ error: 'Trip not found.' });

    activeTripId = trip.id;
    stopManager.stops = [];
    stopManager.tripConfig = null;

    stopManager.setTripConfig(
      trip.tripConfig.startTime,
      trip.tripConfig.startLat,
      trip.tripConfig.startLon
    );
    if (trip.tripConfig.maxDurationMin) {
      stopManager.tripConfig.maxDurationMin = trip.tripConfig.maxDurationMin;
    }
    if (trip.tripConfig.maxDistanceKm) {
      stopManager.tripConfig.maxDistanceKm = trip.tripConfig.maxDistanceKm;
    }

    for (const s of trip.stops) {
      const added = stopManager.addStop({
        name: s.name,
        lat: s.lat,
        lon: s.lon,
        prefStart: s.prefStart,
        prefEnd: s.prefEnd,
        dwellTimeMin: s.dwellTimeMin,
        popularity: s.popularity,
        scenicScore: s.scenicScore,
        mustVisit: s.mustVisit,
      });

      if (Array.isArray(s.constraints)) {
        for (const c of s.constraints) {
          if (c.type === 'OPENING_HOURS') {
            stopManager.attachConstraint(
              added.id,
              new OpeningHoursConstraint(c.id, added.id, c.openTime, c.closeTime)
            );
          } else if (c.type === 'PRECEDENCE') {
            stopManager.attachConstraint(
              added.id,
              new PrecedenceConstraint(c.id, added.id, c.precedesStopId)
            );
          }
        }
      }
    }

    if (trip.preset) {
      controller.setPreset(trip.preset);
    } else {
      controller.recalculate();
    }

    res.json({
      message: `Trip '${trip.name}' loaded successfully.`,
      trip,
      result: controller.latestResult,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/trips/:id', (req, res) => {
  try {
    const success = TripRepository.deleteTrip(req.params.id);
    if (!success) return res.status(404).json({ error: 'Trip not found.' });
    res.json({ message: 'Trip deleted.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Samples
app.get('/api/samples', (req, res) => {
  const samples = Object.keys(SAMPLE_TRIPS).map((key) => ({
    key,
    name: SAMPLE_TRIPS[key].name,
    description: SAMPLE_TRIPS[key].description,
    stopsCount: SAMPLE_TRIPS[key].stops.length,
  }));
  res.json({ samples });
});

// Load sample trip
app.post('/api/samples/:key/load', (req, res) => {
  const { key } = req.params;
  if (!SAMPLE_TRIPS[key]) {
    return res.status(404).json({ error: `Sample trip '${key}' not found.` });
  }
  const result = loadSampleTrip(key);
  res.json({
    message: `Sample trip '${key}' loaded successfully.`,
    tripConfig: stopManager.tripConfig,
    stops: stopManager.stops,
    result: {
      optimalRoute: result.optimalRoute ? result.optimalRoute.toJSON() : null,
      explanation: result.explanation,
    },
  });
});

// Get current stops & config
app.get('/api/stops', (req, res) => {
  res.json({
    stops: stopManager.stops,
    tripConfig: stopManager.tripConfig,
  });
});

// Set trip config (with max limits support)
app.post('/api/trip-config', (req, res) => {
  try {
    const { startTime, startLat, startLon, maxDurationMin, maxDistanceKm, roundTrip } = req.body;
    if (!startTime || typeof startLat !== 'number' || typeof startLon !== 'number') {
      return res.status(400).json({ error: 'startTime, startLat, and startLon are required.' });
    }
    stopManager.setTripConfig(startTime, startLat, startLon, roundTrip);
    if (maxDurationMin !== undefined) {
      stopManager.tripConfig.maxDurationMin = maxDurationMin ? parseInt(maxDurationMin, 10) : null;
    }
    if (maxDistanceKm !== undefined) {
      stopManager.tripConfig.maxDistanceKm = maxDistanceKm ? parseFloat(maxDistanceKm) : null;
    }

    res.json({
      message: 'Trip config updated successfully.',
      tripConfig: stopManager.tripConfig,
    });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Add stop
app.post('/api/stops', (req, res) => {
  try {
    const { name, lat, lon, prefStart, prefEnd, dwellTimeMin, popularity, scenicScore, mustVisit } = req.body;
    if (!name || typeof lat !== 'number' || typeof lon !== 'number') {
      return res.status(400).json({ error: 'name, lat, and lon are required.' });
    }
    const { openTime, closeTime } = req.body;
    const stop = stopManager.addStop({
      name,
      lat,
      lon,
      prefStart: prefStart || null,
      prefEnd: prefEnd || null,
      dwellTimeMin: dwellTimeMin || 30,
      popularity: popularity !== undefined ? popularity : 0.6,
      scenicScore: scenicScore !== undefined ? scenicScore : 0.5,
      mustVisit: mustVisit !== false,
    });

    if (openTime && closeTime) {
      stopManager.attachConstraint(
        stop.id,
        new OpeningHoursConstraint(`oh-${Date.now()}`, stop.id, openTime, closeTime)
      );
    }

    res.status(201).json({ stop: stopManager.getStop(stop.id) });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Reorder / Move stop
app.post('/api/stops/:id/move', (req, res) => {
  try {
    const { id } = req.params;
    const { direction } = req.body; // 'up' or 'down'
    const index = stopManager.stops.findIndex((s) => s.id === id);
    if (index === -1) return res.status(404).json({ error: 'Stop not found.' });

    if (direction === 'up' && index > 0) {
      const temp = stopManager.stops[index - 1];
      stopManager.stops[index - 1] = stopManager.stops[index];
      stopManager.stops[index] = temp;
    } else if (direction === 'down' && index < stopManager.stops.length - 1) {
      const temp = stopManager.stops[index + 1];
      stopManager.stops[index + 1] = stopManager.stops[index];
      stopManager.stops[index] = temp;
    }

    stopManager.stops.forEach((s, idx) => { s.inputOrder = idx; });
    stopManager.emit('stopsChanged', { type: 'REORDER', stopId: id });
    res.json({ stops: stopManager.stops });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Edit stop
app.put('/api/stops/:id', (req, res) => {
  try {
    const { id } = req.params;
    const stop = stopManager.getStop(id);
    const { name, dwellTimeMin, prefStart, prefEnd, mustVisit } = req.body;

    if (name) stop.name = name;
    if (dwellTimeMin !== undefined) stop.dwellTimeMin = parseInt(dwellTimeMin, 10);
    if (prefStart !== undefined) stop.prefStart = prefStart || null;
    if (prefEnd !== undefined) stop.prefEnd = prefEnd || null;
    if (mustVisit !== undefined) stop.mustVisit = Boolean(mustVisit);

    stopManager.emit('stopsChanged', { type: 'UPDATE', stopId: id });
    res.json({ message: 'Stop updated.', stop });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Remove stop
app.delete('/api/stops/:id', (req, res) => {
  try {
    const { id } = req.params;
    stopManager.removeStop(id);
    res.json({ message: `Stop ${id} removed.` });
  } catch (err) {
    res.status(404).json({ error: err.message });
  }
});

// Reposition stop
app.put('/api/stops/:id/reposition', (req, res) => {
  try {
    const { id } = req.params;
    const { lat, lon } = req.body;
    if (typeof lat !== 'number' || typeof lon !== 'number') {
      return res.status(400).json({ error: 'lat and lon numbers are required.' });
    }
    stopManager.repositionStop(id, lat, lon);
    res.json({ message: `Stop ${id} repositioned.`, stop: stopManager.getStop(id) });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Attach constraint
app.post('/api/stops/:id/constraints', (req, res) => {
  try {
    const { id } = req.params;
    const { type, openTime, closeTime, precedesStopId } = req.body;
    let constraint;

    if (type === 'OPENING_HOURS') {
      constraint = new OpeningHoursConstraint(`oh-${Date.now()}`, id, openTime, closeTime);
    } else if (type === 'PRECEDENCE') {
      constraint = new PrecedenceConstraint(`pc-${Date.now()}`, id, precedesStopId);
    } else {
      return res.status(400).json({ error: "Constraint type must be 'OPENING_HOURS' or 'PRECEDENCE'." });
    }

    stopManager.attachConstraint(id, constraint);
    res.status(201).json({
      message: 'Constraint attached.',
      stop: stopManager.getStop(id),
    });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Remove constraint
app.delete('/api/stops/:id/constraints/:constraintId', (req, res) => {
  try {
    const { id, constraintId } = req.params;
    stopManager.removeConstraint(id, constraintId);
    res.json({
      message: 'Constraint removed.',
      stop: stopManager.getStop(id),
    });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Plan / optimize route
app.post('/api/plan-route', (req, res) => {
  try {
    const { preset, customWeights } = req.body || {};
    if (customWeights) {
      controller.setPreset(customWeights);
    } else if (preset) {
      controller.setPreset(preset);
    } else {
      controller.recalculate();
    }

    const {
      originalRoute,
      optimalRoute,
      shortestDistanceRoute,
      alternatives,
      comparison,
      conflictSuggestions,
      explanation,
    } = controller.latestResult;

    res.json({
      preset: controller.scorer.presetName,
      weights: controller.scorer.weights,
      originalRoute: originalRoute ? originalRoute.toJSON() : null,
      optimalRoute: optimalRoute ? optimalRoute.toJSON() : null,
      shortestDistanceRoute: shortestDistanceRoute ? shortestDistanceRoute.toJSON() : null,
      alternatives: alternatives.map((a) => a.toJSON()),
      comparison,
      conflictSuggestions,
      explanation,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Reset stops
app.post('/api/reset', (req, res) => {
  stopManager.stops = [];
  stopManager.tripConfig = null;
  controller.recalculate();
  res.json({ message: 'Stops reset successfully.' });
});

// Exportable trip summary
app.get('/api/trip-summary', (req, res) => {
  try {
    const result = controller.latestResult;
    if (!result || !result.optimalRoute) {
      return res.status(400).json({ error: 'No route currently planned.' });
    }

    const { optimalRoute, explanation } = result;
    const summary = {
      tripTitle: `RouteFlow Itinerary — ${controller.scorer.presetName}`,
      generatedAt: new Date().toISOString(),
      totalDistanceKm: optimalRoute.getTotalDistance(),
      totalDurationMin: optimalRoute.getTotalDuration(),
      stopsCount: optimalRoute.stops.length,
      narrative: explanation.summary,
      stops: optimalRoute.stops.map((s, i) => ({
        step: i + 1,
        name: s.name,
        lat: s.lat,
        lon: s.lon,
        arrival: optimalRoute.legs[i]?.arrivalTime,
        departure: optimalRoute.legs[i]?.departureTime,
        dwellMin: optimalRoute.legs[i]?.dwellTimeMin,
      })),
      itineraryTimeline: explanation.itinerary,
      constraintAudit: explanation.constraintDecisions,
    };

    res.json(summary);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Export Itinerary: GPX, GeoJSON, or JSON format
app.get('/api/export/:format', (req, res) => {
  try {
    const result = controller.latestResult;
    if (!result || !result.optimalRoute) {
      return res.status(400).json({ error: 'No route currently planned to export.' });
    }

    const { format } = req.params;
    const { optimalRoute, explanation } = result;
    const presetName = controller.scorer.presetName || 'Balanced';
    const timestamp = new Date().toISOString();

    if (format === 'gpx') {
      const escapeXml = (unsafe) => (unsafe || '').replace(/[<>&'"]/g, (c) => {
        switch (c) {
          case '<': return '&lt;';
          case '>': return '&gt;';
          case '&': return '&amp;';
          case '\'': return '&apos;';
          case '"': return '&quot;';
          default: return c;
        }
      });

      const wpts = optimalRoute.stops.map((s, idx) => {
        const leg = optimalRoute.legs[idx];
        const arrival = leg?.arrivalTime || '';
        const dwell = leg?.dwellTimeMin !== undefined ? `${leg.dwellTimeMin}m` : '';
        return `  <wpt lat="${s.lat}" lon="${s.lon}">
    <name>${escapeXml(s.name)}</name>
    <desc>Stop #${idx + 1}${arrival ? ` | Arrive: ${arrival}` : ''}${dwell ? ` | Dwell: ${dwell}` : ''}</desc>
    <sym>Flag</sym>
  </wpt>`;
      }).join('\n');

      const rtepts = [
        ...(optimalRoute.tripConfig ? [`  <rtept lat="${optimalRoute.tripConfig.startLat}" lon="${optimalRoute.tripConfig.startLon}"><name>Trip Origin</name></rtept>`] : []),
        ...optimalRoute.stops.map((s) => `  <rtept lat="${s.lat}" lon="${s.lon}"><name>${escapeXml(s.name)}</name></rtept>`),
        ...(optimalRoute.tripConfig && optimalRoute.tripConfig.roundTrip ? [`  <rtept lat="${optimalRoute.tripConfig.startLat}" lon="${optimalRoute.tripConfig.startLon}"><name>Trip Origin (Return)</name></rtept>`] : []),
      ].join('\n');

      const gpxContent = `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="RouteFlow Planner" xmlns="http://www.topografix.com/GPX/1/1">
  <metadata>
    <name>RouteFlow Itinerary (${escapeXml(presetName)})</name>
    <time>${timestamp}</time>
  </metadata>
${wpts}
  <rte>
    <name>RouteFlow Optimized Tour</name>
    <desc>Total Distance: ${optimalRoute.getTotalDistance()} km, Duration: ${optimalRoute.getTotalDuration()} min</desc>
${rtepts}
  </rte>
</gpx>`;

      res.setHeader('Content-Type', 'application/gpx+xml; charset=utf-8');
      res.setHeader('Content-Disposition', 'attachment; filename="routeflow-itinerary.gpx"');
      return res.send(gpxContent);
    }

    if (format === 'geojson') {
      const coordinates = [];
      if (optimalRoute.tripConfig) {
        coordinates.push([optimalRoute.tripConfig.startLon, optimalRoute.tripConfig.startLat]);
      }
      optimalRoute.stops.forEach((s) => coordinates.push([s.lon, s.lat]));
      if (optimalRoute.tripConfig && optimalRoute.tripConfig.roundTrip) {
        coordinates.push([optimalRoute.tripConfig.startLon, optimalRoute.tripConfig.startLat]);
      }

      const features = [
        {
          type: 'Feature',
          geometry: {
            type: 'LineString',
            coordinates,
          },
          properties: {
            name: 'Route Path',
            strategy: presetName,
            totalDistanceKm: optimalRoute.getTotalDistance(),
            totalDurationMin: optimalRoute.getTotalDuration(),
          },
        },
        ...optimalRoute.stops.map((s, idx) => {
          const leg = optimalRoute.legs[idx];
          return {
            type: 'Feature',
            geometry: {
              type: 'Point',
              coordinates: [s.lon, s.lat],
            },
            properties: {
              order: idx + 1,
              name: s.name,
              arrivalTime: leg?.arrivalTime,
              departureTime: leg?.departureTime,
              dwellMin: leg?.dwellTimeMin,
            },
          };
        }),
      ];

      const geojson = {
        type: 'FeatureCollection',
        metadata: {
          generator: 'RouteFlow',
          createdAt: timestamp,
          strategy: presetName,
          totalDistanceKm: optimalRoute.getTotalDistance(),
          totalDurationMin: optimalRoute.getTotalDuration(),
        },
        features,
      };

      res.setHeader('Content-Type', 'application/geo+json; charset=utf-8');
      res.setHeader('Content-Disposition', 'attachment; filename="routeflow-itinerary.geojson"');
      return res.json(geojson);
    }

    if (format === 'json') {
      const data = {
        title: `RouteFlow Itinerary — ${presetName}`,
        exportedAt: timestamp,
        strategy: presetName,
        metrics: {
          totalDistanceKm: optimalRoute.getTotalDistance(),
          totalDurationMin: optimalRoute.getTotalDuration(),
          stopsCount: optimalRoute.stops.length,
          roundTrip: Boolean(optimalRoute.tripConfig?.roundTrip),
        },
        tripConfig: optimalRoute.tripConfig,
        stops: optimalRoute.stops,
        legs: optimalRoute.legs,
        explanation,
      };

      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      res.setHeader('Content-Disposition', 'attachment; filename="routeflow-itinerary.json"');
      return res.json(data);
    }

    return res.status(400).json({ error: `Unsupported format: ${format}. Use 'gpx', 'geojson', or 'json'.` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Server listen if run directly
const PORT = process.env.PORT || 3000;
if (require.main === module) {
  const server = app.listen(PORT, () => {
    // eslint-disable-next-line no-console
    console.log(`RouteFlow server listening on http://localhost:${PORT}`);
  });

  server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      // eslint-disable-next-line no-console
      console.error(
        `\n[RouteFlow Error] Port ${PORT} is already in use by another process.` +
        `\nYou can free it with: fuser -k ${PORT}/tcp` +
        `\nOr start on another port: PORT=3001 npm start\n`
      );
      process.exit(1);
    } else {
      throw err;
    }
  });
}

// Vercel serverless: default export must be the handler function
module.exports = app;
// Named exports for tests
module.exports.app = app;
module.exports.stopManager = stopManager;
module.exports.controller = controller;
module.exports.loadSampleTrip = loadSampleTrip;

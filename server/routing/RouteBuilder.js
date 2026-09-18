const { Route } = require('./Route');
const { ConstraintsFilter } = require('./ConstraintsFilter');

/**
 * Helper to parse "HH:mm" to minutes from midnight
 * @param {string} timeStr
 * @returns {number}
 */
function parseTimeToMinutes(timeStr) {
  if (!timeStr) return 0;
  const [h, m] = timeStr.split(':').map(Number);
  return h * 60 + m;
}

/**
 * Helper to format minutes from midnight to "HH:mm"
 * @param {number} totalMinutes
 * @returns {string}
 */
function formatMinutesToTime(totalMinutes) {
  const norm = ((Math.floor(totalMinutes) % 1440) + 1440) % 1440;
  const h = String(Math.floor(norm / 60)).padStart(2, '0');
  const m = String(norm % 60).padStart(2, '0');
  return `${h}:${m}`;
}

/**
 * RouteBuilder
 * Traces to: FR-6, FR-7, FR-13; Week 4 §3, §5.2; Week 5 §4.1.
 *
 * Implements both Route Construction (nearest-neighbour) and
 * Constraint-Aware Refinement (constraint-filtered 2-opt local search).
 */
class RouteBuilder {
  /**
   * @param {import('../distance/IDistanceProvider').IDistanceProvider} distanceProvider
   * @param {import('../scoring/ScoringEngine').ScoringEngine} [scoringEngine=null]
   */
  constructor(distanceProvider, scoringEngine = null) {
    this.distanceProvider = distanceProvider;
    this.scoringEngine = scoringEngine;
  }

  /**
   * Builds an initial candidate route using the Nearest-Neighbour heuristic (FR-6)
   * @param {Array<object>} stops
   * @param {{ startTime: string, startLat: number, startLon: number }} tripConfig
   * @returns {Route}
   */
  buildInitialRoute(stops, tripConfig) {
    if (!stops || stops.length === 0) {
      return new Route({ stops: [] });
    }

    const unvisited = [...stops];
    const orderedStops = [];

    let currentLat = tripConfig?.startLat ?? unvisited[0].lat;
    let currentLon = tripConfig?.startLon ?? unvisited[0].lon;
    let currentTimeMin = parseTimeToMinutes(tripConfig?.startTime || '09:00');

    let totalDistanceKm = 0;
    let totalTravelTimeMin = 0;
    const legs = [];

    while (unvisited.length > 0) {
      let nearestIndex = 0;
      let minDistance = Infinity;
      let bestLeg = null;

      for (let i = 0; i < unvisited.length; i++) {
        const candidate = unvisited[i];
        const leg = this.distanceProvider.getDistance(
          currentLat,
          currentLon,
          candidate.lat,
          candidate.lon
        );
        if (leg.distanceKm < minDistance) {
          minDistance = leg.distanceKm;
          bestLeg = leg;
          nearestIndex = i;
        }
      }

      const [nextStop] = unvisited.splice(nearestIndex, 1);
      totalDistanceKm += bestLeg.distanceKm;
      totalTravelTimeMin += bestLeg.travelTimeMin;
      currentTimeMin += bestLeg.travelTimeMin;

      const scheduledStop = {
        ...nextStop,
        scheduledArrival: formatMinutesToTime(currentTimeMin),
        arrivalMinutes: currentTimeMin,
      };

      orderedStops.push(scheduledStop);
      legs.push({
        fromLat: currentLat,
        fromLon: currentLon,
        toStopId: nextStop.id,
        distanceKm: bestLeg.distanceKm,
        travelTimeMin: bestLeg.travelTimeMin,
      });

      currentLat = nextStop.lat;
      currentLon = nextStop.lon;
    }

    const candidateRoute = new Route({
      stops: orderedStops,
      legs,
      totalDistanceKm,
      totalTravelTimeMin,
    });

    const check = ConstraintsFilter.evaluate(candidateRoute);
    candidateRoute.violations = check.violations;

    return candidateRoute;
  }

  /**
   * Recalculates timings and metrics for a specific sequence of stops
   * @param {Array<object>} stops
   * @param {{ startTime: string, startLat: number, startLon: number }} tripConfig
   * @returns {Route}
   */
  scheduleRoute(stops, tripConfig) {
    if (!stops || stops.length === 0) {
      return new Route({ stops: [] });
    }

    let currentLat = tripConfig?.startLat ?? stops[0].lat;
    let currentLon = tripConfig?.startLon ?? stops[0].lon;
    let currentTimeMin = parseTimeToMinutes(tripConfig?.startTime || '09:00');

    let totalDistanceKm = 0;
    let totalTravelTimeMin = 0;
    const legs = [];
    const orderedStops = [];

    for (const stop of stops) {
      const leg = this.distanceProvider.getDistance(
        currentLat,
        currentLon,
        stop.lat,
        stop.lon
      );
      totalDistanceKm += leg.distanceKm;
      totalTravelTimeMin += leg.travelTimeMin;
      currentTimeMin += leg.travelTimeMin;

      orderedStops.push({
        ...stop,
        scheduledArrival: formatMinutesToTime(currentTimeMin),
        arrivalMinutes: currentTimeMin,
      });

      legs.push({
        fromLat: currentLat,
        fromLon: currentLon,
        toStopId: stop.id,
        distanceKm: leg.distanceKm,
        travelTimeMin: leg.travelTimeMin,
      });

      currentLat = stop.lat;
      currentLon = stop.lon;
    }

    const route = new Route({
      stops: orderedStops,
      legs,
      totalDistanceKm,
      totalTravelTimeMin,
    });

    const check = ConstraintsFilter.evaluate(route);
    route.violations = check.violations;

    return route;
  }

  /**
   * Refines route using Constraint-Aware 2-opt local search (FR-7, FR-13)
   * Evaluates multiple candidate initial starting points and runs 2-opt search
   * to find the route that maximizes the multi-objective score.
   *
   * @param {Route} initialRoute
   * @param {{ startTime: string, startLat: number, startLon: number }} tripConfig
   * @param {object} [weightConfig=null]
   * @returns {Route}
   */
  refineRoute(initialRoute, tripConfig, weightConfig = null) {
    if (!initialRoute.stops || initialRoute.stops.length < 2) {
      return initialRoute;
    }

    const stops = initialRoute.stops;
    let candidatePool = [initialRoute];

    // If we have between 3 and 7 stops, evaluate multiple starting permutations
    // so presets (Best Scenic, Least Crowded, Open Attractions) can discover genuinely different orders
    if (stops.length >= 3 && stops.length <= 7) {
      for (let s = 1; s < stops.length; s++) {
        // Shift starting stop
        const reordered = [...stops.slice(s), ...stops.slice(0, s)];
        candidatePool.push(this.scheduleRoute(reordered, tripConfig));
      }
    }

    let bestRoute = initialRoute;
    let bestScore = this.scoringEngine
      ? this.scoringEngine.scoreRoute(bestRoute, weightConfig).totalScore
      : -bestRoute.totalDistanceKm;

    for (const startCand of candidatePool) {
      let current = startCand;
      let improved = true;
      let iterations = 0;
      const MAX_ITERATIONS = 40;

      while (improved && iterations < MAX_ITERATIONS) {
        improved = false;
        iterations += 1;
        const n = current.stops.length;

        for (let i = 0; i < n - 1; i++) {
          for (let k = i + 1; k < n; k++) {
            const reversedSlice = current.stops.slice(i, k + 1).reverse();
            const candStops = [
              ...current.stops.slice(0, i),
              ...reversedSlice,
              ...current.stops.slice(k + 1),
            ];

            const candRoute = this.scheduleRoute(candStops, tripConfig);
            const candValid = candRoute.violations.length === 0;
            const currentValid = current.violations.length === 0;

            let accept = false;

            if (currentValid && !candValid) {
              accept = false;
            } else if (!currentValid && candValid) {
              accept = true;
            } else if (candRoute.violations.length < current.violations.length) {
              accept = true;
            } else if (candRoute.violations.length === current.violations.length) {
              const candScore = this.scoringEngine
                ? this.scoringEngine.scoreRoute(candRoute, weightConfig).totalScore
                : -candRoute.totalDistanceKm;

              const currScore = this.scoringEngine
                ? this.scoringEngine.scoreRoute(current, weightConfig).totalScore
                : -current.totalDistanceKm;

              if (candScore > currScore) {
                accept = true;
              }
            }

            if (accept) {
              current = candRoute;
              improved = true;
              break;
            }
          }
          if (improved) break;
        }
      }

      const score = this.scoringEngine
        ? this.scoringEngine.scoreRoute(current, weightConfig).totalScore
        : -current.totalDistanceKm;

      const currValid = current.violations.length === 0;
      const bestValid = bestRoute.violations.length === 0;

      if (!bestValid && currValid) {
        bestRoute = current;
        bestScore = score;
      } else if ((currValid && bestValid) || (!currValid && !bestValid)) {
        if (score > bestScore) {
          bestRoute = current;
          bestScore = score;
        }
      }
    }

    return bestRoute;
  }
}

module.exports = { RouteBuilder, parseTimeToMinutes, formatMinutesToTime };

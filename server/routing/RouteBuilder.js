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
   * A 2-opt segment reversal is accepted only when it is constraint-valid
   * and score-improving. If no fully valid route exists, the least-violating
   * candidate is retained with its violation alerts (FR-13).
   *
   * @param {Route} initialRoute
   * @param {{ startTime: string, startLat: number, startLon: number }} tripConfig
   * @param {object} [weightConfig=null]
   * @returns {Route}
   */
  refineRoute(initialRoute, tripConfig, weightConfig = null) {
    if (!initialRoute.stops || initialRoute.stops.length < 3) {
      return initialRoute;
    }

    let bestRoute = initialRoute;
    let bestScore = this.scoringEngine
      ? this.scoringEngine.scoreRoute(bestRoute, weightConfig).totalScore
      : -bestRoute.totalDistanceKm; // Default fallback to minimizing distance

    let improved = true;
    let iterations = 0;
    const MAX_ITERATIONS = 50;

    while (improved && iterations < MAX_ITERATIONS) {
      improved = false;
      iterations += 1;

      const n = bestRoute.stops.length;
      for (let i = 0; i < n - 1; i++) {
        for (let k = i + 1; k < n; k++) {
          // Perform 2-opt reversal of stops from i to k
          const reversedSlice = bestRoute.stops.slice(i, k + 1).reverse();
          const candidateStops = [
            ...bestRoute.stops.slice(0, i),
            ...reversedSlice,
            ...bestRoute.stops.slice(k + 1),
          ];

          const candidateRoute = this.scheduleRoute(candidateStops, tripConfig);
          const candidateValid = candidateRoute.violations.length === 0;
          const bestValid = bestRoute.violations.length === 0;

          // Prefer valid over invalid; if both valid (or both invalid), compare scores
          let isAccepted = false;

          if (bestValid && !candidateValid) {
            // Cannot replace valid route with invalid
            isAccepted = false;
          } else if (!bestValid && candidateValid) {
            // Found a valid route to replace an invalid one
            isAccepted = true;
          } else {
            // Both valid or both invalid: compare objective score / fewer violations
            if (candidateRoute.violations.length < bestRoute.violations.length) {
              isAccepted = true;
            } else if (candidateRoute.violations.length === bestRoute.violations.length) {
              const candidateScore = this.scoringEngine
                ? this.scoringEngine.scoreRoute(candidateRoute, weightConfig).totalScore
                : -candidateRoute.totalDistanceKm;

              if (candidateScore > bestScore) {
                isAccepted = true;
                bestScore = candidateScore;
              }
            }
          }

          if (isAccepted) {
            bestRoute = candidateRoute;
            improved = true;
            break;
          }
        }
        if (improved) break;
      }
    }

    return bestRoute;
  }
}

module.exports = { RouteBuilder, parseTimeToMinutes, formatMinutesToTime };

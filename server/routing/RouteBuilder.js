const { Route } = require('./Route');
const { ConstraintsFilter } = require('./ConstraintsFilter');
const { SyntheticDataModule } = require('../scoring/SyntheticDataModule');

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
 * Determines appropriate origin coordinates for the itinerary.
 * If startLat/Lon is specified and within 500km of the stops, it serves as a separate origin.
 * Otherwise, if it's thousands of km away (e.g. Bangalore default during a Paris/Tokyo trip),
 * the itinerary naturally starts at the first stop.
 * @param {object} tripConfig
 * @param {Array<object>} stops
 * @returns {{ lat: number, lon: number, isSeparateOrigin: boolean }}
 */
function getStartLocation(tripConfig, stops) {
  if (!stops || stops.length === 0) {
    return {
      lat: tripConfig?.startLat ?? 0,
      lon: tripConfig?.startLon ?? 0,
      isSeparateOrigin: false,
    };
  }

  if (tripConfig?.startAtFirstStop) {
    return { lat: stops[0].lat, lon: stops[0].lon, isSeparateOrigin: false };
  }

  if (tripConfig?.startLat != null && tripConfig?.startLon != null) {
    const minDistance = Math.min(
      ...stops.map((s) => {
        const dLat = Math.abs(tripConfig.startLat - s.lat);
        const dLon = Math.abs(tripConfig.startLon - s.lon);
        return Math.sqrt(dLat * dLat + dLon * dLon) * 111;
      })
    );
    if (minDistance < 500) {
      return { lat: tripConfig.startLat, lon: tripConfig.startLon, isSeparateOrigin: true };
    }
  }

  return { lat: stops[0].lat, lon: stops[0].lon, isSeparateOrigin: false };
}

/**
 * Generates human-understandable explainability tags and reasoning for a stop's scheduled time.
 * @param {object} stop
 * @param {number} arrivalMinutes
 * @param {object} envFactors
 * @returns {string[]}
 */
function generateStopReasoning(stop, arrivalMinutes, envFactors) {
  const reasons = [];
  const hour = Math.floor(arrivalMinutes / 60);

  if (stop.constraints && Array.isArray(stop.constraints)) {
    const oh = stop.constraints.find((c) => (c.name || c.type) === 'OPENING_HOURS');
    if (oh) {
      const ot = oh.openTime || oh.open_time;
      const ct = oh.closeTime || oh.close_time;
      reasons.push(`Timed within venue opening hours (${ot} – ${ct})`);
    }
    const pc = stop.constraints.find((c) => (c.name || c.type) === 'PRECEDENCE');
    if (pc) {
      reasons.push('Ordered before dependent prerequisite destination');
    }
  }

  if (stop.prefStart && stop.prefEnd) {
    const pStart = parseTimeToMinutes(stop.prefStart);
    const pEnd = parseTimeToMinutes(stop.prefEnd);
    if (arrivalMinutes >= pStart && arrivalMinutes <= pEnd) {
      reasons.push(`Satisfies preferred visit window (${stop.prefStart} – ${stop.prefEnd})`);
    }
  }

  if (envFactors) {
    if (envFactors.crowdScore >= 0.75) {
      if (hour < 11) {
        reasons.push('Morning arrival avoids midday tourist peak');
      } else if (hour >= 14 && hour < 17) {
        reasons.push('Mid-afternoon window avoids lunch tour groups');
      } else {
        reasons.push('Off-peak low crowd visiting slot');
      }
    } else if (envFactors.crowdScore < 0.4) {
      reasons.push('Popular attraction visited during peak hours');
    }

    if (envFactors.weatherScore >= 0.8) {
      reasons.push('Optimal daylight & outdoor weather conditions');
    }

    if (envFactors.scenicScore >= 0.7) {
      reasons.push('High scenic landmark rating');
    }
  }

  if (reasons.length === 0) {
    reasons.push('Optimized for travel time and shortest geographic path');
  }

  return reasons;
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
   * @param {{ startTime: string, startLat: number, startLon: number, transitMode?: string, roundTrip?: boolean, startAtFirstStop?: boolean }} tripConfig
   * @returns {Route}
   */
  buildInitialRoute(stops, tripConfig) {
    if (!stops || stops.length === 0) {
      return new Route({ stops: [] });
    }

    const unvisited = [...stops];
    const orderedStops = [];

    const transitMode = tripConfig?.transitMode || 'default';
    const startLoc = getStartLocation(tripConfig, stops);
    let currentLat = startLoc.lat;
    let currentLon = startLoc.lon;
    let currentTimeMin = parseTimeToMinutes(tripConfig?.startTime || '09:00');

    let totalDistanceKm = 0;
    let totalTravelTimeMin = 0;
    const legs = [];

    while (unvisited.length > 0) {
      let nearestIndex = 0;
      let minDistance = Infinity;
      let bestLeg = null;

      // When starting directly at the first stop:
      if (!startLoc.isSeparateOrigin && orderedStops.length === 0) {
        const nextStop = unvisited.shift();
        const dwell = nextStop.dwellMin !== undefined ? Number(nextStop.dwellMin) : 0;
        const depTimeMin = currentTimeMin + dwell;
        const env = SyntheticDataModule.getFactors(nextStop, currentTimeMin);

        orderedStops.push({
          ...nextStop,
          scheduledArrival: formatMinutesToTime(currentTimeMin),
          scheduledDeparture: formatMinutesToTime(depTimeMin),
          arrivalMinutes: currentTimeMin,
          departureMinutes: depTimeMin,
          factors: env,
          reasoning: generateStopReasoning(nextStop, currentTimeMin, env),
        });

        currentLat = nextStop.lat;
        currentLon = nextStop.lon;
        currentTimeMin = depTimeMin;
        continue;
      }

      for (let i = 0; i < unvisited.length; i++) {
        const candidate = unvisited[i];
        const leg = this.distanceProvider.getDistance(
          currentLat,
          currentLon,
          candidate.lat,
          candidate.lon,
          transitMode
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

      const dwell = nextStop.dwellMin !== undefined ? Number(nextStop.dwellMin) : 0;
      const depTimeMin = currentTimeMin + dwell;
      const env = SyntheticDataModule.getFactors(nextStop, currentTimeMin);

      const scheduledStop = {
        ...nextStop,
        scheduledArrival: formatMinutesToTime(currentTimeMin),
        scheduledDeparture: formatMinutesToTime(depTimeMin),
        arrivalMinutes: currentTimeMin,
        departureMinutes: depTimeMin,
        factors: env,
        reasoning: generateStopReasoning(nextStop, currentTimeMin, env),
      };

      orderedStops.push(scheduledStop);
      legs.push({
        fromLat: currentLat,
        fromLon: currentLon,
        toStopId: nextStop.id,
        toStopName: nextStop.name,
        distanceKm: Number(bestLeg.distanceKm.toFixed(2)),
        travelTimeMin: Number(bestLeg.travelTimeMin.toFixed(1)),
      });

      currentLat = nextStop.lat;
      currentLon = nextStop.lon;
      currentTimeMin = depTimeMin;
    }

    let isRoundTrip = false;
    if (tripConfig?.roundTrip && orderedStops.length >= 2) {
      const returnLeg = this.distanceProvider.getDistance(
        currentLat,
        currentLon,
        startLoc.lat,
        startLoc.lon,
        transitMode
      );
      totalDistanceKm += returnLeg.distanceKm;
      totalTravelTimeMin += returnLeg.travelTimeMin;
      legs.push({
        fromLat: currentLat,
        fromLon: currentLon,
        toStopId: orderedStops[0].id,
        toStopName: 'Return to Origin',
        distanceKm: Number(returnLeg.distanceKm.toFixed(2)),
        travelTimeMin: Number(returnLeg.travelTimeMin.toFixed(1)),
        isReturnLeg: true,
      });
      isRoundTrip = true;
    }

    const candidateRoute = new Route({
      stops: orderedStops,
      legs,
      totalDistanceKm,
      totalTravelTimeMin,
    });
    candidateRoute.isRoundTrip = isRoundTrip;

    const check = ConstraintsFilter.evaluate(candidateRoute);
    candidateRoute.violations = check.violations;

    return candidateRoute;
  }

  /**
   * Recalculates timings and metrics for a specific sequence of stops
   * @param {Array<object>} stops
   * @param {{ startTime: string, startLat: number, startLon: number, transitMode?: string, roundTrip?: boolean, startAtFirstStop?: boolean }} tripConfig
   * @returns {Route}
   */
  scheduleRoute(stops, tripConfig) {
    if (!stops || stops.length === 0) {
      return new Route({ stops: [] });
    }

    const transitMode = tripConfig?.transitMode || 'default';
    const startLoc = getStartLocation(tripConfig, stops);
    let currentLat = startLoc.lat;
    let currentLon = startLoc.lon;
    let currentTimeMin = parseTimeToMinutes(tripConfig?.startTime || '09:00');

    let totalDistanceKm = 0;
    let totalTravelTimeMin = 0;
    const legs = [];
    const orderedStops = [];

    for (let i = 0; i < stops.length; i++) {
      const stop = stops[i];

      if (!startLoc.isSeparateOrigin && i === 0) {
        const dwell = stop.dwellMin !== undefined ? Number(stop.dwellMin) : 0;
        const depTimeMin = currentTimeMin + dwell;
        const env = SyntheticDataModule.getFactors(stop, currentTimeMin);

        orderedStops.push({
          ...stop,
          scheduledArrival: formatMinutesToTime(currentTimeMin),
          scheduledDeparture: formatMinutesToTime(depTimeMin),
          arrivalMinutes: currentTimeMin,
          departureMinutes: depTimeMin,
          factors: env,
          reasoning: generateStopReasoning(stop, currentTimeMin, env),
        });

        currentLat = stop.lat;
        currentLon = stop.lon;
        currentTimeMin = depTimeMin;
        continue;
      }

      const leg = this.distanceProvider.getDistance(
        currentLat,
        currentLon,
        stop.lat,
        stop.lon,
        transitMode
      );
      totalDistanceKm += leg.distanceKm;
      totalTravelTimeMin += leg.travelTimeMin;
      currentTimeMin += leg.travelTimeMin;

      const dwell = stop.dwellMin !== undefined ? Number(stop.dwellMin) : 0;
      const depTimeMin = currentTimeMin + dwell;
      const env = SyntheticDataModule.getFactors(stop, currentTimeMin);

      orderedStops.push({
        ...stop,
        scheduledArrival: formatMinutesToTime(currentTimeMin),
        scheduledDeparture: formatMinutesToTime(depTimeMin),
        arrivalMinutes: currentTimeMin,
        departureMinutes: depTimeMin,
        factors: env,
        reasoning: generateStopReasoning(stop, currentTimeMin, env),
      });

      legs.push({
        fromLat: currentLat,
        fromLon: currentLon,
        toStopId: stop.id,
        toStopName: stop.name,
        distanceKm: Number(leg.distanceKm.toFixed(2)),
        travelTimeMin: Number(leg.travelTimeMin.toFixed(1)),
      });

      currentLat = stop.lat;
      currentLon = stop.lon;
      currentTimeMin = depTimeMin;
    }

    let isRoundTrip = false;
    if (tripConfig?.roundTrip && orderedStops.length >= 2) {
      const returnLeg = this.distanceProvider.getDistance(
        currentLat,
        currentLon,
        startLoc.lat,
        startLoc.lon,
        transitMode
      );
      totalDistanceKm += returnLeg.distanceKm;
      totalTravelTimeMin += returnLeg.travelTimeMin;
      legs.push({
        fromLat: currentLat,
        fromLon: currentLon,
        toStopId: orderedStops[0].id,
        toStopName: 'Return to Origin',
        distanceKm: Number(returnLeg.distanceKm.toFixed(2)),
        travelTimeMin: Number(returnLeg.travelTimeMin.toFixed(1)),
        isReturnLeg: true,
      });
      isRoundTrip = true;
    }

    const route = new Route({
      stops: orderedStops,
      legs,
      totalDistanceKm,
      totalTravelTimeMin,
    });
    route.isRoundTrip = isRoundTrip;

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
    const n = stops.length;

    // Helper to evaluate a candidate array of stops
    const evalCandidate = (candStops) => {
      const candRoute = this.scheduleRoute(candStops, tripConfig);
      const violations = candRoute.violations ? candRoute.violations.length : 0;
      const score = this.scoringEngine
        ? this.scoringEngine.scoreRoute(candRoute, weightConfig).totalScore
        : -candRoute.totalDistanceKm;
      return { route: candRoute, violations, score };
    };

    let best = evalCandidate(stops);

    // If n <= 6 stops (up to 720 permutations, takes < 15ms in JS):
    // Evaluate permutations to guarantee finding the exact multi-objective optimum
    // while strictly prioritizing zero constraint violations.
    if (n <= 6) {
      const getPermutations = (arr) => {
        if (arr.length <= 1) return [arr];
        const perms = [];
        for (let i = 0; i < arr.length; i++) {
          const current = arr[i];
          const remaining = arr.slice(0, i).concat(arr.slice(i + 1));
          for (const p of getPermutations(remaining)) {
            perms.push([current].concat(p));
          }
        }
        return perms;
      };

      const allPerms = getPermutations(stops);
      for (const perm of allPerms) {
        const cand = evalCandidate(perm);
        if (cand.violations < best.violations) {
          best = cand;
        } else if (cand.violations === best.violations && cand.score > best.score) {
          best = cand;
        }
      }
      return best.route;
    }

    // For n > 6 stops: Multi-Start Variable Neighborhood Search (2-Opt + Relocation + Swaps)
    let candidatePool = [stops];
    for (let s = 1; s < Math.min(n, 6); s++) {
      candidatePool.push([...stops.slice(s), ...stops.slice(0, s)]);
    }

    for (const candStops of candidatePool) {
      let current = evalCandidate(candStops);
      let improved = true;
      let iterations = 0;
      const MAX_ITERATIONS = 40;

      while (improved && iterations < MAX_ITERATIONS) {
        improved = false;
        iterations += 1;
        const curStops = current.route.stops;
        const len = curStops.length;

        // Neighborhood 1: 2-Opt (Subsegment reversal)
        for (let i = 0; i < len - 1 && !improved; i++) {
          for (let k = i + 1; k < len; k++) {
            const reversedSlice = curStops.slice(i, k + 1).reverse();
            const cand = [
              ...curStops.slice(0, i),
              ...reversedSlice,
              ...curStops.slice(k + 1),
            ];
            const candEval = evalCandidate(cand);
            if (
              candEval.violations < current.violations ||
              (candEval.violations === current.violations && candEval.score > current.score)
            ) {
              current = candEval;
              improved = true;
              break;
            }
          }
        }

        // Neighborhood 2: 1-Opt Relocation / Insertion (move stop i to index j)
        if (!improved) {
          for (let i = 0; i < len && !improved; i++) {
            for (let j = 0; j < len; j++) {
              if (i === j) continue;
              const cand = [...curStops];
              const [moved] = cand.splice(i, 1);
              cand.splice(j, 0, moved);
              const candEval = evalCandidate(cand);
              if (
                candEval.violations < current.violations ||
                (candEval.violations === current.violations && candEval.score > current.score)
              ) {
                current = candEval;
                improved = true;
                break;
              }
            }
          }
        }

        // Neighborhood 3: Pairwise Swaps
        if (!improved) {
          for (let i = 0; i < len - 1 && !improved; i++) {
            for (let k = i + 1; k < len; k++) {
              const cand = [...curStops];
              const tmp = cand[i];
              cand[i] = cand[k];
              cand[k] = tmp;
              const candEval = evalCandidate(cand);
              if (
                candEval.violations < current.violations ||
                (candEval.violations === current.violations && candEval.score > current.score)
              ) {
                current = candEval;
                improved = true;
                break;
              }
            }
          }
        }
      }

      if (
        current.violations < best.violations ||
        (current.violations === best.violations && current.score > best.score)
      ) {
        best = current;
      }
    }

    return best.route;
  }
}

module.exports = { RouteBuilder, parseTimeToMinutes, formatMinutesToTime };

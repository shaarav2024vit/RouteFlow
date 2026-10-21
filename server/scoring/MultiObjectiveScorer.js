const { timeToMinutes } = require('../routing/Route');

const PRESETS = {
  BALANCED: {
    key: 'BALANCED',
    name: 'Balanced',
    description: 'Harmonizes transit efficiency, crowd avoidance, open venues, and scenic viewpoints.',
    weights: {
      travelTime: 0.25,
      timeWindowFit: 0.20,
      crowdAvoidance: 0.20,
      scenic: 0.15,
      attractionsOpen: 0.20,
      mustVisit: 0.00,
    },
  },
  FASTEST: {
    key: 'FASTEST',
    name: 'Fastest Route',
    description: 'Minimizes total travel time and road transit between stops.',
    weights: {
      travelTime: 0.60,
      timeWindowFit: 0.20,
      crowdAvoidance: 0.05,
      scenic: 0.05,
      attractionsOpen: 0.10,
      mustVisit: 0.00,
    },
  },
  SCENIC_EXPLORER: {
    key: 'SCENIC_EXPLORER',
    name: 'Best Scenic Route',
    description: 'Prioritizes visually stunning destinations and panoramic viewpoints.',
    weights: {
      travelTime: 0.15,
      timeWindowFit: 0.15,
      crowdAvoidance: 0.10,
      scenic: 0.45,
      attractionsOpen: 0.15,
      mustVisit: 0.00,
    },
  },
  CROWD_AVOIDER: {
    key: 'CROWD_AVOIDER',
    name: 'Least Crowded Route',
    description: 'Visits destinations during off-peak windows to minimize waiting queues.',
    weights: {
      travelTime: 0.15,
      timeWindowFit: 0.15,
      crowdAvoidance: 0.45,
      scenic: 0.10,
      attractionsOpen: 0.15,
      mustVisit: 0.00,
    },
  },
  MOST_OPEN: {
    key: 'MOST_OPEN',
    name: 'Most Attractions Open',
    description: 'Maximizes the number of operating venues and open hours during visits.',
    weights: {
      travelTime: 0.15,
      timeWindowFit: 0.15,
      crowdAvoidance: 0.10,
      scenic: 0.10,
      attractionsOpen: 0.50,
      mustVisit: 0.00,
    },
  },
};

/**
 * Computes an estimated crowd intensity [0..1] for a stop at a given time of day.
 * Midday (12:30-15:00) is peak crowd for standard tourist stops, whereas
 * morning/late afternoon are calmer.
 * @param {object} stop
 * @param {string} timeStr "HH:mm"
 * @returns {number} 0 (empty) to 1 (max capacity)
 */
function estimateCrowdLevel(stop, timeStr) {
  if (!timeStr) return 0.5;
  const mins = timeToMinutes(timeStr);
  const hour = mins / 60;

  // Base popularity from stop metadata (default 0.6)
  const basePopularity = stop.popularity !== undefined ? stop.popularity : 0.6;

  // Peak bell-curve centered around 13:30 (13.5) with standard deviation 2.5h
  const peakHour = 13.5;
  const distance = Math.abs(hour - peakHour);
  const bell = Math.exp(-0.5 * ((distance / 2.5) ** 2));

  // Minimum baseline crowd is 0.10
  const level = Math.min(1.0, Math.max(0.1, basePopularity * (0.2 + 0.8 * bell)));
  return Number(level.toFixed(2));
}

/**
 * MultiObjectiveScorer
 * Evaluates candidate routes against the 6 core RouteFlow scoring factors:
 * 1. Travel Time
 * 2. Time-Window Fit
 * 3. Crowd Avoidance
 * 4. Scenic Value
 * 5. Attractions Open
 * 6. Must-Visit Adherence
 */
class MultiObjectiveScorer {
  /**
   * @param {string|object} [presetOrWeights='BALANCED']
   */
  constructor(presetOrWeights = 'BALANCED') {
    if (typeof presetOrWeights === 'string') {
      const presetKey = presetOrWeights.toUpperCase();
      const preset = PRESETS[presetKey] || PRESETS.BALANCED;
      this.weights = { ...preset.weights };
      this.presetName = preset.name;
      this.presetKey = preset.key;
    } else if (typeof presetOrWeights === 'object' && presetOrWeights !== null) {
      this.weights = {
        travelTime: presetOrWeights.travelTime ?? 0.25,
        timeWindowFit: presetOrWeights.timeWindowFit ?? 0.20,
        crowdAvoidance: presetOrWeights.crowdAvoidance ?? 0.20,
        scenic: presetOrWeights.scenic ?? 0.15,
        attractionsOpen: presetOrWeights.attractionsOpen ?? 0.20,
        mustVisit: presetOrWeights.mustVisit ?? 0.00,
      };
      this.presetName = presetOrWeights.name || 'Custom';
      this.presetKey = 'CUSTOM';
    } else {
      this.weights = { ...PRESETS.BALANCED.weights };
      this.presetName = PRESETS.BALANCED.name;
      this.presetKey = PRESETS.BALANCED.key;
    }
  }

  /**
   * Evaluates and scores a completed route.
   * @param {import('../routing/Route').Route} route
   * @param {Array<import('../stops/Constraint').Constraint>} [constraints=[]]
   * @param {object} [tripConfig]
   * @returns {{ totalScore: number, breakdown: object, isFeasible: boolean, violations: Array<object> }}
   */
  scoreRoute(route, constraints = [], tripConfig = null) {
    const { violations } = route.checkConstraints(constraints);

    const totalMinutes = route.getTotalDuration();
    const totalDistance = route.getTotalDistance();
    const config = tripConfig || route.tripConfig;

    // Trip-level limits check (max duration or distance)
    if (config) {
      if (config.maxDurationMin && totalMinutes > config.maxDurationMin) {
        violations.push({
          constraintId: 'MAX_DURATION',
          name: 'MAX_DURATION',
          severity: 'HARD',
          message: `Trip duration (${totalMinutes} min) exceeds maximum limit (${config.maxDurationMin} min).`,
        });
      }
      if (config.maxDistanceKm && totalDistance > config.maxDistanceKm) {
        violations.push({
          constraintId: 'MAX_DISTANCE',
          name: 'MAX_DISTANCE',
          severity: 'HARD',
          message: `Trip distance (${totalDistance} km) exceeds maximum limit (${config.maxDistanceKm} km).`,
        });
      }
    }

    // --- Factor 1: Travel Time Score [0..1] ---
    // Scaled so a fast route scores high, decaying with extra minutes
    const travelTimeScore = Math.max(0, Math.min(1.0, 1 / (1 + totalMinutes / 120)));

    // --- Factor 2: Time-Window Fit Score [0..1] ---
    let timeWindowSum = 0;
    let windowCount = 0;
    for (const stop of route.stops) {
      if (stop.prefStart && stop.prefEnd) {
        windowCount += 1;
        const arrival = route.getArrivalTime(stop.id);
        if (arrival) {
          const arrMins = timeToMinutes(arrival);
          const startMins = timeToMinutes(stop.prefStart);
          const endMins = timeToMinutes(stop.prefEnd);

          if (arrMins >= startMins && arrMins <= endMins) {
            timeWindowSum += 1.0;
          } else {
            const diff = arrMins < startMins ? startMins - arrMins : arrMins - endMins;
            timeWindowSum += Math.max(0, 1.0 - diff / 60);
          }
        }
      }
    }
    const timeWindowFitScore = windowCount > 0 ? timeWindowSum / windowCount : 1.0;

    // --- Factor 3: Crowd Avoidance Score [0..1] ---
    let crowdSum = 0;
    let stopCount = 0;
    const crowdDetails = [];
    for (const stop of route.stops) {
      const arrival = route.getArrivalTime(stop.id);
      const crowdLevel = estimateCrowdLevel(stop, arrival);
      crowdDetails.push({ stopId: stop.id, name: stop.name, arrival, crowdLevel });
      crowdSum += crowdLevel;
      stopCount += 1;
    }
    const avgCrowd = stopCount > 0 ? crowdSum / stopCount : 0.5;
    const crowdAvoidanceScore = Math.max(0, 1.0 - avgCrowd);

    // --- Factor 4: Scenic Score [0..1] ---
    let scenicSum = 0;
    for (const stop of route.stops) {
      const scenic = stop.scenicScore !== undefined ? stop.scenicScore : 0.5;
      scenicSum += scenic;
    }
    const scenicScore = stopCount > 0 ? scenicSum / stopCount : 0.5;

    // --- Factor 5: Attractions Open Score [0..1] ---
    let openCount = 0;
    let totalWithHours = 0;
    for (const stop of route.stops) {
      const oh = (stop.constraints || []).find((c) => c.name === 'OPENING_HOURS');
      if (oh && oh.openTime && oh.closeTime) {
        totalWithHours += 1;
        const arrival = route.getArrivalTime(stop.id);
        if (arrival && arrival >= oh.openTime && arrival <= oh.closeTime) {
          openCount += 1;
        }
      }
    }
    const attractionsOpenScore = totalWithHours > 0 ? openCount / totalWithHours : 1.0;

    // --- Factor 6: Must-Visit Adherence Score [0..1] ---
    let mustVisitScore = 1.0;
    const missingMustVisits = [];
    for (const stop of route.stops) {
      if (stop.mustVisit && !route.getArrivalTime(stop.id)) {
        missingMustVisits.push(stop.name);
      }
    }
    if (missingMustVisits.length > 0) {
      mustVisitScore = Math.max(0, 1.0 - missingMustVisits.length * 0.5);
    }

    // Weighted multi-objective sum
    const normalizedWeightsSum =
      this.weights.travelTime +
      this.weights.timeWindowFit +
      this.weights.crowdAvoidance +
      this.weights.scenic +
      this.weights.attractionsOpen +
      this.weights.mustVisit;

    const baseScore =
      (this.weights.travelTime * travelTimeScore +
        this.weights.timeWindowFit * timeWindowFitScore +
        this.weights.crowdAvoidance * crowdAvoidanceScore +
        this.weights.scenic * scenicScore +
        this.weights.attractionsOpen * attractionsOpenScore +
        this.weights.mustVisit * mustVisitScore) /
      (normalizedWeightsSum || 1.0);

    // Hard constraint penalties
    let penalty = 0;
    for (const v of violations) {
      if (v.severity === 'HARD') {
        penalty += 10.0;
      } else {
        penalty += 1.0;
      }
    }

    const totalScore = Number(Math.max(-100, baseScore - penalty).toFixed(4));
    const isActuallyFeasible = violations.filter((v) => v.severity === 'HARD').length === 0;

    const breakdown = {
      preset: this.presetName,
      presetKey: this.presetKey,
      baseScore: Number(baseScore.toFixed(4)),
      totalScore,
      isFeasible: isActuallyFeasible,
      factors: {
        travelTime: {
          label: 'Travel Time Efficiency',
          score: Number(travelTimeScore.toFixed(3)),
          weight: this.weights.travelTime,
          description: `${Math.round(totalMinutes)} min total duration across ${totalDistance} km`,
        },
        timeWindowFit: {
          label: 'Time-Window Adherence',
          score: Number(timeWindowFitScore.toFixed(3)),
          weight: this.weights.timeWindowFit,
          description: windowCount > 0 ? `${windowCount} preference window(s) evaluated` : 'No custom window restrictions',
        },
        crowdAvoidance: {
          label: 'Crowd Minimization',
          score: Number(crowdAvoidanceScore.toFixed(3)),
          weight: this.weights.crowdAvoidance,
          description: `Average estimated crowd density: ${Math.round(avgCrowd * 100)}%`,
        },
        scenic: {
          label: 'Scenic & Aesthetic Value',
          score: Number(scenicScore.toFixed(3)),
          weight: this.weights.scenic,
          description: `Average viewpoint scenic rating: ${(scenicScore * 5).toFixed(1)} / 5`,
        },
        attractionsOpen: {
          label: 'Attractions Operating',
          score: Number(attractionsOpenScore.toFixed(3)),
          weight: this.weights.attractionsOpen,
          description: totalWithHours > 0 ? `${openCount} of ${totalWithHours} attractions open on arrival` : 'All stops open / no restricted hours',
        },
        mustVisit: {
          label: 'Must-Visit Adherence',
          score: Number(mustVisitScore.toFixed(3)),
          weight: this.weights.mustVisit,
          description: 'All mandatory destinations included in itinerary',
        },
      },
      avgCrowdLevel: Number(avgCrowd.toFixed(2)),
      penalty: Number(penalty.toFixed(2)),
      weights: this.weights,
      crowdDetails,
    };

    route.scoreBreakdown = breakdown;

    return {
      totalScore,
      breakdown,
      isFeasible: isActuallyFeasible,
      violations,
    };
  }
}

module.exports = {
  MultiObjectiveScorer,
  PRESETS,
  estimateCrowdLevel,
};

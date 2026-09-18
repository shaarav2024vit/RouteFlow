/**
 * RouteReporting
 * Traces to: FR-15; Week 2 §3; Week 4 §3, §5.2.
 *
 * Formats route summary reports including total travel time,
 * total distance, and constraint violation counts.
 */
class RouteReporting {
  /**
   * Generates a structured reporting summary for a computed Route and ScoreBreakdown
   * @param {import('../routing/Route').Route} route
   * @param {import('../scoring/ScoreBreakdown').ScoreBreakdown} scoreBreakdown
   * @returns {object}
   */
  static generateReport(route, scoreBreakdown) {
    if (!route) {
      return {
        totalStops: 0,
        totalDistanceKm: 0,
        totalTravelTimeMin: 0,
        violationCount: 0,
        violations: [],
        score: 0,
        factorSummary: {},
      };
    }

    return {
      totalStops: route.stops.length,
      totalDistanceKm: Number(route.totalDistanceKm.toFixed(2)),
      totalTravelTimeMin: Number(route.totalTravelTimeMin.toFixed(1)),
      violationCount: route.violations.length,
      violations: route.violations.map((v) => ({
        type: v.type,
        severity: v.severity,
        message: v.message,
      })),
      score: scoreBreakdown ? scoreBreakdown.totalScore : 0,
      factorSummary: scoreBreakdown
        ? {
            travelTime: scoreBreakdown.travelTimeScore,
            timeWindow: scoreBreakdown.timeWindowScore,
            weather: scoreBreakdown.weatherScore,
            crowd: scoreBreakdown.crowdScore,
            scenic: scoreBreakdown.scenicScore,
            userPreference: scoreBreakdown.preferenceScore,
          }
        : {},
      stops: route.stops.map((s, idx) => ({
        sequence: idx + 1,
        stopId: s.id,
        name: s.name,
        lat: s.lat,
        lon: s.lon,
        scheduledArrival: s.scheduledArrival,
      })),
    };
  }
}

module.exports = { RouteReporting };

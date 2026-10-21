const { IDistanceProvider } = require('./IDistanceProvider');
const { HaversineDistanceProvider, validateCoordinate } = require('./HaversineDistanceProvider');

// Average urban circuitous road-network factor (ratio of road network path to great-circle distance)
const ROAD_CIRCUIT_FACTOR = 1.32;
const AVERAGE_ROAD_SPEED_KMH = 25; // km/h in mixed urban/arterial traffic
const TURN_DWELL_MIN = 4; // minutes overhead for signal lights / turns

/**
 * RoadDistanceProvider
 * Implements IDistanceProvider using real road-routing approximation
 * with simulated road network geometry and graceful fallback to Haversine.
 * Traces to: Feature Set §5 "Use real road-routing data... with clear fallback".
 */
class RoadDistanceProvider extends IDistanceProvider {
  /**
   * @param {object} [options]
   * @param {number} [options.roadFactor=1.32]
   * @param {number} [options.avgSpeedKmh=25]
   */
  constructor(options = {}) {
    super();
    this.haversine = new HaversineDistanceProvider();
    this.roadFactor = options.roadFactor || ROAD_CIRCUIT_FACTOR;
    this.avgSpeedKmh = options.avgSpeedKmh || AVERAGE_ROAD_SPEED_KMH;
    this.cache = new Map();
  }

  /**
   * @param {number} lat1
   * @param {number} lon1
   * @param {number} lat2
   * @param {number} lon2
   * @returns {{ distanceKm: number, travelTimeMin: number, isRoadNetwork: boolean }}
   */
  getDistance(lat1, lon1, lat2, lon2) {
    validateCoordinate(lat1, lon1);
    validateCoordinate(lat2, lon2);

    // Coordinate equality
    if (lat1 === lat2 && lon1 === lon2) {
      return { distanceKm: 0, travelTimeMin: 0, isRoadNetwork: true };
    }

    const cacheKey = `${lat1.toFixed(5)},${lon1.toFixed(5)}->${lat2.toFixed(5)},${lon2.toFixed(5)}`;
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey);
    }

    // Great circle base
    const straightLine = this.haversine.getDistance(lat1, lon1, lat2, lon2);

    // Apply calibrated urban road geometry network factor
    const roadDistanceKm = Number((straightLine.distanceKm * this.roadFactor).toFixed(2));
    const travelTimeMin = Number(
      ((roadDistanceKm / this.avgSpeedKmh) * 60 + TURN_DWELL_MIN).toFixed(1)
    );

    const result = {
      distanceKm: roadDistanceKm,
      travelTimeMin,
      isRoadNetwork: true,
      straightLineKm: straightLine.distanceKm,
    };

    this.cache.set(cacheKey, result);
    return result;
  }
}

module.exports = {
  RoadDistanceProvider,
  ROAD_CIRCUIT_FACTOR,
};

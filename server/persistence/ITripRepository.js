/**
 * ITripRepository (interface)
 * Traces to: Week 4 §2.2, §3, §5.2.
 *
 * Abstract repository interface for persisting and reconstructing trip aggregates.
 */
class ITripRepository {
  /**
   * @param {object} tripData
   */
  // eslint-disable-next-line class-methods-use-this, no-unused-vars
  saveTrip(tripData) {
    throw new Error('saveTrip() must be implemented by a subclass');
  }

  /**
   * @param {string} tripId
   * @returns {object|null}
   */
  // eslint-disable-next-line class-methods-use-this, no-unused-vars
  loadTrip(tripId) {
    throw new Error('loadTrip() must be implemented by a subclass');
  }

  /**
   * @param {string} tripId
   * @param {object} routeResultData
   */
  // eslint-disable-next-line class-methods-use-this, no-unused-vars
  saveRouteResult(tripId, routeResultData) {
    throw new Error('saveRouteResult() must be implemented by a subclass');
  }
}

module.exports = { ITripRepository };

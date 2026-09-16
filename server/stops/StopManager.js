const EventEmitter = require('events');
const crypto = require('crypto');
const { validateCoordinate } = require('../distance/HaversineDistanceProvider');
const { OpeningHoursConstraint } = require('./OpeningHoursConstraint');
const { PrecedenceConstraint } = require('./PrecedenceConstraint');

/**
 * Local helper to generate random IDs using Node crypto
 * Matches cryptoRandomId mentioned in Week 6 §3.5
 * @returns {string}
 */
function cryptoRandomId() {
  return crypto.randomUUID();
}

/**
 * StopManager
 * Traces to: FR-1–FR-5, FR-16; Week 4 §3 module contract.
 *
 * Owns the stop list and Trip Config. Emits 'stopsChanged' on every
 * mutation; the Re-sequencing Controller (not yet built — Week 5
 * §5.2) will subscribe to this event rather than being called
 * directly, per Week 3 Decision 3.
 */
class StopManager extends EventEmitter {
  constructor() {
    super();
    this.stops = [];
    this.tripConfig = null;
  }

  /**
   * Appends a validated Stop, assigning inputOrder in insertion sequence
   * @param {{name: string, lat: number, lon: number, prefStart?: string|null, prefEnd?: string|null}} stopData
   * @returns {object}
   */
  addStop(stopData) {
    validateCoordinate(stopData.lat, stopData.lon);
    const stop = {
      ...stopData,
      id: cryptoRandomId(),
      inputOrder: this.stops.length,
      constraints: [],
    };
    this.stops.push(stop);
    this.emit('stopsChanged', { type: 'ADD', stopId: stop.id });
    return stop;
  }

  /**
   * Removes a stop and re-indexes remaining stops' inputOrder
   * @param {string} stopId
   */
  removeStop(stopId) {
    this.getStop(stopId); // confirms stop exists before removing
    this.stops = this.stops.filter((s) => s.id !== stopId);
    this.stops.forEach((s, i) => {
      s.inputOrder = i;
    });
    this.emit('stopsChanged', { type: 'REMOVE', stopId });
  }

  /**
   * Updates coordinates from a marker drag, re-validating bounds
   * @param {string} stopId
   * @param {number} lat
   * @param {number} lon
   */
  repositionStop(stopId, lat, lon) {
    validateCoordinate(lat, lon);
    const stop = this.getStop(stopId);
    stop.lat = lat;
    stop.lon = lon;
    this.emit('stopsChanged', { type: 'REPOSITION', stopId });
  }

  /**
   * Sets trip-level configuration (start time, start location)
   * Traces to: FR-16
   * @param {string} startTime e.g. "09:00"
   * @param {number} startLat
   * @param {number} startLon
   */
  setTripConfig(startTime, startLat, startLon) {
    validateCoordinate(startLat, startLon);
    this.tripConfig = {
      startTime,
      startLat,
      startLon,
    };
    this.emit('stopsChanged', { type: 'TRIP_CONFIG_UPDATED' });
  }

  /**
   * Attaches an OpeningHoursConstraint or PrecedenceConstraint after structural validation
   * @param {string} stopId
   * @param {OpeningHoursConstraint|PrecedenceConstraint} constraint
   */
  attachConstraint(stopId, constraint) {
    this.getStop(stopId); // throws if the stop does not exist
    if (constraint instanceof OpeningHoursConstraint) {
      if (!constraint.openTime || !constraint.closeTime) {
        throw new TypeError('OpeningHoursConstraint requires openTime and closeTime.');
      }
      if (constraint.openTime >= constraint.closeTime) {
        throw new RangeError('openTime must precede closeTime (Week 4 §6.2).');
      }
    }
    if (constraint instanceof PrecedenceConstraint) {
      if (constraint.precedesStopId === stopId) {
        throw new RangeError('A stop cannot precede itself (Week 4 §6.2).');
      }
      this.getStop(constraint.precedesStopId); // throws if target stop unknown
    }

    this.getStop(stopId).constraints.push(constraint);
    this.emit('stopsChanged', { type: 'CONSTRAINT_ADDED', stopId });
  }

  /**
   * Retrieves stop by ID or throws RangeError
   * @param {string} stopId
   * @returns {object}
   */
  getStop(stopId) {
    const stop = this.stops.find((s) => s.id === stopId);
    if (!stop) throw new RangeError(`No stop with id ${stopId}.`);
    return stop;
  }
}

module.exports = { StopManager, cryptoRandomId };

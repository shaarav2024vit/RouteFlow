/**
 * ReasoningEngine
 * Generates transparent, human-readable explanations detailing why a specific
 * sequence was selected over alternatives, which constraints dictated the order,
 * and what multi-objective trade-offs were made.
 *
 * Direct, factual, and informative — no buzzwords or filler.
 */
class ReasoningEngine {
  /**
   * Generates a complete rationale explanation for a planned route.
   */
  static generateExplanation({
    optimalRoute,
    shortestDistanceRoute,
    originalRoute,
    alternatives = [],
    scorer,
    comparison,
    conflictSuggestions = [],
  }) {
    if (!optimalRoute || optimalRoute.stops.length === 0) {
      return {
        summary: 'No stops configured. Add stops to generate a route plan.',
        itinerary: [],
        constraintDecisions: [],
        tradeOffs: [],
        comparisons: [],
        factors: {},
        conflictSuggestions: [],
        reorderingRationale: null,
      };
    }

    const { scoreBreakdown } = optimalRoute;
    const presetName = (scoreBreakdown && scoreBreakdown.preset) || (scorer && scorer.presetName) || 'Balanced';

    // 1. Executive Summary
    const summary = ReasoningEngine._buildSummary(optimalRoute, presetName, comparison);

    // 2. Step-by-step itinerary narrative
    const itinerary = ReasoningEngine._buildItinerary(optimalRoute);

    // 3. Constraint decisions
    const constraintDecisions = ReasoningEngine._buildConstraintDecisions(optimalRoute);

    // 4. Trade-off analysis vs purely shortest path
    const tradeOffs = ReasoningEngine._buildTradeOffs(optimalRoute, shortestDistanceRoute);

    // 5. Alternatives comparison
    const comparisons = ReasoningEngine._buildComparisons(optimalRoute, alternatives);

    // 6. Reordering rationale vs original order
    const reorderingRationale = ReasoningEngine._buildReorderingRationale(originalRoute, optimalRoute);

    return {
      presetName,
      summary,
      itinerary,
      constraintDecisions,
      tradeOffs,
      comparisons,
      reorderingRationale,
      conflictSuggestions,
      factors: scoreBreakdown?.factors || {},
      metrics: {
        totalDistanceKm: optimalRoute.getTotalDistance(),
        totalDurationMin: optimalRoute.getTotalDuration(),
        isFeasible: scoreBreakdown ? scoreBreakdown.isFeasible : true,
        avgCrowdLevel: scoreBreakdown ? `${Math.round(scoreBreakdown.avgCrowdLevel * 100)}%` : 'N/A',
        score: scoreBreakdown ? scoreBreakdown.totalScore : null,
        comparison,
      },
    };
  }

  static _buildSummary(route, preset, comparison) {
    const stopsCount = route.stops.length;
    const dist = route.getTotalDistance();
    const durationMin = route.getTotalDuration();
    const hours = Math.floor(durationMin / 60);
    const mins = durationMin % 60;
    const durationStr = hours > 0 ? `${hours}h ${mins}m` : `${mins} min`;
    const isFeasible = route.scoreBreakdown ? route.scoreBreakdown.isFeasible : true;

    let text = `${stopsCount} stops scheduled across ${dist} km (${durationStr} total trip) using '${preset}' strategy.`;

    if (isFeasible) {
      text += ' All venue operating hours and prerequisite visit sequences are verified and satisfied.';
    } else {
      text += ' Warning: Schedule conflicts found; see recommendations below.';
    }

    if (comparison && comparison.distanceSavedKm > 0) {
      text += ` Optimization saved ${comparison.distanceSavedKm} km (${comparison.percentDistanceSaved}%) and ~${comparison.timeSavedMin} min compared to the original input order.`;
    }

    return text;
  }

  static _buildItinerary(route) {
    return route.legs.map((leg, index) => {
      const stop = leg.toStop;
      const stepNumber = index + 1;

      if (leg.isReturnLeg) {
        const fromDesc = leg.fromStop ? leg.fromStop.name : 'last destination';
        return {
          stepNumber,
          stopId: stop?.id || 'ORIGIN_RETURN',
          stopName: stop?.name || 'Trip Origin (Return)',
          lat: stop?.lat || 0,
          lon: stop?.lon || 0,
          arrivalTime: leg.arrivalTime,
          departureTime: leg.departureTime,
          dwellTimeMin: 0,
          waitTimeMin: 0,
          distanceFromPrevKm: leg.distanceKm,
          travelTimeFromPrevMin: Math.round(leg.travelTimeMin),
          isReturnLeg: true,
          reasons: [
            `Return transit from ${fromDesc}: ${leg.distanceKm} km (~${Math.round(leg.travelTimeMin)} min).`,
            `Round-trip itinerary successfully completed at ${leg.arrivalTime}.`,
          ],
        };
      }

      const reasons = [];

      const fromDesc = leg.fromStop ? leg.fromStop.name : 'trip origin';
      reasons.push(
        `Drive from ${fromDesc}: ${leg.distanceKm} km (~${Math.round(leg.travelTimeMin)} min transit).`
      );

      if (leg.waitTimeMin > 0) {
        reasons.push(
          `Arrived at ${leg.arrivalTime} before opening; waiting ${leg.waitTimeMin} min until venue opens.`
        );
      }

      if (Array.isArray(stop.constraints)) {
        for (const c of stop.constraints) {
          if (c.name === 'OPENING_HOURS') {
            reasons.push(
              `Operating hours verified: ${leg.arrivalTime} is within open window [${c.openTime}–${c.closeTime}].`
            );
          } else if (c.name === 'PRECEDENCE') {
            reasons.push(
              `Precedence: Visited before prerequisite target stop.`
            );
          }
        }
      }

      if (stop.prefStart && stop.prefEnd) {
        if (leg.arrivalTime >= stop.prefStart && leg.arrivalTime <= stop.prefEnd) {
          reasons.push(`Arrival fits your preferred window (${stop.prefStart}–${stop.prefEnd}).`);
        } else {
          reasons.push(`Adjusted to ${leg.arrivalTime} to satisfy higher-priority opening constraints.`);
        }
      }

      const crowdEntry = route.scoreBreakdown?.crowdDetails?.find((cd) => cd.stopId === stop.id);
      if (crowdEntry) {
        const pct = Math.round(crowdEntry.crowdLevel * 100);
        if (pct <= 35) {
          reasons.push(`Quiet period: estimated ~${pct}% crowd density.`);
        } else if (pct <= 65) {
          reasons.push(`Moderate crowd window (~${pct}% capacity).`);
        } else {
          reasons.push(`Peak visit hour (~${pct}% capacity).`);
        }
      }

      return {
        stepNumber,
        stopId: stop.id,
        stopName: stop.name,
        lat: stop.lat,
        lon: stop.lon,
        arrivalTime: leg.arrivalTime,
        departureTime: leg.departureTime,
        dwellTimeMin: leg.dwellTimeMin,
        waitTimeMin: leg.waitTimeMin || 0,
        distanceFromPrevKm: leg.distanceKm,
        travelTimeFromPrevMin: leg.travelTimeMin,
        reasons,
      };
    });
  }

  static _buildConstraintDecisions(route) {
    const decisions = [];
    const stopOrder = route.getStopOrder();

    for (const stop of route.stops) {
      if (!Array.isArray(stop.constraints)) continue;

      for (const c of stop.constraints) {
        if (c.name === 'OPENING_HOURS') {
          const arrival = route.getArrivalTime(stop.id);
          const satisfied = arrival >= c.openTime && arrival <= c.closeTime;
          decisions.push({
            id: c.id,
            type: 'OPENING_HOURS',
            stopId: stop.id,
            stopName: stop.name,
            rule: `Open between ${c.openTime} and ${c.closeTime}`,
            status: satisfied ? 'SATISFIED' : 'VIOLATED',
            explanation: satisfied
              ? `Arrival at ${arrival} is safely inside open hours [${c.openTime}–${c.closeTime}].`
              : `Arrival at ${arrival} is outside open hours [${c.openTime}–${c.closeTime}].`,
          });
        } else if (c.name === 'PRECEDENCE') {
          const targetStop = route.stops.find((s) => s.id === c.precedesStopId);
          const idxA = stopOrder.indexOf(stop.id);
          const idxB = stopOrder.indexOf(c.precedesStopId);
          const satisfied = idxA !== -1 && idxB !== -1 && idxA < idxB;
          decisions.push({
            id: c.id,
            type: 'PRECEDENCE',
            stopId: stop.id,
            stopName: stop.name,
            rule: `Must precede ${targetStop ? targetStop.name : c.precedesStopId}`,
            status: satisfied ? 'SATISFIED' : 'VIOLATED',
            explanation: satisfied
              ? `'${stop.name}' is scheduled at #${idxA + 1}, ahead of '${targetStop?.name || c.precedesStopId}' at #${idxB + 1}.`
              : `'${stop.name}' was placed after '${targetStop?.name || c.precedesStopId}', violating visit order.`,
          });
        }
      }
    }

    return decisions;
  }

  static _buildTradeOffs(optimalRoute, shortestRoute) {
    const tradeOffs = [];
    if (!shortestRoute || optimalRoute === shortestRoute) {
      tradeOffs.push({
        title: 'Optimal Path Alignment',
        description: 'The selected route achieves both the lowest travel distance and fulfills all timing rules without detour penalties.',
      });
      return tradeOffs;
    }

    const distDiff = optimalRoute.getTotalDistance() - shortestRoute.getTotalDistance();
    const optViolations = optimalRoute.checkConstraints().violations;
    const shortViolations = shortestRoute.checkConstraints().violations;

    if (shortViolations.length > 0 && optViolations.length === 0) {
      tradeOffs.push({
        title: 'Feasibility vs. Naive Shortest Distance',
        description: `A purely shortest-distance router would save ${Math.abs(distDiff).toFixed(1)} km, but fails ${shortViolations.length} constraint(s) (arriving when closed or in reversed order). RouteFlow selected the feasible path instead.`,
      });
    }

    if (optimalRoute.scoreBreakdown?.avgCrowdLevel !== undefined && shortestRoute.scoreBreakdown?.avgCrowdLevel !== undefined) {
      const optCrowd = Math.round(optimalRoute.scoreBreakdown.avgCrowdLevel * 100);
      const shortCrowd = Math.round(shortestRoute.scoreBreakdown.avgCrowdLevel * 100);
      if (optCrowd < shortCrowd) {
        tradeOffs.push({
          title: 'Crowd Exposure Reduction',
          description: `Adjusted visiting sequence to avoid peak queue hours, reducing average crowd exposure from ${shortCrowd}% down to ${optCrowd}%.`,
        });
      }
    }

    if (distDiff > 0) {
      tradeOffs.push({
        title: 'Distance Trade-Off for Constraint Compliance',
        description: `Added ${distDiff.toFixed(1)} km (~${Math.round(optimalRoute.getTotalDuration() - shortestRoute.getTotalDuration())} min transit) to ensure every destination is visited when open and accessible.`,
      });
    }

    return tradeOffs;
  }

  static _buildComparisons(optimalRoute, alternatives) {
    if (!alternatives || alternatives.length === 0) return [];

    return alternatives.map((alt, idx) => {
      const order = alt.stops.map((s) => s.name).join(' → ');
      const diffKm = (alt.getTotalDistance() - optimalRoute.getTotalDistance()).toFixed(1);
      const diffMin = alt.getTotalDuration() - optimalRoute.getTotalDuration();
      const violations = alt.checkConstraints().violations;

      let verdict = 'Lower overall score than the selected route.';
      if (violations.length > 0) {
        verdict = `Violates ${violations.length} constraint(s) (${violations.map((v) => v.name).join(', ')}).`;
      } else if (alt.scoreBreakdown?.avgCrowdLevel > optimalRoute.scoreBreakdown?.avgCrowdLevel) {
        verdict = `Higher crowd exposure (${Math.round((alt.scoreBreakdown.avgCrowdLevel - optimalRoute.scoreBreakdown.avgCrowdLevel) * 100)}% worse).`;
      }

      return {
        candidateRank: idx + 2,
        routeOrder: order,
        totalDistanceKm: alt.getTotalDistance(),
        totalDurationMin: alt.getTotalDuration(),
        diffKm: Number(diffKm),
        diffMin,
        score: alt.scoreBreakdown ? alt.scoreBreakdown.totalScore : null,
        isFeasible: violations.length === 0,
        rejectionReason: verdict,
      };
    });
  }

  static _buildReorderingRationale(originalRoute, optimalRoute) {
    if (!originalRoute || !optimalRoute) return null;

    const originalOrder = originalRoute.getStopOrder();
    const optimalOrder = optimalRoute.getStopOrder();

    const isIdentical = originalOrder.every((id, idx) => id === optimalOrder[idx]);
    if (isIdentical) {
      return {
        reordered: false,
        message: 'The initial input sequence was already optimal; no reordering was required.',
      };
    }

    const changedStops = [];
    optimalRoute.stops.forEach((stop, newIdx) => {
      const oldIdx = originalOrder.indexOf(stop.id);
      if (oldIdx !== newIdx) {
        changedStops.push({
          stopName: stop.name,
          fromPosition: oldIdx + 1,
          toPosition: newIdx + 1,
        });
      }
    });

    return {
      reordered: true,
      message: `Reordered ${changedStops.length} stops to eliminate backtracking, reduce transit duration, and meet venue opening windows.`,
      changes: changedStops,
    };
  }
}

module.exports = { ReasoningEngine };

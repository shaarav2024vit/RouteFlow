/**
 * ScoreBreakdownCard
 * Traces to: FR-12, NFR-3; Week 1 §1; Week 4 §3.
 *
 * Renders the 6 scoring factors as dual-bar rows:
 *  • Grey track  = raw factor score (0–100), fixed by route geometry/data.
 *  • Coloured bar = weighted contribution (factor × weight), shifts instantly
 *    when a slider is moved — making the weight sliders feel live.
 *
 * Call render(scoreBreakdown) after a server sync.
 * Call setWeights(weights) on every slider input event for instant feedback.
 */
class ScoreBreakdownCard {
  constructor(containerId) {
    this.container      = document.getElementById(containerId);
    this._lastBreakdown = null;
    this._weights       = {
      travelTimeWeight: 1.0,
      timeWindowWeight: 0.5,
      weatherWeight:    0.1,
      crowdWeight:      0.1,
      scenicWeight:     0.1,
      preferenceWeight: 0.2,
    };
  }

  /** Called by the slider panel on every 'input' event — re-renders instantly. */
  setWeights(weights) {
    this._weights = { ...this._weights, ...weights };
    if (this._lastBreakdown) this._renderWith(this._lastBreakdown);
  }

  /** Called after a server syncState() — stores breakdown and re-renders. */
  render(scoreBreakdown) {
    if (!this.container) return;
    this._lastBreakdown = scoreBreakdown;
    this._renderWith(scoreBreakdown);
  }

  _renderWith(scoreBreakdown) {
    if (!this.container) return;

    if (!scoreBreakdown) {
      this.container.innerHTML =
        '<div style="color:var(--text-muted);font-size:0.77rem;text-align:center;padding:10px 0">Add stops to inspect score breakdown.</div>';
      return;
    }

    const w = this._weights;
    const FACTOR_DEFS = [
      { label: 'Travel Time', icon: '⚡',  rawKey: 'travelTimeScore', wKey: 'travelTimeWeight' },
      { label: 'Time Windows',icon: '🕐',  rawKey: 'timeWindowScore', wKey: 'timeWindowWeight' },
      { label: 'Weather',     icon: '🌤️',  rawKey: 'weatherScore',    wKey: 'weatherWeight'    },
      { label: 'Crowd',       icon: '👥',  rawKey: 'crowdScore',      wKey: 'crowdWeight'      },
      { label: 'Scenic',      icon: '🌲',  rawKey: 'scenicScore',     wKey: 'scenicWeight'     },
      { label: 'Preference',  icon: '🎯',  rawKey: 'preferenceScore', wKey: 'preferenceWeight' },
    ];

    this.container.innerHTML = FACTOR_DEFS.map((f) => {
      const raw      = Math.round(scoreBreakdown[f.rawKey] ?? 0);
      const weight   = w[f.wKey] ?? 0;
      // Weighted bar: factor_score × weight, scaled so weight=1.0 shows the full raw bar
      const weighted = Math.min(100, Math.max(0, Math.round(raw * weight)));
      const rawPct   = Math.min(100, Math.max(0, raw));

      const colourClass =
        weighted >= 70 ? 'green' : weighted >= 40 ? 'yellow' : weighted > 0 ? 'red' : 'blue';

      return `
        <div class="factor-row">
          <div class="factor-header">
            <span>${f.icon} ${f.label}</span>
            <div style="display:flex;align-items:center;gap:6px">
              <span style="font-size:0.67rem;color:var(--text-muted);font-weight:500">×${weight.toFixed(2)}</span>
              <span class="factor-pts">${weighted}<span style="font-size:0.65em;color:var(--text-muted);font-weight:500"> pts</span></span>
            </div>
          </div>
          <div class="bar-track" title="Raw: ${raw}pts  ·  Weight: ×${weight.toFixed(2)}  ·  Contribution: ${weighted}pts">
            <div style="position:absolute;top:0;left:0;height:100%;width:${rawPct}%;background:rgba(255,255,255,0.06);border-radius:inherit;"></div>
            <div class="bar-fill ${colourClass}" style="width:${weighted}%;transition:width 0.25s ease;"></div>
          </div>
        </div>`;
    }).join('');
  }
}

window.ScoreBreakdownCard = ScoreBreakdownCard;

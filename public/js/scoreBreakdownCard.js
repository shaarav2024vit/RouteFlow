/**
 * ScoreBreakdownCard
 * Traces to: FR-12, NFR-3; Week 1 §1; Week 4 §3.
 * Renders the decomposed scoring factors as visual progress bars for explainability.
 * Bars are colour-coded: green ≥70, yellow ≥40, red <40.
 */
class ScoreBreakdownCard {
  constructor(containerId) {
    this.container = document.getElementById(containerId);
  }

  render(scoreBreakdown) {
    if (!this.container) return;

    if (!scoreBreakdown) {
      this.container.innerHTML =
        '<div style="color:var(--text-muted);font-size:0.77rem;text-align:center;padding:10px 0">Add stops to inspect score breakdown.</div>';
      return;
    }

    const factors = [
      { label: 'Travel Time', icon: '⚡', val: scoreBreakdown.travelTimeScore },
      { label: 'Time Windows', icon: '🕐', val: scoreBreakdown.timeWindowScore },
      { label: 'Weather',      icon: '🌤️', val: scoreBreakdown.weatherScore },
      { label: 'Crowd',        icon: '👥', val: scoreBreakdown.crowdScore },
      { label: 'Scenic',       icon: '🌲', val: scoreBreakdown.scenicScore },
      { label: 'Preference',   icon: '🎯', val: scoreBreakdown.preferenceScore },
    ];

    this.container.innerHTML = factors
      .map((f) => {
        const val = Math.round(f.val ?? 0);
        const pct = Math.min(100, Math.max(0, val));
        const colourClass =
          pct >= 70 ? 'green' : pct >= 40 ? 'yellow' : pct > 0 ? 'red' : 'blue';
        return `
          <div class="factor-row">
            <div class="factor-header">
              <span>${f.icon} ${f.label}</span>
              <span class="factor-pts">${val}<span style="font-size:0.65em;color:var(--text-muted);font-weight:500"> pts</span></span>
            </div>
            <div class="bar-track">
              <div class="bar-fill ${colourClass}" style="width:${pct}%"></div>
            </div>
          </div>`;
      })
      .join('');
  }
}

window.ScoreBreakdownCard = ScoreBreakdownCard;

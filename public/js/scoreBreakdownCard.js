/**
 * ScoreBreakdownCard
 * Traces to: FR-12, NFR-3; Week 1 §1; Week 4 §3.
 * Renders the decomposed scoring factors as visual progress bars for explainability.
 */
class ScoreBreakdownCard {
  constructor(containerId) {
    this.container = document.getElementById(containerId);
  }

  render(scoreBreakdown) {
    if (!this.container) return;
    if (!scoreBreakdown) {
      this.container.innerHTML = '<div style="color: var(--text-muted); font-size: 0.8rem;">Add stops to inspect score breakdown.</div>';
      return;
    }

    const factors = [
      { label: 'Travel Time Efficiency', val: scoreBreakdown.travelTimeScore },
      { label: 'Time Window / Opening Hours Fit', val: scoreBreakdown.timeWindowScore },
      { label: 'Weather Quality', val: scoreBreakdown.weatherScore },
      { label: 'Crowd Avoidance', val: scoreBreakdown.crowdScore },
      { label: 'Scenic Value', val: scoreBreakdown.scenicScore },
      { label: 'User Time Preference Fit', val: scoreBreakdown.preferenceScore },
    ];

    this.container.innerHTML = factors
      .map(
        (f) => `
      <div class="factor-row">
        <div class="factor-header">
          <span>${f.label}</span>
          <span>${f.val} pts</span>
        </div>
        <div class="bar-track">
          <div class="bar-fill" style="width: ${Math.min(100, Math.max(0, f.val))}%;"></div>
        </div>
      </div>
    `
      )
      .join('');
  }
}

window.ScoreBreakdownCard = ScoreBreakdownCard;

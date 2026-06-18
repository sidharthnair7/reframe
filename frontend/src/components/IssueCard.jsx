import '../styles/issue-card.css';

const ACTION_LABELS = {
  ACTIONABLE: { label: "Actionable", cls: "green" },
  ANXIETY:    { label: "Anxiety",    cls: "red"   },
  UNCLEAR:    { label: "Unclear",    cls: "amber" },
};

export default function IssueCard({ node, onClose }) {
  const action = ACTION_LABELS[node.actionability] || ACTION_LABELS.UNCLEAR;
  const hasPlan = node.actionPlan && node.actionPlan.framework !== "Unavailable";

  const onOverlayClick = (e) => { if (e.target === e.currentTarget) onClose(); };

  return (
    <>      <div className="ic-overlay" onClick={onOverlayClick}>
        <div className="ic-card">
          <div className="ic-header">
            <div className="ic-title">{node.text}</div>
            <button className="ic-close" onClick={onClose}>✕</button>
          </div>

          <div className="ic-tags">
            {node.priorityScore != null && (
              <span className="ic-tag score">Score: {node.priorityScore.toFixed(1)}</span>
            )}
            <span className={`ic-tag ${action.cls}`}>{action.label}</span>
            {node.category && <span className="ic-tag">{node.category}</span>}
            {node.urgency != null && <span className="ic-tag">Urgency {node.urgency}/10</span>}
            {node.cognitiveWeight != null && <span className="ic-tag">Weight {node.cognitiveWeight}/10</span>}
            {node.confidenceInterval != null && (
              <span className="ic-tag">±{(node.confidenceInterval * 100).toFixed(0)}% confidence</span>
            )}
          </div>

          {node.priorityReasoning && (
            <div className="ic-section">
              <div className="ic-section-head">Why This Priority</div>
              <div className="ic-reasoning">{node.priorityReasoning}</div>
            </div>
          )}

          {node.hiddenAssumptions?.length > 0 && (
            <div className="ic-section">
              <div className="ic-section-head">Hidden Assumptions</div>
              {node.hiddenAssumptions.map((a, i) => (
                <div className="ic-assumption" key={i}>{a}</div>
              ))}
            </div>
          )}

          {hasPlan && (
            <div className="ic-section">
              <div className="ic-section-head">Action Plan</div>
              <div className="ic-plan-framework">{node.actionPlan.framework}</div>
              {node.actionPlan.steps?.map((step, i) => (
                <div className="ic-step" key={i}>
                  <div className="ic-step-num">{i + 1}</div>
                  <div className="ic-step-text">{step}</div>
                </div>
              ))}
              <div className="ic-plan-meta">
                {node.actionPlan.timeEstimate && (
                  <div className="ic-plan-meta-item">
                    <strong>Time:</strong> {node.actionPlan.timeEstimate}
                  </div>
                )}
                {node.actionPlan.urgencyNote && (
                  <div className="ic-plan-meta-item" style={{ flex: 1 }}>
                    {node.actionPlan.urgencyNote}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

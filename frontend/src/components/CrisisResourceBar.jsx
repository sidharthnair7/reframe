import { useState } from "react";
import { useAuth } from "../context/AuthContext";
import crisisResources from "../data/crisisResources.json";
import "../styles/crisis-resource-bar.css";

// Always present (never depends on detecting anything in the user's text — that's
// the actual safety property), but the specific resource name/number only renders
// once expanded. No crisis-specific wording exists in the DOM until then, so this
// doesn't read as a crisis app to someone who's just here to vent about a deadline.
export default function CrisisResourceBar() {
  const { user } = useAuth();
  const [expanded, setExpanded] = useState(false);

  if (!expanded) {
    return (
      <div className="crisis-bar collapsed">
        <button className="crisis-bar-toggle" onClick={() => setExpanded(true)}>
          Support
        </button>
      </div>
    );
  }

  const resource = crisisResources[user?.country] ?? crisisResources.default;

  return (
    <div className="crisis-bar expanded">
      <span className="crisis-bar-label">Need to talk to someone right now?</span>
      <a className="crisis-bar-link" href={resource.url} target="_blank" rel="noopener noreferrer">
        {resource.name}
        {resource.phone ? ` — ${resource.phone}` : ""}
      </a>
      <button className="crisis-bar-collapse" onClick={() => setExpanded(false)} aria-label="Collapse">✕</button>
    </div>
  );
}

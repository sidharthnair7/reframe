import { useState, useEffect } from "react";
import { getHistory, getSession } from "../api";
import "../styles/memory-garden.css";

export default function MemoryGarden({ liveSessions = [], onLoadSession, onClose }) {
  const [fetched,   setFetched]   = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [loadingId, setLoadingId] = useState(null);
  const [error,     setError]     = useState("");

  useEffect(() => {
    getHistory()
      .then(setFetched)
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  // Live sessions always appear first; deduplicate by sessionId
  const liveIds  = new Set(liveSessions.map(s => s.sessionId));
  const sessions = [...liveSessions, ...fetched.filter(s => !liveIds.has(s.sessionId))];

  const handleLoad = async (session) => {
    // Live sessions carry their full result — no network call needed
    if (session._liveResult) {
      const r = session._liveResult;
      onLoadSession({
        sessionId: r.sessionId,
        issues:    r.issues      ?? [],
        edges:     r.edges       ?? [],
        status:    "COMPLETE",
        summary:   r.summary     ?? `${r.issues?.length ?? 0} issue(s)`,
        stageReached: r.stageReached ?? "STAGE_5",
      });
      return;
    }
    setLoadingId(session.sessionId);
    try {
      const graph = await getSession(session.sessionId);
      onLoadSession({
        sessionId: graph.sessionId,
        issues:    graph.nodes ?? [],
        edges:     graph.edges ?? [],
        status:    "COMPLETE",
        summary:   `${graph.nodes?.length ?? 0} issue(s) from ${new Date(session.createdAt).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}`,
        stageReached: "STAGE_5",
      });
    } catch (e) {
      setError("Could not load session: " + e.message);
    } finally {
      setLoadingId(null);
    }
  };

  return (
    <div className="garden-wrap">
      <div className="garden-header">
        <div>
          <div className="garden-title">Memory Garden</div>
          <div className="garden-sub">Each topic you voice grows a card here in real time.</div>
        </div>
        <button className="garden-back" onClick={onClose}>← Back to workspace</button>
      </div>

      {loading && (
        <div className="garden-loading">
          <div className="t-dot" /><div className="t-dot" /><div className="t-dot" />
          <span style={{ marginLeft: "0.5rem", color: "var(--text-muted)", fontSize: "0.7rem", fontFamily: "var(--mono)" }}>Loading sessions…</span>
        </div>
      )}

      {error && <div className="garden-error">{error}</div>}

      {!loading && sessions.length === 0 && !error && (
        <div className="garden-empty">
          <div className="garden-empty-icon">◈</div>
          <div className="garden-empty-title">Nothing planted yet</div>
          <div className="garden-empty-desc">Tap the mic and start talking — each topic you cover grows a new card here in real time.</div>
        </div>
      )}

      <div className="garden-grid">
        {sessions.map(s => {
          const isLive     = !!s._liveResult;
          const date       = s.createdAt ? new Date(s.createdAt) : null;
          const preview    = (s.rawText ?? "").slice(0, 160);
          const isComplete = s.status === "COMPLETE";
          return (
            <div key={s.sessionId} className={`garden-card${isComplete ? "" : " garden-card-failed"}${isLive ? " garden-card-live" : ""}`}>
              <div className="garden-card-top">
                <span className="garden-card-date">
                  {date ? date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "—"}
                </span>
                <div style={{ display: "flex", gap: "0.35rem", alignItems: "center" }}>
                  {isLive && <span className="garden-card-status live-badge">LIVE</span>}
                  <span className={`garden-card-status ${isComplete ? "complete" : "failed"}`}>
                    {s.status ?? "UNKNOWN"}
                  </span>
                </div>
              </div>
              <div className="garden-card-preview">{preview}{preview.length >= 160 ? "…" : ""}</div>
              <div className="garden-card-footer">
                <div className="garden-card-stats">
                  <span className="garden-stat">{s.issueCount ?? 0} <span className="garden-stat-lbl">issues</span></span>
                </div>
                {isComplete && (
                  <button
                    className="garden-load"
                    onClick={() => handleLoad(s)}
                    disabled={loadingId === s.sessionId}
                  >
                    {loadingId === s.sessionId ? "Loading…" : "View →"}
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

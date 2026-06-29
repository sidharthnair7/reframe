import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { priorityHue, effectiveScore } from "./Workspace";
import { useVoice } from "../hooks/useVoice";
import { resolveVoiceCommand } from "../utils/voiceGraphCommands";
import BorderGlow from "./BorderGlow";
import "../styles/workspace.css";
import "../styles/graph-explorer.css";

const VOICE_SILENCE_MS = 1400;
const TOAST_DURATION_MS = 4000;

const EDGE_HUE = { BLOCKS: 5, CAUSES: 28, RELATED: 175 };
const EDGE_VERB = { BLOCKS: "blocks", CAUSES: "causes", RELATED: "related" };
const DIM_SAT = 12, DIM_FILL_L = 14, DIM_STROKE_L = 32;

function computeLayout(issues, edges) {
  const W = 760, H = 480;
  if (issues.length === 0) return { positions: {}, width: W, height: H };

  const directional = edges.filter(e => e.type === "BLOCKS" || e.type === "CAUSES");
  const incoming = {};
  const outgoing = {};
  issues.forEach(n => { incoming[n.id] = 0; outgoing[n.id] = []; });
  directional.forEach(e => {
    if (!(e.toNodeId in incoming) || !(e.fromNodeId in outgoing)) return;
    incoming[e.toNodeId] += 1;
    outgoing[e.fromNodeId].push(e.toNodeId);
  });

  const tier = {};
  const queue = issues.filter(n => incoming[n.id] === 0).map(n => n.id);
  queue.forEach(id => { tier[id] = 0; });

  let qi = 0;
  while (qi < queue.length && qi < 500) {
    const id = queue[qi++];
    outgoing[id].forEach(nextId => {
      const candidate = tier[id] + 1;
      if (tier[nextId] === undefined || candidate > tier[nextId]) {
        tier[nextId] = candidate;
        queue.push(nextId);
      }
    });
  }
  issues.forEach(n => { if (tier[n.id] === undefined) tier[n.id] = 0; });

  const byTier = {};
  issues.forEach(n => { (byTier[tier[n.id]] ??= []).push(n); });
  const tierKeys = Object.keys(byTier).map(Number).sort((a, b) => a - b);

  const positions = {};
  const tierGap = H / (tierKeys.length + 1);
  tierKeys.forEach((t, ti) => {
    const row = byTier[t];
    const colGap = W / (row.length + 1);
    row.forEach((n, ni) => {
      positions[n.id] = { x: colGap * (ni + 1), y: tierGap * (ti + 1) };
    });
  });

  return { positions, width: W, height: H };
}

function CollapsibleSection({ title, subtitle, defaultExpanded = false, children }) {
  const [expanded, setExpanded] = useState(defaultExpanded);
  return (
    <div className="issue-modal-section">
      <button className="issue-modal-sec-head ge-collapsible-head" onClick={() => setExpanded(e => !e)}>
        <span>{title}</span>
        <span className={`ge-collapsible-chevron${expanded ? " open" : ""}`}>▾</span>
      </button>
      {expanded && (
        <>
          {subtitle && <div className="issue-modal-sub">{subtitle}</div>}
          {children}
        </>
      )}
    </div>
  );
}

function NodeDetailPanel({ node, badgeFor, blocksCountByNode, effectiveConfidence, getAssumptionStatus, setAssumption }) {
  if (!node) {
    return (
      <div className="ge-panel-empty">
        Click any node in the graph to see its details here.
      </div>
    );
  }

  const plan = node.actionPlan && node.actionPlan.framework !== "Unavailable" ? node.actionPlan : null;
  const firstStep = plan?.steps?.[0];
  const badge = badgeFor(node);

  return (
    <BorderGlow
      className="ge-panel-glow-wrap"
      glowColor={`${priorityHue(node)} 85 60`}
      colors={[
        `hsl(${priorityHue(node)}, 85%, 60%)`,
        `hsl(${priorityHue(node)}, 55%, 30%)`,
        "#818cf8",
      ]}
      backgroundColor="rgba(12,12,16,0.98)"
      borderRadius={16}
      glowRadius={24}
      glowIntensity={1.1}
      coneSpread={25}
      edgeSensitivity={32}
      animated
    >
      <div className="ge-panel">
        <div className="issue-modal-cat-row">
          <div className="issue-modal-cat">{node.category}</div>
          {badge && (
            <span className={`issue-badge issue-badge-${badge.toLowerCase().replace(/\s+/g, "-")}`}>
              {badge}
            </span>
          )}
        </div>
        <div className="issue-modal-text">{node.text}</div>
        <div className="issue-modal-chips">
          <span className="issue-chip">{node.actionability}</span>
          <span className="issue-chip">Urgency {node.urgency}/10</span>
          <span className="issue-chip">Weight {node.cognitiveWeight}/10</span>
          {node.priorityScore > 0 && (
            <span className="issue-chip">
              Score {node.priorityScore?.toFixed(1)}
              {node.confidenceInterval != null && ` ± ${(effectiveConfidence(node) * 100).toFixed(0)}%`}
            </span>
          )}
        </div>

        {firstStep && (
          <div className="issue-next-step">
            <span className="issue-next-step-lbl">Next step</span>
            <span>{firstStep}</span>
            {plan.timeEstimate && <span className="issue-next-step-time">⏱ {plan.timeEstimate}</span>}
          </div>
        )}

        {node.priorityScore > 0 && (
          <div className="issue-modal-section">
            <div className="issue-modal-sec-head">Why This Score</div>
            <div className="issue-score-factor"><span>Urgency</span><span>{node.urgency}/10</span></div>
            <div className="issue-score-factor"><span>Cognitive weight</span><span>{node.cognitiveWeight}/10</span></div>
            <div className="issue-score-factor">
              <span>Feasibility</span>
              <span>
                {node.actionability === "ACTIONABLE" ? "Actionable (×0.8)"
                  : node.actionability === "ANXIETY" ? "Anxiety (×0.3)"
                  : "Unclear (×0.5)"}
              </span>
            </div>
            <div className="issue-score-factor">
              <span>Graph impact</span>
              <span>
                {(blocksCountByNode[node.id] ?? 0) >= 2
                  ? `Blocks ${blocksCountByNode[node.id]} issues (×1.5 boost)`
                  : (blocksCountByNode[node.id] ?? 0) === 1
                  ? "Blocks 1 issue"
                  : "No downstream blocks"}
              </span>
            </div>
          </div>
        )}

        {node.hiddenAssumptions?.length > 0 && (
          <CollapsibleSection
            title="Hidden Assumptions"
            subtitle="Confirm or reject — rejected assumptions are excluded from confidence"
          >
            {node.hiddenAssumptions.map((a, i) => {
              const status = getAssumptionStatus(node.id, i);
              return (
                <div key={i} className={`issue-assumption-row${status === "rejected" ? " rejected" : ""}`}>
                  <div className="issue-assumption">"{a}"</div>
                  <div className="issue-assumption-actions">
                    <button
                      className={`assumption-btn accurate${status === "accurate" ? " active" : ""}`}
                      onClick={() => setAssumption(node.id, i, "accurate")}
                    >✓ Accurate</button>
                    <button
                      className={`assumption-btn reject${status === "rejected" ? " active" : ""}`}
                      onClick={() => setAssumption(node.id, i, "rejected")}
                    >✕ Not accurate</button>
                  </div>
                </div>
              );
            })}
          </CollapsibleSection>
        )}

        {node.actionPlan && node.actionPlan.framework !== "Unavailable" && node.actionPlan.steps?.length > 0 && (
          <CollapsibleSection title="Full Action Plan">
            {node.actionPlan.steps.map((s, i) => (
              <div key={i} className="issue-step"><span className="issue-step-num">{i + 1}</span>{s}</div>
            ))}
            {node.actionPlan.urgencyNote && (
              <div className="issue-timeframe">{node.actionPlan.urgencyNote}</div>
            )}
          </CollapsibleSection>
        )}
      </div>
    </BorderGlow>
  );
}

export default function GraphExplorer({
  issues, edges, focusedNodeId, nodeById, badgeFor, blocksCountByNode,
  effectiveConfidence, getAssumptionStatus, setAssumption, onFocusNode, onClose,
}) {
  useEffect(() => {
    const onKey = e => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const { positions, width, height } = useMemo(() => computeLayout(issues, edges), [issues, edges]);
  const focusedNode = focusedNodeId ? nodeById[focusedNodeId] : null;
  const isSparse = issues.length < 2 || edges.length === 0;

  // Voice-driven graph control — push-to-talk, resolved fully client-side (no Claude/ElevenLabs call)
  const [toast, setToast] = useState(null);
  const [pulseNodeId, setPulseNodeId] = useState(null);
  const transcriptRef = useRef("");
  const silenceTimerRef = useRef(null);
  const toastTimerRef = useRef(null);
  const stopRef = useRef(() => {});

  const showToast = useCallback((message) => {
    setToast(message);
    clearTimeout(toastTimerRef.current);
    toastTimerRef.current = setTimeout(() => setToast(null), TOAST_DURATION_MS);
  }, []);

  const resolveAndStop = useCallback(() => {
    const said = transcriptRef.current.trim();
    transcriptRef.current = "";
    stopRef.current();
    if (!said) return;

    const result = resolveVoiceCommand(said, issues, edges, effectiveScore);
    if (result.type === "focus") {
      onFocusNode(result.node.id);
      setPulseNodeId(result.node.id);
      setTimeout(() => setPulseNodeId(null), 700);
      const label = result.node.category || result.node.text?.slice(0, 30) || "issue";
      showToast(result.multipleBlockers
        ? `Focused: ${label} (1 of ${result.multipleBlockers} blockers)`
        : `Focused: ${label}`);
    } else if (result.type === "no-blockers") {
      const label = result.node.category || result.node.text?.slice(0, 30) || "that issue";
      showToast(`Nothing is currently blocking "${label}"`);
    } else if (result.type === "ambiguous") {
      const labels = result.candidates.slice(0, 3).map(n => n.category || n.text?.slice(0, 20)).join(", ");
      showToast(`Found a few matches (${labels}) — try being more specific`);
    } else {
      showToast("Didn't catch a clear match — try naming the issue directly");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [issues, edges, onFocusNode, showToast]);

  const { listening: voiceListening, supported: voiceSupported, toggle: toggleVoiceRaw, stop } = useVoice({
    onTranscript: ({ final }) => {
      if (final) transcriptRef.current += final + " ";
      clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = setTimeout(resolveAndStop, VOICE_SILENCE_MS);
    },
  });

  useEffect(() => () => { clearTimeout(silenceTimerRef.current); clearTimeout(toastTimerRef.current); }, []);

  return (
    <div className="ge-overlay">
      <button className="ge-close" onClick={onClose}>✕ Close graph view</button>

      <div className="ge-layout">
        <div className="ge-graph-pane">
          {isSparse ? (
            <div className="ge-sparse">
              {issues.length < 2
                ? "Only one issue here — nothing to connect yet."
                : "No dependencies between your issues yet."}
            </div>
          ) : (
            <svg className="ge-svg" viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="xMidYMid meet">
              <defs>
                <marker id="ge-arrow-blocks" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
                  <path d="M0,0 L10,5 L0,10 z" fill={`hsl(${EDGE_HUE.BLOCKS},80%,55%)`} />
                </marker>
                <marker id="ge-arrow-causes" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
                  <path d="M0,0 L10,5 L0,10 z" fill={`hsl(${EDGE_HUE.CAUSES},80%,55%)`} />
                </marker>
                <marker id="ge-arrow-dim" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
                  <path d="M0,0 L10,5 L0,10 z" fill={`hsl(0,0%,${DIM_STROKE_L}%)`} />
                </marker>
              </defs>

              {edges.map((e, i) => {
                const p1 = positions[e.fromNodeId], p2 = positions[e.toNodeId];
                if (!p1 || !p2) return null;
                const isActive = !!focusedNodeId && (e.fromNodeId === focusedNodeId || e.toNodeId === focusedNodeId);
                const hue = EDGE_HUE[e.type] ?? EDGE_HUE.RELATED;
                const stroke = isActive ? `hsl(${hue},70%,50%)` : `hsl(${hue},${DIM_SAT}%,${DIM_STROKE_L}%)`;
                const marker = e.type === "RELATED" ? undefined
                  : isActive ? (e.type === "BLOCKS" ? "url(#ge-arrow-blocks)" : "url(#ge-arrow-causes)")
                  : "url(#ge-arrow-dim)";
                const mx = (p1.x + p2.x) / 2, my = (p1.y + p2.y) / 2;
                return (
                  <g key={e.id ?? i}>
                    <line x1={p1.x} y1={p1.y} x2={p2.x} y2={p2.y}
                      stroke={stroke} strokeWidth={isActive ? 2.5 : 1.5}
                      strokeOpacity={isActive ? 1 : 0.4}
                      strokeDasharray={e.type === "RELATED" ? "4 4" : undefined}
                      markerEnd={marker}
                      className="ge-edge"
                      style={{ animationDelay: `${i * 40}ms` }} />
                    {isActive && (
                      <text x={mx} y={my} textAnchor="middle" className="ge-edge-label">
                        {EDGE_VERB[e.type] ?? "related"}
                      </text>
                    )}
                  </g>
                );
              })}

              {issues.map((n, i) => {
                const p = positions[n.id];
                if (!p) return null;
                const isFocused = n.id === focusedNodeId;
                const r = isFocused ? 32 : 22;
                const hue = priorityHue(n);
                const fill = isFocused ? `hsl(${hue},65%,18%)` : `hsl(${hue},${DIM_SAT}%,${DIM_FILL_L}%)`;
                const stroke = isFocused ? `hsl(${hue},85%,55%)` : `hsl(${hue},${DIM_SAT + 8}%,${DIM_STROKE_L}%)`;
                return (
                  <g key={n.id}
                     className={`ge-node${isFocused ? " focused" : ""}`}
                     style={{ animationDelay: `${i * 50}ms` }}
                     onClick={() => onFocusNode(n.id)}>
                    <circle cx={p.x} cy={p.y} r={r} fill={fill} stroke={stroke} strokeWidth={isFocused ? 2.5 : 1.5} />
                    <text x={p.x} y={p.y - r - 8} textAnchor="middle"
                          className={`ge-node-label${isFocused ? " focused" : ""}`}>
                      {(n.category ?? "Issue").slice(0, 14)}
                    </text>
                  </g>
                );
              })}
            </svg>
          )}
        </div>

        <div className="ge-detail-pane">
          <NodeDetailPanel
            key={focusedNode?.id}
            node={focusedNode}
            badgeFor={badgeFor}
            blocksCountByNode={blocksCountByNode}
            effectiveConfidence={effectiveConfidence}
            getAssumptionStatus={getAssumptionStatus}
            setAssumption={setAssumption}
          />
        </div>
      </div>
    </div>
  );
}

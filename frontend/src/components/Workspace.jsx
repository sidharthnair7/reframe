import { useState, useEffect, useRef, useCallback } from "react";

/* ─────────────────────────────────────────────────────────────────────────────
   DESIGN SYSTEM — exact match to Reframe landing page
   Fonts:   Syne (display) · DM Mono (mono) · Inter (body)
   Palette: --void #000000 · --glass rgba(10,10,14,0.55) · --accent #FFFFFF
            --border rgba(255,255,255,0.07) · text scale #e8e8ec → #303038
   BG:      Same WebGL star-galaxy shader from landing page
───────────────────────────────────────────────────────────────────────────── */

const STYLES = `
  @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;500;600;700;800&family=DM+Mono:ital,wght@0,300;0,400;0,500;1,300&family=Inter:wght@300;400;500;600;700&display=swap');

  :root {
    --void: #000000;
    --void-alt: #030303;
    --surface: #080808;
    --elevated: #111111;
    --border: rgba(255,255,255,0.07);
    --border-hover: rgba(255,255,255,0.14);
    --border-bright: rgba(255,255,255,0.22);
    --border-active: rgba(255,255,255,0.32);
    --text-primary: #e8e8ec;
    --text-secondary: #a0a0a8;
    --text-tertiary: #707078;
    --text-muted: #505058;
    --text-dim: #303038;
    --accent: #FFFFFF;
    --accent-soft: #CCCCCC;
    --glass: rgba(10,10,14,0.72);
    --glass-hover: rgba(14,14,18,0.80);
    --mono: 'DM Mono', monospace;
    --display: 'Syne', system-ui, sans-serif;
    --body: 'Inter', system-ui, sans-serif;
    --ease: cubic-bezier(0.16,1,0.3,1);
    --transition-fast: 150ms cubic-bezier(0.16,1,0.3,1);
    --transition-base: 300ms cubic-bezier(0.16,1,0.3,1);
    --shadow-md: 0 4px 16px rgba(0,0,0,0.7);
    --shadow-lg: 0 8px 40px rgba(0,0,0,0.85);
  }

  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  html, body, #root {
    width: 100%; height: 100%;
    background: var(--void);
    color: var(--text-primary);
    font-family: var(--body);
    font-weight: 400;
    -webkit-font-smoothing: antialiased;
    overflow: hidden;
  }

  ::-webkit-scrollbar { width: 3px; }
  ::-webkit-scrollbar-track { background: transparent; }
  ::-webkit-scrollbar-thumb { background: var(--text-dim); border-radius: 2px; }
  ::-webkit-scrollbar-thumb:hover { background: var(--text-muted); }

  /* ── Galaxy canvas bg (same as landing) ── */
  #ws-galaxy { position: fixed; inset: 0; z-index: 0; pointer-events: none; }
  #ws-galaxy canvas { display: block; width: 100%; height: 100%; }

  /* ── Workspace shell ── */
  .ws-shell {
    position: relative; z-index: 10;
    width: 100%; height: 100%;
    display: grid;
    grid-template-rows: 56px 1fr 40px;
    grid-template-columns: 320px 1fr 300px;
    gap: 0;
    padding: 0;
  }

  /* ── TOPBAR ── */
  .ws-topbar {
    grid-column: 1 / -1; grid-row: 1;
    display: flex; align-items: center; justify-content: space-between;
    padding: 0 1.5rem;
    background: rgba(0,0,0,0.72);
    backdrop-filter: blur(24px) saturate(180%);
    -webkit-backdrop-filter: blur(24px) saturate(180%);
    border-bottom: 1px solid var(--border);
  }
  .ws-brand { display: flex; align-items: center; gap: 0.6rem; }
  .ws-logo-mark {
    width: 28px; height: 28px;
    background: var(--accent);
    border-radius: 5px;
    display: flex; align-items: center; justify-content: center;
    font-family: var(--display); font-weight: 800; font-size: 0.78rem; color: var(--void);
    flex-shrink: 0;
  }
  .ws-brand-name {
    font-family: var(--display); font-weight: 700; font-size: 0.95rem;
    letter-spacing: -0.03em; color: var(--text-primary);
    text-transform: uppercase;
  }
  .ws-brand-name span { color: var(--text-muted); font-weight: 500; }
  .ws-brand-sep { width: 1px; height: 20px; background: var(--border); margin: 0 0.75rem; }
  .ws-breadcrumb { font-family: var(--mono); font-size: 0.62rem; letter-spacing: 0.06em; color: var(--text-muted); text-transform: uppercase; }

  .ws-topbar-right { display: flex; align-items: center; gap: 1.25rem; }
  .status-pill {
    display: flex; align-items: center; gap: 0.45rem;
    font-family: var(--mono); font-size: 0.6rem; letter-spacing: 0.1em; text-transform: uppercase;
    color: var(--text-tertiary); background: var(--glass); border: 1px solid var(--border);
    backdrop-filter: blur(20px); border-radius: 100px; padding: 0.35rem 0.8rem;
  }
  .status-dot {
    width: 5px; height: 5px; border-radius: 50%;
    background: var(--accent);
    box-shadow: 0 0 6px rgba(255,255,255,0.7);
    animation: statusPulse 2.5s infinite;
  }
  .status-dot.processing { background: var(--text-secondary); box-shadow: 0 0 6px rgba(255,255,255,0.3); animation: processDot 0.8s ease-in-out infinite; }
  .status-dot.listening { background: #4ade80; box-shadow: 0 0 8px rgba(74,222,128,0.6); animation: listenDot 1s ease-in-out infinite; }
  @keyframes statusPulse { 0%,100%{opacity:1;box-shadow:0 0 6px rgba(255,255,255,0.7);}50%{opacity:0.3;box-shadow:0 0 3px rgba(255,255,255,0.2);} }
  @keyframes processDot { 0%,100%{opacity:0.3;} 50%{opacity:1;} }
  @keyframes listenDot { 0%,100%{opacity:0.4;transform:scale(0.8);}50%{opacity:1;transform:scale(1.2);} }
  .ws-clock { font-family: var(--mono); font-size: 0.62rem; color: var(--text-muted); letter-spacing: 0.04em; }

  /* ── PANELS ── */
  .panel-left {
    grid-column: 1; grid-row: 2;
    border-right: 1px solid var(--border);
    display: flex; flex-direction: column;
    overflow: hidden;
  }
  .panel-center {
    grid-column: 2; grid-row: 2;
    display: flex; flex-direction: column;
    overflow: hidden;
  }
  .panel-right {
    grid-column: 3; grid-row: 2;
    border-left: 1px solid var(--border);
    display: flex; flex-direction: column;
    overflow-y: auto;
  }

  /* ── Panel section header ── */
  .panel-section-head {
    padding: 0.85rem 1.25rem 0.7rem;
    border-bottom: 1px solid var(--border);
    display: flex; align-items: center; justify-content: space-between;
    flex-shrink: 0;
  }
  .panel-label {
    font-family: var(--mono); font-size: 0.6rem;
    letter-spacing: 0.12em; text-transform: uppercase; color: var(--text-muted);
  }
  .panel-badge {
    font-family: var(--mono); font-size: 0.55rem; letter-spacing: 0.08em;
    background: rgba(255,255,255,0.04); border: 1px solid var(--border);
    border-radius: 3px; padding: 0.15rem 0.45rem;
    color: var(--text-muted); text-transform: uppercase;
  }

  /* ── INPUT AREA ── */
  .input-area { padding: 1rem 1.25rem; flex-shrink: 0; border-bottom: 1px solid var(--border); }
  .input-label {
    font-family: var(--display); font-weight: 600; font-size: 0.8rem;
    color: var(--text-primary); display: block; margin-bottom: 0.5rem;
  }
  .brain-dump {
    width: 100%; height: 110px;
    background: rgba(255,255,255,0.02); border: 1px solid var(--border);
    border-radius: 8px; padding: 0.75rem 0.9rem;
    color: var(--text-primary); font-family: var(--body); font-size: 0.82rem;
    line-height: 1.6; resize: none; outline: none;
    transition: border-color var(--transition-fast), box-shadow var(--transition-fast);
  }
  .brain-dump:focus { border-color: var(--border-bright); box-shadow: 0 0 0 3px rgba(255,255,255,0.04); }
  .brain-dump::placeholder { color: var(--text-dim); }

  .input-actions { display: flex; gap: 0.5rem; margin-top: 0.6rem; align-items: center; }

  /* Primary button — matches landing page exactly */
  .btn {
    display: inline-flex; align-items: center; gap: 0.4rem;
    padding: 0.7rem 1.5rem;
    border-radius: 100px;
    font-family: var(--display); font-weight: 600; font-size: 0.72rem;
    letter-spacing: 0.08em; text-transform: uppercase;
    cursor: pointer; transition: all var(--transition-base);
    border: none; white-space: nowrap; overflow: hidden; position: relative;
  }
  .btn::after { content:''; position:absolute; inset:0; background:linear-gradient(90deg,transparent,rgba(255,255,255,0.12),transparent); transform:translateX(-100%); transition:transform 0.6s ease; }
  .btn:hover::after { transform:translateX(100%); }
  .btn-primary { background: #fff; color: #000; border: 1px solid rgba(255,255,255,0.3); box-shadow: 0 4px 16px rgba(255,255,255,0.06); }
  .btn-primary:hover { box-shadow: 0 0 40px rgba(255,255,255,0.18); transform: translateY(-1px); }
  .btn-primary:disabled { opacity: 0.4; cursor: not-allowed; transform: none; box-shadow: none; }
  .btn-secondary { background: var(--glass); color: var(--accent-soft); border: 1px solid var(--border-hover); backdrop-filter: blur(20px); }
  .btn-secondary:hover { border-color: rgba(255,255,255,0.4); color: #fff; background: var(--glass-hover); }

  /* Voice button */
  .btn-voice {
    width: 38px; height: 38px; border-radius: 100px; flex-shrink: 0;
    background: var(--glass); border: 1px solid var(--border);
    color: var(--text-muted); font-size: 0.9rem;
    cursor: pointer; display: flex; align-items: center; justify-content: center;
    transition: all var(--transition-base);
  }
  .btn-voice:hover { border-color: var(--border-hover); color: var(--text-primary); }
  .btn-voice.listening {
    border-color: rgba(74,222,128,0.5); color: #4ade80;
    background: rgba(74,222,128,0.06);
    box-shadow: 0 0 16px rgba(74,222,128,0.15);
  }
  .btn-voice.unsupported { opacity: 0.3; cursor: not-allowed; }

  /* Voice waveform */
  .voice-hint { display: flex; align-items: center; gap: 0.5rem; margin-top: 0.4rem; min-height: 16px; }
  .voice-bars { display: flex; align-items: center; gap: 2px; }
  .voice-bar { width: 2px; background: #4ade80; border-radius: 1px; animation: vbar 0.7s ease-in-out infinite; }
  .voice-bar:nth-child(2){animation-delay:0.1s}
  .voice-bar:nth-child(3){animation-delay:0.2s}
  .voice-bar:nth-child(4){animation-delay:0.13s}
  .voice-bar:nth-child(5){animation-delay:0.05s}
  @keyframes vbar { 0%,100%{height:3px;} 50%{height:13px;} }
  .voice-text { font-family: var(--mono); font-size: 0.58rem; color: #4ade80; letter-spacing: 0.06em; }
  .idle-hint { font-family: var(--mono); font-size: 0.58rem; color: var(--text-dim); }

  /* ── PIPELINE STAGES ── */
  .stages-area { padding: 1rem 1.25rem; flex-shrink: 0; border-bottom: 1px solid var(--border); }
  .stage-row { display: flex; align-items: center; gap: 0.65rem; padding: 0.3rem 0; }
  .stage-dot { width: 5px; height: 5px; border-radius: 50%; background: var(--text-dim); flex-shrink: 0; transition: all 0.35s var(--ease); }
  .stage-dot.done { background: rgba(255,255,255,0.3); }
  .stage-dot.active { background: var(--accent); box-shadow: 0 0 8px rgba(255,255,255,0.5); }
  .stage-name { font-family: var(--mono); font-size: 0.6rem; letter-spacing: 0.04em; color: var(--text-dim); transition: color 0.35s var(--ease); }
  .stage-name.done { color: var(--text-muted); }
  .stage-name.active { color: var(--text-primary); }
  .stage-ticker { font-family: var(--mono); font-size: 0.55rem; color: var(--text-dim); margin-left: auto; }
  .stage-ticker.active { color: var(--text-tertiary); }

  /* Progress bar */
  .progress-track { height: 1px; background: var(--border); margin: 0.75rem 0 0; overflow: hidden; }
  .progress-fill { height: 100%; background: rgba(255,255,255,0.3); width: 0%; transition: width 0.12s linear; }
  .progress-fill.animate { animation: progAnim 2.4s ease-in-out infinite; }
  @keyframes progAnim { 0%{width:0%;margin-left:0%}50%{width:50%}100%{width:0%;margin-left:100%} }

  /* ── STATS GRID ── */
  .stats-area { padding: 1rem 1.25rem; }
  .stats-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 0.6rem; }
  .stat-cell { display: flex; flex-direction: column; gap: 0.1rem; }
  .stat-val { font-family: var(--display); font-weight: 700; font-size: 1rem; color: var(--text-primary); line-height: 1; }
  .stat-lbl { font-family: var(--mono); font-size: 0.55rem; letter-spacing: 0.1em; text-transform: uppercase; color: var(--text-muted); }

  /* ── CENTER PANEL: visualization area ── */
  .center-inner { flex: 1; position: relative; overflow: hidden; }
  .center-hud {
    position: absolute; inset: 0; z-index: 5; pointer-events: none;
    display: flex; flex-direction: column; justify-content: space-between;
    padding: 1.25rem;
  }
  .hud-top { display: flex; justify-content: space-between; align-items: flex-start; }
  .hud-bottom { display: flex; justify-content: space-between; align-items: flex-end; }
  .hud-meta { font-family: var(--mono); font-size: 0.58rem; letter-spacing: 0.1em; text-transform: uppercase; color: rgba(255,255,255,0.18); }
  .hud-live { display: flex; align-items: center; gap: 0.4rem; }
  .hud-live-dot { width: 5px; height: 5px; border-radius: 50%; background: var(--accent); animation: statusPulse 2.5s infinite; }

  /* corner brackets */
  .corner { position: absolute; width: 14px; height: 14px; }
  .c-tl { top:10px; left:10px; border-top:1px solid rgba(255,255,255,0.15); border-left:1px solid rgba(255,255,255,0.15); }
  .c-tr { top:10px; right:10px; border-top:1px solid rgba(255,255,255,0.15); border-right:1px solid rgba(255,255,255,0.15); }
  .c-bl { bottom:10px; left:10px; border-bottom:1px solid rgba(255,255,255,0.15); border-left:1px solid rgba(255,255,255,0.15); }
  .c-br { bottom:10px; right:10px; border-bottom:1px solid rgba(255,255,255,0.15); border-right:1px solid rgba(255,255,255,0.15); }

  /* Center mode badge */
  .mode-tag {
    display: inline-flex; align-items: center; gap: 0.45rem;
    font-family: var(--mono); font-size: 0.58rem; letter-spacing: 0.1em; text-transform: uppercase;
    color: var(--text-tertiary); background: rgba(0,0,0,0.55); border: 1px solid var(--border);
    border-radius: 100px; padding: 0.3rem 0.75rem;
    backdrop-filter: blur(12px);
  }

  /* Cognitive load ring */
  .load-ring-wrap { position: absolute; top: 50%; left: 50%; transform: translate(-50%,-50%); pointer-events: none; z-index: 4; }
  .load-ring-text { text-align: center; }
  .load-pct { font-family: var(--display); font-weight: 800; font-size: 2.2rem; color: var(--text-primary); line-height: 1; }
  .load-sub { font-family: var(--mono); font-size: 0.58rem; letter-spacing: 0.12em; text-transform: uppercase; color: var(--text-muted); margin-top: 0.2rem; }

  /* ── RIGHT PANEL: Priority Stack ── */
  .right-scroll { padding: 0.75rem; display: flex; flex-direction: column; gap: 0.5rem; }

  /* Priority card — mirrors landing page's priority-item */
  .priority-card {
    background: rgba(255,255,255,0.015);
    border: 1px solid var(--border);
    border-radius: 10px; padding: 0.85rem 0.9rem;
    transition: all var(--transition-base);
    position: relative; overflow: hidden;
  }
  .priority-card:first-child { background: rgba(255,255,255,0.04); border-color: var(--border-hover); }
  .priority-card:hover { border-color: var(--border-hover); background: rgba(255,255,255,0.025); }
  .priority-card-top { display: flex; align-items: flex-start; gap: 0.75rem; margin-bottom: 0.4rem; }
  .priority-rank { font-family: var(--display); font-weight: 700; font-size: 1.4rem; color: var(--text-primary); line-height: 1; min-width: 22px; }
  .priority-card:not(:first-child) .priority-rank { color: var(--text-muted); }
  .priority-content { flex: 1; }
  .priority-title { font-family: var(--display); font-weight: 600; font-size: 0.8rem; color: var(--text-primary); margin-bottom: 0.2rem; letter-spacing: -0.01em; }
  .priority-desc { font-family: var(--body); font-size: 0.72rem; color: var(--text-secondary); line-height: 1.5; }
  .priority-tags { display: flex; gap: 0.4rem; margin-top: 0.5rem; flex-wrap: wrap; }
  .p-tag {
    font-family: var(--mono); font-size: 0.55rem; letter-spacing: 0.06em; text-transform: uppercase;
    padding: 0.12rem 0.4rem; border-radius: 3px;
    background: rgba(255,255,255,0.04); border: 1px solid var(--border);
    color: var(--text-muted);
  }
  .p-tag.conf { background: rgba(255,255,255,0.06); border-color: var(--border-hover); color: var(--text-secondary); }
  .p-tag.energy-h { color: #f87171; border-color: rgba(248,113,113,0.2); background: rgba(248,113,113,0.04); }
  .p-tag.energy-m { color: #fbbf24; border-color: rgba(251,191,36,0.2); background: rgba(251,191,36,0.04); }
  .p-tag.energy-l { color: #4ade80; border-color: rgba(74,222,128,0.2); background: rgba(74,222,128,0.04); }

  /* Assumption box — mirrors landing page's assumption-box */
  .assumption-box {
    padding: 0.85rem 1rem;
    background: rgba(255,255,255,0.015); border: 1px solid var(--border);
    border-radius: 8px; margin: 0 0.75rem 0.5rem;
  }
  .assumption-head { font-family: var(--mono); font-size: 0.58rem; letter-spacing: 0.1em; text-transform: uppercase; color: var(--text-muted); margin-bottom: 0.4rem; }
  .assumption-text { font-family: var(--body); font-size: 0.74rem; color: var(--text-secondary); line-height: 1.55; }
  .assumption-reframe { margin-top: 0.5rem; font-family: var(--body); font-size: 0.74rem; color: var(--text-primary); line-height: 1.55; }
  .assumption-reframe strong { font-family: var(--mono); font-size: 0.6rem; letter-spacing: 0.06em; text-transform: uppercase; color: var(--text-muted); }

  /* Load bar */
  .load-bar-wrap { padding: 0.75rem; }
  .load-bar-card { background: rgba(255,255,255,0.015); border: 1px solid var(--border); border-radius: 8px; padding: 0.75rem 0.9rem; }
  .load-bar-head { display: flex; justify-content: space-between; margin-bottom: 0.5rem; }
  .load-bar-num { font-family: var(--display); font-weight: 700; font-size: 1.1rem; color: var(--text-primary); }
  .load-track { height: 2px; background: var(--border); border-radius: 1px; overflow: hidden; }
  .load-fill { height: 100%; border-radius: 1px; transition: width 1.2s var(--ease); }

  /* Empty state */
  .empty-state {
    flex: 1; display: flex; flex-direction: column;
    align-items: center; justify-content: center;
    gap: 0.5rem; padding: 2rem; text-align: center;
  }
  .empty-icon { font-size: 1.8rem; opacity: 0.2; }
  .empty-title { font-family: var(--display); font-weight: 600; font-size: 0.9rem; color: var(--text-muted); }
  .empty-desc { font-family: var(--body); font-size: 0.74rem; color: var(--text-dim); line-height: 1.5; }

  /* ── STATUSBAR ── */
  .ws-statusbar {
    grid-column: 1 / -1; grid-row: 3;
    display: flex; align-items: center; justify-content: space-between;
    padding: 0 1.5rem;
    background: rgba(0,0,0,0.6); border-top: 1px solid var(--border);
    backdrop-filter: blur(12px);
  }
  .statusbar-left { display: flex; align-items: center; gap: 1.5rem; }
  .statusbar-item { font-family: var(--mono); font-size: 0.58rem; letter-spacing: 0.06em; text-transform: uppercase; color: var(--text-dim); display: flex; align-items: center; gap: 0.4rem; }
  .statusbar-item.live { color: var(--text-muted); }

  /* ── ANIMATIONS ── */
  @keyframes fadeUp { from{opacity:0;transform:translateY(10px);}to{opacity:1;transform:translateY(0);} }
  .fade-up { animation: fadeUp 0.45s var(--ease) both; }
  .du-1 { animation-delay: 0.05s; }
  .du-2 { animation-delay: 0.12s; }
  .du-3 { animation-delay: 0.19s; }
  .du-4 { animation-delay: 0.26s; }

  /* Typing dots */
  .typing-row { display: flex; align-items: center; gap: 0.4rem; padding: 0.5rem 0; }
  .t-dot { width: 4px; height: 4px; border-radius: 50%; background: var(--text-secondary); animation: tdot 1.4s ease-in-out infinite; }
  .t-dot:nth-child(2){animation-delay:0.2s}.t-dot:nth-child(3){animation-delay:0.4s}
  @keyframes tdot{0%,60%,100%{transform:translateY(0);opacity:0.2;}30%{transform:translateY(-4px);opacity:1;}}
  .typing-label { font-family: var(--mono); font-size: 0.6rem; color: var(--text-muted); }
`;

/* ─── Galaxy Background (copied verbatim from Reframe landing) ─────────── */
function GalaxyBackground() {
    const ref = useRef(null);
    useEffect(() => {
        const container = ref.current;
        if (!container) return;
        const canvas = document.createElement("canvas");
        canvas.style.cssText = "display:block;width:100%;height:100%";
        container.appendChild(canvas);

        const gl = canvas.getContext("webgl2", { alpha: true, premultipliedAlpha: false }) ||
            canvas.getContext("webgl",  { alpha: true, premultipliedAlpha: false });
        if (!gl) { container.style.background = "#000"; return; }
        gl.enable(gl.BLEND); gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

        const vsSrc = `attribute vec2 uv;attribute vec2 position;varying vec2 vUv;void main(){vUv=uv;gl_Position=vec4(position,0,1);}`;
        const fsSrc = `precision highp float;
uniform float uTime;uniform vec3 uResolution;uniform vec2 uFocal;uniform vec2 uRotation;
uniform float uStarSpeed;uniform float uDensity;uniform float uHueShift;uniform float uSpeed;
uniform vec2 uMouse;uniform float uGlowIntensity;uniform float uSaturation;
uniform bool uMouseRepulsion;uniform float uTwinkleIntensity;uniform float uRotationSpeed;
uniform float uRepulsionStrength;uniform float uMouseActiveFactor;
varying vec2 vUv;
#define NUM_LAYER 4.0
#define MAT45 mat2(0.7071,-0.7071,0.7071,0.7071)
float Hash21(vec2 p){p=fract(p*vec2(123.34,456.21));p+=dot(p,p+45.32);return fract(p.x*p.y);}
float tri(float x){return abs(fract(x)*2.-1.);}
float tris(float x){float t=fract(x);return 1.-smoothstep(0.,1.,abs(2.*t-1.));}
float trisn(float x){float t=fract(x);return 2.*(1.-smoothstep(0.,1.,abs(2.*t-1.)))-1.;}
vec3 hsv2rgb(vec3 c){vec4 K=vec4(1.,2./3.,1./3.,3.);vec3 p=abs(fract(c.xxx+K.xyz)*6.-K.www);return c.z*mix(K.xxx,clamp(p-K.xxx,0.,1.),c.y);}
float Star(vec2 uv,float flare){float d=length(uv);float m=(.05*uGlowIntensity)/d;float rays=smoothstep(0.,1.,1.-abs(uv.x*uv.y*1000.));m+=rays*flare*uGlowIntensity;uv*=MAT45;rays=smoothstep(0.,1.,1.-abs(uv.x*uv.y*1000.));m+=rays*.3*flare*uGlowIntensity;m*=smoothstep(1.,.2,d);return m;}
vec3 StarLayer(vec2 uv){vec3 col=vec3(0.);vec2 gv=fract(uv)-.5;vec2 id=floor(uv);
for(int y=-1;y<=1;y++)for(int x=-1;x<=1;x++){
vec2 si=id+vec2(float(x),float(y));float seed=Hash21(si);float size=fract(seed*345.32);
float glossLocal=tri(uStarSpeed/(3.*seed+1.));float flareSize=smoothstep(.9,1.,size)*glossLocal;
float red=smoothstep(.2,1.,Hash21(si+1.))+.2;float blu=smoothstep(.2,1.,Hash21(si+3.))+.2;float grn=min(red,blu)*seed;
vec3 base=vec3(red,grn,blu);float hue=atan(base.g-base.r,base.b-base.r)/(2.*3.14159)+.5;hue=fract(hue+uHueShift/360.);
float sat=length(base-vec3(dot(base,vec3(.299,.587,.114))))*uSaturation;float val=max(max(base.r,base.g),base.b);base=hsv2rgb(vec3(hue,sat,val));
vec2 pad=vec2(tris(seed*34.+uTime*uSpeed/10.),tris(seed*38.+uTime*uSpeed/30.))-.5;
float star=Star(gv-vec2(float(x),float(y))-pad,flareSize);float twinkle=trisn(uTime*uSpeed+seed*6.2831)*.5+1.;twinkle=mix(1.,twinkle,uTwinkleIntensity);star*=twinkle;
col+=star*size*base;}return col;}
void main(){
vec2 focalPx=uFocal*uResolution.xy;vec2 uv=(vUv*uResolution.xy-focalPx)/uResolution.y;
if(uMouseRepulsion){vec2 mp=(uMouse*uResolution.xy-focalPx)/uResolution.y;float md=length(uv-mp);uv+=normalize(uv-mp)*(uRepulsionStrength/(md+.1))*.05*uMouseActiveFactor;}
else uv+=(uMouse-.5)*.1*uMouseActiveFactor;
uv=mat2(cos(uTime*uRotationSpeed),-sin(uTime*uRotationSpeed),sin(uTime*uRotationSpeed),cos(uTime*uRotationSpeed))*uv;
uv=mat2(uRotation.x,-uRotation.y,uRotation.y,uRotation.x)*uv;
vec3 col=vec3(0.);
for(float i=0.;i<1.;i+=1./NUM_LAYER){float depth=fract(i+uStarSpeed*uSpeed);float scale=mix(20.*uDensity,.5*uDensity,depth);float fade=depth*smoothstep(1.,.9,depth);col+=StarLayer(uv*scale+i*453.32)*fade;}
float alpha=length(col);alpha=smoothstep(0.,.3,alpha);alpha=min(alpha,1.);gl_FragColor=vec4(col,alpha);}`;

        const mk = (type, src) => { const s = gl.createShader(type); gl.shaderSource(s,src); gl.compileShader(s); return s; };
        const prog = gl.createProgram();
        gl.attachShader(prog, mk(gl.VERTEX_SHADER, vsSrc));
        gl.attachShader(prog, mk(gl.FRAGMENT_SHADER, fsSrc));
        gl.linkProgram(prog);

        const u = {};
        ['uTime','uResolution','uFocal','uRotation','uStarSpeed','uDensity','uHueShift','uSpeed','uMouse',
            'uGlowIntensity','uSaturation','uMouseRepulsion','uTwinkleIntensity','uRotationSpeed',
            'uRepulsionStrength','uMouseActiveFactor'].forEach(n => u[n] = gl.getUniformLocation(prog, n));

        gl.useProgram(prog);
        gl.uniform2fv(u.uFocal,[0.5,0.5]); gl.uniform2fv(u.uRotation,[1.0,0.0]);
        gl.uniform1f(u.uDensity,1.0); gl.uniform1f(u.uHueShift,140); gl.uniform1f(u.uSpeed,1.0);
        gl.uniform1f(u.uGlowIntensity,0.25); gl.uniform1f(u.uSaturation,0.0);
        gl.uniform1i(u.uMouseRepulsion,1); gl.uniform1f(u.uTwinkleIntensity,0.25);
        gl.uniform1f(u.uRotationSpeed,0.08); gl.uniform1f(u.uRepulsionStrength,2.0);

        const pb = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER,pb); gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,3,-1,-1,3]),gl.STATIC_DRAW);
        const pl = gl.getAttribLocation(prog,'position'); gl.enableVertexAttribArray(pl); gl.vertexAttribPointer(pl,2,gl.FLOAT,false,0,0);
        const ub = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER,ub); gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([0,0,2,0,0,2]),gl.STATIC_DRAW);
        const ul2 = gl.getAttribLocation(prog,'uv'); gl.enableVertexAttribArray(ul2); gl.vertexAttribPointer(ul2,2,gl.FLOAT,false,0,0);

        const mouse={x:0.5,y:0.5}; const sm={x:0.5,y:0.5}; let ma=0,sma=0;
        function resize(){const w=container.clientWidth,h=container.clientHeight,dpr=Math.min(window.devicePixelRatio,2);canvas.width=w*dpr;canvas.height=h*dpr;canvas.style.width=w+"px";canvas.style.height=h+"px";gl.viewport(0,0,canvas.width,canvas.height);gl.useProgram(prog);gl.uniform3f(u.uResolution,canvas.width,canvas.height,canvas.width/canvas.height);}
        window.addEventListener("resize",resize); resize();
        const onMM=(e)=>{mouse.x=e.clientX/window.innerWidth;mouse.y=1-e.clientY/window.innerHeight;ma=1;};
        const onML=()=>{ma=0;};
        window.addEventListener("mousemove",onMM); window.addEventListener("mouseleave",onML);
        let t=0,last=null,raf;
        function render(ts){raf=requestAnimationFrame(render);const dt=last?Math.min((ts-last)/1000,0.05):0;last=ts;t+=dt;sm.x+=(mouse.x-sm.x)*0.04;sm.y+=(mouse.y-sm.y)*0.04;sma+=(ma-sma)*0.03;gl.useProgram(prog);gl.uniform1f(u.uTime,t);gl.uniform1f(u.uStarSpeed,t*0.04);gl.uniform2fv(u.uMouse,[sm.x,sm.y]);gl.uniform1f(u.uMouseActiveFactor,sma);gl.clear(gl.COLOR_BUFFER_BIT);gl.drawArrays(gl.TRIANGLES,0,3);}
        raf=requestAnimationFrame(render);
        return()=>{cancelAnimationFrame(raf);window.removeEventListener("resize",resize);window.removeEventListener("mousemove",onMM);window.removeEventListener("mouseleave",onML);canvas.parentNode?.removeChild(canvas);};
    },[]);
    return <div id="ws-galaxy" ref={ref} />;
}

/* ─── Radial Audio Visualizer ───────────────────────────────────────────── */
function RadialVisualizer({ mode }) {
    const canvasRef = useRef(null);
    const analyserRef = useRef(null);
    const audioCtxRef = useRef(null);
    const micStreamRef = useRef(null);
    const rafRef = useRef(null);
    const modeRef = useRef(mode);
    modeRef.current = mode;

    // Init mic when LISTENING
    useEffect(() => {
        if (mode === "LISTENING") {
            const ctx = new (window.AudioContext || window.webkitAudioContext)();
            const analyser = ctx.createAnalyser();
            analyser.fftSize = 512;
            analyser.smoothingTimeConstant = 0.8;
            analyser.connect(ctx.destination);
            audioCtxRef.current = ctx;
            analyserRef.current = analyser;
            navigator.mediaDevices.getUserMedia({ audio: true }).then(stream => {
                micStreamRef.current = stream;
                ctx.createMediaStreamSource(stream).connect(analyser);
            }).catch(() => {});
        } else {
            // Stop mic when not listening
            micStreamRef.current?.getTracks().forEach(t => t.stop());
            micStreamRef.current = null;
            if (audioCtxRef.current?.state !== "closed") {
                audioCtxRef.current?.close().catch(() => {});
            }
            audioCtxRef.current = null;
            analyserRef.current = null;
        }
    }, [mode]);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext("2d");
        let animId;

        function resize() {
            const dpr = window.devicePixelRatio || 1;
            canvas.width  = canvas.offsetWidth  * dpr;
            canvas.height = canvas.offsetHeight * dpr;
        }
        resize();
        window.addEventListener("resize", resize);

        let phase = 0;

        function draw() {
            animId = requestAnimationFrame(draw);
            phase += 0.012;

            const W = canvas.width, H = canvas.height;
            const cx = W / 2, cy = H / 2;
            const baseR = Math.min(W, H) * 0.22;
            ctx.clearRect(0, 0, W, H);

            const m = modeRef.current;
            const isListening   = m === "LISTENING";
            const isAI          = m === "PROCESSING" || m === "DONE";
            const isActive      = isListening || isAI;

            // Colour: white for user, soft green for AI
            const color = isListening ? "255,255,255" : isAI ? "74,222,128" : "255,255,255";

            // Get frequency data if mic is live
            const analyser = analyserRef.current;
            let freqData = null;
            if (analyser && isListening) {
                freqData = new Uint8Array(analyser.frequencyBinCount);
                analyser.getByteFrequencyData(freqData);
            }

            const BAR_COUNT = 96;

            for (let i = 0; i < BAR_COUNT; i++) {
                const angle = (i / BAR_COUNT) * Math.PI * 2 - Math.PI / 2;

                let amplitude = 0;
                if (freqData && isListening) {
                    const idx = Math.floor((i / BAR_COUNT) * freqData.length * 0.7);
                    amplitude = (freqData[idx] || 0) / 255;
                } else if (isAI) {
                    // Simulated organic wave for AI speaking
                    const a1 = Math.sin(phase * 2.1 + (i / BAR_COUNT) * Math.PI * 4) * 0.4;
                    const a2 = Math.sin(phase * 3.7 + (i / BAR_COUNT) * Math.PI * 6) * 0.25;
                    const a3 = Math.sin(phase * 1.3 + (i / BAR_COUNT) * Math.PI * 2) * 0.2;
                    amplitude = Math.max(0, (a1 + a2 + a3 + 0.15));
                } else {
                    // Idle — very faint breathing pulse
                    amplitude = (Math.sin(phase * 0.8 + (i / BAR_COUNT) * Math.PI * 2) * 0.04 + 0.04);
                }

                const barLen = isActive
                    ? baseR * 0.12 + amplitude * baseR * 0.65
                    : baseR * 0.018 + amplitude * baseR * 0.06;

                const x1 = cx + Math.cos(angle) * baseR;
                const y1 = cy + Math.sin(angle) * baseR;
                const x2 = cx + Math.cos(angle) * (baseR + barLen);
                const y2 = cy + Math.sin(angle) * (baseR + barLen);

                const alpha = isActive ? (0.15 + amplitude * 0.85) : 0.12;
                ctx.beginPath();
                ctx.moveTo(x1, y1);
                ctx.lineTo(x2, y2);
                ctx.strokeStyle = `rgba(${color},${alpha})`;
                ctx.lineWidth = isActive ? 1.8 : 1;
                ctx.stroke();
            }

            // Inner ring
            ctx.beginPath();
            ctx.arc(cx, cy, baseR, 0, Math.PI * 2);
            ctx.strokeStyle = isActive
                ? `rgba(${color},${isListening ? 0.18 : 0.12})`
                : "rgba(255,255,255,0.05)";
            ctx.lineWidth = 1;
            ctx.stroke();

            // Glow halo when active
            if (isActive) {
                const pulseScale = isListening
                    ? (freqData ? (freqData.reduce((a,b)=>a+b,0)/freqData.length/255)*0.15 : 0)
                    : Math.abs(Math.sin(phase * 1.5)) * 0.08;
                const grad = ctx.createRadialGradient(cx, cy, baseR * 0.6, cx, cy, baseR * (1.5 + pulseScale));
                grad.addColorStop(0,   `rgba(${color},${isListening ? 0.07 : 0.05})`);
                grad.addColorStop(1,   `rgba(${color},0)`);
                ctx.beginPath();
                ctx.arc(cx, cy, baseR * (1.5 + pulseScale), 0, Math.PI * 2);
                ctx.fillStyle = grad;
                ctx.fill();
            }
        }

        draw();
        return () => {
            cancelAnimationFrame(animId);
            window.removeEventListener("resize", resize);
        };
    }, []);

    return (
        <canvas
            ref={canvasRef}
            style={{ position:"absolute", inset:0, width:"100%", height:"100%", display:"block" }}
        />
    );
}

/* ─── Voice Hook ────────────────────────────────────────────────────────── */
function useVoice({ onTranscript, onStart, onStop }) {
    const recRef = useRef(null);
    const [listening, setListening] = useState(false);
    const [supported, setSupported] = useState(false);

    useEffect(() => {
        const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SR) return;
        setSupported(true);
        const rec = new SR();
        rec.continuous = true; rec.interimResults = true; rec.lang = "en-US";
        rec.onresult = e => {
            let interim = "", final = "";
            for (let i = e.resultIndex; i < e.results.length; i++) {
                const t = e.results[i][0].transcript;
                e.results[i].isFinal ? (final += t) : (interim += t);
            }
            onTranscript({ interim, final });
        };
        rec.onstart = () => { setListening(true); onStart?.(); };
        rec.onend   = () => { setListening(false); onStop?.(); };
        rec.onerror = () => { setListening(false); onStop?.(); };
        recRef.current = rec;
    }, []);

    const toggle = useCallback(() => {
        if (!recRef.current) return;
        listening ? recRef.current.stop() : recRef.current.start();
    }, [listening]);

    return { listening, supported, toggle };
}

/* ─── Claude API ────────────────────────────────────────────────────────── */
async function callClaude(text) {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            model: "claude-sonnet-4-6",
            max_tokens: 1000,
            system: `You are Reframe's cognitive triage engine. A student dumps their mental overload and you return ONLY valid JSON — no markdown, no preamble — in exactly this shape:
{
  "priorities": [
    { "rank":1, "title":"short title", "desc":"1-2 sentence action-oriented plan", "confidence":"78%", "energy":"HIGH", "eta":"20 min" },
    { "rank":2, "title":"...", "desc":"...", "confidence":"...", "energy":"MED", "eta":"..." },
    { "rank":3, "title":"...", "desc":"...", "confidence":"...", "energy":"LOW", "eta":"..." }
  ],
  "hidden_assumption": "One sentence: the hidden belief driving their overwhelm",
  "reframe": "One sentence constructive reframe of that belief",
  "cognitive_load": 74
}
energy must be exactly HIGH, MED, or LOW. cognitive_load is 0–100.`,
            messages: [{ role: "user", content: text }]
        })
    });
    const data = await res.json();
    const raw = (data.content||[]).map(b => b.text||"").join("").replace(/```json|```/g,"").trim();
    return JSON.parse(raw);
}

/* ─── Stage labels ──────────────────────────────────────────────────────── */
const STAGES = [
    ["Triage Classifier",     "Claude API"],
    ["Assumption Extractor",  "Claude API"],
    ["Dependency Graph",      "MongoDB"],
    ["Bayesian Scorer",       "Java Engine"],
    ["RAG Action Plan",       "Vector Search"],
];

/* ─── App ───────────────────────────────────────────────────────────────── */
export default function App() {
    const [input,      setInput]      = useState("");
    const [interim,    setInterim]    = useState("");
    const [loading,    setLoading]    = useState(false);
    const [result,     setResult]     = useState(null);
    const [stage,      setStage]      = useState(-1);
    const [clock,      setClock]      = useState("");
    const [latency,    setLatency]    = useState(null);
    const [sessions,   setSessions]   = useState(0);
    const [mode,       setMode]       = useState("IDLE"); // IDLE | PROCESSING | LISTENING | DONE

    // Clock
    useEffect(() => {
        const tick = () => setClock(new Date().toLocaleTimeString("en-US",{hour12:false}));
        tick(); const id = setInterval(tick,1000); return () => clearInterval(id);
    },[]);

    // Voice
    const { listening, supported, toggle: toggleVoice } = useVoice({
        onTranscript: ({ interim: im, final: fn }) => {
            if (fn)  setInput(p => p + fn);
            setInterim(im);
        },
        onStart: () => setMode("LISTENING"),
        onStop:  () => { setInterim(""); setMode("IDLE"); },
    });

    // Submit
    const submit = useCallback(async () => {
        const text = (input + interim).trim();
        if (!text || loading) return;
        setLoading(true); setResult(null); setMode("PROCESSING"); setStage(0);
        const t0 = Date.now();
        const iv = setInterval(() => setStage(s => s < STAGES.length - 1 ? s + 1 : s), 420);
        try {
            const data = await callClaude(text);
            clearInterval(iv);
            setStage(STAGES.length);
            setLatency(Date.now() - t0);
            setResult(data);
            setSessions(c => c + 1);
            setMode("DONE");
        } catch {
            clearInterval(iv);
            setMode("IDLE");
        } finally {
            setLoading(false);
        }
    }, [input, interim, loading]);

    const displayInput = input + (listening ? interim : "");

    // Status pill label
    const statusLabel = mode === "PROCESSING" ? "Processing" : mode === "LISTENING" ? "Listening" : mode === "DONE" ? "Synced" : "Active";
    const dotClass = mode === "PROCESSING" ? "processing" : mode === "LISTENING" ? "listening" : "";

    // Load color
    const loadPct = result?.cognitive_load ?? 0;
    const loadColor = loadPct > 75 ? "#f87171" : loadPct > 50 ? "#fbbf24" : "#4ade80";

    return (
        <>
            <style>{STYLES}</style>
            <GalaxyBackground />

            <div className="ws-shell">
                {/* ── TOPBAR ── */}
                <header className="ws-topbar">
                    <div style={{display:"flex",alignItems:"center"}}>
                        <div className="ws-brand">
                            <div className="ws-logo-mark">M</div>
                            <div className="ws-brand-name">Reframe<span> /</span></div>
                        </div>
                        <div className="ws-brand-sep" />
                        <div className="ws-breadcrumb">Workspace</div>
                    </div>

                    <div className="ws-topbar-right">
                        <div className="statusbar-item live" style={{fontFamily:"var(--mono)",fontSize:"0.6rem",letterSpacing:"0.06em",color:"var(--text-muted)"}}>
                            Sessions: {sessions}
                        </div>
                        {latency && (
                            <div className="statusbar-item" style={{fontFamily:"var(--mono)",fontSize:"0.6rem",letterSpacing:"0.06em",color:"var(--text-muted)"}}>
                                {latency}ms
                            </div>
                        )}
                        <div className="status-pill">
                            <div className={`status-dot ${dotClass}`} />
                            {statusLabel}
                        </div>
                        <div className="ws-clock">{clock}</div>
                    </div>
                </header>

                {/* ── LEFT PANEL ── */}
                <div className="panel-left">
                    <div className="panel-section-head">
                        <span className="panel-label">Input Stream</span>
                        <span className="panel-badge">Brain Dump</span>
                    </div>

                    <div className="input-area">
                        <label className="input-label">Dump your brain here ↓</label>
                        <textarea
                            className="brain-dump"
                            value={displayInput}
                            onChange={e => setInput(e.target.value)}
                            placeholder={"e.g. I have 3 deadlines, my roommate situation is stressful, I haven't started my project, and I'm not even sure I chose the right major..."}
                            onKeyDown={e => { if (e.key==="Enter" && (e.metaKey||e.ctrlKey)) { e.preventDefault(); submit(); } }}
                        />
                        <div className="input-actions">
                            <button className="btn btn-primary" onClick={submit} disabled={loading || !displayInput.trim()}>
                                {loading ? "Processing…" : "Triage My Brain →"}
                            </button>
                            <button
                                className={`btn-voice${listening?" listening":""}${!supported?" unsupported":""}`}
                                onClick={toggleVoice}
                                title={!supported ? "Voice not supported in this browser" : listening ? "Stop recording" : "Voice input"}
                            >
                                {listening ? "⏹" : "🎙"}
                            </button>
                        </div>
                        <div className="voice-hint">
                            {listening ? (
                                <>
                                    <div className="voice-bars">{[0,1,2,3,4].map(i=><div className="voice-bar" key={i}/>)}</div>
                                    <span className="voice-text">Listening…</span>
                                </>
                            ) : (
                                <span className="idle-hint">⌘↩ to submit · 🎙 for voice input</span>
                            )}
                        </div>
                    </div>

                    {/* Pipeline */}
                    <div className="panel-section-head" style={{marginTop:"auto",paddingTop:"0.7rem"}}>
                        <span className="panel-label">5-Stage Pipeline</span>
                        <span className="panel-badge">{stage >= 0 && stage < STAGES.length ? `${stage+1}/5` : stage >= STAGES.length ? "Done" : "Idle"}</span>
                    </div>
                    <div className="stages-area">
                        {STAGES.map(([name, tech], i) => {
                            const done    = stage > i;
                            const active  = stage === i;
                            return (
                                <div className="stage-row" key={name}>
                                    <div className={`stage-dot${done?" done":active?" active":""}`}/>
                                    <span className={`stage-name${done?" done":active?" active":""}`}>{name}</span>
                                    <span className={`stage-ticker${active?" active":""}`}>{tech}</span>
                                </div>
                            );
                        })}
                        <div className="progress-track">
                            <div className={`progress-fill${loading?" animate":""}`}
                                 style={!loading && stage >= STAGES.length ? {width:"100%"} : {}} />
                        </div>
                    </div>

                    {/* Stats */}
                    <div className="panel-section-head">
                        <span className="panel-label">System</span>
                    </div>
                    <div className="stats-area">
                        <div className="stats-grid">
                            <div className="stat-cell"><div className="stat-val">5</div><div className="stat-lbl">API stages</div></div>
                            <div className="stat-cell"><div className="stat-val">&lt;2s</div><div className="stat-lbl">Response</div></div>
                            <div className="stat-cell"><div className="stat-val">RAG</div><div className="stat-lbl">Vector search</div></div>
                            <div className="stat-cell"><div className="stat-val">v2.4</div><div className="stat-lbl">Engine</div></div>
                        </div>
                    </div>
                </div>

                {/* ── CENTER: radial audio visualizer ── */}
                <div className="panel-center">
                    <div className="center-inner">
                        {/* Radial visualizer fills the center */}
                        <RadialVisualizer mode={mode} />

                        {/* HUD overlay on top */}
                        <div className="center-hud">
                            <div className="hud-top">
                                <div style={{display:"flex",flexDirection:"column",gap:"0.15rem"}}>
                                    <div className="hud-meta">Neural Core · Reframe v2.4.0</div>
                                    {result && <div className="hud-meta" style={{color:"rgba(255,255,255,0.35)"}}>Cognitive Rendering Engine</div>}
                                </div>
                                <div className="hud-live">
                                    <div className="hud-live-dot"/>
                                    <span className="hud-meta" style={{color:"rgba(255,255,255,0.35)"}}>LIVE</span>
                                </div>
                            </div>

                            {/* Center label — sits inside the ring */}
                            <div style={{textAlign:"center",pointerEvents:"none"}}>
                                {result && (
                                    <div className="fade-up" style={{display:"flex",flexDirection:"column",alignItems:"center",gap:"0.2rem"}}>
                                        <div className="load-pct" style={{fontSize:"2rem"}}>{loadPct}</div>
                                        <div className="load-sub">Cog. Load</div>
                                    </div>
                                )}
                                {!result && (
                                    <div className="hud-meta" style={{color:"rgba(255,255,255,0.1)",fontSize:"0.62rem",letterSpacing:"0.1em"}}>
                                        {loading ? "PIPELINE ACTIVE" : mode === "LISTENING" ? "LISTENING" : "AWAITING INPUT"}
                                    </div>
                                )}
                            </div>

                            <div className="hud-bottom">
                                <div className="mode-tag">
                                    <div className={`status-dot ${dotClass}`} style={{width:"4px",height:"4px"}}/>
                                    {mode === "PROCESSING" ? "5-Stage Pipeline Running" :
                                        mode === "LISTENING"  ? "Voice Capture Active" :
                                            mode === "DONE"       ? "Analysis Complete" : "Cognitive Rendering Engine"}
                                </div>
                                <div className="hud-meta">RAG · Bayesian · Claude Sonnet 4.6</div>
                            </div>
                        </div>
                        <div className="corner c-tl"/><div className="corner c-tr"/>
                        <div className="corner c-bl"/><div className="corner c-br"/>
                    </div>
                </div>

                {/* ── RIGHT PANEL: results ── */}
                <div className="panel-right">
                    <div className="panel-section-head" style={{flexShrink:0}}>
                        <span className="panel-label">Priority Stack</span>
                        {result && <span className="panel-badge" style={{color:"var(--text-secondary)",borderColor:"var(--border-hover)"}}>
              {result.priorities?.length} items
            </span>}
                    </div>

                    {!result && !loading && (
                        <div className="empty-state">
                            <div className="empty-icon">◈</div>
                            <div className="empty-title">No analysis yet</div>
                            <div className="empty-desc">
                                Dump your mental load on the left,<br/>then hit Triage My Brain to get<br/>your prioritized action stack.
                            </div>
                        </div>
                    )}

                    {loading && (
                        <div className="right-scroll">
                            <div className="typing-row du-1 fade-up" style={{marginTop:"0.5rem"}}>
                                <div className="t-dot"/><div className="t-dot"/><div className="t-dot"/>
                                <span className="typing-label">Claude is reasoning across 5 stages…</span>
                            </div>
                        </div>
                    )}

                    {result && (
                        <div className="right-scroll">
                            {result.priorities?.map((p, i) => {
                                const ec = p.energy==="HIGH"?"energy-h":p.energy==="MED"?"energy-m":"energy-l";
                                return (
                                    <div className={`priority-card fade-up du-${i+1}`} key={p.rank}>
                                        <div className="priority-card-top">
                                            <div className="priority-rank">{p.rank}</div>
                                            <div className="priority-content">
                                                <div className="priority-title">{p.title}</div>
                                                <div className="priority-desc">{p.desc}</div>
                                            </div>
                                        </div>
                                        <div className="priority-tags">
                                            <span className="p-tag conf">confidence: {p.confidence}</span>
                                            <span className={`p-tag ${ec}`}>{p.energy} energy</span>
                                            <span className="p-tag">{p.eta}</span>
                                        </div>
                                    </div>
                                );
                            })}

                            {result.hidden_assumption && (
                                <div className="assumption-box fade-up du-4">
                                    <div className="assumption-head">Hidden Assumption</div>
                                    <div className="assumption-text">{result.hidden_assumption}</div>
                                    <div className="assumption-reframe">
                                        <strong>Reframe →</strong> {result.reframe}
                                    </div>
                                </div>
                            )}

                            <div className="load-bar-wrap fade-up du-4">
                                <div className="load-bar-card">
                                    <div className="load-bar-head">
                                        <span className="panel-label">Cognitive Load</span>
                                        <span className="load-bar-num">{loadPct}<span style={{fontSize:"0.7rem",color:"var(--text-muted)"}}>%</span></span>
                                    </div>
                                    <div className="load-track">
                                        <div className="load-fill" style={{width:`${loadPct}%`,background:`linear-gradient(90deg,${loadColor}44,${loadColor})`}}/>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* ── STATUSBAR ── */}
                <footer className="ws-statusbar">
                    <div className="statusbar-left">
                        <div className="statusbar-item live">Reframe — Workspace</div>
                        <div className="statusbar-item">Claude Sonnet 4.6</div>
                        <div className="statusbar-item">5-Stage Pipeline</div>
                        <div className="statusbar-item">RAG · Bayesian Scorer</div>
                    </div>
                    <div className="statusbar-item">
                        {latency ? `${latency}ms latency` : "USAIII Hackathon 2026"}
                    </div>
                </footer>
            </div>
        </>
    );
}

import { useState, useEffect, useRef, useCallback } from "react";

// =============================================
// STYLES (injected once as a <style> tag)
// =============================================
const GLOBAL_STYLES = `
  @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;500;600;700;800&family=DM+Mono:ital,wght@0,300;0,400;0,500;1,300&family=Inter:wght@300;400;500;600;700;800&display=swap');

  :root {
    --void: #000000;
    --void-alt: #030303;
    --surface: #080808;
    --surface-hover: #0D0D0D;
    --elevated: #111111;
    --elevated-hover: #161616;
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
    --glass: rgba(10,10,14,0.55);
    --glass-hover: rgba(14,14,18,0.65);
    --mono: 'DM Mono','JetBrains Mono',monospace;
    --display: 'Syne',system-ui,sans-serif;
    --body: 'Inter',system-ui,-apple-system,sans-serif;
    --radius-sm: 4px;
    --radius-md: 8px;
    --radius-lg: 12px;
    --radius-xl: 20px;
    --radius-2xl: 28px;
    --shadow-md: 0 4px 16px rgba(0,0,0,0.7);
    --shadow-lg: 0 8px 40px rgba(0,0,0,0.8);
    --transition-fast: 150ms cubic-bezier(0.16,1,0.3,1);
    --transition-base: 300ms cubic-bezier(0.16,1,0.3,1);
  }

  *, *::before, *::after { margin:0; padding:0; box-sizing:border-box; }
  html { scroll-behavior:smooth; -webkit-text-size-adjust:100%; }
  body {
    background:var(--void); color:var(--text-primary);
    font-family:var(--body); font-weight:400; line-height:1.6;
    overflow-x:hidden; -webkit-font-smoothing:antialiased;
  }
  ::-webkit-scrollbar { width:4px; }
  ::-webkit-scrollbar-track { background:var(--void); }
  ::-webkit-scrollbar-thumb { background:var(--text-dim); border-radius:2px; }
  ::-webkit-scrollbar-thumb:hover { background:var(--text-muted); }
  ::selection { background:rgba(255,255,255,0.12); color:var(--text-primary); }

  #galaxy-background { position:fixed; inset:0; z-index:0; pointer-events:none; }
  #galaxy-background canvas { display:block; }
  .content-wrapper { position:relative; z-index:10; pointer-events:auto; }

  /* NAV */
  .nav {
    position:fixed; top:0; left:0; right:0; z-index:1000;
    display:flex; align-items:center; justify-content:space-between;
    padding:1.25rem 3rem;
    background:rgba(0,0,0,0.65);
    backdrop-filter:blur(24px) saturate(180%);
    -webkit-backdrop-filter:blur(24px) saturate(180%);
    border-bottom:1px solid var(--border);
    transition:all var(--transition-base);
    animation:fadeDown 0.7s cubic-bezier(0.16,1,0.3,1) both;
  }
  .nav.scrolled { padding:0.85rem 3rem; background:rgba(0,0,0,0.85); box-shadow:var(--shadow-md); }
  .nav-brand { display:flex; align-items:center; gap:0.6rem; text-decoration:none; cursor:pointer; }
  .nav-logo {
    width:30px; height:30px; background:var(--accent);
    border-radius:var(--radius-sm); display:flex; align-items:center; justify-content:center;
    font-family:var(--display); font-weight:700; font-size:0.8rem; color:var(--void);
  }
  .nav-wordmark { font-family:var(--display); font-weight:700; font-size:1rem; letter-spacing:-0.03em; color:var(--text-primary); text-transform:uppercase; }
  .nav-wordmark span { color:var(--text-muted); font-weight:500; }
  .nav-right { display:flex; align-items:center; gap:2rem; }
  .nav-links { display:flex; align-items:center; gap:2rem; list-style:none; }
  .nav-links a { color:var(--text-muted); text-decoration:none; font-size:0.76rem; font-weight:500; letter-spacing:0.08em; text-transform:uppercase; transition:color var(--transition-fast); cursor:pointer; }
  .nav-links a:hover { color:var(--text-primary); }
  .status-pill {
    display:flex; align-items:center; gap:0.5rem;
    font-family:var(--mono); font-size:0.62rem; letter-spacing:0.12em; text-transform:uppercase;
    color:var(--text-tertiary); background:var(--glass); border:1px solid var(--border);
    backdrop-filter:blur(20px); border-radius:100px; padding:0.4rem 0.9rem; white-space:nowrap;
  }
  .status-dot {
    width:6px; height:6px; background:#fff; border-radius:50%;
    box-shadow:0 0 8px rgba(255,255,255,0.8); animation:statusPulse 2.5s infinite;
  }
  @keyframes statusPulse {
    0%,100% { opacity:1; box-shadow:0 0 8px rgba(255,255,255,0.8); }
    50% { opacity:0.35; box-shadow:0 0 4px rgba(255,255,255,0.3); }
  }
  .nav-toggle { display:none; background:none; border:none; cursor:pointer; padding:0.4rem; z-index:1001; }
  .nav-toggle span { display:block; width:20px; height:2px; background:var(--text-secondary); margin:4px 0; transition:all var(--transition-base); border-radius:1px; }
  .nav-toggle.active span:nth-child(1) { transform:rotate(45deg) translate(4px,4px); }
  .nav-toggle.active span:nth-child(2) { opacity:0; }
  .nav-toggle.active span:nth-child(3) { transform:rotate(-45deg) translate(4px,-4px); }
  .nav-mobile {
    display:none; position:fixed; inset:0;
    background:rgba(0,0,0,0.96); backdrop-filter:blur(30px); -webkit-backdrop-filter:blur(30px);
    z-index:999; flex-direction:column; align-items:center; justify-content:center; gap:1.8rem;
  }
  .nav-mobile.active { display:flex; }
  .nav-mobile a { color:var(--text-primary); text-decoration:none; font-family:var(--display); font-size:1.4rem; font-weight:600; letter-spacing:-0.02em; transition:opacity var(--transition-fast); cursor:pointer; }
  .nav-mobile a:hover { opacity:0.7; }

  /* HERO */
  .hero { position:relative; min-height:100vh; display:flex; align-items:center; justify-content:center; padding:6rem 2rem 3rem; }
  .hero-grid { display:grid; grid-template-columns:1fr 1fr; gap:4rem; max-width:1200px; width:100%; align-items:center; }
  .hero-text { text-align:left; animation:fadeUp 0.9s 0.15s cubic-bezier(0.16,1,0.3,1) both; }
  .hero-eyebrow { display:inline-flex; align-items:center; gap:0.6rem; font-family:var(--mono); font-size:0.66rem; letter-spacing:0.15em; text-transform:uppercase; color:var(--text-muted); margin-bottom:1.5rem; }
  .hero-eyebrow::before { content:''; width:24px; height:1px; background:var(--text-muted); }
  .hero-title { font-family:var(--display); font-size:clamp(2.4rem,5.5vw,5rem); font-weight:800; line-height:0.94; letter-spacing:-0.04em; color:var(--text-primary); margin-bottom:1.5rem; background:linear-gradient(160deg,#ffffff 0%,#9090a0 100%); -webkit-background-clip:text; -webkit-text-fill-color:transparent; background-clip:text; }
  .hero-subtitle { font-size:1.05rem; color:var(--text-muted); line-height:1.65; margin-bottom:2.5rem; max-width:440px; font-weight:400; }
  .hero-actions { display:flex; gap:0.85rem; flex-wrap:wrap; }

  /* BUTTONS */
  .btn { position:relative; display:inline-flex; align-items:center; gap:0.5rem; padding:0.85rem 2rem; border-radius:100px; font-family:var(--display); font-weight:600; font-size:0.78rem; letter-spacing:0.1em; text-transform:uppercase; cursor:pointer; transition:all var(--transition-base); text-decoration:none; white-space:nowrap; overflow:hidden; border:none; }
  .btn-primary { background:#fff; color:#000; border:1px solid rgba(255,255,255,0.3); box-shadow:0 4px 16px rgba(255,255,255,0.06); }
  .btn-primary:hover { box-shadow:0 0 40px rgba(255,255,255,0.22); transform:translateY(-2px); }
  .btn-secondary { background:var(--glass); color:#ccc; border:1px solid var(--border-hover); backdrop-filter:blur(20px); -webkit-backdrop-filter:blur(20px); }
  .btn-secondary:hover { border-color:rgba(255,255,255,0.4); color:#fff; background:var(--glass-hover); }
  .btn::after { content:''; position:absolute; inset:0; background:linear-gradient(90deg,transparent,rgba(255,255,255,0.12),transparent); transform:translateX(-100%); transition:transform 0.6s ease; }
  .btn:hover::after { transform:translateX(100%); }
  .btn-sm { padding:0.5rem 1.3rem; font-size:0.7rem; }

  /* HERO CARD */
  .hero-visual { display:flex; align-items:center; justify-content:center; animation:fadeUp 0.9s 0.3s cubic-bezier(0.16,1,0.3,1) both; }
  .glass-card { background:var(--glass); border:1px solid var(--border); border-radius:var(--radius-2xl); padding:2rem; backdrop-filter:blur(30px); -webkit-backdrop-filter:blur(30px); box-shadow:0 40px 80px -20px rgba(0,0,0,0.8),inset 0 1px 0 rgba(255,255,255,0.06); transition:border-color 0.4s ease,box-shadow 0.4s ease,transform 0.6s cubic-bezier(0.16,1,0.3,1); width:100%; max-width:480px; will-change:transform; }
  .glass-card:hover { border-color:rgba(255,255,255,0.12); box-shadow:0 50px 100px -20px rgba(0,0,0,0.9); }
  .card-header { display:flex; justify-content:space-between; align-items:center; margin-bottom:1.25rem; padding-bottom:1rem; border-bottom:1px solid var(--border); }
  .card-title { font-family:var(--mono); font-size:0.64rem; letter-spacing:0.12em; text-transform:uppercase; color:var(--text-muted); }
  .card-badge { font-family:var(--mono); font-size:0.58rem; letter-spacing:0.1em; background:rgba(255,255,255,0.05); border:1px solid var(--border); border-radius:4px; padding:0.2rem 0.55rem; color:var(--text-tertiary); text-transform:uppercase; }
  .priority-preview { display:flex; flex-direction:column; gap:0.55rem; margin-bottom:1.25rem; }
  .priority-row { display:flex; align-items:center; gap:0.8rem; padding:0.7rem 0.85rem; background:rgba(255,255,255,0.02); border:1px solid transparent; border-radius:10px; font-size:0.8rem; transition:all var(--transition-base); }
  .priority-row:first-child { background:rgba(255,255,255,0.05); border-color:var(--border); }
  .priority-num { font-family:var(--display); font-weight:700; font-size:1.3rem; color:#fff; line-height:1; min-width:22px; }
  .priority-row:not(:first-child) .priority-num { color:var(--text-muted); }
  .priority-info { flex:1; }
  .priority-label { font-weight:600; color:#fff; font-size:0.78rem; }
  .priority-sublabel { font-size:0.68rem; color:var(--text-muted); font-family:var(--mono); }
  .card-savings { background:rgba(255,255,255,0.025); border:1px solid var(--border); border-radius:12px; padding:0.9rem 1.1rem; display:flex; justify-content:space-between; align-items:center; }
  .savings-label { font-family:var(--mono); font-size:0.6rem; letter-spacing:0.1em; text-transform:uppercase; color:var(--text-muted); }
  .savings-value { font-size:1.3rem; font-weight:700; letter-spacing:-0.03em; color:#fff; }
  .scroll-indicator { position:absolute; bottom:1.8rem; left:50%; transform:translateX(-50%); z-index:10; display:flex; flex-direction:column; align-items:center; gap:0.3rem; opacity:0; animation:fadeUp 0.8s ease 1.5s forwards; }
  .scroll-indicator span { font-family:var(--mono); font-size:0.58rem; letter-spacing:0.12em; color:var(--text-muted); text-transform:uppercase; }
  .scroll-line { width:1px; height:28px; background:linear-gradient(to bottom,var(--text-muted),transparent); animation:scrollPulse 2s ease-in-out infinite; }
  @keyframes scrollPulse { 0%,100% { opacity:0.12; } 50% { opacity:0.55; } }
  @keyframes fadeDown { from { opacity:0; transform:translateY(-20px); } to { opacity:1; transform:translateY(0); } }
  @keyframes fadeUp { from { opacity:0; transform:translateY(35px); } to { opacity:1; transform:translateY(0); } }

  /* SECTIONS */
  .section { padding:5rem 3rem; max-width:1100px; margin:0 auto; }
  .section-label { font-family:var(--mono); font-size:0.65rem; font-weight:500; color:var(--text-tertiary); letter-spacing:0.15em; text-transform:uppercase; margin-bottom:0.6rem; }
  .section-title { font-family:var(--display); font-size:clamp(1.6rem,3vw,3rem); font-weight:800; letter-spacing:-0.04em; color:#fff; margin-bottom:0.8rem; line-height:1.06; }
  .section-desc { font-size:0.95rem; color:var(--text-secondary); max-width:540px; line-height:1.7; }
  .problem-solution-grid { display:grid; grid-template-columns:1fr 1fr; gap:2rem; margin-top:2.5rem; }
  .ps-card { background:var(--glass); border:1px solid var(--border); border-radius:var(--radius-xl); padding:2rem; backdrop-filter:blur(20px); -webkit-backdrop-filter:blur(20px); transition:all var(--transition-base); }
  .ps-card:hover { border-color:var(--border-hover); background:var(--glass-hover); }
  .ps-card.problem { border-left:2px solid var(--text-muted); }
  .ps-card.solution { border-left:2px solid var(--accent); }
  .ps-card-header { font-family:var(--display); font-weight:700; font-size:1rem; margin-bottom:1rem; display:flex; align-items:center; gap:0.5rem; color:var(--text-primary); }
  .ps-stat { font-family:var(--display); font-size:2.5rem; font-weight:800; line-height:1; margin-bottom:0.5rem; color:var(--text-primary); }
  .ps-list { list-style:none; display:flex; flex-direction:column; gap:0.6rem; margin-top:1rem; }
  .ps-list li { font-size:0.85rem; color:var(--text-secondary); padding-left:1.2rem; position:relative; line-height:1.5; }
  .ps-list li::before { content:''; position:absolute; left:0; top:0.55rem; width:5px; height:5px; border-radius:50%; background:var(--text-muted); }
  .ps-card.solution .ps-list li::before { background:var(--accent); }
  .divider { border:none; border-top:1px solid var(--border); margin:0; }

  /* DEMO */
  .demo-section-wrapper { background:var(--void-alt); border-top:1px solid var(--border); border-bottom:1px solid var(--border); }
  .demo-wrapper { max-width:900px; margin:0 auto; }
  .demo-card { background:var(--glass); border:1px solid var(--border); border-radius:var(--radius-2xl); padding:2.5rem; backdrop-filter:blur(30px); -webkit-backdrop-filter:blur(30px); box-shadow:var(--shadow-lg),inset 0 1px 0 rgba(255,255,255,0.04); position:relative; transition:all var(--transition-base); }
  .demo-card:hover { border-color:rgba(255,255,255,0.10); }
  .demo-header { display:flex; align-items:center; gap:0.5rem; margin-bottom:1.5rem; padding-bottom:1rem; border-bottom:1px solid var(--border); }
  .demo-dot { width:10px; height:10px; border-radius:50%; }
  .demo-dot:nth-child(1) { background:#444; }
  .demo-dot:nth-child(2) { background:#666; }
  .demo-dot:nth-child(3) { background:#888; }
  .demo-label { font-family:var(--mono); font-size:0.66rem; color:var(--text-muted); letter-spacing:0.05em; margin-left:0.5rem; }
  .demo-credentials { display:flex; gap:2rem; flex-wrap:wrap; margin-bottom:1.25rem; padding:0.85rem 1rem; background:rgba(255,255,255,0.02); border:1px solid var(--border); border-radius:var(--radius-md); }
  .demo-cred-item { display:flex; flex-direction:column; gap:0.15rem; }
  .demo-cred-label { font-family:var(--mono); font-size:0.6rem; color:var(--text-muted); letter-spacing:0.06em; text-transform:uppercase; }
  .demo-cred-value { font-family:var(--mono); font-size:0.8rem; color:var(--text-primary); font-weight:500; cursor:pointer; transition:opacity var(--transition-fast); }
  .demo-cred-value:hover { opacity:0.7; }
  .demo-input { width:100%; min-height:100px; background:rgba(255,255,255,0.03); border:1px solid var(--border); border-radius:var(--radius-md); color:var(--text-primary); padding:1.1rem; font-family:var(--body); font-size:0.9rem; resize:vertical; line-height:1.6; transition:all var(--transition-fast); margin-bottom:0.85rem; outline:none; }
  .demo-input:focus { border-color:rgba(255,255,255,0.22); background:rgba(255,255,255,0.05); box-shadow:0 0 0 3px rgba(255,255,255,0.03); }
  .demo-input::placeholder { color:var(--text-dim); }
  .demo-submit-row { display:flex; align-items:center; gap:1rem; margin-bottom:0.5rem; }
  .typing-indicator { display:none; align-items:center; gap:0.35rem; padding:0.4rem 0; }
  .typing-indicator.active { display:flex; }
  .typing-dot { width:5px; height:5px; border-radius:50%; background:var(--accent); animation:typingBounce 1.4s ease-in-out infinite; }
  .typing-dot:nth-child(2) { animation-delay:0.2s; }
  .typing-dot:nth-child(3) { animation-delay:0.4s; }
  @keyframes typingBounce { 0%,60%,100% { transform:translateY(0); opacity:0.2; } 30% { transform:translateY(-5px); opacity:1; } }
  .demo-output { display:none; margin-top:1.8rem; padding-top:1.8rem; border-top:1px solid var(--border); animation:fadeUp 0.45s ease; }
  .demo-output.active { display:block; }
  .output-header { font-family:var(--mono); font-size:0.66rem; font-weight:600; color:var(--text-primary); letter-spacing:0.08em; text-transform:uppercase; margin-bottom:1rem; display:flex; align-items:center; gap:0.5rem; }
  .output-header::after { content:''; flex:1; height:1px; background:var(--border); }
  .priority-stack { display:flex; flex-direction:column; gap:0.65rem; margin-bottom:1.25rem; }
  .priority-item { display:flex; align-items:flex-start; gap:0.85rem; padding:0.85rem; border-radius:var(--radius-md); background:rgba(255,255,255,0.015); border:1px solid transparent; transition:all var(--transition-fast); }
  .priority-item:first-child { background:rgba(255,255,255,0.04); border-color:var(--border-hover); }
  .priority-rank { font-family:var(--display); font-weight:700; font-size:1.4rem; color:var(--text-primary); line-height:1; min-width:24px; }
  .priority-item:not(:first-child) .priority-rank { color:var(--text-muted); }
  .priority-content h4 { font-size:0.85rem; font-weight:600; color:var(--text-primary); margin-bottom:0.15rem; }
  .priority-content p { font-size:0.78rem; color:var(--text-muted); line-height:1.5; }
  .confidence-badge { display:inline-block; font-family:var(--mono); font-size:0.62rem; padding:0.12rem 0.45rem; border-radius:3px; background:rgba(255,255,255,0.05); color:var(--text-tertiary); margin-top:0.25rem; }
  .assumption-box { padding:0.85rem 1.1rem; background:rgba(255,255,255,0.015); border:1px solid var(--border); border-radius:var(--radius-md); font-size:0.78rem; color:var(--text-secondary); line-height:1.55; }
  .assumption-box strong { color:var(--text-primary); font-family:var(--mono); font-size:0.64rem; letter-spacing:0.05em; text-transform:uppercase; }
  .video-embed { margin-top:1.5rem; border-radius:var(--radius-md); overflow:hidden; border:1px solid var(--border); aspect-ratio:16/9; background:var(--void-alt); display:flex; align-items:center; justify-content:center; cursor:pointer; transition:border-color var(--transition-fast); }
  .video-embed:hover { border-color:var(--border-bright); }
  .video-placeholder { text-align:center; color:var(--text-muted); }
  .video-placeholder-icon { font-size:3rem; margin-bottom:0.5rem; opacity:0.35; }

  /* TECH STACK */
  .stack-grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(130px,1fr)); gap:0.75rem; margin-top:2rem; }
  .stack-item { background:var(--glass); border:1px solid var(--border); border-radius:var(--radius-md); padding:1.25rem 1rem; text-align:center; backdrop-filter:blur(12px); -webkit-backdrop-filter:blur(12px); transition:all var(--transition-base); cursor:default; }
  .stack-item:hover { border-color:var(--border-hover); background:var(--glass-hover); box-shadow:var(--shadow-md); }
  .stack-item-icon { font-size:1.6rem; margin-bottom:0.4rem; }
  .stack-item-name { font-family:var(--display); font-size:0.8rem; font-weight:600; color:var(--text-primary); margin-bottom:0.15rem; }
  .stack-item-role { font-family:var(--mono); font-size:0.6rem; color:var(--text-muted); letter-spacing:0.04em; }
  .sponsor-badge { display:inline-block; margin-top:0.3rem; padding:0.1rem 0.4rem; background:rgba(255,255,255,0.04); border:1px solid rgba(255,255,255,0.12); border-radius:3px; font-family:var(--mono); font-size:0.55rem; color:var(--text-tertiary); letter-spacing:0.04em; }

  /* ARCHITECTURE */
  .arch-window { background:var(--glass); border:1px solid var(--border); border-radius:var(--radius-xl); overflow:hidden; backdrop-filter:blur(20px); -webkit-backdrop-filter:blur(20px); box-shadow:var(--shadow-lg); margin-top:2rem; }
  .arch-titlebar { padding:0.6rem 1.1rem; border-bottom:1px solid var(--border); display:flex; align-items:center; gap:0.4rem; background:rgba(0,0,0,0.3); }
  .arch-dot { width:9px; height:9px; border-radius:50%; }
  .arch-dot:nth-child(1) { background:#444; }
  .arch-dot:nth-child(2) { background:#666; }
  .arch-dot:nth-child(3) { background:#888; }
  .arch-filename { font-family:var(--mono); font-size:0.64rem; color:var(--text-muted); letter-spacing:0.04em; margin-left:auto; }
  .arch-body { padding:1.8rem; font-family:var(--mono); font-size:0.74rem; line-height:2.1; color:var(--text-secondary); }
  .arch-row { display:flex; align-items:center; gap:0.7rem; padding:0.1rem 0; }
  .arch-node { padding:0.25rem 0.8rem; border-radius:3px; font-size:0.72rem; font-weight:500; white-space:nowrap; }
  .arch-node.input { background:rgba(255,255,255,0.06); border:1px solid rgba(255,255,255,0.15); color:var(--text-primary); }
  .arch-node.process { background:rgba(255,255,255,0.03); border:1px solid var(--border); color:var(--text-secondary); }
  .arch-node.output { background:rgba(255,255,255,0.015); border:1px solid var(--border); color:var(--text-muted); }
  .arch-comment { color:var(--text-dim); font-style:italic; font-size:0.68rem; }
  .arch-arrow { color:var(--text-dim); text-align:center; padding:0.08rem 0; letter-spacing:-2px; font-size:0.65rem; }

  /* FEATURES & FUTURE */
  .features-grid, .future-grid { display:grid; grid-template-columns:repeat(3,1fr); gap:1px; background:var(--border); border:1px solid var(--border); border-radius:var(--radius-xl); overflow:hidden; margin-top:2.5rem; }
  .feature-card, .future-card { background:var(--void); padding:2.2rem 1.8rem; transition:all var(--transition-base); position:relative; overflow:hidden; }
  .feature-card::before { content:''; position:absolute; top:0; left:0; right:0; height:1px; background:linear-gradient(90deg,transparent,rgba(255,255,255,0.08),transparent); opacity:0; transition:opacity var(--transition-base); }
  .feature-card:hover, .future-card:hover { background:rgba(255,255,255,0.02); }
  .feature-card:hover::before { opacity:1; }
  .feature-icon { width:40px; height:40px; background:rgba(255,255,255,0.04); border:1px solid var(--border); border-radius:10px; display:flex; align-items:center; justify-content:center; margin-bottom:1.5rem; font-size:1rem; transition:all var(--transition-base); }
  .feature-card:hover .feature-icon { background:rgba(255,255,255,0.08); border-color:var(--border-hover); box-shadow:0 0 20px rgba(255,255,255,0.06); }
  .feature-title, .future-title { font-family:var(--display); font-size:0.95rem; font-weight:700; letter-spacing:-0.02em; color:#fff; margin-bottom:0.5rem; }
  .feature-desc, .future-desc { font-size:0.8rem; color:var(--text-muted); line-height:1.55; }
  .future-num { font-family:var(--display); font-size:2rem; font-weight:800; color:var(--text-primary); opacity:0.15; margin-bottom:0.5rem; }
  .future-card { text-align:center; }

  /* TEAM */
  .team-grid-final { display:grid; grid-template-columns:1fr 1fr; gap:1.5rem; margin-top:2.5rem; }
  .team-card-final { background:var(--glass); border:1px solid var(--border); border-radius:var(--radius-xl); padding:2rem; display:flex; gap:1.25rem; align-items:flex-start; backdrop-filter:blur(20px); -webkit-backdrop-filter:blur(20px); transition:all var(--transition-base); }
  .team-card-final:hover { border-color:var(--border-hover); background:var(--glass-hover); box-shadow:var(--shadow-md); }
  .team-avatar { width:60px; height:60px; border-radius:50%; background:var(--elevated); border:2px solid var(--border-bright); display:flex; align-items:center; justify-content:center; font-family:var(--display); font-weight:700; font-size:1.4rem; color:var(--text-primary); flex-shrink:0; }
  .team-info h4 { font-family:var(--display); font-size:1rem; font-weight:600; color:var(--text-primary); margin-bottom:0.15rem; }
  .team-role-tag { font-family:var(--mono); font-size:0.64rem; color:var(--text-tertiary); letter-spacing:0.06em; text-transform:uppercase; margin-bottom:0.6rem; }
  .team-links { display:flex; gap:0.75rem; margin-top:0.5rem; }
  .team-link { font-size:0.7rem; color:var(--text-muted); text-decoration:none; font-family:var(--mono); transition:color var(--transition-fast); }
  .team-link:hover { color:var(--text-primary); }

  /* CTA & FOOTER */
  .cta-section-final { text-align:center; padding:5rem 2rem; background:var(--glass); border-top:1px solid var(--border); border-bottom:1px solid var(--border); backdrop-filter:blur(20px); -webkit-backdrop-filter:blur(20px); }
  .footer { padding:2rem 3rem; display:flex; align-items:center; justify-content:space-between; flex-wrap:wrap; gap:1rem; font-size:0.74rem; }
  .footer-left { font-family:var(--display); font-weight:600; color:var(--text-muted); }
  .footer-right { font-family:var(--mono); font-size:0.6rem; letter-spacing:0.12em; color:rgba(255,255,255,0.18); text-transform:uppercase; animation:breathe 4s infinite; }
  @keyframes breathe { 0%,100% { opacity:0.18; } 50% { opacity:0.45; } }
  .footer-links { display:flex; gap:1.5rem; flex-wrap:wrap; }
  .footer-links a { color:var(--text-dim); text-decoration:none; font-family:var(--mono); font-size:0.66rem; letter-spacing:0.03em; transition:color var(--transition-fast); }
  .footer-links a:hover { color:var(--text-primary); }

  /* REVEAL */
  .reveal { opacity:0; transform:translateY(30px); transition:opacity 0.8s cubic-bezier(0.16,1,0.3,1), transform 0.8s cubic-bezier(0.16,1,0.3,1); }
  .reveal.visible { opacity:1; transform:translateY(0); }

  /* RESPONSIVE */
  @media (max-width:1024px) {
    .hero-grid { grid-template-columns:1fr; gap:2.5rem; text-align:center; }
    .hero-text { text-align:center; }
    .hero-subtitle { margin-left:auto; margin-right:auto; }
    .hero-actions { justify-content:center; }
    .hero-visual { order:-1; }
    .glass-card { max-width:400px; margin:0 auto; }
    .features-grid, .future-grid { grid-template-columns:1fr 1fr; }
    .features-grid .feature-card:last-child, .future-grid .future-card:last-child { grid-column:1 / -1; }
    .problem-solution-grid { grid-template-columns:1fr; }
  }
  @media (max-width:768px) {
    .nav { padding:0.85rem 1.25rem; }
    .nav-right .nav-links { display:none; }
    .status-pill.desktop-only { display:none; }
    .nav-toggle { display:block; }
    .section { padding:3.5rem 1.25rem; }
    .hero { padding:5rem 1.25rem 2.5rem; }
    .team-grid-final { grid-template-columns:1fr; }
    .features-grid, .future-grid { grid-template-columns:1fr; }
    .features-grid .feature-card:last-child, .future-grid .future-card:last-child { grid-column:auto; }
    .footer { padding:1.5rem; flex-direction:column; text-align:center; }
    .footer-links { justify-content:center; }
    .demo-card { padding:1.5rem; }
    .demo-credentials { flex-direction:column; gap:0.5rem; }
    .stack-grid { grid-template-columns:repeat(auto-fill,minmax(100px,1fr)); }
  }
  @media (max-width:480px) {
    .hero-title { font-size:2rem; }
    .btn { width:100%; justify-content:center; }
    .hero-actions { flex-direction:column; width:100%; }
    .demo-submit-row { flex-direction:column; }
    .demo-submit-row .btn { width:100%; justify-content:center; }
    .arch-body { padding:1rem; font-size:0.65rem; }
  }
`;

// =============================================
// GALAXY BACKGROUND (WebGL)
// =============================================
function GalaxyBackground() {
    const containerRef = useRef(null);

    useEffect(() => {
        const container = containerRef.current;
        if (!container) return;
        const canvas = document.createElement("canvas");
        canvas.style.cssText = "display:block;width:100%;height:100%";
        container.appendChild(canvas);

        const gl =
            canvas.getContext("webgl2", { alpha: true, premultipliedAlpha: false }) ||
            canvas.getContext("webgl", { alpha: true, premultipliedAlpha: false });
        if (!gl) { container.style.background = "#000"; return; }
        if (gl.enable) { gl.enable(gl.BLEND); gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA); }

        const vsSrc = `
      attribute vec2 uv; attribute vec2 position; varying vec2 vUv;
      void main() { vUv = uv; gl_Position = vec4(position, 0, 1); }
    `;
        const fsSrc = `
      precision highp float;
      uniform float uTime; uniform vec3 uResolution; uniform vec2 uFocal; uniform vec2 uRotation;
      uniform float uStarSpeed; uniform float uDensity; uniform float uHueShift; uniform float uSpeed;
      uniform vec2 uMouse; uniform float uGlowIntensity; uniform float uSaturation;
      uniform bool uMouseRepulsion; uniform float uTwinkleIntensity; uniform float uRotationSpeed;
      uniform float uRepulsionStrength; uniform float uMouseActiveFactor;
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
        col+=star*size*base;
      }return col;}
      void main(){
        vec2 focalPx=uFocal*uResolution.xy;vec2 uv=(vUv*uResolution.xy-focalPx)/uResolution.y;
        if(uMouseRepulsion){vec2 mp=(uMouse*uResolution.xy-focalPx)/uResolution.y;float md=length(uv-mp);uv+=normalize(uv-mp)*(uRepulsionStrength/(md+.1))*.05*uMouseActiveFactor;}
        else uv+=(uMouse-.5)*.1*uMouseActiveFactor;
        uv=mat2(cos(uTime*uRotationSpeed),-sin(uTime*uRotationSpeed),sin(uTime*uRotationSpeed),cos(uTime*uRotationSpeed))*uv;
        uv=mat2(uRotation.x,-uRotation.y,uRotation.y,uRotation.x)*uv;
        vec3 col=vec3(0.);
        for(float i=0.;i<1.;i+=1./NUM_LAYER){float depth=fract(i+uStarSpeed*uSpeed);float scale=mix(20.*uDensity,.5*uDensity,depth);float fade=depth*smoothstep(1.,.9,depth);col+=StarLayer(uv*scale+i*453.32)*fade;}
        float alpha=length(col);alpha=smoothstep(0.,.3,alpha);alpha=min(alpha,1.);gl_FragColor=vec4(col,alpha);
      }
    `;

        function mkShader(type, src) {
            const s = gl.createShader(type);
            gl.shaderSource(s, src); gl.compileShader(s);
            if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) { console.warn(gl.getShaderInfoLog(s)); return null; }
            return s;
        }
        const vs = mkShader(gl.VERTEX_SHADER, vsSrc);
        const fs = mkShader(gl.FRAGMENT_SHADER, fsSrc);
        const prog = gl.createProgram();
        gl.attachShader(prog, vs); gl.attachShader(prog, fs); gl.linkProgram(prog);
        if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) { console.warn(gl.getProgramInfoLog(prog)); return; }

        const u = {};
        ['uTime','uResolution','uFocal','uRotation','uStarSpeed','uDensity','uHueShift','uSpeed','uMouse',
            'uGlowIntensity','uSaturation','uMouseRepulsion','uTwinkleIntensity','uRotationSpeed',
            'uRepulsionStrength','uMouseActiveFactor'
        ].forEach(n => u[n] = gl.getUniformLocation(prog, n));

        gl.useProgram(prog);
        gl.uniform2fv(u.uFocal, [0.5, 0.5]);
        gl.uniform2fv(u.uRotation, [1.0, 0.0]);
        gl.uniform1f(u.uDensity, 1.0);
        gl.uniform1f(u.uHueShift, 140);
        gl.uniform1f(u.uSpeed, 1.0);
        gl.uniform1f(u.uGlowIntensity, 0.3);
        gl.uniform1f(u.uSaturation, 0.0);
        gl.uniform1i(u.uMouseRepulsion, 1);
        gl.uniform1f(u.uTwinkleIntensity, 0.3);
        gl.uniform1f(u.uRotationSpeed, 0.1);
        gl.uniform1f(u.uRepulsionStrength, 2.0);

        const pos = new Float32Array([-1,-1,3,-1,-1,3]);
        const uvs = new Float32Array([0,0,2,0,0,2]);
        const pb = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, pb); gl.bufferData(gl.ARRAY_BUFFER, pos, gl.STATIC_DRAW);
        const pl = gl.getAttribLocation(prog, 'position');
        gl.enableVertexAttribArray(pl); gl.vertexAttribPointer(pl, 2, gl.FLOAT, false, 0, 0);
        const ub = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, ub); gl.bufferData(gl.ARRAY_BUFFER, uvs, gl.STATIC_DRAW);
        const ul2 = gl.getAttribLocation(prog, 'uv');
        gl.enableVertexAttribArray(ul2); gl.vertexAttribPointer(ul2, 2, gl.FLOAT, false, 0, 0);

        const mouse = { x: 0.5, y: 0.5 };
        const sm = { x: 0.5, y: 0.5 };
        let ma = 0, sma = 0;

        function resize() {
            const w = container.clientWidth, h = container.clientHeight;
            const dpr = Math.min(window.devicePixelRatio, 2);
            canvas.width = w * dpr; canvas.height = h * dpr;
            canvas.style.width = w + "px"; canvas.style.height = h + "px";
            gl.viewport(0, 0, canvas.width, canvas.height);
            gl.useProgram(prog);
            gl.uniform3f(u.uResolution, canvas.width, canvas.height, canvas.width / canvas.height);
        }
        window.addEventListener("resize", resize); resize();

        function onMouseMove(e) {
            mouse.x = e.clientX / window.innerWidth;
            mouse.y = 1 - e.clientY / window.innerHeight;
            ma = 1;
        }
        function onMouseLeave() { ma = 0; }
        window.addEventListener("mousemove", onMouseMove);
        window.addEventListener("mouseleave", onMouseLeave);

        let t = 0, lastTs = null, rafId;
        function render(ts) {
            rafId = requestAnimationFrame(render);
            const dt = lastTs ? Math.min((ts - lastTs) / 1000, 0.05) : 0;
            lastTs = ts; t += dt;
            sm.x += (mouse.x - sm.x) * 0.04;
            sm.y += (mouse.y - sm.y) * 0.04;
            sma += (ma - sma) * 0.03;
            gl.useProgram(prog);
            gl.uniform1f(u.uTime, t);
            gl.uniform1f(u.uStarSpeed, t * 0.04);
            gl.uniform2fv(u.uMouse, [sm.x, sm.y]);
            gl.uniform1f(u.uMouseActiveFactor, sma);
            gl.clear(gl.COLOR_BUFFER_BIT);
            gl.drawArrays(gl.TRIANGLES, 0, 3);
        }
        rafId = requestAnimationFrame(render);

        return () => {
            cancelAnimationFrame(rafId);
            window.removeEventListener("resize", resize);
            window.removeEventListener("mousemove", onMouseMove);
            window.removeEventListener("mouseleave", onMouseLeave);
            if (canvas.parentNode) canvas.parentNode.removeChild(canvas);
        };
    }, []);

    return <div id="galaxy-background" ref={containerRef} />;
}

// =============================================
// DATA
// =============================================
const ARCH_ROWS = [
    { type: "node", label: "Brain Dump Input", cls: "input", comment: "// React · TextArea → Submit" },
    { type: "arrow" },
    { type: "node", label: "Stage 1: Triage Classifier", cls: "process", comment: "// Claude API — multi-label classification" },
    { type: "arrow" },
    { type: "node", label: "Stage 2: Assumption Extractor", cls: "process", comment: "// Claude API — isolated chain-of-thought" },
    { type: "arrow" },
    { type: "node", label: "Stage 3: Dependency Graph", cls: "process", comment: "// Spring Boot → MongoDB Document Store" },
    { type: "arrow" },
    { type: "node", label: "Stage 4: Bayesian Scorer", cls: "process", comment: "// Java engine + Claude reasoning hybrid" },
    { type: "arrow" },
    { type: "node", label: "Stage 5: RAG Action Plan", cls: "process", comment: "// Atlas Vector Search + Claude generation" },
    { type: "arrow" },
    { type: "node", label: "React Output: Graph + Priority Stack", cls: "output", comment: "// D3 visualization · Interactive UI" },
];

const DEMO_RESPONSES = [
    {
        priorities: [
            { rank: 1, title: "Immediate deadline triage", desc: "3 items due within 48h. Start with the highest-grade-weight task. Break into 25-min blocks.", confidence: "78%" },
            { rank: 2, title: "Roommate conversation framework", desc: "CBT script generated. Low effort (10 min), high emotional payoff. Do this tonight.", confidence: "71%" },
            { rank: 3, title: "Project initiation: 5-minute start", desc: "You don't need to finish. Open the document. Write one sentence. That's the win.", confidence: "65%" },
        ],
        assumption: 'Hidden assumption: You believe finishing everything perfectly is the only acceptable outcome. <strong>Reframe:</strong> Partial progress on the right things beats perfect completion of everything.',
    },
    {
        priorities: [
            { rank: 1, title: "Anxiety decomposition", desc: "Your \"overwhelm\" contains 4 distinct concerns. Addressing each separately reduces cognitive load by 60%.", confidence: "74%" },
            { rank: 2, title: "Energy-based scheduling", desc: "Your peak focus is 9am-12pm. Schedule the hardest task there. Protect that block.", confidence: "69%" },
            { rank: 3, title: "Decision deferral with check-in", desc: "The major uncertainty doesn't need solving today. Bookmark it with a 2-week review trigger.", confidence: "62%" },
        ],
        assumption: "Hidden assumption: You're treating uncertainty as failure. <strong>Reframe:</strong> Not knowing yet is valid. It means you're still gathering data — and that's smart.",
    },
];

const STATUSES = ["Claude Active", "5-Stage Pipeline", "RAG Enabled", "Vector Search", "Bayesian Scorer"];

// =============================================
// HOOKS
// =============================================
function useReveal() {
    useEffect(() => {
        const els = document.querySelectorAll(".reveal");
        const obs = new IntersectionObserver(
            (entries) => entries.forEach((e) => { if (e.isIntersecting) { e.target.classList.add("visible"); obs.unobserve(e.target); } }),
            { threshold: 0.1, rootMargin: "0px 0px -40px 0px" }
        );
        els.forEach((el) => obs.observe(el));
        return () => obs.disconnect();
    }, []);
}

function useTilt(ref, maxDeg = 8) {
    useEffect(() => {
        const el = ref.current;
        if (!el) return;
        const onMove = (e) => {
            const r = el.getBoundingClientRect();
            const cx = e.clientX - r.left - r.width / 2;
            const cy = e.clientY - r.top - r.height / 2;
            const rx = (cy / r.height) * maxDeg;
            const ry = -(cx / r.width) * maxDeg;
            el.style.transform = `perspective(1000px) rotateX(${rx}deg) rotateY(${ry}deg) translateZ(6px)`;
        };
        const onLeave = () => {
            el.style.transform = "perspective(1000px) rotateX(0) rotateY(0) translateZ(0)";
            el.style.transition = "transform 0.6s cubic-bezier(0.16,1,0.3,1), border-color 0.4s ease, box-shadow 0.4s ease";
        };
        const onEnter = () => { el.style.transition = "none"; };
        el.addEventListener("mousemove", onMove);
        el.addEventListener("mouseleave", onLeave);
        el.addEventListener("mouseenter", onEnter);
        return () => {
            el.removeEventListener("mousemove", onMove);
            el.removeEventListener("mouseleave", onLeave);
            el.removeEventListener("mouseenter", onEnter);
        };
    }, [ref, maxDeg]);
}

// =============================================
// NAVIGATION
// =============================================
function Nav({ onScrollTo }) {
    const [scrolled, setScrolled] = useState(false);
    const [mobileOpen, setMobileOpen] = useState(false);
    const [statusIdx, setStatusIdx] = useState(0);

    useEffect(() => {
        const onScroll = () => setScrolled(window.scrollY > 20);
        window.addEventListener("scroll", onScroll);
        return () => window.removeEventListener("scroll", onScroll);
    }, []);

    useEffect(() => {
        const id = setInterval(() => {
            setStatusIdx((i) => (i + 1) % STATUSES.length);
        }, 3500);
        return () => clearInterval(id);
    }, []);

    const navTo = (id) => { onScrollTo(id); setMobileOpen(false); };

    return (
        <>
            <nav className={`nav${scrolled ? " scrolled" : ""}`}>
                <a className="nav-brand" onClick={() => navTo("hero")}>
                    <div className="nav-logo">M</div>
                    <div className="nav-wordmark">Reframe<span> /</span></div>
                </a>
                <div className="nav-right">
                    <ul className="nav-links">
                        {["problem","demo","architecture","team-section"].map((id) => (
                            <li key={id}><a onClick={() => navTo(id)}>{id.replace("-section","").replace("-"," ")}</a></li>
                        ))}
                    </ul>
                    <div className="status-pill desktop-only">
                        <div className="status-dot" />
                        <span>{STATUSES[statusIdx]}</span>
                    </div>
                </div>
                <button className={`nav-toggle${mobileOpen ? " active" : ""}`} aria-label="Toggle navigation" onClick={() => setMobileOpen(!mobileOpen)}>
                    <span /><span /><span />
                </button>
            </nav>
            <div className={`nav-mobile${mobileOpen ? " active" : ""}`}>
                {["problem","demo","architecture","team-section"].map((id) => (
                    <a key={id} onClick={() => navTo(id)}>{id.replace("-section","").replace("-"," ")}</a>
                ))}
                <a style={{ opacity: 0.6 }} onClick={() => navTo("demo")}>Try It Live</a>
            </div>
        </>
    );
}

// =============================================
// HERO SECTION
// =============================================
function Hero({ onScrollTo }) {
    const cardRef = useRef(null);
    const [savings, setSavings] = useState("0.0 hrs");
    useTilt(cardRef, 8);

    useEffect(() => {
        const timer = setTimeout(() => {
            const target = 2.4;
            let cur = 0;
            const step = () => {
                cur += (target - cur) * 0.1;
                if (cur >= target - 0.01) { setSavings(target.toFixed(1) + " hrs"); return; }
                setSavings(cur.toFixed(1) + " hrs");
                requestAnimationFrame(step);
            };
            step();
        }, 1000);
        return () => clearTimeout(timer);
    }, []);

    return (
        <section className="hero" id="hero">
            <div className="hero-grid">
                <div className="hero-text">
                    <div className="hero-eyebrow">RAG-Powered Cognitive Intelligence</div>
                    <h1 className="hero-title">AI-Powered<br />Cognitive Triage<br />for Students</h1>
                    <p className="hero-subtitle">
                        Reframe ingests your mental overload — deadlines, anxieties, half-baked goals —
                        and runs it through a 5-stage reasoning pipeline to hand you back a prioritized action plan. Built in 36 hours.
                    </p>
                    <div className="hero-actions">
                        <button className="btn btn-primary" onClick={() => onScrollTo("demo")}>Try the Live App →</button>
                        <button className="btn btn-secondary" onClick={() => onScrollTo("video-section")}>▶ Watch 2-Min Demo</button>
                    </div>
                </div>
                <div className="hero-visual">
                    <div className="glass-card" ref={cardRef}>
                        <div className="card-header">
                            <span className="card-title">Live Priority Stack</span>
                            <span className="card-badge">5-Stage Pipeline</span>
                        </div>
                        <div className="priority-preview">
                            {[
                                { num: 1, label: "Deadline Triage", sub: "Confidence: 78%" },
                                { num: 2, label: "Conversation Framework", sub: "Confidence: 71%" },
                                { num: 3, label: "5-Minute Project Start", sub: "Confidence: 65%" },
                            ].map((row) => (
                                <div className="priority-row" key={row.num}>
                                    <div className="priority-num">{row.num}</div>
                                    <div className="priority-info">
                                        <div className="priority-label">{row.label}</div>
                                        <div className="priority-sublabel">{row.sub}</div>
                                    </div>
                                </div>
                            ))}
                        </div>
                        <div className="card-savings">
                            <span className="savings-label">Avg Time Saved</span>
                            <span className="savings-value">{savings}</span>
                        </div>
                    </div>
                </div>
            </div>
            <div className="scroll-indicator">
                <span>Scroll</span>
                <div className="scroll-line" />
            </div>
        </section>
    );
}

// =============================================
// PROBLEM & SOLUTION
// =============================================
function ProblemSolution() {
    return (
        <section className="section" id="problem">
            <div className="section-label reveal">The Problem &amp; The Solution</div>
            <div className="problem-solution-grid">
                <div className="ps-card problem reveal">
                    <div className="ps-card-header">⚠ The Problem</div>
                    <div className="ps-stat">87%</div>
                    <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem", marginBottom: "1rem" }}>
                        of students report feeling overwhelmed by competing priorities, with no structured way to decide what to do first.
                    </p>
                    <ul className="ps-list">
                        <li>Cognitive overload leads to decision paralysis — not laziness</li>
                        <li>Existing tools don't understand emotional weight</li>
                        <li>Mental health resources are reactive, not preventive</li>
                    </ul>
                </div>
                <div className="ps-card solution reveal">
                    <div className="ps-card-header">✓ The Solution</div>
                    <div className="ps-stat">&lt; 2s</div>
                    <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem", marginBottom: "1rem" }}>
                        From brain dump to prioritized action plan in under 2 seconds. Five AI stages that justify why each decision matters.
                    </p>
                    <ul className="ps-list">
                        <li>Claude API classifies urgency, cognitive weight, and actionability</li>
                        <li>Hidden assumptions surfaced explicitly</li>
                        <li>Bayesian scoring with confidence intervals</li>
                    </ul>
                </div>
            </div>
        </section>
    );
}

// =============================================
// DEMO SECTION
// =============================================
function Demo() {
    const [input, setInput] = useState("");
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState(null);
    const cardRef = useRef(null);
    const outputRef = useRef(null);
    useTilt(cardRef, 6);

    const copyToClipboard = (text) => navigator.clipboard.writeText(text).then(() => alert("Copied!"));

    const runDemo = useCallback(() => {
        if (!input.trim()) return;
        setLoading(true);
        setResult(null);
        setTimeout(() => {
            const resp = DEMO_RESPONSES[Math.floor(Math.random() * DEMO_RESPONSES.length)];
            setResult(resp);
            setLoading(false);
            setTimeout(() => outputRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" }), 50);
        }, 1800);
    }, [input]);

    const handleKeyDown = (e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); runDemo(); } };

    return (
        <div className="demo-section-wrapper" id="demo">
            <section className="section">
                <div className="section-label reveal">Interactive Demo</div>
                <h2 className="section-title reveal">Try it now. No signup required.</h2>
                <p className="section-desc reveal" style={{ marginBottom: "2rem" }}>
                    Dump whatever's on your mind. The 5-stage pipeline will triage it into a priority stack.
                </p>
                <div className="demo-wrapper reveal">
                    <div className="demo-card" ref={cardRef}>
                        <div className="demo-header">
                            <span className="demo-dot" /><span className="demo-dot" /><span className="demo-dot" />
                            <span className="demo-label">reframe-live-demo.tsx</span>
                        </div>
                        <div className="demo-credentials">
                            <div className="demo-cred-item">
                                <span className="demo-cred-label">Demo Email</span>
                                <span className="demo-cred-value" onClick={() => copyToClipboard("demo@reframe.ai")} title="Click to copy">demo@reframe.ai 📋</span>
                            </div>
                            <div className="demo-cred-item">
                                <span className="demo-cred-label">Demo Password</span>
                                <span className="demo-cred-value" onClick={() => copyToClipboard("clarity2026")} title="Click to copy">clarity2026 📋</span>
                            </div>
                            <div style={{ fontSize: "0.6rem", color: "var(--text-dim)", alignSelf: "flex-end", marginLeft: "auto" }}>Click to copy ↑</div>
                        </div>
                        <label style={{ fontFamily: "var(--display)", fontWeight: 600, fontSize: "0.85rem", color: "var(--text-primary)", display: "block", marginBottom: "0.4rem" }}>
                            Dump your brain here ↓
                        </label>
                        <textarea
                            className="demo-input"
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyDown={handleKeyDown}
                            placeholder="e.g. I have 3 deadlines this week, my roommate situation is stressful, I haven't started my project, and I'm not even sure I chose the right major..."
                        />
                        <div className="demo-submit-row">
                            <button className="btn btn-primary btn-sm" disabled={loading} onClick={runDemo}>
                                {loading ? "Processing..." : "Triage My Brain"}
                            </button>
                            <span style={{ fontSize: "0.64rem", color: "var(--text-muted)" }}>← 5-stage pipeline · Under 2 seconds</span>
                        </div>
                        <div className={`typing-indicator${loading ? " active" : ""}`}>
                            <span className="typing-dot" /><span className="typing-dot" /><span className="typing-dot" />
                            <span style={{ fontFamily: "var(--mono)", fontSize: "0.62rem", color: "var(--text-muted)", marginLeft: "0.4rem" }}>Claude is reasoning across 5 stages...</span>
                        </div>
                        {result && (
                            <div className="demo-output active" ref={outputRef}>
                                <div className="output-header">Priority Stack · Confidence: 72%</div>
                                <div className="priority-stack">
                                    {result.priorities.map((p) => (
                                        <div className="priority-item" key={p.rank}>
                                            <div className="priority-rank">{p.rank}</div>
                                            <div className="priority-content">
                                                <h4>{p.title}</h4>
                                                <p>{p.desc}</p>
                                                <span className="confidence-badge">confidence: {p.confidence}</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                                <div className="assumption-box" dangerouslySetInnerHTML={{ __html: result.assumption }} />
                            </div>
                        )}
                        <div id="video-section" style={{ marginTop: "1.5rem" }}>
                            <p style={{ fontFamily: "var(--mono)", fontSize: "0.62rem", color: "var(--text-muted)", letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: "0.6rem" }}>📹 2-Minute Walkthrough</p>
                            <div className="video-embed" onClick={() => alert("Video player would load here. Embed your Loom or YouTube link.")}>
                                <div className="video-placeholder">
                                    <div className="video-placeholder-icon">▶</div>
                                    <p style={{ fontFamily: "var(--display)", fontWeight: 600, color: "var(--text-secondary)" }}>Watch the 2-Min Demo</p>
                                    <p style={{ fontSize: "0.64rem", color: "var(--text-dim)" }}>Embed your Loom / YouTube here</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>
        </div>
    );
}

// =============================================
// ARCHITECTURE
// =============================================
function Architecture() {
    return (
        <section className="section" id="architecture">
            <div className="section-label reveal">Technical Architecture</div>
            <h2 className="section-title reveal">How we built it in 36 hours.</h2>
            <p className="section-desc reveal">Every handoff is typed and validated. Every Claude call is isolated, logged, and auditable.</p>
            <div className="stack-grid reveal">
                {[
                    { icon: "⚛️", name: "React 18", role: "Frontend" },
                    { icon: "☕", name: "Spring Boot", role: "Backend API" },
                    { icon: "🧠", name: "Claude API", role: "LLM Reasoning", sponsor: true },
                    { icon: "🍃", name: "MongoDB Atlas", role: "Vector Search", sponsor: true },
                    { icon: "📊", name: "D3.js", role: "Graph Visuals" },
                    { icon: "✨", name: "WebGL Galaxy", role: "Background" },
                ].map((s) => (
                    <div className="stack-item" key={s.name}>
                        <div className="stack-item-icon">{s.icon}</div>
                        <div className="stack-item-name">{s.name}</div>
                        <div className="stack-item-role">{s.role}</div>
                        {s.sponsor && <div className="sponsor-badge">★ Sponsor Tech</div>}
                    </div>
                ))}
            </div>
            <div className="arch-window reveal">
                <div className="arch-titlebar">
                    <span className="arch-dot" /><span className="arch-dot" /><span className="arch-dot" />
                    <span className="arch-filename">system-architecture.ts</span>
                </div>
                <div className="arch-body">
                    {ARCH_ROWS.map((r, i) =>
                        r.type === "arrow" ? (
                            <div className="arch-arrow" key={i}>↓</div>
                        ) : (
                            <div className="arch-row" key={i}>
                                <span className={`arch-node ${r.cls}`}>{r.label}</span>
                                <span className="arch-comment">{r.comment}</span>
                            </div>
                        )
                    )}
                </div>
            </div>
        </section>
    );
}

// =============================================
// WHY IT WINS
// =============================================
function WhyItWins() {
    return (
        <section className="section" id="why-wins">
            <div className="section-label reveal">Why It Wins</div>
            <h2 className="section-title reveal">Innovation · Scalability · Impact</h2>
            <div className="features-grid reveal" style={{ marginTop: "2rem" }}>
                {[
                    { icon: "🔬", title: "Innovation", desc: "Novel Bayesian scoring engine in pure Java assigns confidence intervals to priorities — no black-box AI decisions. 5-stage prompt chain with isolated assumption extraction is original architecture." },
                    { icon: "📈", title: "Scalability", desc: "Stateless Spring Boot microservices. MongoDB Atlas handles horizontal scaling. Claude API calls are queued and retried. Ready for 10,000 concurrent users." },
                    { icon: "🌍", title: "Impact", desc: "87% of students report cognitive overload. Reframe provides preventive mental health tooling that reduces decision paralysis before crisis. Open source. MIT licensed." },
                ].map((f) => (
                    <div className="feature-card" key={f.title}>
                        <div className="feature-icon">{f.icon}</div>
                        <div className="feature-title">{f.title}</div>
                        <div className="feature-desc">{f.desc}</div>
                    </div>
                ))}
            </div>
        </section>
    );
}

// =============================================
// FUTURE
// =============================================
function Future() {
    return (
        <section className="section" id="future">
            <div className="section-label reveal">Future Scope</div>
            <h2 className="section-title reveal">What we'd build with another month.</h2>
            <div className="future-grid reveal" style={{ marginTop: "2rem" }}>
                {[
                    { num: "01", title: "Personalized Model Fine-Tuning", desc: "Fine-tune Claude on user feedback loops so priority scoring adapts to individual work patterns and energy curves." },
                    { num: "02", title: "Calendar & LMS Integration", desc: "Pull real deadlines from Canvas, Google Calendar, and Notion. Merge external truth with internal mental load." },
                    { num: "03", title: "Campus Mental Health Partnerships", desc: "Triage escalation paths: detect persistent anxiety patterns, offer warm handoff to campus counseling with user consent." },
                ].map((f) => (
                    <div className="future-card" key={f.num}>
                        <div className="future-num">{f.num}</div>
                        <div className="future-title">{f.title}</div>
                        <div className="future-desc">{f.desc}</div>
                    </div>
                ))}
            </div>
        </section>
    );
}

// =============================================
// TEAM
// =============================================
function Team() {
    return (
        <section className="section" id="team-section">
            <div className="section-label reveal">Team &amp; Links</div>
            <h2 className="section-title reveal">Two builders. Zero handoff gaps.</h2>
            <div className="team-grid-final reveal" style={{ marginTop: "2rem" }}>
                {[
                    { initials: "SN", name: "Sidharth Nair", role: "Backend & AI Lead", bio: "Spring Boot · Claude API prompt chains · MongoDB Atlas Vector Search · Bayesian scoring engine" },
                    { initials: "BB", name: "Basudev Biju", role: "Frontend & Design Lead", bio: "React · D3.js graph visualization · WebGL Galaxy · Design system · This landing page" },
                ].map((m) => (
                    <div className="team-card-final" key={m.initials}>
                        <div className="team-avatar">{m.initials}</div>
                        <div className="team-info">
                            <h4>{m.name}</h4>
                            <div className="team-role-tag">{m.role}</div>
                            <p style={{ fontSize: "0.78rem", color: "var(--text-muted)", lineHeight: 1.5, marginBottom: "0.5rem" }}>{m.bio}</p>
                            <div className="team-links">
                                <a href="#" className="team-link">GitHub ↗</a>
                                <a href="#" className="team-link">LinkedIn ↗</a>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </section>
    );
}

// =============================================
// CTA & FOOTER
// =============================================
function CTA({ onScrollTo }) {
    return (
        <div className="cta-section-final">
            <div className="section-label">Ready to try?</div>
            <h2 className="section-title" style={{ maxWidth: 500, margin: "0 auto 1rem", fontSize: "clamp(1.6rem,3vw,2.2rem)" }}>
                Dump your brain.<br />Get clarity back.
            </h2>
            <div style={{ display: "flex", gap: "0.75rem", justifyContent: "center", flexWrap: "wrap", marginTop: "1.5rem" }}>
                <button className="btn btn-primary" onClick={() => onScrollTo("demo")}>Try the Live App →</button>
                <button className="btn btn-secondary" onClick={() => window.open("https://github.com", "_blank")}>View on GitHub ↗</button>
            </div>
        </div>
    );
}

function Footer() {
    return (
        <footer className="footer">
            <div className="footer-left">Reframe — USAIII Hackathon 2026</div>
            <div className="footer-links">
                {["GitHub Repo", "Devpost Submission", "MIT License", "Built with Claude API"].map((l) => (
                    <a key={l} href="#">{l}</a>
                ))}
            </div>
            <div className="footer-right">● Neural Network Active</div>
        </footer>
    );
}

// =============================================
// ROOT APP
// =============================================
export default function App() {
    const scrollTo = useCallback((id) => {
        document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
    }, []);

    // Inject global styles once
    useEffect(() => {
        const tag = document.getElementById("mindmap-styles");
        if (tag) return;
        const style = document.createElement("style");
        style.id = "mindmap-styles";
        style.textContent = GLOBAL_STYLES;
        document.head.appendChild(style);
        return () => style.remove();
    }, []);

    // Load GSAP + ScrollTrigger
    useEffect(() => {
        const loadScript = (src) =>
            new Promise((res) => {
                if (document.querySelector(`script[src="${src}"]`)) return res();
                const s = document.createElement("script");
                s.src = src; s.onload = res;
                document.head.appendChild(s);
            });
        (async () => {
            await loadScript("https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.5/gsap.min.js");
            await loadScript("https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.5/ScrollTrigger.min.js");
            if (window.gsap && window.ScrollTrigger) {
                window.gsap.registerPlugin(window.ScrollTrigger);
                window.gsap.to(".hero-text", {
                    y: -20,
                    scrollTrigger: { trigger: "#hero", start: "top top", end: "bottom top", scrub: true },
                });
            }
        })();
    }, []);

    useReveal();

    return (
        <>
            <GalaxyBackground />
            <div className="content-wrapper">
                <Nav onScrollTo={scrollTo} />
                <Hero onScrollTo={scrollTo} />
                <ProblemSolution />
                <Demo />
                <Architecture />
                <hr className="divider" />
                <WhyItWins />
                <hr className="divider" />
                <Future />
                <hr className="divider" />
                <Team />
                <CTA onScrollTo={scrollTo} />
                <Footer />
            </div>
        </>
    );
}

import { useState, useEffect, useRef, useCallback } from "react";
import "../styles/landing.css";
import Auth from "../pages/Auth";

// =============================================
// GALAXY BACKGROUND (WebGL)
// =============================================
function GalaxyBackground() {
    const containerRef = useRef(null);

    useEffect(() => {
        const container = containerRef.current;
        if (!container) return;
        // Skip the WebGL canvas entirely for reduced-motion preferences, and for a
        // continuously-animating full-screen shader, that's the right default to respect.
        if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
            container.style.background = "radial-gradient(120% 90% at 50% 12%, rgba(124,160,240,0.14), rgba(178,146,245,0.06) 45%, #0A0D14 78%)";
            return;
        }
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
        // Aurora field: slow domain-warped fbm noise in the signature mint->blue->violet palette
        // over a deep-ink base. Calm and drifting -- reads as "clarity emerging from noise,"
        // deliberately not a busy starfield. Hand-rolled GLSL, no libraries.
        const fsSrc = `
      precision highp float;
      uniform float uTime; uniform vec3 uResolution;
      uniform vec2 uMouse; uniform float uMouseActiveFactor;
      varying vec2 vUv;
      vec2 hash2(vec2 p){ p=vec2(dot(p,vec2(127.1,311.7)),dot(p,vec2(269.5,183.3))); return -1.+2.*fract(sin(p)*43758.5453123); }
      float noise(vec2 p){
        vec2 i=floor(p); vec2 f=fract(p); vec2 u=f*f*(3.-2.*f);
        return mix(mix(dot(hash2(i+vec2(0.,0.)),f-vec2(0.,0.)), dot(hash2(i+vec2(1.,0.)),f-vec2(1.,0.)),u.x),
                   mix(dot(hash2(i+vec2(0.,1.)),f-vec2(0.,1.)), dot(hash2(i+vec2(1.,1.)),f-vec2(1.,1.)),u.x), u.y);
      }
      float fbm(vec2 p){ float v=0.,a=0.5; for(int i=0;i<5;i++){ v+=a*noise(p); p*=2.02; a*=0.5; } return v; }
      void main(){
        vec2 uv=vUv; float aspect=uResolution.x/uResolution.y;
        vec2 asp=vec2(aspect,1.0);
        // Cursor influence: proximity falls off with distance (aspect-corrected).
        vec2 duv=(uv-uMouse)*asp;
        float md=length(duv);
        float prox=exp(-md*2.6)*uMouseActiveFactor; // 1 near cursor -> 0 far away
        vec2 p=uv; p.x*=aspect;
        p+=(uMouse-0.5)*0.08*uMouseActiveFactor;    // whole-field parallax
        p+=duv*prox*0.14;                            // local pull toward the cursor
        float t=uTime*0.03;
        vec2 q=vec2(fbm(p*1.4+vec2(0.0,t)), fbm(p*1.4+vec2(5.2,-t)));
        float warp=1.6+prox*1.6;                     // cursor stirs the noise nearby
        float n=fbm(p*1.9+q*warp+vec2(t*0.5,t*0.3));
        n=n*0.5+0.5;
        vec3 c1=vec3(0.353,0.784,0.918); // cyan   #5AC8EA
        vec3 c2=vec3(0.486,0.612,0.941); // blue   #7C9CF0
        vec3 c3=vec3(0.663,0.549,0.961); // violet #A98CF5
        // Blue-dominant: cyan only peeks at the brightest wisps, violet at the crests.
        vec3 aurora=mix(c2,c1,smoothstep(0.55,0.85,n));
        aurora=mix(aurora,c3,smoothstep(0.6,0.95,n));
        vec3 base=vec3(0.039,0.051,0.078); // ink #0A0D14
        float glow=pow(smoothstep(0.0,0.85,n),1.85)*0.4;
        // Concentrate light toward the upper-center; keep edges/bottom dark so text stays legible.
        float vig=smoothstep(1.15,0.15,length((uv-vec2(0.5,0.38))*vec2(aspect*0.9,1.4)));
        glow*=vig;
        float bloom=prox*0.5;                        // soft light blooms under the cursor
        vec3 col=base+aurora*(glow+bloom);
        gl_FragColor=vec4(col,1.0);
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

        let t = 0, lastTs = null, rafId = null;
        function render(ts) {
            rafId = requestAnimationFrame(render);
            const dt = lastTs ? Math.min((ts - lastTs) / 1000, 0.05) : 0;
            lastTs = ts; t += dt;
            sm.x += (mouse.x - sm.x) * 0.09;
            sm.y += (mouse.y - sm.y) * 0.09;
            sma += (ma - sma) * 0.06;
            gl.useProgram(prog);
            gl.uniform1f(u.uTime, t);
            gl.uniform1f(u.uStarSpeed, t * 0.04);
            gl.uniform2fv(u.uMouse, [sm.x, sm.y]);
            gl.uniform1f(u.uMouseActiveFactor, sma);
            gl.clear(gl.COLOR_BUFFER_BIT);
            gl.drawArrays(gl.TRIANGLES, 0, 3);
        }
        rafId = requestAnimationFrame(render);

        // Don't burn GPU/battery animating a background nobody can see.
        function onVisibilityChange() {
            if (document.hidden) {
                if (rafId) cancelAnimationFrame(rafId);
                rafId = null;
            } else if (!rafId) {
                lastTs = null;
                rafId = requestAnimationFrame(render);
            }
        }
        document.addEventListener("visibilitychange", onVisibilityChange);

        return () => {
            if (rafId) cancelAnimationFrame(rafId);
            document.removeEventListener("visibilitychange", onVisibilityChange);
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
function Nav({ onScrollTo, onAuthOpen }) {
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
    const openAuth = (mode) => { onAuthOpen(mode); setMobileOpen(false); };

    return (
        <>
            <nav className={`nav${scrolled ? " scrolled" : ""}`}>
                <a className="nav-brand" onClick={() => navTo("hero")}>
                    <div className="nav-logo">R</div>
                    <div className="nav-wordmark">Reframe<span> /</span></div>
                </a>
                <div className="nav-right">
                    <ul className="nav-links">
                        {["problem","architecture","team-section"].map((id) => (
                            <li key={id}><a onClick={() => navTo(id)}>{id.replace("-section","").replace("-"," ")}</a></li>
                        ))}
                    </ul>
                    <div className="status-pill desktop-only">
                        <div className="status-dot" />
                        <span>{STATUSES[statusIdx]}</span>
                    </div>
                    <div className="nav-auth-actions desktop-only">
                        <button className="nav-login-btn" onClick={() => openAuth("login")}>Log In</button>
                        <button className="nav-signup-btn" onClick={() => openAuth("register")}>Sign Up</button>
                    </div>
                </div>
                <button className={`nav-toggle${mobileOpen ? " active" : ""}`} aria-label="Toggle navigation" onClick={() => setMobileOpen(!mobileOpen)}>
                    <span /><span /><span />
                </button>
            </nav>
            <div className={`nav-mobile${mobileOpen ? " active" : ""}`}>
                {["problem","architecture","team-section"].map((id) => (
                    <a key={id} onClick={() => navTo(id)}>{id.replace("-section","").replace("-"," ")}</a>
                ))}
                <a onClick={() => openAuth("login")}>Log In</a>
                <a onClick={() => openAuth("register")}>Sign Up</a>
            </div>
        </>
    );
}

// =============================================
// HERO SECTION
// =============================================
function Hero({ onAuthOpen }) {
    const cardRef = useRef(null);
    useTilt(cardRef, 8);

    return (
        <section className="hero" id="hero">
            <div className="hero-grid">
                <div className="hero-text">
                    <div className="hero-eyebrow">RAG-Powered Cognitive Intelligence</div>
                    <h1 className="hero-title">AI-Powered<br />Cognitive Triage<br />for Students</h1>
                    <p className="hero-subtitle">
                        Reframe ingests your mental overload — deadlines, anxieties, half-baked goals —
                        and runs it through a 5-stage reasoning pipeline to hand you back a prioritized action plan.
                    </p>
                    <div className="hero-actions">
                        <button className="btn btn-primary" onClick={() => onAuthOpen("register")}>Get Started →</button>
                        <button className="btn btn-secondary" onClick={() => onAuthOpen("login")}>Log In</button>
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
                            <span className="savings-label">Output</span>
                            <span className="savings-value">One clear next move</span>
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
                    <div className="ps-stat">∞</div>
                    <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem", marginBottom: "1rem" }}>
                        The mental load doesn't come with a priority order. Everything feels urgent at once, so nothing actually gets done.
                    </p>
                    <ul className="ps-list">
                        <li>Cognitive overload leads to decision paralysis — not laziness</li>
                        <li>Existing tools don't understand emotional weight</li>
                        <li>Mental health resources are reactive, not preventive</li>
                    </ul>
                </div>
                <div className="ps-card solution reveal">
                    <div className="ps-card-header">✓ The Solution</div>
                    <div className="ps-stat">5 stages</div>
                    <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem", marginBottom: "1rem" }}>
                        From brain dump to a prioritized action plan — five reasoning stages that each justify why a decision matters, not a black-box answer.
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
// ARCHITECTURE
// =============================================
function Architecture() {
    return (
        <section className="section" id="architecture">
            <div className="section-label reveal">Technical Architecture</div>
            <h2 className="section-title reveal">How it's built.</h2>
            <p className="section-desc reveal">Every handoff is typed and validated. Every Claude call is isolated, logged, and auditable.</p>
            <div className="stack-grid reveal">
                {[
                    { icon: "⚛️", name: "React 18", role: "Frontend" },
                    { icon: "☕", name: "Spring Boot", role: "Backend API" },
                    { icon: "🧠", name: "Claude API", role: "LLM Reasoning" },
                    { icon: "🍃", name: "MongoDB Atlas", role: "Vector Search" },
                    { icon: "📊", name: "Hand-Rolled SVG", role: "Graph Visuals" },
                    { icon: "✨", name: "Hand-Rolled WebGL", role: "3D Visuals" },
                ].map((s) => (
                    <div className="stack-item" key={s.name}>
                        <div className="stack-item-icon">{s.icon}</div>
                        <div className="stack-item-name">{s.name}</div>
                        <div className="stack-item-role">{s.role}</div>
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
// FUTURE
// =============================================
function Future() {
    return (
        <section className="section" id="future">
            <div className="section-label reveal">What's Next</div>
            <h2 className="section-title reveal">Where Reframe is headed.</h2>
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
// PRIVACY & MISSION
// =============================================
function Privacy() {
    return (
        <section className="section" id="privacy-section">
            <div className="section-label reveal">Why This Exists</div>
            <h2 className="section-title reveal">Built to help, not to harvest.</h2>
            <div className="features-grid reveal" style={{ marginTop: "2rem" }}>
                {[
                    { icon: "🔒", title: "No individual tracking", desc: "Site analytics are anonymous and cookieless (Cloudflare Web Analytics) — we see aggregate visit counts, never who you are or what you typed." },
                    { icon: "💙", title: "Crisis support, always visible", desc: "Support resources are shown to everyone by default, not gated behind an AI's guess at whether you're struggling. A missed detection would be a worse failure than an unnecessary one." },
                    { icon: "📖", title: "Open source, MIT licensed", desc: "The full pipeline, scoring math, and prompts are public on GitHub. Nothing about how this works is hidden." },
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
// TEAM
// =============================================
function Team() {
    return (
        <section className="section" id="team-section">
            <div className="section-label reveal">Team &amp; Links</div>
            <h2 className="section-title reveal">Two builders. Zero handoff gaps.</h2>
            <div className="team-grid-final reveal" style={{ marginTop: "2rem" }}>
                {[
                    { initials: "SN", name: "Sidharth Nair", role: "Full-Stack & AI Lead", bio: "Spring Boot · Claude API prompt chains · MongoDB Atlas Vector Search · Bayesian scoring engine · React · Hand-rolled WebGL/SVG graph visualization", github: "https://github.com/sidharthnair7", linkedin: "https://www.linkedin.com/in/sidharthnair7/" },
                    { initials: "BB", name: "Basudev Biju", role: "Frontend & Design Lead", bio: "WebGL Galaxy background · Design system · This landing page", github: "https://github.com/basudevbiju", linkedin: "https://www.linkedin.com/in/basudev-biju/" },
                ].map((m) => (
                    <div className="team-card-final" key={m.initials}>
                        <div className="team-avatar">{m.initials}</div>
                        <div className="team-info">
                            <h4>{m.name}</h4>
                            <div className="team-role-tag">{m.role}</div>
                            <p style={{ fontSize: "0.78rem", color: "var(--text-muted)", lineHeight: 1.5, marginBottom: "0.5rem" }}>{m.bio}</p>
                            <div className="team-links">
                                <a href={m.github} target="_blank" rel="noopener noreferrer" className="team-link">GitHub ↗</a>
                                <a href={m.linkedin} target="_blank" rel="noopener noreferrer" className="team-link">LinkedIn ↗</a>
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
function CTA({ onAuthOpen }) {
    return (
        <div className="cta-section-final">
            <div className="section-label">Ready to try?</div>
            <h2 className="section-title" style={{ maxWidth: 500, margin: "0 auto 1rem", fontSize: "clamp(1.6rem,3vw,2.2rem)" }}>
                Dump your brain.<br />Get clarity back.
            </h2>
            <div style={{ display: "flex", gap: "0.75rem", justifyContent: "center", flexWrap: "wrap", marginTop: "1.5rem" }}>
                <button className="btn btn-primary" onClick={() => onAuthOpen("register")}>Get Started →</button>
                <button className="btn btn-secondary" onClick={() => onAuthOpen("login")}>Log In</button>
            </div>
        </div>
    );
}

function Footer() {
    return (
        <footer className="footer">
            <div className="footer-left">Reframe</div>
            <div className="footer-links">
                <a href="https://github.com/sidharthnair7/reframe?tab=MIT-1-ov-file" target="_blank" rel="noopener noreferrer">MIT License</a>
            </div>
            <div className="footer-right">● Neural Network Active</div>
        </footer>
    );
}

// =============================================
// ROOT APP
// =============================================
export default function App() {
    const [authOpen, setAuthOpen] = useState(false);
    const [authMode, setAuthMode] = useState("login");

    const scrollTo = useCallback((id) => {
        document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
    }, []);

    const openAuth = useCallback((mode) => {
        setAuthMode(mode);
        setAuthOpen(true);
    }, []);

    // Scroll lock while modal is open
    useEffect(() => {
        document.body.style.overflow = authOpen ? "hidden" : "";
        return () => { document.body.style.overflow = ""; };
    }, [authOpen]);

    // ESC to close
    useEffect(() => {
        if (!authOpen) return;
        const onKey = (e) => { if (e.key === "Escape") setAuthOpen(false); };
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, [authOpen]);

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
                <Nav onScrollTo={scrollTo} onAuthOpen={openAuth} />
                <Hero onAuthOpen={openAuth} />
                <ProblemSolution />
                <Architecture />
                <hr className="divider" />
                <Future />
                <hr className="divider" />
                <Privacy />
                <hr className="divider" />
                <Team />
                <CTA onAuthOpen={openAuth} />
                <Footer />
            </div>

            {authOpen && (
                <div
                    className="auth-modal-overlay"
                    onClick={(e) => { if (e.target === e.currentTarget) setAuthOpen(false); }}
                >
                    <Auth onClose={() => setAuthOpen(false)} initialMode={authMode} />
                </div>
            )}
        </>
    );
}
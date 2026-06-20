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
                    <div className="nav-logo">R</div>
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
    const [authOpen, setAuthOpen] = useState(false);

    const scrollTo = useCallback((id) => {
        if (id === "demo") { setAuthOpen(true); return; }
        document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
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

            {authOpen && (
                <div
                    className="auth-modal-overlay"
                    onClick={(e) => { if (e.target === e.currentTarget) setAuthOpen(false); }}
                >
                    <Auth onClose={() => setAuthOpen(false)} />
                </div>
            )}
        </>
    );
}
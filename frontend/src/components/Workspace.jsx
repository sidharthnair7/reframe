import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { analyzeBrainDump, voiceExchange } from "../api";
import InfiniteMenu from "./InfiniteMenu";
import MemoryGarden from "./MemoryGarden";
import "../styles/workspace.css";

function makeThumbnail(node) {
  const c = document.createElement("canvas");
  c.width = 512; c.height = 512;
  const ctx = c.getContext("2d");
  const score = node.priorityScore > 0 ? node.priorityScore : (node.urgency + node.cognitiveWeight) * 5;
  const hue = score > 70 ? 5 : score > 50 ? 28 : 175;
  const bg = ctx.createRadialGradient(256, 256, 0, 256, 256, 300);
  bg.addColorStop(0, `hsl(${hue},65%,12%)`); bg.addColorStop(1, `hsl(${hue},45%,4%)`);
  ctx.fillStyle = bg; ctx.fillRect(0, 0, 512, 512);
  const frac = Math.min(1, score / 100);
  ctx.strokeStyle = `hsl(${hue},90%,55%)`; ctx.lineWidth = 16; ctx.lineCap = "round";
  ctx.beginPath(); ctx.arc(256, 210, 130, -Math.PI * 0.75, -Math.PI * 0.75 + frac * Math.PI * 1.5); ctx.stroke();
  ctx.fillStyle = "#fff"; ctx.font = "bold 96px system-ui,sans-serif"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
  ctx.fillText(score.toFixed(0), 256, 210);
  ctx.font = "bold 34px system-ui,sans-serif"; ctx.fillStyle = `hsl(${hue},80%,70%)`;
  ctx.fillText(node.category ?? "", 256, 325);
  ctx.font = "22px system-ui,sans-serif"; ctx.fillStyle = "rgba(255,255,255,0.5)";
  const words = (node.text ?? "").split(" "); let line = "", y = 375;
  for (const w of words) {
    const test = line + w + " ";
    if (ctx.measureText(test).width > 380 && line) { ctx.fillText(line.trim(), 256, y); line = w + " "; y += 28; if (y > 450) break; }
    else line = test;
  }
  ctx.fillText(line.trim(), 256, Math.min(y, 450));
  return c.toDataURL("image/jpeg", 0.88);
}

function deduplicateIssues(issues) {
  const sig = text => new Set((text || "").toLowerCase().split(/\W+/).filter(w => w.length > 3));
  const overlap = (a, b) => {
    const aW = sig(a), bW = sig(b);
    const common = [...aW].filter(w => bW.has(w)).length;
    return common / Math.max(aW.size, bW.size, 1);
  };
  const result = [];
  for (const issue of issues) {
    const dupIdx = result.findIndex(existing => {
      const sameCat = existing.category && existing.category === issue.category;
      const textSim = overlap(existing.text, issue.text);
      return (sameCat && textSim > 0.2) || textSim > 0.55;
    });
    if (dupIdx >= 0) {
      const ex = result[dupIdx];
      const useNew = (issue.priorityScore ?? 0) > (ex.priorityScore ?? 0);
      result[dupIdx] = {
        ...(useNew ? issue : ex),
        urgency: Math.max(ex.urgency ?? 0, issue.urgency ?? 0),
        cognitiveWeight: Math.max(ex.cognitiveWeight ?? 0, issue.cognitiveWeight ?? 0),
        priorityScore: Math.max(ex.priorityScore ?? 0, issue.priorityScore ?? 0),
      };
    } else {
      result.push(issue);
    }
  }
  return result;
}

// Phonetic name correction — catches ASR mishearings like "Sedar Nair" → "Sidharth Nair"
const SOUNDEX_CODES = {
  b: "1", f: "1", p: "1", v: "1",
  c: "2", g: "2", j: "2", k: "2", q: "2", s: "2", x: "2", z: "2",
  d: "3", t: "3",
  l: "4",
  m: "5", n: "5",
  r: "6",
};
function soundex(word) {
  const w = (word || "").toLowerCase().replace(/[^a-z]/g, "");
  if (!w) return "";
  const first = w[0].toUpperCase();
  let code = "", prevDigit = SOUNDEX_CODES[w[0]] || "";
  for (let i = 1; i < w.length && code.length < 3; i++) {
    const ch = w[i];
    const digit = SOUNDEX_CODES[ch] || "";
    if (digit && digit !== prevDigit) code += digit;
    if (ch !== "h" && ch !== "w") prevDigit = digit;
  }
  return first + code.padEnd(3, "0");
}
function soundexMatch(codeA, codeB) {
  if (!codeA || !codeB || codeA[0] !== codeB[0]) return false;
  let digitMatches = 0;
  for (let i = 1; i <= 3; i++) if (codeA[i] === codeB[i]) digitMatches++;
  return digitMatches >= 2;
}
function findPhoneticNameMatch(transcriptTokens, nameTokens) {
  const nameCodes = nameTokens.map(soundex);
  const n = nameTokens.length;
  let best = null;
  for (let start = 0; start <= transcriptTokens.length - n; start++) {
    let matches = 0;
    for (let j = 0; j < n; j++) {
      const tWord = transcriptTokens[start + j];
      if (Math.abs(tWord.length - nameTokens[j].length) > 3) continue;
      if (soundexMatch(soundex(tWord), nameCodes[j])) matches++;
    }
    if (matches === n && (!best || matches > best.score)) best = { startIndex: start, endIndex: start + n, score: matches };
  }
  return best;
}
function correctNameInTranscript(transcriptText, displayName) {
  if (!displayName || !transcriptText) return transcriptText;
  const nameTokens = displayName.trim().split(/\s+/);
  const transcriptTokens = transcriptText.split(/\s+/);
  const match = findPhoneticNameMatch(transcriptTokens.map(t => t.toLowerCase()), nameTokens.map(t => t.toLowerCase()));
  if (!match) return transcriptText;
  return [...transcriptTokens.slice(0, match.startIndex), ...nameTokens, ...transcriptTokens.slice(match.endIndex)].join(" ");
}

/* ── Galaxy Background ── */
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
    const fsSrc = `precision highp float;uniform float uTime;uniform vec3 uResolution;uniform vec2 uFocal;uniform vec2 uRotation;uniform float uStarSpeed;uniform float uDensity;uniform float uHueShift;uniform float uSpeed;uniform vec2 uMouse;uniform float uGlowIntensity;uniform float uSaturation;uniform bool uMouseRepulsion;uniform float uTwinkleIntensity;uniform float uRotationSpeed;uniform float uRepulsionStrength;uniform float uMouseActiveFactor;varying vec2 vUv;#define NUM_LAYER 4.0\n#define MAT45 mat2(0.7071,-0.7071,0.7071,0.7071)\nfloat Hash21(vec2 p){p=fract(p*vec2(123.34,456.21));p+=dot(p,p+45.32);return fract(p.x*p.y);}float tri(float x){return abs(fract(x)*2.-1.);}float tris(float x){float t=fract(x);return 1.-smoothstep(0.,1.,abs(2.*t-1.));}float trisn(float x){float t=fract(x);return 2.*(1.-smoothstep(0.,1.,abs(2.*t-1.)))-1.;}vec3 hsv2rgb(vec3 c){vec4 K=vec4(1.,2./3.,1./3.,3.);vec3 p=abs(fract(c.xxx+K.xyz)*6.-K.www);return c.z*mix(K.xxx,clamp(p-K.xxx,0.,1.),c.y);}float Star(vec2 uv,float flare){float d=length(uv);float m=(.05*uGlowIntensity)/d;float rays=smoothstep(0.,1.,1.-abs(uv.x*uv.y*1000.));m+=rays*flare*uGlowIntensity;uv*=MAT45;rays=smoothstep(0.,1.,1.-abs(uv.x*uv.y*1000.));m+=rays*.3*flare*uGlowIntensity;m*=smoothstep(1.,.2,d);return m;}vec3 StarLayer(vec2 uv){vec3 col=vec3(0.);vec2 gv=fract(uv)-.5;vec2 id=floor(uv);for(int y=-1;y<=1;y++)for(int x=-1;x<=1;x++){vec2 si=id+vec2(float(x),float(y));float seed=Hash21(si);float size=fract(seed*345.32);float glossLocal=tri(uStarSpeed/(3.*seed+1.));float flareSize=smoothstep(.9,1.,size)*glossLocal;float red=smoothstep(.2,1.,Hash21(si+1.))+.2;float blu=smoothstep(.2,1.,Hash21(si+3.))+.2;float grn=min(red,blu)*seed;vec3 base=vec3(red,grn,blu);float hue=atan(base.g-base.r,base.b-base.r)/(2.*3.14159)+.5;hue=fract(hue+uHueShift/360.);float sat=length(base-vec3(dot(base,vec3(.299,.587,.114))))*uSaturation;float val=max(max(base.r,base.g),base.b);base=hsv2rgb(vec3(hue,sat,val));vec2 pad=vec2(tris(seed*34.+uTime*uSpeed/10.),tris(seed*38.+uTime*uSpeed/30.))-.5;float star=Star(gv-vec2(float(x),float(y))-pad,flareSize);float twinkle=trisn(uTime*uSpeed+seed*6.2831)*.5+1.;twinkle=mix(1.,twinkle,uTwinkleIntensity);star*=twinkle;col+=star*size*base;}return col;}void main(){vec2 focalPx=uFocal*uResolution.xy;vec2 uv=(vUv*uResolution.xy-focalPx)/uResolution.y;if(uMouseRepulsion){vec2 mp=(uMouse*uResolution.xy-focalPx)/uResolution.y;float md=length(uv-mp);uv+=normalize(uv-mp)*(uRepulsionStrength/(md+.1))*.05*uMouseActiveFactor;}else uv+=(uMouse-.5)*.1*uMouseActiveFactor;uv=mat2(cos(uTime*uRotationSpeed),-sin(uTime*uRotationSpeed),sin(uTime*uRotationSpeed),cos(uTime*uRotationSpeed))*uv;uv=mat2(uRotation.x,-uRotation.y,uRotation.y,uRotation.x)*uv;vec3 col=vec3(0.);for(float i=0.;i<1.;i+=1./NUM_LAYER){float depth=fract(i+uStarSpeed*uSpeed);float scale=mix(20.*uDensity,.5*uDensity,depth);float fade=depth*smoothstep(1.,.9,depth);col+=StarLayer(uv*scale+i*453.32)*fade;}float alpha=length(col);alpha=smoothstep(0.,.3,alpha);alpha=min(alpha,1.);gl_FragColor=vec4(col,alpha);}`;
    const mk = (type, src) => { const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s); return s; };
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
    const pb = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER,pb); gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,3,-1,-1,3]),gl.STATIC_DRAW);
    const pl = gl.getAttribLocation(prog,'position'); gl.enableVertexAttribArray(pl); gl.vertexAttribPointer(pl,2,gl.FLOAT,false,0,0);
    const ub = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER,ub); gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([0,0,2,0,0,2]),gl.STATIC_DRAW);
    const ul2 = gl.getAttribLocation(prog,'uv'); gl.enableVertexAttribArray(ul2); gl.vertexAttribPointer(ul2,2,gl.FLOAT,false,0,0);
    const mouse={x:0.5,y:0.5},sm={x:0.5,y:0.5}; let ma=0,sma=0;
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

/* ── Voice Hook ── */
function useVoice({ onTranscript, onStart, onStop, knownName }) {
  const recRef = useRef(null);
  const [listening, setListening] = useState(false);
  const [supported, setSupported] = useState(false);

  // Keep callbacks in a ref so event handlers always see the latest version
  const cbRef = useRef({ onTranscript, onStart, onStop, knownName });
  useEffect(() => { cbRef.current = { onTranscript, onStart, onStop, knownName }; });

  useEffect(() => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) return;
    setSupported(true);
    const rec = new SR();
    rec.continuous = true; rec.interimResults = true; rec.lang = "en-US";
    rec.onresult = e => {
      let interim = "", final = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const result = e.results[i];
        const name = cbRef.current.knownName;
        let t = result[0].transcript;
        if (name) t = correctNameInTranscript(t, name);
        result.isFinal ? (final += t) : (interim += t);
      }
      cbRef.current.onTranscript({ interim, final });
    };
    rec.onstart = () => { setListening(true); cbRef.current.onStart?.(); };
    rec.onend   = () => { setListening(false); cbRef.current.onStop?.(); };
    rec.onerror = () => { setListening(false); cbRef.current.onStop?.(); };
    recRef.current = rec;
  }, []);
  const toggle = useCallback(() => {
    if (!recRef.current) return;
    listening ? recRef.current.stop() : recRef.current.start();
  }, [listening]);
  const stop  = useCallback(() => { if (recRef.current && listening)  recRef.current.stop();  }, [listening]);
  const start = useCallback(() => { if (recRef.current && !listening) recRef.current.start(); }, [listening]);
  return { listening, supported, toggle, stop, start };
}

const STAGES = [
  ["Triage Classifier",    "Claude API"],
  ["Assumption Extractor", "Claude API"],
  ["Dependency Graph",     "MongoDB"],
  ["Bayesian Scorer",      "Java Engine"],
  ["RAG Action Plan",      "Vector Search"],
];

export default function Workspace() {
  const { logout, user } = useAuth();
  const navigate = useNavigate();

  const [input,   setInput]   = useState("");
  const [interim, setInterim] = useState("");
  const [loading, setLoading] = useState(false);
  const [stage,   setStage]   = useState(-1);
  const [result,  setResult]  = useState(null);
  const [clock,   setClock]   = useState("");
  const [mode,    setMode]    = useState("IDLE");
  const [error,   setError]   = useState("");

  // Voice conversation history for backend
  const [voiceHistory, setVoiceHistory] = useState([]);
  const [aiSpeaking,   setAiSpeaking]   = useState(false);

  // Memory Garden — sessions built live during voice conversation
  const [liveSessions, setLiveSessions] = useState([]);
  const [gardenBadge,  setGardenBadge]  = useState(0);

  useEffect(() => {
    const tick = () => setClock(new Date().toLocaleTimeString("en-US", { hour12: false }));
    tick(); const id = setInterval(tick, 1000); return () => clearInterval(id);
  }, []);

  /* ── Submit brain dump to backend ── */
  const submit = useCallback(async () => {
    const text = (input + interim).trim();
    if (!text || loading) return;
    setLoading(true); setResult(null); setError(""); setMode("PROCESSING"); setStage(0);

    // Animate through stages while waiting
    const iv = setInterval(() => setStage(s => s < STAGES.length - 1 ? s + 1 : s), 500);
    try {
      const data = await analyzeBrainDump({ rawText: text });
      clearInterval(iv);
      setStage(STAGES.length);
      setResult(data);
      setMode("DONE");
    } catch (err) {
      clearInterval(iv);
      setError(err.message || "Analysis failed. Make sure the backend is running.");
      setMode("IDLE");
      setStage(-1);
    } finally {
      setLoading(false);
    }
  }, [input, interim, loading]);

  /* ── Voice Agent ── */
  const silenceTimerRef    = useRef(null);
  const submitRef          = useRef(null);
  const voiceTranscriptRef = useRef("");   // accumulates speech between exchanges
  const voiceHistoryRef    = useRef([]);
  const aiSpeakingRef      = useRef(false);
  const voiceActiveRef     = useRef(false);
  const loadingRef         = useRef(false);
  const toggleVoiceRef     = useRef(null);
  const stopRecRef         = useRef(null);
  const startRecRef        = useRef(null);
  const sendExchangeRef    = useRef(null);
  const voiceTurnCountRef  = useRef(0);   // user turns since last topic was captured

  useEffect(() => { submitRef.current       = submit;       }, [submit]);
  useEffect(() => { voiceHistoryRef.current = voiceHistory; }, [voiceHistory]);
  useEffect(() => { aiSpeakingRef.current   = aiSpeaking;   }, [aiSpeaking]);
  useEffect(() => { loadingRef.current      = loading;      }, [loading]);

  // Play ElevenLabs TTS and resolve when audio finishes
  const playTTS = useCallback(async (text) => {
    setAiSpeaking(true); aiSpeakingRef.current = true;
    try {
      const token = localStorage.getItem("reframe_token");
      const res = await fetch("http://localhost:8080/api/voice/speak", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ text }),
      });
      if (!res.ok) return;
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      await new Promise(resolve => {
        const audio = new Audio(url);
        audio.onended = () => { URL.revokeObjectURL(url); resolve(); };
        audio.onerror = () => { URL.revokeObjectURL(url); resolve(); };
        audio.play().catch(resolve);
      });
    } catch (e) { console.warn("TTS error:", e); }
    finally { setAiSpeaking(false); aiSpeakingRef.current = false; }
  }, []);

  // Send accumulated speech to backend, play response, resume listening
  const sendVoiceExchange = useCallback(async () => {
    const text = voiceTranscriptRef.current.trim();
    voiceTranscriptRef.current = "";
    if (!text || aiSpeakingRef.current) return;
    stopRecRef.current?.();   // pause recognition while we process + play TTS
    voiceTurnCountRef.current += 1;
    const turnCount = voiceTurnCountRef.current;
    // Snapshot user speech before the async boundary (ref may update during await)
    const allUserText = [
      ...voiceHistoryRef.current.filter(t => t.role === "user").map(t => t.content),
      text,
    ].join(". ");
    setVoiceHistory(h => [...h, { role: "user", content: text }]);
    setInterim("");
    try {
      const res = await voiceExchange({ transcript: text, history: voiceHistoryRef.current, speakerName: user?.displayName });
      setVoiceHistory(h => [...h, { role: "assistant", content: res.spokenResponse }]);

      const topicRawText = res.topicText || (turnCount >= 2 ? allUserText : null);
      const shouldFire   = (res.topicComplete && res.topicText) || turnCount >= 2;
      const enoughText   = topicRawText && topicRawText.trim().split(/\s+/).length > 10;

      if (shouldFire && enoughText) {
        voiceTurnCountRef.current = 0;
        // Animate stage panel so the bottom-left lights up
        setStage(0);
        const bgIv = setInterval(() => setStage(s => s < STAGES.length - 1 ? s + 1 : s), 2000);
        analyzeBrainDump({ rawText: topicRawText }).then(data => {
          clearInterval(bgIv);
          setStage(STAGES.length);
          // Merge + deduplicate into sphere
          setResult(prev => {
            const prevIssues = prev?.issues ?? [];
            const prevEdges  = prev?.edges  ?? [];
            const deduped = deduplicateIssues([...prevIssues, ...(data.issues ?? [])]);
            return {
              ...data,
              issues:  deduped,
              edges:   [...prevEdges, ...(data.edges ?? [])],
              summary: `${deduped.length} unique issue(s) captured across topics`,
            };
          });
          setMode("DONE");
          // Add to Memory Garden
          const session = {
            sessionId: data.sessionId ?? `live-${Date.now()}`,
            status: "COMPLETE",
            rawText: topicRawText,
            createdAt: new Date().toISOString(),
            issueCount: data.issues?.length ?? 0,
            _liveResult: data,
          };
          setLiveSessions(prev => [session, ...prev]);
          setGardenBadge(b => b + 1);
        }).catch(() => { clearInterval(bgIv); setStage(-1); });
      }

      await playTTS(res.spokenResponse);

      // Clear conversation display so next topic starts fresh
      if (shouldFire) setVoiceHistory([]);

      // Conversation always continues
      if (voiceActiveRef.current && !loadingRef.current) {
        startRecRef.current?.();
      }
    } catch {
      await playTTS("Sorry, could you say that again?");
      if (voiceActiveRef.current) startRecRef.current?.();
    }
  }, [voiceExchange, playTTS, user]);

  useEffect(() => { sendExchangeRef.current = sendVoiceExchange; }, [sendVoiceExchange]);

  const { listening, supported, toggle: toggleRaw, stop: stopRaw, start: startRaw } = useVoice({
    knownName: user?.displayName,
    onTranscript: ({ interim: im, final: fn }) => {
      if (fn) voiceTranscriptRef.current += fn + " ";  // accumulate, don't fill textarea
      setInterim(im);
      clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = setTimeout(() => sendExchangeRef.current?.(), 2000);
    },
    onStart: () => setMode("LISTENING"),
    onStop:  () => {
      clearTimeout(silenceTimerRef.current);
      setInterim("");
      if (!aiSpeakingRef.current) setMode(m => m === "LISTENING" ? "IDLE" : m);
    },
  });

  useEffect(() => { toggleVoiceRef.current = toggleRaw; }, [toggleRaw]);
  useEffect(() => { stopRecRef.current    = stopRaw;   }, [stopRaw]);
  useEffect(() => { startRecRef.current   = startRaw;  }, [startRaw]);

  const toggleVoice = useCallback(() => {
    if (listening) {
      voiceActiveRef.current  = false;
      voiceTurnCountRef.current = 0;
      toggleRaw();
    } else {
      voiceActiveRef.current  = true;
      voiceTurnCountRef.current = 0;
      toggleRaw();
    }
  }, [listening, toggleRaw]);

  // Auto-comfort message when the 10-15s pipeline starts
  useEffect(() => {
    if (mode !== "PROCESSING") return;
    if (aiSpeakingRef.current || voiceHistoryRef.current.length > 0) return;
    const msg = "I've got what you shared — running the full analysis now. Should take about 10 to 15 seconds. Feel free to keep talking if there's anything else on your mind.";
    playTTS(msg).then(() => {
      setVoiceHistory(prev => prev.length ? prev : [{ role: "assistant", content: msg }]);
    });
  }, [mode, playTTS]);

  const handleLogout = () => { logout(); navigate("/"); };

  const displayInput = input + (listening ? interim : "");
  const statusLabel  = mode === "PROCESSING" ? "Processing" : mode === "LISTENING" ? "Listening" : mode === "DONE" ? "Synced" : "Active";
  const dotClass     = mode === "PROCESSING" ? "processing" : mode === "LISTENING" ? "listening" : "";

  const [view, setView] = useState("workspace");
  const [selectedNode, setSelectedNode] = useState(null);

  const issues = result?.issues ?? [];
  const edges  = result?.edges  ?? [];

  // Build id→text map for edge display
  const nodeMap = Object.fromEntries(issues.map(n => [n.id, n.text?.slice(0, 28) + "…"]));

  // Generate canvas thumbnails once per issues list
  const menuItems = useMemo(() => issues.map(node => ({
    image: makeThumbnail(node),
    title: node.category ?? "",
    description: (node.text ?? "").slice(0, 70),
    link: node.id ?? "#",
    node,
  })), [issues]);

  return (
    <>      <GalaxyBackground />

      <div className="ws-shell">
        {/* TOPBAR */}
        <header className="ws-topbar">
          <div style={{ display: "flex", alignItems: "center" }}>
            <div className="ws-brand">
              <div className="ws-logo-mark">R</div>
              <div className="ws-brand-name">Reframe<span> /</span></div>
            </div>
            <div className="ws-sep" />
            <div className="ws-breadcrumb">Workspace</div>
            <div className="ws-sep" />
            <button
              className={`ws-garden-btn${view === "garden" ? " active" : ""}`}
              onClick={() => { setView(v => v === "garden" ? "workspace" : "garden"); setGardenBadge(0); }}
            >
              {view === "garden" ? "◈ Workspace" : "◈ Garden"}
              {gardenBadge > 0 && <span className="garden-badge">{gardenBadge}</span>}
            </button>
          </div>
          <div className="ws-topbar-right">
            {user && <span style={{ fontFamily: "var(--mono)", fontSize: "0.6rem", color: "var(--text-muted)" }}>{user.email}</span>}
            <div className="status-pill">
              <div className={`status-dot ${dotClass}`} />
              {statusLabel}
            </div>
            <div className="ws-clock">{clock}</div>
            <button className="ws-logout" onClick={handleLogout}>Sign out</button>
          </div>
        </header>

        {/* LEFT PANEL */}
        <div className="panel-left">
          <div className="panel-head">
            <span className="panel-label">Input Stream</span>
            <span className="panel-badge">Brain Dump</span>
          </div>

          <div className="input-area">
            <label className="input-lbl">Dump your brain here ↓</label>
            <textarea
              className="brain-dump"
              value={displayInput}
              onChange={e => setInput(e.target.value)}
              placeholder="e.g. I have 3 deadlines, my roommate situation is stressful, I haven't started my project, and I'm not sure I chose the right major..."
              onKeyDown={e => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) { e.preventDefault(); submit(); } }}
            />
            <div className="input-actions">
              <button className="btn btn-primary" onClick={submit} disabled={loading || !displayInput.trim()}>
                {loading ? "Processing…" : "Triage My Brain →"}
              </button>
              <button
                className={`btn-voice${listening ? " listening" : ""}`}
                onClick={toggleVoice}
                title={!supported ? "Voice not supported in this browser" : listening ? "Stop voice agent" : "Start voice agent"}
              >
                {listening ? "⏹" : "🎙"}
              </button>
            </div>
            <div className="voice-hint">
              {listening ? (
                <>
                  <div className="voice-bars">{[0,1,2,3,4].map(i => <div className="voice-bar" key={i} />)}</div>
                  <span className="voice-text">Listening…</span>
                </>
              ) : (
                <span className="idle-hint">⌘↩ to submit · 🎙 voice agent — speak freely</span>
              )}
            </div>
            {error && (
              <div style={{ marginTop: "0.5rem", padding: "0.6rem 0.8rem", background: "rgba(248,113,113,0.06)", border: "1px solid rgba(248,113,113,0.2)", borderRadius: "8px", fontFamily: "var(--mono)", fontSize: "0.65rem", color: "#f87171" }}>
                {error}
              </div>
            )}
          </div>

          {/* Voice conversation history */}
          {voiceHistory.length > 0 && (
            <div className="voice-history">
              {voiceHistory.map((t, i) => (
                <div key={i} className={`voice-bubble ${t.role === "user" ? "user" : "ai"}`}>{t.content}</div>
              ))}
              {aiSpeaking && (
                <div className="typing-row">
                  <div className="t-dot" /><div className="t-dot" /><div className="t-dot" />
                  <span className="typing-label">Reframe is thinking…</span>
                </div>
              )}
            </div>
          )}

          {/* Pipeline stages */}
          <div className="panel-head" style={{ marginTop: "auto" }}>
            <span className="panel-label">5-Stage Pipeline</span>
            <span className="panel-badge">{stage >= 0 && stage < STAGES.length ? `${stage+1}/5` : stage >= STAGES.length ? "Done" : "Idle"}</span>
          </div>
          <div className="stages-area">
            {STAGES.map(([name, tech], i) => {
              const done = stage > i, active = stage === i;
              return (
                <div className="stage-row" key={name}>
                  <div className={`stage-dot${done?" done":active?" active":""}`} />
                  <span className={`stage-name${done?" done":active?" active":""}`}>{name}</span>
                  <span className={`stage-ticker${active?" active":""}`}>{tech}</span>
                </div>
              );
            })}
            <div className="progress-track">
              <div className={`progress-fill${(loading || (stage >= 0 && stage < STAGES.length))?" animate":""}`} style={stage >= STAGES.length ? { width: "100%" } : {}} />
            </div>
          </div>
        </div>

        {/* CENTER: Garden or Infinite Menu */}
        <div className="panel-center">
          {view === "garden" ? (
            <MemoryGarden
              liveSessions={liveSessions}
              onLoadSession={data => { setResult(data); setView("workspace"); setStage(5); setMode("DONE"); }}
              onClose={() => setView("workspace")}
            />
          ) : issues.length > 0 ? (
            <div className="center-menu-wrap">
              <div className="center-menu-title">
                <span>Issues — drag to rotate · click ↗ to expand</span>
              </div>
              <InfiniteMenu items={menuItems} scale={2.8} onItemClick={item => setSelectedNode(item.node)} />
            </div>
          ) : (
            <div className="center-empty">
              <div className="center-icon">◈</div>
              <div className="center-title">
                {loading ? "Running 5-stage pipeline…" : "Awaiting your brain dump"}
              </div>
              <div className="center-desc">
                {loading
                  ? "Claude is classifying, extracting assumptions, building your dependency graph, scoring, and generating your action plan."
                  : "Type or speak on the left. Your prioritized issues will appear here as an interactive sphere."}
              </div>
              {loading && (
                <div className="typing-row" style={{ marginTop: "0.5rem" }}>
                  <div className="t-dot" /><div className="t-dot" /><div className="t-dot" />
                </div>
              )}
            </div>
          )}

          {/* HUD corners */}
          <div className="center-hud" style={{ pointerEvents: "none" }}>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <div className="hud-meta">Neural Core · Reframe</div>
              <div className="hud-meta">LIVE</div>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
              <div className="mode-tag">
                <div className={`status-dot ${dotClass}`} style={{ width: "4px", height: "4px" }} />
                {mode === "PROCESSING" ? "5-Stage Pipeline Running" : mode === "DONE" ? "Analysis Complete" : mode === "LISTENING" ? "Voice Active" : "Cognitive Rendering Engine"}
              </div>
              <div className="hud-meta">RAG · Bayesian · Claude Sonnet 4.6</div>
            </div>
          </div>
        </div>

        {/* RIGHT PANEL: summary + graph edges */}
        <div className="panel-right">
          <div className="panel-head" style={{ flexShrink: 0 }}>
            <span className="panel-label">Analysis</span>
            {result && <span className="panel-badge" style={{ color: "var(--text-secondary)", borderColor: "var(--border-hover)" }}>
              {issues.length} issues
            </span>}
          </div>

          {!result && !loading && (
            <div className="empty-state">
              <div className="empty-icon">◈</div>
              <div className="empty-title">No analysis yet</div>
              <div className="empty-desc">Dump your mental load on the left, then hit Triage to get your prioritized action stack.</div>
            </div>
          )}

          {loading && (
            <div className="right-scroll">
              <div className="typing-row" style={{ marginTop: "0.5rem" }}>
                <div className="t-dot" /><div className="t-dot" /><div className="t-dot" />
                <span className="typing-label">Claude is reasoning…</span>
              </div>
            </div>
          )}

          {result && (
            <div className="right-scroll fade-up">
              <div className="summary-card">
                <div className="summary-head">Session Summary</div>
                <div className="summary-text">{result.summary}</div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.6rem", marginTop: "0.75rem" }}>
                  <div>
                    <div className="summary-stat">
                      <span className="summary-num">{issues.length}</span>
                      <span className="summary-lbl">issues</span>
                    </div>
                  </div>
                  <div>
                    <div className="summary-stat">
                      <span className="summary-num">{edges.length}</span>
                      <span className="summary-lbl">edges</span>
                    </div>
                  </div>
                  <div>
                    <div className="summary-stat">
                      <span className="summary-num">{issues.filter(n => n.actionPlan).length}</span>
                      <span className="summary-lbl">plans</span>
                    </div>
                  </div>
                  <div>
                    <div className="summary-stat">
                      <span className="summary-num">{result.stageReached?.replace("STAGE_", "") ?? "—"}</span>
                      <span className="summary-lbl">stages</span>
                    </div>
                  </div>
                </div>
              </div>

              {edges.length > 0 && (
                <div className="summary-card" style={{ marginTop: "0" }}>
                  <div className="summary-head">Dependency Graph</div>
                  {edges.slice(0, 8).map((e, i) => (
                    <div className="graph-edge-item" key={i}>
                      <span>{nodeMap[e.fromNodeId] ?? e.fromNodeId?.slice(0, 8)}</span>
                      <span className="edge-type">{e.type === "BLOCKS" ? "→ blocks →" : e.type === "CAUSES" ? "→ causes →" : "↔"}</span>
                      <span>{nodeMap[e.toNodeId] ?? e.toNodeId?.slice(0, 8)}</span>
                    </div>
                  ))}
                </div>
              )}

              <button
                className="btn btn-primary"
                style={{ width: "100%", justifyContent: "center", marginTop: "0.25rem" }}
                onClick={() => { setResult(null); setInput(""); setStage(-1); setMode("IDLE"); setVoiceHistory([]); }}
              >
                New Session →
              </button>
            </div>
          )}
        </div>

        {/* ISSUE DETAIL MODAL */}
        {selectedNode && (
          <div className="issue-overlay" onClick={() => setSelectedNode(null)}>
            <div className="issue-modal" onClick={e => e.stopPropagation()}>
              <button className="issue-modal-close" onClick={() => setSelectedNode(null)}>✕</button>
              <div className="issue-modal-cat">{selectedNode.category}</div>
              <div className="issue-modal-text">{selectedNode.text}</div>
              <div className="issue-modal-chips">
                <span className="issue-chip">{selectedNode.actionability}</span>
                <span className="issue-chip">Urgency {selectedNode.urgency}/10</span>
                <span className="issue-chip">Weight {selectedNode.cognitiveWeight}/10</span>
                {selectedNode.priorityScore > 0 && <span className="issue-chip">Score {selectedNode.priorityScore?.toFixed(1)}</span>}
              </div>
              {selectedNode.hiddenAssumptions?.length > 0 && (
                <div className="issue-modal-section">
                  <div className="issue-modal-sec-head">Hidden Assumptions</div>
                  {selectedNode.hiddenAssumptions.map((a, i) => (
                    <div key={i} className="issue-assumption">"{a}"</div>
                  ))}
                </div>
              )}
              {selectedNode.actionPlan && (
                <div className="issue-modal-section">
                  <div className="issue-modal-sec-head">Action Plan</div>
                  {selectedNode.actionPlan.steps?.map((s, i) => (
                    <div key={i} className="issue-step"><span className="issue-step-num">{i + 1}</span>{s}</div>
                  ))}
                  {selectedNode.actionPlan.timeframe && (
                    <div className="issue-timeframe">⏱ {selectedNode.actionPlan.timeframe}</div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* STATUSBAR */}
        <footer className="ws-statusbar">
          <div className="statusbar-left">
            <div className="statusbar-item live">Reframe — Workspace</div>
            <div className="statusbar-item">Claude Sonnet 4.6</div>
            <div className="statusbar-item">5-Stage Pipeline</div>
          </div>
          <div className="statusbar-item">USAIII Hackathon 2026</div>
        </footer>
      </div>
    </>
  );
}

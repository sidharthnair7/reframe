import { useState, useEffect, useRef, useCallback } from "react";

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

export function useVoice({ onTranscript, onStart, onStop, knownName }) {
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

import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import "../styles/auth.css";

export default function Auth({ onClose }) {
  const [mode, setMode]       = useState("login");
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState("");
  const [form, setForm]       = useState({ firstName: "", lastName: "", email: "", password: "" });

  const { login, register } = useAuth();
  const navigate = useNavigate();

  const set = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      if (mode === "login") {
        await login({ email: form.email, password: form.password });
      } else {
        await register(form);
      }
      navigate("/workspace");
    } catch (err) {
      setError(err.message || "Something went wrong. Try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-card">
      {onClose && (
        <button className="auth-close" onClick={onClose} aria-label="Close">✕</button>
      )}

      <div className="auth-logo">
        <div className="auth-logo-mark">R</div>
        <div className="auth-logo-name">Reframe<span> /</span></div>
      </div>

      <h1 className="auth-heading">
        {mode === "login" ? "Welcome back." : "Get clarity."}
      </h1>
      <p className="auth-sub">
        {mode === "login"
          ? "Sign in to access your cognitive workspace."
          : "Create an account and dump your brain. We'll sort it out."}
      </p>

      <div className="auth-tabs">
        <button className={`auth-tab${mode === "login" ? " active" : ""}`}
          onClick={() => { setMode("login"); setError(""); }}>
          Sign In
        </button>
        <button className={`auth-tab${mode === "register" ? " active" : ""}`}
          onClick={() => { setMode("register"); setError(""); }}>
          Register
        </button>
      </div>

      <form onSubmit={submit}>
        {mode === "register" && (
          <div className="auth-row">
            <div className="auth-field">
              <label>First Name</label>
              <input type="text" value={form.firstName} onChange={set("firstName")} placeholder="Sid" required />
            </div>
            <div className="auth-field">
              <label>Last Name</label>
              <input type="text" value={form.lastName} onChange={set("lastName")} placeholder="Nair" required />
            </div>
          </div>
        )}

        <div className="auth-field">
          <label>Email</label>
          <input type="email" value={form.email} onChange={set("email")} placeholder="you@university.edu" required />
        </div>

        <div className="auth-field">
          <label>Password</label>
          <input type="password" value={form.password} onChange={set("password")}
            placeholder={mode === "register" ? "Min 8 chars, 1 upper, 1 number, 1 symbol" : "••••••••"} required />
        </div>

        {error && <div className="auth-error">{error}</div>}

        <button className="auth-btn" type="submit" disabled={loading}>
          {loading ? "Working…" : mode === "login" ? "Sign In →" : "Create Account →"}
        </button>
      </form>

      <div className="auth-footer">
        By continuing you agree to our terms. This is a hackathon project — USAIII 2026.
      </div>
    </div>
  );
}

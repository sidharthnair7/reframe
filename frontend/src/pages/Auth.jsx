import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import "../styles/auth.css";

function EyeIcon({ visible }) {
  return visible ? (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8Z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  ) : (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
      <line x1="1" y1="1" x2="23" y2="23" />
    </svg>
  );
}

export default function Auth({ onClose, initialMode = "login" }) {
  const [mode, setMode]       = useState(initialMode);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState("");
  const [form, setForm]       = useState({ firstName: "", lastName: "", email: "", password: "", country: "" });
  const [showPassword, setShowPassword] = useState(false);

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

        {mode === "register" && (
          <div className="auth-field">
            <label>Country</label>
            <select value={form.country} onChange={set("country")} required>
              <option value="" disabled>Select your country</option>
              <option value="US">United States</option>
              <option value="CA">Canada</option>
              <option value="GB">United Kingdom</option>
              <option value="IE">Ireland</option>
              <option value="AU">Australia</option>
              <option value="NZ">New Zealand</option>
              <option value="IN">India</option>
              <option value="OTHER">Other</option>
            </select>
            <span className="auth-hint">Used to show the right crisis support line if you ever need one.</span>
          </div>
        )}

        <div className="auth-field">
          <label>Email</label>
          <input type="email" value={form.email} onChange={set("email")} placeholder="you@university.edu" required />
        </div>

        <div className="auth-field">
          <label>Password</label>
          <div className="auth-password-wrap">
            <input
              type={showPassword ? "text" : "password"}
              value={form.password}
              onChange={set("password")}
              placeholder={mode === "register" ? "Min 8 chars, 1 upper, 1 number, 1 symbol" : "••••••••"}
              required
            />
            <button
              type="button"
              className="auth-password-toggle"
              onClick={() => setShowPassword(v => !v)}
              aria-label={showPassword ? "Hide password" : "Show password"}
              tabIndex={-1}
            >
              <EyeIcon visible={showPassword} />
            </button>
          </div>
        </div>

        {error && <div className="auth-error">{error}</div>}

        <button className="auth-btn" type="submit" disabled={loading}>
          {loading ? "Working…" : mode === "login" ? "Sign In →" : "Create Account →"}
        </button>
      </form>

      <div className="auth-footer">
        By continuing you agree to our terms.
      </div>
    </div>
  );
}

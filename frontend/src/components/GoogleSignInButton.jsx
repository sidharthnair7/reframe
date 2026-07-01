import { useEffect, useRef } from "react";

const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;
const GSI_SRC = "https://accounts.google.com/gsi/client";

// Loads the Google Identity Services script once and reuses it across mounts.
let gsiPromise = null;
function loadGsi() {
  if (gsiPromise) return gsiPromise;
  gsiPromise = new Promise((resolve, reject) => {
    if (window.google?.accounts?.id) return resolve();
    const s = document.createElement("script");
    s.src = GSI_SRC;
    s.async = true;
    s.defer = true;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error("Failed to load Google sign-in."));
    document.head.appendChild(s);
  });
  return gsiPromise;
}

/**
 * Renders the official Google button. On success it hands the ID token (credential) up via
 * onCredential. Renders nothing if VITE_GOOGLE_CLIENT_ID isn't configured, so the app degrades
 * gracefully before the OAuth client exists.
 */
export default function GoogleSignInButton({ onCredential, onError }) {
  const ref = useRef(null);

  useEffect(() => {
    if (!CLIENT_ID) return;
    let cancelled = false;

    loadGsi()
      .then(() => {
        if (cancelled || !ref.current) return;
        window.google.accounts.id.initialize({
          client_id: CLIENT_ID,
          callback: (response) => {
            if (response?.credential) onCredential(response.credential);
            else onError?.("Google sign-in was cancelled.");
          },
        });
        window.google.accounts.id.renderButton(ref.current, {
          theme: "outline",
          size: "large",
          shape: "pill",
          text: "continue_with",
          width: 280,
        });
      })
      .catch((e) => onError?.(e.message));

    return () => { cancelled = true; };
  }, [onCredential, onError]);

  if (!CLIENT_ID) return null;

  return (
    <div className="google-signin">
      <div className="google-signin-divider"><span>or</span></div>
      <div className="google-signin-btn" ref={ref} />
    </div>
  );
}

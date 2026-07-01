import { createContext, useContext, useState, useCallback, useEffect } from "react";
import { login as apiLogin, register as apiRegister, googleLogin as apiGoogleLogin, getProfile } from "../api";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [token, setToken]     = useState(() => localStorage.getItem("reframe_token"));
  const [user, setUser]       = useState(null);
  // True while we're checking a stored token — prevents routing before we know auth state
  const [authLoading, setAuthLoading] = useState(!!localStorage.getItem("reframe_token"));

  // On mount: if a token exists, validate it with the backend
  useEffect(() => {
    const stored = localStorage.getItem("reframe_token");
    if (!stored) return;
    getProfile()
      .then(profile => { setUser(profile); })
      .catch(() => {
        localStorage.removeItem("reframe_token");
        setToken(null);
      })
      .finally(() => setAuthLoading(false));
  }, []);

  const saveToken = useCallback((t) => {
    localStorage.setItem("reframe_token", t);
    setToken(t);
  }, []);

  const login = useCallback(async (credentials) => {
    const data = await apiLogin(credentials);
    saveToken(data.token);
    const profile = await getProfile();
    setUser(profile);
    return profile;
  }, [saveToken]);

  // Registration no longer logs the user in -- the account must verify its email first.
  // Returns the backend's { message } so the UI can tell the user to check their inbox.
  const register = useCallback(async (fields) => {
    return apiRegister(fields);
  }, []);

  const loginWithGoogle = useCallback(async (credential) => {
    const data = await apiGoogleLogin(credential);
    saveToken(data.token);
    const profile = await getProfile();
    setUser(profile);
    return profile;
  }, [saveToken]);

  const logout = useCallback(() => {
    localStorage.removeItem("reframe_token");
    setToken(null);
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ token, user, login, register, loginWithGoogle, logout, isAuthed: !!token, authLoading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}

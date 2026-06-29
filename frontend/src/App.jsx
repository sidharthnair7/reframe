import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import LandingPage from "./components/LandingPage";
import Workspace from "./components/Workspace";
import CrisisResourceBar from "./components/CrisisResourceBar";

function ProtectedRoute({ children }) {
  const { isAuthed, authLoading } = useAuth();
  if (authLoading) return null;
  return isAuthed ? children : <Navigate to="/" replace />;
}

function LandingRoute({ children }) {
  const { isAuthed, authLoading } = useAuth();
  if (authLoading) return null;
  return isAuthed ? <Navigate to="/workspace" replace /> : children;
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<LandingRoute><LandingPage /></LandingRoute>} />
          <Route path="/workspace" element={<ProtectedRoute><Workspace /></ProtectedRoute>} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
        <CrisisResourceBar />
      </BrowserRouter>
    </AuthProvider>
  );
}

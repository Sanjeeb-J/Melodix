import { Routes, Route, Navigate } from "react-router-dom";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import ProtectedRoute from "./components/ProtectedRoute";
import { ToastProvider } from "./components/ToastContainer";
import InstallPWA from "./components/InstallPWA";

function App() {
  return (
    <ToastProvider>
      <InstallPWA />
      <Routes>
        <Route path="/" element={<Auth />} />;
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          }
        />
      </Routes>
    </ToastProvider>
  );
}

export default App;

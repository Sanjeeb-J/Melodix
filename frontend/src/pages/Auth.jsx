import { useState } from "react";
import "../styles/Auth.css";
import { loginUser, registerUser } from "../services/authService";
import { useNavigate } from "react-router-dom";
import {
  Mail,
  Lock,
  Eye,
  EyeOff,
  User,
  Loader2,
  CheckCircle2,
  Music,
} from "lucide-react";

// Reusable Input Component
const InputField = ({
  label,
  type,
  placeholder,
  value,
  onChange,
  icon: Icon,
  showPasswordToggle,
  showPassword,
  onPasswordToggle,
  required = true,
  minLength,
}) => (
  <div className="space-y-1.5 group">
    <label className="input-label">{label}</label>
    <div className="relative input-focus-effect rounded-xl transition-all duration-300">
      <div className="input-icon">
        <Icon size={18} />
      </div>
      <input
        type={type}
        required={required}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        minLength={minLength}
        className="auth-input"
      />
      {showPasswordToggle && (
        <button
          type="button"
          onClick={onPasswordToggle}
          className="password-toggle"
        >
          {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
        </button>
      )}
    </div>
  </div>
);

function Auth() {
  const [isLogin, setIsLogin] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [status, setStatus] = useState("idle");
  const navigate = useNavigate();

  const [loginData, setLoginData] = useState({
    email: "",
    password: "",
  });

  const [registerData, setRegisterData] = useState({
    name: "",
    email: "",
    password: "",
  });

  const handleLogin = async (e) => {
    e.preventDefault();
    setStatus("loading");
    try {
      const res = await loginUser(loginData);
      localStorage.setItem("token", res.token);
      setStatus("success");
      setTimeout(() => {
        navigate("/dashboard");
      }, 1000);
    } catch (err) {
      setStatus("idle");
      alert(err.message || "Login failed");
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setStatus("loading");
    try {
      await registerUser(registerData);
      setStatus("success");
      setTimeout(() => {
        alert("Account created! Please sign in.");
        setIsLogin(true);
        setStatus("idle");
      }, 1000);
    } catch (err) {
      setStatus("idle");
      alert(err.message || "Registration failed");
    }
  };

  const toggleMode = () => {
    setIsLogin((prev) => !prev);
    setStatus("idle");
  };

  return (
    <div className="auth-wrapper">
      <div className="auth-container entrance-anim">
        <div className="glass-morphism">
          <div className="auth-content">
            {/* Header */}
            <div className="auth-header">
              <div className="logo-icon">
                <Music size={32} />
              </div>
              <h1 className="auth-title">
                {isLogin ? "Welcome Back" : "Get Started"}
              </h1>
              <p className="auth-subtitle">
                {isLogin
                  ? "Sign in to access your personalized music library"
                  : "Create an account to start building your music collection"}
              </p>
            </div>

            {/* Auth Form */}
            <form
              onSubmit={isLogin ? handleLogin : handleRegister}
              className="auth-form form-transition"
            >
              {!isLogin && (
                <InputField
                  label="Full Name"
                  type="text"
                  placeholder="Your Name"
                  value={registerData.name}
                  onChange={(val) =>
                    setRegisterData({ ...registerData, name: val })
                  }
                  icon={User}
                />
              )}

              <InputField
                label="Email Address"
                type="email"
                placeholder="you@melodix.com"
                value={isLogin ? loginData.email : registerData.email}
                onChange={(val) =>
                  isLogin
                    ? setLoginData({ ...loginData, email: val })
                    : setRegisterData({ ...registerData, email: val })
                }
                icon={Mail}
              />

              <InputField
                label="Password"
                type={showPassword ? "text" : "password"}
                placeholder="••••••••"
                value={isLogin ? loginData.password : registerData.password}
                onChange={(val) =>
                  isLogin
                    ? setLoginData({ ...loginData, password: val })
                    : setRegisterData({ ...registerData, password: val })
                }
                icon={Lock}
                showPasswordToggle={true}
                showPassword={showPassword}
                onPasswordToggle={() => setShowPassword(!showPassword)}
                minLength={isLogin ? undefined : "6"}
              />

              {isLogin && (
                <div className="forgot-password-container">
                  <a href="#" className="forgot-link">
                    Forgot password?
                  </a>
                </div>
              )}

              <button
                type="submit"
                disabled={status !== "idle"}
                className={`auth-button btn-glow ${
                  status === "success" ? "success" : ""
                }`}
              >
                {status === "loading" && (
                  <Loader2 className="animate-spin" size={20} />
                )}
                {status === "success" && <CheckCircle2 size={20} />}
                {status === "idle" && (
                  <>{isLogin ? "Sign In" : "Create Account"}</>
                )}
                {status === "loading" && "Verifying..."}
                {status === "success" && "Success!"}
              </button>
            </form>

            {/* Toggle Link */}
            <div className="toggle-section">
              <p className="toggle-text">
                {isLogin ? "New to Melodix?" : "Already have an account?"}{" "}
                <button onClick={toggleMode} className="toggle-link">
                  {isLogin ? "Create an account" : "Sign in here"}
                </button>
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <footer className="auth-footer-new">
          <p>Powered by Melodix © 2026| Your Premium Music Experience</p>
        </footer>
      </div>
    </div>
  );
}

export default Auth;

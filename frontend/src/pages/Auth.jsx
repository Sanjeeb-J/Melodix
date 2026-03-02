import { useState } from "react";
import { loginUser, registerUser } from "../services/authService";
import { useNavigate } from "react-router-dom";
import { useTheme } from "../context/ThemeContext";
import {
  Mail,
  Lock,
  Eye,
  EyeOff,
  User,
  Loader2,
  CheckCircle2,
  Music,
  Moon,
  Sun
} from "lucide-react";

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
  <div className="flex flex-col gap-2">
    <label className="text-xs font-bold uppercase tracking-widest text-muted opacity-70 ml-1">
      {label}
    </label>
    <div className="relative flex items-center group">
      <div className="absolute left-4 text-muted group-focus-within:text-primary transition-colors">
        <Icon size={18} />
      </div>
      <input
        type={type}
        required={required}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        minLength={minLength}
        className="w-full bg-card border border-subtle rounded-2xl py-3.5 pl-12 pr-4 text-sm outline-none focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all placeholder:text-muted/50"
      />
      {showPasswordToggle && (
        <button
          type="button"
          onClick={onPasswordToggle}
          className="absolute right-4 text-muted hover:text-main transition-colors"
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
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();

  const [loginData, setLoginData] = useState({ email: "", password: "" });
  const [registerData, setRegisterData] = useState({ name: "", email: "", password: "" });

  const handleLogin = async (e) => {
    e.preventDefault();
    setStatus("loading");
    try {
      const res = await loginUser(loginData);
      localStorage.setItem("token", res.token);
      setStatus("success");
      setTimeout(() => navigate("/dashboard"), 1000);
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
        setIsLogin(true);
        setStatus("idle");
      }, 1500);
    } catch (err) {
      setStatus("idle");
      alert(err.message || "Registration failed");
    }
  };

  return (
    <div className="relative min-h-screen w-full flex items-center justify-center p-6 overflow-hidden">
      {/* Background Overlay */}
      <div className="auth-bg-overlay" />

      {/* Theme Toggle */}
      <button 
        onClick={toggleTheme}
        className="fixed top-8 right-8 p-3 rounded-2xl glass-panel hover:scale-110 transition-transform z-50 text-main"
      >
        {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
      </button>

      <div className="w-full max-w-[440px] animate-slide-up z-10">
        <div className="glass-panel rounded-[2.5rem] overflow-hidden">
          <div className="p-8 md:p-12">
            {/* Header */}
            <div className="flex flex-col items-center text-center mb-10">
              <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center text-primary mb-6 animate-zoom-in">
                <Music size={32} />
              </div>
              <h1 className="text-3xl font-black tracking-tight mb-2">
                {isLogin ? "Welcome Back" : "Create Account"}
              </h1>
              <p className="text-muted font-medium text-sm">
                {isLogin 
                  ? "Continue your premium music journey" 
                  : "Join Melodix and start your collection"}
              </p>
            </div>

            {/* Form */}
            <form onSubmit={isLogin ? handleLogin : handleRegister} className="flex flex-col gap-6">
              {!isLogin && (
                <InputField
                  label="Full Name"
                  type="text"
                  placeholder="John Doe"
                  value={registerData.name}
                  onChange={(val) => setRegisterData({ ...registerData, name: val })}
                  icon={User}
                />
              )}

              <InputField
                label="Email Address"
                type="email"
                placeholder="you@example.com"
                value={isLogin ? loginData.email : registerData.email}
                onChange={(val) => isLogin 
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
                onChange={(val) => isLogin 
                  ? setLoginData({ ...loginData, password: val })
                  : setRegisterData({ ...registerData, password: val })
                }
                icon={Lock}
                showPasswordToggle
                showPassword={showPassword}
                onPasswordToggle={() => setShowPassword(!showPassword)}
                minLength={!isLogin ? "6" : undefined}
              />

              <button
                type="submit"
                disabled={status !== "idle"}
                className={`mt-4 w-full py-4 rounded-2xl font-bold flex items-center justify-center gap-2 transition-all shadow-lg ${
                  status === 'success' 
                    ? 'bg-green-500 text-white' 
                    : 'bg-primary hover:bg-primary-hover text-white'
                }`}
              >
                {status === "loading" && <Loader2 className="animate-spin" size={20} />}
                {status === "success" && <CheckCircle2 size={20} />}
                {status === "idle" && (isLogin ? "Sign In" : "Create Account")}
              </button>
            </form>

            {/* Toggle Link */}
            <div className="mt-8 pt-8 border-t border-subtle text-center">
              <p className="text-muted text-sm font-medium">
                {isLogin ? "New to Melodix?" : "Already member?"}{" "}
                <button 
                  onClick={() => setIsLogin(!isLogin)} 
                  className="text-primary font-bold hover:underline underline-offset-4"
                >
                  {isLogin ? "Join for free" : "Sign in"}
                </button>
              </p>
            </div>
          </div>
        </div>
        
        <p className="text-center mt-8 text-[10px] font-black uppercase tracking-[0.2em] text-muted opacity-50">
          Powered by Melodix Premium Experience
        </p>
      </div>
    </div>
  );
}

export default Auth;

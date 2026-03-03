import { useState, useContext, useEffect } from "react";
import { loginUser, registerUser } from "../services/authService";
import { useNavigate } from "react-router-dom";
import { Mail, Lock, Eye, EyeOff, User, Loader2, CheckCircle2, Music2 } from "lucide-react";
import { AuthContext } from "../context/AuthContext";

function Auth() {
  const [isLogin, setIsLogin] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [status, setStatus] = useState("idle");
  const [errorMsg, setErrorMsg] = useState("");
   const navigate = useNavigate();
  const { login, token } = useContext(AuthContext);

  useEffect(() => {
    if (token) {
      navigate("/dashboard");
    }
  }, [token, navigate]);

  const [loginData, setLoginData] = useState({ email: "", password: "" });
  const [registerData, setRegisterData] = useState({ name: "", email: "", password: "" });

  const handleLogin = async (e) => {
    e.preventDefault();
    setStatus("loading");
    setErrorMsg("");
    try {
      const res = await loginUser(loginData);
      login(res.token); // sets both localStorage AND AuthContext state
      setStatus("success");
      setTimeout(() => navigate("/dashboard"), 600);
    } catch (err) {
      setStatus("idle");
      setErrorMsg(err.message || "Invalid email or password");
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
      }, 1200);
    } catch (err) {
      setStatus("idle");
      alert(err.message || "Registration failed");
    }
  };

  return (
    <div className="relative min-h-screen flex items-center justify-center p-4 overflow-hidden bg-sp-black">
      {/* Background */}
      <div className="auth-bg" />
      
      {/* Card */}
      <div
        className="relative z-10 w-full max-w-sm p-8 rounded-xl"
        style={{ background: "rgba(18,18,18,0.95)", backdropFilter: "blur(24px)", border: "1px solid rgba(255,255,255,0.08)" }}
      >
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-10 h-10 bg-sp-green rounded-full flex items-center justify-center mb-4">
            <Music2 size={20} className="text-black" />
          </div>
          <h1 className="text-2xl font-black tracking-tight text-white">
            {isLogin ? "Log in to Melodix" : "Sign up for free"}
          </h1>
        </div>

        {/* Form */}
        <form onSubmit={isLogin ? handleLogin : handleRegister} className="space-y-4">
          {!isLogin && (
            <div className="relative">
              <User size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sp-muted" />
              <input
                type="text"
                placeholder="What should we call you?"
                value={registerData.name}
                onChange={(e) => setRegisterData({ ...registerData, name: e.target.value })}
                required
                className="w-full bg-[#2a2a2a] border border-[#3a3a3a] rounded-md py-3 pl-10 pr-4 text-sm text-white placeholder:text-sp-muted outline-none focus:border-sp-green transition-colors"
              />
            </div>
          )}

          <div className="relative">
            <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sp-muted" />
            <input
              type="email"
              placeholder="Email address"
              value={isLogin ? loginData.email : registerData.email}
              onChange={(e) =>
                isLogin
                  ? setLoginData({ ...loginData, email: e.target.value })
                  : setRegisterData({ ...registerData, email: e.target.value })
              }
              required
              className="w-full bg-[#2a2a2a] border border-[#3a3a3a] rounded-md py-3 pl-10 pr-4 text-sm text-white placeholder:text-sp-muted outline-none focus:border-sp-green transition-colors"
            />
          </div>

          <div className="relative">
            <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sp-muted" />
            <input
              type={showPassword ? "text" : "password"}
              placeholder="Password"
              value={isLogin ? loginData.password : registerData.password}
              onChange={(e) =>
                isLogin
                  ? setLoginData({ ...loginData, password: e.target.value })
                  : setRegisterData({ ...registerData, password: e.target.value })
              }
              required
              minLength={!isLogin ? "6" : undefined}
              className="w-full bg-[#2a2a2a] border border-[#3a3a3a] rounded-md py-3 pl-10 pr-10 text-sm text-white placeholder:text-sp-muted outline-none focus:border-sp-green transition-colors"
            />
            <button
              type="button"
              onClick={() => setShowPassword((s) => !s)}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-sp-muted hover:text-white transition-colors"
            >
              {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>

          <button
            type="submit"
            disabled={status !== "idle"}
            className="w-full py-3 rounded-full text-sm font-bold text-black flex items-center justify-center gap-2 transition-all"
            style={{ background: status === "success" ? "#1ed760" : "#1db954" }}
          >
            {status === "loading" && <Loader2 size={18} className="animate-spin" />}
            {status === "success" && <CheckCircle2 size={18} />}
            {status === "idle" && (isLogin ? "Log In" : "Sign Up")}
          </button>

          {errorMsg && (
            <p className="text-red-400 text-sm text-center font-medium">{errorMsg}</p>
          )}
        </form>

        <div className="mt-6 pt-6 border-t border-[rgba(255,255,255,0.08)] text-center">
          <p className="text-sm text-sp-dim">
            {isLogin ? "Don't have an account?" : "Already have an account?"}{" "}
            <button
              onClick={() => setIsLogin((l) => !l)}
              className="text-white font-bold hover:text-sp-green transition-colors underline underline-offset-4"
            >
              {isLogin ? "Sign up here" : "Log in"}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}

export default Auth;

import { useState, useContext, useEffect } from "react";
import { loginUser, registerUser, forgotPassword } from "../services/authService";
import { useNavigate } from "react-router-dom";
import { Mail, Lock, Eye, EyeOff, User, Loader2, CheckCircle2, ArrowLeft } from "lucide-react";
import { AuthContext } from "../context/AuthContext";
import logo from "../assets/logo.png";

function Auth() {
  const [view, setView] = useState("login"); // login, register, forgot
  const [showPassword, setShowPassword] = useState(false);
  const [status, setStatus] = useState("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const navigate = useNavigate();
  const { login, token } = useContext(AuthContext);

  useEffect(() => {
    if (token) {
      navigate("/dashboard");
    }
  }, [token, navigate]);

  const [loginData, setLoginData] = useState({ email: "", password: "" });
  const [registerData, setRegisterData] = useState({ name: "", email: "", password: "" });
  const [forgotEmail, setForgotEmail] = useState("");

  const handleLogin = async (e) => {
    e.preventDefault();
    setStatus("loading");
    setErrorMsg("");
    try {
      const res = await loginUser(loginData);
      login(res.token);
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
    setErrorMsg("");
    try {
      await registerUser(registerData);
      setStatus("success");
      setSuccessMsg("Account created! You can now log in.");
      setTimeout(() => {
        setView("login");
        setStatus("idle");
      }, 1500);
    } catch (err) {
      setStatus("idle");
      setErrorMsg(err.message || "Registration failed");
    }
  };

  const handleForgotPassword = async (e) => {
    e.preventDefault();
    setStatus("loading");
    setErrorMsg("");
    try {
      await forgotPassword(forgotEmail);
      setStatus("success");
      setSuccessMsg("If an account exists, a reset link has been sent.");
      setTimeout(() => {
        setStatus("idle");
      }, 3000);
    } catch (err) {
      setStatus("idle");
      setErrorMsg(err.message || "Failed to send reset link");
    }
  };

  const isLogin = view === "login";
  const isRegister = view === "register";
  const isForgot = view === "forgot";

  return (
    <div className="relative min-h-screen flex flex-col md:flex-row overflow-hidden bg-black text-white">
      {/* Background Decor */}
      <div className="auth-bg" />
      
      {/* Left Side: Branding & Quote */}
      <div className="w-full md:w-1/2 flex flex-col justify-center p-8 md:p-16 z-10">
        <div className="max-w-md animate-in">
          <div className="flex items-center gap-4 mb-8">
             <div className="w-16 h-16 rounded-2xl bg-sp-green/10 flex items-center justify-center border border-sp-green/20">
                <img src={logo} alt="Melodix Logo" className="w-10 h-10 object-contain" />
             </div>
             <h1 className="text-4xl md:text-5xl font-black tracking-tighter auth-gradient-text uppercase">
               Melodix
             </h1>
          </div>
          
          <h2 className="text-3xl md:text-4xl font-bold mb-4 leading-tight italic">
            "Where words fail, <span className="text-sp-green">music speaks.</span>"
          </h2>
          <p className="text-sp-dim text-lg mb-8 max-w-sm">
            Experience music like never before. High fidelity, zero limits. Join our community of music lovers today.
          </p>
          
          <div className="hidden md:flex flex-col gap-6">
            <div className="flex items-start gap-4">
              <div className="mt-1 w-5 h-5 rounded-full bg-sp-green flex items-center justify-center flex-shrink-0">
                <CheckCircle2 size={12} className="text-black" />
              </div>
              <p className="text-sp-dim">Unlimited high-quality streaming</p>
            </div>
             <div className="flex items-start gap-4">
              <div className="mt-1 w-5 h-5 rounded-full bg-sp-green flex items-center justify-center flex-shrink-0">
                <CheckCircle2 size={12} className="text-black" />
              </div>
              <p className="text-sp-dim">Create and share your own playlists</p>
            </div>
          </div>
        </div>
      </div>

      {/* Right Side: Auth Form */}
      <div className="w-full md:w-1/2 flex items-center justify-center p-4 md:p-8 z-10">
        <div className="w-full max-w-md glass-morphism p-8 md:p-12 rounded-[2.5rem] relative overflow-hidden animate-in">
          
          <div className="mb-8">
            <h3 className="text-2xl font-bold mb-2">
              {isLogin && "Welcome Back"}
              {isRegister && "Create Account"}
              {isForgot && "Reset Password"}
            </h3>
            <p className="text-sp-dim text-sm">
              {isLogin && "Enter your credentials to access Melodix"}
              {isRegister && "Join us and start your musical journey"}
              {isForgot && "Enter your email to receive a reset link"}
            </p>
          </div>

          <form 
            onSubmit={isLogin ? handleLogin : isRegister ? handleRegister : handleForgotPassword} 
            className="space-y-5"
          >
            {isRegister && (
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-sp-dim ml-1 uppercase tracking-wider">Full Name</label>
                <div className="relative group">
                  <User size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-sp-muted group-focus-within:text-sp-green transition-colors" />
                  <input
                    type="text"
                    placeholder="John Doe"
                    value={registerData.name}
                    onChange={(e) => setRegisterData({ ...registerData, name: e.target.value })}
                    required
                    className="w-full bg-white/5 border border-white/10 rounded-2xl py-3.5 pl-12 pr-4 text-sm text-white placeholder:text-zinc-600 outline-none focus:border-sp-green/50 focus:bg-white/10 transition-all"
                  />
                </div>
              </div>
            )}

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-sp-dim ml-1 uppercase tracking-wider">Email Address</label>
              <div className="relative group">
                <Mail size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-sp-muted group-focus-within:text-sp-green transition-colors" />
                <input
                  type="email"
                  placeholder="name@example.com"
                  value={isForgot ? forgotEmail : (isLogin ? loginData.email : registerData.email)}
                  onChange={(e) => {
                    if (isForgot) setForgotEmail(e.target.value);
                    else if (isLogin) setLoginData({ ...loginData, email: e.target.value });
                    else setRegisterData({ ...registerData, email: e.target.value });
                  }}
                  required
                  className="w-full bg-white/5 border border-white/10 rounded-2xl py-3.5 pl-12 pr-4 text-sm text-white placeholder:text-zinc-600 outline-none focus:border-sp-green/50 focus:bg-white/10 transition-all"
                />
              </div>
            </div>

            {!isForgot && (
              <div className="space-y-1.5">
                <div className="flex justify-between items-center px-1">
                  <label className="text-xs font-semibold text-sp-dim uppercase tracking-wider">Password</label>
                  {isLogin && (
                    <button 
                      type="button" 
                      onClick={() => setView("forgot")}
                      className="text-[11px] text-sp-green hover:underline"
                    >
                      Forgot password?
                    </button>
                  )}
                </div>
                <div className="relative group">
                  <Lock size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-sp-muted group-focus-within:text-sp-green transition-colors" />
                  <input
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    value={isLogin ? loginData.password : registerData.password}
                    onChange={(e) =>
                      isLogin
                        ? setLoginData({ ...loginData, password: e.target.value })
                        : setRegisterData({ ...registerData, password: e.target.value })
                    }
                    required
                    minLength={isRegister ? 6 : undefined}
                    className="w-full bg-white/5 border border-white/10 rounded-2xl py-3.5 pl-12 pr-12 text-sm text-white placeholder:text-zinc-600 outline-none focus:border-sp-green/50 focus:bg-white/10 transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((s) => !s)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-sp-muted hover:text-white transition-colors"
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={status !== "idle"}
              className="w-full py-4 rounded-2xl text-sm font-bold text-black flex items-center justify-center gap-2 transition-all active:scale-[0.98] mt-4"
              style={{ background: status === "success" ? "#1ed760" : "#1db954" }}
            >
              {status === "loading" && <Loader2 size={18} className="animate-spin" />}
              {status === "success" && <CheckCircle2 size={18} />}
              {status === "idle" && (isLogin ? "Sign In" : isRegister ? "Create Account" : "Send Reset Link")}
            </button>

            {errorMsg && (
              <p className="text-red-400 text-xs text-center font-medium animate-in">{errorMsg}</p>
            )}
            
            {(successMsg && !errorMsg) && (
              <p className="text-sp-green text-xs text-center font-medium animate-in">{successMsg}</p>
            )}
          </form>

          <div className="mt-8 pt-6 border-t border-white/5 text-center">
            {isForgot ? (
              <button
                onClick={() => setView("login")}
                className="text-sp-dim hover:text-white text-sm flex items-center justify-center gap-2 mx-auto transition-colors"
              >
                <ArrowLeft size={16} /> Back to Login
              </button>
            ) : (
              <p className="text-sm text-sp-dim">
                {isLogin ? "Don't have an account?" : "Already have an account?"}{" "}
                <button
                  onClick={() => {
                    setView(isLogin ? "register" : "login");
                    setErrorMsg("");
                    setSuccessMsg("");
                  }}
                  className="text-sp-green font-bold hover:underline ml-1"
                >
                  {isLogin ? "Sign up" : "Log in"}
                </button>
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default Auth;


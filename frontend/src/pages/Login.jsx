import { useState } from "react";
import { loginUser } from "../services/authService";
import { useNavigate } from "react-router-dom";

function Login() {
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });

  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await loginUser({
        email: formData.email.trim(),
        password: formData.password,
      });
      localStorage.setItem("token", res.token);
      navigate("/dashboard");
    } catch (err) {
      alert(err.message);
    }
  };

  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute top-0 left-0 w-full h-full pointer-events-none opacity-40">
        <div className="absolute top-0 right-0 w-full md:w-1/2 h-1/2 bg-indigo-900/20 blur-[100px] rounded-full"></div>
        <div className="absolute bottom-0 left-0 w-full md:w-1/2 h-1/2 bg-purple-900/20 blur-[100px] rounded-full"></div>
      </div>

      <div className="w-full max-w-md bg-zinc-900/30 backdrop-blur-xl p-8 rounded-3xl border border-white/10 shadow-2xl relative z-10 animate-slide-up">
        <div className="flex flex-col items-center mb-8">
          <div className="bg-indigo-600/10 p-3 rounded-2xl mb-4">
            <svg
              width="32"
              height="32"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              className="text-indigo-500"
            >
              <path d="M9 18V5l12-2v13" />
              <circle cx="6" cy="18" r="3" />
              <circle cx="18" cy="16" r="3" />
            </svg>
          </div>
          <h2 className="text-3xl font-black text-white text-center">
            Welcome Back
          </h2>
          <p className="text-zinc-400 text-sm mt-2 text-center">
            Sign in to access your personalized music library
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider ml-1">
              Email Address
            </label>
            <div className="relative group">
              <input
                name="email"
                type="email"
                placeholder="you@melodix.com"
                onChange={handleChange}
                required
                className="w-full bg-black/50 border border-zinc-800 text-white px-4 py-3.5 rounded-xl focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all placeholder:text-zinc-600 group-hover:border-zinc-700"
              />
              <div className="absolute inset-y-0 right-0 flex items-center pr-4 pointer-events-none text-zinc-600">
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <rect width="20" height="16" x="2" y="4" rx="2" />
                  <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
                </svg>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between items-center ml-1">
              <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider">
                Password
              </label>
            </div>
            <div className="relative group">
              <input
                name="password"
                type="password"
                placeholder="••••••••"
                onChange={handleChange}
                required
                className="w-full bg-black/50 border border-zinc-800 text-white px-4 py-3.5 rounded-xl focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all placeholder:text-zinc-600 group-hover:border-zinc-700"
              />
              <div className="absolute inset-y-0 right-0 flex items-center pr-4 pointer-events-none text-zinc-600">
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
                  <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                </svg>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-end">
            <button
              type="button"
              className="text-xs font-bold text-indigo-400 hover:text-indigo-300 transition-colors"
            >
              Forgot password?
            </button>
          </div>

          <button
            type="submit"
            className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-4 rounded-xl shadow-lg shadow-indigo-600/20 active:scale-[0.98] transition-all flex items-center justify-center space-x-2"
          >
            <span>Sign In</span>
          </button>
        </form>

        <div className="mt-8 text-center">
          <p className="text-zinc-500 text-sm">
            New to Melodix?{" "}
            <button
              onClick={() => navigate("/register")}
              className="text-white hover:text-indigo-400 font-bold transition-colors underline decoration-zinc-700 underline-offset-4"
            >
              Create an account
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}

export default Login;

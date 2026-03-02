import React, { useState } from "react";
import "../styles/Auth.css";
import { loginUser, registerUser } from "../services/authService";
import { useNavigate } from "react-router-dom";
import { useTheme } from "../context/ThemeContext";
import { 
    Github, 
    Facebook, 
    Linkedin, 
    Mail, 
    Lock, 
    User, 
    Sun, 
    Moon, 
    Loader2, 
    Music2 
} from "lucide-react";

function Auth() {
    const { theme, toggleTheme } = useTheme();
    const [isActive, setIsActive] = useState(false);
    const [status, setStatus] = useState("idle");
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
                setIsActive(false);
                setStatus("idle");
            }, 1000);
        } catch (err) {
            setStatus("idle");
            alert(err.message || "Registration failed");
        }
    };

    return (
        <div className="auth-page-root">
            <div className="auth-bg-container"></div>
            <div className="auth-bg-overlay"></div>

            <div className="theme-switch-wrapper">
                <button className="theme-switch" onClick={toggleTheme}>
                    {theme === 'light' ? <Moon size={20} /> : <Sun size={20} />}
                </button>
            </div>

            <div className={`container ${isActive ? "active" : ""}`} id="container">
                {status === "loading" && (
                    <div className="auth-status-overlay">
                        <span className="loader"></span>
                    </div>
                )}

                <div className="form-container sign-up">
                    <form onSubmit={handleRegister}>
                        <h1>Create Account</h1>
                        <div className="social-icons">
                            <a href="#" className="icon"><Facebook size={20} /></a>
                            <a href="#" className="icon"><Github size={20} /></a>
                            <a href="#" className="icon"><Linkedin size={20} /></a>
                        </div>
                        <span>or use your email for registration</span>
                        <input 
                            type="text" 
                            placeholder="Name" 
                            value={registerData.name}
                            onChange={(e) => setRegisterData({...registerData, name: e.target.value})}
                            required
                        />
                        <input 
                            type="email" 
                            placeholder="Email" 
                            value={registerData.email}
                            onChange={(e) => setRegisterData({...registerData, email: e.target.value})}
                            required
                        />
                        <input 
                            type="password" 
                            placeholder="Password" 
                            value={registerData.password}
                            onChange={(e) => setRegisterData({...registerData, password: e.target.value})}
                            required
                        />
                        <button type="submit">Sign Up</button>
                        <button type="button" className="hidden md:hidden mobile-toggle" onClick={() => setIsActive(false)}>Already have an account? Sign In</button>
                    </form>
                </div>

                <div className="form-container sign-in">
                    <form onSubmit={handleLogin}>
                        <div className="flex items-center gap-2 text-primary mb-4">
                           <Music2 size={32} strokeWidth={3} />
                           <h1 className="!m-0">Melodix</h1>
                        </div>
                        <h1>Sign In</h1>
                        <div className="social-icons">
                            <a href="#" className="icon"><Facebook size={20} /></a>
                            <a href="#" className="icon"><Github size={20} /></a>
                            <a href="#" className="icon"><Linkedin size={20} /></a>
                        </div>
                        <span>or use your email password</span>
                        <input 
                            type="email" 
                            placeholder="Email" 
                            value={loginData.email}
                            onChange={(e) => setLoginData({...loginData, email: e.target.value})}
                            required
                        />
                        <input 
                            type="password" 
                            placeholder="Password" 
                            value={loginData.password}
                            onChange={(e) => setLoginData({...loginData, password: e.target.value})}
                            required
                        />
                        <a href="#">Forgot Your Password?</a>
                        <button type="submit">Sign In</button>
                        <button type="button" className="hidden md:hidden mobile-toggle" onClick={() => setIsActive(true)}>New here? Create Account</button>
                    </form>
                </div>

                <div className="toggle-container">
                    <div className="toggle">
                        <div className="toggle-panel toggle-left">
                            <h1>Welcome Back!</h1>
                            <p>To keep connected with us please login with your personal info</p>
                            <button className="hidden" onClick={() => setIsActive(false)}>Sign In</button>
                        </div>
                        <div className="toggle-panel toggle-right">
                            <h1>Hello, Friend!</h1>
                            <p>Enter your personal details and start your music journey with us</p>
                            <button className="hidden" onClick={() => setIsActive(true)}>Sign Up</button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default Auth;

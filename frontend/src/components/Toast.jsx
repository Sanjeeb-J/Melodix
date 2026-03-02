import { useEffect } from "react";
import { X, CheckCircle2, AlertCircle, Info } from "lucide-react";

const Toast = ({ message, type = "info", onClose, duration = 3000 }) => {
  useEffect(() => {
    if (duration > 0) {
      const timer = setTimeout(onClose, duration);
      return () => clearTimeout(timer);
    }
  }, [duration, onClose]);

  const icons = {
    success: <CheckCircle2 size={20} />,
    error: <AlertCircle size={20} />,
    info: <Info size={20} />,
  };

  const colors = {
    success: "bg-[var(--primary)]",
    error: "bg-[var(--destructive)]",
    info: "bg-[var(--accent)]",
  };

  const textColors = {
    success: "text-[var(--primary-foreground)]",
    error: "text-[var(--destructive-foreground)]",
    info: "text-[var(--accent-foreground)]",
  };

  return (
    <div
      className={`${colors[type]} ${textColors[type]} backdrop-blur-md px-6 py-4 rounded-2xl shadow-2xl flex items-center space-x-4 min-w-[300px] max-w-md animate-slide-up border border-white/10`}
    >
      <div className="flex-shrink-0">{icons[type]}</div>
      <p className="flex-1 font-semibold text-sm">{message}</p>
      <button
        onClick={onClose}
        className="flex-shrink-0 hover:bg-white/20 p-1 rounded-lg transition-colors"
      >
        <X size={18} />
      </button>
    </div>
  );
};

export default Toast;

import { Music } from "lucide-react";

export default function CoverArt({ src, title = "Cover", color = "#1DB954", className = "" }) {
  return (
    <div className={`cover-art ${className}`} style={{ "--cover-color": color }}>
      {src ? <img src={src} alt={title} /> : <Music size={28} />}
    </div>
  );
}

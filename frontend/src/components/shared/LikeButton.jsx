import { Heart } from "lucide-react";

export default function LikeButton({ active = false, onClick, size = 18 }) {
  return (
    <button className={`icon-button like-button ${active ? "active" : ""}`} onClick={onClick} aria-label="Like">
      <Heart size={size} fill={active ? "currentColor" : "none"} />
    </button>
  );
}

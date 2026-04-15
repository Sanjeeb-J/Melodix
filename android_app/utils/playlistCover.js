// Deterministic playlist cover gradient based on ID
const GRADIENTS = [
  'from-[#1db954] to-[#0a4a22]',
  'from-[#8b5cf6] to-[#2e1065]',
  'from-[#f59e0b] to-[#78350f]',
  'from-[#ef4444] to-[#7f1d1d]',
  'from-[#3b82f6] to-[#1e3a8a]',
  'from-[#ec4899] to-[#831843]',
  'from-[#14b8a6] to-[#134e4a]',
  'from-[#f97316] to-[#7c2d12]',
];

export const getPlaylistCover = (id) => {
  if (!id) return GRADIENTS[0];
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = id.charCodeAt(i) + ((hash << 5) - hash);
  }
  return GRADIENTS[Math.abs(hash) % GRADIENTS.length];
};

// Returns solid colors for React Native (no gradient strings needed for LinearGradient)
const GRADIENT_COLORS = [
  ['#1db954', '#0a4a22'],
  ['#8b5cf6', '#2e1065'],
  ['#f59e0b', '#78350f'],
  ['#ef4444', '#7f1d1d'],
  ['#3b82f6', '#1e3a8a'],
  ['#ec4899', '#831843'],
  ['#14b8a6', '#134e4a'],
  ['#f97316', '#7c2d12'],
];

export const getPlaylistGradientColors = (id) => {
  if (!id) return GRADIENT_COLORS[0];
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = id.charCodeAt(i) + ((hash << 5) - hash);
  }
  return GRADIENT_COLORS[Math.abs(hash) % GRADIENT_COLORS.length];
};

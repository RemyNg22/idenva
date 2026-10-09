export const IDENTITY_PALETTE = [
  { bg: "rgba(186, 230, 253, 0.85)", border: "rgba(14, 165, 233, 0.55)", text: "#0369a1" },
  { bg: "rgba(187, 247, 208, 0.85)", border: "rgba(34, 197, 94, 0.55)",  text: "#15803d" },
  { bg: "rgba(254, 240, 138, 0.85)", border: "rgba(234, 179, 8, 0.55)",   text: "#854d0e" },
  { bg: "rgba(254, 205, 211, 0.85)", border: "rgba(244, 63, 94, 0.55)",   text: "#be123c" },
  { bg: "rgba(233, 213, 255, 0.85)", border: "rgba(168, 85, 247, 0.55)",  text: "#6b21a8" },
  { bg: "rgba(254, 215, 170, 0.85)", border: "rgba(249, 115, 22, 0.55)",  text: "#c2410c" },
  { bg: "rgba(199, 210, 254, 0.85)", border: "rgba(99, 102, 241, 0.55)",  text: "#3730a3" },
  { bg: "rgba(153, 246, 228, 0.85)", border: "rgba(20, 184, 166, 0.55)",  text: "#0f766e" },
  { bg: "rgba(245, 208, 254, 0.85)", border: "rgba(217, 70, 239, 0.55)",  text: "#86198f" },
  { bg: "rgba(226, 232, 240, 0.90)", border: "rgba(100, 116, 139, 0.55)", text: "#1e293b" },
];

export function getIdentityTheme(entityId: string) {
  let hash = 0;
  for (let i = 0; i < entityId.length; i++) {
    hash = entityId.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % IDENTITY_PALETTE.length;
  return IDENTITY_PALETTE[index];
}
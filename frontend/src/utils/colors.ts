export const IDENTITY_PALETTE = [
  { bg: "rgba(224, 242, 254, 0.75)", border: "rgba(56, 189, 248, 0.4)", text: "#0369a1" },
  { bg: "rgba(220, 252, 231, 0.75)", border: "rgba(74, 222, 128, 0.4)", text: "#15803d" },
  { bg: "rgba(254, 249, 195, 0.75)", border: "rgba(250, 204, 21, 0.4)", text: "#a16207" },
  { bg: "rgba(253, 204, 207, 0.75)", border: "rgba(251, 113, 133, 0.4)", text: "#be123c" },
  { bg: "rgba(243, 232, 255, 0.75)", border: "rgba(192, 132, 252, 0.4)", text: "#6b21a8" },
  { bg: "rgba(255, 237, 213, 0.75)", border: "rgba(251, 146, 60, 0.4)", text: "#c2410c" },
  { bg: "rgba(224, 231, 255, 0.75)", border: "rgba(129, 140, 248, 0.4)", text: "#4338ca" },
  { bg: "rgba(204, 238, 251, 0.81)", border: "rgba(45, 212, 191, 0.4)", text: "#0f766e" },
  { bg: "rgba(250, 232, 255, 0.75)", border: "rgba(232, 121, 249, 0.4)", text: "#a21caf" },
  { bg: "rgba(241, 245, 249, 0.75)", border: "rgba(148, 163, 184, 0.4)", text: "#334155" },
];

export function getIdentityTheme(entityId: string) {
  let hash = 0;
  for (let i = 0; i < entityId.length; i++) {
    hash = entityId.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % IDENTITY_PALETTE.length;
  return IDENTITY_PALETTE[index];
}
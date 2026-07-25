// Palette to generate fallback posters/thumbnails (when an item has no image of
// its own via stream_icon/cover).

export const PAL: ReadonlyArray<readonly [string, string]> = [
  ["#7b4dff", "#3a1d8a"],
  ["#ff5f6d", "#7a1f3d"],
  ["#11998e", "#0a4a47"],
  ["#f7971e", "#7a4a0a"],
  ["#2193b0", "#0a3a4a"],
  ["#cc2b5e", "#5a1230"],
  ["#42275a", "#1a0f2a"],
  ["#005c97", "#0a2a4a"],
  ["#dd5e89", "#5a2540"],
  ["#1f4037", "#0a201a"],
];

export const gradient = (i: number): string => {
  const [a, b] = PAL[Math.abs(i) % PAL.length];
  return `linear-gradient(150deg, ${a}, ${b})`;
};

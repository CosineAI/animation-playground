export const TAU = Math.PI * 2;

export function hexToRgb(hex) {
  const clean = hex.replace("#", "");
  const value = Number.parseInt(clean, 16);
  return {
    r: (value >> 16) & 255,
    g: (value >> 8) & 255,
    b: value & 255
  };
}

export function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}
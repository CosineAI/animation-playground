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

export function hslToRgb(h, s, l) {
  s /= 100;
  l /= 100;
  const k = (n) => (n + h / 30) % 12;
  const a = s * Math.min(l, 1 - l);
  const f = (n) => l - a * Math.max(-1, Math.min(k(n) - 3, 9 - k(n), 1));
  return {
    r: Math.round(f(0) * 255),
    g: Math.round(f(8) * 255),
    b: Math.round(f(4) * 255)
  };
}

export function rainbowColor(hueOffset, time, speed = 1) {
  const hue = ((hueOffset + time * speed * 60) % 360 + 360) % 360;
  return hslToRgb(hue, 85, 60);
}
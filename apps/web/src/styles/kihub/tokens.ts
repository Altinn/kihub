// KI HUB design tokens as TS — for inline styles, chart libs, etc.
// Mirrors kihub/tokens.css exactly. Keep the two in sync.
// (Synced from the "KIHub Design System" claude.ai/design project, kihub/tokens.js.)

export const color = {
  bg: "#FFFFFF",
  bgTinted: "#F3F3F4",
  surfaceAccent: "#EEF4FA",
  surfaceAccentStrong: "#DDEAF6",
  surfaceInverted: "#1E2124",

  text: "#1E2124",
  textSubtle: "#5B6168",
  textAccent: "#002C54",
  textInverted: "#FFFFFF",

  accent: "#0062BA",
  accentHover: "#004F96",
  accentActive: "#003D75",
  accentBorder: "#99C0E3",
  accentContrast: "#FFFFFF",

  borderSubtle: "#D5D8DB",
  border: "#77797B",
  borderStrong: "#1E2124",

  info: "#0A71C0",
  infoSurface: "#DCEBF6",
  success: "#068718",
  successSurface: "#DAEDDD",
  warning: "#EA9B1B",
  warningSurface: "#FAE6C6",
  danger: "#C01B1B",
  dangerSurface: "#F8E4E4",

  focusOuter: "#1E2124",
  focusInner: "#FFFFFF",
};

export const font = {
  display: '"Source Serif 4", Georgia, "Times New Roman", serif',
  ui: "Inter, system-ui, -apple-system, sans-serif",
};

export const fontSize = {
  h1: "60px", h2: "40px", h3: "30px", h4: "24px",
  bodyLg: "20px", body: "18px", bodySm: "16px",
  ui: "15px", label: "13px", eyebrow: "12px",
};

export const lineHeight = { display: 1.08, heading: 1.25, body: 1.55, long: 1.7 };
export const tracking = { display: "-0.015em", heading: "-0.01em", body: "0em", eyebrow: "0.12em" };
export const weight = { regular: 400, medium: 500, semibold: 600 };

export const space = {
  1: "4px", 2: "8px", 3: "12px", 4: "16px", 5: "20px", 6: "24px",
  8: "32px", 10: "40px", 14: "56px", 18: "72px", 24: "96px",
};

export const radius = { sm: "2px", base: "4px", lg: "8px", xl: "12px", full: "9999px" };

export const shadow = {
  sm: "0 0 1px rgba(0,0,0,.04), 0 1px 2px rgba(0,0,0,.06), 0 2px 4px rgba(0,0,0,.06)",
  md: "0 0 1px rgba(0,0,0,.04), 0 2px 4px rgba(0,0,0,.06), 0 4px 8px rgba(0,0,0,.06)",
  xl: "0 4px 8px rgba(0,0,0,.08), 0 12px 24px rgba(0,0,0,.10)",
};

export const focusRing = {
  outline: `3px solid ${color.focusOuter}`,
  outlineOffset: "3px",
  boxShadow: `0 0 0 3px ${color.focusInner}`,
};

export const kihub = { color, font, fontSize, lineHeight, tracking, weight, space, radius, shadow, focusRing };
export default kihub;

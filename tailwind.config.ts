import type { Config } from "tailwindcss";

// ============================================
// FOCOI — "Academic Clarity" Design System
// Single Source of Truth for all tokens
// ============================================

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // ── Core Palette ──────────────────────────
        "primary":           "#CBB4ED",  // Soft purple — brand, active states, primary buttons
        "primary-dark":      "#b89de0",  // Hover state for primary
        "primary-container": "#E8DEFA",  // Light purple tint for containers
        "secondary":         "#A8D1F6",  // Sky blue — secondary actions, tags, info
        "secondary-dark":    "#8ec0ed",  // Hover state for secondary
        "secondary-container":"#D4E8FB", // Light blue tint for containers
        "tertiary":          "#C8C074",  // Olive yellow — XP, streaks, highlights
        "tertiary-dark":     "#b5ad5e",  // Hover state for tertiary
        "tertiary-container":"#E4E0BA",  // Light olive tint for containers
        "neutral":           "#1A1A2E",  // Dark navy — text, icons, dark surfaces
        "neutral-dim":       "#2A2A42",  // Slightly lighter navy

        // ── Surfaces ──────────────────────────────
        "surface":           "#F4F1FB",  // Near-white lavender — card/screen bg
        "surface-dim":       "#E6E2F0",  // Dimmed surface
        "surface-bright":    "#FDFCFF",  // Brightest surface
        "surface-container-lowest":  "#FFFFFF",
        "surface-container-low":     "#F8F6FE",
        "surface-container":         "#F0EDF7",
        "surface-container-high":    "#EAE7F2",
        "surface-container-highest": "#E4E1EC",
        "surface-variant":   "#E7E0EC",  // Slightly tinted surface

        // ── On-Colors (text/icon on backgrounds) ──
        "on-surface":         "#1A1A2E",
        "on-surface-variant": "#49454F",
        "on-primary":         "#1A1A2E",  // Dark label on primary buttons
        "on-secondary":       "#1A1A2E",
        "on-tertiary":        "#1A1A2E",
        "on-background":      "#1A1A2E",
        "background":         "#F4F1FB",

        // ── Outline & Borders ─────────────────────
        "outline":           "#79747E",
        "outline-variant":   "#CAC4D0",

        // ── Semantic States ───────────────────────
        "error":             "#C4384B",  // Desaturated coral (NOT pure red)
        "error-container":   "#FFDAD6",
        "on-error":          "#FFFFFF",
        "on-error-container":"#8C1D18",
        "warning":           "#C8C074",  // Reuse tertiary for warmth
        "success":           "#8BAF7E",  // Desaturated sage green

        // ── Inverse ───────────────────────────────
        "inverse-surface":   "#1A1A2E",
        "inverse-on-surface":"#F4F1FB",
        "inverse-primary":   "#CBB4ED",
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "-apple-system", "sans-serif"],
      },
      borderRadius: {
        // Academic Clarity radius tokens
        "ac-card":  "16px",
        "ac-btn":   "12px",
        "ac-chip":  "8px",
        xl:  "1rem",
        "2xl": "1.5rem",
        "3xl": "2rem",
      },
      spacing: {
        // 8pt grid additions
        "18": "4.5rem",  // 72px
        "22": "5.5rem",  // 88px
      },
      keyframes: {
        "fade-in": {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        "slide-up": {
          "0%": { opacity: "0", transform: "translateY(20px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "slide-in-right": {
          "0%": { transform: "translateX(100%)" },
          "100%": { transform: "translateX(0)" },
        },
        "pulse-soft": {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.7" },
        },
        "xp-fill": {
          "0%": { width: "0%" },
          "100%": { width: "var(--xp-width)" },
        },
        "skeleton": {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
      },
      animation: {
        "fade-in": "fade-in 0.3s ease-in-out forwards",
        "slide-up": "slide-up 0.3s ease-in-out forwards",
        "slide-in-right": "slide-in-right 0.3s ease-in-out forwards",
        "pulse-soft": "pulse-soft 2s ease-in-out infinite",
        "xp-fill": "xp-fill 0.4s ease-out forwards",
        "skeleton": "skeleton 1.5s ease-in-out infinite",
      },
      boxShadow: {
        // Subtle elevation only — no hard borders on cards
        "soft": "0 2px 12px -2px rgba(26, 26, 46, 0.06), 0 4px 16px -4px rgba(26, 26, 46, 0.04)",
        "card": "0 1px 8px -1px rgba(26, 26, 46, 0.05), 0 2px 12px -2px rgba(26, 26, 46, 0.03)",
        "glow-primary": "0 0 20px rgba(203, 180, 237, 0.25)",
        "glow-tertiary": "0 0 16px rgba(200, 192, 116, 0.20)",
      },
    },
  },
  plugins: [],
};

export default config;

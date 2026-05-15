/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        // Materiale Liquid Glass — sistema in opacità su sfondo dinamico
        bg: {
          DEFAULT: "#06060a",     // base profonda, blu-notte
          deep: "#020205",        // per sfondi pieni
          elev: "rgba(255,255,255,0.04)",  // material thin
          card: "rgba(255,255,255,0.06)",  // material medium
          thick: "rgba(20,20,28,0.55)",    // material thick
          border: "rgba(255,255,255,0.10)",
          hairline: "rgba(255,255,255,0.06)",
        },
        // Tipografia in opacità — stile iOS
        ink: {
          DEFAULT: "#ffffff",
          dim: "rgba(255,255,255,0.72)",
          muted: "rgba(255,255,255,0.46)",
          quiet: "rgba(255,255,255,0.28)",
        },
        // Accent unico — lilac soft, "crescita interiore"
        accent: {
          DEFAULT: "#b9a4ff",
          dim: "#9b86e6",
        },
        // Sistema iOS — solo per stato semantico
        sys: {
          red: "#FF453A",
          orange: "#FF9F0A",
          yellow: "#FFD60A",
          green: "#30D158",
          mint: "#63E6E2",
          teal: "#40CBE0",
          cyan: "#64D2FF",
          blue: "#0A84FF",
          indigo: "#5E5CE6",
          purple: "#BF5AF2",
          pink: "#FF375F",
          brown: "#AC8E68",
        },
        // Aree — tinte morbide non saturate
        area: {
          work: "#FFD479",
          nime: "#7EE8D7",
          fisico: "#FF8A9B",
          mentale: "#C4A8FF",
          identita: "#FFB088",
          finanze: "#9FE0A5",
          tech: "#8FB8FF",
        },
        // Priorità — toni soft
        prio: {
          high: "#FF6B7A",
          mid: "#FFC857",
          low: "rgba(255,255,255,0.35)",
        },
      },
      fontFamily: {
        sans: [
          '"SF Pro Text"',
          '"SF Pro"',
          "-apple-system",
          "BlinkMacSystemFont",
          '"Inter"',
          "system-ui",
          "sans-serif",
        ],
        display: [
          '"SF Pro Display"',
          '"SF Pro"',
          "-apple-system",
          "BlinkMacSystemFont",
          '"Inter"',
          "system-ui",
          "sans-serif",
        ],
        mono: [
          '"SF Mono"',
          '"JetBrains Mono"',
          "ui-monospace",
          "monospace",
        ],
      },
      letterSpacing: {
        "tight-2": "-0.02em",
        "tight-3": "-0.03em",
        "tight-4": "-0.04em",
      },
      animation: {
        "fade-in": "fadeIn 0.4s cubic-bezier(0.22, 1, 0.36, 1)",
        "rise": "rise 0.5s cubic-bezier(0.22, 1, 0.36, 1)",
        "orb-1": "orb1 24s ease-in-out infinite",
        "orb-2": "orb2 32s ease-in-out infinite",
        "orb-3": "orb3 28s ease-in-out infinite",
      },
      keyframes: {
        fadeIn: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        rise: {
          "0%": { transform: "translateY(12px)", opacity: "0" },
          "100%": { transform: "translateY(0)", opacity: "1" },
        },
        orb1: {
          "0%,100%": { transform: "translate(-10%,-10%) scale(1)" },
          "50%":     { transform: "translate(8%,12%) scale(1.15)" },
        },
        orb2: {
          "0%,100%": { transform: "translate(8%,-6%) scale(1.05)" },
          "50%":     { transform: "translate(-12%,14%) scale(0.95)" },
        },
        orb3: {
          "0%,100%": { transform: "translate(0%,8%) scale(0.95)" },
          "50%":     { transform: "translate(10%,-10%) scale(1.1)" },
        },
      },
    },
  },
  plugins: [],
};

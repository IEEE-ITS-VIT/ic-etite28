// Fonts the admin can pick in Site content → Appearance.
// Using robust CSS font-family mappings so builds never fail on Vercel/CI
// from Google Fonts network/parsing errors in next/font/google.

export const FONT_OPTIONS = {
  inter: { label: "Inter", cssVar: "--font-inter", kind: "Sans-serif" },
  jakarta: { label: "Plus Jakarta Sans", cssVar: "--font-jakarta", kind: "Sans-serif" },
  poppins: { label: "Poppins", cssVar: "--font-poppins", kind: "Sans-serif" },
  roboto: { label: "Roboto", cssVar: "--font-roboto", kind: "Sans-serif" },
  montserrat: { label: "Montserrat", cssVar: "--font-montserrat", kind: "Sans-serif" },
  lato: { label: "Lato", cssVar: "--font-lato", kind: "Sans-serif" },
  opensans: { label: "Open Sans", cssVar: "--font-opensans", kind: "Sans-serif" },
  merriweather: { label: "Merriweather", cssVar: "--font-merriweather", kind: "Serif" },
  playfair: { label: "Playfair Display", cssVar: "--font-playfair", kind: "Serif" },
} as const;

export type FontKey = keyof typeof FONT_OPTIONS;

export const fontVariables = "";

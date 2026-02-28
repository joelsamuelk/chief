const themeExtension = require("@chief/theme/tailwind-preset");

/** @type {import('tailwindcss').Config} */
module.exports = {
  presets: [require("nativewind/preset")],
  content: ["./App.tsx", "./src/**/*.{ts,tsx}", "../../packages/ui/src/mobile/**/*.{ts,tsx}"],
  theme: {
    extend: {
      ...themeExtension,
      fontFamily: {
        sans: ["Outfit_400Regular", "System"]
      }
    }
  },
  plugins: []
};

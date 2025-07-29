const path = require('path');
/** @type {import('tailwindcss').Config} */
module.exports = {
  // Point to the config file INSIDE the dist folder of the UI package
  presets: [require(path.join(__dirname, '../../packages/ui/dist/tailwind.config.js'))],

  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    '../../packages/ui/src/**/*.{js,ts,jsx,tsx}', // This path is for scanning source files, it remains the same.
  ],
  theme: {
    extend: {},
  },
  plugins: [],
};
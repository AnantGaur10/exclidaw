// This is where you define your design system tokens
/** @type {import('tailwindcss').Config} */
module.exports = {
  // We only define the theme here. The content path will be handled by the consumer app.
  theme: {
    extend: {
      colors: {
        // Here is the definition for the missing utility!
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        // ... and so on for primary, secondary, destructive, etc.
        // These are standard shadcn/ui variables.
      },
      // ... any other theme extensions like borderRadius, keyframes, etc.
    },
  },
  plugins: [],
};
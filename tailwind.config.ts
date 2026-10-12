import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './lib/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // VYBE brand colours — update once brand guide is confirmed
        vybe: {
          primary:   '#1A1A2E',
          accent:    '#E94560',
          highlight: '#0F3460',
          light:     '#F5F5F5',
        },
      },
    },
  },
  plugins: [],
}

export default config

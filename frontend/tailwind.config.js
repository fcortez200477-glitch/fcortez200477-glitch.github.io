/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Paleta da marca Moblytix (ver backend/assets/brand/BRAND.md)
        brand: {
          indigo: '#4338CA',
          cyan: '#06B6D4',
          ink: '#1E1B4B',
          cyanText: '#0891B2',
          cyanLight: '#22D3EE',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'Segoe UI', 'sans-serif'],
        display: ['Poppins', 'Inter', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        card: '0 1px 2px rgba(16, 24, 40, 0.06), 0 1px 3px rgba(16, 24, 40, 0.10)',
      },
      backgroundImage: {
        'brand-gradient': 'linear-gradient(135deg, #4338CA 0%, #06B6D4 100%)',
      },
    },
  },
  plugins: [],
};

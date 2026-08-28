/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{html,ts}'],
  theme: {
    extend: {
      colors: {
        bg: {
          primary: '#181818',
          surface: '#181818',
          elevated: '#303030',
        },
        accent: {
          DEFAULT: '#da291c',
          hover: '#b01e0a',
          muted: '#9d2211',
        },
        text: {
          primary: '#ffffff',
          secondary: '#969696',
          muted: '#666666',
        },
        hairline: {
          DEFAULT: '#303030',
          light: '#d2d2d2',
        },
        border: {
          DEFAULT: 'rgba(255, 255, 255, 0.08)',
          subtle: 'rgba(255, 255, 255, 0.06)',
          medium: 'rgba(255, 255, 255, 0.12)',
        },
        status: {
          active: '#03904a',
          warning: '#f13a2c',
          danger: '#f13a2c',
          info: '#4c98b9',
        },
      },
      fontFamily: {
        sans: ['Inter', '-apple-system', 'system-ui', 'sans-serif'],
      },
      letterSpacing: {
        button: '1.4px',
        nav: '0.65px',
        caption: '1.1px',
      },
      borderRadius: {
        sm: '6px',
        DEFAULT: '8px',
        md: '8px',
        lg: '10px',
        xl: '12px',
        full: '9999px',
      },
    },
  },
  plugins: [],
};

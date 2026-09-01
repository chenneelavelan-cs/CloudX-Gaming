/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{html,ts}'],
  theme: {
    extend: {
      colors: {
        canvas: '#222222',
        bg: {
          primary: 'var(--skin-bg, #181818)',
          surface: '#181818',
          elevated: '#303030',
        },
        accent: {
          DEFAULT: '#da291c',
          hover: '#b01e0a',
          muted: '#9d2211',
        },
        text: {
          primary: 'var(--skin-text, #ffffff)',
          secondary: 'var(--skin-text-secondary, #969696)',
          muted: 'var(--skin-text-muted, #666666)',
        },
        border: {
          DEFAULT: 'var(--skin-border, rgba(255, 255, 255, 0.08))',
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
        pill: '9999px',
        full: '9999px',
      },
      maxWidth: {
        content: '980px',
        grid: '1440px',
      },
    },
  },
  plugins: [],
};

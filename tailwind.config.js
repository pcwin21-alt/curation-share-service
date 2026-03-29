/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        // 배경 — 따뜻한 크림 계열
        'background': '#f2efe9',
        'surface': '#f7f4ef',
        'surface-bright': '#fdfcf9',
        'surface-dim': '#d6d2cc',
        'surface-container-lowest': '#ffffff',
        'surface-container-low': '#eceae3',
        'surface-container': '#e4e1da',
        'surface-container-high': '#dad7d0',
        'surface-container-highest': '#d0cdc6',
        'surface-variant': '#e2dfda',

        // 텍스트
        'on-surface': '#1a1917',
        'on-surface-variant': '#4a4b50',
        'on-background': '#1a1917',

        // 경계선
        'outline': '#6b6c72',
        'outline-variant': '#bfbdb8',

        // Primary — 진한 차콜
        'primary': '#141210',
        'primary-container': '#1e1c1a',
        'primary-fixed': '#dde2f3',
        'primary-fixed-dim': '#c1c6d7',
        'on-primary': '#ffffff',
        'on-primary-container': '#9a9b9f',
        'on-primary-fixed': '#161c27',
        'on-primary-fixed-variant': '#414754',

        // Secondary — 선명한 포레스트 그린 (KEY 컬러)
        'secondary': '#1e6b45',
        'secondary-container': '#b6dfc9',
        'secondary-fixed': '#b6dfc9',
        'secondary-fixed-dim': '#8fcbae',
        'on-secondary': '#ffffff',
        'on-secondary-container': '#0d4a2d',
        'on-secondary-fixed': '#0a3621',
        'on-secondary-fixed-variant': '#1a5438',

        // Tertiary — 서브 색조
        'tertiary': '#0e0c08',
        'tertiary-container': '#2a2718',
        'tertiary-fixed': '#e8e6d2',
        'tertiary-fixed-dim': '#cccab6',
        'on-tertiary': '#ffffff',
        'on-tertiary-container': '#8c8a78',
        'on-tertiary-fixed': '#1e1c10',
        'on-tertiary-fixed-variant': '#4a4b3c',

        // 기타
        'inverse-surface': '#2e2c2a',
        'inverse-on-surface': '#f0ede8',
        'inverse-primary': '#c1c6d7',
        'surface-tint': '#1e6b45',
        'error': '#c0392b',
        'error-container': '#fde8e6',
        'on-error': '#ffffff',
        'on-error-container': '#7b1414',
      },
      fontFamily: {
        'headline': ['Pretendard Variable', 'Pretendard', '-apple-system', 'sans-serif'],
        'body': ['Pretendard Variable', 'Pretendard', '-apple-system', 'sans-serif'],
        'label': ['Pretendard Variable', 'Pretendard', '-apple-system', 'sans-serif'],
      },
      borderRadius: {
        DEFAULT: '0.25rem',
        lg: '0.5rem',
        xl: '0.75rem',
        '2xl': '1rem',
        full: '9999px',
      },
    },
  },
  plugins: [],
}

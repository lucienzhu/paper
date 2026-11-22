/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', '"PingFang SC"', '"Hiragino Sans GB"', '"Microsoft YaHei"', 'system-ui', 'sans-serif'],
        mono: ['"SF Mono"', 'ui-monospace', 'Menlo', 'Consolas', 'monospace'],
      },
      colors: {
        // 4.0“石墨”：中性的纸白与石墨做底，颜色只表示意义——橙色是可拖动的轴心，紫色是 AI 的建议，琥珀与绿是核对结果。
        ink: { DEFAULT: '#16181b', soft: '#4a5058', faint: '#848a93' },
        canvas: '#f2f3f5',
        line: '#e1e4e8',
        // 原来的蓝色强调改为石墨，旧组件随之统一。
        primary: { 50: '#f2f3f5', 100: '#e7e9ec', 200: '#d3d7dd', 500: '#4a5058', 600: '#16181b', 700: '#000000' },
        signal: { 50: '#fdf0e8', 100: '#fbdcc8', 500: '#e8590c', 600: '#c9480a' },
        ai: { DEFAULT: '#6b55d1', tint: '#f0edfc' },
        warn: { DEFAULT: '#a86a0f', tint: '#fbf3e3' },
        ok: { DEFAULT: '#2b7a3e' },
      },
      boxShadow: {
        panel: '0 1px 2px rgba(11,18,32,.04), 0 8px 24px -12px rgba(11,18,32,.12)',
        float: '0 2px 6px rgba(11,18,32,.06), 0 18px 40px -18px rgba(11,18,32,.28)',
      },
      borderRadius: { xl2: '1.25rem' },
    },
  },
  plugins: [],
};

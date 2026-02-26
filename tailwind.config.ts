/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    darkMode: 'class',
    theme: {
        extend: {
            fontFamily: {
                sans: ['Inter', 'system-ui', 'sans-serif'],
                mono: ['Fira Code', 'ui-monospace', 'monospace'],
            },
            colors: {
                editor: {
                    bg: '#1e1e1e',
                    surface: '#252526',
                    border: '#3e3e42',
                    text: '#d4d4d4',
                    muted: '#858585',
                },
            },
            animation: {
                'slide-up': 'slideUp 0.3s ease-out',
                'fade-in': 'fadeIn 0.2s ease-out',
                'pulse-error': 'pulseError 2s ease-in-out infinite',
            },
            keyframes: {
                slideUp: {
                    '0%': { transform: 'translateY(8px)', opacity: '0' },
                    '100%': { transform: 'translateY(0)', opacity: '1' },
                },
                fadeIn: {
                    '0%': { opacity: '0' },
                    '100%': { opacity: '1' },
                },
                pulseError: {
                    '0%, 100%': { opacity: '1' },
                    '50%': { opacity: '0.6' },
                },
            },
        },
    },
    plugins: [],
}

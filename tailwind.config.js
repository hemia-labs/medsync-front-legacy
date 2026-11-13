/** @type {import('tailwindcss').Config} */

module.exports = {
  purge: {
    content: [
      './public/index.html',
      './src/**/*.{vue,js}',
    ],
    options: {
      safelist: [
        'text',
        'number',
        'password',
        'tel',
        'email',
        'button',
        'box-shadow-primary',
        'box-shadow-secondary',
        'rounded-sm',
        'rounded-md',
        'rounded-lg',
        'rounded-xl',
        'rounded-2xl',
        'rounded-tl-lg',
        'rounded-tr-lg',
        'rounded-bl-lg',
        'rounded-br-lg',
        'shadow-sm',
        'shadow-md',
        'shadow-lg',
        'shadow-xl',
        'animate-fade-in-down',
        'animate-fade-out-down',
        'animate-fade-in-up',
        'animate-fade-out-up',
        'animate-fade-in-left',
        'animate-fade-in-right',
        'animate-fadeInScroll',
        'animate-shake',
        'animate-open-menu',
      ],
    },
  },
  darkMode: false, // or 'media' or 'class'
  theme: {
    extend: {
      width: {
        '85':'20rem',
        '90': '22rem',
        '128': '36rem',
      },
      height:{
        '128': '32rem',
        
      },
      spacing: {
        '17': '4.5rem'
      },
      colors: {
        'primary-100': 'var(--color-primary-100)',
        'primary-200': 'var(--color-primary-200)',
        'primary-300': 'var(--color-primary-300)',
        'primary-500': 'var(--color-primary-500)',
        'primary-700': 'var(--color-primary-700)',
        'primary-900': 'var(--color-primary-900)',
        'primary-1000': 'var(--color-primary-1000)',
        'secondary-500':'var(--color-secondary-500)',
        'secondary-700':'var(--color-secondary-700)',
        'terciary-500':'var(--color-terciary-500)',
        'forty-500':'var(--color-forty-500)',
        'grey':'var(--color-grey)',
        'gray98': 'var(--color-gray98)',
        'red': 'var(--color-red)'
      },
      keyframes: {
        'fade-in-down': {
            '0%': {
                opacity: '0',
                transform: 'translateY(-10px)'
            },
            '100%': {
                opacity: '1',
                transform: 'translateY(0)'
            },
        },
        'fade-out-down': {
            'from': {
                opacity: '1',
                transform: 'translateY(0px)'
            },
            'to': {
                opacity: '0',
                transform: 'translateY(10px)'
            },
        },
        'fade-in-up': {
            '0%': {
                opacity: '0',
                transform: 'translateY(10px)'
            },
            '100%': {
                opacity: '1',
                transform: 'translateY(0)'
            },
        },
        'fade-out-up': {
            'from': {
                opacity: '1',
                transform: 'translateY(0px)'
            },
            'to': {
                opacity: '0',
                transform: 'translateY(10px)'
            },
        },
        'fade-in-left': {
          '0%': {
              opacity: '0',
              transform: 'translateX(50px)'
          },
          '100%': {
              opacity: '1',
              transform: 'translateX(0)'
          },

        },
        'fadeInScroll': {
          "0%": { opacity: 0 },
          "100%": { opacity: 1 }
        },
        'fade-in-right': {
          '0%': {
              opacity: '0',
              transform: 'translateX(-500px)'
          },
          '100%': {
              opacity: '1',
              transform: 'translateX(0)'
          },

        },
        'shake':{
          '10%, 90%': {
            transform: 'translate3d(-1px, 0, 0)'
          },
          '20%, 80%': {
            transform: 'translate3d(2px, 0, 0)'
          },
          '30%, 50%, 70%': {
            transform: 'translate3d(-2px, 0, 0)'
          },
          '40%, 60%': {
            transform: 'translate3d(2px, 0, 0)'
          },
        },
        'open-menu': {
          '0%': { transform: 'scaleY(0)'},
          '80%': { transform: 'scaleY(1.2)'},
          '100%': { transform: 'scaleY(1)'},
        }
      },
      animation: {
        'fade-in-down':     'fade-in-down 1.5s ease-out',
        'fade-out-down':    'fade-out-down 0.5s ease-out',
        'fade-in-up':       'fade-in-up 1.5s ease-out',
        'fade-out-up':      'fade-out-up 0.5s ease-out',
        'fade-in-left':     'fade-in-left 1.5s ease-out',
        'fade-in-right':    'fade-in-right 1.5s ease-out',
        'fadeInScroll':     'fadeInScroll 2s ease-in forwards',
        'shake':            'shake 0.82s cubic-bezier(.36,.07,.19,.97) both',
        'open-menu':        'open-menu 0.5s ease-in-out forwards'
      },
      screens: {
        'sm': '360px',
        // => @media (min-width: 640px) { ... }

        'md': '769px',
        // => @media (min-width: 768px) { ... }
  
        'lg': '1026px',

        // => @media (min-width: 1024px) { ... }
  
        'xl': '1280px',
        // => @media (min-width: 1280px) { ... }
  
        '2xl': '1536px',
        // => @media (min-width: 1536px) { ... }
      },
      margin: {
        '20%': '20%'
      },
     
    },
  },
  plugins: [

  ],
}

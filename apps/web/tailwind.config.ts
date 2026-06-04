import type { Config } from "tailwindcss"

const config = {
  darkMode: ["class", ".dark"],
  content: [
    './pages/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './app/**/*.{ts,tsx}',
    './src/**/*.{ts,tsx}',
	],
  prefix: "",
  theme: {
  	container: {
  		center: true,
  		padding: '2rem',
  		screens: {
  			'2xl': '1400px'
  		}
  	},
  	extend: {
  		colors: {
  			border: 'hsl(var(--border))',
  			input: 'hsl(var(--input))',
  			ring: 'hsl(var(--ring))',
  			background: 'hsl(var(--background))',
  			foreground: 'hsl(var(--foreground))',
  			primary: {
  				DEFAULT: 'hsl(var(--primary))',
  				foreground: 'hsl(var(--primary-foreground))'
  			},
  			secondary: {
  				DEFAULT: 'hsl(var(--secondary))',
  				foreground: 'hsl(var(--secondary-foreground))'
  			},
  			destructive: {
  				DEFAULT: 'hsl(var(--destructive))',
  				foreground: 'hsl(var(--destructive-foreground))'
  			},
  			muted: {
  				DEFAULT: 'hsl(var(--muted))',
  				foreground: 'hsl(var(--muted-foreground))'
  			},
  			accent: {
  				DEFAULT: 'hsl(var(--accent))',
  				foreground: 'hsl(var(--accent-foreground))'
  			},
  			popover: {
  				DEFAULT: 'hsl(var(--popover))',
  				foreground: 'hsl(var(--popover-foreground))'
  			},
  			card: {
  				DEFAULT: 'hsl(var(--card))',
  				foreground: 'hsl(var(--card-foreground))'
  			},
  			chart: {
  				'1': 'hsl(var(--chart-1))',
  				'2': 'hsl(var(--chart-2))',
  				'3': 'hsl(var(--chart-3))',
  				'4': 'hsl(var(--chart-4))',
  				'5': 'hsl(var(--chart-5))'
  			}
  		},
  		borderRadius: {
  			lg: 'var(--radius)',
  			md: 'var(--radius)',
  			sm: '2px'
  		},
  		keyframes: {
  			'accordion-down': {
  				from: {
  					height: '0'
  				},
  				to: {
  					height: 'var(--radix-accordion-content-height)'
  				}
  			},
  			'accordion-up': {
  				from: {
  					height: 'var(--radix-accordion-content-height)'
  				},
  				to: {
  					height: '0'
  				}
  			},
  			'float': {
  				'0%, 100%': {
  					transform: 'translateY(0px) translateX(0px)'
  				},
  				'25%': {
  					transform: 'translateY(-20px) translateX(10px)'
  				},
  				'50%': {
  					transform: 'translateY(-40px) translateX(-10px)'
  				},
  				'75%': {
  					transform: 'translateY(-20px) translateX(10px)'
  				}
  			},
  			'shimmer': {
  				'0%': {
  					backgroundPosition: '200% 0'
  				},
  				'100%': {
  					backgroundPosition: '-200% 0'
  				}
  			},
  			'shine': {
  				'0%': {
  					transform: 'translateX(-100%)'
  				},
  				'100%': {
  					transform: 'translateX(100%)'
  				}
  			},
  			'pulse-slow': {
  				'0%, 100%': {
  					opacity: '0.1'
  				},
  				'50%': {
  					opacity: '0.3'
  				}
  			},
  			'pulse-slower': {
  				'0%, 100%': {
  					opacity: '0.1'
  				},
  				'50%': {
  					opacity: '0.25'
  				}
  			},
  			'fade-in': {
  				'0%': {
  					opacity: '0'
  				},
  				'100%': {
  					opacity: '1'
  				}
  			},
  			'fade-in-up': {
  				'0%': {
  					opacity: '0',
  					transform: 'translateY(20px)'
  				},
  				'100%': {
  					opacity: '1',
  					transform: 'translateY(0)'
  				}
  			},
  			'slide-right': {
  				'0%': {
  					transform: 'translateX(-100%)'
  				},
  				'100%': {
  					transform: 'translateX(100%)'
  				}
  			},
  			'slide-left': {
  				'0%': {
  					transform: 'translateX(100%)'
  				},
  				'100%': {
  					transform: 'translateX(-100%)'
  				}
  			},
  			'blob': {
  				'0%, 100%': {
  					transform: 'translate(0, 0) scale(1)'
  				},
  				'25%': {
  					transform: 'translate(20px, -50px) scale(1.1)'
  				},
  				'50%': {
  					transform: 'translate(-20px, 20px) scale(0.9)'
  				},
  				'75%': {
  					transform: 'translate(50px, 50px) scale(1.05)'
  				}
  			},
  			'gradient-shift': {
  				'0%, 100%': {
  					opacity: '0.3'
  				},
  				'50%': {
  					opacity: '0.8'
  				}
  			},
  			'spin-slow': {
  				'0%': {
  					transform: 'rotate(0deg)'
  				},
  				'100%': {
  					transform: 'rotate(360deg)'
  				}
  			},
  			'draw-line': {
  				'0%': {
  					opacity: '0',
  					transform: 'translateX(-100%)'
  				},
  				'10%': {
  					opacity: '1'
  				},
  				'90%': {
  					opacity: '1'
  				},
  				'100%': {
  					opacity: '0',
  					transform: 'translateX(100%)'
  				}
  			},
  			'dash': {
  				'0%': {
  					strokeDasharray: '0, 1000'
  				},
  				'50%': {
  					strokeDasharray: '1000, 0'
  				},
  				'100%': {
  					strokeDasharray: '1000, 0'
  				}
  			},
  			'pulse-point': {
  				'0%, 100%': {
  					opacity: '0.4',
  					transform: 'scale(1)'
  				},
  				'50%': {
  					opacity: '1',
  					transform: 'scale(1.5)'
  				}
  			},
  			'notification-bounce': {
  				'0%, 100%': {
  					transform: 'scale(1)'
  				},
  				'25%': {
  					transform: 'scale(1.3)'
  				},
  				'50%': {
  					transform: 'scale(0.9)'
  				},
  				'75%': {
  					transform: 'scale(1.15)'
  				}
  			}
  		},
  		animation: {
  			'float': 'float 20s ease-in-out infinite',
  			'shimmer': 'shimmer 3s linear infinite',
  			'shine': 'shine 3s ease-in-out infinite',
  			'pulse-slow': 'pulse-slow 4s ease-in-out infinite',
  			'pulse-slower': 'pulse-slower 6s ease-in-out infinite',
  			'fade-in': 'fade-in 0.6s ease-out forwards',
  			'fade-in-up': 'fade-in-up 0.8s ease-out forwards',
  			'slide-right': 'slide-right 8s linear infinite',
  			'slide-left': 'slide-left 8s linear infinite',
  			'blob': 'blob 7s ease-in-out infinite',
  			'gradient-shift': 'gradient-shift 5s ease-in-out infinite',
  			'spin-slow': 'spin-slow 20s linear infinite',
  			'draw-line': 'draw-line 15s ease-in-out infinite',
  			'dash': 'dash 3s ease-in-out forwards',
  			'pulse-point': 'pulse-point 2s ease-in-out infinite',
  			'notification-bounce': 'notification-bounce 0.6s ease-in-out'
  		},
  		animationDelay: {
  			'100': '100ms',
  			'200': '200ms'
  		}
  	}
  },
  plugins: [require("tailwindcss-animate")],
} satisfies Config

export default config

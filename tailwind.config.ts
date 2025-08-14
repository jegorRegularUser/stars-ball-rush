import type { Config } from "tailwindcss";

export default {
	darkMode: ["class"],
	content: [
		"./pages/**/*.{ts,tsx}",
		"./components/**/*.{ts,tsx}",
		"./app/**/*.{ts,tsx}",
		"./src/**/*.{ts,tsx}",
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
					foreground: 'hsl(var(--primary-foreground))',
					glow: 'hsl(var(--primary-glow))'
				},
				secondary: {
					DEFAULT: 'hsl(var(--secondary))',
					foreground: 'hsl(var(--secondary-foreground))',
					glow: 'hsl(var(--secondary-glow))'
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
					foreground: 'hsl(var(--accent-foreground))',
					glow: 'hsl(var(--accent-glow))'
				},
				popover: {
					DEFAULT: 'hsl(var(--popover))',
					foreground: 'hsl(var(--popover-foreground))'
				},
				card: {
					DEFAULT: 'hsl(var(--card))',
					foreground: 'hsl(var(--card-foreground))'
				}
			},
			backgroundImage: {
				'gradient-primary': 'var(--gradient-primary)',
				'gradient-secondary': 'var(--gradient-secondary)',
				'gradient-gaming': 'var(--gradient-gaming)',
				'gradient-glow': 'var(--gradient-glow)'
			},
			boxShadow: {
				'glow': 'var(--shadow-glow)',
				'glow-secondary': 'var(--shadow-glow-secondary)',
				'glow-accent': 'var(--shadow-glow-accent)'
			},
			transitionDuration: {
				'gaming': '300ms'
			},
			borderRadius: {
				lg: 'var(--radius)',
				md: 'calc(var(--radius) - 2px)',
				sm: 'calc(var(--radius) - 4px)'
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
				'ball-drop': {
					'0%': { transform: 'translateY(-100px) scale(1)', opacity: '0.8' },
					'50%': { transform: 'translateY(0) scale(1.1)', opacity: '1' },
					'100%': { transform: 'translateY(100px) scale(1)', opacity: '0.9' }
				},
				'ball-bounce': {
					'0%, 20%, 53%, 80%, 100%': { transform: 'translate3d(0,0,0)' },
					'40%, 43%': { transform: 'translate3d(0, -20px, 0)' },
					'70%': { transform: 'translate3d(0, -10px, 0)' },
					'90%': { transform: 'translate3d(0, -4px, 0)' }
				},
				'glow-pulse': {
					'0%, 100%': { 
						transform: 'scale(1)', 
						boxShadow: '0 0 20px hsl(var(--primary) / 0.3)' 
					},
					'50%': { 
						transform: 'scale(1.05)', 
						boxShadow: '0 0 30px hsl(var(--primary) / 0.6)' 
					}
				},
				'slide-up': {
					'0%': { transform: 'translateY(100%)', opacity: '0' },
					'100%': { transform: 'translateY(0)', opacity: '1' }
				},
				'fade-in-scale': {
					'0%': { transform: 'scale(0.8)', opacity: '0' },
					'100%': { transform: 'scale(1)', opacity: '1' }
				}
			},
			animation: {
				'accordion-down': 'accordion-down 0.2s ease-out',
				'accordion-up': 'accordion-up 0.2s ease-out',
				'ball-drop': 'ball-drop 2s cubic-bezier(0.4, 0, 0.2, 1) infinite',
				'ball-bounce': 'ball-bounce 1s infinite',
				'glow-pulse': 'glow-pulse 2s ease-in-out infinite',
				'slide-up': 'slide-up 0.3s ease-out',
				'fade-in-scale': 'fade-in-scale 0.2s ease-out'
			}
		}
	},
	plugins: [require("tailwindcss-animate")],
} satisfies Config;

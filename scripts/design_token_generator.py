#!/usr/bin/env python3
"""Design token generator - generates a complete design system from a brand color."""
import sys, json, colorsys

def hex_to_rgb(h):
    h = h.lstrip('#')
    return tuple(int(h[i:i+2], 16) for i in (0, 2, 4))

def rgb_to_hex(r, g, b):
    return '#{:02x}{:02x}{:02x}'.format(
        max(0, min(255, int(r))),
        max(0, min(255, int(g))),
        max(0, min(255, int(b)))
    )

def lighten(hex_color, amount):
    r, g, b = hex_to_rgb(hex_color)
    h, l, s = colorsys.rgb_to_hls(r/255, g/255, b/255)
    l = min(1.0, l + amount)
    r2, g2, b2 = colorsys.hls_to_rgb(h, l, s)
    return rgb_to_hex(r2*255, g2*255, b2*255)

def darken(hex_color, amount):
    r, g, b = hex_to_rgb(hex_color)
    h, l, s = colorsys.rgb_to_hls(r/255, g/255, b/255)
    l = max(0.0, l - amount)
    r2, g2, b2 = colorsys.hls_to_rgb(h, l, s)
    return rgb_to_hex(r2*255, g2*255, b2*255)

def generate_tokens(brand_color, style='modern'):
    tokens = {}
    tokens['colors'] = {
        'brand': brand_color,
        'brand-light': lighten(brand_color, 0.15),
        'brand-lighter': lighten(brand_color, 0.3),
        'brand-dark': darken(brand_color, 0.15),
        'brand-darker': darken(brand_color, 0.3),
        'accent': lighten(brand_color, 0.25),
        'background': '#0a0612',
        'surface': '#1a1030',
        'surface-elevated': '#24144b',
        'text': '#e2e8f0',
        'text-muted': '#94a3b8',
        'text-on-brand': '#ffffff',
        'border': 'rgba(255,255,255,0.1)',
        'success': '#10b981',
        'warning': '#f59e0b',
        'danger': '#ef4444',
        'info': '#3b82f6'
    }
    base = 16
    ratio = 1.25
    tokens['typography'] = {
        'font-family': "'Tajawal', 'Segoe UI', sans-serif",
        'font-size-xs': f'{base / (ratio*ratio):.2f}px',
        'font-size-sm': f'{base / ratio:.2f}px',
        'font-size-base': f'{base}px',
        'font-size-lg': f'{base * ratio:.2f}px',
        'font-size-xl': f'{base * ratio * ratio:.2f}px',
        'font-size-2xl': f'{base * ratio**3:.2f}px',
        'font-size-3xl': f'{base * ratio**4:.2f}px',
        'font-weight-normal': '400',
        'font-weight-medium': '500',
        'font-weight-bold': '700',
        'font-weight-black': '900',
        'line-height-tight': '1.2',
        'line-height-normal': '1.5',
        'line-height-relaxed': '1.7'
    }
    tokens['spacing'] = {
        'xs': '4px', 'sm': '8px', 'md': '16px', 'lg': '24px',
        'xl': '32px', '2xl': '48px', '3xl': '64px'
    }
    tokens['radius'] = {
        'sm': '6px', 'md': '12px', 'lg': '16px', 'xl': '24px', 'full': '9999px'
    }
    tokens['shadows'] = {
        'sm': '0 2px 8px rgba(0,0,0,0.15)',
        'md': '0 4px 16px rgba(0,0,0,0.25)',
        'lg': '0 8px 32px rgba(0,0,0,0.35)',
        'glow': f'0 0 20px {brand_color}40'
    }
    tokens['breakpoints'] = {
        'sm': '640px', 'md': '768px', 'lg': '1024px', 'xl': '1280px'
    }
    return tokens

def to_css(tokens):
    lines = [':root {']
    for cat, vals in tokens.items():
        for k, v in vals.items():
            var_name = f'--{cat}-{k}'.replace(' ', '-').lower()
            lines.append(f'  {var_name}: {v};')
    lines.append('}')
    return '\n'.join(lines)

def to_json(tokens):
    return json.dumps(tokens, indent=2, ensure_ascii=False)

if __name__ == '__main__':
    brand = sys.argv[1] if len(sys.argv) > 1 else '#f59e0b'
    style = sys.argv[2] if len(sys.argv) > 2 else 'modern'
    fmt = sys.argv[3] if len(sys.argv) > 3 else 'css'
    tokens = generate_tokens(brand, style)
    if fmt == 'json':
        print(to_json(tokens))
    elif fmt == 'scss':
        for cat, vals in tokens.items():
            for k, v in vals.items():
                print(f'${cat}-{k}: {v};')
    else:
        print(to_css(tokens))
PY
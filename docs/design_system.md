# EVision — Design System v1

Design Systems Engineer · Tailwind CSS · 2026

---

## Архитектура системы

```
tokens/           ← примитивные значения (числа, hex)
  colors.js       ← цветовая палитра raw
  scales.js       ← spacing, radius, shadow primitives

semantic/         ← смысловые токены (что означает, не что выглядит)
  themes.js       ← light / dark / high-contrast маппинг

components/       ← конкретные классы компонентов

Правило: компонент ссылается на semantic токен.
         Semantic токен ссылается на primitive.
         Никогда компонент → primitive напрямую.
```

---

## 1. Primitive Color Palette

```javascript
// tokens/colors.js — RAW значения, не используются напрямую в UI

const primitives = {
  // Navy (base backgrounds)
  navy: {
    950: '#040A12',
    900: '#080F1A',
    850: '#0C1522',
    800: '#0F1B2D',
    750: '#122035',
    700: '#162235',
    600: '#1E2F47',
    500: '#2A3F5C',
    400: '#3D5A7A',
    300: '#5B7A9A',
  },
  // Slate (text, secondary)
  slate: {
    100: '#F0F4F8',
    200: '#D8E0EA',
    300: '#B8C5D4',
    400: '#8A9BB0',
    500: '#6A7D94',
    600: '#4A5A70',
    700: '#344456',
    800: '#22303F',
  },
  // Teal (primary accent)
  teal: {
    300: '#5EEADE',
    400: '#2DD4C4',
    500: '#00C9B1',
    600: '#00A894',
    700: '#008475',
  },
  // Indigo (secondary accent)
  indigo: {
    300: '#9BA8F6',
    400: '#7B8AF3',
    500: '#5B6AF0',
    600: '#4455E8',
    700: '#3344D0',
  },
  // Violet (AI, special)
  violet: {
    400: '#A78BFA',
    500: '#8B5CF6',
    600: '#7C3AED',
  },
  // Semantic functional
  green: {
    400: '#34D399',
    500: '#10B981',
    600: '#059669',
  },
  rose: {
    400: '#FB7185',
    500: '#F43F5E',
    600: '#E11D48',
  },
  amber: {
    400: '#FBD14B',
    500: '#F59E0B',
    600: '#D97706',
  },
  // Pure
  white: '#FFFFFF',
  black: '#000000',
};
```

---

## 2. Semantic Color Tokens

### Naming Convention

```
Формат: [namespace]-[role]-[variant?]

Namespace: bg, text, border, accent, chart, glow, status
Role:      base, surface, elevated, primary, secondary, muted, faint
Variant:   hover, active, disabled, (опционально)

Примеры:
  bg-base           → основной фон страницы
  bg-surface        → фон карточек, панелей
  text-primary      → основной текст
  text-muted        → подписи, вспомогательный текст
  accent-primary    → главный акцентный цвет (teal)
  status-positive   → успех, рост
  status-negative   → ошибка, падение
  chart-grid        → линии сетки на графиках
  glow-primary      → цвет svечения основного акцента
```

### Dark Theme (default)

```javascript
// semantic/themes.js

const dark = {
  // ── Backgrounds ──────────────────────────────────
  'bg-base':            primitives.navy[900],    // #080F1A — страница
  'bg-surface':         primitives.navy[800],    // #0F1B2D — карточки
  'bg-elevated':        primitives.navy[700],    // #162235 — модалки, поповеры
  'bg-overlay':         'rgba(4, 10, 18, 0.85)', // modal backdrop
  'bg-input':           primitives.navy[850],    // #0C1522 — поля ввода
  'bg-code':            primitives.navy[950],    // #040A12 — код/моно

  // ── Text ─────────────────────────────────────────
  'text-primary':       primitives.slate[100],   // #F0F4F8
  'text-secondary':     primitives.slate[300],   // #B8C5D4
  'text-muted':         primitives.slate[400],   // #8A9BB0
  'text-faint':         primitives.slate[600],   // #4A5A70
  'text-disabled':      primitives.slate[700],   // #344456
  'text-inverse':       primitives.navy[900],    // на светлом фоне
  'text-accent':        primitives.teal[500],    // #00C9B1 — акцентный текст
  'text-link':          primitives.teal[400],    // #2DD4C4 — ссылки
  'text-link-hover':    primitives.teal[300],    // #5EEADE

  // ── Borders ──────────────────────────────────────
  'border-default':     'rgba(255,255,255,0.07)', // разделители
  'border-subtle':      'rgba(255,255,255,0.04)', // очень тонкие
  'border-strong':      'rgba(255,255,255,0.14)', // активные/hover
  'border-accent':      primitives.teal[600],    // #00A894 — акцент
  'border-focus':       primitives.teal[500],    // #00C9B1 — focus ring
  'border-error':       primitives.rose[500],    // #F43F5E

  // ── Accent ───────────────────────────────────────
  'accent-primary':     primitives.teal[500],    // #00C9B1
  'accent-primary-hover': primitives.teal[400],  // #2DD4C4
  'accent-primary-dim': 'rgba(0,201,177,0.12)',   // фон hover state
  'accent-secondary':   primitives.indigo[500],  // #5B6AF0
  'accent-secondary-hover': primitives.indigo[400], // #7B8AF3
  'accent-ai':          primitives.violet[500],  // #8B5CF6 — AI фичи

  // ── Status ───────────────────────────────────────
  'status-positive':    primitives.green[500],   // #10B981 — рост, успех
  'status-positive-bg': 'rgba(16,185,129,0.10)', // фон positive badge
  'status-negative':    primitives.rose[500],    // #F43F5E — падение, ошибка
  'status-negative-bg': 'rgba(244,63,94,0.10)',  // фон negative badge
  'status-warning':     primitives.amber[500],   // #F59E0B — предупреждение
  'status-warning-bg':  'rgba(245,158,11,0.10)', // фон warning badge
  'status-info':        primitives.indigo[400],  // #7B8AF3 — инфо

  // ── Chart ────────────────────────────────────────
  'chart-grid':         'rgba(255,255,255,0.06)', // линии сетки
  'chart-axis':         'rgba(255,255,255,0.15)', // оси
  'chart-label':        primitives.slate[500],    // #6A7D94 — подписи осей
  'chart-tooltip-bg':   primitives.navy[750],     // #122035 — фон tooltip
  'chart-tooltip-border': 'rgba(255,255,255,0.12)',
  // Chart line palette (фиксированный порядок для серий)
  'chart-series-1':     primitives.teal[500],    // #00C9B1
  'chart-series-2':     primitives.indigo[400],  // #7B8AF3
  'chart-series-3':     primitives.amber[500],   // #F59E0B
  'chart-series-4':     primitives.rose[400],    // #FB7185

  // ── Glow ─────────────────────────────────────────
  'glow-primary':       'rgba(0,201,177,0.15)',  // teal glow
  'glow-secondary':     'rgba(91,106,240,0.12)', // indigo glow
  'glow-ai':            'rgba(139,92,246,0.15)', // violet/AI glow

  // ── Interactive ──────────────────────────────────
  'interactive-hover':  'rgba(255,255,255,0.04)', // hover bg subtle
  'interactive-active': 'rgba(255,255,255,0.08)', // active/pressed
  'interactive-selected': 'rgba(0,201,177,0.10)', // selected state bg
};
```

### Light Theme

```javascript
const light = {
  // Backgrounds
  'bg-base':            '#FFFFFF',
  'bg-surface':         '#F4F6F9',
  'bg-elevated':        '#EAECF0',
  'bg-overlay':         'rgba(255,255,255,0.85)',
  'bg-input':           '#FFFFFF',
  'bg-code':            '#F0F2F5',

  // Text
  'text-primary':       primitives.navy[900],    // #080F1A
  'text-secondary':     primitives.navy[600],    // #1E2F47
  'text-muted':         primitives.navy[500],    // #2A3F5C
  'text-faint':         primitives.navy[400],    // #3D5A7A
  'text-disabled':      primitives.navy[300],    // #5B7A9A
  'text-inverse':       primitives.slate[100],
  'text-accent':        primitives.teal[600],    // #00A894
  'text-link':          primitives.teal[600],
  'text-link-hover':    primitives.teal[700],

  // Borders
  'border-default':     'rgba(0,0,0,0.08)',
  'border-subtle':      'rgba(0,0,0,0.04)',
  'border-strong':      'rgba(0,0,0,0.16)',
  'border-accent':      primitives.teal[500],
  'border-focus':       primitives.teal[500],
  'border-error':       primitives.rose[500],

  // Accent — те же значения
  'accent-primary':     primitives.teal[500],
  'accent-primary-hover': primitives.teal[600],
  'accent-primary-dim': 'rgba(0,201,177,0.08)',
  'accent-secondary':   primitives.indigo[500],
  'accent-secondary-hover': primitives.indigo[600],
  'accent-ai':          primitives.violet[500],

  // Status — те же
  'status-positive':    primitives.green[600],
  'status-positive-bg': 'rgba(5,150,105,0.08)',
  'status-negative':    primitives.rose[600],
  'status-negative-bg': 'rgba(225,29,72,0.08)',
  'status-warning':     primitives.amber[600],
  'status-warning-bg':  'rgba(217,119,6,0.08)',
  'status-info':        primitives.indigo[500],

  // Chart
  'chart-grid':         'rgba(0,0,0,0.06)',
  'chart-axis':         'rgba(0,0,0,0.15)',
  'chart-label':        primitives.navy[400],
  'chart-tooltip-bg':   '#FFFFFF',
  'chart-tooltip-border': 'rgba(0,0,0,0.10)',
  'chart-series-1':     primitives.teal[600],
  'chart-series-2':     primitives.indigo[500],
  'chart-series-3':     primitives.amber[500],
  'chart-series-4':     primitives.rose[500],

  // Glow (на светлом — слабее)
  'glow-primary':       'rgba(0,201,177,0.08)',
  'glow-secondary':     'rgba(91,106,240,0.08)',
  'glow-ai':            'rgba(139,92,246,0.08)',

  // Interactive
  'interactive-hover':  'rgba(0,0,0,0.04)',
  'interactive-active': 'rgba(0,0,0,0.08)',
  'interactive-selected': 'rgba(0,201,177,0.08)',
};
```

### High Contrast Theme

```javascript
const highContrast = {
  // Максимальный контраст WCAG AAA (7:1+)
  'bg-base':          '#000000',
  'bg-surface':       '#0A0A0A',
  'bg-elevated':      '#141414',
  'text-primary':     '#FFFFFF',
  'text-secondary':   '#E0E0E0',
  'text-muted':       '#BDBDBD',
  'text-faint':       '#9E9E9E',
  'border-default':   'rgba(255,255,255,0.3)',
  'border-strong':    'rgba(255,255,255,0.6)',
  'accent-primary':   '#00FFE5',   // ярче для контраста
  'border-focus':     '#FFFFFF',   // белый focus ring
  'status-positive':  '#00FF88',
  'status-negative':  '#FF4466',
  'status-warning':   '#FFD600',
  'chart-grid':       'rgba(255,255,255,0.20)',
  'chart-axis':       'rgba(255,255,255,0.50)',
  // ... остальные по аналогии
};
```

---

## 3. Typography Scale

### Naming Convention

```
display       → Hero заголовки (самые крупные)
h1..h6        → Заголовки секций
body-lg       → Увеличенный body (intro paragraphs)
body          → Основной текст (default)
body-sm       → Мелкий body (описания)
caption       → Подписи, метки (12px)
label         → Form labels, uppercase мелкие (11px)
mono-data     → Числовые данные, индикатор-коды
mono-code     → Код, технический текст
```

### Шкала

```javascript
// tailwind.config.js → theme.extend.fontSize

fontSize: {
  // Display
  'display-2xl': ['4.5rem',  { lineHeight: '1.08', letterSpacing: '-0.03em', fontWeight: '700' }],
  'display-xl':  ['3.75rem', { lineHeight: '1.10', letterSpacing: '-0.025em', fontWeight: '700' }],
  'display-lg':  ['3rem',    { lineHeight: '1.12', letterSpacing: '-0.02em', fontWeight: '700' }],
  'display-md':  ['2.25rem', { lineHeight: '1.20', letterSpacing: '-0.02em', fontWeight: '600' }],
  'display-sm':  ['1.875rem',{ lineHeight: '1.25', letterSpacing: '-0.015em', fontWeight: '600' }],

  // Headings
  'h1': ['1.5rem',   { lineHeight: '1.30', letterSpacing: '-0.01em', fontWeight: '600' }],
  'h2': ['1.25rem',  { lineHeight: '1.35', letterSpacing: '-0.01em', fontWeight: '600' }],
  'h3': ['1.125rem', { lineHeight: '1.40', letterSpacing: '-0.005em', fontWeight: '600' }],
  'h4': ['1rem',     { lineHeight: '1.45', letterSpacing: '0',        fontWeight: '600' }],
  'h5': ['0.875rem', { lineHeight: '1.45', letterSpacing: '0',        fontWeight: '600' }],
  'h6': ['0.75rem',  { lineHeight: '1.45', letterSpacing: '0.01em',   fontWeight: '600' }],

  // Body
  'body-lg': ['1.125rem', { lineHeight: '1.65', letterSpacing: '0', fontWeight: '400' }],
  'body':    ['0.875rem', { lineHeight: '1.60', letterSpacing: '0', fontWeight: '400' }],
  'body-sm': ['0.8125rem',{ lineHeight: '1.55', letterSpacing: '0', fontWeight: '400' }],

  // Utility
  'caption':    ['0.75rem',  { lineHeight: '1.50', letterSpacing: '0', fontWeight: '400' }],
  'label':      ['0.6875rem',{ lineHeight: '1.45', letterSpacing: '0.06em', fontWeight: '500' }],
  'overline':   ['0.625rem', { lineHeight: '1.40', letterSpacing: '0.12em', fontWeight: '500' }],

  // Mono
  'mono-data':  ['0.875rem', { lineHeight: '1.50', letterSpacing: '-0.01em', fontWeight: '600' }],
  'mono-data-lg':['1.5rem',  { lineHeight: '1.30', letterSpacing: '-0.02em', fontWeight: '700' }],
  'mono-data-xl':['2.25rem', { lineHeight: '1.20', letterSpacing: '-0.025em', fontWeight: '700' }],
  'mono-code':  ['0.8125rem',{ lineHeight: '1.60', letterSpacing: '0', fontWeight: '400' }],
},

fontFamily: {
  sans:  ['Inter', 'system-ui', 'sans-serif'],
  mono:  ['JetBrains Mono', 'Fira Code', 'monospace'],
  display: ['Manrope', 'Inter', 'sans-serif'],
},
```

---

## 4. Spacing / Radius / Shadow

### Spacing scale

```javascript
// Базовая единица: 4px
// Все значения кратны 4px (иногда 2px для мелких деталей)

spacing: {
  // Micro
  '0.5': '2px',
  '1':   '4px',
  '1.5': '6px',
  '2':   '8px',
  '2.5': '10px',
  '3':   '12px',
  '3.5': '14px',
  '4':   '16px',
  // Component
  '5':   '20px',
  '6':   '24px',
  '7':   '28px',
  '8':   '32px',
  '9':   '36px',
  '10':  '40px',
  // Layout
  '12':  '48px',
  '14':  '56px',
  '16':  '64px',
  '18':  '72px',
  '20':  '80px',
  '24':  '96px',
  '28':  '112px',
  '32':  '128px',
  // Section
  '36':  '144px',
  '40':  '160px',
  '48':  '192px',
},
```

### Semantic spacing (через CSS vars)

```css
:root {
  /* Component internal padding */
  --padding-btn-sm:    6px 12px;
  --padding-btn-md:    10px 20px;
  --padding-btn-lg:    14px 28px;
  --padding-card:      24px;
  --padding-card-sm:   16px;
  --padding-input:     10px 14px;
  --padding-badge:     3px 8px;
  --padding-tooltip:   6px 10px;

  /* Layout gaps */
  --gap-cards:         16px;
  --gap-section:       48px;
  --gap-page:          80px;

  /* Max widths */
  --max-content:       1480px;
  --max-text:          680px;
  --max-narrow:        480px;
}
```

### Border Radius

```javascript
borderRadius: {
  'none': '0',
  'xs':   '2px',   // теги, мелкие badges
  'sm':   '4px',   // кнопки small, inputs small
  'md':   '6px',   // кнопки default, inputs
  'lg':   '8px',   // карточки small
  'xl':   '12px',  // карточки default ← main card radius
  '2xl':  '16px',  // карточки large, модалки
  '3xl':  '20px',  // панели hero
  'full': '9999px', // pills, avatars
},
```

### Shadow scale

```javascript
boxShadow: {
  // Elevation-based
  'xs':   '0 1px 2px rgba(0,0,0,0.20)',
  'sm':   '0 2px 4px rgba(0,0,0,0.25)',
  'md':   '0 4px 12px rgba(0,0,0,0.30)',
  'lg':   '0 8px 24px rgba(0,0,0,0.35)',
  'xl':   '0 16px 48px rgba(0,0,0,0.40)',

  // Glow variants
  'glow-teal':    '0 0 24px rgba(0,201,177,0.20), 0 0 8px rgba(0,201,177,0.10)',
  'glow-teal-sm': '0 0 12px rgba(0,201,177,0.15)',
  'glow-indigo':  '0 0 24px rgba(91,106,240,0.20), 0 0 8px rgba(91,106,240,0.10)',
  'glow-violet':  '0 0 20px rgba(139,92,246,0.18)',

  // Card hover
  'card-hover': '0 8px 32px rgba(0,0,0,0.35), 0 0 0 1px rgba(255,255,255,0.08)',

  // Focus ring (через outline лучше, но shadow как fallback)
  'focus':  '0 0 0 2px rgba(0,201,177,0.50)',
  'focus-error': '0 0 0 2px rgba(244,63,94,0.50)',

  'none': 'none',
},
```

---

## 5. Component States

### Полная матрица состояний

```
State        Описание                          Визуальный сигнал
──────────────────────────────────────────────────────────────────
default      Исходное состояние
hover        Курсор над элементом              bg shift, border lighten, subtle lift
focus        Keyboard focus                    focus ring (outline teal 2px)
focus-visible  Focus только от keyboard        focus ring видим, от mouse — нет
active       Нажато / выбрано                  scale down, bg darken
disabled     Недоступно                        opacity 0.38, cursor not-allowed
loading      Ожидание ответа                   skeleton shimmer или spinner
error        Ошибка валидации                  border-error, text-error, icon
success      Успешное действие                 border-green, check icon
selected     Выбрано из списка                 bg-interactive-selected, check
```

---

## 6. Tailwind Config — Полная структура

```javascript
// tailwind.config.js

const colors = require('./src/tokens/colors');

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,jsx,ts,tsx}'],
  darkMode: 'class', // 'class' → управляем через .dark на <html>

  theme: {
    // ─── Полный override цветов ───────────────────────────────
    colors: {
      transparent: 'transparent',
      current: 'currentColor',
      white: '#FFFFFF',
      black: '#000000',

      // Primitives (для прямого использования когда нужно)
      navy:   colors.primitives.navy,
      slate:  colors.primitives.slate,
      teal:   colors.primitives.teal,
      indigo: colors.primitives.indigo,
      violet: colors.primitives.violet,
      green:  colors.primitives.green,
      rose:   colors.primitives.rose,
      amber:  colors.primitives.amber,

      // Semantic (CSS vars — работает в обеих темах автоматически)
      bg: {
        base:     'var(--color-bg-base)',
        surface:  'var(--color-bg-surface)',
        elevated: 'var(--color-bg-elevated)',
        overlay:  'var(--color-bg-overlay)',
        input:    'var(--color-bg-input)',
        code:     'var(--color-bg-code)',
      },
      text: {
        primary:   'var(--color-text-primary)',
        secondary: 'var(--color-text-secondary)',
        muted:     'var(--color-text-muted)',
        faint:     'var(--color-text-faint)',
        disabled:  'var(--color-text-disabled)',
        inverse:   'var(--color-text-inverse)',
        accent:    'var(--color-text-accent)',
        link:      'var(--color-text-link)',
      },
      border: {
        DEFAULT:  'var(--color-border-default)',
        subtle:   'var(--color-border-subtle)',
        strong:   'var(--color-border-strong)',
        accent:   'var(--color-border-accent)',
        focus:    'var(--color-border-focus)',
        error:    'var(--color-border-error)',
      },
      accent: {
        primary:       'var(--color-accent-primary)',
        'primary-hover':'var(--color-accent-primary-hover)',
        'primary-dim': 'var(--color-accent-primary-dim)',
        secondary:     'var(--color-accent-secondary)',
        'secondary-hover':'var(--color-accent-secondary-hover)',
        ai:            'var(--color-accent-ai)',
      },
      status: {
        positive:    'var(--color-status-positive)',
        'positive-bg':'var(--color-status-positive-bg)',
        negative:    'var(--color-status-negative)',
        'negative-bg':'var(--color-status-negative-bg)',
        warning:     'var(--color-status-warning)',
        'warning-bg':'var(--color-status-warning-bg)',
        info:        'var(--color-status-info)',
      },
      chart: {
        grid:    'var(--color-chart-grid)',
        axis:    'var(--color-chart-axis)',
        label:   'var(--color-chart-label)',
        series1: 'var(--color-chart-series-1)',
        series2: 'var(--color-chart-series-2)',
        series3: 'var(--color-chart-series-3)',
        series4: 'var(--color-chart-series-4)',
      },
      interactive: {
        hover:    'var(--color-interactive-hover)',
        active:   'var(--color-interactive-active)',
        selected: 'var(--color-interactive-selected)',
      },
    },

    extend: {
      // ─── Fonts ─────────────────────────────────────────────
      fontFamily: {
        sans:    ['Inter', 'system-ui', 'sans-serif'],
        mono:    ['JetBrains Mono', 'Fira Code', 'monospace'],
        display: ['Manrope', 'Inter', 'sans-serif'],
      },

      // ─── Font sizes (см. Section 3) ────────────────────────
      fontSize: {
        'display-2xl': ['4.5rem',   { lineHeight: '1.08', letterSpacing: '-0.03em' }],
        'display-xl':  ['3.75rem',  { lineHeight: '1.10', letterSpacing: '-0.025em' }],
        'display-lg':  ['3rem',     { lineHeight: '1.12', letterSpacing: '-0.02em' }],
        'display-md':  ['2.25rem',  { lineHeight: '1.20', letterSpacing: '-0.02em' }],
        'display-sm':  ['1.875rem', { lineHeight: '1.25', letterSpacing: '-0.015em' }],
        'h1': ['1.5rem',    { lineHeight: '1.30', letterSpacing: '-0.01em' }],
        'h2': ['1.25rem',   { lineHeight: '1.35', letterSpacing: '-0.01em' }],
        'h3': ['1.125rem',  { lineHeight: '1.40', letterSpacing: '-0.005em' }],
        'h4': ['1rem',      { lineHeight: '1.45', letterSpacing: '0' }],
        'h5': ['0.875rem',  { lineHeight: '1.45', letterSpacing: '0' }],
        'h6': ['0.75rem',   { lineHeight: '1.45', letterSpacing: '0.01em' }],
        'body-lg':  ['1.125rem',  { lineHeight: '1.65' }],
        'body':     ['0.875rem',  { lineHeight: '1.60' }],
        'body-sm':  ['0.8125rem', { lineHeight: '1.55' }],
        'caption':  ['0.75rem',   { lineHeight: '1.50' }],
        'label':    ['0.6875rem', { lineHeight: '1.45', letterSpacing: '0.06em' }],
        'overline': ['0.625rem',  { lineHeight: '1.40', letterSpacing: '0.12em' }],
        'mono-data':    ['0.875rem', { lineHeight: '1.50', letterSpacing: '-0.01em' }],
        'mono-data-lg': ['1.5rem',   { lineHeight: '1.30', letterSpacing: '-0.02em' }],
        'mono-data-xl': ['2.25rem',  { lineHeight: '1.20', letterSpacing: '-0.025em' }],
        'mono-code':    ['0.8125rem',{ lineHeight: '1.60' }],
      },

      // ─── Spacing (см. Section 4) ───────────────────────────
      // (стандартный Tailwind spacing + кастомные)

      // ─── Border radius ─────────────────────────────────────
      borderRadius: {
        'xs':  '2px',
        'sm':  '4px',
        'md':  '6px',
        'lg':  '8px',
        'xl':  '12px',
        '2xl': '16px',
        '3xl': '20px',
      },

      // ─── Shadows ───────────────────────────────────────────
      boxShadow: {
        'xs':   '0 1px 2px rgba(0,0,0,0.20)',
        'sm':   '0 2px 4px rgba(0,0,0,0.25)',
        'md':   '0 4px 12px rgba(0,0,0,0.30)',
        'lg':   '0 8px 24px rgba(0,0,0,0.35)',
        'xl':   '0 16px 48px rgba(0,0,0,0.40)',
        'glow-teal':    '0 0 24px rgba(0,201,177,0.20), 0 0 8px rgba(0,201,177,0.10)',
        'glow-teal-sm': '0 0 12px rgba(0,201,177,0.15)',
        'glow-indigo':  '0 0 24px rgba(91,106,240,0.20)',
        'glow-violet':  '0 0 20px rgba(139,92,246,0.18)',
        'card-hover':   '0 8px 32px rgba(0,0,0,0.35), 0 0 0 1px rgba(255,255,255,0.08)',
        'focus':        '0 0 0 2px rgba(0,201,177,0.50)',
        'focus-error':  '0 0 0 2px rgba(244,63,94,0.50)',
      },

      // ─── Motion (из motion_system.md) ──────────────────────
      transitionTimingFunction: {
        'out-standard':   'cubic-bezier(0.0, 0.0, 0.2, 1.0)',
        'out-premium':    'cubic-bezier(0.0, 0.0, 0.1, 1.0)',
        'in-standard':    'cubic-bezier(0.4, 0.0, 1.0, 1.0)',
        'in-out-standard':'cubic-bezier(0.4, 0.0, 0.2, 1.0)',
        'sharp':          'cubic-bezier(0.4, 0.0, 0.6, 1.0)',
        'bounce-soft':    'cubic-bezier(0.34, 1.1, 0.64, 1.0)',
      },
      transitionDuration: {
        '80': '80ms', '120': '120ms', '180': '180ms',
        '350': '350ms', '450': '450ms', '600': '600ms', '800': '800ms',
      },
    },
  },

  plugins: [
    // Кастомные утилиты
    ({ addUtilities, addComponents, theme }) => {
      addUtilities({
        // Text utilities
        '.text-balance':  { textWrap: 'balance' },
        '.font-tabular':  { fontVariantNumeric: 'tabular-nums' },
        '.font-slashed-zero': { fontVariantNumeric: 'slashed-zero' },

        // Interactive
        '.interactive': {
          cursor: 'pointer',
          transition: 'all 150ms cubic-bezier(0.0, 0.0, 0.2, 1.0)',
          '&:hover': { backgroundColor: 'var(--color-interactive-hover)' },
          '&:active': { backgroundColor: 'var(--color-interactive-active)' },
          '&:focus-visible': {
            outline: '2px solid var(--color-border-focus)',
            outlineOffset: '2px',
          },
          '&:disabled, &[aria-disabled="true"]': {
            opacity: '0.38',
            cursor: 'not-allowed',
            pointerEvents: 'none',
          },
        },
        '.focus-ring': {
          '&:focus-visible': {
            outline: '2px solid var(--color-border-focus)',
            outlineOffset: '2px',
          },
        },
      });

      addComponents({
        // ─── Base card ──────────────────────────────────────
        '.card': {
          backgroundColor: 'var(--color-bg-surface)',
          borderRadius: theme('borderRadius.xl'),
          border: '1px solid var(--color-border-default)',
          padding: '24px',
          transition: 'transform 150ms ease-out, box-shadow 150ms ease-out, border-color 150ms ease-out',
        },
        '.card-hover': {
          '&:hover': {
            transform: 'translateY(-2px)',
            boxShadow: theme('boxShadow.card-hover'),
            borderColor: 'var(--color-border-strong)',
          },
        },

        // ─── Buttons ────────────────────────────────────────
        '.btn': {
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '8px',
          fontFamily: theme('fontFamily.sans').join(', '),
          fontSize: '0.875rem',
          fontWeight: '500',
          lineHeight: '1.45',
          borderRadius: theme('borderRadius.md'),
          border: '1px solid transparent',
          cursor: 'pointer',
          transition: 'all 120ms cubic-bezier(0.4, 0.0, 0.6, 1.0)',
          padding: '10px 20px',
          userSelect: 'none',
          '&:focus-visible': {
            outline: '2px solid var(--color-border-focus)',
            outlineOffset: '2px',
          },
          '&:disabled, &[aria-disabled="true"]': {
            opacity: '0.38',
            cursor: 'not-allowed',
            pointerEvents: 'none',
          },
          '&:active:not(:disabled)': {
            transform: 'scale(0.97)',
          },
        },
        '.btn-primary': {
          backgroundColor: 'var(--color-accent-primary)',
          color: 'var(--color-text-inverse)',
          '&:hover:not(:disabled)': {
            backgroundColor: 'var(--color-accent-primary-hover)',
            boxShadow: theme('boxShadow.glow-teal-sm'),
          },
        },
        '.btn-secondary': {
          backgroundColor: 'transparent',
          color: 'var(--color-text-primary)',
          border: '1px solid var(--color-border-default)',
          '&:hover:not(:disabled)': {
            backgroundColor: 'var(--color-interactive-hover)',
            borderColor: 'var(--color-border-strong)',
          },
        },
        '.btn-ghost': {
          backgroundColor: 'transparent',
          color: 'var(--color-text-muted)',
          border: '1px solid transparent',
          '&:hover:not(:disabled)': {
            backgroundColor: 'var(--color-interactive-hover)',
            color: 'var(--color-text-primary)',
          },
        },
        '.btn-danger': {
          backgroundColor: 'transparent',
          color: 'var(--color-status-negative)',
          border: '1px solid var(--color-status-negative)',
          '&:hover:not(:disabled)': {
            backgroundColor: 'var(--color-status-negative-bg)',
          },
        },
        '.btn-sm': { padding: '6px 12px', fontSize: '0.8125rem' },
        '.btn-lg': { padding: '14px 28px', fontSize: '1rem' },

        // ─── Input ──────────────────────────────────────────
        '.input': {
          width: '100%',
          backgroundColor: 'var(--color-bg-input)',
          color: 'var(--color-text-primary)',
          border: '1px solid var(--color-border-default)',
          borderRadius: theme('borderRadius.md'),
          padding: '10px 14px',
          fontSize: '0.875rem',
          lineHeight: '1.45',
          outline: 'none',
          transition: 'border-color 150ms ease-out, box-shadow 150ms ease-out',
          '&::placeholder': { color: 'var(--color-text-faint)' },
          '&:hover': { borderColor: 'var(--color-border-strong)' },
          '&:focus': {
            borderColor: 'var(--color-border-focus)',
            boxShadow: theme('boxShadow.focus'),
          },
          '&[aria-invalid="true"], &.is-error': {
            borderColor: 'var(--color-border-error)',
            '&:focus': { boxShadow: theme('boxShadow.focus-error') },
          },
          '&:disabled': {
            opacity: '0.38',
            cursor: 'not-allowed',
            backgroundColor: 'var(--color-bg-surface)',
          },
        },

        // ─── Badge ──────────────────────────────────────────
        '.badge': {
          display: 'inline-flex',
          alignItems: 'center',
          gap: '4px',
          padding: '3px 8px',
          borderRadius: theme('borderRadius.full'),
          fontSize: '0.6875rem',
          fontWeight: '500',
          lineHeight: '1.45',
          letterSpacing: '0.02em',
        },
        '.badge-positive': {
          backgroundColor: 'var(--color-status-positive-bg)',
          color: 'var(--color-status-positive)',
        },
        '.badge-negative': {
          backgroundColor: 'var(--color-status-negative-bg)',
          color: 'var(--color-status-negative)',
        },
        '.badge-warning': {
          backgroundColor: 'var(--color-status-warning-bg)',
          color: 'var(--color-status-warning)',
        },
        '.badge-neutral': {
          backgroundColor: 'var(--color-interactive-hover)',
          color: 'var(--color-text-muted)',
        },

        // ─── Skeleton ───────────────────────────────────────
        '.skeleton': {
          backgroundColor: 'var(--color-bg-elevated)',
          backgroundImage: `linear-gradient(90deg,
            rgba(255,255,255,0.03) 0%,
            rgba(255,255,255,0.08) 50%,
            rgba(255,255,255,0.03) 100%)`,
          backgroundSize: '200% 100%',
          animation: 'shimmer 1.4s ease-in-out infinite',
          borderRadius: theme('borderRadius.md'),
        },

        // ─── Panel / Section ────────────────────────────────
        '.panel': {
          backgroundColor: 'var(--color-bg-surface)',
          borderRadius: theme('borderRadius.xl'),
          border: '1px solid var(--color-border-default)',
          padding: '24px',
        },
        '.panel-title': {
          fontSize: '0.875rem',
          fontWeight: '600',
          color: 'var(--color-text-primary)',
          letterSpacing: '-0.005em',
          marginBottom: '0',
        },
        '.surface': {
          backgroundColor: 'var(--color-bg-surface)',
          border: '1px solid var(--color-border-default)',
          borderRadius: theme('borderRadius.lg'),
        },
      });
    },
  ],
};
```

---

## 7. CSS Variables (темы)

```css
/* src/styles/themes.css */

/* ═══════════════════════════════════════ DARK (default) */
:root,
.theme-dark {
  --color-bg-base:            #080F1A;
  --color-bg-surface:         #0F1B2D;
  --color-bg-elevated:        #162235;
  --color-bg-overlay:         rgba(4,10,18,0.85);
  --color-bg-input:           #0C1522;
  --color-bg-code:            #040A12;

  --color-text-primary:       #F0F4F8;
  --color-text-secondary:     #B8C5D4;
  --color-text-muted:         #8A9BB0;
  --color-text-faint:         #4A5A70;
  --color-text-disabled:      #344456;
  --color-text-inverse:       #080F1A;
  --color-text-accent:        #00C9B1;
  --color-text-link:          #2DD4C4;

  --color-border-default:     rgba(255,255,255,0.07);
  --color-border-subtle:      rgba(255,255,255,0.04);
  --color-border-strong:      rgba(255,255,255,0.14);
  --color-border-accent:      #00A894;
  --color-border-focus:       #00C9B1;
  --color-border-error:       #F43F5E;

  --color-accent-primary:     #00C9B1;
  --color-accent-primary-hover:#2DD4C4;
  --color-accent-primary-dim: rgba(0,201,177,0.12);
  --color-accent-secondary:   #5B6AF0;
  --color-accent-secondary-hover:#7B8AF3;
  --color-accent-ai:          #8B5CF6;

  --color-status-positive:    #10B981;
  --color-status-positive-bg: rgba(16,185,129,0.10);
  --color-status-negative:    #F43F5E;
  --color-status-negative-bg: rgba(244,63,94,0.10);
  --color-status-warning:     #F59E0B;
  --color-status-warning-bg:  rgba(245,158,11,0.10);
  --color-status-info:        #7B8AF3;

  --color-chart-grid:         rgba(255,255,255,0.06);
  --color-chart-axis:         rgba(255,255,255,0.15);
  --color-chart-label:        #6A7D94;
  --color-chart-series-1:     #00C9B1;
  --color-chart-series-2:     #7B8AF3;
  --color-chart-series-3:     #F59E0B;
  --color-chart-series-4:     #FB7185;

  --color-interactive-hover:  rgba(255,255,255,0.04);
  --color-interactive-active: rgba(255,255,255,0.08);
  --color-interactive-selected:rgba(0,201,177,0.10);
}

/* ═══════════════════════════════════════ LIGHT */
.theme-light {
  --color-bg-base:            #FFFFFF;
  --color-bg-surface:         #F4F6F9;
  --color-bg-elevated:        #EAECF0;
  --color-bg-overlay:         rgba(255,255,255,0.85);
  --color-bg-input:           #FFFFFF;
  --color-bg-code:            #F0F2F5;

  --color-text-primary:       #080F1A;
  --color-text-secondary:     #1E2F47;
  --color-text-muted:         #2A3F5C;
  --color-text-faint:         #3D5A7A;
  --color-text-disabled:      #5B7A9A;
  --color-text-inverse:       #F0F4F8;
  --color-text-accent:        #00A894;
  --color-text-link:          #00A894;

  --color-border-default:     rgba(0,0,0,0.08);
  --color-border-subtle:      rgba(0,0,0,0.04);
  --color-border-strong:      rgba(0,0,0,0.16);
  --color-border-accent:      #00C9B1;
  --color-border-focus:       #00C9B1;
  --color-border-error:       #F43F5E;

  --color-accent-primary:     #00C9B1;
  --color-accent-primary-hover:#00A894;
  --color-accent-primary-dim: rgba(0,201,177,0.08);
  --color-accent-secondary:   #5B6AF0;
  --color-accent-secondary-hover:#4455E8;
  --color-accent-ai:          #7C3AED;

  --color-status-positive:    #059669;
  --color-status-positive-bg: rgba(5,150,105,0.08);
  --color-status-negative:    #E11D48;
  --color-status-negative-bg: rgba(225,29,72,0.08);
  --color-status-warning:     #D97706;
  --color-status-warning-bg:  rgba(217,119,6,0.08);
  --color-status-info:        #5B6AF0;

  --color-chart-grid:         rgba(0,0,0,0.06);
  --color-chart-axis:         rgba(0,0,0,0.15);
  --color-chart-label:        #3D5A7A;
  --color-chart-series-1:     #00A894;
  --color-chart-series-2:     #5B6AF0;
  --color-chart-series-3:     #D97706;
  --color-chart-series-4:     #E11D48;

  --color-interactive-hover:  rgba(0,0,0,0.04);
  --color-interactive-active: rgba(0,0,0,0.08);
  --color-interactive-selected:rgba(0,201,177,0.08);
}

/* ═══════════════════════════════════════ HIGH CONTRAST */
.theme-high-contrast {
  --color-bg-base:            #000000;
  --color-bg-surface:         #0A0A0A;
  --color-bg-elevated:        #141414;
  --color-text-primary:       #FFFFFF;
  --color-text-secondary:     #E0E0E0;
  --color-text-muted:         #BDBDBD;
  --color-text-faint:         #9E9E9E;
  --color-border-default:     rgba(255,255,255,0.30);
  --color-border-strong:      rgba(255,255,255,0.60);
  --color-border-focus:       #FFFFFF;
  --color-accent-primary:     #00FFE5;
  --color-accent-primary-hover:#66FFF5;
  --color-status-positive:    #00FF88;
  --color-status-negative:    #FF4466;
  --color-status-warning:     #FFD600;
  --color-chart-grid:         rgba(255,255,255,0.20);
  --color-chart-axis:         rgba(255,255,255,0.50);
  --color-chart-series-1:     #00FFE5;
  --color-chart-series-2:     #8888FF;
  --color-chart-series-3:     #FFD600;
  --color-chart-series-4:     #FF6688;
  /* остальные переменные наследуются от :root */
}
```

---

## 8. Примеры реальных компонентов

### Карточка Feature

```jsx
<div className="card card-hover group cursor-default">
  {/* Номер */}
  <span className="absolute top-4 right-4 font-mono text-caption
                   text-text-faint select-none font-tabular">
    01
  </span>

  {/* Иконка */}
  <div className="w-10 h-10 rounded-lg bg-accent-primary-dim
                  flex items-center justify-center mb-4">
    <TrendingUpIcon className="w-5 h-5 text-accent-primary" />
  </div>

  {/* Контент */}
  <h3 className="text-h4 font-semibold text-text-primary mb-2">
    Сравнение стран
  </h3>
  <p className="text-body text-text-muted leading-relaxed">
    До 4 стран и 4 индикаторов. Line, bar, scatter.
  </p>
</div>
```

### Stat Card (числовой)

```jsx
<div className="surface p-5">
  <p className="text-caption text-text-muted uppercase tracking-wider mb-1">
    GDP per capita · KZ
  </p>
  <div className="flex items-baseline gap-2">
    <span className="font-mono text-mono-data-xl text-text-primary font-tabular">
      12,847
    </span>
    <span className="text-caption text-text-muted">USD</span>
  </div>
  <div className="flex items-center gap-1 mt-1">
    <TrendUpIcon className="w-3.5 h-3.5 text-status-positive" aria-hidden />
    <span className="text-caption text-status-positive font-medium">+4.2%</span>
    <span className="text-caption text-text-faint">vs 2022</span>
  </div>
</div>
```

### Input с состояниями

```jsx
{/* Default */}
<input className="input" placeholder="Введите страну" />

{/* Error state */}
<input className="input is-error" aria-invalid="true"
       aria-describedby="country-error" />
<p id="country-error" className="text-caption text-status-negative mt-1">
  Выберите страну из списка
</p>

{/* Disabled */}
<input className="input" disabled placeholder="Недоступно" />
```

### Кнопки всех вариантов

```jsx
{/* Primary */}
<button className="btn btn-primary">
  Начать анализ
</button>

{/* Primary large */}
<button className="btn btn-primary btn-lg">
  Создать аккаунт
</button>

{/* Secondary */}
<button className="btn btn-secondary">
  Посмотреть пример
</button>

{/* Ghost */}
<button className="btn btn-ghost">
  Отмена
</button>

{/* Loading state */}
<button className="btn btn-primary" disabled aria-busy="true">
  <Spinner className="w-4 h-4 animate-spin" aria-hidden />
  Загрузка...
</button>
```

### Badge / Trend индикатор

```jsx
{/* Positive trend */}
<span className="badge badge-positive">
  <TrendUpIcon className="w-3 h-3" aria-hidden />
  +4.2%
</span>

{/* Negative trend */}
<span className="badge badge-negative">
  <TrendDownIcon className="w-3 h-3" aria-hidden />
  −1.8%
</span>

{/* Neutral */}
<span className="badge badge-neutral">
  World Bank
</span>
```

### Skeleton Loading

```jsx
{/* Card skeleton */}
<div className="card">
  <div className="skeleton h-4 w-3/4 mb-3" />
  <div className="skeleton h-8 w-1/2 mb-4" />
  <div className="skeleton h-3 w-full mb-2" />
  <div className="skeleton h-3 w-5/6" />
</div>

{/* Chart skeleton */}
<div className="surface p-4">
  <div className="skeleton h-4 w-40 mb-4" />
  <div className="skeleton h-[200px] w-full rounded-lg" />
</div>
```

### Индикатор-код (mono)

```jsx
{/* В списке выбора */}
<span className="text-body text-text-primary">
  GDP per capita (current US$)
  <span className="font-mono text-caption text-text-faint ml-2">
    NY.GDP.PCAP.CD
  </span>
</span>
```

### Пустое состояние

```jsx
<div className="flex flex-col items-center justify-center py-16 px-8 text-center">
  <ChartBarIcon className="w-10 h-10 text-text-faint mb-4" aria-hidden />
  <h3 className="text-h4 font-semibold text-text-primary mb-2">
    Анализ не запущен
  </h3>
  <p className="text-body text-text-muted max-w-xs">
    Выберите страну и индикатор, затем нажмите «Запустить сравнение».
  </p>
</div>
```

---

## 9. Naming Conventions — Шпаргалка

```
✓ ПРАВИЛЬНО               ✗ НЕПРАВИЛЬНО

text-text-primary          text-white
text-text-muted            text-gray-400
bg-bg-surface              bg-gray-900
border-border-default      border-gray-700/10
text-status-positive       text-green-500
text-status-negative       text-red-500
text-accent-primary        text-teal-500
shadow-glow-teal           shadow-[0_0_24px_...]

Компонент:   .card, .btn, .input, .badge, .panel, .skeleton, .surface
State:       .is-error, .is-loading, [disabled], [aria-busy], [aria-invalid]
Утилита:     .interactive, .focus-ring, .font-tabular, .text-balance
```

---

*EVision Design System v1 · Design Systems Engineer · 2026*

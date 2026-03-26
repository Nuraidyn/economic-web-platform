# EVision — Motion System v1

Motion Designer + Frontend Performance Engineer · React + Tailwind · 2026

---

## Философия

```
Правило #1:  Анимация объясняет — не развлекает.
Правило #2:  Если убрать анимацию, интерфейс должен работать одинаково хорошо.
Правило #3:  60fps — не цель, это минимум.
Правило #4:  Пользователь не должен ждать анимацию. Анимация ждёт пользователя.
```

Каждое движение на экране отвечает на один из трёх вопросов:
- **Где я?** — ориентация (page transition)
- **Что появилось?** — внимание (section reveal)
- **Что произошло?** — обратная связь (micro)

---

## 1. Три уровня анимации

### Уровень 1 · Micro (интерактивная обратная связь)

Реакция на действие пользователя. Происходит мгновенно, не блокирует.

```
Триггеры: hover, focus, click, toggle, checkbox, input focus
Duration: 120–200ms
Easing:   ease-out (быстрый старт, плавный стоп)
Property: transform, opacity, box-shadow, border-color, color

Примеры в EVision:
  — Hover карточки:        translateY(-2px) + box-shadow, 150ms
  — Hover кнопки:          brightness(1.1) + subtle scale(1.02), 120ms
  — Focus input:           border-color transition + ring появляется, 150ms
  — Click кнопки:          scale(0.97) → scale(1), 100ms + 120ms
  — Checkbox toggle:       check mark draw-in, 160ms
  — Tab active:            background slide, 180ms
  — Tooltip appear:        opacity 0→1 + translateY(4px→0), 150ms
  — Dropdown open:         translateY(-4px→0) + opacity, 180ms
  — Loading button:        spinner fade-in, text fade-out, 150ms
```

---

### Уровень 2 · Section (контентный reveal)

Контент появляется при скролле. Создаёт ощущение «живой» страницы.

```
Триггеры: IntersectionObserver (viewport entry)
Duration: 280–450ms
Easing:   ease-out или custom decelerate
Property: opacity + transform (только)
Stagger:  40–80ms между элементами группы

Примеры в EVision:
  — Hero headline:         fade + translateY(20px→0), 380ms
  — Feature cards:         fade + translateY(16px→0), stagger 60ms, 350ms
  — Stat number reveal:    fade-in, затем count-up, 300ms + 700ms
  — Chart draw-in:         Chart.js animation 500ms после fade контейнера
  — Trust strip items:     fade, stagger 40ms, 250ms
  — AI chat bubbles:       slide-in от стороны отправителя, 300ms
  — CTA block:             fade + scale(0.98→1), 400ms
```

---

### Уровень 3 · Page Transition (между маршрутами)

Переход между страницами приложения. Ориентирует пользователя в пространстве.

```
Триггеры: React Router навигация
Duration: 200–280ms (out) + 200–280ms (in) = ~480ms total
Easing:   linear для fade, ease-out для slide
Property: opacity (обязательно), transform (опционально)

Стратегия EVision (React Router + CSS):
  Exit:   opacity 1→0 + translateX(0→-8px), 200ms ease-in
  Enter:  opacity 0→1 + translateX(8px→0),  220ms ease-out, delay 40ms

Важно: NavigationStart → DOM update → Enter animation
  Нельзя показывать старую страницу пока грузится новая > 300ms
  При долгой загрузке: показать loading indicator после 300ms
```

---

## 2. Easing-кривые

### Кривые EVision

```
ease.out.standard     cubic-bezier(0.0, 0.0, 0.2, 1.0)
  Использование: большинство появлений, reveals, tooltips
  Характер: быстрый вход → плавное торможение у цели

ease.out.decelerate   cubic-bezier(0.0, 0.0, 0.1, 1.0)
  Использование: большие элементы (hero, modal), page transitions
  Характер: очень быстрый старт, мягкая посадка — «premium feel»

ease.in.standard      cubic-bezier(0.4, 0.0, 1.0, 1.0)
  Использование: исчезновение (exit), closing animations
  Характер: медленный старт → ускорение к концу

ease.in-out.standard  cubic-bezier(0.4, 0.0, 0.2, 1.0)
  Использование: переключения состояний (toggle, tab switch)
  Характер: симметричное ускорение/торможение

ease.sharp            cubic-bezier(0.4, 0.0, 0.6, 1.0)
  Использование: очень быстрые micro-анимации (checkbox, toggle)
  Характер: почти линейный, без выраженных пиков

ease.bounce.soft      cubic-bezier(0.34, 1.1, 0.64, 1.0)
  Использование: ТОЛЬКО в одном месте — появление floating card в Hero
  Характер: легкий overshoot 10% — не bounce, а «упругость»
  Запрет: нигде больше на странице
```

### Визуальное сравнение

```
Скорость →

ease.out.decelerate:   ████████▓▒░·····
ease.out.standard:     ██████▓▓▒▒░░····
ease.in-out:           ··▒▒▓▓████▓▓▒▒··
ease.in.standard:      ····░░▒▒▓▓██████
ease.sharp:            ███████████▓▒░··
ease.bounce.soft:      ████████▓▒░▒▓▒··  (лёгкий перелёт)
```

---

## 3. Duration и Delay

### Базовая шкала длительностей

```
duration.instant    80ms   — click feedback, ripple
duration.fast      120ms   — hover transitions, color change
duration.quick     180ms   — tooltip, dropdown, micro-state
duration.normal    250ms   — standard UI transitions (default)
duration.moderate  350ms   — section elements, cards
duration.slow      450ms   — large containers, modal open
duration.deliberate 600ms  — page transitions, chart draws
duration.narrative  800ms  — count-up numbers, hero entrance
```

### Правило выбора duration

```
Маленький элемент (< 40px)  → fast/quick   (120–180ms)
Средний элемент (40–200px)  → normal       (250ms)
Большой элемент (> 200px)   → moderate/slow (350–450ms)
Весь экран                  → deliberate   (500–600ms)
Числовые данные (count-up)  → narrative    (600–900ms)
```

### Delay для stagger-групп

```
stagger.tight      30ms   — inline элементы, иконки
stagger.normal     50ms   — список элементов
stagger.relaxed    80ms   — карточки
stagger.spacious  120ms   — секции (Hero → subtitle → CTA)

Максимум элементов в stagger: 8
Если элементов > 8: делить на подгруппы или убрать stagger
```

---

## 4. Гайд по свойствам

### opacity

```
Когда использовать:
  ✓ Появление/исчезновение любого элемента
  ✓ Переход между состояниями (empty → content)
  ✓ Hover-подсветка (изменение прозрачности overlay)
  ✓ Skeleton → content

Правила:
  — Всегда в паре с transform (только opacity создаёт «pop», некрасиво)
  — Start opacity: 0 (появление) или 1 (исчезновение)
  — Никогда не анимировать opacity на background-color через CSS filter
  — Минимальное значение для «dim» состояния: opacity 0.4 (не ниже)

Запрет:
  ✗ opacity на body или крупных layout-элементах (дорого)
  ✗ opacity animation без will-change на элементах > 300px
```

### transform

```
Когда использовать:
  ✓ translateY: появление снизу/сверху (reveals, dropdowns)
  ✓ translateX: появление сбоку (page transitions, drawers)
  ✓ scale: кнопки при click, modal появление
  ✓ Parallax-сдвиг (только transform, не top/left)

Правила:
  — translateY диапазон для reveals: 8–24px (по размеру элемента)
  — scale диапазон: 0.95–1.05 (не более)
  — Никогда transform: rotate() без explicit причины
  — translate3d() или translateZ(0) для GPU-слоя (но осторожно с памятью)

Запрет:
  ✗ Анимировать top/left вместо translateX/Y — reflow
  ✗ Анимировать width/height — reflow
  ✗ Анимировать margin/padding — reflow
  ✗ scale > 1.1 — выглядит неточно
```

### blur (backdrop-filter и filter: blur)

```
Когда использовать:
  ✓ Navbar backdrop (статичный, не анимированный)
  ✓ Модальные overlay (статичный blur за модалкой)
  ✓ Floating cards в Hero (статичный)
  ✓ Transition состояний loading → content (лёгкий blur)

Анимировать blur ОСТОРОЖНО:
  — Loading → ready: filter blur(4px→0px), 300ms — допустимо
  — Стоимость: каждый frame repaint (дорого на low-end)
  — Никогда не анимировать backdrop-filter (очень дорого)

Правила blur-значений:
  — backdrop-filter navbar:  blur(16px) — стандарт
  — floating card:           blur(12px)
  — modal overlay:           blur(4px) за содержимым
  — Максимальный blur:       blur(24px)

Запрет:
  ✗ blur() на анимации скролла (catastrophic performance)
  ✗ backdrop-filter на большом количестве элементов одновременно
  ✗ blur() на мобиле без проверки производительности
```

### gradient shift

```
Когда использовать:
  ✓ CTA-кнопка hover: gradient position shift (background-position)
  ✓ Hero glow slow pulse: keyframe opacity (НЕ gradient изменение)
  ✓ Loading skeleton: gradient sweep (shimmer)

Правила:
  — Не анимировать gradient через CSS (браузеры не интерполируют)
  — Анимировать background-position на фиксированном gradient
  — Shimmer: background-size: 200%, animate background-position: -100%→100%
  — Glow pulse: анимировать opacity overlay, не сам gradient

Кнопка с animated gradient:
  background: linear-gradient(90deg, #00C9B1 0%, #5B6AF0 100%);
  background-size: 200% 100%;
  transition: background-position 300ms ease-out;
  &:hover { background-position: 100% 0; }

Skeleton shimmer:
  background: linear-gradient(90deg,
    rgba(255,255,255,0.03) 0%,
    rgba(255,255,255,0.08) 50%,
    rgba(255,255,255,0.03) 100%);
  background-size: 200% 100%;
  animation: shimmer 1.4s ease-in-out infinite;

@keyframes shimmer {
  0%   { background-position: -100% 0; }
  100% { background-position:  100% 0; }
}
```

---

## 5. Scroll-based Reveal System

### IntersectionObserver конфигурация

```javascript
// hooks/useReveal.js
import { useEffect, useRef, useState } from 'react';

const DEFAULT_OPTIONS = {
  threshold: 0.12,    // 12% элемента в viewport → trigger
  rootMargin: '0px 0px -48px 0px',  // offset снизу: чуть раньше края
};

export function useReveal(options = {}) {
  const ref = useRef(null);
  const [isVisible, setIsVisible] = useState(false);
  const opts = { ...DEFAULT_OPTIONS, ...options };

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        setIsVisible(true);
        // once: true → отписаться после первого появления
        if (opts.once !== false) observer.disconnect();
      }
    }, opts);

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return { ref, isVisible };
}
```

### Компонент Reveal

```jsx
// components/Reveal.jsx
import { useReveal } from '../hooks/useReveal';

const VARIANTS = {
  fadeUp:   'opacity-0 translate-y-5',
  fadeDown: 'opacity-0 -translate-y-5',
  fadeLeft: 'opacity-0 translate-x-5',
  fadeIn:   'opacity-0',
  scaleUp:  'opacity-0 scale-95',
};

export function Reveal({
  children,
  variant = 'fadeUp',
  delay = 0,
  duration = 'duration-[350ms]',
  once = true,
  threshold = 0.12,
  className = '',
}) {
  const { ref, isVisible } = useReveal({ once, threshold });

  return (
    <div
      ref={ref}
      style={{ transitionDelay: isVisible ? `${delay}ms` : '0ms' }}
      className={`
        transition-all ease-[cubic-bezier(0,0,0.2,1)]
        ${duration}
        ${isVisible ? 'opacity-100 translate-y-0 translate-x-0 scale-100' : VARIANTS[variant]}
        ${className}
      `}
    >
      {children}
    </div>
  );
}
```

### Компонент StaggerReveal

```jsx
// components/StaggerReveal.jsx
import { useReveal } from '../hooks/useReveal';

export function StaggerReveal({
  children,
  stagger = 60,       // ms между элементами
  baseDelay = 0,
  variant = 'fadeUp',
  threshold = 0.08,
}) {
  const { ref, isVisible } = useReveal({ threshold, once: true });

  return (
    <div ref={ref}>
      {React.Children.map(children, (child, i) => (
        <Reveal
          key={i}
          variant={variant}
          delay={isVisible ? baseDelay + i * stagger : 0}
          // delay срабатывает только когда parent видим
        >
          {child}
        </Reveal>
      ))}
    </div>
  );
}
```

### Threshold для разных типов контента

```
threshold: 0.05   — Большие блоки (hero, секции) — trigger почти сразу
threshold: 0.12   — Карточки, средние элементы — DEFAULT
threshold: 0.20   — Маленькие элементы (иконки, badges) — нужна видимость
threshold: 0.30   — Числовые счётчики — показывать только когда полностью в кадре
```

### once vs replay

```
once: true  [РЕКОМЕНДУЕТСЯ ДЛЯ ВСЕХ]
  — Анимация срабатывает один раз при первом появлении
  — Не повторяется при скролле вверх и обратно
  — Не создаёт усталость при повторном просмотре
  — observer.disconnect() после trigger → нет утечки памяти

once: false  [ТОЛЬКО В ИСКЛЮЧИТЕЛЬНЫХ СЛУЧАЯХ]
  — Для элементов, которые УДАЛЯЮТСЯ из DOM при уходе из viewport
  — Для бесконечного скролла (новые данные)
  — Для live-dashboard (данные обновляются)
  — НИКОГДА для статичного контента (карточки, тексты, иконки)
```

### Порядок reveal на странице

```
Hero:
  0ms   — kicker text
  100ms — headline line 1
  180ms — headline line 2 (если multiline)
  280ms — subheadline
  400ms — CTA buttons (стек: primary → secondary, +60ms)
  550ms — scroll indicator

Trust Strip:
  0ms   — весь strip fade (нет stagger — слишком мало пространства)

Features:
  0ms   — section headline
  80ms  — section subline
  200ms — cards stagger, 60ms каждая (card 1 → card 2 → ... → card 6)

Analytics Preview:
  0ms   — left panel slides in
  100ms — right panel slides in
  300ms — chart draw animation (Chart.js)
  800ms — stat cards count-up

AI Insight:
  0ms   — chart появляется
  200ms — chat container
  400ms — user bubble
  700ms — typing indicator (3 dots)
  1200ms— AI response (typing effect, 20–30ms/символ)

CTA:
  0ms   — kicker
  80ms  — headline
  180ms — subtext
  300ms — buttons
  420ms — micro text
```

---

## 6. Reduced Motion Strategy

### Принцип: три режима

```
MODE A · Full Motion     (prefers-reduced-motion: no-preference)
  — Все анимации включены
  — Parallax активен
  — Typing animation полная
  — Count-up анимация

MODE B · Reduced Motion  (prefers-reduced-motion: reduce)
  — Opacity transitions: сокращены до 100ms
  — Transform transitions: отключены (элементы появляются на месте)
  — Parallax: полностью отключён
  — Typing animation: текст появляется сразу (мгновенно)
  — Count-up: показывает финальное число сразу

MODE C · No Motion       (кастомный toggle в настройках EVision)
  — Все transitions: 0ms
  — Только opacity (для screen readers — не скрывать элементы)
  — Пользователь явно выбрал «без анимаций»
```

### CSS реализация

```css
/* В tailwind.config.js добавить кастомные variants */
/* Или через глобальный CSS */

/* ============ REDUCED MOTION ============ */
@media (prefers-reduced-motion: reduce) {

  /* Отключить все transform анимации */
  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }

  /* Но сохранить opacity (важно для visibility) */
  .reveal-element {
    opacity: 1 !important;
    transform: none !important;
    transition: opacity 100ms ease !important;
  }

  /* Shimmer skeleton: убрать движение */
  .skeleton-shimmer {
    animation: none !important;
    background: rgba(255,255,255,0.05) !important;
  }

  /* Parallax: фиксировать */
  .parallax-element {
    transform: none !important;
    will-change: auto !important;
  }

  /* Chart.js: убрать draw анимацию */
  /* Устанавливается через Chart options: animation: false */
}
```

### React хук для reduced motion

```javascript
// hooks/useReducedMotion.js
import { useEffect, useState } from 'react';

export function useReducedMotion() {
  const [prefersReduced, setPrefersReduced] = useState(() => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  });

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const handler = (e) => setPrefersReduced(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  return prefersReduced;
}
```

### Применение в компонентах

```jsx
// Пример: count-up анимация с reduced motion fallback
function StatNumber({ value, suffix = '' }) {
  const reduced = useReducedMotion();
  const [displayed, setDisplayed] = useState(reduced ? value : 0);

  useEffect(() => {
    if (reduced) { setDisplayed(value); return; }
    // count-up логика только если reduced = false
    let start = 0;
    const duration = 800;
    const startTime = performance.now();
    const tick = (now) => {
      const progress = Math.min((now - startTime) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3); // ease-out cubic
      setDisplayed(Math.round(eased * value));
      if (progress < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }, [value, reduced]);

  return <span>{displayed}{suffix}</span>;
}

// Пример: Chart.js с reduced motion
const chartOptions = {
  animation: prefersReduced ? false : { duration: 500 },
};

// Пример: typing effect с reduced motion
function TypingText({ text }) {
  const reduced = useReducedMotion();
  if (reduced) return <p>{text}</p>;
  return <TypingAnimation text={text} speed={25} />;
}
```

### aria-live для анимированного контента

```jsx
// AI typing response — скринридер должен объявить когда готово
<div
  role="status"
  aria-live="polite"
  aria-atomic="true"
  aria-label="AI analysis result"
>
  {isTyping ? (
    <span aria-hidden="true"><TypingIndicator /></span>
  ) : (
    <p>{aiResponse}</p>  // объявляется скринридером когда появится
  )}
</div>

// Числа count-up — объявить финальное значение
<div aria-live="off">  {/* не объявлять каждый тик */}
  <span aria-label={`${finalValue} percent`}>
    <StatNumber value={finalValue} suffix="%" />
  </span>
</div>
```

---

## 7. Tailwind Config — Motion Utilities

```javascript
// tailwind.config.js
module.exports = {
  theme: {
    extend: {
      transitionTimingFunction: {
        'out-standard':    'cubic-bezier(0.0, 0.0, 0.2, 1.0)',
        'out-decelerate':  'cubic-bezier(0.0, 0.0, 0.1, 1.0)',
        'in-standard':     'cubic-bezier(0.4, 0.0, 1.0, 1.0)',
        'in-out-standard': 'cubic-bezier(0.4, 0.0, 0.2, 1.0)',
        'sharp':           'cubic-bezier(0.4, 0.0, 0.6, 1.0)',
        'bounce-soft':     'cubic-bezier(0.34, 1.1, 0.64, 1.0)',
      },
      transitionDuration: {
        '80':  '80ms',
        '120': '120ms',
        '180': '180ms',
        '350': '350ms',
        '450': '450ms',
        '600': '600ms',
        '800': '800ms',
      },
      keyframes: {
        'shimmer': {
          '0%':   { backgroundPosition: '-100% 0' },
          '100%': { backgroundPosition:  '100% 0' },
        },
        'glow-pulse': {
          '0%, 100%': { opacity: '0.08' },
          '50%':      { opacity: '0.14' },
        },
        'fade-up': {
          '0%':   { opacity: '0', transform: 'translateY(16px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'typing-dot': {
          '0%, 80%, 100%': { transform: 'scale(0.6)', opacity: '0.4' },
          '40%':           { transform: 'scale(1.0)', opacity: '1.0' },
        },
        'draw-line': {
          '0%':   { strokeDashoffset: '1' },
          '100%': { strokeDashoffset: '0' },
        },
      },
      animation: {
        'shimmer':      'shimmer 1.4s ease-in-out infinite',
        'glow-pulse':   'glow-pulse 4s ease-in-out infinite',
        'fade-up':      'fade-up 350ms cubic-bezier(0,0,0.2,1) forwards',
        'typing-dot-1': 'typing-dot 1.2s ease-in-out infinite 0ms',
        'typing-dot-2': 'typing-dot 1.2s ease-in-out infinite 200ms',
        'typing-dot-3': 'typing-dot 1.2s ease-in-out infinite 400ms',
        'draw-line':    'draw-line 600ms ease-out forwards',
      },
    },
  },
};
```

---

## 8. Page Transition (React Router)

### Реализация без тяжёлых библиотек

```jsx
// components/PageTransition.jsx
import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';

export function PageTransition({ children }) {
  const location = useLocation();
  const [displayLocation, setDisplayLocation] = useState(location);
  const [stage, setStage] = useState('enter'); // 'enter' | 'exit'
  const reduced = useReducedMotion();

  useEffect(() => {
    if (location !== displayLocation) {
      if (reduced) {
        setDisplayLocation(location);
        return;
      }
      setStage('exit');
      const t = setTimeout(() => {
        setDisplayLocation(location);
        setStage('enter');
      }, 200); // exit duration
      return () => clearTimeout(t);
    }
  }, [location]);

  return (
    <div
      className={`transition-all duration-200 ${
        stage === 'exit'
          ? 'opacity-0 -translate-x-2'
          : 'opacity-100 translate-x-0'
      } ease-in-out`}
    >
      {children}
    </div>
  );
}
```

---

## 9. Производительность

### Правила compositor-only анимаций

```
МОЖНО анимировать (compositor thread, 60fps):
  ✓ opacity
  ✓ transform: translate / scale / rotate

НЕЛЬЗЯ анимировать (main thread → reflow):
  ✗ width, height, max-height
  ✗ top, left, right, bottom
  ✗ margin, padding
  ✗ border-width
  ✗ font-size (reflow)
  ✗ background-color через JS (только CSS transition)
```

### will-change: когда и как

```javascript
// Правило: добавлять ПЕРЕД анимацией, убирать ПОСЛЕ
// Не ставить на все элементы — жрёт память (отдельный GPU layer на каждый)

// Правильно: через JS при hover
element.addEventListener('mouseenter', () => {
  el.style.willChange = 'transform, opacity';
});
element.addEventListener('animationend', () => {
  el.style.willChange = 'auto';
});

// Правильно: только на actively animated
// CSS: will-change: transform — только на parallax и навбаре
// Tailwind: не создавать .will-change-transform на всех карточках
```

### Мониторинг в dev режиме

```javascript
// utils/motionDebug.js — только в development
if (process.env.NODE_ENV === 'development') {
  // Показать предупреждение если анимация > 16ms/frame
  const observer = new PerformanceObserver((list) => {
    for (const entry of list.getEntries()) {
      if (entry.duration > 16) {
        console.warn(`[Motion] Long frame: ${entry.duration.toFixed(1)}ms`);
      }
    }
  });
  observer.observe({ entryTypes: ['longtask'] });
}
```

### Lazy анимации (не грузить JS зря)

```jsx
// Chart animation — только когда элемент в viewport
const [chartVisible, setChartVisible] = useState(false);
// chartVisible = true только при IntersectionObserver trigger
// Chart.js не инициализируется пока не нужен
const chartOptions = useMemo(() => ({
  animation: chartVisible ? { duration: 500 } : false,
}), [chartVisible]);
```

---

## 10. Таблица токенов

### motion.duration.*

| Токен | Значение | CSS var | Использование |
|---|---|---|---|
| `motion.duration.instant` | 80ms | `--duration-instant` | Click ripple, immediate feedback |
| `motion.duration.fast` | 120ms | `--duration-fast` | Hover color, icon state |
| `motion.duration.quick` | 180ms | `--duration-quick` | Tooltip, dropdown, checkbox |
| `motion.duration.normal` | 250ms | `--duration-normal` | Default UI transition |
| `motion.duration.moderate` | 350ms | `--duration-moderate` | Cards, section elements |
| `motion.duration.slow` | 450ms | `--duration-slow` | Modal open, large container |
| `motion.duration.deliberate` | 600ms | `--duration-deliberate` | Page transition, chart draw |
| `motion.duration.narrative` | 800ms | `--duration-narrative` | Count-up, hero entrance |

### motion.ease.*

| Токен | Значение cubic-bezier | CSS var | Использование |
|---|---|---|---|
| `motion.ease.out` | `(0.0, 0.0, 0.2, 1.0)` | `--ease-out` | Появления, reveals (default) |
| `motion.ease.out.premium` | `(0.0, 0.0, 0.1, 1.0)` | `--ease-out-premium` | Hero, modal, large elements |
| `motion.ease.in` | `(0.4, 0.0, 1.0, 1.0)` | `--ease-in` | Exit, disappear |
| `motion.ease.in-out` | `(0.4, 0.0, 0.2, 1.0)` | `--ease-in-out` | Toggle, state switch |
| `motion.ease.sharp` | `(0.4, 0.0, 0.6, 1.0)` | `--ease-sharp` | Micro-feedback, quick toggle |
| `motion.ease.bounce` | `(0.34, 1.1, 0.64, 1.0)` | `--ease-bounce` | Floating cards only (1 место) |

### motion.distance.*

| Токен | Значение | CSS var | Использование |
|---|---|---|---|
| `motion.distance.xs` | 4px | `--distance-xs` | Hover lift (карточки) |
| `motion.distance.sm` | 8px | `--distance-sm` | Tooltip появление |
| `motion.distance.md` | 16px | `--distance-md` | Section reveals (translateY) |
| `motion.distance.lg` | 24px | `--distance-lg` | Hero элементы |
| `motion.distance.xl` | 32px | `--distance-xl` | Page transition slide |
| `motion.distance.page` | 8px | `--distance-page` | Route change translateX |

### motion.stagger.*

| Токен | Значение | CSS var | Использование |
|---|---|---|---|
| `motion.stagger.tight` | 30ms | `--stagger-tight` | Inline items, icons |
| `motion.stagger.normal` | 50ms | `--stagger-normal` | List items |
| `motion.stagger.relaxed` | 60ms | `--stagger-relaxed` | Feature cards |
| `motion.stagger.spacious` | 80ms | `--stagger-spacious` | Hero stagger |
| `motion.stagger.section` | 120ms | `--stagger-section` | Between sections |

### motion.threshold.*

| Токен | Значение | Использование |
|---|---|---|
| `motion.threshold.early` | 0.05 | Большие секции (hero, full-width) |
| `motion.threshold.default` | 0.12 | Карточки, средние элементы |
| `motion.threshold.clear` | 0.20 | Иконки, badges, inline |
| `motion.threshold.full` | 0.30 | Числа (count-up), stat cards |

### CSS Variables файл

```css
/* src/styles/motion.css */
:root {
  /* Duration */
  --duration-instant:    80ms;
  --duration-fast:      120ms;
  --duration-quick:     180ms;
  --duration-normal:    250ms;
  --duration-moderate:  350ms;
  --duration-slow:      450ms;
  --duration-deliberate:600ms;
  --duration-narrative: 800ms;

  /* Easing */
  --ease-out:         cubic-bezier(0.0, 0.0, 0.2, 1.0);
  --ease-out-premium: cubic-bezier(0.0, 0.0, 0.1, 1.0);
  --ease-in:          cubic-bezier(0.4, 0.0, 1.0, 1.0);
  --ease-in-out:      cubic-bezier(0.4, 0.0, 0.2, 1.0);
  --ease-sharp:       cubic-bezier(0.4, 0.0, 0.6, 1.0);
  --ease-bounce:      cubic-bezier(0.34, 1.1, 0.64, 1.0);

  /* Distance */
  --distance-xs:   4px;
  --distance-sm:   8px;
  --distance-md:  16px;
  --distance-lg:  24px;
  --distance-xl:  32px;
  --distance-page: 8px;

  /* Stagger */
  --stagger-tight:   30ms;
  --stagger-normal:  50ms;
  --stagger-relaxed: 60ms;
  --stagger-spacious:80ms;
  --stagger-section:120ms;
}

@media (prefers-reduced-motion: reduce) {
  :root {
    --duration-instant:     0ms;
    --duration-fast:        0ms;
    --duration-quick:      80ms;  /* только opacity */
    --duration-normal:     80ms;
    --duration-moderate:   80ms;
    --duration-slow:       80ms;
    --duration-deliberate: 80ms;
    --duration-narrative:   0ms;  /* мгновенно */
    --distance-xs:          0px;
    --distance-sm:          0px;
    --distance-md:          0px;
    --distance-lg:          0px;
    --distance-xl:          0px;
    --distance-page:        0px;
    --stagger-tight:        0ms;
    --stagger-normal:       0ms;
    --stagger-relaxed:      0ms;
    --stagger-spacious:     0ms;
    --stagger-section:      0ms;
  }
}
```

---

## Быстрая шпаргалка

```
Появление элемента:   opacity 0→1 + translateY(md→0), duration.moderate, ease.out
Исчезновение:         opacity 1→0 + translateY(0→sm), duration.normal, ease.in
Hover карточки:       translateY(-xs), box-shadow +, duration.fast, ease.out
Click кнопки:         scale(0.97→1), duration.instant + duration.fast, ease.sharp
Stagger список:       stagger.relaxed (60ms), Reveal с delay = index × stagger
Page transition:      opacity + translateX(page), duration.deliberate, ease.in-out
Chart reveal:         контейнер opacity (normal) → Chart.js draw (deliberate)
Count-up:             duration.narrative, ease-out cubic, RAF loop
Glow pulse:           keyframe opacity, 4s infinite, ease-in-out — очень медленно
Skeleton shimmer:     background-position 200%, 1.4s linear infinite
```

---

*EVision Motion System v1 · Motion Designer + Performance Engineer · 2026*

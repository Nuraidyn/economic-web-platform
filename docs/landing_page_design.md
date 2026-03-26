# EVision — Landing Page Design Spec v1

Lead Product Designer · Visual Storytelling · 2026

---

## Философия страницы

Страница не продаёт — она **демонстрирует интеллект**. Пользователь должен почувствовать «это инструмент для людей, которые думают серьёзно» до того, как прочитает хоть одно слово. Визуальный порядок важнее визуального шума.

```
Принцип: данные — главные герои. UI — невидимая рама.
Скорость: страница читается за 45 сек при беглом просмотре, за 3 мин при внимательном.
Эмоция:  спокойная уверенность → любопытство → желание попробовать.
```

---

## Вертикальный макет (полная схема)

```
┌─────────────────────────────────────────────────────┐
│  SECTION 1 · HERO              100vh                 │
│  Якорь: первое впечатление                          │
├─────────────────────────────────────────────────────┤
│  SECTION 2 · TRUST STRIP       auto (≈80px)          │
│  Якорь: источники данных                            │
├─────────────────────────────────────────────────────┤
│  SECTION 3 · FEATURES          100vh                 │
│  Якорь: что умеет платформа                         │
├─────────────────────────────────────────────────────┤
│  SECTION 4 · ANALYTICS PREVIEW 140vh                 │
│  Якорь: живые данные, интерактивная демонстрация    │
├─────────────────────────────────────────────────────┤
│  SECTION 5 · AI INSIGHT        100vh                 │
│  Якорь: AI объясняет графики                        │
├─────────────────────────────────────────────────────┤
│  SECTION 6 · CTA               60vh                  │
│  Якорь: конвертация                                 │
├─────────────────────────────────────────────────────┤
│  SECTION 7 · FOOTER            auto                  │
│  Якорь: навигация, ссылки, копирайт                 │
└─────────────────────────────────────────────────────┘
```

---

## Section 1 · Hero

### Цель
Первое впечатление за 3 секунды. Передать: «Premium. Data. Intelligence.» Никаких дополнительных объяснений.

### Контент

```
[NAVBAR]
─────────────────────────────────────
Kicker (12px uppercase, letter-spacing 0.2em):
  ECONOMIC ANALYTICS PLATFORM

Headline (56–72px, Inter Bold):
  Видеть дальше.
  Решать точнее.

Subheadline (18px, Inter Regular, opacity 70%):
  Индикаторы 195 стран. Кривые Лоренца.
  Прогнозы с доверительными интервалами.
  AI-объяснение на вашем языке.

[CTA PRIMARY]  Начать анализ
[CTA SECONDARY — ghost]  Посмотреть пример

Scroll indicator: ↓ (анимированный)
─────────────────────────────────────
[BACKGROUND VISUAL — справа или полный bg]
```

### Композиция

```
Сетка: 12 колонок, max-width 1480px
Текстовый блок: колонки 1–6 (left-aligned, vertically centered)
Visual блок:    колонки 7–12 (right side)

Visual блок содержит:
  — Имитация скриншота дашборда EVision (не скриншот, а SVG/CSS mock)
  — Floating card 1: «GDP · KZ · +4.2%» (мини stat-card)
  — Floating card 2: «Gini trend · 2010–2024» (мини line-chart)
  — Floating card 3: «Forecast confidence: 94%»
  — Все карточки с backdrop-blur, border glow
```

### Фон

```
Основной: #080F1A (deep navy)
Noise texture: SVG фракционный шум, opacity 3–4% (не canvas, SVG filter)
Radial gradient: от центра visual-блока → teal #00C9B1 at opacity 8%
  background: radial-gradient(ellipse 60% 60% at 75% 50%,
    rgba(0,201,177,0.08) 0%, transparent 70%)
Вторичный glow: indigo #5B6AF0 at opacity 5%, смещён вниз-влево
```

### Motion

```
Entrance (page load):
  — Kicker: fade-in, delay 0ms, duration 300ms
  — Headline: fade-in + translateY(16px→0), delay 100ms, duration 400ms
  — Subheadline: fade-in, delay 200ms, duration 400ms
  — CTA buttons: fade-in + scale(0.97→1), delay 300ms, duration 300ms
  — Visual block: fade-in + translateX(20px→0), delay 150ms, duration 500ms
  — Floating cards: staggered, каждая +80ms, translateY(8px→0)

Scroll:
  — Floating cards: subtle parallax (translateY × 0.1 скорости скролла)
  — Radial glow: медленно смещается по мере скролла (CSS transform)
  — Scroll indicator: bounce loop, 1.5s, ease-in-out
```

---

## Section 2 · Trust Strip

### Цель
Молниеносно снять скептицизм: «откуда данные?». Без этого блока пользователь задаёт вопрос в голове.

### Контент

```
[ World Bank ]  [ Open Data ]  [ 195 Countries ]  [ 30+ Years ]  [ JWT Secured ]
```

Каждый элемент: иконка (16px stroke) + короткая подпись (12px, opacity 60%).

### Композиция

```
Горизонтальная строка, равномерное распределение (justify-content: space-evenly)
На мобиле: горизонтальный scroll (overflow-x: auto, snap)
Высота блока: 72–80px
Разделители: 1px vertical line, opacity 10%
```

### Фон

```
Очень тонкая border-top + border-bottom: rgba(255,255,255,0.06)
Background: transparent (видно hero через него — нет резкого разрыва)
Backdrop: нет (не нужен)
```

### Motion

```
Появление при входе в viewport: fade-in, translateY(8px→0), 250ms
Без hover-анимаций — статичный, не отвлекает
```

---

## Section 3 · Features

### Цель
Показать возможности платформы через 4–6 карточек. Не список пунктов — визуальные блоки с иллюстрацией каждой функции.

### Контент (6 feature-карточек)

```
01 · Сравнение стран
     «Выберите до 4 стран и до 4 индикаторов. Line, bar, scatter.»
     Visual: мини-линейный чарт, 3 цветные линии

02 · Кривая Лоренца
     «Визуализация неравенства. Gini рассчитывается автоматически.»
     Visual: диагональ равенства + кривая под ней

03 · Прогнозирование
     «Линейный тренд с доверительным интервалом. Горизонт до 20 лет.»
     Visual: исторический ряд + пунктирный прогноз с band-зоной

04 · AI-объяснение
     «Задайте вопрос графику. Ответ на RU/KZ/EN.»
     Visual: имитация chat-bubble с аналитическим текстом

05 · Пресеты
     «Сохраните настройки. Вернитесь одним кликом.»
     Visual: список пресетов с иконками

06 · Данные в реальном времени
     «Если нет в кеше — запрос в World Bank live.»
     Visual: animated dot (пульсирующий) + «Live»
```

### Композиция

```
Заголовок секции: центрирован, 40px
Подзаголовок секции: 16px, opacity 60%, max-width 560px, centered

Сетка карточек: 3 колонки на desktop, 2 на tablet, 1 на mobile
Карточка:
  — Верх: visual illustration (SVG, 120px height)
  — Номер: 01–06, monospace, opacity 20%, absolute top-right
  — Заголовок: 18px SemiBold
  — Описание: 14px Regular, opacity 70%
  — Hover: subtle border-glow (teal 15%) + translateY(-2px)
```

### Фон

```
Background: #080F1A (продолжение hero)
Карточки: background #0F1B2D, border rgba(255,255,255,0.06)
Разделение от hero: НЕТ горизонтальной линии — только изменение плотности контента
Вверху секции: subtle gradient overlay (transparent → #080F1A, 80px height)
```

### Motion

```
Staggered entrance (IntersectionObserver):
  — Заголовок секции: fade + translateY(12px→0), 300ms
  — Карточки: каждая с задержкой +60ms, translateY(16px→0), 350ms
  — Illustration внутри карточки: рисуется/анимируется отдельно при входе
Hover: box-shadow glow + transform, 150ms ease-out
```

---

## Section 4 · Analytics Preview

### Цель
Самый важный блок. Пользователь должен «потрогать» продукт ещё до регистрации. Не статичный скриншот — живая демонстрация.

### Контент

```
Заголовок: «Попробуйте прямо здесь»
Подзаголовок: «Выберите страну и индикатор. Данные загружаются из World Bank.»

[Демо-блок]:
  Left panel (30%):
    — CountryMultiSelect (2–3 страны предвыбраны: KZ, RU, DE)
    — IndicatorMultiSelect (1 индикатор: NY.GDP.PCAP.CD)
    — Year range: 2000–2023
    — Кнопка «Обновить»

  Right panel (70%):
    — Реальный Chart.js линейный чарт
    — Легенда с кодами стран и цветами
    — Подпись «Источник: World Bank»
    — При наведении — tooltip с годом и значением

Ниже чарта: две stat-карточки
  — «Максимальный рост: DE +X% (20XX)»
  — «Разрыв KZ/DE: ×N.N (2023)»

Примечание под блоком (11px, opacity 40%):
  «Данные публичны. Авторизация не требуется для предпросмотра.»
```

### Композиция

```
Max-width: 1200px, centered
Высота блока: ~700px на desktop
Left panel: position sticky (top: 80px) при скролле внутри правой колонки
Right panel: overflow с плавным скроллом при появлении новых данных
Вся секция: padding 80px top/bottom
```

### Фон

```
Background: #0F1B2D (чуть светлее hero — визуальная «пауза»)
Граница с предыдущей секцией: gradient-fade 60px (hero → preview)
Граница с следующей секцией: gradient-fade 60px (preview → AI)
Outer glow: очень слабый teal радиальный glow за демо-блоком, opacity 6%
```

### Motion

```
При входе в viewport:
  — Left panel: slideIn от -20px, opacity 0→1, 400ms
  — Right panel: slideIn от +20px, opacity 0→1, 400ms, delay 100ms
  — Chart lines: draw animation (Chart.js animation duration: 600ms)
  — Stat-карточки: count-up анимация чисел, 800ms ease-out

При взаимодействии:
  — Смена данных: chart fade-out (100ms) → перестройка (300ms) → fade-in (200ms)
  — Loading state: skeleton shimmer на месте чарта
```

---

## Section 5 · AI Insight

### Цель
Показать уникальную возможность AI-объяснения. Не демонстрировать технологию — показать **пользу**: «ты задаёшь вопрос — получаешь аналитику».

### Контент

```
Заголовок (левый): «Спросите график. Получите аналитику.»
Подзаголовок: «EVision AI анализирует данные и отвечает на вашем языке — без галлюцинаций, только факты из графика.»

[Интерактивный mock]:
  Слева — мини-чарт (Gini trend, 3 страны)
  Справа — chat-интерфейс:
    User bubble: «Почему Gini KZ выше, чем у DE?»
    AI response bubble (анимированный typing effect):
      «По данным 2010–2022, Gini KZ устойчиво выше DE на 8–10 п.п.
       Разрыв сохраняется несмотря на рост ВВП. Возможные факторы:
       · структура распределения доходов
       · нефтяная рента (см. SI.DST.05TH.20)
       Источник: World Bank, расчёт EVision.»

Ниже: три примера готовых вопросов (кликабельные):
  «Какой тренд у ВВП на душу населения?»
  «Где неравенство растёт быстрее всего?»
  «Как читать кривую Лоренца?»
```

### Композиция

```
Двухколоночный layout: чарт (45%) + chat (55%)
На мобиле: стек (чарт сверху, chat снизу)
Chat-bubble: max-width 380px, border-radius 12px/4px (user vs AI style)
AI bubble: border-left 3px solid teal
Typing animation: 3 точки, пока "грузится" ответ
```

### Фон

```
Background: #080F1A (возврат к hero-цвету — создаёт ритм dark/darker/dark)
Слева за чартом: слабый radial glow indigo, opacity 8%
Справа за chat: нет glow (чтобы текст читался чисто)
Разделительный элемент между секциями: SVG волна (smooth bezier), высота 80px
```

### Motion

```
При входе:
  — Чарт появляется с draw-animation, 500ms
  — Chat история: сообщения «печатаются» одно за другим, 300ms delay между

Typing indicator: 3 точки, 1.2s цикл, infinite (только пока «AI печатает»)
После появления ответа: typing indicator исчезает, текст fade-in по строкам (30ms/строка)
```

---

## Section 6 · CTA

### Цель
Конвертация. Один вопрос, один ответ: «Готов начать?» Убрать все отвлечения.

### Контент

```
Надпись (11px, uppercase, teal, letter-spacing):  НАЧНИТЕ СЕГОДНЯ

Заголовок (48px):
  «Анализируйте.
   Прогнозируйте.
   Понимайте.»

Подпись (16px, opacity 60%):
  «Бесплатно для студентов и исследователей.
   Данные World Bank. Три языка.»

[CTA PRIMARY, large]   Создать аккаунт
[CTA SECONDARY, ghost] Войти

Микро-текст под кнопками (11px, opacity 40%):
  «Регистрация занимает 30 секунд. Без привязки карты.»
```

### Композиция

```
Полная ширина, текст по центру
Max-width контента: 600px, centered
Вертикальный ритм: kicker → headline → sub → buttons → micro
Кнопки: рядом, gap 12px, на мобиле — стек
```

### Фон

```
Background: gradient от #0F1B2D (top) → #080F1A (bottom)
Центральный radial glow: teal + indigo смешанный, opacity 12%, blur 120px
Noise texture: SVG filter, opacity 3%
НЕТ: изображений, иллюстраций, иконок — только типографика и glow
```

### Motion

```
Glow-pulse: keyframe scale(1→1.05→1), 4s ease-in-out, infinite
  (очень медленно, почти незаметно — создаёт «живость» фона)
Кнопки: появляются с translateY(16px→0) + fade, stagger 80ms
```

---

## Section 7 · Footer

### Контент

```
Колонка 1 · Бренд:
  [Logo] EVision
  Короткий tagline: «Экономическая аналитика нового поколения.»
  Языковой переключатель: RU · KZ · EN

Колонка 2 · Навигация:
  Главная · Неравенство · Прогнозы · Сохранённые

Колонка 3 · Ресурсы:
  Документация · API · Методология · О проекте

Колонка 4 · Данные:
  «Источник данных: World Bank Open Data»
  «Данные предоставляются as-is без гарантий»

Нижняя строка:
  © 2026 EVision · Пользовательское соглашение · Конфиденциальность
```

### Фон

```
Background: #050B14 (темнее основного — «закрытие» страницы)
Border-top: 1px rgba(255,255,255,0.06)
Текст: opacity 40–50% для второстепенного, 70% для основного
```

---

## Правила ритма скролла

```
┌────────────────────────────────────────────────────────────┐
│ ЗОНА          │ СКОРОСТЬ     │ ДЕЙСТВИЕ ПОЛЬЗОВАТЕЛЯ       │
├────────────────┼──────────────┼─────────────────────────────┤
│ Hero           │ ПАУЗА        │ Читает headline, 3–5 сек    │
│ Trust Strip    │ БЫСТРО       │ Скользит глазами, <1 сек    │
│ Features       │ СРЕДНЕ       │ Изучает карточки, 10–15 сек │
│ Analytics Prev.│ ДЛИННАЯ ПАУЗА│ Взаимодействует, 30–60 сек  │
│ AI Insight     │ СРЕДНЕ       │ Читает диалог, 10–15 сек    │
│ CTA            │ ПАУЗА        │ Принимает решение, 5–10 сек │
│ Footer         │ БЫСТРО       │ Ссылки по необходимости     │
└────────────────┴──────────────┴─────────────────────────────┘
```

**Паузы создаются через:**
- Увеличенный вертикальный padding (80–120px) у Hero и CTA
- Sticky-элементы в Analytics Preview (удерживают пользователя)
- Typing-animation в AI Insight (искусственная задержка восприятия)

**Быстрые зоны:**
- Trust Strip — минимальная высота (72px), нет интерактивности
- Footer — привычная структура, сканируется автоматически

---

## Эффекты: где применять и как дозировать

### Parallax

```
Применять:    Hero floating cards (×0.08–0.12 скорости скролла)
              Background radial glow (×0.05 — почти незаметно)
Не применять: Весь текст (ломает читаемость)
              Мобиль (производительность + motion sickness)
Реализация:   CSS transform через JS scroll listener, requestAnimationFrame
              НЕ CSS scroll-driven animations (поддержка ограничена)
```

### Backdrop Blur

```
Применять:    Navbar (blur 16px, saturation 1.2)
              Floating cards в Hero (blur 12px)
              Модальные окна
Не применять: Основной контент (читаемость)
              Мобиль с низкой производительностью (media query: prefers-reduced-motion)
Значение:     backdrop-filter: blur(12px) saturate(1.1)
              Всегда с fallback: background-color с opacity 85%
```

### Glow / Box Shadow

```
Применять:    Карточки Features при hover
              CTA section background
              AI chat bubble (левая граница teal)
              Активные элементы выбора в демо
Не применять: Обычный текст
              Неактивные/вторичные элементы
Формула:      box-shadow: 0 0 24px rgba(0,201,177,0.15), 0 0 8px rgba(0,201,177,0.08)
```

### Gradient Noise

```
Применять:    Hero bg (SVG feTurbulence, opacity 3–4%)
              CTA bg (opacity 2–3%)
Не применять: Поверх текста напрямую
              Цветной контент
Реализация:   SVG filter inline, НЕ PNG текстура (размер файла)
```

```xml
<svg xmlns="http://www.w3.org/2000/svg" width="0" height="0">
  <filter id="noise">
    <feTurbulence type="fractalNoise" baseFrequency="0.65"
                  numOctaves="3" stitchTiles="stitch"/>
    <feColorMatrix type="saturate" values="0"/>
    <feBlend in="SourceGraphic" mode="overlay"/>
  </filter>
</svg>
<!-- Применение: background элемент с filter="url(#noise)" opacity 0.03 -->
```

### Анимированные числа (count-up)

```
Применять:    Stat-карточки в Analytics Preview при первом появлении
              Числа в Trust Strip (если есть — «195 стран»)
Не применять: При каждом scroll-pass (только один раз)
Реализация:   IntersectionObserver + requestAnimationFrame counter
              Длительность: 600–1000ms, easing: ease-out
```

---

## UX-правила: читаемость и accessibility

### Типографический контраст

```
WCAG AA минимум: ratio 4.5:1 для body text, 3:1 для large text
Фактические значения EVision dark mode:
  #F0F4F8 на #080F1A → ratio 17.2:1  ✓
  #8A9BB0 на #080F1A → ratio  6.1:1  ✓ (subtext)
  #4A5A70 на #080F1A → ratio  3.2:1  ✓ (только large text ≥18px)

Правило: любой текст < 14px → opacity не ниже 50%
```

### Motion и prefers-reduced-motion

```css
@media (prefers-reduced-motion: reduce) {
  /* Отключить все: */
  * { animation-duration: 0.01ms !important; }
  /* Parallax: убрать transform полностью */
  .parallax-element { transform: none !important; }
  /* Chart draw: мгновенно */
  /* Count-up: показать финальное значение сразу */
}
```

### Focus management

```
Все кнопки: видимый focus-ring (outline: 2px solid #00C9B1, offset 2px)
Демо-блок: Tab order логичен (country → indicator → year → button → chart)
Модальные окна: focus trap при открытии
Skip link: первый элемент в DOM («Перейти к контенту»)
```

### Семантическая разметка

```html
<main>
  <section aria-labelledby="hero-heading">   <!-- Hero -->
  <section aria-label="Trusted data sources"> <!-- Trust Strip -->
  <section aria-labelledby="features-heading"> <!-- Features -->
  ...
</main>
<!-- Landmarks: header, main, footer — обязательно -->
<!-- Aria-live region для AI typing animation -->
<!-- Alt-тексты для всех SVG-иллюстраций -->
```

### Цвет не как единственный сигнал

```
Ошибки: иконка + цвет + текст (не только красный)
Успех:  иконка + цвет + текст
Тренд ↑/↓: стрелка + цвет (не только цвет)
```

---

## Ошибки, которых нельзя допустить

### Визуальные

```
✗ Слишком много glow одновременно — становится «дешёвым»
  Fix: максимум 2 glow-источника на экране одновременно

✗ Анимации при каждом scroll-pass — утомляют
  Fix: IntersectionObserver с { once: true }

✗ Parallax на мобиле — вызывает motion sickness, жрёт GPU
  Fix: только на desktop, через JS с matchMedia

✗ Backdrop-blur без fallback — Safari иногда рендерит пусто
  Fix: всегда добавлять background-color как fallback

✗ Текст поверх анимации — теряется читаемость
  Fix: текстовые зоны — всегда на статичном фоне

✗ Одинаковый фон на всех секциях — нет ритма, всё сливается
  Fix: чередовать #080F1A и #0F1B2D с gradient-переходами

✗ Hero без breathing room на мобиле — всё сжимается в кашу
  Fix: на мобиле hero — только текст + CTA, visual block убирается
```

### UX

```
✗ CTA без микро-текста (почему? бесплатно? безопасно?) — потеря конверсии
  Fix: всегда 1 строка объяснения под CTA

✗ Демо-блок без fallback при ошибке API — пустой экран
  Fix: показать static mock-данные при ошибке, сообщение мелким текстом

✗ Trust Strip без реального содержания (lorem) — подрывает доверие
  Fix: только реальные источники и факты

✗ Анимированный typing без aria-live — скринридеры молчат
  Fix: aria-live="polite" на AI response container

✗ Floating cards в Hero без touch-поддержки — недостижимы на мобиле
  Fix: на мобиле floating cards убрать или сделать static

✗ Footer с «Under construction» ссылками — ломает доверие
  Fix: либо реальные ссылки, либо не показывать раздел
```

### Контентные

```
✗ Placeholder-текст «Lorem ipsum» в production
✗ Скриншот приложения вместо live-демо или SVG-мока
✗ Устаревшие данные в demo (год 2018 в 2026)
✗ Слоган не переведён на KZ — ощущение незаконченности
```

---

## Как сохранить performance

### Метрики-цели

```
LCP (Largest Contentful Paint):   < 2.5s
FID / INP:                         < 100ms
CLS (Cumulative Layout Shift):     < 0.1
Total page weight:                 < 400KB JS, < 100KB CSS
```

### Стратегия загрузки

```
Critical path (inline в <head>):
  — CSS переменные (цвета, токены)
  — Шрифты: Inter subset (latin + cyrillic), preload
  — Минимальный above-the-fold CSS

Lazy load:
  — Chart.js: import() только при входе Analytics Preview в viewport
  — AI Insight mock: статичный HTML до взаимодействия
  — Footer: загрузка последней (intersection-based)
  — Изображения: loading="lazy", нет hero-image (только CSS/SVG)

Fonts:
  font-display: swap
  Только необходимые weights: 400, 500, 600, 700
  Subset: latin, cyrillic — не весь Unicode
```

### Анимации

```
Использовать только:
  transform (translateX/Y/scale) — compositor thread
  opacity                        — compositor thread

Никогда не анимировать:
  width / height  → reflow
  top / left      → reflow
  margin / padding → reflow
  background-color через JS (только CSS transition)

will-change: transform — только на активно анимируемых элементах
  Не ставить на всё подряд (увеличивает memory)
```

### Parallax

```javascript
// Правильная реализация: один listener, RAF throttle
let ticking = false;
window.addEventListener('scroll', () => {
  if (!ticking) {
    requestAnimationFrame(() => {
      updateParallax(window.scrollY);
      ticking = false;
    });
    ticking = true;
  }
});
// Отключить на мобиле:
const mq = window.matchMedia('(max-width: 768px)');
if (mq.matches) return; // no parallax
```

### SVG Noise texture

```
Не PNG (50–200KB) → SVG filter (0KB, inline)
Не canvas (JS overhead) → SVG feTurbulence (GPU)
```

### Chart.js в демо

```javascript
// Lazy import только при необходимости
const loadChart = async () => {
  const { Chart } = await import('chart.js/auto');
  // Destroy перед пересозданием (утечка памяти)
  if (chartInstance) chartInstance.destroy();
  chartInstance = new Chart(canvas, config);
};
```

### Image optimization (если появятся)

```
Format: WebP с AVIF fallback
Sizes:  srcset для разных breakpoints
Hero visual: SVG/CSS only (нет растровых изображений)
```

---

## Итоговая карта страницы (скорость + интенсивность)

```
Интенсивность
(сложность блока)
    ▲
5   │          ████ Analytics Preview
    │
4   │  ████          ████ AI Insight
    │  Hero
3   │                           ████ CTA
    │         ████ Features
2   │                                     ████ Footer
    │
1   │    ████ Trust Strip
    │
    └──────────────────────────────────────────► Позиция на странице
         1      2      3      4      5      6    7
```

Страница дышит: Hero (сильно) → Trust (тихо) → Features (средне) → Analytics (пик) → AI (средне) → CTA (фокус) → Footer (тихо).

---

*EVision Landing Page Design Spec v1 · Lead Product Designer · 2026*

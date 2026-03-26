# EVision — UI Component Spec v1

Lead Product Designer · Component Library · 2026

---

## Глобальные правила

```
Base unit:        4px
Font:             Inter (sans) · JetBrains Mono (data/code)
Focus ring:       outline 2px solid #00C9B1, offset 2px
                  НИКОГДА outline: none без замены
Disabled:         opacity 0.38, cursor not-allowed, pointer-events none
Min tap target:   44×44px (WCAG 2.5.5 AAA, iOS HIG)
Contrast (text):  ≥ 4.5:1 body, ≥ 3:1 large text (WCAG AA minimum)
```

---

## 1. Navbar

### Размеры и структура

```
Desktop (≥ 1024px)
──────────────────────────────────────────────────────
Height:            72px (фиксированная)
Max-width:         1480px, centered
Padding X:         24px (px-6)
Padding Y:         0 (flex items-center + height)
Position:          sticky top-0, z-index: 50

Layout (flex, items-center, justify-between):
  [Logo block]      ← left
  [Nav links]       ← center (gap-1)
  [Controls]        ← right (gap-2)

Logo block:
  Image:  48×48px, border-radius xl (12px)
  Kicker: 10px, uppercase, tracking-widest, opacity 50%
  Title:  24px, font-semibold, line-height tight

Nav links (NavLink):
  Height:        36px
  Padding:       8px 14px
  Font:          14px, weight 500
  Border-radius: 6px
  Active:        bg-interactive-selected + text-accent-primary
  Inactive:      text-text-muted

Controls (right side):
  Language buttons: 28px height, padding 4px 8px
  Theme toggle:     36×36px icon button
  Auth button:      36px height, btn-secondary

Mobile (< 1024px)
──────────────────────────────────────────────────────
Height:            60px
Logo: image only (48×48px), no text (экономим место)
Nav links: СКРЫТЫ → hamburger menu или bottom navigation
Controls: только auth icon button (36×36px)
```

### Фон и эффекты

```
Background:  var(--color-bg-base) opacity 70%
Backdrop:    blur(16px) saturate(1.1)
Border-bottom: 1px solid var(--color-border-subtle)
Fallback без backdrop-blur: background opacity 92%

При скролле > 0px:
  Border-bottom opacity: 07% → усиливается до var(--color-border-default)
  Transition: border-color 150ms ease-out
```

### Состояния Nav Link

```
Default:   color text-muted, bg transparent
Hover:     color text-primary, bg interactive-hover, 120ms
Active:    color accent-primary, bg interactive-selected
Focus:     focus ring + same as hover
Current:   pointer-events none (страница уже открыта)
```

### Профильное меню (popover)

```
Trigger:       icon button 36×36px (user SVG)
Popover:       position absolute, top 100%+8px, right 0
               bg-elevated, border-default, shadow-lg
               border-radius xl (12px)
               padding 8px
               min-width 200px

Sections:      разделены padding-block 4px + border-subtle
Section items: height 36px, padding 8px 12px, border-radius md
               font 14px, text-primary
               hover: bg interactive-hover

Close:         click outside (click listener на document)
               Escape key
               Tab из последнего элемента
```

### Mobile: Bottom Navigation (альтернатива)

```
Position:  fixed bottom-0, full width
Height:    56px + safe-area-inset-bottom
Background: bg-elevated + blur
Items:     4 иконки + label (Dashboard · Inequality · Forecast · Saved)
Icon:      20×20px stroke
Label:     10px, убирается если < 320px ширина
Active:    icon + label цвет accent-primary
```

### Accessibility

```html
<header role="banner">
  <nav aria-label="Основная навигация">
    <NavLink aria-current="page">Dashboard</NavLink>
    <!-- aria-current="page" только для активного -->
  </nav>

  <!-- Профильное меню -->
  <div role="navigation" aria-label="Меню аккаунта">
    <button
      aria-haspopup="true"
      aria-expanded={isOpen}
      aria-controls="profile-menu"
    >
    <div
      id="profile-menu"
      role="menu"
      aria-label="Меню аккаунта"
    >
      <button role="menuitem">...</button>
    </div>
  </div>
</header>

<!-- Skip link (первый элемент в DOM) -->
<a href="#main-content"
   className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4
              focus:z-50 focus:px-4 focus:py-2 focus:bg-bg-elevated focus:rounded-lg
              focus:text-text-primary focus:shadow-lg">
  Перейти к содержимому
</a>
```

---

## 2. Hero CTA Button

### Размеры

```
Primary (hero):
  Height:        52px
  Padding:       14px 32px
  Font:          16px, weight 600
  Border-radius: 8px
  Min-width:     160px
  Icon gap:      10px (если есть иконка)

Secondary/ghost (рядом с primary):
  Height:        52px
  Padding:       14px 28px
  Font:          16px, weight 500
  Border:        1px solid border-default
```

### Визуальная иерархия

```
Primary:
  Background:    accent-primary (#00C9B1)
  Text:          text-inverse (тёмный)
  Иерархия:      ПЕРВЫЙ приоритет на странице

Secondary (ghost):
  Background:    transparent
  Text:          text-primary
  Border:        border-default
  Иерархия:      Второй приоритет (не конкурирует с primary)

Правило: на одном экране — не более одного btn-primary hero-size
```

### Состояния

```
Default:
  bg:   #00C9B1
  text: #080F1A

Hover:
  bg:            #2DD4C4 (lighter teal)
  shadow:        glow-teal-sm (0 0 12px rgba(0,201,177,0.25))
  transform:     translateY(-1px)
  transition:    120ms ease-out

Active (pressed):
  bg:            #00A894 (darker teal)
  transform:     scale(0.97) translateY(0)
  shadow:        none
  transition:    80ms sharp

Focus:
  outline:       2px solid #00C9B1
  outline-offset: 3px
  (outline поверх glow для keyboard users)

Disabled:
  opacity:       0.38
  cursor:        not-allowed
  bg:            accent-primary (без hover)
  shadow:        none

Loading:
  Spinner:       16×16px, animate-spin, слева от текста
  Text:          «Загрузка...» или оригинальный текст
  pointer-events: none
  opacity:       0.8
```

### Mobile

```
Width:         100% (full-width на mobile)
Pair buttons:  flex-col, gap 8px (не рядом, а стопкой)
Height:        остаётся 52px
Font:          остаётся 16px
Min tap:       обеспечивается height 52px
```

### Accessibility

```html
<button
  type="button"
  className="btn btn-primary btn-lg"
  aria-busy={isLoading}
  disabled={isLoading || isDisabled}
>
  {isLoading && (
    <svg className="animate-spin" aria-hidden="true">...</svg>
  )}
  <span>{isLoading ? 'Загрузка...' : 'Начать анализ'}</span>
</button>

<!-- Если кнопка — ссылка -->
<a href="/dashboard" role="button" className="btn btn-primary btn-lg">
  Открыть платформу
</a>
```

---

## 3. Search Input

### Размеры

```
Desktop:
  Height:        40px
  Padding:       10px 14px 10px 40px (левый отступ под иконку)
  Icon:          16×16px, position absolute, left 12px, top 50% transform
  Font:          14px, Inter Regular
  Border-radius: 6px
  Width:         240px default, 320px при focus (transition)

Mobile:
  Height:        44px (больше для touch)
  Width:         100%
  Icon:          16×16px
```

### Визуальная иерархия

```
Иконка:       text-faint (тускло, не отвлекает)
Placeholder:  text-faint
Текст:        text-primary
Clear button: text-muted, появляется только когда есть значение
```

### Состояния

```
Default:
  bg:     bg-input (#0C1522)
  border: 1px solid border-default

Hover:
  border: border-strong
  transition: 120ms

Focus:
  border: border-focus (#00C9B1)
  shadow: 0 0 0 2px rgba(0,201,177,0.25)
  width:  320px (expand, если есть место)
  Icon:   цвет меняется text-faint → accent-primary

Typing (has value):
  Clear button: appears (×) справа, 28×28px touch target
  Icon:         accent-primary

Empty search (no results):
  Под инпутом: «Не найдено» message (если dropdown)

Error:
  border: border-error
  Применяется если ввод невалиден (например, запрос слишком короткий)

Disabled:
  opacity 0.38, cursor not-allowed
```

### Dropdown results (если есть)

```
Position:     absolute, top 100%+4px, left 0, width 100%
Max-height:   280px, overflow-y auto
bg:           bg-elevated
border:       border-default
border-radius: xl (12px)
shadow:       shadow-lg
padding:      4px

Item:
  Height:      36px
  Padding:     8px 12px
  Font:        14px
  Hover:       bg interactive-hover
  Active:      bg interactive-selected, text accent-primary
  Match:       подсветить совпавшую часть (font-semibold или color accent)
```

### Mobile

```
Full-width всегда
Height: 44px
Dropdown: снизу от инпута, max-height 200px (меньше экран)
```

### Accessibility

```html
<div role="search">
  <label htmlFor="indicator-search" className="sr-only">
    Поиск индикаторов
  </label>
  <div className="relative">
    <SearchIcon aria-hidden="true" className="absolute left-3 top-1/2 -translate-y-1/2" />
    <input
      id="indicator-search"
      type="search"
      role="combobox"
      aria-autocomplete="list"
      aria-controls="search-results"
      aria-expanded={isOpen}
      autoComplete="off"
      placeholder="Поиск индикатора..."
    />
    {value && (
      <button
        aria-label="Очистить поиск"
        onClick={clearSearch}
      >
        <XIcon aria-hidden />
      </button>
    )}
  </div>
  <ul id="search-results" role="listbox" aria-label="Результаты поиска">
    {results.map(item => (
      <li key={item.code} role="option" aria-selected={isSelected(item)}>
        ...
      </li>
    ))}
  </ul>
</div>
```

---

## 4. Country / Indicator Selectors

### Общая структура (одинаковая для обоих)

```
Desktop:
  Контейнер:   полная ширина колонки (50% в grid 2-col)
  Label:       12px, font-medium, uppercase tracking-wider
               color text-muted, mb 6px

  Search input: высота 36px, встроен в верх списка
  List area:   border border-default, border-radius xl
               padding 6px
               max-height 208px (52px × 4 видимых элемента)
               overflow-y auto
               scrollbar-thin, custom styled

  Counter:     "3 / 4 выбрано" — 11px, text-faint, mt 4px, text-right

Item (checkbox row):
  Height:       36px (min-height для touch: 44px на mobile)
  Padding:      8px 10px
  Gap:          10px (checkbox + flag/icon + text)
  Border-radius: 6px
  Font:          14px

  Checkbox:     16×16px, custom styled
  Unchecked:    border border-default, bg transparent
  Checked:      bg accent-primary, border accent-primary, checkmark white
  Indeterminate: bg accent-primary 50%, dash

  Flag/Icon:    country selector: флаг 20×14px rounded-xs
                indicator selector: category dot 8px или SVG icon 14px

  Label:        text-primary 14px
  Code:         JetBrains Mono, text-faint, 11px, ml auto

Mobile:
  max-height:   180px (3.5 элемента — намёк на скролл)
  Item height:  44px (min tap target)
  Шрифт label: 13px
```

### Визуальная иерархия

```
Country Selector:
  Primary info:    название страны (text-primary, 14px)
  Secondary info:  код страны (text-faint mono, 11px)
  Visual marker:   флаг слева

Indicator Selector:
  Primary info:    human-readable label (text-primary, 14px)
  Secondary info:  WB код (text-faint mono, 11px) — справа, не мешает
  Группировка:     category label (overline, text-faint, 10px, px 10px py 4px)
```

### Состояния

```
Item unchecked:
  bg:    transparent
  hover: bg interactive-hover, border-radius 6px, cursor pointer

Item checked:
  bg:    interactive-selected
  text:  text-primary (не меняется)
  check: accent-primary

Item at limit (max reached, не выбран):
  opacity: 0.5
  cursor:  not-allowed
  hover:   нет hover effect

Limit reached banner:
  Появляется: над списком
  Текст:      «Максимум 4 страны выбрано»
  Style:      text-warning, 11px, padding 4px 10px, bg status-warning-bg
              border-radius sm, mb 4px
```

### Scroll behavior в списке

```
При переполнении (> max-height):
  Gradient fade снизу: linear-gradient(transparent → bg-surface)
  height 32px, pointer-events none — намекает на скролл
  Исчезает когда достигнут конец списка

Scrollbar styling:
  width:             4px
  track:             transparent
  thumb:             border-strong, border-radius full
  thumb hover:       border-accent
```

### Accessibility

```html
<fieldset>
  <legend className="label text-text-muted uppercase">
    Выберите страны
    <span className="font-normal normal-case ml-1">(до 4)</span>
  </legend>

  {/* Скрытый live region для объявления выбора */}
  <div aria-live="polite" aria-atomic="true" className="sr-only">
    {selectedCount > 0 && `Выбрано ${selectedCount} из ${maxCount}`}
  </div>

  <ul role="listbox" aria-multiselectable="true" aria-label="Список стран">
    {countries.map(country => (
      <li
        key={country.code}
        role="option"
        aria-selected={isSelected(country.code)}
        aria-disabled={isAtLimit && !isSelected(country.code)}
        tabIndex={0}
        onKeyDown={handleKeyDown}  // Space/Enter = toggle
      >
        <img
          src={`/flags/${country.code.toLowerCase()}.svg`}
          alt=""  {/* alt="" — декоративный, название в тексте */}
          aria-hidden="true"
        />
        {country.name}
        <span className="sr-only">, код {country.code}</span>
      </li>
    ))}
  </ul>
</fieldset>
```

---

## 5. Chart Toolbar

### Структура и размеры

```
Desktop:
  Height:        40px
  Layout:        flex items-center justify-between
  Left group:    Chart type tabs (line / bar / scatter)
  Right group:   Actions (export, fullscreen, info)
  Gap between:   auto (space-between)

Chart Type Tab Group:
  Container:     bg-bg-surface, border border-default, border-radius md (6px)
                 padding 3px (внутренний)
                 display inline-flex
  Tab item:      height 32px, padding 0 12px, border-radius sm (4px)
                 font 13px, weight 500

Right actions:
  Icon buttons:  32×32px, border-radius md
  Gap:           4px between buttons
  Divider:       1px vertical, border-default, mx 4px, height 16px

Mobile:
  Height:        48px (больше tap targets)
  Chart type:    icon only (без label), 36×36px
  Right actions: только самое важное (export), остальное в overflow menu
```

### Состояния Chart Type Tab

```
Inactive:
  bg:    transparent
  text:  text-muted

Hover:
  bg:    interactive-hover
  text:  text-primary
  transition: 120ms

Active:
  bg:    bg-elevated
  text:  text-primary
  shadow: shadow-xs
  (нет border-radius изменений — только bg)

Transition: bg и shadow, 150ms ease-out
```

### Состояния Action Buttons

```
Default:
  bg:    transparent
  icon:  text-muted (16×16px, stroke 1.5px)

Hover:
  bg:    interactive-hover
  icon:  text-primary

Active (toggle on):
  bg:    interactive-selected
  icon:  accent-primary

Loading (при экспорте):
  spinner вместо иконки
```

### Визуальная иерархия

```
Порядок приоритетов (слева направо):
  1. Chart type selection  ← самое важное, левый акцент
  2. Zoom/pan controls     ← функциональные
  3. Export                ← редко используется
  4. Fullscreen            ← опционально
  5. Info/legend toggle    ← помощь
```

### Mobile-specific

```
Свернуть в одну строку:
  Chart type icons (без подписей, tooltip при long-press)
  Overflow button «⋯» для остальных действий

Overflow menu:
  Bottom sheet или dropdown
  Элементы высотой 44px
```

### Accessibility

```html
<div role="toolbar" aria-label="Инструменты графика">
  <!-- Chart type group -->
  <div role="group" aria-label="Тип графика">
    <button
      role="radio"
      aria-checked={chartType === 'line'}
      aria-label="Линейный график"
      onClick={() => setChartType('line')}
    >
      <LineIcon aria-hidden />
      <span className="hidden sm:inline">Линия</span>
    </button>
    {/* bar, scatter аналогично */}
  </div>

  <!-- Actions -->
  <button aria-label="Экспортировать данные">
    <DownloadIcon aria-hidden />
  </button>
</div>
```

---

## 6. Cards

### Варианты карточек

```
Вариант          Использование
────────────────────────────────────────────
card-feature     Feature-секция на лендинге
card-stat        Числовой показатель
card-chart       Контейнер для Chart.js
card-preset      Сохранённый пресет
card-country     Элемент в списке (compact)
```

### Card Feature (landing)

```
Padding:         24px
Border-radius:   12px (xl)
Border:          1px solid border-default
Background:      bg-surface
Min-height:      200px

Top section:
  Icon container: 40×40px, bg accent-primary-dim, border-radius lg (8px)
  Number badge:   position absolute top-4 right-4
                  font-mono, 11px, text-faint, user-select none

Body section:
  Title:    18px (h4), font-semibold, text-primary, mt 16px
  Desc:     14px, text-muted, mt 8px, line-height 1.6

Hover:
  transform:      translateY(-2px)
  shadow:         card-hover (0 8px 32px rgba(0,0,0,0.35) + border glow)
  border-color:   border-strong
  transition:     150ms ease-out
```

### Card Stat (числовой)

```
Padding:         20px
Border-radius:   12px
Border:          1px solid border-default
Background:      bg-surface

Layout:
  Row 1: label (caption, text-muted, uppercase)
  Row 2: value (mono-data-xl, font-bold, tabular-nums) + unit (caption, text-muted)
  Row 3: trend badge + comparison text

Value sizes по контексту:
  XL (hero stat):  2.25rem, font-700  — один большой показатель
  LG (grid stat):  1.5rem,  font-700  — в сетке 2–4 карточки
  MD (inline):     1.125rem, font-600 — внутри другой карточки
```

### Card Chart

```
Padding:         16px 20px 20px
Header:          flex justify-between
  Title:         14px, font-semibold, text-primary
  Toolbar:       chart toolbar (см. п.5)

Chart area:
  Margin-top:    12px
  Height:        auto (определяется контентом)
  Min-height:    180px
  Overflow:      hidden

Footer (опционально):
  Meta text:     «Источник: World Bank», 11px, text-faint
  Last updated:  timestamp, 11px, text-faint
```

### Card Preset

```
Layout:          flex items-center justify-between
Padding:         16px
Height:          min 64px

Left:
  Name:          14px, font-semibold, text-primary, truncate max-w-[200px]
  Date:          11px, text-faint, mt 1px

Right:
  Buttons:       «Загрузить» + «Удалить», gap 8px
  Button size:   btn-sm (6px 12px, 13px)

Hover (whole card):
  bg:            interactive-hover
  (кнопки остаются видимы, не hidden)
```

### Accessibility

```html
<!-- Card как кликабельный элемент -->
<article
  className="card card-hover"
  tabIndex={0}
  role="button"
  aria-label={`Пресет: ${preset.name}. Создан ${formatDate(preset.createdAt)}`}
  onKeyDown={e => (e.key === 'Enter' || e.key === ' ') && handleLoad()}
>
  ...
</article>

<!-- Card со статичным содержимым — не tabIndex, не role button -->
<div className="card" aria-label="ВВП на душу населения, Казахстан">
  <p role="status" aria-live="polite">
    {/* обновляемые данные */}
  </p>
</div>
```

---

## 7. Tabs

### Варианты Tabs

```
Вариант         Использование
────────────────────────────────────────
tabs-line       Основные разделы (Analytics/Forecast)
tabs-pills       Вторичный выбор (внутри панели)
tabs-compact    Переключатель типа графика (chart toolbar)
```

### Tabs Line (основные)

```
Container:       border-bottom 1px border-default, display flex, gap 0
Height:          44px (tab item)
Padding tab:     0 16px
Font:            14px, weight 500

Active:
  color:         text-primary
  border-bottom: 2px solid accent-primary
  margin-bottom: -1px (поверх container border)

Inactive:
  color:         text-muted
  border-bottom: 2px solid transparent

Hover:
  color:         text-primary
  border-bottom: 2px solid border-strong
  transition:    color 120ms, border-color 120ms

Indicator animation:
  Скользящая линия (sliding indicator):
  absolute element, height 2px, bg accent-primary
  transition: left + width, 200ms ease-out (следует за активным табом)
```

### Tabs Pills (вторичные)

```
Container:       bg-bg-surface, border border-default, border-radius md (6px)
                 padding 3px, display inline-flex

Tab item:        height 30px, padding 0 12px, border-radius sm (4px)
                 font 13px, weight 500

Active:
  bg:            bg-elevated
  text:          text-primary
  shadow:        shadow-xs

Inactive:
  bg:            transparent
  text:          text-muted

Hover:
  text:          text-primary
  bg:            interactive-hover

Transition: 150ms ease-out (bg, shadow)
```

### Mobile

```
tabs-line на mobile:
  Overflow-x:  auto (горизонтальный скролл)
  Snap:        scroll-snap-type x mandatory
  Tab snap:    scroll-snap-align start
  Scrollbar:   hidden (scrollbar-hide utility)
  Fade edges:  gradient fade справа (намёк на скролл)

tabs-pills:  без изменений (компактные итак)
```

### Accessibility

```html
<div role="tablist" aria-label="Разделы анализа">
  <button
    role="tab"
    id="tab-dashboard"
    aria-controls="panel-dashboard"
    aria-selected={activeTab === 'dashboard'}
    tabIndex={activeTab === 'dashboard' ? 0 : -1}
    {/* tabIndex: 0 только у активного — roving tabindex */}
    onKeyDown={handleArrowKeys}
    {/* Arrow keys для навигации между табами */}
  >
    Сравнение
  </button>
</div>

<div
  role="tabpanel"
  id="panel-dashboard"
  aria-labelledby="tab-dashboard"
  tabIndex={0}
  hidden={activeTab !== 'dashboard'}
>
  ...
</div>

<!-- ВАЖНО: roving tabindex (не tabIndex на всех) -->
<!-- Arrow Left/Right → переключение между табами -->
<!-- Enter/Space     → активация -->
<!-- Home/End        → первый/последний таб -->
```

---

## 8. Modal

### Структура и размеры

```
Overlay:
  position:      fixed inset-0
  z-index:       100
  bg:            bg-overlay (rgba(4,10,18,0.85))
  backdrop-blur: 4px (за overlay)

Dialog (container):
  position:      fixed, top 50% + left 50% + translate(-50%,-50%)
  z-index:       101
  Width variants:
    sm:    480px
    md:    580px (default)
    lg:    720px
    xl:    900px
    full:  100% − 32px (с отступами на мобиле)
  Max-height:    90vh
  Border-radius: 16px (2xl)
  Background:    bg-elevated
  Border:        1px solid border-default
  Shadow:        shadow-xl
  Overflow:      hidden (для border-radius)

Mobile:
  Width:         100% − 16px
  Bottom sheet:  position bottom 0, border-radius 20px 20px 0 0
                 (альтернативный вариант для mobile)
  Max-height:    85vh
```

### Внутренняя структура

```
Header:         padding 20px 24px 16px
  Title:        18px (h3), font-semibold, text-primary
  Subtitle:     13px, text-muted, mt 2px (опционально)
  Close button: 32×32px icon, position absolute top-4 right-4

Divider:        1px border-subtle (между header и body)

Body:           padding 20px 24px
  Overflow-y:   auto (если контент > max-height)
  Max-height:   calc(90vh - 140px) (оставляем место на header+footer)
  Scrollbar:    thin, custom

Footer:         padding 16px 24px 20px
  Border-top:   1px border-subtle
  Layout:       flex justify-end gap-3
  Mobile:       flex-col, buttons full-width, reversed order
                (confirm → cancel стопкой, снизу вверх)
```

### Анимация (из motion_system.md)

```
Open:
  Overlay:  opacity 0→1, 200ms linear
  Dialog:   opacity 0→1 + scale(0.96→1), 220ms ease-out-premium

Close:
  Dialog:   opacity 1→0 + scale(1→0.97), 180ms ease-in
  Overlay:  opacity 1→0, 180ms linear, delay 20ms
```

### Состояния

```
Normal:    стандартный dialog
Warning:   иконка Warning в header, title цвет status-warning
Danger:    кнопка confirm → btn-danger, title цвет status-negative
Loading:   footer buttons disabled + spinner в confirm button
Success:   иконка + текст, без footer buttons (автозакрытие через 2s)
```

### Accessibility

```html
<dialog
  role="dialog"
  aria-modal="true"
  aria-labelledby="modal-title"
  aria-describedby="modal-description"
  open={isOpen}
>
  <h2 id="modal-title">Принять соглашение</h2>
  <p id="modal-description">
    Для доступа к данным необходимо принять условия использования.
  </p>

  {/* Контент */}

  <button autoFocus>Принять</button>
  <button>Отмена</button>
</dialog>

<!-- Focus management:
  - При открытии: focus → первый интерактивный элемент (или close button)
  - При закрытии: focus → элемент, вызвавший modal (ref сохраняется)
  - Focus trap:   Tab циклически внутри modal
  - Escape:       закрыть modal
-->

<!-- Скринридер объявит role=dialog + aria-label при открытии -->
```

---

## 9. Toast

### Структура и размеры

```
Container (portal):
  position:    fixed
  z-index:     200
  bottom:      24px, right: 24px (desktop)
  bottom:      16px, left: 16px, right: 16px (mobile — full width)

Toast item:
  Min-width:   280px
  Max-width:   420px (desktop), 100% (mobile)
  Height:      auto (min 52px)
  Padding:     12px 16px
  Border-radius: 10px
  Border:      1px solid border-default
  Background:  bg-elevated
  Shadow:      shadow-lg

Layout (flex items-start gap-3):
  [Icon 18×18px] + [Text block] + [Close button 24×24px]

Text block:
  Title:       14px, font-semibold, text-primary
  Message:     13px, text-muted, mt 1px (опционально)

Icon по типу:
  success:  CheckCircle, text-status-positive
  error:    XCircle,     text-status-negative
  warning:  AlertTriangle, text-status-warning
  info:     InfoIcon,    text-status-info

Left accent bar:
  Width:    3px
  Height:   100%
  Position: absolute left 0 top 0, border-radius left side
  Color по типу:  success → status-positive, etc.
```

### Анимация появления

```
Enter (снизу справа):
  translateX(calc(100% + 24px)) → translateX(0)
  opacity 0 → 1
  duration: 280ms, ease-out-decelerate

Exit:
  translateX(0) → translateX(calc(100% + 24px))
  opacity 1 → 0
  duration: 200ms, ease-in

Stack (несколько тостов):
  gap:         8px
  Новый входит снизу, предыдущие поднимаются
  translateY transition: 200ms ease-out

Progress bar (auto-dismiss):
  position absolute bottom 0, left 3px, right 0
  height 2px, bg accent-primary opacity 50%
  Анимация: width 100%→0% за duration тоста
  Приостанавливается при hover
```

### Поведение

```
Auto-dismiss duration:
  success:   4000ms
  info:      5000ms
  warning:   6000ms
  error:     никогда (пока пользователь не закроет)

Pause on hover:   pauseOnHover prop (прогресс бар останавливается)
Max simultaneous: 4 тоста (старые вытесняются)
Deduplication:    не показывать дубли (same message + type)
```

### Mobile

```
Position:     bottom 0, left 0, right 0 (full width + отступы)
Border-radius: 10px (без изменений)
Animation:    снизу вверх (translateY 100%→0)
```

### Accessibility

```html
<!-- Контейнер: aria-live -->
<div
  aria-live="polite"      {/* для success/info */}
  aria-live="assertive"   {/* для error */}
  aria-atomic="false"
  role="status"           {/* или role="alert" для error */}
>
  <div role="alert" aria-label={`${type}: ${message}`}>
    <span aria-hidden="true"><Icon /></span>
    <div>
      <p>{title}</p>
      {message && <p>{message}</p>}
    </div>
    <button
      aria-label="Закрыть уведомление"
      onClick={dismiss}
    >
      <XIcon aria-hidden />
    </button>
  </div>
</div>

<!--
  polite:   не прерывает текущее чтение скринридера
  assertive: прерывает (только для критических ошибок)
  Не использовать assertive для success — раздражает
-->
```

---

## 10. Table

### Структура и размеры

```
Container:
  Overflow-x: auto (горизонтальный скролл на mobile)
  Border:     1px solid border-default
  Border-radius: xl (12px)
  Background: bg-surface

Table:
  Width:       100%
  Border-collapse: separate
  Border-spacing: 0

Header row:
  Height:        40px
  Padding cell:  10px 16px
  Font:          11px, uppercase, tracking-wider, font-semibold, text-muted
  Background:    bg-elevated
  Border-bottom: 1px solid border-default
  First cell:    border-radius top-left 11px (xl − 1px для border)
  Last cell:     border-radius top-right 11px

Body row:
  Height:        min 48px
  Padding cell:  12px 16px
  Font:          14px, text-primary
  Border-bottom: 1px solid border-subtle (кроме последней)
  Last row:      нет border, border-radius bottom

Numeric cells:
  Font-family:  JetBrains Mono (font-tabular)
  Text-align:   right
  Font-size:    13px

Text cells:
  Text-align:   left
  Truncate:     max-width 200px, overflow hidden, text-ellipsis
                title attr для полного значения
```

### Состояния строк

```
Default:
  bg:    transparent

Hover:
  bg:    interactive-hover
  cursor: pointer (если строка кликабельна)
  transition: bg 100ms

Selected:
  bg:    interactive-selected
  Checkbox слева: checked state

Expanded (если accordion-row):
  bg:    bg-elevated
  Sub-row: padding-left 32px (indent)

Loading (skeleton):
  Заменить data cells на .skeleton блоки
  Анимация shimmer (из design_system)

Empty:
  Colspan = кол-во колонок
  Padding: 48px 24px
  Content: иконка + текст пустого состояния
```

### Sort indicator

```
Header with sort:
  cursor: pointer
  После label: иконка ↑↓ (обе серые = нет сортировки)
               ↑ подсвечена = сортировка по возрастанию
               ↓ подсвечена = сортировка по убыванию

Hover header:   иконка подсвечивается preview
Transition:     color 120ms
```

### Пример: Таблица стран

```
Columns:
  #         : 40px,  text-right, text-muted (порядковый)
  Страна    : 180px, flag 20px + название
  Индикатор : 120px, mono, text-right
  Изменение : 100px, badge (positive/negative/neutral)
  Год       : 60px,  mono, text-right, text-muted
  Действия  : 80px,  icon buttons
```

### Mobile адаптация

```
Horizontal scroll:   overflow-x auto, всегда
Sticky first column: position sticky, left 0, bg-surface
                     box-shadow: 4px 0 8px rgba(0,0,0,0.15) (separator)
Min column width:    не менее 80px (не схлопываться)
Font size:           13px (body) и 10px (header)

Альтернатива (card-view):
  Если < 480px: переключиться на card-list view
  Каждая строка → card с key-value парами
  toggle кнопка "Таблица / Список" в toolbar
```

### Accessibility

```html
<div role="region" aria-label="Данные по странам" tabIndex={0}>
  <table aria-rowcount={totalRows} aria-colcount={colCount}>
    <caption className="sr-only">
      Таблица экономических показателей по странам.
      {sortInfo && `Отсортировано по ${sortInfo}.`}
    </caption>

    <thead>
      <tr>
        <th
          scope="col"
          aria-sort={sortField === 'name'
            ? (sortDir === 'asc' ? 'ascending' : 'descending')
            : 'none'
          }
        >
          <button>
            Страна
            <SortIcon aria-hidden />
          </button>
        </th>
        <th scope="col" aria-sort="none">
          <button>Значение <SortIcon aria-hidden /></button>
        </th>
      </tr>
    </thead>

    <tbody>
      {rows.map((row, i) => (
        <tr key={row.id} aria-rowindex={i + 1}>
          <td>{row.country}</td>
          <td>
            <span className="sr-only">значение: </span>
            {row.value}
          </td>
          <td>
            <span className="sr-only">изменение: </span>
            <TrendBadge value={row.change} />
            {/* Badge должен содержать текст, не только цвет */}
          </td>
        </tr>
      ))}
    </tbody>
  </table>
</div>

<!-- aria-sort: none / ascending / descending / other -->
<!-- scope="col" на th заголовков                     -->
<!-- caption или aria-label на table                  -->
<!-- tabIndex={0} на контейнер — позволяет скролл keyboard -->
```

---

## Сводная таблица размеров

| Компонент | Height | Padding | Radius | Font |
|---|---|---|---|---|
| Navbar | 72px (desktop) / 60px (mobile) | px-6 | — | 14px/500 |
| Hero CTA btn | 52px | 14px 32px | 8px | 16px/600 |
| Search input | 40px / 44px mob | 10px 14px 10px 40px | 6px | 14px/400 |
| Selector item | 36px / 44px mob | 8px 10px | 6px | 14px/400 |
| Chart toolbar | 40px / 48px mob | — | 6px | 13px/500 |
| Card (feature) | auto min 200px | 24px | 12px | 18px/600 |
| Card (stat) | auto min 80px | 20px | 12px | 2.25rem/700 |
| Tabs line | 44px | 0 16px | — | 14px/500 |
| Tabs pills | 30px | 0 12px | 4px | 13px/500 |
| Modal | 90vh max | 20px 24px | 16px | 18px/600 |
| Toast | auto min 52px | 12px 16px | 10px | 14px/600 |
| Table header | 40px | 10px 16px | — | 11px/600 |
| Table row | 48px | 12px 16px | — | 14px/400 |

---

## Focus Order (Tab sequence)

```
Страница:
1. Skip link («Перейти к содержимому»)
2. Logo (link)
3. Nav links (left → right)
4. Language switcher
5. Theme toggle
6. Auth button / Profile menu

Dashboard:
7. Country selector search
8. Country items (Arrow keys внутри listbox)
9. Indicator selector search
10. Indicator items
11. Year controls
12. Run button
13. Chart toolbar (роving tabindex)
14. Chart canvas (tabIndex 0, arrow keys для tooltip)

Modal (когда открыт):
  Focus trapped внутри:
  1. Close button
  2. Content (если scrollable)
  3. Cancel button
  4. Confirm button
```

---

*EVision UI Component Spec v1 · Lead Product Designer · 2026*

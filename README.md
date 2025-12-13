## The Lorenz Curve and the Gini Index Dashboard

Full-stack учебный проект дипломной тематики «Development of a Web Platform for Analyzing Income Inequality Using the Lorenz Curve and the Gini Index on the Example of Different Countries».  
Фронтенд (React + Vite + Tailwind + Chart.js) позволяет выбирать страны/индикаторы Всемирного банка и строить Lorenz / Gini ориентированные графики, а бэкенд (Flask) выступает прокси к публичному World Bank API с простым кешированием.

### Возможности

- Time-series сравнение индикаторов неравенства (Gini index, доли дохода по децилям/квинтилям) для нескольких стран.
- Lorenz Curve режим: фронтенд автоматически грузит квинтильные доли дохода (`SI.DST.*` индикаторы) и строит кривую Лоренца с линией абсолютного равенства.

### Запуск

**Backend**
```bash
cd backend
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
python app.py
```

**Frontend**
```bash
cd frontend
npm install
npm run dev
```

Измените `VITE_API_URL` в `.env` фронтенда при необходимости. Бкап эндпоинта по умолчанию — `http://127.0.0.1:5000/api/data`.

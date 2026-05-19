import React from "react";
import { Link } from "react-router-dom";
import { useI18n } from "../context/I18nContext";

export default function PrivacyPage() {
  const { lang } = useI18n();

  const content = {
    ru: {
      kicker: "Юридические условия",
      title: "Политика конфиденциальности",
      updated: "Последнее обновление: май 2026",
      sections: [
        {
          title: "1. Какие данные мы собираем",
          body: "Мы собираем только данные, необходимые для работы платформы: имя пользователя, адрес электронной почты и хэш пароля при регистрации. Никакие дополнительные персональные данные (ФИО, телефон, адрес) не запрашиваются.",
        },
        {
          title: "2. Cookies и локальное хранилище",
          body: "Мы используем httpOnly cookie для хранения токена сессии — это необходимо для аутентификации. Cookie не содержит персональных данных и недоступен JavaScript-коду. В localStorage сохраняются только настройки интерфейса (тема, язык, согласие на cookies).",
        },
        {
          title: "3. Как используются данные",
          body: "Данные используются исключительно для предоставления функций платформы: авторизации, сохранения пресетов и аналитических настроек. Данные не продаются, не передаются третьим лицам и не используются в рекламных целях.",
        },
        {
          title: "4. Хранение и безопасность",
          body: "Пароли хранятся в виде хэшей (bcrypt). Токены доступа хранятся только в памяти браузера и уничтожаются при закрытии вкладки. Токены обновления хранятся в httpOnly cookie с ограниченным сроком действия (7 дней).",
        },
        {
          title: "5. Сторонние сервисы",
          body: "Платформа использует Google OAuth для возможности входа через Google-аккаунт. При этом Google получает информацию о факте входа. Данные из Всемирного банка, МВФ, ООН и ОЭСР загружаются с их публичных API и не содержат персональных данных.",
        },
        {
          title: "6. Права пользователя",
          body: "Вы можете в любой момент удалить свой аккаунт, написав на адрес ниже. После удаления все связанные данные (пресеты, история) удаляются безвозвратно в течение 30 дней.",
        },
        {
          title: "7. Контакты",
          body: `По вопросам конфиденциальности обращайтесь: nuraidynseitkapar@gmail.com`,
        },
      ],
      backHome: "На главную",
    },
    en: {
      kicker: "Legal",
      title: "Privacy Policy",
      updated: "Last updated: May 2026",
      sections: [
        {
          title: "1. Data We Collect",
          body: "We collect only the data necessary to operate the platform: username, email address, and hashed password upon registration. No additional personal data (full name, phone, address) is requested.",
        },
        {
          title: "2. Cookies & Local Storage",
          body: "We use an httpOnly cookie to store the session token — this is required for authentication. The cookie contains no personal data and is inaccessible to JavaScript. localStorage stores only UI preferences (theme, language, cookie consent).",
        },
        {
          title: "3. How Data Is Used",
          body: "Data is used solely to provide platform features: authentication, saving presets and analysis settings. Data is never sold, shared with third parties, or used for advertising.",
        },
        {
          title: "4. Storage & Security",
          body: "Passwords are stored as bcrypt hashes. Access tokens exist only in browser memory and are destroyed when the tab closes. Refresh tokens are stored in an httpOnly cookie with a 7-day expiry.",
        },
        {
          title: "5. Third-Party Services",
          body: "The platform uses Google OAuth for Google sign-in. Google receives sign-in event data per their own privacy policy. Data from World Bank, IMF, UN, and OECD is fetched from their public APIs and contains no personal data.",
        },
        {
          title: "6. Your Rights",
          body: "You may delete your account at any time by contacting us at the address below. After deletion, all associated data (presets, history) is permanently removed within 30 days.",
        },
        {
          title: "7. Contact",
          body: "For privacy inquiries: nuraidynseitkapar@gmail.com",
        },
      ],
      backHome: "Back to Home",
    },
    kz: {
      kicker: "Заңды шарттар",
      title: "Құпиялылық саясаты",
      updated: "Соңғы жаңарту: 2026 жыл, мамыр",
      sections: [
        {
          title: "1. Жинайтын деректер",
          body: "Платформаны жұмыс істету үшін қажетті деректерді ғана жинаймыз: тіркелу кезінде пайдаланушы аты, электрондық пошта және құпия сөз хэші. Қосымша жеке деректер (аты-жөні, телефон, мекенжай) сұралмайды.",
        },
        {
          title: "2. Cookie және жергілікті қойма",
          body: "Аутентификация үшін сессия токенін сақтайтын httpOnly cookie пайдаланамыз. Cookie жеке деректерді қамтымайды және JavaScript кодына қолжетімді емес. localStorage тек интерфейс параметрлерін сақтайды (тема, тіл, cookie келісімі).",
        },
        {
          title: "3. Деректерді пайдалану",
          body: "Деректер тек платформа функцияларын қамтамасыз ету үшін пайдаланылады. Деректер сатылмайды, үшінші тұлғаларға берілмейді және жарнамалық мақсатта пайдаланылмайды.",
        },
        {
          title: "4. Сақтау және қауіпсіздік",
          body: "Құпия сөздер bcrypt хэштері түрінде сақталады. Кіру токендері тек браузер жадында болады. Жаңарту токендері httpOnly cookie-де 7 күн мерзімімен сақталады.",
        },
        {
          title: "5. Үшінші тарап қызметтері",
          body: "Платформа Google OAuth пайдаланады. Дүниежүзілік банк, ХВҚ, БҰҰ және ЭЫДҰ деректері олардың ашық API-лерінен алынады.",
        },
        {
          title: "6. Пайдаланушы құқықтары",
          body: "Аккаунтты кез келген уақытта төмендегі мекенжайға хабарласу арқылы жоюға болады. Жойылғаннан кейін барлық байланысты деректер 30 күн ішінде біржола жойылады.",
        },
        {
          title: "7. Байланыс",
          body: "Құпиялылық мәселелері бойынша: nuraidynseitkapar@gmail.com",
        },
      ],
      backHome: "Басты бетке",
    },
  };

  const c = content[lang] || content.en;

  return (
    <article className="max-w-2xl mx-auto space-y-8 py-4">
      <header className="space-y-2">
        <p className="page-section-kicker">{c.kicker}</p>
        <h1
          className="hero-title"
          style={{
            background: "linear-gradient(135deg, var(--text) 0%, var(--accent) 60%)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            backgroundClip: "text",
          }}
        >
          {c.title}
        </h1>
        <p className="text-sm text-muted">{c.updated}</p>
      </header>

      <div className="panel space-y-6">
        {c.sections.map((s) => (
          <div key={s.title} className="space-y-1.5">
            <h2 className="text-base font-semibold">{s.title}</h2>
            <p className="text-sm leading-relaxed text-muted">{s.body}</p>
          </div>
        ))}
      </div>

      <div>
        <Link to="/" className="btn-secondary inline-flex">
          ← {c.backHome}
        </Link>
      </div>
    </article>
  );
}

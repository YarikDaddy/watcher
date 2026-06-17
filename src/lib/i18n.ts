import { cookies, headers } from "next/headers";

export type Locale = "ru" | "en";
export const LOCALES: Locale[] = ["ru", "en"];
export const LOCALE_COOKIE = "lang";

const en = {
  locale: "en" as Locale,
  common: {
    appName: "Watcher",
    login: "Log in",
    signup: "Sign up",
    logout: "Log out",
    startFree: "Start free",
    createAccount: "Create account",
  },
  landing: {
    badge: "Website monitoring · Telegram alerts",
    heroTitle: "Know first when a website changes",
    heroSubtitle:
      "Watcher tracks prices, stock, crypto and exchange rates — and pings your Telegram the moment something changes. No manual refreshing.",
    ctaPrimary: "Start free",
    ctaSecondary: "How it works",
    freeNote: "Free: up to 3 trackers · no card required",
    trustLine: "Open source · built in public · no credit card",
    modesTitle: "Three ways to track",
    modes: [
      {
        icon: "💰",
        title: "Product price",
        text: "Paste a product link — Watcher finds the price automatically and alerts you when it changes. No setup, no code.",
      },
      {
        icon: "📈",
        title: "Crypto & rates",
        text: "Bitcoin, Ethereum, gold, silver, USD/EUR. Get an alert when the price crosses your threshold or moves by X%.",
      },
      {
        icon: "⚙️",
        title: "Any element",
        text: "Advanced mode: pick any element with a CSS selector — a status, a job listing, a schedule, anything on the page.",
      },
    ],
    howTitle: "How it works",
    steps: [
      {
        n: "1",
        title: "Add a tracker",
        text: "Paste a link or pick an asset. Hit “Check” to instantly see what Watcher will watch.",
      },
      {
        n: "2",
        title: "Connect Telegram",
        text: "One click links the Watcher bot to your account. Nothing to install.",
      },
      {
        n: "3",
        title: "Get alerts",
        text: "Watcher checks on schedule and messages you in Telegram the second something changes.",
      },
    ],
    casesTitle: "What people track",
    cases: [
      { icon: "🪙", title: "Crypto", text: "Get pinged when BTC drops below your buy target." },
      { icon: "💸", title: "Price drops", text: "Catch a discount on a product or ticket the moment it falls." },
      { icon: "📦", title: "Back in stock", text: "Be first to know when an item is available again." },
      { icon: "💼", title: "Jobs", text: "Watch a careers page — a new opening won’t slip past." },
    ],
    faqTitle: "FAQ",
    faq: [
      {
        q: "Which sites work?",
        a: "Most regular sites where the price is in the page HTML, plus crypto, metals and currencies via exchange APIs. Big marketplaces with heavy bot protection (e.g. Amazon-scale) may not work — Watcher tells you honestly when a site can’t be tracked.",
      },
      {
        q: "Do I need to install anything?",
        a: "No. You only need a Telegram account to receive alerts. Linking the bot is one click.",
      },
      {
        q: "How often does it check?",
        a: "From every minute up to once a day, per tracker. You choose the interval.",
      },
      {
        q: "Is it free?",
        a: "Yes — up to 3 trackers with no card. It’s an open, build-in-public project.",
      },
    ],
    tariffTitle: "Simple start",
    tariffName: "Free plan",
    tariffPrice: "$0",
    tariffFeatures: [
      "Up to 3 trackers",
      "Price, crypto & rates, custom selector",
      "Telegram notifications",
      "Alert history",
    ],
    tariffCta: "Create account",
    footerTagline: "Built in the open · #buildinpublic",
  },
  dashboard: {
    loggedInAs: "Logged in as",
    trackers: "Trackers",
    emptyTitle: "Add your first tracker in a minute 👇",
    onboarding: [
      "Paste a product link, or pick a crypto/rate.",
      "Hit “Check” — Watcher shows what it found right away.",
      "Connect Telegram above and get an alert on every change.",
    ],
    delete: "Delete",
    priceLabel: "💰 price",
    alertPrefix: "alert:",
    every: "every",
    nowPrefix: "now",
    minShort: "min",
    hourShort: "h",
    dayShort: "a day",
    statuses: {
      PENDING: "awaiting check",
      OK: "no changes",
      CHANGED: "changed!",
      ERROR: "error",
    },
  },
  form: {
    newTracker: "New tracker",
    whatToTrack: "What to track",
    modePrice: "💰 Price",
    modeAsset: "📈 Crypto / rate",
    modeSelector: "⚙️ Selector",
    hintPrice:
      "Paste a product link — Watcher finds the price. Works on regular sites; big marketplaces (Amazon-scale) block bots.",
    hintAsset: "Crypto, metals or currency from exchange APIs. Alert by price threshold or by % change.",
    hintSelector: "Advanced: target any element on the page with a CSS selector.",
    urlPlaceholder: "https://example.com/product",
    selectorPlaceholder: "CSS selector (e.g. .price, #stock)",
    asset: "Asset",
    condition: "Condition",
    condBelow: "Price below",
    condAbove: "Price above",
    condPercent: "Change by %",
    thresholdPrice: "Price threshold",
    thresholdPercent: "Percent, %",
    thresholdPricePh: "e.g. 60000",
    thresholdPercentPh: "e.g. 5",
    check: "Check",
    checking: "Checking...",
    namePlaceholder: "Name (optional)",
    checkEvery: "Check every",
    typeLabel: "Change type",
    typeText: "Text change",
    typePresence: "Appears/disappears",
    addTracker: "Add tracker",
    adding: "Adding...",
    limitReached: "Free plan limit reached. Delete a tracker to add a new one.",
    previewFoundAsset: "Now",
    previewFound: "Found",
    previewEmpty: "empty",
    previewNotFoundPrice:
      "Couldn’t find a price — the site may load it via JS. Try another site or “Selector” mode",
    previewNotFoundSelector: "Selector matched nothing on the page — check it",
    intervals: {
      "1": "1 minute",
      "5": "5 minutes",
      "60": "1 hour",
      "180": "3 hours",
      "360": "6 hours",
      "720": "12 hours",
      "1440": "a day",
    },
  },
  telegram: {
    linked: "Telegram connected",
    unlink: "unlink",
    connect: "Connect Telegram",
    preparing: "Preparing link...",
    instructions: "Open the bot and tap “Start”. If the window didn’t open —",
    openLink: "use this link",
    afterLink: ". Refresh the page after linking.",
  },
  auth: {
    loginTitle: "Log in to Watcher",
    loginSubmit: "Log in",
    signupTitle: "Sign up for Watcher",
    signupSubmit: "Create account",
    email: "Email",
    password: "Password",
    noAccount: "No account?",
    signupLink: "Sign up",
    haveAccount: "Already have an account?",
    loginLink: "Log in",
  },
  meta: {
    title: "Watcher — track website changes with Telegram alerts",
    description:
      "Watcher monitors prices, stock, crypto and exchange rates and sends a Telegram alert the moment something changes.",
  },
};

const ru: typeof en = {
  locale: "ru",
  common: {
    appName: "Watcher",
    login: "Войти",
    signup: "Регистрация",
    logout: "Выйти",
    startFree: "Начать бесплатно",
    createAccount: "Создать аккаунт",
  },
  landing: {
    badge: "Мониторинг сайтов · алерты в Telegram",
    heroTitle: "Узнавай об изменениях на сайтах первым",
    heroSubtitle:
      "Watcher следит за ценами, наличием, криптой и курсами — и пишет в Telegram в ту же секунду, как что-то меняется. Без ручного F5.",
    ctaPrimary: "Начать бесплатно",
    ctaSecondary: "Как это работает",
    freeNote: "Бесплатно: до 3 трекеров · без карты",
    trustLine: "Открытый код · делаем в открытую · без карты",
    modesTitle: "Три способа следить",
    modes: [
      {
        icon: "💰",
        title: "Цена товара",
        text: "Вставь ссылку на товар — Watcher сам найдёт цену и сообщит, когда она изменится. Без настройки и кода.",
      },
      {
        icon: "📈",
        title: "Крипта и курсы",
        text: "Bitcoin, Ethereum, золото, серебро, USD/EUR. Алерт, когда цена пересекает порог или меняется на X%.",
      },
      {
        icon: "⚙️",
        title: "Любой элемент",
        text: "Продвинутый режим: укажи любой элемент CSS-селектором — статус, вакансию, расписание, что угодно.",
      },
    ],
    howTitle: "Как это работает",
    steps: [
      {
        n: "1",
        title: "Добавь трекер",
        text: "Вставь ссылку или выбери актив. Нажми «Проверить» — сразу видно, за чем будет следить Watcher.",
      },
      {
        n: "2",
        title: "Привяжи Telegram",
        text: "Один клик — и бот Watcher подключён к аккаунту. Ставить ничего не нужно.",
      },
      {
        n: "3",
        title: "Получай алерты",
        text: "Watcher проверяет по расписанию и пишет в Telegram в ту же секунду, как что-то изменилось.",
      },
    ],
    casesTitle: "Что отслеживают",
    cases: [
      { icon: "🪙", title: "Крипта", text: "Получи пинг, когда BTC упал ниже твоей цены входа." },
      { icon: "💸", title: "Падение цены", text: "Лови скидку на товар или билет в момент, когда цена упала." },
      { icon: "📦", title: "Снова в наличии", text: "Узнавай первым, когда товар снова доступен." },
      { icon: "💼", title: "Вакансии", text: "Следи за страницей карьеры — новая вакансия не пройдёт мимо." },
    ],
    faqTitle: "Вопросы",
    faq: [
      {
        q: "Какие сайты работают?",
        a: "Большинство обычных сайтов, где цена есть в HTML, плюс крипта, металлы и валюты через биржевые API. Крупные маркетплейсы с жёсткой анти-бот защитой могут не работать — Watcher честно сообщит, если сайт нельзя отслеживать.",
      },
      {
        q: "Нужно что-то устанавливать?",
        a: "Нет. Нужен только аккаунт Telegram для алертов. Привязка бота — в один клик.",
      },
      {
        q: "Как часто проверяет?",
        a: "От раза в минуту до раза в сутки — для каждого трекера ты выбираешь интервал сам.",
      },
      {
        q: "Это бесплатно?",
        a: "Да — до 3 трекеров без карты. Это открытый проект, который делается в открытую.",
      },
    ],
    tariffTitle: "Простой старт",
    tariffName: "Бесплатный тариф",
    tariffPrice: "0 ₽",
    tariffFeatures: [
      "До 3 трекеров",
      "Цена, крипта и курсы, свой селектор",
      "Уведомления в Telegram",
      "История срабатываний",
    ],
    tariffCta: "Создать аккаунт",
    footerTagline: "Сделано в открытую · #buildinpublic",
  },
  dashboard: {
    loggedInAs: "Вы вошли как",
    trackers: "Трекеры",
    emptyTitle: "Добавьте первый трекер за минуту 👇",
    onboarding: [
      "Вставьте ссылку на товар или выберите крипту/курс.",
      "Нажмите «Проверить» — Watcher сразу покажет, что нашёл.",
      "Привяжите Telegram выше — и получайте алерт при изменении.",
    ],
    delete: "Удалить",
    priceLabel: "💰 цена",
    alertPrefix: "алерт:",
    every: "раз в",
    nowPrefix: "сейчас",
    minShort: "мин",
    hourShort: "ч",
    dayShort: "сутки",
    statuses: {
      PENDING: "ожидает проверки",
      OK: "без изменений",
      CHANGED: "изменилось!",
      ERROR: "ошибка",
    },
  },
  form: {
    newTracker: "Новый трекер",
    whatToTrack: "Что отслеживать",
    modePrice: "💰 Цена",
    modeAsset: "📈 Курс / крипта",
    modeSelector: "⚙️ Селектор",
    hintPrice:
      "Вставьте ссылку на товар — Watcher сам найдёт цену. Работает на обычных сайтах; крупные маркетплейсы (Ozon, DNS, WB) защищены от ботов.",
    hintAsset: "Курс крипты, металла или валюты из биржевых API. Алерт по порогу цены или по изменению на %.",
    hintSelector: "Для продвинутых: задайте CSS-селектор любого элемента на странице.",
    urlPlaceholder: "https://example.com/product",
    selectorPlaceholder: "CSS-селектор (напр. .price, #stock)",
    asset: "Актив",
    condition: "Условие",
    condBelow: "Цена ниже",
    condAbove: "Цена выше",
    condPercent: "Изменение на %",
    thresholdPrice: "Порог цены",
    thresholdPercent: "Процент, %",
    thresholdPricePh: "напр. 60000",
    thresholdPercentPh: "напр. 5",
    check: "Проверить",
    checking: "Проверяю...",
    namePlaceholder: "Название (необязательно)",
    checkEvery: "Проверять раз в",
    typeLabel: "Тип изменения",
    typeText: "Изменение текста",
    typePresence: "Появление/исчезновение",
    addTracker: "Добавить трекер",
    adding: "Добавляю...",
    limitReached: "Достигнут лимит свободного тарифа. Удалите трекер, чтобы добавить новый.",
    previewFoundAsset: "Сейчас",
    previewFound: "Нашлось",
    previewEmpty: "пусто",
    previewNotFoundPrice:
      "Цена не нашлась — возможно, сайт подгружает её через JS. Попробуйте другой сайт или режим «Селектор»",
    previewNotFoundSelector: "Селектор ничего не нашёл на странице — проверьте его",
    intervals: {
      "1": "1 минута",
      "5": "5 минут",
      "60": "1 час",
      "180": "3 часа",
      "360": "6 часов",
      "720": "12 часов",
      "1440": "сутки",
    },
  },
  telegram: {
    linked: "Telegram привязан",
    unlink: "отвязать",
    connect: "Подключить Telegram",
    preparing: "Готовлю ссылку...",
    instructions: "Откройте бота и нажмите «Start». Если окно не открылось —",
    openLink: "перейдите по ссылке",
    afterLink: ". После привязки обновите страницу.",
  },
  auth: {
    loginTitle: "Вход в Watcher",
    loginSubmit: "Войти",
    signupTitle: "Регистрация в Watcher",
    signupSubmit: "Создать аккаунт",
    email: "Email",
    password: "Пароль",
    noAccount: "Нет аккаунта?",
    signupLink: "Зарегистрироваться",
    haveAccount: "Уже есть аккаунт?",
    loginLink: "Войти",
  },
  meta: {
    title: "Watcher — отслеживай изменения на сайтах с алертами в Telegram",
    description:
      "Watcher следит за ценами, наличием, криптой и курсами и присылает алерт в Telegram в ту же секунду, как что-то меняется.",
  },
};

export type Dict = typeof en;

const dictionaries: Record<Locale, Dict> = { en, ru };

export function getDict(locale: Locale): Dict {
  return dictionaries[locale];
}

/** Локаль из cookie, иначе по Accept-Language (ru → ru, иначе en). */
export async function getLocale(): Promise<Locale> {
  const fromCookie = (await cookies()).get(LOCALE_COOKIE)?.value;
  if (fromCookie === "ru" || fromCookie === "en") return fromCookie;
  const accept = (await headers()).get("accept-language")?.toLowerCase() ?? "";
  return accept.startsWith("ru") ? "ru" : "en";
}

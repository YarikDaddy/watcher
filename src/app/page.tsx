import Link from "next/link";
import { getLocale, getDict, type Dict } from "@/lib/i18n";
import LanguageSwitcher from "./language-switcher";
import SiteChecker from "./site-checker";
import LiveDemo from "./live-demo";
import Reveal from "./ui/reveal";

const GITHUB_URL = "https://github.com/YarikDaddy/watcher";

type L = Dict["landing"];

// Детерминированная «история» для макета статус-страницы: почти всё зелёное,
// пара жёлтых дней и один красный — как у живого сайта. Без Math.random,
// чтобы серверный и клиентский рендер совпадали.
function mockBars(seed: number, n = 60): string[] {
  return Array.from({ length: n }, (_, i) => {
    const v = (i * 37 + seed * 101) % 97;
    if (v === 13) return "bg-down";
    if (v % 23 === 5) return "bg-warn";
    return "bg-up";
  });
}

function Eyebrow({ children, dark = false }: { children: React.ReactNode; dark?: boolean }) {
  return (
    <p className={`text-sm font-semibold tracking-tight ${dark ? "text-[#2997ff]" : "text-accent"}`}>
      {children}
    </p>
  );
}

function Check({ children, dark = false }: { children: React.ReactNode; dark?: boolean }) {
  return (
    <li className="flex items-start gap-3">
      <span
        className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[11px] ${
          dark ? "bg-white/10 text-[#30d158]" : "bg-up-soft text-up"
        }`}
      >
        ✓
      </span>
      <span>{children}</span>
    </li>
  );
}

/** Макет Telegram-чата с алертами (тёмная секция). */
function ChatMock({ t }: { t: L["chat"] }) {
  const bubbles: [string, string][] = [
    [t.down, t.t1],
    [t.up, t.t2],
    [t.ssl, t.t3],
    [t.digest, t.t4],
  ];
  return (
    <div className="mx-auto w-full max-w-sm rounded-[2.5rem] border border-white/10 bg-[#0e0e10] p-3 shadow-2xl">
      <div className="rounded-[2rem] bg-[#17212b] pb-4">
        <div className="flex items-center gap-3 rounded-t-[2rem] border-b border-black/30 bg-[#232e3c] px-5 py-3.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-white text-sm font-bold text-black">
            W
          </span>
          <div>
            <p className="text-sm font-semibold text-white">{t.bot}</p>
            <p className="text-xs text-[#7f91a4]">{t.online}</p>
          </div>
        </div>
        <div className="flex flex-col gap-2.5 px-3 pt-4">
          {bubbles.map(([text, time], i) => (
            <div
              key={i}
              className="rise max-w-[88%] rounded-2xl rounded-bl-md bg-[#182533] px-3.5 py-2.5 text-[13px] leading-snug text-white"
              style={{ animationDelay: `${i * 120}ms` }}
            >
              {text.split("\n").map((line, j) => (
                <p key={j} className={j === 0 ? "font-semibold" : "text-white/85"}>
                  {line}
                </p>
              ))}
              <p className="mt-1 text-right text-[10px] text-[#7f91a4]">{time}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/** Макет white-label статус-страницы клиента. */
function StatusMock({ t }: { t: L["statusMock"] }) {
  return (
    <div className="w-full rounded-3xl border border-line bg-card p-5 shadow-[0_20px_60px_rgba(0,0,0,0.08)] sm:p-7">
      <p className="text-xs font-medium text-mute">{t.brand}</p>
      <p className="mt-1 text-2xl font-semibold tracking-tight">{t.client}</p>
      <p className="text-sm text-mute">{t.title}</p>
      <div className="mt-4 flex items-center gap-2.5 rounded-xl border border-up/30 bg-up-soft px-4 py-3">
        <span className="pulse-dot h-2.5 w-2.5 rounded-full bg-up" />
        <span className="text-sm font-semibold">{t.banner}</span>
      </div>
      <div className="mt-4 flex flex-col gap-4">
        {t.sites.map((site, i) => (
          <div key={site}>
            <div className="flex items-center justify-between text-sm">
              <span className="flex items-center gap-2 font-medium">
                <span className="h-2 w-2 rounded-full bg-up" />
                {site}
              </span>
              <span className="tabular-nums text-xs text-mute">
                {["99.98%", "100%", "99.91%"][i]} {t.uptime}
              </span>
            </div>
            <div className="grow-bars mt-2 flex h-6 gap-[2px]">
              {mockBars(i + 1).map((c, j) => (
                <span
                  key={j}
                  style={{ "--i": j } as React.CSSProperties}
                  className={`flex-1 rounded-[2px] ${i === 1 ? "bg-up" : c}`}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
      <div className="mt-2 flex justify-between text-[11px] text-faint">
        <span>{t.ago}</span>
        <span>{t.today}</span>
      </div>
    </div>
  );
}

/** Макет пульта агентства. */
function CockpitMock({ t }: { t: L["cockpitMock"] }) {
  const sites = [
    ["acme.ru", "142 ms", "54", "301"],
    ["shop.acme.ru", "388 ms", "54", "301"],
  ];
  return (
    <div className="w-full rounded-3xl border border-line bg-canvas p-4 shadow-[0_20px_60px_rgba(0,0,0,0.08)] sm:p-6">
      <div className="flex items-center gap-2.5">
        <span className="pulse-dot h-3 w-3 rounded-full bg-up" />
        <p className="text-lg font-semibold tracking-tight sm:text-xl">{t.headline}</p>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
        {t.tiles.map(([label, value]) => (
          <div key={label} className="rounded-xl border border-line bg-card px-3 py-2.5">
            <p className="truncate text-[11px] text-mute">{label}</p>
            <p className="mt-0.5 text-lg font-semibold tabular-nums tracking-tight">{value}</p>
          </div>
        ))}
      </div>
      <p className="mt-5 text-sm font-semibold">{t.client}</p>
      <div className="mt-2 flex flex-col gap-2">
        {sites.map(([host, ms, ssl, dom], i) => (
          <div key={host} className="rounded-xl border border-line bg-card p-3">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-2 text-sm font-semibold">
                <span className="pulse-dot h-2 w-2 rounded-full bg-up" />
                {host}
              </span>
              <span className="text-sm font-semibold tabular-nums">{i ? "100%" : "99.98%"}</span>
            </div>
            <div className="grow-bars mt-2 flex h-4 gap-[2px]">
              {mockBars(i + 4, 30).map((c, j) => (
                <span
                  key={j}
                  style={{ "--i": j } as React.CSSProperties}
                  className={`flex-1 rounded-[2px] ${i ? "bg-up" : c}`}
                />
              ))}
            </div>
            <p className="mt-2 text-[11px] text-mute">
              {t.up} · {t.response} {ms} · {t.ssl} {ssl} {t.days} · {t.domain} {dom} {t.days}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

export default async function Home() {
  const locale = await getLocale();
  const dict = getDict(locale);
  const t = dict.landing;

  return (
    <div className="flex min-h-screen flex-col bg-canvas">
      {/* Шапка */}
      <header className="sticky top-0 z-30 border-b border-line/60 bg-canvas/70 backdrop-blur-xl">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-3">
          <Link href="/" className="flex items-center gap-2 font-semibold tracking-tight">
            <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-ink text-sm text-canvas">
              W
            </span>
            {dict.common.appName}
          </Link>
          <nav className="hidden items-center gap-6 text-sm text-mute md:flex">
            <a href="#features" className="hover:text-ink">{t.nav.features}</a>
            <a href="#status" className="hover:text-ink">{t.nav.status}</a>
            <a href="#pricing" className="hover:text-ink">{t.nav.pricing}</a>
            <a href="#faq" className="hover:text-ink">{t.nav.faq}</a>
          </nav>
          <div className="flex items-center gap-2 sm:gap-3">
            <LanguageSwitcher locale={locale} />
            <Link href="/login" className="hidden rounded-full px-3 py-1.5 text-sm text-mute hover:text-ink sm:block">
              {dict.common.login}
            </Link>
            <Link
              href="/signup"
              className="rounded-full bg-ink px-4 py-1.5 text-sm font-medium text-canvas transition hover:opacity-85"
            >
              {dict.common.startFree}
            </Link>
          </div>
        </div>
      </header>

      <main>
        {/* Hero + бесплатная проверка */}
        <section className="relative overflow-hidden">
          <div className="pointer-events-none absolute inset-x-0 -top-40 mx-auto h-[28rem] max-w-4xl rounded-full bg-[radial-gradient(closest-side,var(--accent-soft),transparent)] opacity-90" />
          <div className="relative mx-auto max-w-4xl px-4 pb-20 pt-20 text-center sm:pt-28">
            <p className="rise text-sm font-semibold tracking-tight text-accent">{t.eyebrow}</p>
            <h1
              className="rise mt-4 whitespace-pre-line text-5xl font-semibold leading-[1.02] tracking-[-0.035em] sm:text-7xl md:text-8xl"
              style={{ animationDelay: "60ms" }}
            >
              {t.heroTitle}
            </h1>
            <p
              className="rise mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-mute sm:text-xl"
              style={{ animationDelay: "120ms" }}
            >
              {t.heroSubtitle}
            </p>
            <div className="rise mt-8 flex flex-wrap justify-center gap-3" style={{ animationDelay: "180ms" }}>
              <Link
                href="/signup"
                className="rounded-full bg-accent px-7 py-3.5 font-medium text-accent-ink shadow-[0_8px_24px_rgba(0,113,227,0.3)] transition hover:brightness-110 active:scale-[0.98]"
              >
                {t.ctaPrimary}
              </Link>
              <a href="#how" className="rounded-full px-7 py-3.5 font-medium text-accent hover:bg-accent-soft">
                {t.ctaSecondary} ›
              </a>
            </div>
            <p className="mt-4 text-sm text-faint">{t.freeNote}</p>

            {/* Бесплатная проверка любого сайта */}
            <div className="rise mt-16" style={{ animationDelay: "260ms" }}>
              <p className="text-xl font-semibold tracking-tight">{dict.checker.title}</p>
              <p className="mt-1 text-sm text-mute">{dict.checker.subtitle}</p>
              <div className="mt-5">
                <SiteChecker c={dict.checker} />
              </div>
            </div>
          </div>
        </section>

        {/* Живое демо: инцидент от падения до «снова работает» */}
        <section className="overflow-hidden pb-24 pt-8 sm:pb-32">
          <Reveal className="mx-auto max-w-3xl px-4 text-center">
            <Eyebrow>{t.demoEyebrow}</Eyebrow>
            <h2 className="mt-3 text-4xl font-semibold tracking-[-0.03em] sm:text-6xl">{t.demoTitle}</h2>
            <p className="mx-auto mt-5 max-w-2xl text-lg leading-relaxed text-mute">{t.demoSubtitle}</p>
          </Reveal>
          <Reveal className="mt-14 px-4" delay={120}>
            <LiveDemo d={t.demo} />
          </Reveal>
        </section>

        {/* Три причины звонка клиента */}
        <section id="features" className="bg-sunken py-24 sm:py-32">
          <div className="mx-auto max-w-6xl px-4">
            <Reveal>
              <h2 className="mx-auto max-w-3xl text-center text-4xl font-semibold tracking-[-0.03em] sm:text-6xl">
                {t.threeTitle}
              </h2>
              <p className="mx-auto mt-5 max-w-xl text-center text-lg text-mute">{t.threeSubtitle}</p>
            </Reveal>
            <div className="mt-16 grid gap-4 md:grid-cols-3">
              {t.three.map((item, i) => (
                <Reveal
                  key={item.title}
                  delay={i * 110}
                  className="rounded-3xl bg-card p-8 shadow-[0_1px_2px_rgba(0,0,0,0.04)] transition-shadow duration-500 hover:shadow-[0_20px_50px_rgba(0,0,0,0.08)]"
                >
                  <span className="text-4xl">{item.icon}</span>
                  <h3 className="mt-6 text-2xl font-semibold tracking-tight">{item.title}</h3>
                  <p className="mt-3 leading-relaxed text-mute">{item.text}</p>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        {/* Telegram — тёмная секция */}
        <section className="bg-black py-24 text-[#f5f5f7] sm:py-32">
          <div className="mx-auto grid max-w-6xl items-center gap-16 px-4 lg:grid-cols-2">
            <Reveal>
              <Eyebrow dark>{t.telegramEyebrow}</Eyebrow>
              <h2 className="mt-3 text-4xl font-semibold tracking-[-0.03em] sm:text-6xl">{t.telegramTitle}</h2>
              <p className="mt-6 max-w-lg text-lg leading-relaxed text-[#a1a1a6]">{t.telegramSubtitle}</p>
              <ul className="mt-8 flex flex-col gap-3 text-[#f5f5f7]">
                {t.telegramPoints.map((p) => (
                  <Check key={p} dark>
                    {p}
                  </Check>
                ))}
              </ul>
            </Reveal>
            <Reveal delay={150}>
              <ChatMock t={t.chat} />
            </Reveal>
          </div>
        </section>

        {/* Статус-страницы */}
        <section id="status" className="py-24 sm:py-32">
          <div className="mx-auto grid max-w-6xl items-center gap-16 px-4 lg:grid-cols-2">
            <Reveal className="lg:order-2">
              <Eyebrow>{t.statusEyebrow}</Eyebrow>
              <h2 className="mt-3 text-4xl font-semibold tracking-[-0.03em] sm:text-6xl">{t.statusTitle}</h2>
              <p className="mt-6 max-w-lg text-lg leading-relaxed text-mute">{t.statusSubtitle}</p>
              <ul className="mt-8 flex flex-col gap-3">
                {t.statusPoints.map((p) => (
                  <Check key={p}>{p}</Check>
                ))}
              </ul>
            </Reveal>
            <Reveal className="lg:order-1" delay={120}>
              <StatusMock t={t.statusMock} />
            </Reveal>
          </div>
        </section>

        {/* Пульт */}
        <section className="bg-sunken py-24 sm:py-32">
          <div className="mx-auto max-w-5xl px-4">
            <Reveal className="text-center">
              <Eyebrow>{t.cockpitEyebrow}</Eyebrow>
              <h2 className="mt-3 text-4xl font-semibold tracking-[-0.03em] sm:text-6xl">{t.cockpitTitle}</h2>
              <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-mute">{t.cockpitSubtitle}</p>
            </Reveal>
            <Reveal className="mx-auto mt-14 max-w-3xl" delay={120}>
              <CockpitMock t={t.cockpitMock} />
            </Reveal>
          </div>
        </section>

        {/* Как это работает */}
        <section id="how" className="py-24 sm:py-32">
          <div className="mx-auto max-w-6xl px-4">
            <h2 className="text-center text-4xl font-semibold tracking-[-0.03em] sm:text-6xl">{t.stepsTitle}</h2>
            <div className="mt-16 grid gap-10 md:grid-cols-3">
              {t.steps.map((s, i) => (
                <Reveal key={s.n} delay={i * 120}>
                  <span className="flex h-11 w-11 items-center justify-center rounded-full bg-ink text-lg font-semibold text-canvas">
                    {s.n}
                  </span>
                  <h3 className="mt-5 text-xl font-semibold tracking-tight">{s.title}</h3>
                  <p className="mt-2 leading-relaxed text-mute">{s.text}</p>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        {/* И ещё */}
        <section className="border-t border-line py-24">
          <div className="mx-auto max-w-6xl px-4">
            <h2 className="text-3xl font-semibold tracking-[-0.03em] sm:text-4xl">{t.moreTitle}</h2>
            <div className="mt-10 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
              {t.more.map((m) => (
                <div key={m.title}>
                  <span className="text-3xl">{m.icon}</span>
                  <h3 className="mt-4 font-semibold tracking-tight">{m.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-mute">{m.text}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Цена */}
        <section id="pricing" className="bg-sunken py-24 sm:py-32">
          <div className="mx-auto max-w-6xl px-4 text-center">
            <h2 className="text-4xl font-semibold tracking-[-0.03em] sm:text-6xl">{t.pricingTitle}</h2>
            <p className="mx-auto mt-5 max-w-xl text-lg text-mute">{t.pricingSubtitle}</p>
            <Reveal className="mx-auto mt-14 max-w-md rounded-3xl bg-card p-8 text-left shadow-[0_20px_60px_rgba(0,0,0,0.08)] sm:p-10">
              <p className="text-sm font-semibold text-accent">{t.planName}</p>
              <p className="mt-2 flex items-baseline gap-1">
                <span className="text-6xl font-semibold tracking-tight">{t.planPrice}</span>
                <span className="text-mute">{t.planPer}</span>
              </p>
              <ul className="mt-8 flex flex-col gap-3 text-[15px]">
                {t.planFeatures.map((f) => (
                  <Check key={f}>{f}</Check>
                ))}
              </ul>
              <Link
                href="/signup"
                className="mt-10 block rounded-full bg-accent px-6 py-3.5 text-center font-medium text-accent-ink transition hover:brightness-110"
              >
                {t.planCta}
              </Link>
            </Reveal>
          </div>
        </section>

        {/* FAQ */}
        <section id="faq" className="py-24 sm:py-32">
          <div className="mx-auto max-w-3xl px-4">
            <h2 className="text-4xl font-semibold tracking-[-0.03em] sm:text-5xl">{t.faqTitle}</h2>
            <div className="mt-10 divide-y divide-line border-y border-line">
              {t.faq.map((item) => (
                <details key={item.q} className="group py-5">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-lg font-medium marker:content-none">
                    {item.q}
                    <span className="text-2xl font-light text-faint transition group-open:rotate-45">+</span>
                  </summary>
                  <p className="mt-3 leading-relaxed text-mute">{item.a}</p>
                </details>
              ))}
            </div>
          </div>
        </section>

        {/* Финальный призыв */}
        <section className="px-4 pb-24">
          <Reveal className="mx-auto max-w-6xl rounded-[2.5rem] bg-ink px-6 py-20 text-center text-canvas sm:py-28">
            <h2 className="mx-auto max-w-3xl whitespace-pre-line text-4xl font-semibold tracking-[-0.03em] sm:text-6xl">
              {t.finalTitle}
            </h2>
            <Link
              href="/signup"
              className="mt-10 inline-block rounded-full bg-accent px-8 py-4 font-medium text-white transition hover:brightness-110"
            >
              {t.finalCta}
            </Link>
          </Reveal>
        </section>
      </main>

      <footer className="mt-auto border-t border-line py-8">
        <div className="mx-auto flex w-full max-w-6xl flex-col items-center justify-between gap-2 px-4 text-sm text-faint sm:flex-row">
          <span>
            © {new Date().getFullYear()} {dict.common.appName}
          </span>
          <div className="flex items-center gap-4">
            <a href={GITHUB_URL} target="_blank" rel="noopener noreferrer" className="hover:text-ink">
              GitHub
            </a>
            <span>{t.footerTagline}</span>
          </div>
        </div>
      </footer>
    </div>
  );
}

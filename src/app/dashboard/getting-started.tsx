import { toggleClientShare } from "@/app/actions/clients";
import type { Dict } from "@/lib/i18n";
import TelegramLink from "./telegram-link";

/**
 * «Первые шаги» для тех, кто не хочет разбираться: три действия, после
 * которых продукт приносит пользу. Галочки ставятся сами — по данным, а не
 * по кликам; когда всё сделано, карточка исчезает.
 */
export default function GettingStarted({
  g,
  telegram,
  hasSite,
  hasTelegram,
  hasStatusPage,
  firstClient,
}: {
  g: Dict["guide"];
  telegram: Dict["telegram"];
  hasSite: boolean;
  hasTelegram: boolean;
  hasStatusPage: boolean;
  firstClient: { id: string; name: string } | null;
}) {
  const done = [hasSite, hasTelegram, hasStatusPage];
  const count = done.filter(Boolean).length;
  if (count === 3) return null;
  const current = done.indexOf(false);
  const R = 18;
  const C = 2 * Math.PI * R;

  return (
    <section className="rounded-3xl border border-line bg-card p-5 sm:p-7">
      <div className="flex items-center gap-4">
        <svg width="48" height="48" viewBox="0 0 48 48" className="shrink-0 -rotate-90" aria-hidden>
          <circle cx="24" cy="24" r={R} fill="none" stroke="var(--sunken)" strokeWidth="5" />
          <circle
            cx="24"
            cy="24"
            r={R}
            fill="none"
            stroke="var(--up)"
            strokeWidth="5"
            strokeLinecap="round"
            strokeDasharray={C}
            strokeDashoffset={C * (1 - count / 3)}
            style={{ transition: "stroke-dashoffset 0.8s cubic-bezier(0.2,0.8,0.2,1)" }}
          />
        </svg>
        <div>
          <h2 className="text-xl font-semibold tracking-tight">{g.title}</h2>
          <p className="text-sm text-mute">
            {count} / 3 · {g.subtitle}
          </p>
        </div>
      </div>

      <ol className="mt-5 flex flex-col gap-2">
        {g.steps.map((step, i) => {
          const isDone = done[i];
          const isCurrent = i === current;
          return (
            <li
              key={step.title}
              className={`rounded-2xl border p-4 transition-colors ${
                isCurrent ? "border-accent/40 bg-accent-soft" : "border-line"
              }`}
            >
              <div className="flex items-start gap-3">
                <span
                  className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${
                    isDone ? "bg-up text-white" : isCurrent ? "bg-accent text-accent-ink" : "bg-sunken text-mute"
                  }`}
                >
                  {isDone ? "✓" : i + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <p className={`font-medium ${isDone ? "text-mute line-through decoration-faint" : ""}`}>
                    {step.title}
                  </p>
                  {!isDone && <p className="mt-0.5 text-sm text-mute">{step.text}</p>}

                  {isCurrent && i === 0 && (
                    <a href="#add-site" className="mt-3 inline-block rounded-full bg-accent px-4 py-1.5 text-sm font-medium text-accent-ink">
                      {g.cta0}
                    </a>
                  )}
                  {isCurrent && i === 1 && (
                    <div className="mt-1">
                      <TelegramLink linked={false} dict={telegram} />
                    </div>
                  )}
                  {isCurrent && i === 2 &&
                    (firstClient ? (
                      <form action={toggleClientShare} className="mt-3">
                        <input type="hidden" name="id" value={firstClient.id} />
                        <button type="submit" className="rounded-full bg-accent px-4 py-1.5 text-sm font-medium text-accent-ink">
                          {g.cta2} «{firstClient.name}»
                        </button>
                      </form>
                    ) : (
                      <p className="mt-2 text-sm text-mute">💡 {g.noClientHint}</p>
                    ))}
                </div>
              </div>
            </li>
          );
        })}
      </ol>
    </section>
  );
}

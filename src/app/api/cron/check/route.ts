import { runDueChecks } from "@/lib/runner";
import { sendDueDigests } from "@/lib/digest";

// Serverless-движок проверок. Дёргается внешним cron раз в минуту
// (cron-job.org / GitHub Actions) и Vercel Cron как страховка.
export const dynamic = "force-dynamic";
export const maxDuration = 60;

/** Доступ только с секретом: Vercel Cron шлёт `Authorization: Bearer <CRON_SECRET>`. */
function authorized(req: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const header = req.headers.get("authorization");
  const key = new URL(req.url).searchParams.get("key");
  return header === `Bearer ${secret}` || key === secret;
}

export async function GET(req: Request) {
  if (!authorized(req)) return new Response("Unauthorized", { status: 401 });
  const stats = await runDueChecks({ deadlineMs: 45_000 });
  const digests = await sendDueDigests();
  return Response.json({ ...stats, digests });
}

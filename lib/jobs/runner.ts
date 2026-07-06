import { NextResponse } from "next/server";

export async function runJob<T>(
  name: string,
  request: Request,
  job: () => Promise<T>,
): Promise<NextResponse> {
  const secret = process.env.CRON_SECRET;
  const bearer = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (secret && bearer !== secret) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }
  try {
    return NextResponse.json({ ok: true, job: name, result: await job() });
  } catch (error) {
    return NextResponse.json({ ok: false, job: name, error: String(error) }, { status: 500 });
  }
}

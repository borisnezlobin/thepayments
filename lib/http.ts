import { NextResponse } from "next/server";
import type { ZodType } from "zod";

export class HttpError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

export function jsonError(status: number, error: string) {
  return NextResponse.json({ error }, { status });
}

export async function readJson<T>(request: Request, schema: ZodType<T>): Promise<T> {
  const body = await request.json().catch(() => {
    throw new HttpError(400, "The request body isn't valid JSON.");
  });
  const parsed = schema.safeParse(body);
  if (!parsed.success) throw new HttpError(400, parsed.error.issues.map((issue) => issue.message).join(" "));
  return parsed.data;
}

export async function handle(run: () => Promise<Response>) {
  try {
    return await run();
  } catch (error) {
    if (error instanceof HttpError) return jsonError(error.status, error.message);
    console.error(error);
    return jsonError(500, "Something went wrong on our side. Try again in a moment.");
  }
}

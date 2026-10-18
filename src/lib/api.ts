import "server-only";
import { NextResponse } from "next/server";
import type { z } from "zod";
import { GROUP_ID_RE } from "./ids";

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

const MAX_BODY_BYTES = 32 * 1024;

export async function readJson<T extends z.ZodType>(req: Request, schema: T): Promise<z.output<T>> {
  const len = Number(req.headers.get("content-length") ?? "0");
  if (len > MAX_BODY_BYTES) throw new ApiError(413, "Request too large");
  const raw = await req.text();
  if (raw.length > MAX_BODY_BYTES) throw new ApiError(413, "Request too large");
  let body: unknown;
  try {
    body = JSON.parse(raw);
  } catch {
    throw new ApiError(400, "Invalid JSON");
  }
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    throw new ApiError(422, issue ? issue.message : "Invalid input");
  }
  return parsed.data;
}

export function assertGroupId(id: string) {
  if (!GROUP_ID_RE.test(id)) throw new ApiError(404, "Group not found");
}

export function json(data: unknown, status = 200) {
  return NextResponse.json(data, { status, headers: { "Cache-Control": "no-store" } });
}

type Handler<C> = (req: Request, ctx: C) => Promise<Response>;

/** Wraps a route handler with uniform JSON error handling. */
export function route<C>(fn: Handler<C>): Handler<C> {
  return async (req, ctx) => {
    try {
      return await fn(req, ctx);
    } catch (err) {
      if (err instanceof ApiError) return json({ error: err.message }, err.status);
      console.error(err);
      return json({ error: "Something went wrong. Please try again." }, 500);
    }
  };
}

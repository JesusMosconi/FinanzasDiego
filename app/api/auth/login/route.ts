import { compare } from "bcryptjs";
import { NextResponse } from "next/server";

import {
  createSessionToken,
  SESSION_COOKIE_NAME,
  SESSION_DURATION_SECONDS,
} from "@/lib/auth";

export async function POST(request: Request) {
  const pinHash = process.env.PIN_HASH;

  if (!pinHash || !process.env.JWT_SECRET) {
    return NextResponse.json(
      { error: "La autenticacion no esta configurada." },
      { status: 500 },
    );
  }

  let pin: unknown;

  try {
    ({ pin } = (await request.json()) as { pin?: unknown });
  } catch {
    return NextResponse.json({ error: "Solicitud invalida." }, { status: 400 });
  }

  if (typeof pin !== "string" || !/^\d+$/.test(pin)) {
    return NextResponse.json({ error: "PIN invalido." }, { status: 400 });
  }

  const isValid = await compare(pin, pinHash);

  if (!isValid) {
    return NextResponse.json({ error: "PIN incorrecto." }, { status: 401 });
  }

  const token = await createSessionToken();
  const response = NextResponse.json({ ok: true });

  response.cookies.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: SESSION_DURATION_SECONDS,
    path: "/",
  });

  return response;
}

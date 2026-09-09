import { jwtVerify, SignJWT } from "jose";

export const SESSION_COOKIE_NAME = "finanzas-taller-session";
export const SESSION_DURATION_SECONDS = 60 * 60 * 24 * 30;

function getJwtSecret() {
  const secret = process.env.JWT_SECRET;

  if (!secret) {
    throw new Error("JWT_SECRET no esta configurado");
  }

  return new TextEncoder().encode(secret);
}

export async function createSessionToken() {
  return new SignJWT({})
    .setProtectedHeader({ alg: "HS256" })
    .setSubject("owner")
    .setIssuedAt()
    .setExpirationTime(`${SESSION_DURATION_SECONDS}s`)
    .sign(getJwtSecret());
}

export async function verifySessionToken(token: string) {
  try {
    const { payload } = await jwtVerify(token, getJwtSecret(), {
      algorithms: ["HS256"],
    });

    return payload.sub === "owner";
  } catch {
    return false;
  }
}

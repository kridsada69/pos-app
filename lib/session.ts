import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";

const secretKey = process.env.SESSION_SECRET;

if (!secretKey) {
  throw new Error("SESSION_SECRET is not set");
}

const key = new TextEncoder().encode(secretKey);

export async function encrypt(payload: any) {
  return await new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("24h")
    .sign(key);
}

export async function decrypt(input: string): Promise<any> {
  try {
    const { payload } = await jwtVerify(input, key, {
      algorithms: ["HS256"],
    });
    return payload;
  } catch (err) {
    return null;
  }
}

export async function getSession() {
  const cookieStore = await cookies();
  const session = cookieStore.get("pos_session")?.value;
  if (!session) return null;
  return await decrypt(session);
}

export async function setSession(userId: number, name: string, username: string, role: string) {
  const expires = new Date(Date.now() + 24 * 60 * 60 * 1000);
  const session = await encrypt({ userId, name, username, role, expires });

  const cookieStore = await cookies();
  cookieStore.set("pos_session", session, { expires, httpOnly: true, sameSite: 'lax', path: '/' });
}

export async function clearSession() {
  const cookieStore = await cookies();
  cookieStore.set("pos_session", "", { expires: new Date(0), httpOnly: true, sameSite: 'lax', path: '/' });
}

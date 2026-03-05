import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'ritual-pm-dev-secret-change-in-production'
);
const COOKIE_NAME = 'ritual_session';
const TOKEN_EXPIRY = '7d';

/**
 * Create a signed JWT for the given user.
 */
export async function createSessionToken(user) {
  return new SignJWT({
    sub: user.id,
    username: user.username,
    role: user.role,
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(TOKEN_EXPIRY)
    .sign(JWT_SECRET);
}

/**
 * Verify and decode a JWT. Returns the payload or null.
 */
export async function verifySessionToken(token) {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    return payload;
  } catch {
    return null;
  }
}

/**
 * Set the session cookie on the response via Next.js cookies() API.
 */
export async function setSessionCookie(token) {
  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 7 * 24 * 60 * 60, // 7 days
  });
}

/**
 * Clear the session cookie.
 */
export async function clearSessionCookie() {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
}

/**
 * Read and verify the current session from cookies.
 * Returns { userId, username, role } or null if no valid session.
 */
export async function getSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return null;

  const payload = await verifySessionToken(token);
  if (!payload) return null;

  return {
    userId: payload.sub,
    username: payload.username,
    role: payload.role,
  };
}

/**
 * Require a valid session. Returns session or throws a Response.
 * Use in API routes: const session = await requireSession();
 */
export async function requireSession() {
  const session = await getSession();
  if (!session) {
    throw new Response(JSON.stringify({ error: 'Authentication required' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }
  return session;
}

/**
 * Require admin role. Returns session or throws a Response.
 */
export async function requireAdmin() {
  const session = await requireSession();
  if (session.role !== 'admin') {
    throw new Response(JSON.stringify({ error: 'Admin access required' }), {
      status: 403,
      headers: { 'Content-Type': 'application/json' },
    });
  }
  return session;
}

import { NextResponse } from 'next/server';

export function middleware(request) {
  const response = NextResponse.next();

  // Security headers
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-XSS-Protection', '1; mode=block');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  response.headers.set(
    'Content-Security-Policy',
    "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self'; connect-src 'self' https://*.supabase.co; frame-ancestors 'none';"
  );
  response.headers.set(
    'Strict-Transport-Security',
    'max-age=63072000; includeSubDomains; preload'
  );

  // --- Lightweight in-memory rate limiting for API routes ---
  if (request.nextUrl.pathname.startsWith('/api/')) {
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
      || request.headers.get('x-real-ip')
      || 'unknown';

    const now = Date.now();
    const windowMs = 60_000; // 1 minute
    const maxRequests = 100;  // per window

    const entry = rateLimitMap.get(ip);
    if (!entry || now - entry.start > windowMs) {
      rateLimitMap.set(ip, { start: now, count: 1 });
    } else {
      entry.count++;
      if (entry.count > maxRequests) {
        return NextResponse.json(
          { error: 'Too many requests. Please try again later.' },
          { status: 429, headers: { 'Retry-After': '60' } }
        );
      }
    }

    // Prune stale entries periodically (every ~500 requests)
    if (Math.random() < 0.002) {
      for (const [key, val] of rateLimitMap) {
        if (now - val.start > windowMs * 2) rateLimitMap.delete(key);
      }
    }
  }

  return response;
}

// Simple in-memory store — resets on cold start, which is acceptable for edge/serverless
const rateLimitMap = new Map();

export const config = {
  matcher: [
    // Match all routes except static files and _next internals
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};

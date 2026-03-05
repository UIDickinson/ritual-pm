import { NextResponse } from 'next/server';

export function requireAiServiceAuth(request) {
  const configuredToken = process.env.AI_SERVICE_TOKEN;

  if (!configuredToken) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: 'AI service token is not configured' },
        { status: 500 }
      )
    };
  }

  const authHeader = request.headers.get('authorization') || '';
  const [scheme, token] = authHeader.split(' ');

  if (scheme !== 'Bearer' || !token || token !== configuredToken) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: 'Unauthorized AI service request' },
        { status: 401 }
      )
    };
  }

  return { ok: true };
}

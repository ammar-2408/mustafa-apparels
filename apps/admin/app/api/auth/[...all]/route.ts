// Better Auth for the admin: sign-in, sign-out, session and 2FA. Sign-up is off.
import { getAuth } from '../../../../lib/auth';

const unavailable = () =>
  Response.json(
    { error: { code: 'UNAVAILABLE', message: "Sign-in isn't available here yet." } },
    { status: 503 },
  );

export async function GET(request: Request) {
  const auth = getAuth();
  return auth ? auth.handler(request) : unavailable();
}

export const POST = GET;

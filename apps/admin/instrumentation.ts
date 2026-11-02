// Runs once when each server starts, including Netlify functions, which never run check-env.
// A bad environment stops the server here instead of failing later on a request.
export async function register() {
  if (process.env.NEXT_RUNTIME !== 'nodejs') return;
  const { getEnv } = await import('@mustafa/config/env');
  getEnv('admin');
}

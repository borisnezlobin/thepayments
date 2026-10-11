export function supabaseUrl() {
  return process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
}
export function authConfigured() {
  return Boolean(
    supabaseUrl() &&
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY &&
    process.env.SUPABASE_SECRET_KEY,
  );
}
export function agentLinksConfigured() {
  return authConfigured();
}
export function appOrigin() {
  return new URL(
    process.env.APP_ORIGIN ||
      process.env.NEXT_PUBLIC_SITE_URL ||
      "http://localhost:3000",
  ).origin;
}

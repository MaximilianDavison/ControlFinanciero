import { createNeonAuth } from "@neon/auth/next/server";
export const auth = createNeonAuth({
  baseUrl: process.env.NEON_AUTH_BASE_URL,
  cookies: { secret: process.env.NEON_AUTH_COOKIE_SECRET },
});
export async function currentUser() {
  const { data, error } = await auth.getSession();
  if (error || !data?.user || !data.user.emailVerified) return null;
  const allowed = (process.env.ALLOWED_EMAILS || "")
    .split(",")
    .map((x) => x.trim().toLowerCase())
    .filter(Boolean);
  // La aplicación queda cerrada hasta configurar el correo del propietario.
  if (!allowed.includes(data.user.email?.toLowerCase())) return null;
  return data.user;
}

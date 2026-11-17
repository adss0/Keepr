/**
 * Reads the sign-in tokens Supabase adds to a password reset link's URL fragment
 * (#access_token=…&refresh_token=…&type=recovery), or the error it adds if the link has expired.
 */
export function recoveryParams(url: string): { accessToken?: string; refreshToken?: string; error?: string } {
  const fragment = url.split("#")[1] ?? "";
  const params = new URLSearchParams(fragment);
  const error = params.get("error_description") ?? undefined;
  if (error) return { error };
  if (params.get("type") !== "recovery") return {};
  return {
    accessToken: params.get("access_token") ?? undefined,
    refreshToken: params.get("refresh_token") ?? undefined,
  };
}

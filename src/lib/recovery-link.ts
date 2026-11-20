/** The sign-in tokens in a link from Supabase, or the error it carries instead. */
export type LinkParams = { accessToken?: string; refreshToken?: string; error?: string };

/**
 * Reads the sign-in tokens Supabase adds to a password reset link's URL fragment
 * (#access_token=…&refresh_token=…&type=recovery), or the error it adds if the link has expired.
 */
export function recoveryParams(url: string): LinkParams {
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

/**
 * Reads the sign-in tokens Supabase adds to the address it sends people back to after signing in with Google
 * (#access_token=…&refresh_token=…), or the error it adds there or in the query string (for example if they cancel).
 */
export function signInRedirectParams(url: string): LinkParams {
  const [beforeFragment, fragment = ""] = url.split("#");
  const params = new URLSearchParams(fragment);
  const query = new URLSearchParams(beforeFragment.split("?")[1] ?? "");
  const error = params.get("error_description") ?? query.get("error_description") ?? undefined;
  if (error) return { error };
  const accessToken = params.get("access_token") ?? undefined;
  const refreshToken = params.get("refresh_token") ?? undefined;
  return accessToken && refreshToken ? { accessToken, refreshToken } : {};
}

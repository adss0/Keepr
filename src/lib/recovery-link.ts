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

/** A sign-in link this device asked for: a Google sign-in on the web, or a password reset email. */
export type ExpectedLink = { kind: "google" | "recovery"; at: number };

/** How long after asking a link is still accepted. Supabase's reset links last an hour. */
const EXPECTED_FOR_MS = { google: 30 * 60 * 1000, recovery: 2 * 60 * 60 * 1000 };

/**
 * Whether a link of `kind` is one this device asked for. Sign-in links carry their account's tokens, so without
 * this check someone could send a link that signs this phone into their account, and its receipts would back up there.
 */
export function wasExpected(stored: string | null, kind: ExpectedLink["kind"], now: number): boolean {
  try {
    const expected = JSON.parse(stored ?? "null") as ExpectedLink | null;
    return expected?.kind === kind && now >= expected.at && now - expected.at <= EXPECTED_FOR_MS[kind];
  } catch {
    return false;
  }
}

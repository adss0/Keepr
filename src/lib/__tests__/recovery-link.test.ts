import { describe, expect, it } from "@jest/globals";

import { recoveryParams, signInRedirectParams } from "@/lib/recovery-link";

describe("recoveryParams", () => {
  it("reads the tokens from a password reset link", () => {
    expect(
      recoveryParams(
        "exp://192.168.0.18:8081/--/reset-password#access_token=abc&expires_in=3600&refresh_token=def&token_type=bearer&type=recovery",
      ),
    ).toEqual({ accessToken: "abc", refreshToken: "def" });
  });

  it("works for the web address too", () => {
    expect(recoveryParams("http://localhost:8081/reset-password#access_token=a&refresh_token=b&type=recovery")).toEqual({
      accessToken: "a",
      refreshToken: "b",
    });
  });

  it("returns the error when the link has expired", () => {
    expect(
      recoveryParams(
        "http://localhost:8081/reset-password#error=access_denied&error_code=otp_expired&error_description=Email+link+is+invalid+or+has+expired",
      ),
    ).toEqual({ error: "Email link is invalid or has expired" });
  });

  it("ignores other links", () => {
    expect(recoveryParams("http://localhost:8081/reset-password")).toEqual({});
    expect(recoveryParams("http://localhost:8081/#access_token=a&refresh_token=b&type=signup")).toEqual({});
  });
});

describe("signInRedirectParams", () => {
  it("reads the tokens after signing in with Google, in the app and on the web", () => {
    expect(
      signInRedirectParams("keepr://account#access_token=abc&expires_in=3600&provider_token=x&refresh_token=def&token_type=bearer"),
    ).toEqual({ accessToken: "abc", refreshToken: "def" });
    expect(signInRedirectParams("http://localhost:8081/account#access_token=a&refresh_token=b")).toEqual({
      accessToken: "a",
      refreshToken: "b",
    });
  });

  it("returns the error Supabase adds, from the fragment or the query", () => {
    expect(signInRedirectParams("keepr://account?error=access_denied&error_description=User+cancelled")).toEqual({
      error: "User cancelled",
    });
    expect(signInRedirectParams("keepr://account#error=server_error&error_description=Bad+state")).toEqual({
      error: "Bad state",
    });
  });

  it("ignores links without tokens", () => {
    expect(signInRedirectParams("keepr://account")).toEqual({});
    expect(signInRedirectParams("keepr://account#access_token=only")).toEqual({});
  });
});

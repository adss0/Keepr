import { describe, expect, it } from "@jest/globals";

import { formatInviteCode, nameFromEmail } from "@/lib/spaces";

describe("nameFromEmail", () => {
  it("turns an email into a readable default name", () => {
    expect(nameFromEmail("sam.jones@example.com")).toBe("Sam Jones");
    expect(nameFromEmail("alex_b-k@example.com")).toBe("Alex B K");
    expect(nameFromEmail(undefined)).toBe("Me");
  });
});

describe("formatInviteCode", () => {
  it("splits an 8-character code in two", () => {
    expect(formatInviteCode("K7MP2QXA")).toBe("K7MP-2QXA");
    expect(formatInviteCode("ABC")).toBe("ABC");
  });
});

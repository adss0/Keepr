import { describe, expect, it } from "@jest/globals";

import { canChangeItem, formatInviteCode, nameFromEmail } from "@/lib/spaces";

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

describe("canChangeItem", () => {
  const shared = { spaceId: "s1", ownerId: "sam" };
  const member = { myRole: "member" as const, membersCanEdit: false };

  it("lets you change your own items, and ones not synced yet", () => {
    expect(canChangeItem({}, "me", undefined)).toBe(true);
    expect(canChangeItem({ spaceId: "s1", ownerId: "me" }, "me", member)).toBe(true);
    expect(canChangeItem({ spaceId: "s1" }, "me", member)).toBe(true);
  });

  it("only lets owners and admins change someone else's, unless the space allows everyone", () => {
    expect(canChangeItem(shared, "me", member)).toBe(false);
    expect(canChangeItem(shared, "me", { ...member, myRole: "admin" })).toBe(true);
    expect(canChangeItem(shared, "me", { ...member, myRole: "owner" })).toBe(true);
    expect(canChangeItem(shared, "me", { ...member, membersCanEdit: true })).toBe(true);
  });
});

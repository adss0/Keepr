import { describe, expect, it } from "@jest/globals";

import { type Activity, activityDetail, activityText, timeAgo, wantsAlert } from "@/lib/space-activity";

const base: Activity = {
  id: 1,
  spaceId: "s1",
  actorId: "sam",
  actorName: "Sam",
  kind: "receipt_added",
  itemId: "r1",
  title: "Kettle",
  detail: "Argos · £24.99",
  createdAt: "2026-11-19T10:00:00Z",
};

describe("activityText", () => {
  it("says who did what, with You for the signed-in user", () => {
    expect(activityText(base, "me")).toBe("Sam added Kettle");
    expect(activityText(base, "sam")).toBe("You added Kettle");
    expect(activityText(base, "me", "Samantha")).toBe("Samantha added Kettle");
    expect(activityText({ ...base, actorName: "", actorId: undefined }, "me")).toBe("Someone added Kettle");
  });

  it("describes members and roles", () => {
    expect(activityText({ ...base, kind: "member_joined" }, "me")).toBe("Sam joined");
    expect(activityText({ ...base, kind: "member_left", title: "Alex", actorId: "alex" }, "me")).toBe("Alex left");
    expect(activityText({ ...base, kind: "member_removed", title: "Alex" }, "me")).toBe("Sam removed Alex");
    expect(activityText({ ...base, kind: "role_changed", title: "Alex", detail: "admin" }, "me")).toBe("Sam made Alex an admin");
    expect(activityText({ ...base, kind: "owner_changed", title: "Alex" }, "me")).toBe("Alex is now the owner");
  });

  it("describes finished receipts", () => {
    expect(activityText({ ...base, kind: "receipt_closed", detail: "returned" }, "me")).toBe("Sam returned Kettle");
    expect(activityText({ ...base, kind: "receipt_closed", detail: "claimed" }, "me")).toBe(
      "Sam claimed on the warranty for Kettle",
    );
  });

  it("shows the shop and price only for additions", () => {
    expect(activityDetail(base)).toBe("Argos · £24.99");
    expect(activityDetail({ ...base, kind: "receipt_removed" })).toBeUndefined();
  });
});

describe("timeAgo", () => {
  const now = new Date("2026-11-19T12:00:00Z");
  it("is short and readable", () => {
    expect(timeAgo("2026-11-19T11:59:40Z", now)).toBe("Just now");
    expect(timeAgo("2026-11-19T11:55:00Z", now)).toBe("5 min ago");
    expect(timeAgo("2026-11-19T09:00:00Z", now)).toBe("3 h ago");
    expect(timeAgo("2026-11-18T10:00:00Z", now)).toBe("Yesterday");
    expect(timeAgo("2026-11-15T12:00:00Z", now)).toBe("4 days ago");
  });
});

describe("wantsAlert", () => {
  it("follows each member's choices", () => {
    const all = { notifyReceipts: true, notifyMembers: true };
    expect(wantsAlert("receipt_added", all)).toBe(true);
    expect(wantsAlert("member_joined", { ...all, notifyMembers: false })).toBe(false);
    expect(wantsAlert("receipt_added", { ...all, notifyReceipts: false })).toBe(false);
    expect(wantsAlert("receipt_closed", all)).toBe(false);
  });
});

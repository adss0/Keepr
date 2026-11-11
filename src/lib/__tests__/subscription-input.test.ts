import { describe, expect, it } from "@jest/globals";

import {
  emptySubscriptionInput,
  subscriptionToInput,
  validateSubscriptionInput,
} from "@/lib/subscription-input";

describe("validateSubscriptionInput", () => {
  const valid = { ...emptySubscriptionInput("2026-11-11"), name: " Netflix ", price: "10.99" };

  it("returns the parsed subscription", () => {
    expect(validateSubscriptionInput(valid)).toEqual({
      value: { name: "Netflix", pricePence: 1099, cycle: "monthly", nextRenewal: "2026-11-11" },
    });
  });

  it("keeps a trial end date when given", () => {
    expect(validateSubscriptionInput({ ...valid, trialEnds: "2026-11-18" }).value?.trialEnds).toBe("2026-11-18");
  });

  it("reports missing and invalid fields", () => {
    const result = validateSubscriptionInput({
      ...emptySubscriptionInput("2026-11-11"),
      nextRenewal: "next week",
      trialEnds: "2026-13-01",
    });
    expect(Object.keys(result.errors ?? {}).sort()).toEqual(["name", "nextRenewal", "price", "trialEnds"]);
  });

  it("round-trips through the form", () => {
    const subscription = { id: "1", name: "Gym", pricePence: 3500, cycle: "monthly" as const, nextRenewal: "2026-12-01" };
    const { id, ...fields } = subscription;
    expect(id).toBe("1");
    expect(validateSubscriptionInput(subscriptionToInput(subscription)).value).toEqual(fields);
  });
});

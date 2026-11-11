import { describe, expect, it } from "@jest/globals";

import { assessRights, draftClaimLetter } from "@/lib/rights";
import type { Receipt } from "@/types/receipt";

function receipt(overrides: Partial<Receipt> = {}): Receipt {
  return {
    id: "r1",
    retailer: "Currys",
    product: "Sony headphones",
    pricePence: 7999,
    purchaseDate: "2026-01-10",
    channel: "in_store",
    paymentMethod: "debit_card",
    ...overrides,
  };
}

describe("assessRights for faulty goods", () => {
  it("gives a full refund up to and including day 30", () => {
    expect(assessRights(receipt(), "faulty", "2026-02-09").stage).toBe("short_term_reject");
  });

  it("moves to repair or replace on day 31, with the fault presumed", () => {
    expect(assessRights(receipt(), "faulty", "2026-02-10").stage).toBe("repair_or_replace_presumed");
    expect(assessRights(receipt(), "faulty", "2026-07-10").stage).toBe("repair_or_replace_presumed");
  });

  it("asks the buyer to show the fault after 6 months", () => {
    expect(assessRights(receipt(), "faulty", "2026-07-11").stage).toBe("repair_or_replace_prove");
  });

  it("is out of time after 6 years", () => {
    expect(assessRights(receipt(), "faulty", "2032-01-10").stage).toBe("repair_or_replace_prove");
    expect(assessRights(receipt(), "faulty", "2032-01-11").stage).toBe("out_of_time");
  });

  it("treats 'not as described' like faulty", () => {
    expect(assessRights(receipt(), "not_as_described", "2026-01-20").stage).toBe("short_term_reject");
  });
});

describe("extra protection", () => {
  it("offers Section 75 for credit card items over £100", () => {
    const result = assessRights(
      receipt({ paymentMethod: "credit_card", pricePence: 100_01 }),
      "faulty",
      "2026-01-20",
    );
    expect(result.extraProtection.join(" ")).toContain("Section 75");
  });

  it("offers chargeback instead for credit card items of £100 or less", () => {
    const result = assessRights(
      receipt({ paymentMethod: "credit_card", pricePence: 100_00 }),
      "faulty",
      "2026-01-20",
    );
    expect(result.extraProtection.join(" ")).toContain("Chargeback");
    expect(result.extraProtection.join(" ")).not.toContain("Section 75");
  });

  it("offers nothing extra for cash", () => {
    expect(assessRights(receipt({ paymentMethod: "cash" }), "faulty", "2026-01-20").extraProtection).toEqual([]);
  });

  it("mentions a warranty that is still running", () => {
    const result = assessRights(receipt({ warrantyMonths: 24, paymentMethod: "cash" }), "faulty", "2027-03-01");
    expect(result.extraProtection.join(" ")).toContain("Manufacturer warranty");
  });
});

describe("assessRights for a change of mind", () => {
  it("allows cancelling online orders within 14 days", () => {
    const online = receipt({ channel: "online" });
    expect(assessRights(online, "change_of_mind", "2026-01-24").stage).toBe("online_cancellation");
    expect(assessRights(online, "change_of_mind", "2026-01-25").stage).toBe("no_legal_right");
  });

  it("falls back to the shop's own returns policy", () => {
    const withPolicy = receipt({ returnWindowDays: 28 });
    expect(assessRights(withPolicy, "change_of_mind", "2026-02-07").stage).toBe("shop_policy");
    expect(assessRights(withPolicy, "change_of_mind", "2026-02-08").stage).toBe("no_legal_right");
  });

  it("has no legal right in store without a policy", () => {
    expect(assessRights(receipt(), "change_of_mind", "2026-01-11").stage).toBe("no_legal_right");
  });
});

describe("draftClaimLetter", () => {
  it("cites the right law and includes the purchase details", () => {
    const r = receipt();
    const assessment = assessRights(r, "faulty", "2026-01-20");
    const letter = draftClaimLetter(r, "faulty", assessment, {
      name: "Sam Taylor",
      description: "The left earcup stopped working after a week.",
      today: "2026-01-20",
    });
    expect(letter).toContain("Dear Currys,");
    expect(letter).toContain("Sony headphones");
    expect(letter).toContain("£79.99");
    expect(letter).toContain("section 22 of the Consumer Rights Act 2015");
    expect(letter).toContain("The left earcup stopped working after a week.");
    expect(letter).toContain("Sam Taylor");
  });

  it("uses placeholders when details are missing", () => {
    const r = receipt();
    const letter = draftClaimLetter(r, "faulty", assessRights(r, "faulty", "2026-01-20"), {
      name: "",
      description: "",
      today: "2026-01-20",
    });
    expect(letter).toContain("[Your name]");
  });

  it("is empty when there is nothing to claim", () => {
    const r = receipt();
    expect(
      draftClaimLetter(r, "change_of_mind", assessRights(r, "change_of_mind", "2026-03-01"), {
        name: "Sam",
        description: "",
        today: "2026-03-01",
      }),
    ).toBe("");
  });
});

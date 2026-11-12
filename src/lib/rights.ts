import { addDays, addMonths, getDeadlines } from "@/lib/deadlines";
import { formatFullDate, formatPrice } from "@/lib/format";
import type { Receipt } from "@/types/receipt";

/** What went wrong with the purchase. "Not as described" has the same remedies as faulty. */
export type Issue = "faulty" | "not_as_described" | "change_of_mind";

export type RightsStage =
  | "short_term_reject"
  | "repair_or_replace_presumed"
  | "repair_or_replace_prove"
  | "out_of_time"
  | "online_cancellation"
  | "shop_policy"
  | "no_legal_right";

export type RightsAssessment = {
  stage: RightsStage;
  /** One-line answer to "what am I owed?" */
  headline: string;
  /** What you can ask the shop for. */
  entitlements: string[];
  /** What to do next, in order. */
  steps: string[];
  /** Card or warranty protection on top of your rights against the shop. */
  extraProtection: string[];
  /** The law the answer is based on. */
  legalBasis: string;
};

/** Section 75 covers single items priced over £100 and up to £30,000 bought on a credit card. */
const SECTION_75_MIN_PENCE = 100_01;
const SECTION_75_MAX_PENCE = 30_000_00;

function extraProtectionFor(receipt: Receipt, today: string): string[] {
  const extras: string[] = [];
  const price = receipt.pricePence;

  if (receipt.paymentMethod === "credit_card" && price >= SECTION_75_MIN_PENCE && price <= SECTION_75_MAX_PENCE) {
    extras.push(
      "Section 75: you paid by credit card for an item over £100, so your card provider is equally responsible. If the shop won't help, claim from your card provider instead.",
    );
  } else if (receipt.paymentMethod === "credit_card" || receipt.paymentMethod === "debit_card") {
    extras.push(
      "Chargeback: if the shop won't help, ask your bank or card provider for a chargeback. It's a card scheme rule, not a legal right, and usually has to be raised within 120 days.",
    );
  }

  const warranty = getDeadlines(receipt).find((deadline) => deadline.kind === "warranty");
  if (warranty && warranty.date >= today) {
    extras.push(
      `Manufacturer warranty: you're covered until ${formatFullDate(warranty.date)}. You can claim from the maker as well as, or instead of, the shop.`,
    );
  }

  return extras;
}

function assessFault(receipt: Receipt, today: string): Omit<RightsAssessment, "extraProtection"> {
  const legalBasis = "Consumer Rights Act 2015, sections 19–24";
  const rejectUntil = addDays(receipt.purchaseDate, 30);
  const presumedUntil = addMonths(receipt.purchaseDate, 6);
  const limitUntil = addMonths(receipt.purchaseDate, 72);

  if (today <= rejectUntil) {
    return {
      stage: "short_term_reject",
      headline: "You can reject it for a full refund",
      entitlements: [
        `A full refund of ${formatPrice(receipt.pricePence)}. You're within the 30-day right to reject (until ${formatFullDate(rejectUntil)}).`,
        "Or, if you'd rather, a free repair or replacement.",
      ],
      steps: [
        `Contact ${receipt.retailer} before ${formatFullDate(rejectUntil)} and say you're rejecting the item under the Consumer Rights Act 2015.`,
        "Keep the item and packaging, and stop using it if it's unsafe.",
        "The shop must refund you within 14 days of agreeing it's faulty, to the original payment method.",
      ],
      legalBasis,
    };
  }

  if (today <= presumedUntil) {
    return {
      stage: "repair_or_replace_presumed",
      headline: "You're owed a free repair or replacement",
      entitlements: [
        "A free repair or replacement, at the shop's cost, within a reasonable time.",
        "If that fails or isn't possible, a full refund or a price reduction. Within 6 months there's usually no deduction for the use you've had.",
        `It's under 6 months since you bought it (until ${formatFullDate(presumedUntil)}), so the fault is presumed to have been there from the start. The shop has to prove otherwise.`,
      ],
      steps: [
        `Contact ${receipt.retailer} and ask for a repair or replacement under the Consumer Rights Act 2015.`,
        "The shop gets one attempt. If the fault comes back or it isn't fixed, ask for a refund.",
        "Keep a note of dates and who you spoke to.",
      ],
      legalBasis,
    };
  }

  if (today <= limitUntil) {
    return {
      stage: "repair_or_replace_prove",
      headline: "You may still be owed a repair, replacement or partial refund",
      entitlements: [
        "A repair or replacement, if the item hasn't lasted as long as it reasonably should.",
        "If that fails, a refund or price reduction, which may be reduced for the use you've had.",
        "After 6 months you may need to show the fault was there when you bought it. An independent report helps.",
      ],
      steps: [
        `Contact ${receipt.retailer} and ask for a repair or replacement under the Consumer Rights Act 2015.`,
        "Explain why the item should have lasted longer, given what it is and what you paid.",
        "If they say no, get an independent report on the fault, then send a formal claim letter.",
      ],
      legalBasis: `${legalBasis}, and the Limitation Act 1980 (6 years; 5 in Scotland)`,
    };
  }

  return {
    stage: "out_of_time",
    headline: "It's probably too late to claim from the shop",
    entitlements: ["Claims usually have to be made within 6 years of buying the item (5 years in Scotland)."],
    steps: ["Check whether a warranty, guarantee or insurance policy still covers it."],
    legalBasis: "Limitation Act 1980",
  };
}

function assessChangeOfMind(receipt: Receipt, today: string): Omit<RightsAssessment, "extraProtection"> {
  const cancelUntil = addDays(receipt.purchaseDate, 14);

  if (receipt.channel === "online" && today <= cancelUntil) {
    return {
      stage: "online_cancellation",
      headline: "You can cancel and get a full refund",
      entitlements: [
        `You bought it online, so you can cancel for any reason until ${formatFullDate(cancelUntil)}.`,
        "You then have 14 more days to send it back. The refund must include the standard delivery cost.",
      ],
      steps: [
        `Tell ${receipt.retailer} you're cancelling under the Consumer Contracts Regulations 2013, before ${formatFullDate(cancelUntil)}.`,
        "Send the item back within 14 days of cancelling. You may have to pay for return postage.",
        "The shop must refund you within 14 days of getting the item back.",
      ],
      legalBasis: "Consumer Contracts Regulations 2013, regulations 29–34",
    };
  }

  if (receipt.returnWindowDays !== undefined) {
    const returnUntil = addDays(receipt.purchaseDate, receipt.returnWindowDays);
    if (today <= returnUntil) {
      return {
        stage: "shop_policy",
        headline: "You can return it under the shop's own policy",
        entitlements: [
          `${receipt.retailer}'s returns policy lets you return it until ${formatFullDate(returnUntil)}.`,
          "This is a goodwill promise, so the shop's conditions apply (for example, unused and in its packaging).",
        ],
        steps: [`Take it back to ${receipt.retailer} with your receipt before ${formatFullDate(returnUntil)}.`],
        legalBasis: "The shop's returns policy (not a legal right)",
      };
    }
  }

  return {
    stage: "no_legal_right",
    headline: "There's no legal right to return it for a change of mind",
    entitlements: [
      receipt.channel === "online"
        ? "The 14-day cancellation period for online orders has ended."
        : "For things bought in a shop, returns for a change of mind are up to the shop.",
    ],
    steps: [`Ask ${receipt.retailer} anyway. Many shops offer an exchange or credit note as goodwill.`],
    legalBasis: "Consumer Rights Act 2015 (rights apply to faulty goods only)",
  };
}

/** Works out what the buyer is owed for `issue` with `receipt`, as of `today`. */
export function assessRights(receipt: Receipt, issue: Issue, today: string): RightsAssessment {
  const base = issue === "change_of_mind" ? assessChangeOfMind(receipt, today) : assessFault(receipt, today);
  const extraProtection = issue === "change_of_mind" ? [] : extraProtectionFor(receipt, today);
  return { ...base, extraProtection };
}

const ISSUE_WORDING: Record<Issue, string> = {
  faulty: "is faulty",
  not_as_described: "does not match its description",
  change_of_mind: "is no longer wanted",
};

const REQUESTS: Partial<Record<RightsStage, string>> = {
  short_term_reject: "I am exercising my short-term right to reject under section 22 of the Consumer Rights Act 2015 and request a full refund",
  repair_or_replace_presumed: "I request a repair or replacement under section 23 of the Consumer Rights Act 2015. As the fault has appeared within six months of delivery, it is presumed to have been present at that time",
  repair_or_replace_prove: "I request a repair or replacement under section 23 of the Consumer Rights Act 2015, as the item has not lasted as long as goods of this kind reasonably should",
  online_cancellation: "I am cancelling this order under regulation 29 of the Consumer Contracts Regulations 2013 and request a full refund, including standard delivery",
  shop_policy: "I would like to return this item under your returns policy",
};

/** A letter or email the buyer can send to the shop. Empty if there's nothing to claim. */
export function draftClaimLetter(
  receipt: Receipt,
  issue: Issue,
  assessment: RightsAssessment,
  details: { name: string; description: string; today: string },
): string {
  const request = REQUESTS[assessment.stage];
  if (!request) return "";

  const name = details.name.trim() || "[Your name]";
  const description = details.description.trim() || "[Describe the problem and when it started]";

  return [
    `Dear ${receipt.retailer},`,
    "",
    `On ${formatFullDate(receipt.purchaseDate)} I bought ${receipt.product} from you for ${formatPrice(receipt.pricePence)}. The item ${ISSUE_WORDING[issue]}.`,
    "",
    description,
    "",
    `${request}.`,
    "",
    "Please reply within 14 days to confirm how you will put this right. I have kept my receipt as proof of purchase.",
    "",
    "Yours faithfully,",
    name,
    formatFullDate(details.today),
  ].join("\n");
}

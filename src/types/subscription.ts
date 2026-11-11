export type BillingCycle = "weekly" | "monthly" | "yearly";

export type Subscription = {
  id: string;
  /** For example "Netflix" or "Gym membership". */
  name: string;
  /** Price per billing cycle, in pence. */
  pricePence: number;
  cycle: BillingCycle;
  /** ISO date (YYYY-MM-DD) of the next payment. Rolled forward automatically once it passes. */
  nextRenewal: string;
  /** ISO date a free trial ends and paid billing starts, if on a trial. */
  trialEnds?: string;
};

/** A friendly default name from an email: "sam.jones@…" → "Sam Jones". */
export function nameFromEmail(email: string | undefined): string {
  const local = email?.split("@")[0] ?? "";
  const words = local.split(/[._-]+/).filter(Boolean);
  return words.map((word) => word[0].toUpperCase() + word.slice(1)).join(" ") || "Me";
}

export const KIND_LABELS = { family: "Family", organization: "Organisation" } as const;
export const ROLE_LABELS = { owner: "Owner", admin: "Admin", member: "Member" } as const;

/** "K7MP2QXA" → "K7MP-2QXA", easier to read out or type. */
export function formatInviteCode(code: string): string {
  return code.length === 8 ? `${code.slice(0, 4)}-${code.slice(4)}` : code;
}

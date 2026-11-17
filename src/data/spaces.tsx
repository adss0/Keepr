import { createContext, type ReactNode, useCallback, useContext, useEffect, useMemo, useState } from "react";

import { useCloud } from "@/data/cloud";
import { supabase } from "@/data/supabase";
import { nameFromEmail } from "@/lib/spaces";

export type SpaceKind = "family" | "organization";
export type SpaceRole = "owner" | "admin" | "member";
export type SpaceMember = { userId: string; role: SpaceRole; displayName: string };
export type Space = { id: string; name: string; kind: SpaceKind; myRole: SpaceRole; members: SpaceMember[] };

/**
 * - signed_out: sharing needs an account;
 * - unavailable: the database hasn't had the shared-spaces migration yet;
 * - ready / loading / error: as usual.
 */
export type SpacesStatus = "signed_out" | "loading" | "ready" | "unavailable" | "error";

type SpacesContextValue = {
  status: SpacesStatus;
  error: string | undefined;
  spaces: Space[];
  refresh: () => Promise<void>;
  createSpace: (name: string, kind: SpaceKind) => Promise<string>;
  /** Joins with an invite code. Returns the space's id. */
  joinSpace: (code: string) => Promise<string>;
  /** Makes a 7-day invite code for the space. */
  createInvite: (spaceId: string, role: "member" | "admin") => Promise<string>;
  renameSpace: (spaceId: string, name: string) => Promise<void>;
  setMyName: (spaceId: string, name: string) => Promise<void>;
  removeMember: (spaceId: string, userId: string) => Promise<void>;
  leaveSpace: (spaceId: string) => Promise<void>;
  deleteSpace: (spaceId: string) => Promise<void>;
  spaceName: (spaceId: string | undefined) => string | undefined;
  /** "You", or a member's name in that space. */
  memberName: (spaceId: string | undefined, userId: string | undefined) => string | undefined;
};

const SpacesContext = createContext<SpacesContextValue | null>(null);

type SpaceRow = {
  id: string;
  name: string;
  kind: SpaceKind;
  space_members: { user_id: string; role: SpaceRole; display_name: string }[];
};

/** Errors that mean the shared-spaces tables or functions don't exist yet. */
function isMissing(error: { code?: string } | null): boolean {
  return ["PGRST202", "PGRST205", "42P01", "42883"].includes(error?.code ?? "");
}

function messageOf(error: unknown): string {
  return error instanceof Error ? error.message : typeof error === "object" && error && "message" in error ? String(error.message) : String(error);
}

const MANAGERS: SpaceRole[] = ["owner", "admin"];

type LoadResult = { status: SpacesStatus; error?: string; spaces?: Space[] };

/** Fetches the user's spaces with their members. */
async function loadSpaces(userId: string): Promise<LoadResult> {
  if (!supabase) return { status: "signed_out" };
  const { data, error } = await supabase
    .from("spaces")
    .select("id, name, kind, space_members(user_id, role, display_name)")
    .order("created_at");
  if (error) return { status: isMissing(error) ? "unavailable" : "error", error: error.message };
  return {
    status: "ready",
    spaces: (data as SpaceRow[]).map((row) => ({
      id: row.id,
      name: row.name,
      kind: row.kind,
      myRole: row.space_members.find((member) => member.user_id === userId)?.role ?? "member",
      members: row.space_members
        .map((member) => ({ userId: member.user_id, role: member.role, displayName: member.display_name }))
        .sort((a, b) => MANAGERS.indexOf(b.role) - MANAGERS.indexOf(a.role) || a.displayName.localeCompare(b.displayName)),
    })),
  };
}
export const canManage = (space: Space | undefined) => !!space && MANAGERS.includes(space.myRole);

/** The signed-in user's shared spaces, and everything to create, join and manage them. */
export function SpacesProvider({ children }: { children: ReactNode }) {
  const cloud = useCloud();
  const { userId, email, syncNow } = cloud;
  const [spaces, setSpaces] = useState<Space[]>([]);
  const [status, setStatus] = useState<SpacesStatus>("loading");
  const [error, setError] = useState<string>();

  /** Applies a load's result. Called after the await, never synchronously inside an effect. */
  const apply = useCallback((result: LoadResult) => {
    setStatus(result.status);
    setError(result.error);
    if (result.spaces) setSpaces(result.spaces);
  }, []);

  const refresh = useCallback(async () => {
    if (userId) apply(await loadSpaces(userId));
  }, [apply, userId]);

  useEffect(() => {
    if (!userId) return;
    loadSpaces(userId)
      .then(apply)
      .catch((loadError: unknown) => apply({ status: "error", error: messageOf(loadError) }));
  }, [apply, userId]);

  /** Runs a change, then reloads spaces and pulls items (joining or leaving changes what you can see). */
  const run = useCallback(
    async <T,>(action: () => PromiseLike<{ data: T; error: { message: string; code?: string } | null }>): Promise<T> => {
      if (!supabase || !userId) throw new Error("Sign in to share with others.");
      const { data, error: actionError } = await action();
      if (actionError) {
        if (isMissing(actionError)) throw new Error("Sharing needs the latest database update (see docs/cloud-setup.md).");
        throw new Error(actionError.message);
      }
      await refresh();
      syncNow().catch(() => undefined);
      return data;
    },
    [refresh, syncNow, userId],
  );

  const value = useMemo<SpacesContextValue>(() => {
    const client = supabase!;
    const myName = nameFromEmail(email);
    const byId = new Map((userId ? spaces : []).map((space) => [space.id, space]));
    // Signed out is worked out here rather than stored, so it's right the moment someone signs out.
    const visibleSpaces = userId ? spaces : [];
    return {
      status: userId ? status : "signed_out",
      error,
      spaces: visibleSpaces,
      refresh,
      createSpace: (name, kind) =>
        run(() => client.rpc("create_space", { space_name: name.trim(), space_kind: kind, member_name: myName })),
      joinSpace: (code) => run(() => client.rpc("join_space", { invite_code: code, member_name: myName })),
      createInvite: (spaceId, role) => run(() => client.rpc("create_space_invite", { target: spaceId, invite_role: role })),
      renameSpace: (spaceId, name) =>
        run(() => client.from("spaces").update({ name: name.trim() }).eq("id", spaceId)).then(() => undefined),
      setMyName: (spaceId, name) =>
        run(() =>
          client.from("space_members").update({ display_name: name.trim() }).eq("space_id", spaceId).eq("user_id", userId!),
        ).then(() => undefined),
      removeMember: (spaceId, memberId) =>
        run(() => client.from("space_members").delete().eq("space_id", spaceId).eq("user_id", memberId)).then(() => undefined),
      leaveSpace: (spaceId) =>
        run(() => client.from("space_members").delete().eq("space_id", spaceId).eq("user_id", userId!)).then(() => undefined),
      deleteSpace: (spaceId) => run(() => client.from("spaces").delete().eq("id", spaceId)).then(() => undefined),
      spaceName: (spaceId) => (spaceId ? byId.get(spaceId)?.name : undefined),
      memberName: (spaceId, memberId) => {
        if (!memberId) return undefined;
        if (memberId === userId) return "You";
        return byId.get(spaceId ?? "")?.members.find((member) => member.userId === memberId)?.displayName || "Someone";
      },
    };
  }, [status, error, spaces, refresh, run, email, userId]);

  return <SpacesContext.Provider value={value}>{children}</SpacesContext.Provider>;
}

export function useSpaces(): SpacesContextValue {
  const value = useContext(SpacesContext);
  if (!value) throw new Error("useSpaces must be used inside <SpacesProvider>");
  return value;
}

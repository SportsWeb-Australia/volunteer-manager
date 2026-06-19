import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { supabase, hasSupabaseConfig } from "../lib/supabase";

type Viewer = "manager" | "volunteer";

interface AppState {
  ready: boolean;
  configured: boolean;
  signedIn: boolean;
  clubId: string | null;
  clubName: string | null;
  viewer: Viewer;
  setViewer: (v: Viewer) => void;
  signOut: () => Promise<void>;
  error: string | null;
}

const Ctx = createContext<AppState | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [signedIn, setSignedIn] = useState(false);
  const [clubId, setClubId] = useState<string | null>(null);
  const [clubName, setClubName] = useState<string | null>(null);
  const [viewer, setViewer] = useState<Viewer>("manager");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!hasSupabaseConfig) { setReady(true); return; }
    let cancelled = false;
    let resolved = false; // becomes true after the first club resolution

    // Resolve the signed-in user's club. In production the host SportsWeb One
    // shell shares its session; standalone we read club_users for this user.
    const resolve = async (session: import("@supabase/supabase-js").Session | null) => {
      if (cancelled) return;
      if (!session) {
        setSignedIn(false); setClubId(null); setClubName(null); setReady(true); resolved = true; return;
      }
      setSignedIn(true);
      try {
        const { data, error } = await supabase
          .from("club_users")
          .select("club_id, role, clubs(name)")
          .eq("user_id", session.user.id)
          .limit(1)
          .maybeSingle();
        if (error) throw error;
        if (data) {
          setClubId(data.club_id as string);
          // @ts-expect-error joined shape
          setClubName(data.clubs?.name ?? null);
        } else {
          setClubId(null); setClubName(null);
        }
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : "Could not load your club.");
      } finally {
        if (!cancelled) { setReady(true); resolved = true; }
      }
    };

    supabase.auth.getSession().then(({ data: { session } }) => resolve(session));
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      // Supabase fires TOKEN_REFRESHED / USER_UPDATED (and a duplicate SIGNED_IN)
      // when the tab regains focus. Re-resolving on those is fine, but flipping
      // `ready` back to false remounts the app and wipes any in-progress form
      // state — so only react to genuine sign-in / sign-out transitions, and
      // never reset `ready` after the first load.
      if (event === "TOKEN_REFRESHED" || event === "USER_UPDATED") return;
      if (event === "SIGNED_OUT") {
        setSignedIn(false); setClubId(null); setClubName(null); return;
      }
      if (event === "SIGNED_IN" && resolved) return; // duplicate fired on focus
      resolve(session);
    });
    return () => { cancelled = true; sub.subscription.unsubscribe(); };
  }, []);

  // Tag this browser's push subscription with the club, so club-scoped push
  // (WebPushr send-to-attribute) only reaches this club's volunteers.
  useEffect(() => {
    const wp = (window as unknown as { webpushr?: (...a: unknown[]) => void }).webpushr;
    if (clubId && typeof wp === "function") wp("attributes", { club_id: clubId });
  }, [clubId]);

  const signOut = async () => { await supabase.auth.signOut(); };

  return (
    <Ctx.Provider value={{
      ready, configured: hasSupabaseConfig, signedIn, clubId, clubName, viewer, setViewer, signOut, error,
    }}>{children}</Ctx.Provider>
  );
}

export function useApp() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useApp must be used inside <AppProvider>");
  return v;
}

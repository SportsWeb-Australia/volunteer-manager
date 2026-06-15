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

    // Resolve the signed-in user's club. In production the host SportsWeb One
    // shell shares its session; standalone we read club_users for this user.
    const resolve = async (session: import("@supabase/supabase-js").Session | null) => {
      if (cancelled) return;
      if (!session) {
        setSignedIn(false); setClubId(null); setClubName(null); setReady(true); return;
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
        if (!cancelled) setReady(true);
      }
    };

    supabase.auth.getSession().then(({ data: { session } }) => resolve(session));
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setReady(false);
      resolve(session);
    });
    return () => { cancelled = true; sub.subscription.unsubscribe(); };
  }, []);

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

import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { useApp } from "../context/AppContext";
import type { EffectiveFeatures, FeatureFlag, LimitKey } from "../lib/entitlements";

const EMPTY: EffectiveFeatures = { flags: {}, limits: {} };

/**
 * Loads the club's effective features via the vm_effective_features() SQL gate.
 * Falls back to "everything off" when there is no entitlement (module locked).
 */
export function useEntitlement() {
  const { clubId, configured } = useApp();
  const [features, setFeatures] = useState<EffectiveFeatures>(EMPTY);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!configured || !clubId) { setLoading(false); return; }
      setLoading(true);
      const { data, error } = await supabase.rpc("vm_effective_features", { p_club: clubId });
      if (cancelled) return;
      if (!error && data) setFeatures(data as EffectiveFeatures);
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [clubId, configured]);

  const has = (flag: FeatureFlag) => Boolean(features.flags?.[flag]);
  const limit = (key: LimitKey) => features.limits?.[key] ?? null; // null = unlimited
  const enabled = Boolean(features.plan);

  return { features, plan: features.plan ?? null, enabled, has, limit, loading };
}

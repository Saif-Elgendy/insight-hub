import { useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useUserRole } from "@/hooks/useUserRole";
import { setDiagnosticsActor } from "@/lib/diagnosticsRecorder";

/**
 * Keeps the diagnostics recorder informed about the current actor
 * (user id, email, role) so every Console/API entry is attributed.
 */
export const DiagnosticsActorBinder = () => {
  const { user } = useAuth();
  const { role } = useUserRole();

  useEffect(() => {
    setDiagnosticsActor({
      userId: user?.id ?? null,
      email: user?.email ?? null,
      role: role ?? null,
    });
  }, [user, role]);

  return null;
};

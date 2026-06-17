import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';
import type { Session, SupabaseClient, User } from '@supabase/supabase-js';
import { getSupabase } from '../data/supabaseClient';
import { LoginPage } from './LoginPage';

interface AuthContextValue {
  /** true si Supabase est configuré (mode cloud) ; false en mode local. */
  configured: boolean;
  user: User | null;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue>({
  configured: false,
  user: null,
  signOut: async () => {},
});

export function useAuth(): AuthContextValue {
  return useContext(AuthContext);
}

/**
 * Porte d'authentification.
 *  - Mode LOCAL (sans Supabase) : aucune connexion requise, rend directement l'app.
 *  - Mode CLOUD (Supabase) : exige une connexion. Tant que l'utilisateur n'est pas
 *    authentifié, affiche la page de connexion ; l'app (et donc l'accès aux données)
 *    n'est montée qu'une fois connecté.
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const supabase = getSupabase();
  const configured = !!supabase;
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState<boolean>(configured);

  useEffect(() => {
    if (!supabase) return;
    let mounted = true;
    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      setSession(data.session);
      setLoading(false);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
      setLoading(false);
    });
    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, [supabase]);

  const signOut = useCallback(async () => {
    await supabase?.auth.signOut();
  }, [supabase]);

  const ctx: AuthContextValue = { configured, user: session?.user ?? null, signOut };

  // Mode local : pas d'authentification.
  if (!configured) {
    return <AuthContext.Provider value={ctx}>{children}</AuthContext.Provider>;
  }

  if (loading) {
    return <div className="app-loading">Chargement…</div>;
  }

  if (!session) {
    return (
      <AuthContext.Provider value={ctx}>
        <LoginPage supabase={supabase as SupabaseClient} />
      </AuthContext.Provider>
    );
  }

  return <AuthContext.Provider value={ctx}>{children}</AuthContext.Provider>;
}

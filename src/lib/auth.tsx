import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

export type AppRole = "admin" | "empleado";

interface AuthState {
  loading: boolean;
  session: Session | null;
  user: User | null;
  role: AppRole | null;
  nombre: string | null;
  isAdmin: boolean;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signUp: (email: string, password: string, nombre: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
}

const Ctx = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [role, setRole] = useState<AppRole | null>(null);
  const [nombre, setNombre] = useState<string | null>(null);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
      if (!s) { setRole(null); setNombre(null); }
    });
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
    });
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!session?.user) return;
    const uid = session.user.id;
    (async () => {
      const [{ data: roles }, { data: prof }] = await Promise.all([
        supabase.from("user_roles").select("role").eq("user_id", uid),
        supabase.from("profiles").select("nombre").eq("user_id", uid).maybeSingle(),
      ]);
      const r = roles?.find((x) => x.role === "admin") ? "admin" : (roles?.[0]?.role as AppRole | undefined) ?? null;
      setRole(r);
      setNombre(prof?.nombre ?? null);
    })();
  }, [session]);

  const value = useMemo<AuthState>(() => ({
    loading,
    session,
    user: session?.user ?? null,
    role,
    nombre,
    isAdmin: role === "admin",
    async signIn(email, password) {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      return { error: error?.message ?? null };
    },
    async signUp(email, password, nombre) {
      const { error } = await supabase.auth.signUp({
        email, password,
        options: { emailRedirectTo: `${window.location.origin}/`, data: { nombre } },
      });
      return { error: error?.message ?? null };
    },
    async signOut() { await supabase.auth.signOut(); },
  }), [loading, session, role, nombre]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAuth() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useAuth debe usarse dentro de <AuthProvider>");
  return v;
}

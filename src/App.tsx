import { useEffect, useState } from "react";
import { supabase, supabaseReady } from "./supabase";

const apiBase = import.meta.env.VITE_API_URL || "";

type User = { email?: string; name?: string; picture?: string };

export function App() {
  const [user, setUser] = useState<User | null>(null);
  const [error, setError] = useState("");

  async function load() {
    if (!supabase) return;
    const { data } = await supabase.auth.getSession();
    const s = data.session;
    if (!s) {
      setUser(null);
      return;
    }
    const r = await fetch(`${apiBase}/api/auth/me`, {
      headers: { Authorization: `Bearer ${s.access_token}` },
    });
    if (!r.ok) {
      setError("API rechazó el token");
      setUser(null);
      return;
    }
    const me = await r.json();
    setUser({
      email: me.email,
      name: me.user_metadata?.name || me.user_metadata?.full_name,
      picture: me.user_metadata?.avatar_url || me.user_metadata?.picture,
    });
  }

  useEffect(() => {
    if (!supabase) return;
    load();
    const { data: sub } = supabase.auth.onAuthStateChange(() => {
      load();
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  return (
    <main style={{ fontFamily: "system-ui", padding: 32, maxWidth: 480, color: "#111" }}>
      <h1>KataE1</h1>
      {!supabaseReady && (
        <p>
          Falta <code>VITE_SUPABASE_ANON_KEY</code> en <code>.env</code>.
        </p>
      )}
      {user ? (
        <p>
          {user.picture && (
            <img src={user.picture} alt="" width={40} height={40} style={{ borderRadius: 20 }} />
          )}{" "}
          {user.name || user.email}
          <br />
          <button onClick={() => supabase?.auth.signOut()}>Salir</button>
        </p>
      ) : (
        <>
          <button
            disabled={!supabase}
            onClick={() =>
              supabase?.auth.signInWithOAuth({
                provider: "google",
                options: { redirectTo: window.location.origin },
              })
            }
          >
            Entrar con Google
          </button>
          {error && <p>{error}</p>}
        </>
      )}
    </main>
  );
}

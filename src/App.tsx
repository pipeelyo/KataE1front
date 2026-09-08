import { useEffect, useState } from "react";
import { GoogleAuthProvider, onAuthStateChanged, signInWithPopup, signOut } from "firebase/auth";
import { auth, firebaseReady } from "./firebase";

const apiBase = import.meta.env.VITE_API_URL || "";

type User = { email?: string; name?: string; picture?: string };

export function App() {
  const [user, setUser] = useState<User | null>(null);
  const [error, setError] = useState("");

  async function load() {
    if (!auth) return;
    const current = auth.currentUser;
    if (!current) {
      setUser(null);
      return;
    }
    const token = await current.getIdToken();
    const r = await fetch(`${apiBase}/api/auth/me`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!r.ok) {
      setError("API rechazó el token");
      setUser(null);
      return;
    }
    const me = await r.json();
    setUser({
      email: me.email,
      name: me.name,
      picture: me.picture,
    });
  }

  useEffect(() => {
    if (!auth) return;
    const unsub = onAuthStateChanged(auth, () => {
      load();
    });
    return () => unsub();
  }, []);

  return (
    <main style={{ fontFamily: "system-ui", padding: 32, maxWidth: 480, color: "#111" }}>
      <h1>KataE1</h1>
      {!firebaseReady && <p>Falta la config de Firebase en el build.</p>}
      {user ? (
        <p>
          {user.picture && (
            <img src={user.picture} alt="" width={40} height={40} style={{ borderRadius: 20 }} />
          )}{" "}
          {user.name || user.email}
          <br />
          <button onClick={() => auth && signOut(auth)}>Salir</button>
        </p>
      ) : (
        <>
          <button
            disabled={!auth}
            onClick={async () => {
              if (!auth) return;
              setError("");
              try {
                await signInWithPopup(auth, new GoogleAuthProvider());
              } catch (e) {
                setError(e instanceof Error ? e.message : "Login falló");
              }
            }}
          >
            Entrar con Google
          </button>
          {error && <p>{error}</p>}
        </>
      )}
    </main>
  );
}

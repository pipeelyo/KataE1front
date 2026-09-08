import { useEffect, useState, type CSSProperties } from "react";
import {
  ConfirmationResult,
  GoogleAuthProvider,
  RecaptchaVerifier,
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signInWithPhoneNumber,
  signInWithPopup,
  signOut,
} from "firebase/auth";
import { auth, firebaseReady } from "./firebase";

const apiBase = import.meta.env.VITE_API_URL || "";

type User = { email?: string; name?: string; picture?: string; phone?: string };

const field: CSSProperties = { display: "block", width: "100%", margin: "8px 0", padding: 8 };
const row: CSSProperties = { display: "flex", gap: 8, marginTop: 8 };

function firebaseMessage(e: unknown) {
  const code = typeof e === "object" && e && "code" in e ? String((e as { code: string }).code) : "";
  if (code.includes("email-already-in-use")) return "Ese correo ya tiene cuenta. Entra con la contraseña.";
  if (code.includes("invalid-email")) return "Correo inválido.";
  if (code.includes("weak-password")) return "La contraseña debe tener al menos 6 caracteres.";
  if (code.includes("invalid-credential") || code.includes("wrong-password") || code.includes("user-not-found"))
    return "Correo o contraseña incorrectos.";
  if (code.includes("invalid-phone-number")) return "Número inválido. Usa formato +57...";
  if (code.includes("invalid-verification-code")) return "Código SMS incorrecto.";
  if (code.includes("too-many-requests")) return "Demasiados intentos. Espera un momento.";
  if (code.includes("quota-exceeded")) return "Firebase agotó la cuota de SMS.";
  return e instanceof Error ? e.message : "Login falló";
}

function normalizePhone(raw: string) {
  const v = raw.replace(/\s+/g, "");
  if (v.startsWith("+")) return v;
  if (/^57\d{10}$/.test(v)) return `+${v}`;
  if (/^3\d{9}$/.test(v)) return `+57${v}`;
  return v;
}

export function App() {
  const [user, setUser] = useState<User | null>(null);
  const [error, setError] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [phone, setPhone] = useState("+57");
  const [sms, setSms] = useState("");
  const [confirm, setConfirm] = useState<ConfirmationResult | null>(null);
  const [busy, setBusy] = useState(false);

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
      email: me.email || current.email || undefined,
      name: me.name || current.displayName || undefined,
      picture: me.picture || current.photoURL || undefined,
      phone: me.phone || current.phoneNumber || undefined,
    });
  }

  useEffect(() => {
    if (!auth) return;
    const unsub = onAuthStateChanged(auth, () => {
      load();
    });
    return () => unsub();
  }, []);

  function recaptcha() {
    if (!auth) throw new Error("Firebase no está listo");
    const w = window as Window & { recaptchaVerifier?: RecaptchaVerifier };
    if (!w.recaptchaVerifier) {
      w.recaptchaVerifier = new RecaptchaVerifier(auth, "recaptcha", { size: "invisible" });
    }
    return w.recaptchaVerifier;
  }

  async function run(fn: () => Promise<void>) {
    if (!auth) return;
    setError("");
    setBusy(true);
    try {
      await fn();
    } catch (e) {
      setError(firebaseMessage(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <main style={{ fontFamily: "system-ui", padding: 32, maxWidth: 480, color: "#111" }}>
      <h1>KataE1</h1>
      {!firebaseReady && <p>Falta la config de Firebase en el build.</p>}
      {user ? (
        <p>
          {user.picture && (
            <img src={user.picture} alt="" width={40} height={40} style={{ borderRadius: 20 }} />
          )}{" "}
          {user.name || user.email || user.phone}
          <br />
          <button onClick={() => auth && signOut(auth)}>Salir</button>
        </p>
      ) : (
        <>
          <button
            disabled={!auth || busy}
            onClick={() =>
              run(async () => {
                await signInWithPopup(auth!, new GoogleAuthProvider());
              })
            }
          >
            Entrar con Google
          </button>

          <h2 style={{ fontSize: 16, marginTop: 28 }}>Correo</h2>
          <input
            style={field}
            type="email"
            placeholder="correo"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <input
            style={field}
            type="password"
            placeholder="contraseña"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <div style={row}>
            <button
              disabled={!auth || busy}
              onClick={() =>
                run(async () => {
                  await signInWithEmailAndPassword(auth!, email, password);
                })
              }
            >
              Entrar
            </button>
            <button
              disabled={!auth || busy}
              onClick={() =>
                run(async () => {
                  await createUserWithEmailAndPassword(auth!, email, password);
                })
              }
            >
              Crear cuenta
            </button>
          </div>

          <h2 style={{ fontSize: 16, marginTop: 28 }}>Teléfono</h2>
          <input
            style={field}
            type="tel"
            placeholder="+57 300 123 4567"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
          />
          <button
            disabled={!auth || busy}
            onClick={() =>
              run(async () => {
                const result = await signInWithPhoneNumber(auth!, normalizePhone(phone), recaptcha());
                setConfirm(result);
              })
            }
          >
            Enviar código
          </button>
          {confirm && (
            <>
              <input
                style={field}
                inputMode="numeric"
                placeholder="código SMS"
                value={sms}
                onChange={(e) => setSms(e.target.value)}
              />
              <button
                disabled={!auth || busy}
                onClick={() =>
                  run(async () => {
                    await confirm.confirm(sms);
                  })
                }
              >
                Confirmar SMS
              </button>
            </>
          )}
          <div id="recaptcha" />
          {error && <p>{error}</p>}
        </>
      )}
    </main>
  );
}

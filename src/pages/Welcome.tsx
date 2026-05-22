import { useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Mail, Lock, ArrowRight, Apple } from "lucide-react";
import { useAuthStore } from "../stores/useAuthStore";
import Aurora from "../components/Aurora";

type Mode = "login" | "signup";

export default function Welcome() {
  const signIn = useAuthStore((s) => s.signIn);
  const signUp = useAuthStore((s) => s.signUp);
  const signInWithOAuth = useAuthStore((s) => s.signInWithOAuth);
  const cloudConfigured = useAuthStore((s) => s.configured);

  const [mode, setMode] = useState<Mode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");

  async function submit() {
    const e = email.trim();
    if (!e || !password) return;
    if (password.length < 6) {
      setError("Password minima 6 caratteri.");
      return;
    }
    setSubmitting(true);
    setError("");
    setInfo("");
    const fn = mode === "login" ? signIn : signUp;
    const { error: err } = await fn(e, password);
    setSubmitting(false);
    if (err) {
      setError(err);
      return;
    }
    if (mode === "signup") {
      // Se Confirm Email è ON, l'utente vede "controlla la mail".
      // Se è OFF, è già loggato e l'auth state change ci porterà a "/".
      setInfo("Account creato. Se la conferma email è attiva, controlla la posta.");
    }
  }

  async function oauth(provider: "apple" | "google") {
    setSubmitting(true);
    setError("");
    const { error: err } = await signInWithOAuth(provider);
    setSubmitting(false);
    if (err) setError(err);
    // OAuth ridirige al provider; al ritorno auth state change ci porta a "/"
  }

  return (
    <div className="relative min-h-screen flex flex-col overflow-hidden">
      <Aurora />
      <div className="relative z-10 flex-1 flex flex-col px-6 pt-16 pb-10 max-w-md w-full mx-auto">
        {/* ── Brand ─────────────────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="mb-12 text-center"
        >
          <div className="inline-flex items-center justify-center w-20 h-20 mb-5">
            <svg viewBox="0 0 64 64" className="w-16 h-16">
              <circle
                cx="32"
                cy="32"
                r="20"
                fill="none"
                stroke="white"
                strokeWidth="2.5"
                strokeLinecap="round"
              />
              <circle cx="32" cy="32" r="3" fill="white" />
            </svg>
          </div>
          <h1 className="display text-[44px] leading-none text-ink mb-3">EVO</h1>
          <p className="text-ink-muted text-[14px] leading-relaxed max-w-[280px] mx-auto">
            La bussola interna per chi vuole vivere la propria epoca.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.15 }}
          className="space-y-3"
        >
          {/* ── OAuth ───────────────────────────────────────────────── */}
          {cloudConfigured && (
            <>
              <button
                onClick={() => oauth("apple")}
                disabled={submitting}
                className="w-full rounded-2xl bg-black border-[0.5px] border-white/15 text-white py-3.5 text-[14.5px] font-medium inline-flex items-center justify-center gap-2.5 active:scale-[0.98] transition-transform disabled:opacity-50"
              >
                <Apple size={17} strokeWidth={2} fill="white" />
                Continua con Apple
              </button>
              <button
                onClick={() => oauth("google")}
                disabled={submitting}
                className="w-full rounded-2xl bg-white text-black py-3.5 text-[14.5px] font-medium inline-flex items-center justify-center gap-2.5 active:scale-[0.98] transition-transform disabled:opacity-50"
              >
                <GoogleLogo />
                Continua con Google
              </button>

              <div className="flex items-center gap-3 my-5">
                <span className="flex-1 h-px bg-white/12" />
                <span className="text-ink-quiet text-[11.5px] uppercase tracking-wider">
                  oppure
                </span>
                <span className="flex-1 h-px bg-white/12" />
              </div>
            </>
          )}

          {/* ── Email / Password ─────────────────────────────────────── */}
          <div className="relative">
            <Mail
              size={16}
              className="absolute left-4 top-1/2 -translate-y-1/2 text-ink-quiet"
            />
            <input
              type="email"
              inputMode="email"
              autoComplete="email"
              autoCapitalize="none"
              autoCorrect="off"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="tu@email.com"
              className="input w-full pl-11 py-3.5 text-[15px]"
            />
          </div>

          <div className="relative">
            <Lock
              size={16}
              className="absolute left-4 top-1/2 -translate-y-1/2 text-ink-quiet"
            />
            <input
              type="password"
              autoComplete={mode === "login" ? "current-password" : "new-password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") submit();
              }}
              placeholder="password"
              className="input w-full pl-11 py-3.5 text-[15px]"
            />
          </div>

          {error && (
            <p className="text-sys-red text-[12.5px] px-1 leading-snug">
              {error}
            </p>
          )}
          {info && (
            <p className="text-sys-green text-[12.5px] px-1 leading-snug">
              {info}
            </p>
          )}

          <button
            onClick={submit}
            disabled={submitting || !email.trim() || !password}
            className="btn-primary w-full py-3.5 text-[15px] inline-flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {submitting ? (
              "..."
            ) : mode === "login" ? (
              <>
                Accedi <ArrowRight size={16} />
              </>
            ) : (
              <>
                Crea account <ArrowRight size={16} />
              </>
            )}
          </button>

          {mode === "login" && (
            <div className="text-center pt-2">
              <Link
                to="/forgot-password"
                className="text-ink-muted text-[13px] active:opacity-70"
              >
                Password dimenticata?
              </Link>
            </div>
          )}

          <button
            onClick={() => {
              setMode(mode === "login" ? "signup" : "login");
              setError("");
              setInfo("");
            }}
            className="text-ink-muted text-[13px] w-full py-3 active:opacity-70"
          >
            {mode === "login"
              ? "Nuovo su EVO? Crea un account"
              : "Hai già un account? Accedi"}
          </button>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="mt-auto pt-8 text-center"
        >
          <p className="text-ink-quiet text-[10.5px] leading-relaxed max-w-[240px] mx-auto">
            Creando un account accetti che i tuoi dati siano sincronizzati e
            conservati in cloud.
          </p>
        </motion.div>
      </div>
    </div>
  );
}

function GoogleLogo() {
  return (
    <svg width="17" height="17" viewBox="0 0 18 18" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.258h2.908c1.702-1.567 2.684-3.874 2.684-6.615z"
        fill="#4285F4"
      />
      <path
        d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z"
        fill="#34A853"
      />
      <path
        d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332z"
        fill="#FBBC05"
      />
      <path
        d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z"
        fill="#EA4335"
      />
    </svg>
  );
}

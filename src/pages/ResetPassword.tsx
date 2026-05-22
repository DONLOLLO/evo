import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Lock, Check, AlertTriangle } from "lucide-react";
import { useAuthStore } from "../stores/useAuthStore";
import Aurora from "../components/Aurora";

export default function ResetPassword() {
  const navigate = useNavigate();
  const updatePassword = useAuthStore((s) => s.updatePassword);
  const session = useAuthStore((s) => s.session);
  const ready = useAuthStore((s) => s.ready);

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");

  // Quando l'utente arriva da email link, Supabase popola la session
  // automaticamente grazie a detectSessionInUrl: true.
  // Se ready ma niente session → link scaduto o invalido.
  const invalid = ready && !session && !done;

  // Reindirizza al login dopo 3 secondi quando done
  useEffect(() => {
    if (!done) return;
    const t = setTimeout(() => navigate("/"), 3000);
    return () => clearTimeout(t);
  }, [done, navigate]);

  async function submit() {
    if (!password || !confirm) return;
    if (password.length < 6) {
      setError("Password minima 6 caratteri.");
      return;
    }
    if (password !== confirm) {
      setError("Le password non coincidono.");
      return;
    }
    setSubmitting(true);
    setError("");
    const { error: err } = await updatePassword(password);
    setSubmitting(false);
    if (err) {
      setError(err);
      return;
    }
    setDone(true);
  }

  return (
    <div className="relative min-h-screen flex flex-col overflow-hidden">
      <Aurora />
      <div className="relative z-10 flex-1 flex flex-col px-6 pt-16 pb-10 max-w-md w-full mx-auto">
        {!ready ? (
          <p className="text-ink-muted text-[13px] text-center mt-20">
            Verifico il link…
          </p>
        ) : invalid ? (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center text-center mt-12"
          >
            <div
              className="w-16 h-16 rounded-full flex items-center justify-center mb-5"
              style={{
                background: "rgba(255,107,122,0.18)",
                border: "1px solid rgba(255,107,122,0.4)",
              }}
            >
              <AlertTriangle size={24} className="text-sys-red" strokeWidth={2.2} />
            </div>
            <h1 className="display text-[26px] leading-tight mb-3 text-ink">
              Link non valido o scaduto
            </h1>
            <p className="text-ink-muted text-[14px] leading-relaxed max-w-[280px] mb-6">
              Il link di reset è scaduto. Richiedine uno nuovo.
            </p>
            <Link to="/forgot-password" className="btn-primary px-6">
              Nuovo link
            </Link>
          </motion.div>
        ) : done ? (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center text-center mt-12"
          >
            <div
              className="w-16 h-16 rounded-full flex items-center justify-center mb-5"
              style={{
                background: "rgba(48,209,88,0.18)",
                border: "1px solid rgba(48,209,88,0.4)",
              }}
            >
              <Check size={26} className="text-sys-green" strokeWidth={2.2} />
            </div>
            <h1 className="display text-[28px] leading-tight mb-3 text-ink">
              Password aggiornata
            </h1>
            <p className="text-ink-muted text-[14px] leading-relaxed max-w-[280px]">
              Sei già loggato. Ti porto in EVO tra qualche secondo.
            </p>
          </motion.div>
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <h1 className="display text-[32px] leading-tight mb-2 text-ink">
              Nuova password
            </h1>
            <p className="text-ink-muted text-[14px] mb-8 leading-relaxed">
              Scegli una password che ricorderai. Min 6 caratteri.
            </p>

            <div className="relative mb-3">
              <Lock
                size={16}
                className="absolute left-4 top-1/2 -translate-y-1/2 text-ink-quiet"
              />
              <input
                autoFocus
                type="password"
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="nuova password"
                className="input w-full pl-11 py-3.5 text-[15px]"
              />
            </div>

            <div className="relative mb-3">
              <Lock
                size={16}
                className="absolute left-4 top-1/2 -translate-y-1/2 text-ink-quiet"
              />
              <input
                type="password"
                autoComplete="new-password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && submit()}
                placeholder="conferma password"
                className="input w-full pl-11 py-3.5 text-[15px]"
              />
            </div>

            {error && (
              <p className="text-sys-red text-[12.5px] mb-3 px-1">{error}</p>
            )}

            <button
              onClick={submit}
              disabled={submitting || !password || !confirm}
              className="btn-primary w-full py-3.5 text-[15px] disabled:opacity-50"
            >
              {submitting ? "Aggiorno..." : "Aggiorna password"}
            </button>
          </motion.div>
        )}
      </div>
    </div>
  );
}

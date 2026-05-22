import { useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Mail, ArrowLeft, Check } from "lucide-react";
import { useAuthStore } from "../stores/useAuthStore";
import Aurora from "../components/Aurora";

export default function ForgotPassword() {
  const requestPasswordReset = useAuthStore((s) => s.requestPasswordReset);
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  async function submit() {
    const e = email.trim();
    if (!e) return;
    setSubmitting(true);
    setError("");
    const { error: err } = await requestPasswordReset(e);
    setSubmitting(false);
    if (err) {
      setError(err);
      return;
    }
    setSent(true);
  }

  return (
    <div className="relative min-h-screen flex flex-col overflow-hidden">
      <Aurora />
      <div className="relative z-10 flex-1 flex flex-col px-6 pt-12 pb-10 max-w-md w-full mx-auto">
        <Link
          to="/welcome"
          className="text-ink-muted text-[13px] inline-flex items-center gap-1.5 mb-10 active:opacity-70 w-fit"
        >
          <ArrowLeft size={14} /> Torna al login
        </Link>

        {sent ? (
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
              Email inviata
            </h1>
            <p className="text-ink-muted text-[14px] leading-relaxed max-w-[280px]">
              Se l'indirizzo è associato a un account, ti arriverà una mail con
              il link per impostare una nuova password.
            </p>
            <p className="text-ink-quiet text-[12px] mt-4">
              Controlla anche la cartella spam.
            </p>
            <Link
              to="/welcome"
              className="btn-ghost mt-8 inline-flex items-center justify-center px-6"
            >
              Torna al login
            </Link>
          </motion.div>
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <h1 className="display text-[32px] leading-tight mb-2 text-ink">
              Password dimenticata
            </h1>
            <p className="text-ink-muted text-[14px] mb-8 leading-relaxed">
              Inserisci la tua email. Ti mandiamo un link per impostare una
              nuova password.
            </p>

            <div className="relative mb-3">
              <Mail
                size={16}
                className="absolute left-4 top-1/2 -translate-y-1/2 text-ink-quiet"
              />
              <input
                autoFocus
                type="email"
                inputMode="email"
                autoComplete="email"
                autoCapitalize="none"
                autoCorrect="off"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && submit()}
                placeholder="tu@email.com"
                className="input w-full pl-11 py-3.5 text-[15px]"
              />
            </div>

            {error && (
              <p className="text-sys-red text-[12.5px] mb-3 px-1">{error}</p>
            )}

            <button
              onClick={submit}
              disabled={submitting || !email.trim()}
              className="btn-primary w-full py-3.5 text-[15px] disabled:opacity-50"
            >
              {submitting ? "Invio..." : "Inviami il link"}
            </button>
          </motion.div>
        )}
      </div>
    </div>
  );
}

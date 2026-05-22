import { useState } from "react";
import { Cloud, LogOut, Mail, Lock } from "lucide-react";
import { Sheet } from "../pages/Missions";
import { useAuthStore } from "../stores/useAuthStore";

type Mode = "login" | "signup";

export default function AccountSheet({ onClose }: { onClose: () => void }) {
  const session = useAuthStore((s) => s.session);
  const syncing = useAuthStore((s) => s.syncing);
  const signIn = useAuthStore((s) => s.signIn);
  const signUp = useAuthStore((s) => s.signUp);
  const signOut = useAuthStore((s) => s.signOut);

  const [mode, setMode] = useState<Mode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState<"idle" | "submitting" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");

  if (session) {
    return (
      <Sheet onClose={onClose} title="Account">
        <div className="flex flex-col items-center gap-3 py-2 mb-5">
          <div
            className="w-14 h-14 rounded-full flex items-center justify-center"
            style={{
              background: "rgba(185,164,255,0.15)",
              border: "1px solid rgba(185,164,255,0.4)",
            }}
          >
            <Cloud size={24} className="text-accent" />
          </div>
          <div className="text-center">
            <p className="text-ink text-[15px]">{session.user.email}</p>
            <p className="text-ink-muted text-[12px] mt-1">
              {syncing ? "Sync in corso..." : "Sync attivo · backup cloud"}
            </p>
          </div>
        </div>

        <button
          onClick={async () => {
            await signOut();
            onClose();
          }}
          className="btn-ghost w-full inline-flex items-center justify-center gap-2"
        >
          <LogOut size={16} />
          Esci
        </button>
      </Sheet>
    );
  }

  async function submit() {
    const e = email.trim();
    if (!e || !password) return;
    if (password.length < 6) {
      setStatus("error");
      setErrorMsg("La password deve essere almeno 6 caratteri.");
      return;
    }
    setStatus("submitting");
    setErrorMsg("");
    const fn = mode === "login" ? signIn : signUp;
    const { error } = await fn(e, password);
    if (error) {
      setStatus("error");
      setErrorMsg(error);
    } else {
      onClose();
    }
  }

  return (
    <Sheet onClose={onClose} title={mode === "login" ? "Login" : "Crea account"}>
      <p className="text-ink-muted text-[13px] mb-4">
        {mode === "login"
          ? "Accedi per attivare il sync cloud."
          : "Crea il tuo account. Bastano email e password (min 6 caratteri)."}
      </p>

      <div className="relative mb-2.5">
        <Mail
          size={16}
          className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-quiet"
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
          placeholder="tu@email.com"
          className="input w-full pl-10"
        />
      </div>

      <div className="relative mb-3">
        <Lock
          size={16}
          className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-quiet"
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
          className="input w-full pl-10"
        />
      </div>

      {status === "error" && (
        <p className="text-sys-red text-[12px] mb-3">{errorMsg}</p>
      )}

      <button
        onClick={submit}
        disabled={status === "submitting" || !email.trim() || !password}
        className="btn-primary w-full disabled:opacity-50 mb-3"
      >
        {status === "submitting"
          ? mode === "login"
            ? "Accesso..."
            : "Creazione..."
          : mode === "login"
            ? "Accedi"
            : "Crea account"}
      </button>

      <button
        onClick={() => {
          setMode(mode === "login" ? "signup" : "login");
          setErrorMsg("");
          setStatus("idle");
        }}
        className="text-ink-muted text-[13px] w-full py-2 active:opacity-70 transition-opacity"
      >
        {mode === "login"
          ? "Non hai un account? Creane uno"
          : "Hai già un account? Accedi"}
      </button>
    </Sheet>
  );
}

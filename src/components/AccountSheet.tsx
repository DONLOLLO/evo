import { Cloud, LogOut } from "lucide-react";
import { Sheet } from "../pages/Missions";
import { useAuthStore } from "../stores/useAuthStore";

export default function AccountSheet({ onClose }: { onClose: () => void }) {
  const session = useAuthStore((s) => s.session);
  const syncing = useAuthStore((s) => s.syncing);
  const signOut = useAuthStore((s) => s.signOut);

  if (!session) {
    // L'app reindirizza già a /welcome quando non c'è sessione,
    // quindi questo è un fallback difensivo.
    return (
      <Sheet onClose={onClose} title="Account">
        <p className="text-ink-muted text-[13px] py-3">
          Non sei loggato.
        </p>
      </Sheet>
    );
  }

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

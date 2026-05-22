import { useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { useNavigate } from "react-router-dom";
import { db } from "../db/database";
import Layout from "../components/Layout";
import AreasSheet from "../components/AreasSheet";
import AccountSheet from "../components/AccountSheet";
import WeeklyReviewSheet from "../components/WeeklyReviewSheet";
import { useAuthStore } from "../stores/useAuthStore";
import { weekStartISO } from "../lib/date";
import {
  ChevronRight,
  Cloud,
  CloudOff,
  Layers,
  Bell,
  Globe,
  CreditCard,
  Download,
  Sparkles,
  CalendarCheck,
} from "lucide-react";

type Section = {
  icon: React.ComponentType<{ size?: number; className?: string; strokeWidth?: number }>;
  title: string;
  subtitle?: string;
  badge?: string;
  onClick?: () => void;
  disabled?: boolean;
  accent?: string;
};

export default function Settings() {
  const navigate = useNavigate();
  const cloudConfigured = useAuthStore((s) => s.configured);
  const session = useAuthStore((s) => s.session);
  const syncing = useAuthStore((s) => s.syncing);

  const [openSheet, setOpenSheet] = useState<
    "areas" | "account" | "review" | null
  >(null);
  const weeklyReviews = useLiveQuery(() => db.weeklyReviews.toArray(), []);
  const currentWeekStart = weekStartISO();
  const thisWeekReview = (weeklyReviews ?? []).find(
    (w) => w.weekStart === currentWeekStart,
  );

  async function exportData() {
    const dump = {
      version: 1,
      exportedAt: new Date().toISOString(),
      areas: await db.areas.toArray(),
      stats: await db.stats.toArray(),
      statHistory: await db.statHistory.toArray(),
      routineBlocks: await db.routineBlocks.toArray(),
      routineChecks: await db.routineChecks.toArray(),
      skills: await db.skills.toArray(),
      skillResources: await db.skillResources.toArray(),
      skillActions: await db.skillActions.toArray(),
      missions: await db.missions.toArray(),
      roadmap: await db.roadmap.toArray(),
      laws: await db.laws.toArray(),
      victories: await db.victories.toArray(),
      vision: await db.vision.toArray(),
      checkins: await db.checkins.toArray(),
      settings: await db.settings.toArray(),
      people: await db.people.toArray(),
      touchpoints: await db.touchpoints.toArray(),
      challenges: await db.challenges.toArray(),
      challengeLogs: await db.challengeLogs.toArray(),
    };
    const blob = new Blob([JSON.stringify(dump, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `evo-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const accountSection: Section = session
    ? {
        icon: Cloud,
        title: session.user.email ?? "Account",
        subtitle: syncing ? "Sync in corso..." : "Sync attivo · backup cloud",
        accent: "#b9a4ff",
        onClick: () => setOpenSheet("account"),
      }
    : {
        icon: CloudOff,
        title: cloudConfigured ? "Accedi" : "Backend non configurato",
        subtitle: cloudConfigured
          ? "Sincronizza i dati nel cloud e tra dispositivi"
          : "Manca configurazione Supabase",
        accent: cloudConfigured ? "#b9a4ff" : "#666",
        onClick: cloudConfigured ? () => setOpenSheet("account") : undefined,
        disabled: !cloudConfigured,
      };

  const sections: { group: string; items: Section[] }[] = [
    {
      group: "Account",
      items: [accountSection],
    },
    {
      group: "Ritmo",
      items: [
        {
          icon: CalendarCheck,
          title: thisWeekReview ? "Review settimana (fatta)" : "Review settimana",
          subtitle: thisWeekReview
            ? "Riapri per modificare la riflessione"
            : "Chiudi la settimana con i numeri e 3 prompt",
          accent: "#b9a4ff",
          onClick: () => setOpenSheet("review"),
        },
      ],
    },
    {
      group: "Personalizza",
      items: [
        {
          icon: Layers,
          title: "Aree",
          subtitle: "Crea, rinomina, riassegna colori",
          accent: "#5dd4c4",
          onClick: () => setOpenSheet("areas"),
        },
        {
          icon: Bell,
          title: "Notifiche",
          subtitle: "Mattina · sera · routine",
          badge: "in arrivo",
          accent: "#e89a5d",
          disabled: true,
        },
        {
          icon: Globe,
          title: "Lingua",
          subtitle: "Italiano",
          badge: "in arrivo",
          accent: "#5d9ae8",
          disabled: true,
        },
      ],
    },
    {
      group: "Piano",
      items: [
        {
          icon: CreditCard,
          title: "EVO Free",
          subtitle: "Passa a Pro per features avanzate",
          badge: "in arrivo",
          accent: "#FFD479",
          disabled: true,
        },
      ],
    },
    {
      group: "Dati",
      items: [
        {
          icon: Download,
          title: "Esporta backup",
          subtitle: "Scarica tutti i tuoi dati in JSON",
          accent: "#7ad48b",
          onClick: exportData,
        },
      ],
    },
    {
      group: "Info",
      items: [
        {
          icon: Sparkles,
          title: "EVO",
          subtitle: "v1.0 · La bussola interna",
          accent: "#b9a4ff",
          disabled: true,
        },
      ],
    },
  ];

  return (
    <Layout title="Impostazioni">
      <div className="mb-5 mt-1">
        <h1 className="display text-[36px] leading-none text-ink">Impostazioni</h1>
        <p className="text-ink-muted text-[13px] mt-1.5">
          Personalizza EVO come vuoi tu
        </p>
      </div>

      <div className="space-y-5">
        {sections.map((section) => (
          <div key={section.group}>
            <p className="eyebrow mb-2">{section.group}</p>
            <ul className="space-y-1.5">
              {section.items.map((item, i) => (
                <SectionRow key={`${section.group}-${i}`} item={item} />
              ))}
            </ul>
          </div>
        ))}

        <div className="pt-2">
          <button
            onClick={() => navigate("/")}
            className="btn-ghost w-full"
          >
            Torna alla Home
          </button>
        </div>
      </div>

      {openSheet === "areas" && (
        <AreasSheet onClose={() => setOpenSheet(null)} />
      )}
      {openSheet === "account" && (
        <AccountSheet onClose={() => setOpenSheet(null)} />
      )}
      {openSheet === "review" && (
        <WeeklyReviewSheet
          weekStart={currentWeekStart}
          existing={thisWeekReview}
          onClose={() => setOpenSheet(null)}
        />
      )}
    </Layout>
  );
}

function SectionRow({ item }: { item: Section }) {
  const Icon = item.icon;
  const accent = item.accent ?? "#b9a4ff";
  const isClickable = !!item.onClick && !item.disabled;

  const content = (
    <div className="card !p-3.5 flex items-center gap-3.5">
      <div
        className="w-10 h-10 rounded-2xl flex-shrink-0 flex items-center justify-center"
        style={{
          background: `${accent}1f`,
          border: `0.5px solid ${accent}55`,
        }}
      >
        <Icon size={18} strokeWidth={1.8} className="text-ink" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="text-[15px] font-medium text-ink truncate">
            {item.title}
          </p>
          {item.badge && (
            <span
              className="chip text-[10px] uppercase tracking-wider"
              style={{
                color: "rgba(255,255,255,0.55)",
                background: "rgba(255,255,255,0.06)",
                borderColor: "rgba(255,255,255,0.10)",
              }}
            >
              {item.badge}
            </span>
          )}
        </div>
        {item.subtitle && (
          <p className="text-[12.5px] text-ink-muted mt-0.5 truncate">
            {item.subtitle}
          </p>
        )}
      </div>
      {isClickable && (
        <ChevronRight size={16} className="text-ink-quiet flex-shrink-0" />
      )}
    </div>
  );

  if (isClickable) {
    return (
      <li>
        <button
          onClick={item.onClick}
          className="w-full text-left active:scale-[0.99] transition-transform"
        >
          {content}
        </button>
      </li>
    );
  }
  return (
    <li className={item.disabled ? "opacity-60" : ""}>
      {content}
    </li>
  );
}


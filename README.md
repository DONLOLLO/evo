# EVO

> Il tuo evo. La bussola interna per chi vuole vivere la propria epoca.

PWA personale single-user per tracciare la vita come scheda personaggio:
ambizione, disciplina, rituali, missioni, follow-up con le persone, sfide a tempo, leggi personali.

## Stack

- React 19 + Vite 8 + TypeScript
- Tailwind + Liquid Glass design system
- Zustand (state) · Dexie (IndexedDB storage) · Recharts · Framer Motion
- PWA installabile (offline-first, iPhone-ready)

## Sezioni

| Tab | Cosa | Note |
|---|---|---|
| Oggi | hero della giornata | check-in serale, leggi del giorno, tile Sfida + Da sentire |
| Missioni | todolist con 3 priorità | filtri per stato e area |
| Routine | blocchi della giornata + **Sfida** | sfida = patto a tempo con check-in giornaliero |
| Rete | follow-up persone | raggruppati per giorno, canali (msg/call/email/persona) |
| Rotta | direzione della vita | timeline 5 fasi: Adesso → Visione |
| Skill | albero abilità | risorse + azioni promovibili a missione |
| Stats | attributi personali | radar + storico nel tempo |
| Motivation | leggi + visione + vittorie | tasto SOS per i giorni neri |

## Dev

```sh
npm install
npm run dev
# → http://localhost:5173
```

## Deploy

Push su `main` → GitHub Actions costruisce e pubblica su GitHub Pages automaticamente.

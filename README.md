# Routine Tracker

**Your gym session, exactly as focused as you are.**

A self-hosted progressive web app that handles the boring parts of training — logging sets, tracking rest, watching progress — so you can stay in the zone.

No account. No subscription. No cloud. Your data lives on your device.

---

## Why this exists

Every major fitness app is either bloated with social features you don't need, locked behind a paywall after two weeks, or designed to sell you something. This one isn't.

Routine Tracker is a single-purpose tool built around one program: a 4-day Upper/Lower split. It does that job exceptionally well and nothing else. The interface gets out of the way. The numbers are big. The flow is fast.

---

## What it actually does for you

**During a session**

- Walks you through each exercise with set-by-set logging — weight and reps
- Detects personal records in real time and flashes them gold
- Starts a rest timer the moment you complete a set, with haptic + audio feedback
- Saves your progress automatically so a browser crash or phone lock never loses a set
- Shows you exactly what you lifted last time, right next to the input
- Lets you swap an exercise during the session while keeping the real exercise in the log

**Between sessions**

- Sunday check-in: weight, waist measurement, photos flag — takes under 3 minutes
- Sparkline charts showing your weight and waist trends over months
- Full exercise history with per-exercise volume progression
- Session log with every set, filterable by exercise
- Editable program, weekly schedule, and exercise library from the settings

**Always**

- Offline-first — works without internet once loaded
- Zero trackers, zero telemetry, zero external requests after fonts load
- Export / import as JSON — your data is yours, always

---

## Get started

```bash
docker compose up -d
```

Then open [http://localhost](http://localhost). That's it.

The app runs as a static build served by nginx — no database, no backend, no environment variables to configure.

---

## The program

The default program is 4 sessions per week, structured as two Upper/Lower pairs. It can be edited in the app settings:

| Day | Session |
|---|---|
| Monday | Upper A — Chest press, Lat pulldown, Row, Shoulder press, Laterals, Triceps, Curls |
| Tuesday | Lower A — Leg press, Romanian deadlift, Leg curl, Leg extension, Calves, Core |
| Thursday | Upper B — Incline press, Chest-supported row, Pull-down, Pec deck, Rear delts, Dips, Hammer curls |
| Friday | Lower B — Squat, Hip thrust, Bulgarian split squat, Leg curl, Calves, Core |
| Sunday | Check-in — Weight, waist, progress photos |

Each exercise ships with recommended rep ranges and RIR (Reps in Reserve) targets. Rest durations are pre-set per exercise — compounds get more, isolation gets less.

---

## Privacy by design

All data is stored in your browser's localStorage. Nothing is sent anywhere. The app can be served from a local machine, a home server, or a VPS — but in every case, the data stays client-side.

The JSON export feature exists for exactly this reason: if you clear your browser cache or switch devices, you have a full backup in one file.

---

## Self-hosting

The `docker-compose.yml` at the root is the full deployment setup. It builds the app and serves it on port 80 via nginx.

```yaml
services:
  app:
    build: .
    ports:
      - "80:80"
    restart: unless-stopped
```

To run on a different port:

```bash
docker compose up -d  # default: port 80
```

Or edit the ports line to `"8080:80"` for port 8080, then `docker compose up -d`.

To update after pulling changes:

```bash
docker compose up -d --build
```

---

## Local development

```bash
npm install
npm run dev
```

Runs on `http://localhost:3000` with hot reload.

---

*Built to be used, not admired. Open the app, lift the weights, close the app.*

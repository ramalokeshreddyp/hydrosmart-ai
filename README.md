<p align="center">
  <img src="https://img.shields.io/badge/💧_HydroSmart-Intelligent_Hydration-0891b2?style=for-the-badge&labelColor=0f172a" alt="HydroSmart" />
</p>

<h1 align="center">💧 HydroSmart — Intelligent Hydration Tracker</h1>

<p align="center">
  <strong>A weather-adaptive, AI-powered hydration companion that personalizes your daily water intake goals based on real-time weather, sleep quality, exercise intensity, and body metrics.</strong>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/React-18.3-61DAFB?style=flat-square&logo=react&logoColor=white" alt="React" />
  <img src="https://img.shields.io/badge/TypeScript-5.8-3178C6?style=flat-square&logo=typescript&logoColor=white" alt="TypeScript" />
  <img src="https://img.shields.io/badge/Vite-5.4-646CFF?style=flat-square&logo=vite&logoColor=white" alt="Vite" />
  <img src="https://img.shields.io/badge/Tailwind_CSS-3.4-06B6D4?style=flat-square&logo=tailwindcss&logoColor=white" alt="Tailwind" />
  <img src="https://img.shields.io/badge/Framer_Motion-12-FF0055?style=flat-square&logo=framer&logoColor=white" alt="Framer Motion" />
  <img src="https://img.shields.io/badge/Recharts-2.15-FF6B6B?style=flat-square" alt="Recharts" />
  <img src="https://img.shields.io/badge/License-MIT-green?style=flat-square" alt="License" />
</p>

---

## 📋 Table of Contents

- [Project Overview](#-project-overview)
- [Key Features](#-key-features)
- [Tech Stack](#-tech-stack)
- [Architecture Overview](#-architecture-overview)
- [Execution Flow](#-execution-flow)
- [Project Structure](#-project-structure)
- [Getting Started](#-getting-started)
- [Usage Guide](#-usage-guide)
- [Hydration Algorithm](#-hydration-algorithm)
- [Gamification System](#-gamification-system)
- [Contributing](#-contributing)

---

## 🌟 Project Overview

**HydroSmart** solves the universal problem of inconsistent hydration by creating a **personalized, adaptive hydration plan** that evolves with your lifestyle. Unlike static water trackers, HydroSmart dynamically adjusts goals based on:

| Factor | Impact |
|--------|--------|
| 🌡️ **Real-time weather** | Temperature & humidity via OpenWeatherMap API |
| 🏋️ **Exercise intensity** | Light/Moderate/Vigorous → +200–600ml per session |
| 😴 **Sleep quality** | Poor sleep → +300ml; Short sleep (<6h) → +200ml |
| ⚖️ **Body metrics** | 35ml per kg body weight baseline |
| 🏃 **Activity level** | Sedentary (1.0×) to Intense (1.5× multiplier) |

---

## ✨ Key Features

```
┌─────────────────────────────────────────────────────────┐
│  🎯 Smart Goal Engine    │  Dynamic daily targets       │
│  🌦️ Weather Integration  │  Real-time climate adaptation │
│  😴 Sleep Tracking       │  Quality & duration logging   │
│  🏋️ Activity Tracking    │  Exercise-based adjustments   │
│  📊 Weekly Analytics     │  7-day intake visualization   │
│  🏆 Gamification         │  Badges, streaks, milestones  │
│  🔔 Smart Reminders      │  Browser notification system  │
│  📱 Responsive Design    │  Mobile-first, touch-ready    │
│  🛡️ Error Boundary       │  Graceful crash recovery      │
│  🎨 Glass Morphism UI    │  Modern, polished aesthetics  │
└─────────────────────────────────────────────────────────┘
```

---

## 🛠️ Tech Stack

| Category | Technology | Purpose |
|----------|-----------|---------|
| **Framework** | React 18 | Component-based UI with hooks |
| **Language** | TypeScript 5 | Type safety & developer experience |
| **Build Tool** | Vite 5 | Lightning-fast HMR & bundling |
| **Styling** | Tailwind CSS 3 | Utility-first responsive design |
| **Animations** | Framer Motion 12 | Fluid, physics-based transitions |
| **Charts** | Recharts 2 | Composable data visualization |
| **UI Components** | shadcn/ui + Radix | Accessible, headless primitives |
| **Routing** | React Router 6 | Client-side navigation |
| **State** | React Query + localStorage | Server state + persistence |
| **Weather API** | OpenWeatherMap | Global weather and humidity data |
| **Testing** | Vitest + Playwright | Unit & E2E testing |
| **Fonts** | Plus Jakarta Sans + Space Grotesk | Modern typography pair |

---

## 🏗️ Architecture Overview

```mermaid
graph TB
    subgraph Client["🖥️ Client Application"]
        App["App.tsx<br/>Root + Providers"]
        EB["ErrorBoundary<br/>Crash Recovery"]
        Dashboard["Dashboard<br/>Main Orchestrator"]

        subgraph Components["UI Components"]
            PS["ProfileSetup"]
            WP["WaterProgress"]
            QA["QuickAdd"]
            WC["WeatherCard"]
            ST["SleepTracker"]
            AT["ActivityTracker"]
            RC["ReminderControl"]
            GP["GamificationPanel"]
            WK["WeeklyChart"]
        end

        subgraph Logic["Business Logic"]
            HE["hydration.ts<br/>Goal Engine"]
            WF["weather.ts<br/>API Client"]
            GF["gamification.ts<br/>Badge System"]
            NF["notifications.ts<br/>Reminders"]
        end
    end

    subgraph External["🌐 External"]
        OWM["OpenWeatherMap API"]
        LS["localStorage<br/>Persistence Layer"]
        BN["Browser Notifications<br/>Push Reminders"]
    end

    App --> EB --> Dashboard
    Dashboard --> Components
    Dashboard --> Logic
    WF --> OWM
    HE --> LS
    NF --> BN
    ST --> LS
    AT --> LS

    style Client fill:#0f172a,stroke:#0891b2,color:#e2e8f0
    style Components fill:#1e293b,stroke:#0891b2,color:#e2e8f0
    style Logic fill:#1e293b,stroke:#0891b2,color:#e2e8f0
    style External fill:#0c4a6e,stroke:#38bdf8,color:#e2e8f0
```

---

## 🔄 Execution Flow

### Application Boot Sequence

```mermaid
sequenceDiagram
    participant U as User
    participant A as App.tsx
    participant D as Dashboard
    participant H as hydration.ts
    participant W as weather.ts
    participant LS as localStorage

    U->>A: Open HydroSmart
    A->>D: Render Dashboard
    D->>LS: getProfile()
    alt No Profile
        D->>U: Show ProfileSetup
        U->>D: Submit profile data
        D->>LS: saveProfile()
    end
    D->>W: fetchWeather(city)
    W-->>D: WeatherData
    D->>LS: getTodaySleepLog()
    D->>LS: getTodayActivities()
    D->>H: calculateDailyGoal(profile, weather, sleep, activities)
    H-->>D: goalMl (rounded to 50)
    D->>U: Render full dashboard
```

### Water Intake Flow

```mermaid
sequenceDiagram
    participant U as User
    participant QA as QuickAdd
    participant H as hydration.ts
    participant G as gamification.ts
    participant D as Dashboard

    U->>QA: Tap "250ml" button
    QA->>H: addIntakeLog(250)
    H->>H: Store in localStorage
    QA->>D: onAdd() callback
    D->>H: getTodayLogs()
    D->>G: computeStats(allLogs, goal)
    G->>G: Check badge conditions
    G-->>D: HydrationStats + newBadges
    D->>U: Update progress ring + toast
```

### Hydration Goal Calculation

```mermaid
flowchart LR
    A["Body Weight<br/>35ml × kg"] --> B["Base Goal<br/>min 2500ml"]
    B --> C{"Activity Level"}
    C -->|Sedentary| D["× 1.0"]
    C -->|Moderate| E["× 1.2"]
    C -->|Intense| F["× 1.5"]
    D & E & F --> G{"Weather"}
    G -->|">30°C"| H["+50ml per °C"]
    G -->|"Low Humidity"| I["+150–300ml"]
    G -->|Normal| J["+0ml"]
    H & I & J --> K{"Sleep Quality"}
    K -->|Poor| L["+300ml"]
    K -->|"<6h"| M["+200ml"]
    K -->|Good| N["+0ml"]
    L & M & N --> O{"Exercise"}
    O --> P["Per session:<br/>Light +200ml/30min<br/>Moderate +400ml/30min<br/>Vigorous +600ml/30min"]
    P --> Q["🎯 Final Goal<br/>(rounded to 50ml)"]
```

---

## 📁 Project Structure

```
hydrosmart/
├── public/
│   ├── placeholder.svg          # Default image placeholder
│   └── robots.txt               # SEO crawl directives
├── src/
│   ├── components/
│   │   ├── ui/                  # shadcn/ui primitives (40+ components)
│   │   ├── ActivityTracker.tsx   # Exercise logging with intensity
│   │   ├── BadgeUnlockToast.tsx  # Achievement notification popup
│   │   ├── Dashboard.tsx         # Main orchestrator component
│   │   ├── ErrorBoundary.tsx     # Global error recovery
│   │   ├── GamificationPanel.tsx # Badges, streaks, progress
│   │   ├── NavLink.tsx           # Navigation helper
│   │   ├── ProfileSetup.tsx      # Onboarding form
│   │   ├── QuickAdd.tsx          # Water intake buttons
│   │   ├── ReminderControl.tsx   # Notification settings
│   │   ├── SleepTracker.tsx      # Sleep quality & hours
│   │   ├── WaterProgress.tsx     # Circular progress ring
│   │   ├── WeatherCard.tsx       # Weather display widget
│   │   └── WeeklyChart.tsx       # 7-day bar chart
│   ├── lib/
│   │   ├── gamification.ts       # Badge engine & stats
│   │   ├── hydration.ts          # Core goal algorithm
│   │   ├── notifications.ts      # Browser push system
│   │   ├── utils.ts              # Tailwind merge utilities
│   │   └── weather.ts            # OpenWeatherMap API client
│   ├── pages/
│   │   ├── Index.tsx             # Landing route
│   │   └── NotFound.tsx          # 404 page
│   ├── App.tsx                   # Root with providers
│   ├── index.css                 # Design tokens & global styles
│   └── main.tsx                  # Entry point
├── architecture.md               # System architecture docs
├── projectdocumentation.md       # Full project documentation
├── index.html                    # HTML shell with SEO meta
├── tailwind.config.ts            # Tailwind theme config
├── vite.config.ts                # Build configuration
├── vitest.config.ts              # Test configuration
├── tsconfig.json                 # TypeScript config
└── package.json                  # Dependencies & scripts
```

---

## 🚀 Getting Started

### Prerequisites

- **Node.js** ≥ 18.0.0
- **npm** ≥ 9.0.0 (or **bun** ≥ 1.0)

### Installation

```bash
# 1. Clone the repository
git clone https://github.com/your-username/hydrosmart.git
cd hydrosmart

# 2. Install dependencies
npm install

# 3. Start the development server
npm run dev
```

The app will be available at `http://localhost:5173`

### Available Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start dev server with HMR |
| `npm run build` | Production build to `dist/` |
| `npm run preview` | Preview production build |
| `npm run lint` | Run ESLint checks |
| `npm run test` | Run Vitest unit tests |

### Build for Production

```bash
npm run build
# Output in dist/ — ready for static hosting (Vercel, Netlify, etc.)
```

---

## 📖 Usage Guide

### 1️⃣ Profile Setup
Enter your name, weight (kg), age, city, wake/sleep times, and activity level. This creates your personalized hydration baseline.

### 2️⃣ Log Water Intake
Use quick-add buttons (150ml, 250ml, 500ml) or enter a custom amount. Each entry updates your progress ring in real-time.

### 3️⃣ Track Sleep
Log last night's sleep hours and quality (poor → excellent). Poor or short sleep automatically increases your hydration target.

### 4️⃣ Log Activities
Add exercises with type, duration, and intensity. Vigorous 30-minute sessions add +600ml to your daily goal.

### 5️⃣ Monitor Progress
- **Progress Ring**: Visual completion percentage with animated fill
- **Weekly Chart**: 7-day bar chart with goal line overlay
- **Badges**: Unlock achievements for streaks, volume milestones, and consistency

### 6️⃣ Enable Reminders
Toggle browser notifications for periodic hydration reminders spaced evenly across your waking hours.

---

## 🧮 Hydration Algorithm

The core algorithm in `src/lib/hydration.ts` computes a personalized daily goal:

```
Final Goal = round50(
  max(weight × 35, 2500)
  × activityMultiplier
  + weatherBonus(temp, humidity)
  + sleepPenalty(quality, hours)
  + Σ exerciseBonus(intensity, duration)
)
```

| Variable | Formula |
|----------|---------|
| **Base** | `max(weight_kg × 35, 2500)` ml |
| **Activity** | × 1.0 (sedentary) to × 1.5 (intense) |
| **Heat** | +50ml per °C above 30°C; +25ml per °C above 25°C |
| **Low Humidity** | +300ml (<30%) or +150ml (<50%) |
| **Poor Sleep** | +300ml; <6 hours adds +200ml |
| **Exercise** | Light: +200ml, Moderate: +400ml, Vigorous: +600ml per 30 min |

---

## 🏆 Gamification System

### Badge Tiers

| Tier | Badges | Examples |
|------|--------|----------|
| 🥉 **Bronze** | 5 | First Sip, Consistent (3-day), Halfway, Week One, 10L Total |
| 🥈 **Silver** | 4 | On Fire (7-day), Goal Crusher, 50L Total, Monthly |
| 🥇 **Gold** | 4 | Unstoppable (14-day), Overachiever, Ocean (100L), 10 Goals |
| 💎 **Diamond** | 1 | Legend (30-day streak) |

### Streak Logic
Streaks count consecutive days where total intake ≥ daily goal. If today has no logs, the streak starts counting from yesterday to avoid penalizing users early in the day.

---

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing`)
5. Open a Pull Request

---

<p align="center">
  Built with 💧 and ❤️ using <strong>React</strong>, <strong>TypeScript</strong>, and <strong>Tailwind CSS</strong>
</p>

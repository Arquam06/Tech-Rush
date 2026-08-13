# AI Workplace OS — Hackathon Edition

> **Domain:** AI in Workplace — HR and Team Dynamics  
> **Tagline:** A workplace that understands its own work.

---

## 🌟 Overview

**AI Workplace OS** is an intelligent, connected workplace ecosystem that unifies meetings, project management, tasks, HR analytics, team health, employee workloads, contributions, and decision simulation into a single AI-driven system.

### Core Problem
Modern workplaces rely on disconnected tools (Slack, Jira, Zoom, HRMS, Notion). Problems like employee overload, project bottlenecks, dependency failures, and unassigned action items are discovered too late.

### Core Solution
AI Workplace OS creates a continuous intelligence loop:
```
Meeting ➔ Decisions ➔ Tasks ➔ AI Monitoring ➔ Risk Detection ➔ Prediction ➔ Decision Simulation ➔ Human Approval ➔ Action ➔ Contribution & Rewards ➔ History ➔ Organizational Learning
```

---

## 🚀 Tech Stack

- **Frontend:** React, Vite, Tailwind CSS, Lucide React, Recharts
- **Backend:** Node.js, Express.js, Socket.IO
- **Database:** PostgreSQL via Supabase *(No MongoDB)*
- **AI:** Google Gemini API (`@google/generative-ai`)
- **Realtime / Audio Video:** Socket.IO & WebRTC

---

## 📁 Repository Structure

```
AI-Workplace-OS/
├── frontend/             # React + Vite Client
│   ├── src/
│   │   ├── components/   # Layout, Sidebar, Topbar
│   │   ├── pages/        # Dashboard, AI Agent, Projects, Tasks, Team, Meetings, etc.
│   │   ├── contexts/     # AuthContext (Supabase Auth)
│   │   └── lib/          # API Client (Axios)
│   ├── .env.local
│   └── vite.config.ts
├── backend/              # Node.js + Express API
│   ├── server.js         # Express + Socket.IO Server
│   ├── src/
│   │   ├── routes/       # Auth, Employees, Projects, Tasks, Teams, AI, Meetings, etc.
│   │   ├── services/     # Risk Engine, Team Health, Contribution Points, AI Service
│   │   ├── middleware/   # Auth JWT & Error Handler
│   │   └── lib/          # Gemini AI & Supabase Client
│   └── .env
├── database/
│   ├── schema.sql        # Full PostgreSQL Schema (DDL)
│   └── seed.sql          # Demo Seed Data
├── .env.example
└── README.md
```

---

## 🛠️ Quick Start

### 1. Database Setup
Execute `database/schema.sql` and `database/seed.sql` in your **Supabase SQL Editor**.

### 2. Backend Setup
```bash
cd backend
npm install
cp .env.example .env
# Fill in SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, and GEMINI_API_KEY
npm run dev
```
- API Server: `http://localhost:3001`
- Health check: `http://localhost:3001/api/health`

### 3. Frontend Setup
```bash
cd frontend
npm install
cp .env.local.example .env.local
# Fill in VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY
npm run dev
```
- Frontend App: `http://localhost:5173`

---

## 🎯 Key Wow Features

1. **AI Workplace Agent:** Context-aware assistant trained on authorized live workplace data.
2. **What-If Decision Simulator:** Allows managers to simulate task reassignment or deadline changes before committing them.
3. **AI Project Recovery Agent:** Auto-detects project risk and proposes multi-step recovery plans.
4. **AI Meeting Room & Intelligence:** Extracts decisions, action items, owners, and risks automatically from meetings.
5. **Team Health Digital Twin:** Computes multi-dimensional team operational health.
6. **Smart Workload Balancer:** Accounts for task complexity, priority, dependencies, and deadlines.
7. **Contribution Engine & Rewards:** Awards explainable points and tracks progress toward rewards.
8. **Complete Work History:** Persistent audit timeline serving as the organization's memory layer.

---

## 🔒 Security & Privacy
- All AI calls involving secrets happen strictly server-side.
- Supabase service-role keys are never exposed to the client.
- `.env` files are ignored in git.

---

## 📄 License
MIT License - Built for the Hackathon 2026.

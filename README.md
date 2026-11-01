# AquaSolve™ — Environmental Chemistry-Based Water Quality Analysis and Treatment System

AquaSolve is a full-stack, interactive environmental chemistry web application that transforms raw water measurements into chemical diagnoses, algorithmic multi-stage treatment trains, virtual treatment plant simulations, and publication-ready reports.

---

## 🌊 Central Workflow

```text
Enter Water Data ➔ Validate ➔ Analyze ➔ Diagnose ➔ Explain Chemistry ➔ Recommend Treatment ➔ Simulate Virtual Plant ➔ Compare What-If Scenarios ➔ Generate PDF/CSV Report
```

---

## 🚀 Key Features

1. **Water Quality Input Module**:
   - Supports 10+ core physical, chemical, and heavy metal parameters: pH, Turbidity, Total Dissolved Solids (TDS), Total Hardness, Nitrate, Chloride, Dissolved Oxygen, Lead, Arsenic, and Iron.
   - Configurable for 8 water sources (Borewell, Municipal, River, Lake, Pond, Groundwater, Industrial, etc.) and multiple usage contexts (Drinking, Domestic, Irrigation, Industrial).
   - Pre-loaded with 5 realistic synthetic demonstration datasets (Datasets A, B, C, D, E) representing diverse hydrogeological profiles.

2. **Standards Evaluation Engine**:
   - Compares measurements against verified regulatory standards:
     - **Bureau of Indian Standards (BIS IS 10500:2012)**
     - **World Health Organization Guidelines (WHO 2022, 4th Ed.)**
     - **US EPA National Primary & Secondary Drinking Water Regulations**
   - Distinguishes desirable limits, permissible limits in the absence of an alternate source, operational benchmarks, and health-based maximum contaminant levels (MCLs).

3. **Environmental Chemistry Knowledge Base**:
   - Deep scientific explanations of aqueous chemistry: hydrogen ion activity ($pH = -\log_{10}[H^+]$), carbonate buffering equilibrium, colloidal stability & zeta potential, multivalent cation hardness, nitrogen oxidation states, dissolved gas transfer kinetics, and heavy metal hydroxide solubility products ($K_{sp}$).

4. **Intelligent Sequenced Recommendation Engine**:
   - Algorithmic construction of multi-stage treatment trains respecting chemical engineering hierarchies:
     - *Pre-Treatment (Aeration) ➔ Chemical Destabilization (Coagulation/Flocculation) ➔ Clarification (Sedimentation) ➔ Media Filtration (Rapid Sand / Ultrafiltration) ➔ Adsorption (Granular Activated Carbon) ➔ Demineralization / Desalination (Ion Exchange / Reverse Osmosis) ➔ Chemical Stabilization (Neutralization) ➔ Terminal Barrier (Disinfection)*
   - Detects multiple simultaneous concerns, explains the rationale for every stage, highlights engineering prerequisites, and flags secondary effects (e.g. alum alkalinity consumption or RO permeate acidity).

5. **Interactive Virtual Treatment Plant (Simulator)**:
   - Built with **React Flow** (`@xyflow/react`) featuring custom graphical nodes, color-coded process categories, and animated cyan hydraulic streams.
   - Users can drag, reorder, add, remove, and toggle any of the 14 treatment technologies.
   - Interactive slide-over Chemical Dossier drawer for real-time inspection of process mechanisms and stage-specific parameter shifts.
   - Sequence violation warning system (e.g., alerts when high-turbidity water enters reverse osmosis membranes without prior filtration).

6. **What-If Scenario Comparison**:
   - Side-by-side comparison of alternative treatment configurations (e.g., Scenario A: RO complete train vs. Scenario B: Ion exchange softener only).
   - Computes delta variance, residual contaminant risks, capital footprint trade-offs, and automated engineering recommendations.

7. **Before & After Visual Comparison Dashboard**:
   - Visual comparison charts powered by **Recharts**.
   - Normalized and unit-separated telemetry scales preventing false comparisons between logarithmic pH, optical NTU, and high-concentration mg/L salts.
   - Full before-and-after audit table with net delta computations.

8. **Deliverables & Report Suite**:
   - Server-side multi-page PDF generation via **ReportLab**.
   - Structured CSV export with complete measurement and delta records.
   - Database-backed sample history powered by SQLite and SQLAlchemy.

---

## 🛠️ Technology Stack

| Layer | Technologies |
|---|---|
| **Frontend** | React 18, Vite, TypeScript, Tailwind CSS, React Flow (`@xyflow/react`), Recharts, Lucide React |
| **Backend** | Python 3.13, FastAPI, Pydantic v2, SQLAlchemy, Uvicorn |
| **Database** | SQLite (development / local persistence) • PostgreSQL ready |
| **Document Engine** | ReportLab 5.0 (vector PDF) • Python CSV |
| **Testing** | Pytest, FastAPI TestClient, Vitest |

---

## 📂 Project Structure

```text
AquaSolveAg/
├── backend/
│   ├── app/
│   │   ├── api/
│   │   │   └── routes/
│   │   │       ├── analysis.py
│   │   │       ├── recommendations.py
│   │   │       ├── simulation.py
│   │   │       ├── scenarios.py
│   │   │       ├── reports.py
│   │   │       ├── samples.py
│   │   │       └── health.py
│   │   ├── database/
│   │   │   └── connection.py
│   │   ├── knowledge/
│   │   │   ├── parameters.json
│   │   │   ├── standards.json
│   │   │   ├── treatments.json
│   │   │   ├── simulation_models.json
│   │   │   └── samples.json
│   │   ├── models/
│   │   │   └── entities.py
│   │   ├── schemas/
│   │   │   └── schemas.py
│   │   ├── services/
│   │   │   ├── chemistry_engine.py
│   │   │   ├── water_analyzer.py
│   │   │   ├── recommendation_engine.py
│   │   │   ├── simulation_engine.py
│   │   │   └── report_generator.py
│   │   ├── tests/
│   │   │   ├── test_backend.py
│   │   │   └── verify_full_system.py
│   │   └── main.py
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── common/
│   │   │   │   ├── Badge.tsx
│   │   │   │   └── Card.tsx
│   │   │   ├── layout/
│   │   │   │   ├── Navbar.tsx
│   │   │   │   ├── Sidebar.tsx
│   │   │   │   └── Footer.tsx
│   │   │   └── simulator/
│   │   │       └── TreatmentNode.tsx
│   │   ├── contexts/
│   │   │   └── WaterContext.tsx
│   │   ├── pages/
│   │   │   ├── LandingPage.tsx
│   │   │   ├── DashboardPage.tsx
│   │   │   ├── AnalysisPage.tsx
│   │   │   ├── ChemistryPage.tsx
│   │   │   ├── RecommendationsPage.tsx
│   │   │   ├── SimulatorPage.tsx
│   │   │   ├── WhatIfPage.tsx
│   │   │   ├── ComparisonPage.tsx
│   │   │   ├── ReportsPage.tsx
│   │   │   ├── HistoryPage.tsx
│   │   │   └── AboutPage.tsx
│   │   ├── services/
│   │   │   └── api.ts
│   │   ├── types/
│   │   │   └── index.ts
│   │   ├── App.tsx
│   │   ├── index.css
│   │   └── main.tsx
│   ├── package.json
│   ├── tailwind.config.js
│   └── vite.config.ts
└── README.md
```

---

## ⚡ Quick Start Guide (Windows)

### 1. Backend Setup & Run

Open a PowerShell terminal in the project root:

```powershell
cd "e:\SHREEDEVI OFFICIAL\AquaSolveAg"

# Install backend dependencies
python -m pip install -r backend/requirements.txt

# Start FastAPI backend (port 8001)
python -m uvicorn backend.app.main:app --host 127.0.0.1 --port 8001 --reload
```

Interactive OpenAPI Swagger docs will be live at: `http://127.0.0.1:8001/api/docs`

### 2. Frontend Setup & Run

In a second PowerShell terminal:

```powershell
cd "e:\SHREEDEVI OFFICIAL\AquaSolveAg\frontend"

# Install frontend dependencies
npm install

# Start Vite React development server
npm run dev
```

Open your browser to: `http://127.0.0.1:5173/`

---

## 🧪 Automated Testing

### Backend Unit & Integration Tests

```powershell
cd "e:\SHREEDEVI OFFICIAL\AquaSolveAg"
python -m pytest backend/app/tests
```

### Full System Integration & Endpoint Audit

```powershell
python backend/app/tests/verify_full_system.py
```

### Frontend TypeScript Build Verification

```powershell
cd "e:\SHREEDEVI OFFICIAL\AquaSolveAg\frontend"
npm run build
```

---

## 🌐 Public Deployment Guide

### Deploying Frontend to Vercel

1. Push the repository to GitHub.
2. In the Vercel Dashboard, import the repository and set Root Directory to `frontend`.
3. Set Environment Variable:
   - `VITE_API_BASE_URL`: URL of your deployed backend (e.g. `https://aquasolve-api.onrender.com`).
4. Framework preset: **Vite**. Build Command: `npm run build`. Output Directory: `dist`.

### Deploying Backend to Render

1. Create a new **Web Service** on Render connected to the repository.
2. Root Directory: `.`
3. Runtime: **Python 3**.
4. Build Command: `pip install -r backend/requirements.txt`
5. Start Command: `uvicorn backend.app.main:app --host 0.0.0.0 --port $PORT`
6. Environment Variables:
   - `DATABASE_URL`: `sqlite:///./aquasolve.db` (or provision a Managed PostgreSQL instance on Render).

---

## 📜 Regulatory Notice & Educational Disclaimer

> **IMPORTANT PUBLIC HEALTH DISCLAIMER:**
> AquaSolve is developed strictly as an educational and preliminary environmental engineering decision-support platform. Simulated treatment results represent theoretical calculations based on documented engineering literature (AWWA, WHO, EPA) under nominal ambient conditions. They **DO NOT** certify water as safe or potable for human consumption. Physical, chemical, and microbiological laboratory testing of treated effluents by certified laboratories is mandatory prior to drinking.

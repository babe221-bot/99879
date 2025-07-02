# Stone Configurator

## Advanced 3D/2D Stone Configuration Tool

This project is a web application for the Croatian stone industry, enabling:
- Precise planning of stone edge processing (chamfering, rounding, deburring).
- Interactive 3D visualization of stone components and processing.
- Generation of 2D technical drawings (nacrt, tlocrt) with Croatian standards.
- Management of a database of Croatian stone types and processing parameters.
- Real-time cost calculation.
- PDF documentation export.

## Project Overview

This application aims to digitize and modernize the workflow for stonemasons, architects, and designers by combining traditional klesarsko znanje (stonemasonry knowledge) with modern 3D/2D technologies.

## Tech Stack (Phase 1)
- **Framework:** Next.js (with React)
- **Language:** TypeScript
- **3D Rendering:** Three.js (via @react-three/fiber and @react-three/drei)
- **2D Drawing:** Fabric.js
- **Styling:** Tailwind CSS
- **Backend & Database:** Firebase (Firestore, Authentication, Storage, Hosting)
- **Version Control:** Git

## Getting Started

(Instructions to be added once the basic setup is runnable)

```bash
# Install dependencies
npm install

# Run the development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Project Structure (Initial)

```
stone-configurator/
├── .eslintrc.json
├── .gitignore
├── next-env.d.ts
├── package.json
├── postcss.config.js
├── README.md
├── src/
│   ├── app/
│   │   ├── layout.tsx
│   │   └── page.tsx
│   ├── components/
│   │   ├── 2d/
│   │   │   └── DrawingCanvas.tsx
│   │   └── 3d/
│   │       └── Scene.tsx
│   ├── lib/
│   │   └── firebase.ts
│   └── styles/
│       └── globals.css
├── tailwind.config.ts
└── tsconfig.json
```

## Firebase Setup

Firebase configuration (API keys, etc.) should be stored in a `.env.local` file in the project root. See `src/lib/firebase.ts` for required environment variables.

```
NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_auth_domain
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
# ... and other Firebase config variables
```

## Plan Phases

### Phase 1: Core Application Setup & 3D Visualization Foundation
1.  **Technology Stack Selection & Project Setup** (Completed)
2.  Basic 3D Scene Setup & Stone Material Visualization
3.  Interactive 3D Edge Selection & Highlighting
4.  Core Edge Processing Logic (Chamfer & Rounding - 3D)
5.  Basic 2D Drawing Setup (Fabric.js)

(Further phases and steps outlined in the project plan)
```

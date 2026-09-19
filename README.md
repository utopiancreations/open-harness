<div align="center">

```
  ██████╗ ██████╗ ███████╗███╗   ██╗    ██╗  ██╗██╗██████╗ ███╗   ██╗███████╗███████╗███████╗
 ██╔═══██╗██╔══██╗██╔════╝████╗  ██║    ██║  ██║██║██╔══██╗████╗  ██║██╔════╝██╔════╝██╔════╝
 ██║   ██║██████╔╝█████╗  ██╔██╗ ██║    ███████║██║██████╔╝██╔██╗ ██║█████╗  ███████╗███████╗
 ██║   ██║██╔═══╝ ██╔══╝  ██║╚██╗██║    ██╔══██║██║██╔══██╗██║╚██╗██║██╔══╝  ╚════██║╚════██║
 ╚██████╔╝██║     ███████╗██║ ╚████║    ██║  ██║██║██║  ██║██║ ╚████║███████╗███████║███████║
  ╚═════╝ ╚═╝     ╚══════╝╚═╝  ╚═══╝    ╚═╝  ╚═╝╚═╝╚═╝  ╚═╝╚═╝  ╚═══╝╚══════╝╚══════╝╚══════╝
```

### **Autonomous Local-First Mobile & Full-Stack AI Engineering Engine**

[![Build Status](https://img.shields.io/badge/tests-76%20passed-brightgreen.svg)](https://github.com/utopiancreations/open-harness)
[![License: MIT](https://img.shields.io/badge/License-MIT-cyan.svg)](https://opensource.org/licenses/MIT)
[![Node.js](https://img.shields.io/badge/node-%3E%3D18.0.0-magenta.svg)](https://nodejs.org/)
[![Local LLM](https://img.shields.io/badge/local%20llm-Qwen%203.8%20%7C%20Gemma%204-blueviolet.svg)](https://ollama.ai)
[![Architecture](https://img.shields.io/badge/architecture-Dual--Agent%20%2B%20Milestone%20Matrix-orange.svg)](#-architecture--how-it-works)

*Stop relying on fragile single-prompt generation. Build production-grade mobile and full-stack applications locally with zero cloud lock-in.*

[Key Features](#-key-features) • [Architecture](#-architecture--how-it-works) • [Installation](#-quick-start) • [CLI Walkthrough](#-terminal-interface--aesthetics) • [Testing](#-testing--verification)

---

</div>

## 📌 Table of Contents
1. [Overview](#-overview)
2. [Key Features](#-key-features)
3. [Architecture & How It Works](#-architecture--how-it-works)
   - [Dual-Agent Subsystem](#1-dual-agent-subsystem-qwen-38--gemma-4)
   - [4-Pass Multi-Role Planning Pipeline](#2-4-pass-multi-role-planning-pipeline)
   - [Tried Solutions Memory Journal](#3-tried-solutions-memory-journal)
   - [Milestone Execution Matrix](#4-milestone-execution-matrix)
4. [Terminal Interface & Aesthetics](#-terminal-interface--aesthetics)
5. [Quick Start](#-quick-start)
6. [Supported Backends & Environment Automation](#-supported-backends--cloud-automation)
7. [Testing & Verification](#-testing--verification)
8. [License](#-license)

---

## 👾 Overview

**Open Harness** is an autonomous, local-first AI software engineering harness designed to build, ground, test, and refine complex mobile (Flutter/React Native) and full-stack applications locally on your Mac or Linux workstation.

Unlike traditional AI coding tools that get stuck in infinite retry loops or hallucinate non-existent APIs, Open Harness combines **Hardware-Grounded Device Probes**, **Context Compaction**, **Memory Journals**, and a **Dual-Agent Architecture** to execute non-trivial software goals (like End-to-End Encrypted P2P Messengers, Mesh Networks, and Geolocation Social Apps) deterministically.

---

## ✨ Key Features

### 🛡️ Dual-Agent Architecture (Developer + PM Sentinel)
- **Lead Developer Agent (`qwen3.8:latest`)**: Inspects files, constructs architecture, edits code snippets, runs hot reloads, and writes test suites.
- **PM Sentinel Agent (`gemma4:e4b`)**: A ultra-fast local subagent that continuously audits proposed developer actions before execution, eliminating scope drift (e.g., stopping boilerplate auth loops when building P2P features).

### 🧠 4-Pass Multi-Role Planning Pipeline
Before writing a single line of code, Open Harness synthesizes a comprehensive system plan through 4 specialized passes:
1. **Pass 1 (Technical PM)**: Core stack, data models, state architecture, and route hierarchy.
2. **Pass 2 (Cybersecurity Manager)**: E2EE cryptography (AES-256-GCM, ECDH key agreement), cert pinning, and zero-trust storage.
3. **Pass 3 (UX & Retention Specialist)**: Offline-first UX resiliency, dark cyberpunk aesthetics, and loading state matrices.
4. **Pass 4 (Master Synthesis)**: Consolidates findings into `plan.md` with structured milestone task checkboxes.

### 🧭 Mid-Flight Course Correction & Interjections
- Command input bar remains unlocked during active execution.
- Interject new user requirements mid-flight (e.g., *"Also add peer-to-peer file sharing"*). Open Harness safely pauses tool execution, re-invokes the multi-role planning engine to adjust `plan.md`, and resumes execution without losing completed progress.

### 📓 Tried Solutions Memory Journal
- Tracks every tool call, file edit attempt, and compiler error.
- Enforces a hard constraint prohibiting the LLM from repeating identical failed attempts.

### 📊 Executive Handover Reporting
- Renders a high-contrast executive handover box upon run completion or step limits:
  - Completed vs. remaining milestone breakdown.
  - Active `.env` cloud service integrations.
  - Modified file audit.
  - Actionable next steps.

---

## 🏗️ Architecture & How It Works

```
┌──────────────────────────────────────────────────────────────────────────────────────────┐
│                                 OPEN HARNESS ARCHITECTURE                                │
│                                                                                          │
│   ┌──────────────────────────────────────────────────────────────────────────────────┐   │
│   │ 1. MULTI-ROLE PLANNER (4-Pass Engine)                                            │   │
│   │ Pass 1: PM Spec ➔ Pass 2: Security Audit ➔ Pass 3: UX Audit ➔ Pass 4: plan.md     │   │
│   └────────────────────────────────────────┬─────────────────────────────────────────┘   │
│                                            │                                             │
│                                            ▼                                             │
│   ┌──────────────────────────────────────────────────────────────────────────────────┐   │
│   │ 2. MILESTONE CONTROLLER (35-Turn Execution Windows)                              │   │
│   │ Milestone 1: Crypto Engine ➔ Milestone 2: P2P Mesh ➔ Milestone 3: E2EE Chat      │   │
│   └────────────────────────────────────────┬─────────────────────────────────────────┘   │
│                                            │                                             │
│       ┌────────────────────────────────────┴────────────────────────────────────┐        │
│       ▼                                                                         ▼        │
│ ┌───────────────────────────┐                                     ┌────────────────────┐ │
│ │ LEAD DEVELOPER (Qwen 3.8) │ ◄─────── [SCOPE AUDIT HINT] ─────── │ PM SENTINEL        │ │
│ │ • Inspects codebase       │                                     │ (Gemma 4 Edge)     │ │
│ │ • Applies edit_file       │ ─────── [PROPOSED ACTION] ────────► │ • Audits scope     │ │
│ │ • Runs hot reloads        │                                     │ • Prevents drift   │ │
│ └─────────────┬─────────────┘                                     └────────────────────┘ │
│               │                                                                          │
│               ▼                                                                          │
│ ┌───────────────────────────┐                                                            │
│ │ TRIED SOLUTIONS JOURNAL   │ ──► Prevents duplicate retries                             │
│ └───────────────────────────┘                                                            │
└──────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 🎨 Terminal Interface & Aesthetics

Open Harness features a **Sleepy Cyberpunk Ink Terminal UI** designed for maximum visibility and non-flickering streaming.

```
┌──────────────────────────────────────────────────────────────────────────────────────────┐
│ 👾 OPEN HARNESS v0.1.0 · LOCAL-FIRST AI ENGINEERING MATRIX                               │
├──────────────────────────────────────────────────────────────────────────────────────────┤
│ ◈ SYSTEM STATUS: Autonomous Agent Active ⚡                                              │
│ ◈ ACTIVE MODEL: qwen3.8:latest (256k Context) | PM SENTINEL: gemma4:e4b                 │
│ ◈ MILESTONE 2/5: P2P Mesh Network & Peer Discovery [██████████░░░░░░░░░░] 40%           │
├──────────────────────────────────────────────────────────────────────────────────────────┤
│ 👾 LIVE STREAM:                                                                         │
│ [16:02:14] Step 12 (MODEL) ❯ edit_file ➔ lib/mesh/peer_discovery.dart                    │
│ [16:02:15] [PM SENTINEL 🛡️ (Gemma 4)]: Scope aligned. Peer discovery matching milestone. │
│ [16:02:16] Step 13 (MODEL) ❯ flutter_hot_reload                                          │
│ [16:02:17] [SYSTEM]: Hot reload clean. 0 errors, 0 warnings.                             │
├──────────────────────────────────────────────────────────────────────────────────────────┤
│ [INTERJECT / RE-PLAN]: Type new requirement mid-flight and press Enter...                 │
└──────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 🚀 Quick Start

### Prerequisites
1. **Node.js**: Version 18.0.0 or higher.
2. **Ollama**: Installed and running (`ollama serve`).
3. **Local Models**:
   ```bash
   ollama pull qwen3.8:latest
   ollama pull gemma4:e4b
   ```

### Installation
```bash
# 1. Clone the repository
git clone https://github.com/utopiancreations/open-harness.git
cd open-harness

# 2. Install dependencies
npm install

# 3. Build & start Open Harness
./start.sh
```

---

## ⚙️ Supported Backends & Cloud Automation

When synthesizing `plan.md`, Open Harness automatically scans required cloud services and generates `.env.example` and `.env` template files for:

| Service / Platform | Role |
| :--- | :--- |
| **Cloudflare Workers** | Edge API WAF, CORS, HSTS, and rate-limiting |
| **Supabase / Postgres** | Spatial proximity queries (`ST_DWithin`) & Public Key directory |
| **Firebase Cloud Messaging** | Native APNs (iOS) & FCM (Android) push notification pings |
| **Neon Postgres** | Serverless SQL database fallback |
| **WebRTC STUN/TURN** | NAT traversal and direct P2P socket signaling |

---

## 🧪 Testing & Verification

Open Harness includes a comprehensive 17-suite unit and integration test suite built with Vitest:

```bash
# Run complete test suite
npm test

# Run build verification
npm run build
```

```
 Test Files  17 passed (17)
      Tests  76 passed (76)
   Start at  16:17:37
   Duration  2.26s (transform 1.19s, setup 0ms, collect 2.39s, tests 3.88s)
```

---

## 📜 License

Distributed under the **MIT License**. See `LICENSE` for details. Open-source and free for commercial and personal development.

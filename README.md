# ⚡ Open Harness

> **Autonomous Local-First Mobile & Full-Stack AI Engineering Engine**  
> *Powered by local LLMs (Qwen 3.8 / Gemma 4), M5 Apple Silicon GPU acceleration, and a sleepy cyberpunk terminal UI.*

---

## 👾 What is Open Harness?

Open Harness is an autonomous, local-first AI software engineering harness engineered to build, ground, test, and refine complex mobile & web applications locally on your Mac.

It replaces fragile single-prompt generation loops with a **Dual-Agent Architecture** and **Milestone Execution Matrix**, enabling local LLMs to reliably construct non-trivial applications (such as End-to-End Encrypted P2P messengers, mesh networks, and location-based social platforms) with zero cloud lock-in.

---

## ✨ Key Features

### 1. 🛡️ Dual-Agent Architecture (Developer + PM Sentinel)
- **Lead Developer Agent (`qwen3.8:latest`)**: Handles code inspection, architecture creation, file editing, and test generation.
- **PM Sentinel Agent (`gemma4:e4b`)**: A ultra-fast local subagent that continuously audits proposed developer actions before execution, preventing scope drift (e.g. stopping boilerplate auth loops when building P2P features).

### 2. 🧠 4-Pass Multi-Role Planning Engine
Before writing a single line of code, Open Harness invokes a 4-pass multi-role planning pipeline:
1. **Pass 1 (Technical PM)**: Core architecture, state management, and route hierarchy.
2. **Pass 2 (Cybersecurity Manager)**: E2EE cryptography, transport security (TLS 1.3/cert pinning), and zero-trust storage.
3. **Pass 3 (UX & Retention Specialist)**: Offline-first UX resiliency, dark cyberpunk aesthetics, and loading states.
4. **Pass 4 (Master Synthesis)**: Consolidates findings into a structured `plan.md` with milestone task checkboxes.

### 3. 🧭 Live Mid-Flight Course Correction
- The command input bar remains unlocked during active execution.
- Interject new user asks mid-flight (e.g., *"Also add peer-to-peer file sharing"*). Open Harness pauses tool calls, re-invokes the planning team to adjust `plan.md`, and resumes seamlessly without losing completed work.

### 4. 📓 Tried Solutions Journal (Zero Retry Loops)
- Maintains an explicit memory log of every file edit, action, and compiler result.
- Enforces a hard constraint prohibiting the LLM from repeating identical failed attempts.

### 5. 📊 Executive Handover Reporting
- Upon run completion or step limits, renders a high-contrast executive handover box detailing:
  - Completed vs. remaining milestone breakdown.
  - Active `.env` cloud service integrations.
  - File modification audits.
  - Actionable next steps.

---

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- Local Ollama instance running (`ollama serve`)
- Models pulled:
  ```bash
  ollama pull qwen3.8:latest
  ollama pull gemma4:e4b
  ```

### Installation
```bash
# 1. Clone repository
git clone https://github.com/utopiancreations/open-harness.git
cd open-harness

# 2. Install dependencies
npm install

# 3. Build & launch Harness
./start.sh
```

---

## 🧪 Testing

Open Harness includes a 17-suite test suite powered by Vitest:

```bash
# Run all unit and integration tests
npm test
```

---

## 📤 Pushing to GitHub

To share your Open Harness repository on GitHub:

```bash
git init
git add .
git commit -m "feat: initial open harness release with dual-agent architecture & milestone matrix"
git branch -M main
git remote add origin https://github.com/utopiancreations/open-harness.git
git push -u origin main
```

---

## 📄 License
MIT License. Free for open-source and commercial use.

#!/usr/bin/env bash

set -e

# Color definitions
CYAN='\033[0;36m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
MAGENTA='\033[0;35m'
NC='\033[0m' # No Color

echo -e "${CYAN}====================================================${NC}"
echo -e "${GREEN} 🚀 Starting Open Harness (Qwen 3.8 / M5 Max 128GB) ${NC}"
echo -e "${CYAN}====================================================${NC}"

# 1. Check Node.js
if ! command -v node &> /dev/null; then
  echo -e "${YELLOW}❌ Node.js is not installed. Please install Node v20+.${NC}"
  exit 1
fi

# 2. Check ADB connection
echo -e "\n${MAGENTA}[1/3] Checking ADB Android Device Connection...${NC}"
if command -v adb &> /dev/null; then
  DEVICES=$(adb devices | grep -v "List" | grep "device" || true)
  if [ -z "$DEVICES" ]; then
    echo -e "${YELLOW}⚠️  No physical device or emulator detected via 'adb devices'.${NC}"
    echo -e "${YELLOW}   (Harness will run in offline simulation mode if no device connects.)${NC}"
  else
    echo -e "${GREEN}✅ Connected Device(s):${NC}"
    echo "$DEVICES"
  fi
else
  echo -e "${YELLOW}⚠️  ADB tool not found in PATH. Make sure Android SDK platform-tools are installed.${NC}"
fi

# 3. Check Local LLM Server (Ollama / Qwen 3.8)
echo -e "\n${MAGENTA}[2/3] Checking Local LLM Server (http://localhost:11434)...${NC}"
if curl -s http://localhost:11434/v1/models > /dev/null; then
  echo -e "${GREEN}✅ Local LLM server reachable at http://localhost:11434/v1${NC}"
  MODELS=$(curl -s http://localhost:11434/v1/models | grep -o '"id":"[^"]*"' | head -n 5 | tr '\n' ' ')
  echo -e "${CYAN}   Detected models: ${MODELS}${NC}"
else
  echo -e "${YELLOW}⚠️  Local LLM server not responding on http://localhost:11434.${NC}"
  echo -e "${YELLOW}   Make sure Ollama or your LLM server is running (e.g. 'ollama run qwen3.8:latest').${NC}"
fi

# 4. Build TypeScript
echo -e "\n${MAGENTA}[3/3] Building TypeScript Engine...${NC}"
npm run build

# 5. Launch Open Harness CLI
GOAL="${1:-Verify login screen flow and button stability}"
echo -e "\n${GREEN}🚀 Launching Open Harness Agent...${NC}\n"

node dist/cli/index.js dev "$GOAL"

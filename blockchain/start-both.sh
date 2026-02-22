#!/bin/bash

echo "🏦 Blockchain Money Transfer System - Dual Version Launcher"
echo "=========================================================="
echo ""

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}This script helps you run BOTH versions for comparison:${NC}"
echo ""
echo -e "${GREEN}1. Blockchain Version${NC} (Port 3000)"
echo -e "   - Has blockchain security"
echo -e "   - Detects tampering"
echo -e "   - Immutable records"
echo ""
echo -e "${YELLOW}2. Non-Blockchain Version${NC} (Port 3001)"
echo -e "   - Traditional database only"
echo -e "   - No tamper detection"
echo -e "   - Vulnerable to modifications"
echo ""
echo "=========================================================="
echo ""

# Check if user wants to proceed
read -p "Do you want to start both versions? (y/n): " -n 1 -r
echo ""

if [[ ! $REPLY =~ ^[Yy]$ ]]
then
    echo "Aborted."
    exit 1
fi

echo ""
echo "🚀 Starting Blockchain Version (Port 3000)..."
echo "   URL: http://localhost:3000"
echo ""

# Open blockchain version in new terminal (macOS)
if [[ "$OSTYPE" == "darwin"* ]]; then
    osascript -e 'tell app "Terminal" to do script "cd '"$PWD"' && npm run dev"'
else
    # For Linux, try xterm or gnome-terminal
    if command -v gnome-terminal &> /dev/null; then
        gnome-terminal -- bash -c "cd $PWD && npm run dev; exec bash"
    elif command -v xterm &> /dev/null; then
        xterm -e "cd $PWD && npm run dev" &
    else
        echo "Please manually open a terminal and run: npm run dev"
    fi
fi

echo "⏳ Waiting 5 seconds before starting non-blockchain version..."
sleep 5

echo ""
echo "🚀 Starting Non-Blockchain Version (Port 3001)..."
echo "   URL: http://localhost:3001"
echo ""

# Open non-blockchain version in new terminal (macOS)
if [[ "$OSTYPE" == "darwin"* ]]; then
    osascript -e 'tell app "Terminal" to do script "cd '"$PWD"'/nonblockchain && npm run dev"'
else
    # For Linux
    if command -v gnome-terminal &> /dev/null; then
        gnome-terminal -- bash -c "cd $PWD/nonblockchain && npm run dev; exec bash"
    elif command -v xterm &> /dev/null; then
        xterm -e "cd $PWD/nonblockchain && npm run dev" &
    else
        echo "Please manually open a terminal and run: cd nonblockchain && npm run dev"
    fi
fi

echo ""
echo "=========================================================="
echo "✅ Both versions are starting!"
echo ""
echo -e "${GREEN}Blockchain Version:${NC}    http://localhost:3000"
echo -e "${YELLOW}Non-Blockchain Version:${NC} http://localhost:3001"
echo ""
echo "🧪 Test Instructions:"
echo "   1. Login to both with alice/password123"
echo "   2. Make a transaction in both (e.g., send 100 VC to bob)"
echo "   3. Go to MongoDB Atlas and change the amount to 9999"
echo "   4. Refresh both pages"
echo "   5. See the difference! Blockchain detects tampering!"
echo ""
echo "📖 See COMPARISON.md for detailed testing guide"
echo "=========================================================="

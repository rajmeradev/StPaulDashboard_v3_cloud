#!/bin/bash
# St. Paul Production Dashboard — Mac Launcher
# Double-click to start the server and open the dashboard in your browser

cd "$(dirname "$0")"

echo "════════════════════════════════════════════════════════════"
echo "  St. Paul Production Dashboard"
echo "════════════════════════════════════════════════════════════"
echo ""

# Check if Python 3 is installed
if ! command -v python3 &> /dev/null; then
    echo "⚠️  Python 3 not found. Installing now..."
    echo ""

    # Try Homebrew first
    if command -v brew &> /dev/null; then
        echo "📦 Installing via Homebrew..."
        brew install python@3.11
    else
        # Download official macOS installer
        PYTHON_URL="https://www.python.org/ftp/python/3.11.9/python-3.11.9-macos11.pkg"
        PYTHON_PKG="/tmp/python-3.11.9.pkg"

        echo "📥 Downloading Python 3.11.9..."
        curl -L "$PYTHON_URL" -o "$PYTHON_PKG" --progress-bar

        if [ ! -f "$PYTHON_PKG" ]; then
            echo "❌ Download failed. Please install manually from:"
            echo "   https://www.python.org/downloads/"
            read -p "Press Enter to exit..."
            exit 1
        fi

        echo "🔧 Installing Python (requires admin password)..."
        sudo installer -pkg "$PYTHON_PKG" -target /
        rm -f "$PYTHON_PKG"
    fi

    # Verify install
    if ! command -v python3 &> /dev/null; then
        echo "❌ Installation failed. Please install manually from:"
        echo "   https://www.python.org/downloads/"
        read -p "Press Enter to exit..."
        exit 1
    fi

    echo "✅ Python installed successfully!"
    echo ""
fi

# Check if virtual environment exists
if [ ! -d "venv" ]; then
    echo "📦 Creating virtual environment..."
    python3 -m venv venv
    echo "✓ Virtual environment created"
    echo ""
fi

# Activate virtual environment
echo "🔧 Activating virtual environment..."
source venv/bin/activate

# Install dependencies if needed
if [ ! -f "venv/.installed" ]; then
    echo "📦 Installing dependencies (first time only)..."
    pip install --upgrade pip
    pip install -r requirements.txt
    touch venv/.installed
    echo "✓ Dependencies installed"
    echo ""
fi

# Start the server
echo "🚀 Starting St. Paul Production Dashboard..."
echo "   Server: http://localhost:8000"
echo "   Press Ctrl+C to stop the server"
echo ""
echo "════════════════════════════════════════════════════════════"
echo ""

# Open browser after a short delay
(sleep 2 && open http://localhost:8000) &

# Run the server
python3 -m uvicorn tools.api_bridge:app --host 0.0.0.0 --port 8000

# Keep terminal open on exit
echo ""
echo "Server stopped."
read -p "Press Enter to exit..."

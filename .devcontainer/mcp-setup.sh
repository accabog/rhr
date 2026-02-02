#!/bin/bash
# MCP Server Setup Script
# This script validates and pre-warms MCP server dependencies for Claude Code

set -e

echo "🔧 Setting up MCP servers for Claude Code..."

# Validate .mcp.json exists and is valid JSON
MCP_CONFIG="/workspace/.mcp.json"
if [ -f "$MCP_CONFIG" ]; then
    if node -e "JSON.parse(require('fs').readFileSync('$MCP_CONFIG', 'utf8'))" 2>/dev/null; then
        echo "✅ .mcp.json is valid JSON"
    else
        echo "❌ .mcp.json contains invalid JSON"
        exit 1
    fi
else
    echo "⚠️  .mcp.json not found at $MCP_CONFIG"
    exit 0
fi

# Pre-install MCP server packages to speed up first use
echo "📦 Pre-installing MCP server dependencies..."

# ============================================
# NPM packages (installed globally or via npx)
# ============================================

# Install PostgreSQL MCP server (dbhub)
echo "  Installing @bytebase/dbhub..."
npm install -g @bytebase/dbhub 2>/dev/null || npx -y @bytebase/dbhub --version >/dev/null 2>&1 || true

# Install Filesystem MCP server
echo "  Installing @modelcontextprotocol/server-filesystem..."
npm install -g @modelcontextprotocol/server-filesystem 2>/dev/null || npx -y @modelcontextprotocol/server-filesystem --help >/dev/null 2>&1 || true

# Install Playwright MCP server
echo "  Installing @playwright/mcp..."
npm install -g @playwright/mcp 2>/dev/null || npx -y @playwright/mcp@latest --help >/dev/null 2>&1 || true

# Install Memory MCP server
echo "  Installing @modelcontextprotocol/server-memory..."
npm install -g @modelcontextprotocol/server-memory 2>/dev/null || npx -y @modelcontextprotocol/server-memory --help >/dev/null 2>&1 || true

# Install Context7 MCP server
echo "  Installing @upstash/context7-mcp..."
npm install -g @upstash/context7-mcp 2>/dev/null || npx -y @upstash/context7-mcp --help >/dev/null 2>&1 || true

# Install Sequential Thinking MCP server
echo "  Installing @modelcontextprotocol/server-sequential-thinking..."
npm install -g @modelcontextprotocol/server-sequential-thinking 2>/dev/null || npx -y @modelcontextprotocol/server-sequential-thinking --help >/dev/null 2>&1 || true

# ============================================
# Python packages (installed via uvx)
# ============================================

# Install Redis MCP server
echo "  Installing redis-mcp-server..."
uvx --from redis-mcp-server redis-mcp-server --help >/dev/null 2>&1 || true

# Install Time MCP server
echo "  Installing mcp-server-time..."
uvx mcp-server-time --help >/dev/null 2>&1 || true

# ============================================
# Docker images (pulled for faster first use)
# ============================================

# Pull Fetch MCP server Docker image
echo "  Pulling mcp/fetch Docker image..."
docker pull mcp/fetch 2>/dev/null || true

echo ""
echo "✅ MCP setup complete!"
echo ""
echo "Available MCP servers:"
echo "  • github     - PR reviews, issue management (OAuth on first use)"
echo "  • postgres   - Natural language database queries"
echo "  • filesystem - Enhanced file browsing"
echo "  • redis      - Cache inspection, key management"
echo "  • playwright - Browser automation, E2E test debugging"
echo "  • memory     - Persistent knowledge across sessions"
echo "  • fetch      - HTTP requests, API testing"
echo "  • time       - Timezone conversions, date calculations"
echo "  • aws        - AWS resource management (disabled by default)"
echo "  • context7   - Up-to-date library/framework documentation"
echo "  • sequential-thinking - Structured problem-solving"
echo ""
echo "To verify in Claude Code, run: /mcp"
echo ""

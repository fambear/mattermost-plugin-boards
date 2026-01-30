#!/bin/bash
# Test script for bot automation scripts
# This demonstrates the branch checking logic without actually executing tasks

set -e

echo "🧪 Testing Bot Automation Scripts"
echo "=================================="
echo ""

# Test 1: execute-bot-task.sh parameter validation
echo "Test 1: Parameter validation"
echo "----------------------------"
if ./scripts/execute-bot-task.sh 2>&1 | grep -q "Missing required parameters"; then
    echo "✅ PASS: Parameter validation works"
else
    echo "❌ FAIL: Parameter validation failed"
    exit 1
fi
echo ""

# Test 2: poll-and-dispatch.sh token validation
echo "Test 2: Token validation"
echo "------------------------"
if ./scripts/poll-and-dispatch.sh 2>&1 | grep -q "MM_ACCESS_TOKEN is not set"; then
    echo "✅ PASS: Token validation works"
else
    echo "❌ FAIL: Token validation failed"
    exit 1
fi
echo ""

# Test 3: Check if scripts are executable
echo "Test 3: Script permissions"
echo "--------------------------"
if [ -x "./scripts/execute-bot-task.sh" ] && [ -x "./scripts/poll-and-dispatch.sh" ]; then
    echo "✅ PASS: Scripts are executable"
else
    echo "❌ FAIL: Scripts are not executable"
    exit 1
fi
echo ""

# Test 4: Verify branch checking logic (dry run)
echo "Test 4: Branch checking logic"
echo "------------------------------"
echo "Current branch: $(git branch --show-current)"
echo "Testing branch existence check..."

# Check if current branch exists (should always be true)
CURRENT_BRANCH=$(git branch --show-current)
if git show-ref --verify --quiet "refs/heads/${CURRENT_BRANCH}"; then
    echo "✅ PASS: Can detect existing local branch"
else
    echo "❌ FAIL: Cannot detect existing local branch"
    exit 1
fi

# Check if a non-existent branch doesn't exist (should be false)
if ! git show-ref --verify --quiet "refs/heads/this-branch-does-not-exist-12345"; then
    echo "✅ PASS: Can detect non-existent branch"
else
    echo "❌ FAIL: False positive on non-existent branch"
    exit 1
fi
echo ""

# Test 5: Check remote branch detection
echo "Test 5: Remote branch detection"
echo "--------------------------------"
git fetch origin --quiet

# Detect default branch dynamically (same logic as execute-bot-task.sh)
DEFAULT_BRANCH=$(git symbolic-ref refs/remotes/origin/HEAD 2>/dev/null | sed 's@^refs/remotes/origin/@@')
if [ -z "$DEFAULT_BRANCH" ]; then
    git remote set-head origin --auto >/dev/null 2>&1 || true
    DEFAULT_BRANCH=$(git symbolic-ref refs/remotes/origin/HEAD 2>/dev/null | sed 's@^refs/remotes/origin/@@')
fi
if [ -z "$DEFAULT_BRANCH" ]; then
    if git ls-remote --heads origin main | grep -q "main"; then
        DEFAULT_BRANCH="main"
    elif git ls-remote --heads origin master | grep -q "master"; then
        DEFAULT_BRANCH="master"
    fi
fi

if [ -n "$DEFAULT_BRANCH" ] && git ls-remote --heads origin "$DEFAULT_BRANCH" | grep -q "$DEFAULT_BRANCH"; then
    echo "✅ PASS: Can detect remote branches (found default: $DEFAULT_BRANCH)"
else
    echo "❌ FAIL: Cannot detect remote branches"
    exit 1
fi
echo ""

# Test 6: Verify jq is available (required for poll-and-dispatch.sh)
echo "Test 6: Dependencies check"
echo "--------------------------"
if command -v jq &> /dev/null; then
    echo "✅ PASS: jq is installed"
else
    echo "⚠️  WARNING: jq is not installed (required for poll-and-dispatch.sh)"
fi

if command -v curl &> /dev/null; then
    echo "✅ PASS: curl is installed"
else
    echo "⚠️  WARNING: curl is not installed (required for poll-and-dispatch.sh)"
fi
echo ""

# Summary
echo "=================================="
echo "✅ All tests passed!"
echo ""
echo "The bot automation scripts are ready to use."
echo ""
echo "Next steps:"
echo "1. Set MM_ACCESS_TOKEN environment variable"
echo "2. Configure other environment variables (see docs/BOT-AUTOMATION.md)"
echo "3. Run: ./scripts/poll-and-dispatch.sh"
echo ""
echo "For more information, see:"
echo "- docs/BOT-AUTOMATION.md"
echo "- scripts/README.md"


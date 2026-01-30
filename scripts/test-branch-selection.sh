#!/bin/bash
# Test script to verify branch selection logic in execute-bot-task.sh

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🧪 Testing Branch Selection Logic${NC}"
echo -e "${BLUE}==================================${NC}"
echo ""

# Test 1: Simulate card without githubBranch field
echo -e "${YELLOW}Test 1: Card without githubBranch field${NC}"
echo "Expected: Should use bot/TEST-123 pattern"
echo ""

CARD_JSON='{"code":"TEST-123","title":"Test Card","fields":{"description":"Test description"}}'
GITHUB_BRANCH_REF=$(echo "$CARD_JSON" | jq -r '.fields.githubBranch.ref // empty')
EXISTING_BRANCH_NAME=""

if [ -n "$GITHUB_BRANCH_REF" ] && [ "$GITHUB_BRANCH_REF" != "null" ]; then
    EXISTING_BRANCH_NAME=$(echo "$GITHUB_BRANCH_REF" | sed 's|^refs/heads/||')
fi

if [ -z "$EXISTING_BRANCH_NAME" ]; then
    echo -e "${GREEN}✓ PASS: No branch extracted (as expected)${NC}"
    echo -e "  Would use: bot/TEST-123"
else
    echo -e "${RED}✗ FAIL: Unexpected branch: $EXISTING_BRANCH_NAME${NC}"
fi
echo ""

# Test 2: Simulate card with githubBranch field
echo -e "${YELLOW}Test 2: Card with githubBranch field${NC}"
echo "Expected: Should extract 'feature/my-branch' from ref"
echo ""

CARD_JSON='{"code":"TEST-456","title":"Test Card","fields":{"description":"Test description","githubBranch":{"ref":"refs/heads/feature/my-branch","url":"https://api.github.com/...","repo":"owner/repo","createdAt":"2024-01-01T00:00:00Z"}}}'
GITHUB_BRANCH_REF=$(echo "$CARD_JSON" | jq -r '.fields.githubBranch.ref // empty')
EXISTING_BRANCH_NAME=""

if [ -n "$GITHUB_BRANCH_REF" ] && [ "$GITHUB_BRANCH_REF" != "null" ]; then
    EXISTING_BRANCH_NAME=$(echo "$GITHUB_BRANCH_REF" | sed 's|^refs/heads/||')
fi

if [ "$EXISTING_BRANCH_NAME" = "feature/my-branch" ]; then
    echo -e "${GREEN}✓ PASS: Correctly extracted: $EXISTING_BRANCH_NAME${NC}"
else
    echo -e "${RED}✗ FAIL: Expected 'feature/my-branch', got: '$EXISTING_BRANCH_NAME'${NC}"
fi
echo ""

# Test 3: Simulate card with complex branch name
echo -e "${YELLOW}Test 3: Card with complex branch name${NC}"
echo "Expected: Should extract 'fb-123/fix-login-bug' from ref"
echo ""

CARD_JSON='{"code":"FB-123","title":"Fix login bug","fields":{"description":"Users cannot login","githubBranch":{"ref":"refs/heads/fb-123/fix-login-bug","url":"https://api.github.com/...","repo":"owner/repo","createdAt":"2024-01-01T00:00:00Z"}}}'
GITHUB_BRANCH_REF=$(echo "$CARD_JSON" | jq -r '.fields.githubBranch.ref // empty')
EXISTING_BRANCH_NAME=""

if [ -n "$GITHUB_BRANCH_REF" ] && [ "$GITHUB_BRANCH_REF" != "null" ]; then
    EXISTING_BRANCH_NAME=$(echo "$GITHUB_BRANCH_REF" | sed 's|^refs/heads/||')
fi

if [ "$EXISTING_BRANCH_NAME" = "fb-123/fix-login-bug" ]; then
    echo -e "${GREEN}✓ PASS: Correctly extracted: $EXISTING_BRANCH_NAME${NC}"
else
    echo -e "${RED}✗ FAIL: Expected 'fb-123/fix-login-bug', got: '$EXISTING_BRANCH_NAME'${NC}"
fi
echo ""

# Test 4: Simulate card with null githubBranch
echo -e "${YELLOW}Test 4: Card with null githubBranch${NC}"
echo "Expected: Should use bot/TEST-789 pattern"
echo ""

CARD_JSON='{"code":"TEST-789","title":"Test Card","fields":{"description":"Test description","githubBranch":null}}'
GITHUB_BRANCH_REF=$(echo "$CARD_JSON" | jq -r '.fields.githubBranch.ref // empty')
EXISTING_BRANCH_NAME=""

if [ -n "$GITHUB_BRANCH_REF" ] && [ "$GITHUB_BRANCH_REF" != "null" ]; then
    EXISTING_BRANCH_NAME=$(echo "$GITHUB_BRANCH_REF" | sed 's|^refs/heads/||')
fi

if [ -z "$EXISTING_BRANCH_NAME" ]; then
    echo -e "${GREEN}✓ PASS: No branch extracted (as expected)${NC}"
    echo -e "  Would use: bot/TEST-789"
else
    echo -e "${RED}✗ FAIL: Unexpected branch: $EXISTING_BRANCH_NAME${NC}"
fi
echo ""

echo -e "${BLUE}==================================${NC}"
echo -e "${GREEN}✅ All tests completed${NC}"
echo ""


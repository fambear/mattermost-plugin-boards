#!/bin/bash
set -e

# Script to poll for cards and dispatch bot tasks
# Usage: ./scripts/poll-and-dispatch.sh

# Configuration (can be overridden by environment variables)
MM_ACCESS_TOKEN="${MM_ACCESS_TOKEN:-}"
MM_SERVER_URL="${MM_SERVER_URL:-https://mm.fambear.online}"
MM_BOARD_ID="${MM_BOARD_ID:-bpn1j696qhjg1bfp45x59x57tdr}"
STATUS_FILTER="${STATUS_FILTER:-In Progress}"
PROJECT_FILTER="${PROJECT_FILTER:-Boards}"
REPO_OWNER="${REPO_OWNER:-fambear}"
REPO_NAME="${REPO_NAME:-mattermost-plugin-boards}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🤖 Bot Task Polling & Dispatch${NC}"
echo -e "${BLUE}==============================${NC}"
echo ""

# Validate access token
if [ -z "$MM_ACCESS_TOKEN" ]; then
    echo -e "${RED}❌ Error: MM_ACCESS_TOKEN is not set${NC}"
    echo "Please set the MM_ACCESS_TOKEN environment variable"
    exit 1
fi

# Check if jq is installed
if ! command -v jq &> /dev/null; then
    echo -e "${RED}❌ Error: jq is required but not installed${NC}"
    echo "Install it with: sudo apt-get install jq (Ubuntu/Debian) or brew install jq (macOS)"
    exit 1
fi

echo -e "${YELLOW}📡 Polling for cards...${NC}"
echo -e "   Server: ${MM_SERVER_URL}"
echo -e "   Board: ${MM_BOARD_ID}"
echo -e "   Status: ${STATUS_FILTER}"
echo -e "   Project: ${PROJECT_FILTER}"
echo ""

# Fetch cards from the board
RESPONSE=$(curl -s -H "Authorization: Bearer ${MM_ACCESS_TOKEN}" \
    -H "X-Requested-With: XMLHttpRequest" \
    "${MM_SERVER_URL}/plugins/focalboard/api/v2/boards/${MM_BOARD_ID}/cards")

# Check if response is valid JSON
if ! echo "$RESPONSE" | jq empty 2>/dev/null; then
    echo -e "${RED}❌ Error: Invalid response from server${NC}"
    echo "Response: $RESPONSE"
    exit 1
fi

# Parse cards
CARDS=$(echo "$RESPONSE" | jq -c '.[]')

if [ -z "$CARDS" ]; then
    echo -e "${YELLOW}⚠️  No cards found${NC}"
    exit 0
fi

# Count cards
CARD_COUNT=$(echo "$CARDS" | wc -l)
echo -e "${GREEN}✓ Found ${CARD_COUNT} card(s)${NC}"
echo ""

# Process each card
PROCESSED=0
SKIPPED=0

while IFS= read -r card; do
    # Extract card details
    CARD_ID=$(echo "$card" | jq -r '.id')
    CARD_CODE=$(echo "$card" | jq -r '.code // empty')
    CARD_TITLE=$(echo "$card" | jq -r '.title // "Untitled"')
    
    # Get card properties
    CARD_STATUS=$(echo "$card" | jq -r '.properties.status // empty')
    CARD_PROJECT=$(echo "$card" | jq -r '.properties.project // empty')
    
    # Skip if no card code
    if [ -z "$CARD_CODE" ] || [ "$CARD_CODE" = "null" ]; then
        echo -e "${YELLOW}⊘ Skipping card without code: ${CARD_TITLE}${NC}"
        ((SKIPPED++))
        continue
    fi
    
    # Filter by status and project if specified
    if [ -n "$STATUS_FILTER" ] && [ "$CARD_STATUS" != "$STATUS_FILTER" ]; then
        echo -e "${YELLOW}⊘ Skipping ${CARD_CODE}: Status '${CARD_STATUS}' != '${STATUS_FILTER}'${NC}"
        ((SKIPPED++))
        continue
    fi
    
    if [ -n "$PROJECT_FILTER" ] && [ "$CARD_PROJECT" != "$PROJECT_FILTER" ]; then
        echo -e "${YELLOW}⊘ Skipping ${CARD_CODE}: Project '${CARD_PROJECT}' != '${PROJECT_FILTER}'${NC}"
        ((SKIPPED++))
        continue
    fi
    
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${GREEN}✓ Processing: ${CARD_CODE} - ${CARD_TITLE}${NC}"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

    # Get card description (from content blocks)
    CARD_DESCRIPTION=$(echo "$card" | jq -r '.fields.description // "No description"')

    # Extract GitHub branch from card fields if it exists
    # The githubBranch field contains: {ref: "refs/heads/branch-name", url: "...", repo: "...", createdAt: "..."}
    GITHUB_BRANCH_REF=$(echo "$card" | jq -r '.fields.githubBranch.ref // empty')
    EXISTING_BRANCH_NAME=""

    if [ -n "$GITHUB_BRANCH_REF" ] && [ "$GITHUB_BRANCH_REF" != "null" ]; then
        # Extract branch name from ref (e.g., "refs/heads/fb-123/my-feature" -> "fb-123/my-feature")
        EXISTING_BRANCH_NAME=$(echo "$GITHUB_BRANCH_REF" | sed 's|^refs/heads/||')
        echo -e "${GREEN}✓ Card has associated branch: ${EXISTING_BRANCH_NAME}${NC}"
    fi

    # Execute bot task
    if [ -f "./scripts/execute-bot-task.sh" ]; then
        ./scripts/execute-bot-task.sh \
            "$CARD_CODE" \
            "$CARD_TITLE" \
            "$CARD_DESCRIPTION" \
            "$REPO_OWNER" \
            "$REPO_NAME" \
            "$EXISTING_BRANCH_NAME"

        ((PROCESSED++))
    else
        echo -e "${RED}❌ Error: execute-bot-task.sh not found${NC}"
        exit 1
    fi
    
    echo ""
done <<< "$CARDS"

echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}✅ Polling complete${NC}"
echo -e "   Processed: ${PROCESSED}"
echo -e "   Skipped: ${SKIPPED}"
echo -e "   Total: ${CARD_COUNT}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"


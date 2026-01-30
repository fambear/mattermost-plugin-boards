#!/bin/bash
set -e

# Script to execute a bot task for a card
# Usage: ./scripts/execute-bot-task.sh <card_code> <card_title> <card_description> <repo_owner> <repo_name>

CARD_CODE="$1"
CARD_TITLE="$2"
CARD_DESCRIPTION="$3"
REPO_OWNER="$4"
REPO_NAME="$5"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🤖 Bot Task Execution${NC}"
echo -e "${BLUE}=====================${NC}"
echo ""

# Validate inputs
if [ -z "$CARD_CODE" ] || [ -z "$CARD_TITLE" ] || [ -z "$REPO_OWNER" ] || [ -z "$REPO_NAME" ]; then
    echo -e "${RED}❌ Error: Missing required parameters${NC}"
    echo "Usage: $0 <card_code> <card_title> <card_description> <repo_owner> <repo_name>"
    exit 1
fi

# Validate and sanitize CARD_CODE for use in git branch names
# Git branch names cannot contain: spaces, ~, ^, :, ?, *, [, \, .., @{, //, end with /, or end with .lock
if [[ ! "$CARD_CODE" =~ ^[a-zA-Z0-9._-]+$ ]]; then
    echo -e "${RED}❌ Error: Invalid CARD_CODE '${CARD_CODE}'${NC}"
    echo "CARD_CODE must contain only alphanumeric characters, dots, underscores, and hyphens"
    echo "Invalid characters detected. Please use a valid card code format (e.g., IT-367, PROJ_123)"
    exit 1
fi

# Additional check: ensure it doesn't start or end with problematic characters
if [[ "$CARD_CODE" =~ ^[.-] ]] || [[ "$CARD_CODE" =~ [.-]$ ]]; then
    echo -e "${RED}❌ Error: Invalid CARD_CODE '${CARD_CODE}'${NC}"
    echo "CARD_CODE cannot start or end with dots or hyphens"
    exit 1
fi

echo -e "${YELLOW}📋 Card: ${CARD_CODE} - ${CARD_TITLE}${NC}"
echo -e "${YELLOW}📦 Repository: ${REPO_OWNER}/${REPO_NAME}${NC}"
echo ""

# Check if we're in a git repository
if [ ! -d ".git" ]; then
    echo -e "${RED}❌ Error: Not in a git repository${NC}"
    exit 1
fi

# Check for clean working tree before proceeding
echo -e "${YELLOW}🔍 Checking working tree status...${NC}"
if ! git diff-index --quiet HEAD -- 2>/dev/null; then
    echo -e "${RED}❌ Error: Working tree has uncommitted changes${NC}"
    echo ""
    echo "Please commit or stash your changes before running this script:"
    echo "  git status                    # See what changed"
    echo "  git stash                     # Temporarily save changes"
    echo "  git commit -am 'message'      # Commit changes"
    echo ""
    git status --short
    exit 1
fi

# Also check for untracked files that might interfere
if [ -n "$(git ls-files --others --exclude-standard)" ]; then
    echo -e "${YELLOW}⚠️  Warning: Untracked files detected${NC}"
    echo "The following untracked files exist:"
    git ls-files --others --exclude-standard
    echo ""
    echo -e "${YELLOW}Continuing anyway (untracked files won't interfere with branch switching)${NC}"
    echo ""
fi

# Fetch latest changes
echo -e "${YELLOW}🔄 Fetching latest changes...${NC}"
git fetch origin

# Check if branch already exists (locally or remotely)
BRANCH_NAME="bot/${CARD_CODE}"
EXISTING_BRANCH=""

# Check remote branches
if git ls-remote --heads origin "${BRANCH_NAME}" | grep -q "${BRANCH_NAME}"; then
    EXISTING_BRANCH="remote"
    echo -e "${GREEN}✓ Found existing remote branch: ${BRANCH_NAME}${NC}"
elif git show-ref --verify --quiet "refs/heads/${BRANCH_NAME}"; then
    EXISTING_BRANCH="local"
    echo -e "${GREEN}✓ Found existing local branch: ${BRANCH_NAME}${NC}"
fi

# Handle existing or new branch
if [ -n "$EXISTING_BRANCH" ]; then
    echo -e "${YELLOW}📌 Using existing branch: ${BRANCH_NAME}${NC}"
    
    # Checkout existing branch
    if [ "$EXISTING_BRANCH" = "remote" ]; then
        git checkout -B "${BRANCH_NAME}" "origin/${BRANCH_NAME}"
    else
        git checkout "${BRANCH_NAME}"
    fi
    
    # Pull latest changes if remote exists
    if [ "$EXISTING_BRANCH" = "remote" ]; then
        git pull origin "${BRANCH_NAME}"
    fi
else
    echo -e "${YELLOW}🌿 Creating new branch: ${BRANCH_NAME}${NC}"
    
    # Get default branch using symbolic-ref (locale-independent and reliable)
    # This queries the remote HEAD reference directly
    DEFAULT_BRANCH=$(git symbolic-ref refs/remotes/origin/HEAD 2>/dev/null | sed 's@^refs/remotes/origin/@@')

    # If symbolic-ref fails (e.g., remote HEAD not set), try to detect it
    if [ -z "$DEFAULT_BRANCH" ]; then
        # Set the remote HEAD reference
        git remote set-head origin --auto >/dev/null 2>&1 || true
        DEFAULT_BRANCH=$(git symbolic-ref refs/remotes/origin/HEAD 2>/dev/null | sed 's@^refs/remotes/origin/@@')
    fi

    # Final fallback: check which common default branch exists
    if [ -z "$DEFAULT_BRANCH" ]; then
        if git ls-remote --heads origin main | grep -q "main"; then
            DEFAULT_BRANCH="main"
        elif git ls-remote --heads origin master | grep -q "master"; then
            DEFAULT_BRANCH="master"
        else
            echo -e "${RED}❌ Error: Could not determine default branch${NC}"
            exit 1
        fi
    fi
    
    # Ensure we're on the latest default branch
    git checkout "${DEFAULT_BRANCH}"
    git pull origin "${DEFAULT_BRANCH}"
    
    # Create new branch
    git checkout -b "${BRANCH_NAME}"
fi

echo ""
echo -e "${GREEN}✅ Branch ready: ${BRANCH_NAME}${NC}"
echo ""

# Prepare instruction for Augment
INSTRUCTION="Work on task ${CARD_CODE}: ${CARD_TITLE}

Description:
${CARD_DESCRIPTION}

You are working on branch: ${BRANCH_NAME}

Please:
1. Analyze the task requirements
2. Make necessary code changes
3. Ensure all tests pass
4. Commit your changes with a clear message referencing ${CARD_CODE}
5. Push the branch to origin

Do NOT create a pull request yet - just prepare the branch with the changes."

echo -e "${BLUE}📝 Instruction for Augment:${NC}"
echo "---"
echo "$INSTRUCTION"
echo "---"
echo ""

# Export branch name for use by calling script
echo "BRANCH_NAME=${BRANCH_NAME}"
echo "EXISTING_BRANCH=${EXISTING_BRANCH}"

echo -e "${GREEN}✅ Ready to execute task${NC}"
echo ""
echo -e "${YELLOW}💡 Next steps:${NC}"
echo "   - Pass the instruction to Augment"
echo "   - Augment will work on branch: ${BRANCH_NAME}"
if [ -n "$EXISTING_BRANCH" ]; then
    echo "   - Continuing work on existing branch"
else
    echo "   - Starting fresh work on new branch"
fi


# Bot Automation Guide

This document describes the bot automation system for Mattermost Boards plugin development.

## Overview

The bot automation system allows automated task execution based on cards in Mattermost Boards. The key feature is **smart branch management** - the bot checks for existing branches and continues work on them instead of creating duplicates.

## Architecture

```
┌─────────────────────┐
│ Mattermost Boards   │
│   (Cards/Tasks)     │
└──────────┬──────────┘
           │
           │ API Poll
           ▼
┌─────────────────────┐
│ poll-and-dispatch.sh│
│  - Fetch cards      │
│  - Filter by status │
│  - Dispatch tasks   │
└──────────┬──────────┘
           │
           │ For each card
           ▼
┌─────────────────────┐
│execute-bot-task.sh  │
│  - Check branches   │
│  - Use existing OR  │
│  - Create new       │
│  - Prepare work     │
└──────────┬──────────┘
           │
           │ Pass to
           ▼
┌─────────────────────┐
│   Augment Agent     │
│  - Execute task     │
│  - Make changes     │
│  - Commit & push    │
└─────────────────────┘
```

## Scripts

### 1. poll-and-dispatch.sh

**Purpose:** Poll Mattermost Boards API for cards and dispatch bot tasks.

**Key Features:**
- Fetches cards from specified board
- Filters by status and project
- Calls execute-bot-task.sh for each matching card
- Provides detailed logging and statistics

**Configuration (Environment Variables):**
```bash
MM_ACCESS_TOKEN      # Required: Mattermost API token
MM_SERVER_URL        # Default: https://mm.fambear.online
MM_BOARD_ID          # Default: bpn1j696qhjg1bfp45x59x57tdr
STATUS_FILTER        # Default: "In Progress"
PROJECT_FILTER       # Default: "Boards"
REPO_OWNER           # Default: fambear
REPO_NAME            # Default: mattermost-plugin-boards
```

**Usage:**
```bash
export MM_ACCESS_TOKEN="your_token"
./scripts/poll-and-dispatch.sh
```

### 2. execute-bot-task.sh

**Purpose:** Execute a bot task for a specific card with smart branch management.

**Key Features:**
- **Checks for existing branches** (both local and remote)
- **Uses existing branch** if found (continues previous work)
- **Creates new branch** only if none exists
- Prepares instruction for Augment
- Outputs branch information for tracking

**Branch Naming Convention:**
```
bot/{card_code}
```

Examples:
- `bot/IT-367`
- `bot/BOARD-123`
- `bot/FIX-42`

**Logic Flow:**
```
1. Fetch latest changes from origin
2. Check if branch bot/{card_code} exists:
   a. Check remote: git ls-remote --heads origin bot/{card_code}
   b. Check local: git show-ref --verify refs/heads/bot/{card_code}
3. If branch exists:
   - Checkout existing branch
   - Pull latest changes
   - Continue work on existing branch
4. If branch does NOT exist:
   - Checkout default branch (main/master)
   - Pull latest changes
   - Create new branch bot/{card_code}
   - Start fresh work
5. Prepare instruction for Augment
6. Output branch name and status
```

**Usage:**
```bash
./scripts/execute-bot-task.sh \
    "IT-367" \
    "Fix login bug" \
    "Users cannot login with OAuth" \
    "fambear" \
    "mattermost-plugin-boards"
```

## Workflow Example

### Scenario 1: First Time Task

1. Card IT-367 is created in Mattermost Boards
2. Status is set to "In Progress"
3. poll-and-dispatch.sh finds the card
4. execute-bot-task.sh is called
5. No branch `bot/IT-367` exists
6. New branch `bot/IT-367` is created from `main`
7. Augment works on the task
8. Changes are committed and pushed to `bot/IT-367`

### Scenario 2: Continuing Previous Work

1. Card IT-367 still has status "In Progress"
2. poll-and-dispatch.sh finds the card again
3. execute-bot-task.sh is called
4. Branch `bot/IT-367` already exists remotely
5. **Existing branch is checked out** (not creating a new one!)
6. Latest changes are pulled
7. Augment continues work on the same branch
8. Additional changes are committed and pushed

### Scenario 3: Manual Branch Creation

1. Developer manually creates branch `bot/IT-367`
2. Developer makes some initial changes
3. poll-and-dispatch.sh finds card IT-367
4. execute-bot-task.sh is called
5. Branch `bot/IT-367` exists
6. **Bot uses the existing branch** (respects manual work!)
7. Augment continues from where developer left off

## Setup

### Prerequisites

```bash
# Install required tools
sudo apt-get install jq curl git  # Ubuntu/Debian
brew install jq curl git           # macOS
```

### Configuration

1. Get Mattermost access token:
   ```bash
   # Login to Mattermost
   # Go to Account Settings > Security > Personal Access Tokens
   # Create new token with appropriate permissions
   ```

2. Create environment file:
   ```bash
   cat > ~/.bot-env << 'EOF'
   export MM_ACCESS_TOKEN="your_mattermost_token"
   export MM_SERVER_URL="https://mm.fambear.online"
   export MM_BOARD_ID="bpn1j696qhjg1bfp45x59x57tdr"
   EOF
   
   chmod 600 ~/.bot-env
   ```

3. Test manually:
   ```bash
   source ~/.bot-env
   cd /path/to/mattermost-plugin-boards
   ./scripts/poll-and-dispatch.sh
   ```

### Automation (Cron)

```bash
# Edit crontab
crontab -e

# Add line to poll every 15 minutes
*/15 * * * * source ~/.bot-env && cd /path/to/repo && ./scripts/poll-and-dispatch.sh >> /var/log/bot-tasks.log 2>&1
```

## Benefits

1. **No Duplicate Branches:** Bot reuses existing branches instead of creating `bot/IT-367-2`, `bot/IT-367-3`, etc.

2. **Continues Previous Work:** If bot was interrupted or failed, it picks up where it left off.

3. **Respects Manual Work:** If developer started work on a branch, bot continues from there.

4. **Clean Git History:** One branch per task, not multiple attempts.

5. **Easy Tracking:** Branch name directly corresponds to card code.

## Troubleshooting

See [scripts/README.md](../scripts/README.md#-troubleshooting) for common issues and solutions.

## Related

- [scripts/README.md](../scripts/README.md) - Detailed script documentation
- [IT-367](https://mm.fambear.online) - Original feature request


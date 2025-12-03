# git-review

**Clean up your messy branches before creating a PR.**

## What Does This Do?

Ever work on a feature branch and end up with:
- Debug console.logs you forgot to remove
- Experimental code you don't want to commit
- Changes to files you didn't mean to modify
- A messy commit history that needs cleaning

**git-review** lets you review and selectively choose which changes to include in your PR:

1. **Compares two branches** - Shows all differences between your feature branch and main
2. **Creates a review branch** - All changes are uncommitted and ready for review
3. **Review each file** - Use VSCode's Source Control to see diffs and stage only what you want
4. **Creates clean history** - Optionally replaces your feature branch with only the approved changes

### Before and After

```bash
# BEFORE: Your feature branch
$ git status
nothing to commit, working tree clean

# But it has 25 commits and lots of messy changes vs main

# AFTER: Running git-review
$ git-review
✔ Select source branch (FROM): feat/my-feature
✔ Select target branch (TO): main

$ git status
On branch feat/my-feature-review
Changes not staged for commit:
  modified:   src/component.tsx
  modified:   src/utils.ts
  modified:   src/debug.ts        # ← You can discard this
  modified:   src/experimental.ts # ← And this
  ...

# Now review in VSCode and stage only what you want!
```

## Demo

![Demo](demo.gif)

> **Recording**: Uses asciinema to show the complete workflow from clean state to staged changes

## Changes generated using git-review tool

![Changes](review-branch.png)

## Features

- 🔍 Compare any two branches with a visual diff in your editor
- ✅ Selectively stage/commit only the changes you want
- 🎨 Beautiful colored CLI output
- 💬 Interactive branch selection with arrow keys
- 🔄 Fetches remote branches automatically
- 🚀 Works globally in any git repository
- ⚡ Fast CLI mode when all flags provided

## Installation

The tool is already installed globally via `npm link`. You can use it anywhere!

```bash
git-review --help
```

## Usage

### Interactive Mode (Recommended)

Just run the command and select branches using arrow keys:
```bash
git-review
```

This will:
1. Fetch all local and remote branches
2. Prompt you to select the FROM branch (defaults to current)
3. Prompt you to select the TO branch (defaults to main/master)
4. Create the review branch with uncommitted changes

### CLI Mode (Fast)

Provide all flags to skip interactive prompts:
```bash
# Compare specific branches (no prompts)
git-review --from=feature-branch --to=main

# Partial flags (will prompt for missing ones)
git-review --to=develop

# Use custom suffix
git-review --from=feat/new --to=main --suffix=-pr

# Skip all confirmation prompts
git-review --from=feat/new --to=main --no-interactive
```

## How It Works

### Complete Interactive Workflow

1. **Select branches** - Choose FROM and TO branches (or provide via flags)
2. **Creates review branch** - Based on the target branch with all changes uncommitted
3. **Review in editor** - Opens VSCode Source Control to review each file
4. **Wait prompt** - CLI asks if you want to wait for review and finalize
5. **Stage changes** - You selectively stage only the files you want
6. **Press Enter** - Return to CLI when done reviewing
7. **Auto-finalize** - Commits staged changes and replaces original branch
8. **Optional push** - Optionally push to remote with `--force-with-lease`

### Result
Your original feature branch is replaced with only the reviewed/approved changes!

## Example Workflow

### Interactive Mode (Complete Flow)

```bash
# Start the review process
git-review

# CLI prompts:
# → Select source branch (FROM): feat/my-feature ✓
# → Select target branch (TO): main ✓
# → Wait for review and finalize changes? Yes ✓

# CLI creates review branch and waits...
# → Review your changes in the editor, then press Enter to continue...

# Now you review in VSCode:
# 1. Open Source Control (Ctrl+Shift+G)
# 2. Click each file to see the diff
# 3. Stage files you want (✓)
# 4. Discard unwanted changes (✗)
# 5. Press Enter in terminal when done

# CLI continues:
# → Found 12 staged file(s)
# → Replace 'feat/my-feature' with reviewed changes? Yes ✓
# → Enter commit message: Clean PR ready for review ✓
# → Push changes to remote? Yes ✓

# Done! Your feat/my-feature branch now has only approved changes
```

### CLI Mode (Fast, No Prompts)

```bash
git-review --from=feat/new --to=main --no-interactive
# Creates review branch, you manually review and commit
```

## Options

| Option | Description | Default |
|--------|-------------|---------|
| `--from <branch>` | Source branch to compare from | Current branch |
| `--to <branch>` | Target branch to compare to | `main` |
| `--suffix <text>` | Suffix for review branch name | `-review` |
| `--no-interactive` | Skip confirmation prompts | Interactive mode |
| `-h, --help` | Display help message | - |
| `-V, --version` | Display version number | - |

## Development

Located at: `/home/tpwidman/Utils/git-review`

### Project Structure
```
git-review/
├── src/
│   └── index.ts      # Main CLI source
├── dist/             # Compiled JavaScript (built from TS)
├── tsconfig.json     # TypeScript configuration
└── package.json      # Project configuration
```

### Making Changes

```bash
cd /home/tpwidman/Utils/git-review

# Make your changes in src/index.ts

# Rebuild
npm run build

# The changes are automatically available via npm link
git-review --help
```

### Useful Commands

```bash
npm run build         # Build TypeScript
npm run dev          # Run directly with ts-node
npm link             # Re-link globally (if needed)
npm unlink -g        # Uninstall globally
```

## Troubleshooting

**Command not found:**
```bash
cd /home/tpwidman/Utils/git-review
npm link
```

**TypeScript errors:**
```bash
npm run build
```

**Uncommitted changes warning:**
The tool will prompt you to stash your changes before creating the review branch.

## License

MIT

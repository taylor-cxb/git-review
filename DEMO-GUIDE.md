# Demo Recording Guide

This guide helps you record a demo showing the git-review workflow.

## Recording with asciinema

```bash
# Start recording
asciinema rec demo.cast

# Follow the script below...
# When done, press Ctrl+D

# Convert to GIF
agg demo.cast demo.gif --speed 1.5 --font-size 16
```

## Demo Script

### 1. Show clean working directory
```bash
git status
```
*Expected output: "nothing to commit, working tree clean"*

### 2. Show current branch
```bash
git branch --show-current
```

### 3. Run git-review
```bash
git-review
```

### 4. Interactive prompts:
- **Select source branch (FROM):** Use arrow keys to select your feature branch, press Enter
- **Select target branch (TO):** Use arrow keys to select `main`, press Enter
- **Wait for review and finalize changes?** Type `n` and press Enter (we'll just show the review branch creation)

### 5. Show the created review branch
```bash
git branch --show-current
```
*Expected output: `your-feature-branch-review`*

### 6. Show uncommitted changes
```bash
git status
```
*Expected output: Shows all modified files as unstaged*

### 7. Show how many files changed
```bash
git status --short | wc -l
```

### 8. Show a file diff (optional)
```bash
git diff <some-file> | head -20
```

### 9. Stop recording
Press `Ctrl+D`

## Tips

- **Keep it short**: Aim for 30-60 seconds
- **Slow down**: Type slower than normal so viewers can follow
- **Clear terminal**: Run `clear` before starting
- **Use a real branch**: Record in a repo with actual changes
- **Font size**: Use a larger terminal font (16-18pt) for readability
- **Speed up boring parts**: Use `agg --speed 2` to speed up slow sections

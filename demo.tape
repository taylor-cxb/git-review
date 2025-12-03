# VHS documentation: https://github.com/charmbracelet/vhs
#
# This script demonstrates the git-review workflow
#
Output demo.gif

Set Shell "bash"
Set FontSize 16
Set Width 1400
Set Height 700
Set Padding 20
Set Theme "Dracula"

# Show clean working directory
Type "# Start with a clean working directory"
Enter
Sleep 500ms
Type "git status"
Enter
Sleep 2s

# Show current branch
Type "git branch --show-current"
Enter
Sleep 1s

# Run git-review
Type "# Now run git-review to compare branches"
Enter
Sleep 500ms
Type "git-review"
Enter
Sleep 2s

# Wait for branch list to appear
Sleep 1s

# Select first branch (source)
Enter
Sleep 1s

# Select main for target
Down
Enter
Sleep 1s

# Type "n" for no finalize (just create review branch)
Type "n"
Enter
Sleep 2s

# Show we're now on review branch
Type "# Now we're on the review branch"
Enter
Sleep 500ms
Type "git branch --show-current"
Enter
Sleep 2s

# Show uncommitted changes ready for review
Type "# All changes are uncommitted and ready for review"
Enter
Sleep 500ms
Type "git status --short"
Enter
Sleep 3s

# End
Sleep 1s

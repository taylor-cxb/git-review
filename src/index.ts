#!/usr/bin/env node

import { program } from 'commander';
import select from '@inquirer/select';
import confirm from '@inquirer/confirm';
import input from '@inquirer/input';
import chalk from 'chalk';
import simpleGit, { SimpleGit } from 'simple-git';
import { execSync } from 'child_process';

const git: SimpleGit = simpleGit();

interface Options {
  from?: string;
  to?: string;
  suffix: string;
  interactive: boolean;
}

// CLI Configuration
program
  .name('git-review')
  .description('Interactive branch comparison tool for reviewing changes before creating a PR')
  .version('1.0.0')
  .option('--from <branch>', 'Source branch to compare from (default: interactive selection)')
  .option('--to <branch>', 'Target branch to compare to (default: interactive selection)')
  .option('--suffix <text>', 'Suffix for review branch', '-review')
  .option('--no-interactive', 'Skip confirmation prompts')
  .parse(process.argv);

const options = program.opts<Options>();

/**
 * Get all available branches (local and remote)
 */
async function getAllBranches(): Promise<string[]> {
  try {
    // Fetch remote branches (silently)
    await git.fetch(['--all', '--quiet']).catch(() => {
      // Ignore fetch errors (might not have remote)
    });

    // Get local and remote branches
    const branches = await git.branch(['-a']);
    const allBranches = new Set<string>();

    // Add local branches
    branches.all.forEach(branch => {
      // Remove current branch indicator and whitespace
      const cleanBranch = branch.replace(/^\*?\s+/, '').trim();
      // Skip HEAD references
      if (!cleanBranch.includes('HEAD')) {
        allBranches.add(cleanBranch);
      }
    });

    // Parse remote branches and add them without remote prefix
    branches.all.forEach(branch => {
      if (branch.includes('remotes/')) {
        // Extract branch name without remote prefix
        const match = branch.match(/remotes\/[^/]+\/(.+)/);
        if (match && match[1] && !match[1].includes('HEAD')) {
          allBranches.add(match[1]);
        }
      }
    });

    return Array.from(allBranches).sort();
  } catch (error) {
    console.error(chalk.red('✗ Error fetching branches'));
    throw error;
  }
}

async function main(): Promise<void> {
  try {
    // Check if we're in a git repository
    const isRepo = await git.checkIsRepo();
    if (!isRepo) {
      console.error(chalk.red('✗ Error: Not a git repository'));
      process.exit(1);
    }

    const currentBranch = await git.revparse(['--abbrev-ref', 'HEAD']);
    let fromBranch: string;
    let toBranch: string;

    // Interactive branch selection if flags not provided
    if (!options.from || !options.to) {
      console.log(chalk.blue('⚙ Fetching branches...'));
      const allBranches = await getAllBranches();

      if (allBranches.length === 0) {
        console.error(chalk.red('✗ Error: No branches found'));
        process.exit(1);
      }

      // Select FROM branch
      if (!options.from) {
        fromBranch = await select({
          message: 'Select source branch (FROM):',
          choices: allBranches.map(branch => ({ value: branch, name: branch })),
          default: currentBranch,
          pageSize: 15,
        });
      } else {
        fromBranch = options.from;
      }

      // Select TO branch
      if (!options.to) {
        const defaultTo = allBranches.includes('main') ? 'main' :
                         allBranches.includes('master') ? 'master' :
                         allBranches[0];

        toBranch = await select({
          message: 'Select target branch (TO):',
          choices: allBranches.map(branch => ({ value: branch, name: branch })),
          default: defaultTo,
          pageSize: 15,
        });
      } else {
        toBranch = options.to;
      }
    } else {
      fromBranch = options.from;
      toBranch = options.to;
    }

    const suffix = options.suffix;
    const reviewBranch = `${fromBranch}${suffix}`;

    // Display header
    console.log(chalk.blue.bold('\n╔═══════════════════════════════════════╗'));
    console.log(chalk.blue.bold('║         Git Review Tool               ║'));
    console.log(chalk.blue.bold('╚═══════════════════════════════════════╝\n'));

    console.log(chalk.gray('From branch:  ') + chalk.green(fromBranch));
    console.log(chalk.gray('To branch:    ') + chalk.green(toBranch));
    console.log(chalk.gray('Review branch:') + chalk.yellow(reviewBranch));
    console.log('');

    // Validate branches exist
    try {
      await git.revparse(['--verify', fromBranch]);
    } catch (error) {
      console.error(chalk.red(`✗ Error: Branch '${fromBranch}' does not exist`));
      process.exit(1);
    }

    try {
      await git.revparse(['--verify', toBranch]);
    } catch (error) {
      console.error(chalk.red(`✗ Error: Branch '${toBranch}' does not exist`));
      process.exit(1);
    }

    // Check if review branch already exists
    const branches = await git.branchLocal();
    if (branches.all.includes(reviewBranch)) {
      if (options.interactive) {
        const recreate = await confirm({
          message: chalk.yellow(`Review branch '${reviewBranch}' already exists. Delete and recreate?`),
          default: false,
        });

        if (!recreate) {
          console.log(chalk.gray('Aborted'));
          process.exit(0);
        }
      }

      await git.deleteLocalBranch(reviewBranch, true);
      console.log(chalk.green('✓ Deleted existing review branch'));
    }

    // Check for uncommitted changes
    const status = await git.status();
    if (!status.isClean()) {
      if (options.interactive) {
        const stash = await confirm({
          message: chalk.yellow('You have uncommitted changes. Stash them and continue?'),
          default: true,
        });

        if (!stash) {
          console.log(chalk.gray('Aborted'));
          process.exit(0);
        }
      }

      await git.stash(['push', '-m', `git-review: stashed before creating ${reviewBranch}`]);
      console.log(chalk.green('✓ Changes stashed'));
    }

    // Create review branch from target branch
    console.log(chalk.blue('\n⚙ Creating review branch...'));
    await git.checkout(toBranch);
    await git.checkoutLocalBranch(reviewBranch);

    // Generate diff
    console.log(chalk.blue('⚙ Generating diff...'));
    const diff = await git.diff([`${toBranch}..${fromBranch}`]);

    if (!diff || diff.trim() === '') {
      console.log(chalk.yellow(`\n✓ No differences found between ${fromBranch} and ${toBranch}`));
      await git.checkout(fromBranch);
      await git.deleteLocalBranch(reviewBranch, true);
      process.exit(0);
    }

    // Apply the diff
    console.log(chalk.blue('⚙ Applying changes...'));
    try {
      // Use git apply via command line for better compatibility
      execSync(`git apply`, {
        input: diff,
        cwd: process.cwd(),
      });

      // Get change statistics
      const statusAfter = await git.status();
      const modified = statusAfter.modified.length;
      const created = statusAfter.created.length;
      const deleted = statusAfter.deleted.length;
      const notAdded = statusAfter.not_added.length;
      const total = modified + created + deleted + notAdded;

      // Display success message
      console.log(chalk.green.bold('\n✓ Success!\n'));
      console.log(chalk.gray('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'));
      console.log(chalk.gray('Review branch: ') + chalk.yellow(reviewBranch));
      console.log(chalk.gray('Files changed:  ') + chalk.yellow(total) + chalk.gray(` (${modified} modified, ${created} new, ${deleted} deleted)`));
      console.log(chalk.gray('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n'));

      console.log(chalk.blue.bold('Next steps:'));
      console.log(chalk.gray('  1. ') + 'Open your editor and review changes in Source Control');
      console.log(chalk.gray('  2. ') + 'Stage only the files you want to include');
      console.log(chalk.gray('  3. ') + 'Commit the staged changes');
      console.log(chalk.gray('  4. ') + 'Push and create PR\n');

      console.log(chalk.blue.bold('Useful commands:'));
      console.log(chalk.cyan('  git status') + chalk.gray('                    # See all changes'));
      console.log(chalk.cyan('  git diff <file>') + chalk.gray('               # View specific file changes'));
      console.log(chalk.cyan('  git checkout -- <file>') + chalk.gray('        # Discard changes to a file'));
      console.log(chalk.cyan(`  git checkout ${fromBranch}`) + chalk.gray('     # Return to original branch'));
      console.log('');

      // Interactive review workflow
      if (options.interactive) {
        const waitForReview = await confirm({
          message: 'Wait for review and finalize changes (commit + replace branch)?',
          default: false,
        });

        if (waitForReview) {
          // Wait for user to finish reviewing
          await input({
            message: chalk.blue('Review your changes in the editor, then press Enter to continue...'),
          });

          // Check for staged changes
          const currentStatus = await git.status();
          const stagedFiles = currentStatus.staged.length;

          if (stagedFiles === 0) {
            console.log(chalk.yellow('\n⚠ No staged changes found.'));
            console.log(chalk.gray('You can stage changes with:') + chalk.cyan(' git add <file>'));
            console.log(chalk.gray('Or abort by running:') + chalk.cyan(` git checkout ${fromBranch} && git branch -D ${reviewBranch}`));
            process.exit(0);
          }

          console.log(chalk.green(`\n✓ Found ${stagedFiles} staged file(s)`));

          // Ask if they want to finalize
          const shouldFinalize = await confirm({
            message: `Replace '${fromBranch}' with reviewed changes?`,
            default: true,
          });

          if (!shouldFinalize) {
            console.log(chalk.gray('\nChanges kept on review branch. You can:'));
            console.log(chalk.cyan(`  git commit -m "your message"`));
            console.log(chalk.cyan(`  git checkout ${fromBranch}`));
            process.exit(0);
          }

          // Get commit message
          const commitMessage = await input({
            message: 'Enter commit message:',
            default: 'Reviewed changes ready for PR',
            validate: (value) => value.trim().length > 0 || 'Commit message cannot be empty',
          });

          // Commit the staged changes
          console.log(chalk.blue('\n⚙ Committing changes...'));
          await git.commit(commitMessage.trim());
          console.log(chalk.green('✓ Changes committed'));

          // Replace original branch with review branch
          console.log(chalk.blue('⚙ Replacing original branch...'));
          await git.checkout(fromBranch);
          await git.raw(['reset', '--hard', reviewBranch]);
          console.log(chalk.green(`✓ Replaced '${fromBranch}' with reviewed changes`));

          // Clean up review branch
          await git.deleteLocalBranch(reviewBranch, true);
          console.log(chalk.green(`✓ Deleted review branch '${reviewBranch}'`));

          // Ask about pushing
          const shouldPush = await confirm({
            message: `Push changes to remote? (${chalk.yellow('will use --force-with-lease')})`,
            default: false,
          });

          if (shouldPush) {
            console.log(chalk.blue('\n⚙ Pushing to remote...'));
            try {
              await git.push(['--force-with-lease']);
              console.log(chalk.green('✓ Successfully pushed to remote'));
            } catch (error) {
              const errorMessage = error instanceof Error ? error.message : String(error);
              console.error(chalk.yellow('⚠ Push failed:'), errorMessage);
              console.log(chalk.gray('\nYou can push manually with:'));
              console.log(chalk.cyan('  git push --force-with-lease'));
            }
          }

          console.log(chalk.green.bold('\n✓ All done! Your branch is ready.\n'));
        }
      }

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error(chalk.red('\n✗ Error: Failed to apply patch'));
      console.error(chalk.gray(errorMessage));
      await git.checkout(fromBranch);
      await git.deleteLocalBranch(reviewBranch, true);
      process.exit(1);
    }

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(chalk.red('\n✗ Error:'), errorMessage);
    process.exit(1);
  }
}

main();

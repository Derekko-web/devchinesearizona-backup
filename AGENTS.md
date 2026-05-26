# Agent Instructions

This repo uses a closed-loop development workflow. GitHub Issues are the task
queue, pull requests are the delivery path, GitHub Actions is the quality gate,
and the VPS is runtime only.

## Required Workflow

When working on a task:

1. Start from a GitHub Issue.
2. Create a new branch from `main`.
3. Make the smallest correct fix for that issue.
4. Run verification from `dev.chinesearizona.com/web`:

   ```bash
   npm run verify
   ```

5. Open a pull request back to `main`.
6. Link the pull request to the issue using `Fixes #ISSUE_NUMBER`.
7. Do not merge your own pull request.
8. Do not deploy manually.
9. Do not edit the VPS live tree in `/var/www` directly unless explicitly asked
   for emergency debugging.

## Branch Naming

Use:

```text
agent/fix-issue-123-short-description
```

## Safety Rules

- Never commit secrets, tokens, passwords, `.env` files, private keys, or VPS
  credentials.
- Keep changes scoped to the assigned issue.
- Do not refactor unrelated code.
- Do not bypass failing tests.
- If CI fails, fix the branch until CI passes.
- If the task is unclear, comment on the GitHub Issue or ask for clarification.

## Normal Loop

```text
GitHub Issue -> Agent Branch -> PR -> CI -> Merge -> Deploy -> Smoke Test -> Runtime Issue
```

For a new Codex chat, the normal prompt can be short:

```text
Work on issue #ISSUE_NUMBER in Derekko-web/devchinesearizona-backup. Follow AGENTS.md. Open a PR when done.
```

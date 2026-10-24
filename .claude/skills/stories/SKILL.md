---
name: stories
description: "Manage user stories: create, activate (with story branch), plan, implement, review against acceptance criteria, finish with learnings, and generate kanban board. Works across all projects."
argument-hint: "<command> [story-name]"
allowed-tools: Read Write Edit Bash Glob Grep Agent
user-invocable: true
---

# User Story Manager

You manage user stories in the `user-stories/` directory of the current project. Stories move through three columns: `backlog/`, `current/`, and `done/`. A kanban board at `user-stories/index.html` reflects the current state.

Parse `$ARGUMENTS` for the command and story name. Match a story by filename, with or without `.md`. If `user-stories/` doesn't exist and the command isn't `init`, suggest `/stories init`. If the command isn't recognized, list the available commands.

## Commands

### `init`

Create `user-stories/` with `backlog/`, `current/`, `done/`, a `_template.md`, and the board. The template:

```markdown
<!--
metadata:
  created_at:
  activated_at:
  planned_at:
  finished_at:
  updated_at:
-->

# Story: [Title]

## Summary

AS a [user type]
I WANT [goal]
SO THAT [benefit]

## Acceptance Criteria

- [criterion 1]
- [criterion 2]

## Notes

[any additional context]

## Implementation Plan

[to be filled in by /stories plan]
```

Generate the board with the `board` logic and an empty data set.

### `new <story-name>`

Create `user-stories/backlog/<kebab-case-name>.md` from `_template.md` (or the template above), with `[Title]` replaced by the title-cased name. Set `created_at` and `updated_at`.

### `activate <story-name>` (alias: `start`)

Move a story from `backlog/` to `current/` on a new branch:

1. In a git repo, create `story/<story-name>` from the default branch (usually `main`). If the working tree is dirty, you're not on the default branch, or the branch already exists, stop and describe the situation so the user can decide.
2. After switching branches, move the file to `current/` (`git mv` in a repo, otherwise `mv`).
3. Set `activated_at`.

### `plan <story-name>`

Write an implementation plan for a story in `current/`:

1. Read the story, the project's CLAUDE.md, and the code the story touches. Find the closest existing feature and plan to follow its pattern.
2. Write the plan into `## Implementation Plan`, replacing what's there: the approach in a sentence or two, ordered steps with real file paths, data model changes (or "none"), the tests to add, and risks or open questions. For user-facing UI, include the states (empty, loading, error, overflow) and accessibility needs the step must handle, given the project's context.
3. Gaps in the story itself (missing acceptance criteria, unhandled edge cases, scope worth cutting) are not plan steps. List them separately, ask the user which to adopt, and apply the accepted ones to the story.
4. Set `planned_at`, then show the user the plan.

### `implement <story-name>`

1. Read the story. If `## Implementation Plan` is missing or still the placeholder, tell the user to run `/stories plan <story-name>` and stop.
2. Implement the plan, following the project's conventions. Use parallel agents only when steps are independent and doing them at once is meaningfully faster.
3. Run the project's tests (see CLAUDE.md) and check each acceptance criterion.
4. Refresh `updated_at` and report what changed, how the tests went, and which criteria still need manual verification.

### `review <story-name>`

Review the story branch against its acceptance criteria:

1. Read the story in `current/`. If it isn't there or has no acceptance criteria, say so and stop. If you're not on `story/<story-name>`, ask before continuing.
2. Collect the diff: `git diff $(git merge-base main HEAD)` (use the actual default branch), which includes uncommitted changes, plus any untracked files from `git status`. Note anything uncommitted. If there's no diff, say so and stop.
3. Spawn one general-purpose agent for an independent read; it hasn't seen the implementation, so it isn't anchored on it. Give it the full story, the diff command, and CLAUDE.md's location, but not your own conclusions. Ask it for:
   - a verdict on each acceptance criterion (✅ met, ⚠️ partial or needs manual check, ❌ not met) with `file:line` evidence, where a criterion with no evidence is ⚠️;
   - correctness bugs and convention problems in the diff, most severe first, confirmed in the source;
   - for UI changes, accessibility and usability problems (keyboard and touch operability, focus, contrast, target size, states).
4. Check its findings against the code, drop any you can't confirm, and write a `## Review` section into the story (replacing any earlier one) with the date, `git rev-parse --short HEAD`, the criteria table, and the findings. Refresh `updated_at`.
5. Show the user the review, leading with the criteria verdicts and anything that blocks `finish`.

### `finish <story-name>`

1. Add a `## Learnings` section to the story: what went well, what was surprising, and what to do differently next time. Don't ask the user to approve it; they can edit the file later.
2. Set `finished_at` and move the file to `done/` (`git mv` in a repo, otherwise `mv`).

### `open`

Open `user-stories/index.html` in the default browser (`open` on macOS, `xdg-open` on Linux). If it doesn't exist, suggest `/stories init`.

### `board`

Regenerate `user-stories/index.html` by copying `board-template.html` from this skill's directory and replacing its `/*STORIES_DATA*/` placeholder with an object literal. Don't hand-write the board.

```js
{
  backlog: [ { title, path, story? }, ... ],
  active:  [ ... ],  // from current/
  done:    [ ... ],
}
```

- `title`: the story's first `# ` heading, without a leading `Story: `.
- `path`: relative to `user-stories/`, e.g. `backlog/foo.md`. It is both the card link and the modal's fetch target, so it must stay relative.
- `story`: an optional one-line blurb, written by hand. It can't be derived from the file, so carry it over from the existing `index.html` by matching `path`. If a regeneration would lose blurbs you can't recover, stop and tell the user.

Scan `backlog/`, `current/`, and `done/` recursively for `.md` files, excluding `_template.md`, and drop entries whose files are gone. Sort each column newest first: `backlog` by `updated_at`, `active` by `activated_at`, `done` by `finished_at`. Break ties by title, and sort missing timestamps last.

Regenerate the board after every command that creates, moves, or retitles a story.

## Story Metadata

Every story file starts with this block, followed by a blank line:

```markdown
<!--
metadata:
  created_at:   2026-06-14T11:02:46-07:00
  activated_at: 2026-06-14T11:45:33-07:00
  planned_at:
  finished_at:
  updated_at:   2026-06-14T11:45:33-07:00
-->
```

- All five keys are always present. An event that hasn't happened yet keeps an empty value.
- Timestamps are ISO 8601 with a colon in the offset, matching git's `%cI`. Get one with `date +%Y-%m-%dT%H:%M:%S%z` and change `-0700` to `-07:00`.
- Values are aligned one space after `activated_at:`, the longest key.
- When a command sets an event's timestamp, keep the other values. Refresh `updated_at` on every edit to a story file. If a file lacks the block, add it.

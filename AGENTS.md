# Working on MatteÄventyret (for coding agents)

Read [ARCHITECTURE.md](ARCHITECTURE.md) first: it maps the code, defines level /
question type / kind, and lists the rules the code keeps. This file is the
practical side.

## Before you say it's done

- `npx tsc -b` - type-checks the app **and the tests**. `tsc --noEmit -p .` misses
  test files and has let a broken deploy through.
- `npm test` - the whole suite. The coverage tests tell you what a new level or
  type is missing (see ARCHITECTURE.md, "What the tests catch").
- For UI changes, look at it: `npm run dev`, or the type's story in Storybook.
- `npm run build` when you touched config, imports or anything the PWA caches.

## Conventions

- **Comments** explain why, in plain English, at the density of the surrounding
  code. Swedish maths terms stay Swedish (uppställning, minnessiffra, växling,
  trappan, följdfel).
- **Names:** a type's definition is `<TYPE>_QUESTIONS`. Name a new level's
  generator for what it asks (`additionOneCarry`); trappan and multiplication
  still use the older `stage251` style.
- **Generators** take an `Rng` and nothing else random. Use `pick`, `randInt`
  and `shuffle` from `engine/rng.ts`, and `retry` from
  `engine/questions/questionType.ts` for "try until it fits".
- **Texts** go in both `src/i18n/sv.json` and `en.json`.
- **Never let the recognizer see the expected answer** (ARCHITECTURE.md, "Rules").
- **Keep generation stable.** Changing a generator's use of the rng changes
  every seed's question, in stories and in tests alike. Do it only on purpose.

## Environment gotchas

- **Windows**, Git Bash or PowerShell. Many files have CRLF line endings: match
  exact text with that in mind, and keep a file's line endings when rewriting it.
- **Backslashes:** LaTeX such as `\cdot` and `\frac` gets mangled by shell
  heredocs and `node -e` strings. Write files with an editor tool, or put a
  script in a file.
- **`data/` holds ~800k files.** Never let a watcher, glob or search walk it.
- **Model training** runs pure-JS tfjs and takes hours: run it in the background.
  tfjs-node and wasm don't work here.

## Git

- `main` deploys to the live site on every push. Commit and push only when asked.
- End commit messages with:
  `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.

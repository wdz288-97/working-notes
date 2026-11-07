# Maintaining Ding's working notes

Notes for anyone, person or agent, who maintains this site. They record what was decided while building it and why, so later changes stay consistent. `README.md` covers the files, the build and deployment; this file covers everything else.

This repository is public. Keep anything personal or confidential out of it, including out of this file. Content rules that can't be public live in the owner's private notes (`MyCareer/second-me/working-notes-private.md` on Ding's machine). Read them before writing about work, employers or personal life, and ask Ding when unsure.

## What the site is

- A personal site by Wong Ding Zhe, a business intelligence analyst, for a general audience: people new to business analysis or to AI, and colleagues who want to borrow a method.
- Four parts: Home, the business analysis playbook (a scroll story), Using AI (a hub page plus six chapter pages) and Reading.
- It describes how Ding works. It doesn't address hiring managers or sell anything.
- The playbook starts from work Ding owns: KPIs, requests from other teams and team initiatives, run as one plan, do, check, act loop.

## Content rules

- Every example uses a made-up café chain or an everyday scenario. All figures are illustrative, and the site says so once ("All figures on this site are illustrative").
- No employer names, internal system or table names, vendor names, colleague names or real results. Never invent impact numbers.
- Don't add notes saying that names or systems were left out. The site simply doesn't contain them.
- Facts about AI products, models and history need a source in the chapter's Sources list. Products change quickly, so anything tool-specific carries a date ("as of November 2026").
- Ding's own experience is credited as the last Sources item: "My own practice, as of November 2026."
- Book notes are in Ding's voice, written as a reaction after reading. They stay modest: what the book gave Ding, with no hype. Ding approves each new note before it goes in.

## Writing

- British spelling (organise, colour, analyse), sentence case for headings, plain words.
- Every heading states its message ("Speed pays off only when it turns into value"), never a topic label ("Value").
- First person singular for Ding's practice ("I"), second person for advice to the reader ("you").
- Explain jargon on first use, in a clause or a glossary line. Chapter 1 must work for someone who has never used an AI chat app.
- Avoid AI writing patterns, using the humanizer skill's rules:
  - no "not X but Y" contrasts;
  - no em or en dashes in prose;
  - no staged openers ("Here's the thing", "Let's dive in");
  - no one-line closers that restate the paragraph;
  - no forced groups of three;
  - no inflated words (crucial, pivotal, robust, showcase, landscape).
- Calm tone. Ding's speed-versus-value view is written to inform, not to alarm.
- Self-check questions state their whole setup, so they can be answered without scrolling back.

## Layout

### Every page

- Top bar: the site's name, "Ding's working notes", on the left (linking home), the four parts on the right. The site is named after the notes, not the person; there's no About page because the home intro already says who Ding is.
- Page head: a page name in the accent colour, a large light-weight `h1`, a lede, and often a line drawing beside them (`page-head with-figure`).
- At the bottom: a `next-page` nav (previous page on the left, next page on the right, same order as the top menu), then the footer: "By Wong Ding Zhe" with email and LinkedIn links (the only place the full name appears), and a version line.
- Content width at most 1140px. Text columns stay under about 70 characters a line.
- Phones: 16px side gutters, no sideways scrolling at 360px wide.

### Home

- An intro beside a field of small line drawings that draws itself in once.
- "What's here": three cards, one per part. The cards have no status labels.

### Playbook

- A scroll story: steps on the left, a sticky canvas on the right whose drawings assemble as you scroll.
- On phones the drawing sits at the top and the step text in a fixed box below it. `fitPhoneLayout` in `site.js` measures the tallest step card on each phone and sets `--stage-h`, so the box fits every phone. Scenes scale with `transform: scale()`; zoom made them reflow.
- The loop starts with Plan at the top left and runs clockwise.

### Using AI hub (`ai.html`)

- Collaborator figure in the head.
- Prose sections use `sub split`: on screens 1000px and wider the heading sits in a sticky left column with the text beside it, so wide screens don't look empty.
- The six chapter cards have icons and titles only.
- The tools section is a set of task cards (`.toolkit`, CSS columns) and starts by saying the list is curated from Ding's own research and experience.

### Using AI chapters (`ai-*.html`)

The layout follows what established learning sites do (see References). In order, each chapter has:

1. A page head with an opening drawing and a reading time ("About 10 minutes to read", words ÷ 200).
2. Key ideas first (`.key-ideas`), as a short summary.
3. A contents list (`nav.guide-nav#guide-contents`) of all chapters, with this chapter's sections opened. The section labels match the headings word for word, and the current section is highlighted as you read. On phones the list moves above the text and a floating Contents button (`a.to-contents`) jumps back to it.
4. The text (`article.prose`) with three kinds of box:
   - `.box.practice` for Ding's own practice;
   - `.box.trap` for a common trap;
   - `.box.try` for an exercise.
5. "Check your understanding": tap-an-answer questions (`.quiz`).
6. Sources, numbered in reading order.

### Reading

- A head whose title states the message ("Books teach what work rarely does"), a short note to readers on why and how to read, addressed to "you" like the Using AI hub, and a loop drawing: read, relate, apply, reflect, then read again if needed.
- Then "The books I read" (`.shelf-intro`) with the group links.
- Group links (`.shelf-index`), then four groups of books.
- Each book shows its cover, full title, authors, first year and the edition shown ("1989; 30th anniversary edition, 2020") and Ding's note.
- Covers use the latest edition, resized to about 350px wide.

## Visual system

- **Look:** an airy white page with thin line drawings. Dark mode follows the reader's system setting. All colours are tokens on `:root` in `site.css`, redefined for dark mode.
- **Type:**
  - Source Sans 3 for everything;
  - Source Serif 4 italic for handwritten-style notes in drawings and asides (`--font-note`);
  - Source Code Pro for SQL.
- **Colour, one meaning each** (from IBCS):
  - accent blue = the current thing or a link;
  - amber = "look here";
  - green and red = growth and fall only.
  
  Don't use colour for decoration.
- **Drawings:**
  - Inline SVG built from the `icons.svg` sprite. Strokes use `currentColor`, so they follow the theme.
  - Opening drawings draw in once on load (`.onload`, staggered with `--i`). Everything else is static: the review loop in chapter 3 and the pipeline in chapter 6 were made static on purpose.
  - Labels inside drawings use `aria-label` on the SVG, not `<title>`, so no hover tooltips appear.
  - Labels must not touch lines. Check with `getBBox()` overlap tests after any change.
- **Charts:** simple and labelled directly at the line ends, with no legends. Charts of opinion say so in the caption ("My view, as an illustration rather than measured data").
- **Self-checks:** marked with ✓ and ✗ text, not colour alone. Without JavaScript the answer and explanation show as plain text.
- **Motion:** respects `prefers-reduced-motion`. No scroll-triggered fade-ins on sections.

## Markup conventions

- **Citations:** `<a class="cite" href="#src-N" aria-label="Source N">N</a>`. Numbers follow reading order, and each number matches an `id="src-N"` item in Sources. They were audited and renumbered with a throwaway script; write a similar check if you add or move many.
- **Quiz:**
  - `.quiz[data-answer]` contains `.quiz-q`, then `ul.quiz-options` with `button.quiz-option[data-option]`, then `.quiz-result` and `.quiz-why`.
  - The script adds `is-ready` and `is-answered`.
- **Tools cards:**
  - Structure: `.tool-group > dl > div > dt` (the task) and `dd` (one or more `.tool-opt`).
  - Each `.tool-opt` holds a bold tool name with "where to use it, model" underneath.
  - Alternatives are separated by `.tool-or`.
  - Chinese names are written as "Doubao (<span lang="zh-Hans">豆包</span>)".
- **Pages:** source pages link to each other with `.html`. The build rewrites the links to clean addresses.
- **Version line:** each page's footer has a version line ("Version 0.9, 7 November 2026"). Bump that page's version and date when its content changes.

## Tech

- Plain HTML, CSS and JavaScript. No framework and no packages. Node.js runs `build-public.cjs`.
- **Build:**
  - The home source (`data-analytics-playbook.html`) has no `<head>`; the build wraps it.
  - The build adds a description per page (the `DESCRIPTIONS` map), rewrites links to clean addresses, and fingerprints `site.css`, `site.js` and `icons.svg` by content hash, so phones never pair a new page with an old stylesheet.
  - A new page needs to be added to `PAGES`, to `DESCRIPTIONS`, and to the redirects in `edgeone.json`.
- **Deploy:** push to `main`. EdgeOne Pages and GitHub Pages each build and publish. If GitHub Pages fails with "Deployment failed, try again later", start a fresh run (`gh workflow run`); rerunning only the failed job causes a duplicate-artifact error.
- **Local preview:** any server that maps `/ai` to `ai.html` (see `README.md`).
- **Testing quirks:**
  - Background browser tabs pause CSS animations. Call `document.getAnimations().forEach(a => a.finish())` before screenshots.
  - Test phones at 360px wide as well as desktop.

## Checks before publishing

- Contents labels match headings, and every `#anchor` link resolves.
- No sideways scrolling at 360px.
- No drawing label overlaps a line.
- Citations are in reading order and every external link returns 200.
- Scan the text for AI writing patterns, dashes and American spellings.
- Ding reviews the files to be committed and the commit message before every commit. Commit messages use conventional commits (`feat:`, `fix:`, `docs:`).

## How a change goes

```mermaid
flowchart LR
  A[Ding asks for a change] --> B[Edit source pages, site.css, site.js]
  B --> C[node build-public.cjs]
  C --> D[Check on desktop and a 360px phone]
  D --> E[Run the checks above]
  E --> F[Ding approves files and commit message]
  F --> G[git push to main]
  G --> H[EdgeOne Pages and GitHub Pages rebuild]
```

## Skills and tools used to build it

- **Writing:** the humanizer skill for AI writing patterns, applied to every page.
- **Design:** the frontend-design skill for the visual direction.
- **Checking:** a browser for checking layouts on desktop and phone widths, and small Python scripts for text and citation audits.
- **Covers:** downloaded from Open Library, Amazon and Douban, and resized with Windows' System.Drawing.

## References

- **Story and charts:**
  - International Business Communication Standards (IBCS): headings that state the message, one colour for one meaning.
  - Brent Dykes, *Effective Data Storytelling*: the playbook's story arc.
- **Learning-page layout:**
  - Nielsen Norman Group (summary first, tables of contents that match headings, mobile contents patterns);
  - web.dev Learn;
  - Google's Machine Learning Crash Course;
  - Diátaxis;
  - Distill.
- **AI facts:** each chapter's Sources list. Chapter 1's section on AI rankings links Artificial Analysis.

## Decisions worth keeping

| Decision | Why |
| --- | --- |
| Separate page per Using AI chapter | Each chapter is long enough to stand alone, and readers can share or return to one chapter |
| Static drawings except the opening ones | Ding asked for calm pages; movement only on load draws attention once |
| No status labels on home cards | All parts are live; the labels added noise |
| Tools as task cards with a date | Readers look up a task, not a vendor, and products change every few months |
| Headings in a left column on the wide hub | Fills wide screens without making lines too long |
| Fingerprinted assets | Phones showed old CSS with new pages |
| Phone text box measured from content | A fixed height clipped text on some phones |
| Book notes approved by Ding | The notes speak in Ding's voice |

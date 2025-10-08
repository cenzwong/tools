# tools
ChatGPT generated tools

# Prompt Samplr
```

# Master Prompt — Single-File Tool for GitHub Pages

**Role:** You are a senior front-end engineer. Generate a production-quality, single-file HTML tool for GitHub Pages.

**My idea:**
`<Describe the tool in 2–5 sentences: what it does, inputs/outputs, edge cases, and any formulas or rules.>`

**Output format:**
Return **exactly one** HTML document (no explanations, no comments before/after the code block). The entire solution must be inside a single fenced code block with the language set to `html`.

**File name (for me to save):**
`tools/<kebab-case-name>.html` (e.g., `tools/fuel-trip-cost-calculator.html`)

**Hard requirements:**

1. **English-only** content (UI text, code, comments).
2. **Single file**: no external assets, libraries, or network calls; no CDN links. Inline everything (CSS/JS).
3. **Vanilla JS**, no frameworks.
4. **Works on GitHub Pages** at path `/tools/<file>.html`. All links must be relative.
5. **Responsive + accessible**: keyboard friendly, sensible focus order, `aria-` attributes where appropriate, sufficient color contrast.
6. **UX essentials**:

   * Clear header/title and short description.
   * Input validation with inline error states.
   * Results section that updates live.
   * “Copy sharable link” button that **encodes current state** into the URL hash or query string; on load, **restore state** from the URL.
   * A small “Help” or “How it works” section.
7. **Quality**:

   * Semantic HTML; no deprecated tags.
   * **No analytics, no trackers.**
   * Consistent, modern styling (dark-friendly), contained in `<style>`.
   * Avoid layout shift; use fluid layouts.
   * Functions small and named; no global leaks (IIFE).
8. **Performance & robustness**:

   * Handle invalid/empty input gracefully.
   * Round/format outputs sensibly; avoid floating-point surprises where relevant.
   * Avoid blocking alerts except when needed; prefer inline hints.
9. **Metadata**:

   * `<title>` reflects the tool name.
   * `<meta name="description">` summarises the tool.
   * Favicon as a `data:` URL (tiny SVG is fine).

**Nice to have (include if trivial):**

* Lightweight unit conversions if relevant.
* Download/Export (e.g., JSON/CSV) when results are tabular.
* Print-friendly styles for result sections.

**Acceptance checklist (you must satisfy before returning code):**

* [ ] Single HTML file, English-only, no external requests.
* [ ] Accessible labels and keyboard navigation verified.
* [ ] State can be shared via URL and restored on load.
* [ ] Inputs validated; errors shown inline; no crashes on bad input.
* [ ] Mobile and desktop layouts look good.
* [ ] No unused code; no console errors.

**Return only the final HTML file in a single ```html code block.**

```
## Example usage (you can edit and reuse)

**Idea (example):**
A “Unit Converter (Length/Weight/Temperature)” where users can pick a category, enter a value, and instantly see conversions. Must support URL-share of the current category and value; handle invalid input; show a short “How it works”.


# Other tools
- https://it-tools.tech
- https://emn178.github.io/online-tools/
- https://omnitools.app

---
wave: 1
depends_on: []
files_modified:
  - landing/index.html
  - landing/styles.css
  - landing/app.js
autonomous: true
requirements_addressed:
  - POS-01
  - POS-02
  - NAR-01
  - NAR-02
  - NAR-03
  - CONV-01
  - CONV-02
  - QLT-01
  - QLT-02
---

## Objective

Create and ship a static landing page that communicates the two-channel sensing thesis and includes waitlist conversion.

<tasks>
  <task id="1">
    <read_first>
      - .planning/PROJECT.md
      - .planning/REQUIREMENTS.md
      - .planning/ROADMAP.md
    </read_first>
    <action>
      Implement semantic page structure in landing/index.html with sections for hero, channel architecture (PNS/CNS/Fusion), use-cases, and waitlist form.
    </action>
    <acceptance_criteria>
      - landing/index.html contains "Give robots a complete nervous system"
      - landing/index.html contains "PNS Layer"
      - landing/index.html contains "CNS Layer"
      - landing/index.html contains form element with id="email"
    </acceptance_criteria>
  </task>
  <task id="2">
    <read_first>
      - landing/index.html
    </read_first>
    <action>
      Implement bold responsive styling in landing/styles.css with design tokens, mobile breakpoint handling, and high-contrast CTA styling.
    </action>
    <acceptance_criteria>
      - landing/styles.css contains "@media (max-width: 900px)"
      - landing/styles.css contains ".hero-grid"
      - landing/styles.css contains ".btn-primary"
    </acceptance_criteria>
  </task>
  <task id="3">
    <read_first>
      - landing/index.html
    </read_first>
    <action>
      Add form submit logic in landing/app.js that validates email format and displays success/error feedback text.
    </action>
    <acceptance_criteria>
      - landing/app.js contains "addEventListener(\"submit\""
      - landing/app.js contains "Enter a valid email"
      - landing/app.js contains "Thanks. We will reach out"
    </acceptance_criteria>
  </task>
</tasks>

## Verification

- Open `landing/index.html` in browser and verify responsive rendering.
- Submit invalid and valid email to confirm status messaging.
- Confirm all Phase 1 requirements map to delivered sections.

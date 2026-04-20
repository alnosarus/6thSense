#set document(title: "6thSense — VC Pitch Brief", author: "6thSense")
#set page(paper: "us-letter", margin: (x: 1.1in, y: 1in))
#set text(font: "New Computer Modern", size: 11pt)
#set par(justify: true, leading: 0.65em)

#show heading.where(level: 1): set text(size: 20pt, weight: "bold")
#show heading.where(level: 1): it => block(above: 1.2em, below: 0.8em, it)
#show heading.where(level: 2): set text(size: 14pt, weight: "bold")
#show heading.where(level: 2): it => block(above: 1em, below: 0.5em, it)
#show heading.where(level: 3): set text(size: 11.5pt, weight: "bold", style: "italic")

#show table.cell.where(y: 0): strong

// ───────────────────────────────────────────────────────── cover

#align(center)[
  #text(size: 28pt, weight: "bold")[6thSense]
  #linebreak()
  #text(size: 12pt, fill: luma(60))[
    Robots have five senses. We build the sixth.
  ]
  #v(0.3em)
  #text(size: 10pt, fill: luma(100))[
    VC Pitch Brief · Competition · Why We Win · Why We Are The Team
  ]
]

#v(0.5em)
#line(length: 100%, stroke: 0.5pt + luma(180))
#v(0.8em)

#text(size: 10.5pt)[
  *Positioning.* We sell the *dataset*. The rig is how we own the cost curve.
  6thSense ships model-ready, multimodal tactile + egocentric episodes for
  contact-rich robot learning — captured on a rig we engineer in-house at
  ~5× lower cost than the incumbent.
]

#v(0.6em)

// ───────────────────────────────────────────────────────── 1. competition

= Competition

Robot-learning teams trying to solve contact-rich manipulation today have five
procurement options. None of them deliver *packaged, model-ready tactile + ego
episodes* at a price that makes training economics work.

#v(0.4em)

#table(
  columns: (0.9fr, 1.3fr, 1.8fr),
  stroke: 0.4pt + luma(180),
  inset: 8pt,
  align: (left, left, left),

  [*Category*], [*Representative players*], [*Why they don't solve the real problem*],

  [Tactile glove incumbents],
  [HaptX (\~\$5k/glove), Manus, SenseGlove],
  [Hardware-only. 5× our unit cost. No sync, no QC, no labels, no dataset schema.],

  [Fingertip tactile sensors],
  [GelSight, DIGIT (Meta), Xela, Contactile],
  [Point-contact only. No full-hand skin coverage. Not a data product — a sensor SKU.],

  [Egocentric video data],
  [Ego4D, Project Aria (Meta), Ego-Exo4D],
  [No touch modality. Academic license. Not scoped to robot training schemas.],

  [Vertically-integrated robotics co's],
  [Physical Intelligence, 1X, Figure, Dyna, Skild],
  [Running in-house data ops — *badly and expensively*. These are *future customers*, not rivals.],

  [Generalist data / labeling co's],
  [Scale AI, Surge, Invisible],
  [No hardware. No multimodal sync. No tactile domain expertise. Commodity labeling only.],

  [Open benchmarks],
  [DROID, Open-X Embodiment, RH20T],
  [RGB + proprioception only. Complementary to us, not competitive — they become citations, not threats.],
)

#v(0.6em)

#block(
  fill: luma(240),
  inset: 10pt,
  radius: 4pt,
  width: 100%,
)[
  *Bottom line.* Nobody else is selling tactile + egocentric data as a managed
  service at our cost structure. HaptX is the nearest adjacent and they're a
  hardware company charging 5× more for something with worse downstream fit.
]

// ───────────────────────────────────────────────────────── 2. why we win

= Why We Win

Three compounding advantages, each defensible on its own, reinforcing across the others.

== 1. A 5× cost advantage on the capture rig

HaptX — the only serious incumbent in full-hand tactile — sells gloves at
roughly *\$5,000 per glove*. Our rig, built on JQ Industries e-skin + Intel
RealSense, lands at *\~\$1,000 per glove* with line-of-sight lower.

At our unit cost, *the same raised dollar fields 5× more gloves* — which
compounds directly into:

- 5× the captured hours
- 5× the scene coverage in the catalog
- 5× the dataset moat per funding round

The rig is our *factory*, not our product. We never ship it, never support
it, never RMA it. It is internal capex amortized across every episode we sell.

== 2. Dataset ops as a product, not a byproduct

Every robotics lab underestimates the *80%* of the work that sits between raw
sensor dumps and a trainable episode:

- Multi-rate sync: tactile \~1 kHz ↔ RGB-D 30–60 Hz ↔ IMU 200 Hz, on one clock
- Per-channel tactile calibration and drift handling
- Contact-phase segmentation and failure-mode taxonomy
- QC flagging with stated signal reliability boundaries
- Packaging to the format each customer's trainer expects

This is an *operations moat*. It is earned through thousands of captured-then-QC'd
hours and codified tooling — not a two-week script anyone can replicate.

== 3. Demand is already proven — pre-collection

We are pre-collection, yet we are carrying *Letters of Intent* from:

- *Anduril* (defense / autonomy)
- *Handshake* (commercial robotics)
- Additional smaller robotics companies
- University research labs

Defense, commercial humanoid, and academic signal — *all three* — before
episode one. This is the demand-proof every data-infrastructure VC looks for.

#v(0.4em)

#block(
  fill: luma(240),
  inset: 10pt,
  radius: 4pt,
  width: 100%,
)[
  *Data-as-a-service multiples, hardware-company capital efficiency.*
  We price like a data company, compound like a data company, and build like
  a hardware company — so our cost base never catches up to us.
]

// ───────────────────────────────────────────────────────── 3. why we are the team

= Why We Are The Team

The problem has exactly three hard seats. We have exactly three founders
mapped to them.

#v(0.4em)

#table(
  columns: (0.7fr, 0.9fr, 2fr),
  stroke: 0.4pt + luma(180),
  inset: 8pt,
  align: (left, left, left),

  [*Founder*], [*Background*], [*Owns*],

  [*Matt*],
  [Ex-Tesla hardware specialist],
  [Custom rig design, mechanical + electrical integration, BOM engineering
  that drives the \$5k → \$1k glove cost collapse and keeps driving it down.],

  [*Ronak*],
  [Software / multimodal ML],
  [The insight + labeling pipeline: sync across tactile, RGB, and depth;
  calibration; contact-phase labeling; automated QC. The software moat
  that turns raw capture into trainable episodes.],

  [*Alex*],
  [Founder, ML-readiness],
  [Product, customer programs, ML-signal validation. Translating fuzzy
  "we need touch data" asks into scoped, QC-able episode contracts.
  Won't sell a signal we can't prove is learnable.],
)

#v(0.6em)

== Why this seat configuration matters

A pure-software team *cannot build the rig*. A pure-hardware team *cannot
ship model-ready episodes*. Everyone else trying to solve this problem is
missing at least one seat — which is why they're either selling \$5k gloves
or paying internal engineers \$300k/yr to run data ops.

We are one of the very few teams with hardware IP, software IP, and ML-readiness
judgment under one roof. That is the *entire* reason we can field LOIs from
Anduril and Handshake while pre-collection.

#v(0.6em)

#block(
  fill: luma(240),
  inset: 10pt,
  radius: 4pt,
  width: 100%,
)[
  *One line to close on.* We're a dataset company — we built the rig because
  no one sells a capture platform at a price that makes the dataset economics
  work, and we have the team to do both.
]

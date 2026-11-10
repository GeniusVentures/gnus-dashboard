# 09-02 — gnus.ai design language SUMMARY

Shipped: dark theme default (data-bs-theme=dark, page #0b1324), $primary
restored to gnus.ai mint #36edb5 (bootstrap color-contrast now picks near-black
text on mint fills), gnus.ai fonts (Space Grotesk display / Inter body /
Space Mono mono via fontsource), pill buttons weight 600, flat 20px panels,
hero mint radial glow + mint accent phrase + uppercase micro-label, contrast
polish on card copy and the hero's second line (both were reading ~25-30%
white on dark).

Wave-1's #0b6e8f primary was replaced — the audit taught the inversion: mint
was always an on-dark accent, never a white-text fill on light.

Tests: 834/834. Verification shots: http://slave:8099/2026-11-10/152237-ui-*.png
and the contrast-polish pass 152237-ui-connect-desktop.png.

Reference: gnus.ai homepage (shot 151059-gnusai-top.png; palette extracted from
its compiled CSS: #1daded blue, #36edb5 mint, slate scale, Space Grotesk/Inter/
Space Mono).

Second-pass candidates: dotted-grid + constellation hero texture (needs assets
from the site build), light-mode support, card label contrast tuning.

## Contrast audit follow-up (same day)

Programmatic WCAG probe (playwright, computed styles, all four pages) found
65+ failures: the Geeks theme's dark palette defines near-black TEXT values
($gray-1000 family) on the near-black page — bootstrap's data-bs-theme flip
does not help because the theme's variable values themselves are dark. Fixed
by pinning the dark-mode text/link/border/tertiary variables to light values
in _designpass.scss and styling the address pill as a translucent chip.
Re-probe: 0 failures across all four pages. Suite: 834/834.

Shots: http://slave:8099/2026-11-10/154211-ui-*.png

## Usability follow-up (same day): the submit page explains itself

The audit's worst finding — a raw JSON textarea with no guidance — addressed:
JobInput now opens with a one-paragraph orientation (a job = model pass +
inputs + outputs), points new users at Load example as the working start, and
carries a collapsible field reference documenting name/version/author/tags,
gnus_spec_version=1, inputs[] (fetchable source_uri_param, texture2D vs
tensor, dimensions block), outputs[] (the "dummy" placeholder) and passes[]
(model.source_uri_param, input:<name> wiring) — written from
data/jobs/posenet-example.json and lib/gnus/schema.ts. Submit intro names
Load example as the recommended start; landing gained a how-it-works line.
Suite 834/834; guided page verified by screenshot review
(http://slave:8099/2026-11-10/154915-submit-guided-full.png). Cosmetic
follow-up: the "What will be sent" preview truncates before outputs/passes.

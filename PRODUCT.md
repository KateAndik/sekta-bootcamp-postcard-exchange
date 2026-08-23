# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Stack

Inferred from the approved project brief: a self-contained HTML/CSS/JavaScript prototype first, with no real personal data. The production version requires a server, a database hosted in Russia, authenticated access, and a Telegram bot. The production framework and hosting provider remain open decisions.

## Users

The primary users are adult participants of the current Bootcamp cohort who are already in its Telegram community and want to exchange one physical postcard at the end of the course. A secondary user is the small #Sekta operations team that confirms eligibility, runs the draw, handles delivery exceptions, and triggers data deletion.

## Product Purpose

«Почта из лагеря» creates a voluntary end-of-cohort ritual: each confirmed participant is assigned one recipient, receives that person's postal details through protected access, sends a postcard, and marks it sent. Success means that the exchange feels warm and simple while postal addresses are never public and operational failures have a recovery path.

## Positioning

The product turns the Bootcamp “camp shift” metaphor into a physical, cross-border exchange between real community members, with constrained one-to-one address disclosure instead of a shared spreadsheet or open chat collection.

## Operating Context

- Entry comes from the existing Bootcamp Telegram chat.
- Telegram is the primary notification channel, but the postal address is displayed on a protected web page rather than inside a message.
- Participants may live in different countries and explicitly choose domestic-only or international sending.
- A draw happens only among recently reconfirmed participants.
- A reserve “postal squad” handles cases where someone cannot send after the draw.
- The prototype uses synthetic data and local browser state only.

## Capabilities and Constraints

- Participant onboarding, address form, international preference, separate consent states, Telegram connection simulation, assignment view, sent and received states.
- Admin overview for readiness, geography conflicts, delivery of assignments, recovery cases, and scheduled deletion.
- Each participant receives exactly one recipient and never themselves.
- The draw must respect an up-to-date directed country-route matrix.
- Production personal data must not enter analytics, Telegram message bodies, public tables, or application logs.
- Participation is voluntary and recommended for adults 18+ in the first version.
- Legal wording, operator details, production hosting, live bot credentials, and exact dates are deliberately undecided.

## Brand Commitments

- Product name: «Почта из лагеря».
- Supporting line: «отправь кому-то частичку этой смены».
- The product belongs to #Sekta and uses the warm, conversational Bootcamp camp language without pressure or childishness.
- Telegram bot copy is lowercase except for proper names and #Sekta.
- The approved visual direction is a light, mobile-first product interface with a white/light-blue base, cobalt primary actions, coral-pink, sunny yellow, and turquoise camp accents, restrained postal details, real workflow states, accessible controls, and no decorative gradient/orb/bokeh treatment.
- The public participant surface never exposes a route or control for opening the admin surface. The production admin surface is a separate authenticated route with one owner by default and optional roles later.

## Evidence on Hand

- `PROJECT-BRIEF.md` is the approved product and content brief.
- Local Bootcamp context is documented in the paths listed in the brief.
- No production legal text, live Telegram bot, hosting contract, or approved list of supported international postal routes is on hand; the prototype must not fabricate them.

## Product Principles

1. Explain the data handoff before asking for an address.
2. Show one clear next step at every stage.
3. Reveal only the minimum data needed for one postcard.
4. Treat international participation as an explicit choice with route and cost uncertainty.
5. Design recovery for missed sending, failed access, and deletion from the start.

## Accessibility & Inclusion

The experience must support keyboard navigation, visible focus, semantic labels, readable legal text, at least 44 px touch targets on mobile, error recovery without losing entered data, and color-independent status cues. Language remains gender-neutral.

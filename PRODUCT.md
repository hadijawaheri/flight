# FlySmart (پرواز پلاس) — Product Specification

## Overview

FlySmart is a flight-ticket booking site for domestic and international travellers in Iran. Its edge is
what happens before and around the purchase: it tells you whether to buy now or wait, and it knows the rules
(baggage, documents, refunds, delays, airports) well enough to answer and to calculate.

## Core value propositions

1. **Price analysis (BUY_NOW / WAIT):** every result carries a verdict from the flight's own price history,
   days to departure and seats left; the detail page shows reasons, confidence, a 7-day expectation, a price
   chart with forecast and cheaper nearby days. Always presented as an estimate.
2. **Assistant that knows the rules:** a Claude-backed assistant grounded in a structured knowledge base
   (baggage, dangerous goods, documents, international formalities, refunds, delay rights, check-in, children,
   health, seats, pets, platform). It computes (battery limits, excess baggage, refund estimate, price advice,
   cheapest flights), cites its sources and flags anything the airline decides or that changes often. Works
   offline from the same base when no API key is set.
3. **Honest fares:** the stepped refund table, base/tax/service-fee breakdown and a 15-minute seat hold are
   visible before payment; the fare is re-checked at booking (409 `FARE_CHANGED`).
4. **Traveller vault:** save passengers once; checkout fills in with one choice.
5. **Price alerts and budget explorer:** a target price per route/day, texted by SMS when reached (retried, with
   the delivery shown on the alert); "where can I go for X?" over the next 30 days.

## Surfaces

- `/` landing: search, flash deals, assistant starters.
- `/flights` results: fare calendar strip, filters (airline, time, type, price), sort, round-trip two-step choice.
- `/flights/[id]` detail: fare breakdown, refund policy, price analysis, alert.
- `/checkout/new` passengers + contact; `/checkout/[id]` hold timer, seat map, payment, result states.
- `/dashboard` overview, bookings (e-ticket, print, cancel with refund quote), travellers, price alerts, profile.
- `/rules`, `/rules/[id]`, `/airports/[code]`: server-rendered, indexable, each rule labelled by reliability.
- `/assistant` and a floating widget that adopts the current flight or booking as context.

## Out of scope / simulated

Real flight inventory and payment gateway (both simulated behind provider interfaces). Alerts are texted through
Melipayamak (ADR 0013). National codes and passport numbers are encrypted at rest (ADR 0012).

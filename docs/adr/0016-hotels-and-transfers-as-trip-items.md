# 0016 — Hotels and airport transfers as items of one trip

Status: accepted · Date: 2026-11-10

Context: travellers who buy a ticket should be able to add a hotel at the destination and an airport transfer
in the same checkout, without typing the city and dates again (issue #10). The platform's promise, that the
rules are known and shown before paying, has to hold for these too: cancellation tiers, check-in hours and
waiting time must be visible up front. No supplier is contracted yet (issue #18 is Hadi's decision).

Decision:

- **Trip model.** A flight booking stays the root of a trip. A hotel stay and each transfer are separate items
  that carry the booking's id (`bookingId`), each with its own status, price, cancellation policy and refund.
  Cancelling one item never cancels another on its own; cancelling the flight offers to cancel the transfers
  that depend on it.
- **One payment, separate refunds.** The basket (flight plus items) is paid once. Refunds are computed and
  recorded per item, so a hotel that cannot confirm after payment is refunded alone.
- **Providers behind interfaces, simulated first.** `HotelProvider` and `TransferProvider` sit in
  `apps/api/src/infra/{hotel,transfer}` next to `FlightProvider` and `PaymentProvider`, selected by
  `HOTEL_PROVIDER` and `TRANSFER_PROVIDER`. Only `simulation` exists; any other value fails env validation at
  boot instead of falling back. The simulations are seeded like the flight market (ADR 0003): the same id
  rebuilds the same hotel, rooms and prices, so a quoted price can be re-verified at booking without a table.
- **Rules in contracts.** Request/response shapes and pure rules live in `packages/contracts`:
  `stayDatesForTrip` (check-in is the outbound arrival day on the destination's local clock, check-out the day
  the return flight leaves, chosen nights for one-way trips), `nightsBetween`, `pickupTimeFor` (arrival plus
  baggage claim from the airport; departure minus check-in lead, drive and a traffic buffer to the airport),
  `hotelRefundQuote` (stepped penalty on the stay total, like `calculateRefund` for fares) and `vehicleFits`.
  Apps call these instead of re-deriving dates or times.
- **Scope.** Domestic cities that have flights, transfers between an airport and a hotel or a city zone. Car
  hire, tours, insurance and hotels abroad are out of scope for now.

Consequences: a real supplier is one provider file plus an env value. Its prices replace the seeded model, but
the refund rules and pickup times stay ours unless the supplier returns its own, in which case the provider
maps them into the same `HotelCancellationPolicy` / `TransferCancellationPolicy` shapes. The timing constants in
`TRANSFER_TIMING` are simulation assumptions, not airport rules, and are labelled so in the assistant.

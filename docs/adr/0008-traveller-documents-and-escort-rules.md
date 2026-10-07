# 0008 — Escort age, passport validity as a warning, and foreign passengers

Status: accepted · Date: 2026-10-07

Context: an aviation review found three booking rules that were wrong in practice. A 12-year-old could be the
only companion of an infant (pricing treats 12+ as an adult, but the person responsible for an infant or child
must be a legal adult). A passport with under six months left blocked every international booking, although
that rule is applied by destination countries and airlines, not by us. And every passenger needed an Iranian
national code, so a foreign traveller could not book at all.

Decision:

- Pricing bands stay (infant under 2, child 2-11, adult 12+). `validateEscort` (`domain/escort.ts`, pure) adds the
  legal rule on top: if anyone is an infant or child on a travel date, at least one passenger must be 18 or older,
  and infants may not outnumber the passengers aged 18 or older. It runs on every leg date, in the API
  (`BookingsService.plan`) and in the checkout form. `validatePassengerMix` stays counts-only for the search form,
  which has no ages.
- `assessPassport` (`domain/passport.ts`, pure) separates facts from risk. Missing or expired on a travel date
  blocks. Valid on the day but under 183 days past the last flight is a warning: the traveller must tick an
  acknowledgement (`passportValidityAcknowledged` on the create-booking contract, default false) or the API answers
  400 with a message on that path. The flag is stored on the booking as evidence.
- A passenger has a `nationality` (ISO-2, `IR` when absent so old documents stay valid). Iranians keep national code
  and Persian names. Foreigners have no national code (stored as null), Persian names are optional, and a passport
  with its number and expiry is required even on domestic flights. The list of nationalities is deliberately short
  (`common/nationalities.ts`). The identity schema is a plain object plus `refinePassengerIdentity`, because Zod 4
  objects with refinements cannot be extended or made partial; PATCH re-checks the merged document in the service.
- Duplicate-traveller detection uses `passengerIdentityKey`: national code for Iranians, nationality plus passport
  number for foreigners (in the vault indexes, the booking schema and the checkout form).

Consequences: the vault's unique index `userId + nationalId` could not hold several foreigners, so it is replaced
by two partial unique indexes (national code; nationality + passport). `PassengersService.onModuleInit` creates them
and drops the legacy index, because the repo has no migration runner. Persian names on stored bookings and vault
entries can now be empty, so display code uses `passengerDisplayName`. `nationalId`/`nationalIdMasked` are nullable
in the DTOs.

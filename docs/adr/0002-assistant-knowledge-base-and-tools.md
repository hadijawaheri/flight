# 0002 — Assistant: structured knowledge base + tool loop, with an offline mode

Status: accepted · Date: 2026-10-05

Context: the assistant must answer baggage, document, refund, delay and airport questions for Iranian
travellers. A model answering from memory invents numbers; a pure search box cannot compute an excess-baggage
fee or a refund. Rules also differ in reliability: some are international standards, some are set per airline,
some (exit tax, currency limits) change every few months.

Decision:

- Rules live in a typed knowledge base (`apps/api/src/modules/knowledge/entries`), each entry carrying a
  reliability label (`STANDARD`, `AIRLINE_SPECIFIC`, `VOLATILE`), who to verify with, and a review date.
- Retrieval is a small in-process index (tokenising, light Persian stemming, IDF weighting). No vector store:
  ~30 entries do not justify one, and results stay explainable and testable.
- The model (Claude Messages API, plain `fetch`) may state a rule only if `search_rules` returned it, and
  computes with tools (`evaluate_battery`, `excess_baggage`, `refund_estimate`, `price_advice`,
  `cheapest_flights`). Tool results become cards and citations in the response; the model's text is never the
  only carrier of a number.
- If any citation is not `STANDARD`, the response carries a verify notice.
- Without `ANTHROPIC_API_KEY`, or when the provider fails, a regex planner calls the same tools and answers from
  the knowledge base alone (`mode: "offline"`). The feature never disappears because a key is missing.

Consequences:

- The "call `search_rules` first" rule is a prompt instruction, not code-enforced. Offline mode is
  deterministic; AI mode relies on the model following the prompt.
- Knowledge entries were authored from general knowledge and need human/legal review before real launch;
  `reviewedAt` makes staleness visible.
- Adding a rule means adding an entry and a test, never touching the prompt.

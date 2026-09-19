# Guardrails and Safety Policy

## Input guards

Every user message is screened before it reaches the agent. Three checks run in
order.

Content filtering blocks requests for weapons construction, malware authoring,
self-harm instructions and credential theft. A blocked request returns a refusal
and never reaches the language model.

Prompt injection detection catches attempts to override the system prompt. The
patterns include "ignore previous instructions", requests to reveal the system
prompt, role override attempts such as developer mode or jailbreak personas,
instructions to disable safety, and attempts to dump the entire knowledge base
verbatim.

PII detection scans for email addresses, phone numbers, credit card numbers
validated with the Luhn checksum, IBANs, social security numbers and API keys.
Detected values are redacted before the text is stored or sent to a model.

## Output guards

Model output is screened again. Content rules are re-applied because a model can
restate unsafe material. PII is redacted from the answer.

Groundedness is measured as the fraction of answer tokens that also appear in the
retrieved context. The default threshold is 0.35. When an answer falls below the
threshold the response is annotated as weakly supported rather than silently
returned. Answers that cite no sources while context was supplied are flagged.

## Tool permissions

Tools declare a permission level of read, write or admin. A request carries a set
of granted permissions and the registry refuses any tool whose permission is not
granted. The default grant is read only, so catalog search, catalog statistics and
mood recommendations are available while write and admin tools are denied.

## Data handling

The assistant never mutates third-party accounts. Playlist export requires
explicit user confirmation. Long-term memory stores only preferences the user
states about themselves, and a delete endpoint removes every stored fact for a
user on request.

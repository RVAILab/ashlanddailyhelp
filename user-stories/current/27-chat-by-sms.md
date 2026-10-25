<!--
metadata:
  created_at:   2026-10-25T11:06:46-07:00
  activated_at: 2026-10-25T16:37:05-07:00
  planned_at:   2026-10-25T16:37:05-07:00
  finished_at:
  updated_at:   2026-10-25T16:37:05-07:00
-->

# Story: Chat by Text Message

## Summary

AS someone with a basic phone and no data plan
I WANT to text a question and get an answer back
SO THAT I can find help without the internet

## Acceptance Criteria

- A phone number that answers texts using `25-chat-grounding`, in short messages with addresses and phone numbers.
- Replies in the language the person writes in.
- STOP and HELP work; phone numbers are not kept longer than needed.

## Notes

- Depends on `25-chat-grounding`. Needs an SMS provider and a budget.

## Implementation Plan

A Twilio-style SMS webhook at `/sms` that answers each text with `answerQuestion` (story 25) and replies in TwiML. It is plain text, short, and in the language the person writes in. Nothing about the person is stored. The provider (Twilio, assumed as the most common) and the number are set up by hand; until then the route answers 503.

1. **`server/sms/reply.ts`** (pure functions):
   - `smsLanguage(text)`: Spanish when the text looks Spanish (accents, ¿ ¡, or common Spanish words), otherwise English.
   - `smsReply(answer)`: the answer as plain text in at most 3 SMS segments (about 450 characters). The crisis line comes first. Then up to 3 cited places, each as name, address and phone. Then "Confirm before you go" and "More: ashlanddailyhelp.com".
   - `keyword(text)`:
     - STOP, UNSUBSCRIBE, CANCEL, END and QUIT, which Twilio also handles itself;
     - START;
     - HELP and AYUDA, which reply with what the number does, the crisis numbers and how to stop.
2. **`server/sms/twilio.ts`.** `validTwilioSignature(url, params, signature, authToken)`: HMAC-SHA1 over the URL plus the sorted parameters, compared in constant time with Web Crypto.
3. **`app/routes/sms.ts`** (top level, POST only):
   - It checks `TWILIO_AUTH_TOKEN` (a new optional secret) and the signature, giving 403 when invalid.
   - It reads `Body` and `From`, rate-limits by a SHA-256 of `From` (never stored or logged), answers, and returns TwiML `<Response><Message>…</Message></Response>` with XML escaping.
   - Without the token or an answerer, it returns 503.
4. **Services.** `smsAuthToken` comes from `env.TWILIO_AUTH_TOKEN`. The existing `ASK_LIMIT` is reused.
5. **README.** How to connect a number: in Twilio, point the messaging webhook at `https://ashlanddailyhelp.com/sms` (POST), then run `wrangler secret put TWILIO_AUTH_TOKEN`.

Data model: none. Phone numbers are never stored; the rate limit sees only a hash.

Tests:

- `reply.test.ts`: language, length, the crisis line first, places with phone and address, keywords.
- `twilio.test.ts`: a known-good signature from Twilio's documented example, and a bad one.
- `sms.test.ts` (route): 403 for a bad signature, 503 when not set up, TwiML escaping, HELP and STOP replies, rate limit by hash, no number in the logs.

Open, for the user: choosing the provider, buying a number, and the budget.


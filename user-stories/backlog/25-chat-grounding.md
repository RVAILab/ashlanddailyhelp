<!--
metadata:
  created_at:   2026-10-25T11:06:46-07:00
  activated_at:
  planned_at:
  finished_at:
  updated_at:   2026-10-25T14:03:43-07:00
-->

# Story: Grounded Answers from the Directory

## Summary

AS the team building the chat channels
I WANT one answering service that answers only from the stored listings, events and alerts, citing sources
SO THAT every chat channel gives the same accurate, sourced answers

## Acceptance Criteria

- Answers come only from data in Postgres, with the listing and its source for each fact, and "as of" the feed time.
- When it doesn't know, it says so and points to 211; it never guesses hours or eligibility.
- Crisis messages get crisis numbers first.
- Works in English and Spanish.
- No personal details are stored beyond what the channel needs; logs are minimal and time-limited.
- An evaluation set of real questions with expected answers runs before each change.

## Notes

- Decided Oct 25: chat comes after v1. Shared by `26-chat-on-website`, `27-chat-by-sms` and `28-navigator-assistant`.

## Implementation Plan

[to be filled in by /stories plan]

# Ashland Daily Help

A community resource hub for Ashland and Jackson County, Oregon: food, showers, shelter and someone who knows the way. It is a static, installable, offline-capable web app with no build step or dependencies.

## Origin

Built at [Rogue Raise: The Unhoused](https://whiterabbitashland.com/rogue-raise) (October 23–25, 2026), White Rabbit's weekend community build in Ashland. Event notes, team links, hotlines and a dated snapshot of the local resource directory live in the sibling repo [RVAILab/RogueRaise](https://github.com/RVAILab/RogueRaise), under [`2026-10-unhoused/`](https://github.com/RVAILab/RogueRaise/tree/main/2026-10-unhoused). Locally it is usually checked out next to this repo at `../RogueRaise`.

## Running locally

Serve the repo root over HTTP (the service worker needs `http(s):`, not `file:`):

```sh
python3 -m http.server 8000
```

Then open <http://localhost:8000>.

## Data and accuracy

Listings say only what each provider's own website states, and none has been confirmed with the provider yet. Confirm hours and eligibility before visiting or referring anyone. The Community Pulse and provider-view numbers are fictional demonstration data, not real service statistics.

## License

Application code is MIT ([`LICENSE`](LICENSE)). Bundled fonts are under the SIL Open Font License ([`fonts/OFL.txt`](fonts/OFL.txt)).

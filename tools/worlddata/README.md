# World database generators

The nation files in `src/data/world/nations/` are generated. Edit the inputs here and re-run the generator for that region; don't hand-edit the output.

| Region | Generator | Inputs | Run (from the repo root) |
| --- | --- | --- | --- |
| Asia (IND PAK SL BAN AFG NEP UAE OMA HK KUW QAT BHR SIN MAS KSA) | `asia/gen.mjs` | `asia/in/<CODE>.txt` | `node tools/worlddata/asia/gen.mjs IND PAK ...` |
| Europe and Americas (ENG IRE SCO NED ITA JER DEN GER ESP FRA WI USA CAN BER) | `europe-americas/gen.py` | `europe-americas/spec/` | `python3 tools/worlddata/europe-americas/gen.py src/data/world/nations` |
| Oceania and Africa (AUS NZ SA ZIM NAM PNG VAN SAM UGA KEN TAN NGA BOT) | `oceania-africa/gen.mjs` | inline in the script | `node tools/worlddata/oceania-africa/gen.mjs src/data/world/nations` |

Every nation file records its `asOf` date and `sources`. Ratings are the game's estimates. Players marked `{ gen: 1 }` are generated placeholders with fictional names. The `scripts/unit/data-*.test.mjs` files check shape, ranges, uniqueness, squad depth and NPL name matches.

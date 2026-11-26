[![make.fun](https://make.fun/badge/u-riidzhsn-famous-last-words-the-funniest-epitaph-ff177406.svg)](https://make.fun/bounty/u-riidzhsn-famous-last-words-the-funniest-epitaph-ff177406?utm_source=github&utm_medium=readme&utm_campaign=u-riidzhsn-famous-last-words-the-funniest-epitaph-ff177406)
[![rank](https://make.fun/badge/u-riidzhsn-famous-last-words-the-funniest-epitaph-ff177406/qw123gyj-dev/u-riidzhsn-famous-last-words-the-funniest-epitaph-ff177406/rank.svg)](https://make.fun/bounty/u-riidzhsn-famous-last-words-the-funniest-epitaph-ff177406/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=u-riidzhsn-famous-last-words-the-funniest-epitaph-ff177406)
[![reward](https://make.fun/badge/u-riidzhsn-famous-last-words-the-funniest-epitaph-ff177406/qw123gyj-dev/u-riidzhsn-famous-last-words-the-funniest-epitaph-ff177406/reward.svg)](https://make.fun/bounty/u-riidzhsn-famous-last-words-the-funniest-epitaph-ff177406?utm_source=github&utm_medium=readme&utm_campaign=u-riidzhsn-famous-last-words-the-funniest-epitaph-ff177406)

# Famous Last Words: The Funniest Epitaph

A deterministic entry picker for the make.fun bounty "Famous Last Words: The Funniest Epitaph". `main.ts` scores 19 hand-written candidate one-liners against the judge's brief — in the brief's own order: a one-line tombstone epitaph of famous last words, a single line of dying speech carved in stone; a real laugh on one read, from a genuine joke rather than a mild pun or a sad sentiment; a surprise, twist or double meaning that lands cleanly; reading like something carved on a stone, one short line with no stage directions and no explanation; and staying in the head, quotable enough to repeat to a friend — then writes the winning line to `$MAKEFUN_OUTPUT_DIR/entry.txt` (fallback `/output/entry.txt`), reads it back, and verifies it byte-for-byte against every gate (1–150 characters, single line, valid UTF-8, not only whitespace). The scorer is sharpened beyond a flat lexicon match: a line with no dying voice is capped on the epitaph criterion, a mild pun alone is capped on the laugh, an explained joke is docked on the stone criterion, and the twist bonus only counts when the twist lands in the final clause, so the sentence ends on the laugh instead of logistics.

The winning line:

> I asked for one more minute. They gave me an eternity instead.

It is first-person dying speech ("I asked"), a genuine joke built on the double meaning of "one more minute" against "an eternity" — the smallest possible request, granted in the largest possible measure — two short clauses with the twist landing in the final one, and short enough to repeat to a friend.

## Run

Node 22, standard library only, no network:

```sh
MAKEFUN_OUTPUT_DIR=/tmp/epitaph-out node main.ts
cat /tmp/epitaph-out/entry.txt
```

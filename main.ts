/**
 * Famous Last Words: The Funniest Epitaph — entry picker.
 *
 * Bounty: write the funniest possible famous last words as a single
 * tombstone epitaph of at most 150 characters, saved to
 * $MAKEFUN_OUTPUT_DIR/entry.txt (fallback /output/entry.txt). A house
 * judge (z-ai/glm-5.3-flash) compares entries two at a time against a
 * brief published with the bounty, weighing, most important first:
 *
 *   1. Is a one-line tombstone epitaph of famous last words, a single
 *      line of dying speech carved in stone; loses to any entry on
 *      the subject.
 *   2. Earns a real laugh on one read, from a genuine joke rather
 *      than a mild pun or a sad sentiment.
 *   3. Turns on a surprise, a twist or a double meaning that lands
 *      cleanly.
 *   4. Reads like something carved on a stone: one short line, no
 *      stage directions, no explanation.
 *   5. Stays in the head after reading, quotable enough to repeat
 *      to a friend.
 *
 * A line that needs an explanation to land has not landed. Length
 * for its own sake does not count.
 *
 * This program scores a hand-written field of candidate one-liners
 * against that brief, in the brief's own order, and writes the winner
 * to $MAKEFUN_OUTPUT_DIR/entry.txt (fallback /output/entry.txt). It
 * then reads the file back and verifies it byte-for-byte against
 * every gate: 1-150 characters, a single line, valid UTF-8, and not
 * only whitespace.
 *
 * Scoring is deliberately lexicographic, mirroring the judge's own
 * instruction: go through the criteria in order, let the first
 * difference decide, unless a later one differs by much more. Ties
 * break criterion by criterion in the brief's order, then by shorter
 * length — a shorter line that says the same thing reads tighter
 * on a stone — then alphabetically, so the run is deterministic.
 *
 * Four sharpening rules sit on top of the flat rubric:
 *
 *   - A line with no dying voice at all — no first-person speaker,
 *     no "here lies", no instruction to the living — is capped on
 *     criterion 1: however funny it is, it is not famous last
 *     words, it is a joke about a grave.
 *   - A line that is only sad sentiment, or only a mild pun with no
 *     real joke behind it, is capped on the laugh: the brief wants
 *     a genuine joke, not a sigh and not a groan.
 *   - A line that explains itself ("because", "which means", a
 *     colon followed by the punchline spelled out) is docked hard
 *     on criterion 4: a stone does not explain its own joke.
 *   - The twist bonus only counts when the twist lands in the
 *     final clause: a punchline buried mid-sentence is a setup
 *     with nowhere to go, and the line ends on logistics instead
 *     of the laugh.
 *
 * Node 22, standard library only, no network, deterministic: the
 * same candidates always produce the same winner.
 */

import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

/* ------------------------------------------------------------------ */
/* Candidates                                                          */
/*                                                                     */
/* Nineteen hand-written one-liners Every one is a single    */
/* line of at most 150 characters, written for this brief: a dying    */
/* person speaking, a genuine joke, a twist that lands, stone-short,  */
/* and quotable. None of them is copied from a famous epitaph.        */
/* ------------------------------------------------------------------ */

const CANDIDATES: string[] = [
  // Understatement in the face of death: the doctor was told, the
  // body disagreed. Dying speech, one short sentence, twist on
  // the word "just".
  "I told the doctor it was just a cough.",

  // The check-up, postponed one time too many — and the patient
  // blames the diagnosis, not the disease.
  "The doctor said I needed rest. I took him literally.",

  // A lifetime of dodging vegetables, judged by the outcome.
  // Setup in the first sentence, verdict in the second.
  "I spent my whole life avoiding vegetables. Look where that got me.",

  // The will is found; the cookies are not. Second-person address
  // to the reader standing at the stone.
  "If you're reading this, the will is in the cookie jar. The cookies are gone.",

  // Dying as he lived: mid-sentence, and behind schedule.
  "I died as I lived: mid-sentence, and slightly behind schedule.",

  // The light at the end of the tunnel, correctly identified.
  "I finally found the light at the end of the tunnel. It was a train.",

  // Practical to the last: the Wi-Fi password matters more than
  // the farewell.
  "Don't cry. I left the Wi-Fi password on the fridge.",

  // A man who died doing what he loved, and what he loved was
  // ignoring the warnings.
  "Here lies a man who died doing what he loved: ignoring the warning labels.",

  // The one regret, and it is gloriously small.
  "My only regret is that I never learned to parallel park.",

  // The farewell that takes itself back mid-sentence.
  "Tell my wife I said hello. Actually, don't — she knows what she did.",

  // Sleep, at last. The joke is that death did not fix the insomnia.
  "I always said I'd sleep when I was dead. Joke's on me — I still can't.",

  // The epitaph that reports the situation, deadpan.
  "Well, that escalated quickly.",

  // Total absolution, with one footnote.
  "I regret nothing. Except that haircut in 2009.",

  // He asked for the bill, and the bill came due. Double meaning
  // on "the bill", and the stone keeps the receipt.
  "Here lies Bob. He asked for the bill, and the bill came due.",

  // The grand exit, undercut by punctuality.
  "Tell them I went out like I lived: dramatically, and five minutes late.",

  // He saw it coming. He just planned to hide from it.
  "I knew this day would come. I just thought I'd have more time to hide.",

  // Peace and quiet at last — spoiled by the neighbours.
  "Finally, some peace and quiet. Shame the neighbours followed me here.",

  // One more minute, granted in full.
  "I asked for one more minute. They gave me an eternity instead.",

  // He finally left the group chat — the one nobody ever leaves
  // quietly. "Left" does double duty: departed, and died.
  "Here lies a man who finally left the group chat.",
];

/* ------------------------------------------------------------------ */
/* Feature helpers                                                     */
/* ------------------------------------------------------------------ */

function words(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9'’\s-]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 0);
}

function hasWord(text: string, word: string): boolean {
  return words(text).includes(word);
}

function hasAnyWord(text: string, list: string[]): boolean {
  return list.some((w) => hasWord(text, w));
}

function countMatches(text: string, list: string[]): number {
  const ws = words(text);
  return list.reduce((n, w) => n + ws.filter((x) => x === w).length, 0);
}

function clamp(score: number, lo = 0, hi = 10): number {
  return Math.max(lo, Math.min(hi, score));
}

/** Split a line into clauses on sentence and comma pivots. */
function clauses(text: string): string[] {
  return text
    .split(/[.!?;,—–-]+/)
    .map((c) => c.trim())
    .filter((c) => c.length > 0);
}

/** The final clause is where a punchline has to land. */
function finalClause(text: string): string {
  const cs = clauses(text);
  return cs.length > 0 ? cs[cs.length - 1] : text;
}

/* ------------------------------------------------------------------ */
/* Criterion 1 — one-line epitaph of famous last words                */
/*                                                                     */
/* Dying speech is first-person, or it addresses the living, or it   */
/* is framed as "here lies". A joke about a grave with no speaker    */
/* in it is not last words at all.                                    */
/* ------------------------------------------------------------------ */

const DYING_SPEECH_OPENERS = [
  "i told",
  "i asked",
  "i knew",
  "i spent",
  "i died",
  "i regret",
  "i always",
  "i finally",
  "don't cry",
  "tell my",
  "tell them",
  "if you're reading this",
];

const TOMBSTONE_FRAMING = ["here lies", "rest in peace", "rip", "in loving memory"];

function scoreEpitaphOfLastWords(text: string): number {
  const lower = text.toLowerCase();
  let score = 4; // a single line about death starts in the middle

  // First-person dying voice: the speaker is the one dying.
  if (hasAnyWord(text, ["i", "my", "me", "we"])) score += 2;

  // An explicit act of dying speech: telling, asking, instructing.
  if (DYING_SPEECH_OPENERS.some((op) => lower.startsWith(op))) score += 2;

  // Tombstone framing: carved-in-stone voice.
  if (TOMBSTONE_FRAMING.some((f) => lower.includes(f))) score += 1;

  // Addressed to the living: the reader is part of the scene.
  if (hasAnyWord(text, ["you", "your", "they", "them"])) score += 1;

  // Sharpening rule: no dying voice at all — no first person, no
  // "here lies", no instruction to the living — caps the criterion.
  // It may be funny, but it is not famous last words.
  const hasVoice =
    hasAnyWord(text, ["i", "my", "me"]) ||
    TOMBSTONE_FRAMING.some((f) => lower.includes(f)) ||
    lower.startsWith("tell") ||
    lower.startsWith("don't");
  if (!hasVoice) score = Math.min(score, 5);

  return clamp(score);
}

/* ------------------------------------------------------------------ */
/* Criterion 2 — earns a real laugh on one read                       */
/*                                                                     */
/* A genuine joke needs a mechanism: understatement, self-            */
/* deprecation, absurdity, misdirection, or dark irony. Sad          */
/* sentiment alone and a mild pun alone do not earn it.              */
/* ------------------------------------------------------------------ */

const SAD_SENTIMENT = [
  "beloved",
  "miss me",
  "missed",
  "forever in our hearts",
  "gone too soon",
  "sad",
  "tears",
  "weep",
  "angel",
  "heaven took",
];

const UNDERSTATEMENT = ["just a", "just", "only", "merely", "a bit", "slightly"];

const SELF_DEPRECATION = [
  "my fault",
  "my only regret",
  "i never learned",
  "i always said",
  "look where that got me",
  "joke's on me",
  "behind schedule",
  "five minutes late",
  "that haircut",
];

const ABSURDITY = [
  "cookies are gone",
  "train",
  "wi-fi password",
  "vegetables",
  "parallel park",
  "neighbours followed me",
  "eternity instead",
  "still can't",
  "group chat",
  "took him literally",
];

const MISDIRECTION = ["actually", "except", "instead", "turns out", "but"];

const DARK_IRONY = [
  "escalated",
  "bill came due",
  "light at the end of the tunnel",
  "sleep when i was dead",
  "died doing what he loved",
  "warning labels",
];

function scoreRealLaugh(text: string): number {
  const lower = text.toLowerCase();
  let score = 2; // a line about death starts with a wry smile at best
  let mechanisms = 0;

  if (UNDERSTATEMENT.some((u) => lower.includes(u))) {
    score += 3;
    mechanisms += 1;
  }
  if (SELF_DEPRECATION.some((s) => lower.includes(s))) {
    score += 2;
    mechanisms += 1;
  }
  if (ABSURDITY.some((a) => lower.includes(a))) {
    score += 2;
    mechanisms += 1;
  }
  if (MISDIRECTION.some((m) => hasWord(text, m))) {
    score += 2;
    mechanisms += 1;
  }
  if (DARK_IRONY.some((d) => lower.includes(d))) {
    score += 2;
    mechanisms += 1;
  }

  // Sad sentiment is not a joke: dock the laugh hard.
  if (SAD_SENTIMENT.some((s) => lower.includes(s))) score -= 4;

  // Sharpening rule: a mild pun alone, with no other mechanism,
  // is capped — the brief wants a genuine joke, not a groan.
  if (mechanisms <= 1) score = Math.min(score, 5);

  return clamp(score);
}

/* ------------------------------------------------------------------ */
/* Criterion 3 — surprise, twist or double meaning                   */
/*                                                                     */
/* The twist has to land, and it has to land at the end: the final   */
/* clause must carry the pivot, the double meaning, or the            */
/* subversion. A twist buried mid-sentence earns nothing.             */
/* ------------------------------------------------------------------ */

const PIVOT_WORDS = [
  "but",
  "actually",
  "except",
  "instead",
  "just",
  "look where",
  "turns out",
  "don't",
];

// Words with a second meaning the line leans on: the bill (the
// cheque / the reckoning), the light (hope / a train), a cough
// (a cold / the thing that killed him), sleep (rest / death),
// the will (the document / his wishes), one more minute (a
// moment / forever).
const DOUBLE_MEANINGS = [
  "bill",
  "light",
  "cough",
  "sleep",
  "will",
  "minute",
  "sick",
  "escalated",
  "train",
  "cookies",
  "rest",
  "literally",
  "left",
];

function scoreTwist(text: string): number {
  const lower = text.toLowerCase();
  const tail = finalClause(text).toLowerCase();
  let score = 2;

  // A pivot word turns the line.
  const pivots = countMatches(text, PIVOT_WORDS.filter((w) => !w.includes(" "))) +
    PIVOT_WORDS.filter((w) => w.includes(" ") && lower.includes(w)).length;
  score += Math.min(3, pivots);

  // A double meaning gives the line a second reading.
  const doubles = countMatches(text, DOUBLE_MEANINGS);
  score += Math.min(2, doubles);

  // Setup then subversion: two clauses, the second undercuts the
  // first (a pivot, a contradiction, or a bathos drop).
  if (clauses(text).length >= 2) score += 1;

  // Whether the twist lands in the final clause, where a
  // punchline has to land.
  const twistInTail =
    PIVOT_WORDS.some((w) => tail.includes(w)) ||
    DOUBLE_MEANINGS.some((w) => tail.split(/\s+/).includes(w));

  // Bathos drop: the final clause is much shorter than the setup
  // and carries the twist — a long wind-up, a two-word punch.
  const cs = clauses(text);
  if (cs.length >= 2) {
    const firstWords = cs[0].split(/\s+/).length;
    const lastWords = cs[cs.length - 1].split(/\s+/).length;
    if (lastWords * 2 <= firstWords && twistInTail) score += 1;
  }

  // Sharpening rule: the twist bonus only counts when the twist
  // lands in the final clause. A punchline in the middle leaves
  // the line ending on logistics.
  if (!twistInTail) score = Math.min(score, 4);

  return clamp(score);
}

/* ------------------------------------------------------------------ */
/* Criterion 4 — reads like something carved on a stone              */
/*                                                                     */
/* One short line, no stage directions, no explanation. A stone      */
/* does not explain its own joke, and it does not need two           */
/* sentences to say one thing.                                        */
/* ------------------------------------------------------------------ */

const STAGE_DIRECTIONS = ["*", "[", "]", "(", ")", "whispers", "stage", "aside", "voiceover"];
const EXPLANATION_WORDS = ["because", "which means", "in other words", "that is", "i.e.", "so that"];

function scoreStoneLike(text: string): number {
  const len = [...text].length;
  let score = 10;

  // Shorter reads tighter on a stone; past 60 characters every
  // extra stretch costs.
  if (len > 60) score -= Math.floor((len - 60) / 15);
  if (len <= 45) score += 0; // already at the top; shortness is its own reward

  // Stage directions are not carving.
  if (STAGE_DIRECTIONS.some((s) => text.toLowerCase().includes(s))) score -= 4;

  // Explanations are not carving: a stone does not justify itself.
  if (EXPLANATION_WORDS.some((e) => text.toLowerCase().includes(e))) score -= 4;

  // A colon that spells the punchline out is an explanation in
  // disguise; a colon that frames the speaker is fine.
  if (text.includes(":") && !text.toLowerCase().startsWith("here lies")) score -= 1;

  // A second sentence is a second thought; a stone holds one.
  const sentences = text.split(/[.!?]+/).filter((s) => s.trim().length > 0).length;
  if (sentences >= 2) score -= 2;

  // A trailing em-dash that cuts the line off mid-word is a
  // gimmick, not a carving.
  if (text.trimEnd().endsWith("—") || text.trimEnd().endsWith("-")) score -= 2;

  return clamp(score);
}

/* ------------------------------------------------------------------ */
/* Criterion 5 — stays in the head, quotable                         */
/*                                                                     */
/* Short, rhythmic, ending on a concrete word. A line you can        */
/* repeat to a friend without looking it up.                         */
/* ------------------------------------------------------------------ */

const PUNCHY_FINAL_WORDS = [
  "cough",
  "sick",
  "train",
  "gone",
  "late",
  "park",
  "fridge",
  "due",
  "hide",
  "here",
  "instead",
  "quickly",
  "2009",
];

function scoreMemorable(text: string): number {
  const len = [...text].length;
  const ws = words(text);
  let score = 3;

  // Short lines are repeatable lines.
  if (len <= 50) score += 2;
  else if (len <= 80) score += 1;

  // Repetition and alliteration make a line stick.
  const seen = new Set<string>();
  let repeated = false;
  for (const w of ws) {
    if (seen.has(w) && w.length > 2) repeated = true;
    seen.add(w);
  }
  if (repeated) score += 1;
  const initials = ws.map((w) => w[0]);
  const initialCounts = new Map<string, number>();
  for (const i of initials) initialCounts.set(i, (initialCounts.get(i) ?? 0) + 1);
  if ([...initialCounts.values()].some((n) => n >= 3)) score += 1;

  // A punchy final word: the line ends on something concrete.
  const lastWord = ws[ws.length - 1] ?? "";
  if (PUNCHY_FINAL_WORDS.includes(lastWord)) score += 2;

  // A self-contained clause that can stand alone as a quote.
  if (clauses(text).some((c) => c.split(/\s+/).length >= 4 && c.split(/\s+/).length <= 10)) {
    score += 1;
  }

  return clamp(score);
}

/* ------------------------------------------------------------------ */
/* Scoring and selection                                             */
/* ------------------------------------------------------------------ */

interface Scored {
  text: string;
  scores: [number, number, number, number, number];
  total: number;
}

function scoreCandidate(text: string): Scored {
  const scores: [number, number, number, number, number] = [
    scoreEpitaphOfLastWords(text),
    scoreRealLaugh(text),
    scoreTwist(text),
    scoreStoneLike(text),
    scoreMemorable(text),
  ];
  return { text, scores, total: scores.reduce((a, b) => a + b, 0) };
}

/**
 * Lexicographic comparison in the brief's own order, mirroring the
 * judge: the first criterion where two lines differ decides, unless
 * a later one differs by much more — approximated here by the
 * ordered tuple, with total as the "much more" escape hatch only
 * when the tuples tie. Shorter wins the remaining ties.
 */
function compareScored(a: Scored, b: Scored): number {
  for (let i = 0; i < 5; i++) {
    if (a.scores[i] !== b.scores[i]) return b.scores[i] - a.scores[i];
  }
  if (a.total !== b.total) return b.total - a.total;
  const lenDiff = [...a.text].length - [...b.text].length;
  if (lenDiff !== 0) return lenDiff;
  return a.text < b.text ? -1 : a.text > b.text ? 1 : 0;
}

/* ------------------------------------------------------------------ */
/* Gates and output                                                  */
/* ------------------------------------------------------------------ */

const MAX_CHARS = 150;

function verifyEntry(entry: string, written: Buffer): void {
  const chars = [...entry];
  if (chars.length < 1 || chars.length > MAX_CHARS) {
    throw new Error(`gate failed: entry is ${chars.length} characters, must be 1-${MAX_CHARS}`);
  }
  if (entry.trim().length === 0) {
    throw new Error("gate failed: entry is only whitespace");
  }
  if (entry.includes("\n") || entry.includes("\r")) {
    throw new Error("gate failed: entry is not a single line");
  }
  // Valid UTF-8: the bytes we wrote must decode back to the same
  // string, byte for byte.
  const decoded = written.toString("utf8");
  if (decoded !== entry) {
    throw new Error("gate failed: entry is not valid UTF-8");
  }
  if (!written.equals(Buffer.from(entry, "utf8"))) {
    throw new Error("gate failed: written bytes do not match entry");
  }
}

function main(): void {
  const outDir = process.env.MAKEFUN_OUTPUT_DIR ?? "/output";
  const outPath = join(outDir, "entry.txt");

  const scored = CANDIDATES.map(scoreCandidate).sort(compareScored);
  const winner = scored[0];

  console.log("Famous Last Words: The Funniest Epitaph — scored candidates");
  console.log("criteria order: epitaph / laugh / twist / stone / memorable");
  for (const s of scored) {
    console.log(
      `  [${s.scores.join(" ")}] total ${String(s.total).padStart(2)}  (${[...s.text].length} chars) ${s.text}`,
    );
  }
  console.log(`\nWinner (${[...winner.text].length} chars): ${winner.text}`);

  mkdirSync(outDir, { recursive: true });
  const bytes = Buffer.from(winner.text, "utf8");
  writeFileSync(outPath, bytes);

  // Read it back and verify every gate.
  const readBack = readFileSync(outPath);
  verifyEntry(readBack.toString("utf8"), readBack);
  console.log(`Wrote and verified ${outPath} (${readBack.length} bytes, ${[...winner.text].length} chars, single line, valid UTF-8)`);
}

main();

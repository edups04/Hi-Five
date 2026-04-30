/**
 * SentenceBuilder.ts
 *
 * Turns a stream of per-frame predictions into a stable, accumulating
 * sentence. Direct port of the Python SentenceBuilder in test_webcam.py
 * — same defaults, same behavior. The Python version is unit-tested so
 * we know the rules work.
 *
 * Usage:
 *   const builder = new SentenceBuilder();
 *   builder.update("A", 0.95);          // call once per frame
 *   console.log(builder.sentence);      // "A" once stable
 *
 * Rules:
 *   - A letter is committed only when it's been the top prediction for
 *     STABILITY_FRAMES consecutive frames AND confidence >= MIN_CONFIDENCE
 *     AND it differs from the last letter committed.
 *   - To repeat a letter (e.g. "BOOK"): change to a different sign or
 *     pull the hand away for RESET_FRAMES, then sign the letter again.
 *   - "space" sign  -> appends " "
 *   - "del" sign    -> deletes the last character (acts as backspace)
 *   - "nothing"     -> never committed (it's not a letter)
 */

export const STABILITY_FRAMES = 5;
export const MIN_CONFIDENCE = 0.7;
export const RESET_FRAMES = 4;

export interface SentenceBuilderOptions {
  stabilityFrames?: number;
  minConfidence?: number;
  resetFrames?: number;
}

export class SentenceBuilder {
  sentence = "";

  private stabilityFrames: number;
  private minConfidence: number;
  private resetFrames: number;

  // A small ring buffer of the last N predictions — used to verify the
  // current label has been "stable" before committing it.
  private recent: string[] = [];
  private lastCommitted: string | null = null;
  private framesSinceCommit = 0;

  constructor(opts: SentenceBuilderOptions = {}) {
    this.stabilityFrames = opts.stabilityFrames ?? STABILITY_FRAMES;
    this.minConfidence = opts.minConfidence ?? MIN_CONFIDENCE;
    this.resetFrames = opts.resetFrames ?? RESET_FRAMES;
  }

  /**
   * Feed one frame's prediction. Returns true if a letter was committed
   * on this call (useful for sound effects, haptics, etc).
   */
  update(label: string, confidence: number): boolean {
    // Ring-buffer push: keep only the last `stabilityFrames` predictions.
    // Low-confidence frames are tagged "_low" so they break stability runs
    // even if the label is correct — we only trust confident readings.
    this.recent.push(confidence >= this.minConfidence ? label : "_low");
    if (this.recent.length > this.stabilityFrames) this.recent.shift();
    this.framesSinceCommit++;

    // Allow re-committing the same letter once enough "different" frames
    // have passed (or the user signed something else). This is what makes
    // "BOOK" possible without making "AAAA" possible from a held A.
    if (
      this.lastCommitted !== null &&
      this.framesSinceCommit >= this.resetFrames &&
      label !== this.lastCommitted
    ) {
      this.lastCommitted = null;
    }

    if (!this.shouldCommit(label, confidence)) return false;
    this.commit(label);
    return true;
  }

  private shouldCommit(label: string, confidence: number): boolean {
    if (this.recent.length < this.stabilityFrames) return false;
    if (confidence < this.minConfidence) return false;
    if (this.recent.some((r) => r !== label)) return false;
    if (label === "nothing") return false;
    if (label === this.lastCommitted) return false;
    return true;
  }

  private commit(label: string): void {
    if (label === "space") {
      this.sentence += " ";
    } else if (label === "del") {
      this.sentence = this.sentence.slice(0, -1);
    } else {
      this.sentence += label;
    }
    this.lastCommitted = label;
    this.framesSinceCommit = 0;
  }

  clear(): void {
    this.sentence = "";
    this.recent = [];
    this.lastCommitted = null;
    this.framesSinceCommit = 0;
  }

  backspace(): void {
    this.sentence = this.sentence.slice(0, -1);
  }
}

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

  private recent: string[] = [];
  private lastCommitted: string | null = null;
  private framesSinceCommit = 0;

  constructor(opts: SentenceBuilderOptions = {}) {
    this.stabilityFrames = opts.stabilityFrames ?? STABILITY_FRAMES;
    this.minConfidence = opts.minConfidence ?? MIN_CONFIDENCE;
    this.resetFrames = opts.resetFrames ?? RESET_FRAMES;
  }

  update(label: string, confidence: number): boolean {

    this.recent.push(confidence >= this.minConfidence ? label : "_low");
    if (this.recent.length > this.stabilityFrames) this.recent.shift();
    this.framesSinceCommit++;
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
  appendSpace(): void {
    this.sentence += " ";
  }
}

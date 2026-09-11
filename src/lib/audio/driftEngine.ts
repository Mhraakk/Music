/**
 * WEB AUDIO DRIFT ENGINE
 *
 * Transitions in this application are not track changes. There is no gap, no
 * fade-to-silence and no "now playing next" moment — one emotional position
 * dissolves into the next while both are sounding.
 *
 * Two lanes alternate. To drift, the outgoing lane's gain is taken down along an
 * equal-power curve while the incoming lane's is brought up along its mirror, so
 * perceived loudness stays flat through the overlap. A linear crossfade would
 * audibly dip in the middle, which is precisely the seam the engine exists to
 * avoid.
 *
 * The engine also degrades in three stages, because a silent phase must still
 * drift:
 *   1. Full Web Audio graph with an analyser (needs CORS-clean audio).
 *   2. Bare `<audio>` elements with element-level volume, if the graph is
 *      refused — playback and volume gestures both still work.
 *   3. A phantom lane with no media at all, so an unresolved phase still
 *      advances the arc on a timer and still collects implicit feedback.
 */

export type LaneId = 0 | 1;

export type DriftEngineState = {
  /** Whether a real Web Audio graph is in place, or we fell back to elements. */
  graph: boolean;
  analyser: boolean;
  /** Master level in [0,1], independent of any crossfade in progress. */
  volume: number;
  /** True while a crossfade is in flight. */
  drifting: boolean;
};

const DEFAULT_DRIFT_MS = 6500;

export class DriftAudioEngine {
  private context: AudioContext | null = null;
  private elements: [HTMLAudioElement, HTMLAudioElement] | null = null;
  private gains: [GainNode, GainNode] | null = null;
  private master: GainNode | null = null;
  private analyserNode: AnalyserNode | null = null;
  private frequencyData: Uint8Array<ArrayBuffer> | null = null;
  private active: LaneId = 0;
  private masterVolume = 0.7;
  private driftUntil = 0;
  /** Lanes whose media element was rejected by the Web Audio graph. */
  private graphFailed = false;

  /**
   * Must be called from a user gesture — browsers will not start an
   * AudioContext otherwise, and an engine created eagerly on mount would be
   * permanently suspended.
   */
  init(): void {
    if (typeof window === "undefined" || this.elements) return;

    const makeElement = () => {
      const el = new Audio();
      el.preload = "auto";
      el.crossOrigin = "anonymous";
      el.volume = this.masterVolume;
      return el;
    };

    this.elements = [makeElement(), makeElement()];

    try {
      const Ctor = window.AudioContext ?? (window as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!Ctor) throw new Error("Web Audio unavailable");

      const context = new Ctor();
      const master = context.createGain();
      master.gain.value = this.masterVolume;

      const analyser = context.createAnalyser();
      analyser.fftSize = 1024;
      analyser.smoothingTimeConstant = 0.82;

      const lane0 = context.createGain();
      const lane1 = context.createGain();
      lane0.gain.value = 1;
      lane1.gain.value = 0;

      context.createMediaElementSource(this.elements[0]).connect(lane0);
      context.createMediaElementSource(this.elements[1]).connect(lane1);
      lane0.connect(master);
      lane1.connect(master);
      master.connect(analyser);
      analyser.connect(context.destination);

      this.context = context;
      this.master = master;
      this.gains = [lane0, lane1];
      this.analyserNode = analyser;
      this.frequencyData = new Uint8Array(new ArrayBuffer(analyser.frequencyBinCount));

      // Element volume must be neutral once routed through the graph, or the
      // master gain and the element attenuate the signal twice.
      this.elements[0].volume = 1;
      this.elements[1].volume = 1;
    } catch {
      // Stage 2: element-only playback. Volume gestures still work, so implicit
      // feedback collection is unaffected — only the analyser is lost.
      this.graphFailed = true;
    }
  }

  get state(): DriftEngineState {
    return {
      graph: Boolean(this.context) && !this.graphFailed,
      analyser: Boolean(this.analyserNode),
      volume: this.masterVolume,
      drifting: Date.now() < this.driftUntil,
    };
  }

  get ready(): boolean {
    return Boolean(this.elements);
  }

  async resume(): Promise<void> {
    if (this.context?.state === "suspended") {
      await this.context.resume().catch(() => undefined);
    }
  }

  /**
   * Drift into a new source. Returns the lane now carrying the incoming audio,
   * or `null` when there is nothing to play — a phantom drift, which the caller
   * advances on a timer instead.
   */
  async driftTo(url: string | null, durationMs = DEFAULT_DRIFT_MS): Promise<LaneId | null> {
    if (!this.elements) this.init();
    if (!this.elements) return null;

    await this.resume();

    const incoming: LaneId = this.active === 0 ? 1 : 0;
    const outgoing = this.active;

    if (!url) {
      // Phantom drift: fade the outgoing lane out so the room goes quiet
      // gracefully rather than cutting, and report that nothing took over.
      this.fadeLane(outgoing, 0, durationMs);
      this.driftUntil = Date.now() + durationMs;
      return null;
    }

    const element = this.elements[incoming];
    element.src = url;
    element.currentTime = 0;

    // The incoming lane must be silent *before* it starts, otherwise the first
    // moments of the next position arrive at full level on top of the current one.
    this.setLaneGain(incoming, 0);
    if (!this.context) element.volume = 0;

    try {
      await element.play();
    } catch {
      // Autoplay refusal or an unplayable source. Leave the outgoing lane alone
      // rather than fading into silence for no reason.
      return null;
    }

    this.fadeLane(incoming, 1, durationMs);
    this.fadeLane(outgoing, 0, durationMs);

    this.active = incoming;
    this.driftUntil = Date.now() + durationMs;

    // Stop the outgoing element once it is inaudible, so it is not decoding for
    // the rest of the session.
    window.setTimeout(() => {
      const el = this.elements?.[outgoing];
      if (el && this.active !== outgoing) {
        el.pause();
        el.removeAttribute("src");
      }
    }, durationMs + 200);

    return incoming;
  }

  /**
   * Equal-power crossfade. `setValueCurveAtTime` with a cosine/sine pair keeps
   * the summed power of the two lanes constant through the overlap; the naive
   * linear ramp pair sums to ~0.7 at the midpoint and dips audibly.
   */
  private fadeLane(lane: LaneId, to: number, durationMs: number): void {
    const gains = this.gains;
    const context = this.context;

    if (!gains || !context) {
      // Element-only fallback: step the element volume on a short interval.
      const el = this.elements?.[lane];
      if (!el) return;
      const from = el.volume;
      const target = to * this.masterVolume;
      const steps = 40;
      let i = 0;
      const timer = window.setInterval(() => {
        i += 1;
        const t = i / steps;
        const curve = to > from ? Math.sin((t * Math.PI) / 2) : Math.cos((t * Math.PI) / 2);
        el.volume = Math.max(0, Math.min(1, from + (target - from) * (to > from ? curve : 1 - curve)));
        if (i >= steps) {
          el.volume = target;
          window.clearInterval(timer);
        }
      }, durationMs / steps);
      return;
    }

    const node = gains[lane];
    const now = context.currentTime;
    const points = 48;
    const curve = new Float32Array(points);
    const from = node.gain.value;

    for (let i = 0; i < points; i++) {
      const t = i / (points - 1);
      // cos → 1..0 for the outgoing lane, sin → 0..1 for the incoming one.
      const shaped = to > from ? Math.sin((t * Math.PI) / 2) : Math.cos((t * Math.PI) / 2);
      curve[i] = from + (to - from) * (to > from ? shaped : 1 - shaped);
    }

    node.gain.cancelScheduledValues(now);
    node.gain.setValueAtTime(from, now);
    try {
      node.gain.setValueCurveAtTime(curve, now, durationMs / 1000);
    } catch {
      node.gain.linearRampToValueAtTime(to, now + durationMs / 1000);
    }
  }

  private setLaneGain(lane: LaneId, value: number): void {
    if (this.gains && this.context) {
      const node = this.gains[lane];
      node.gain.cancelScheduledValues(this.context.currentTime);
      node.gain.setValueAtTime(value, this.context.currentTime);
    } else if (this.elements) {
      this.elements[lane].volume = value * this.masterVolume;
    }
  }

  /**
   * Master level. This is the single most important input the engine has: a
   * change here during a vocal fragility window is the load-bearing implicit
   * feedback signal, so the caller is expected to observe it, not just apply it.
   */
  setVolume(value: number): void {
    this.masterVolume = Math.max(0, Math.min(1, value));
    if (this.master && this.context) {
      this.master.gain.setTargetAtTime(this.masterVolume, this.context.currentTime, 0.05);
    } else if (this.elements) {
      // Only the active lane; the inactive one is mid-fade or silent.
      this.elements[this.active].volume = this.masterVolume;
    }
  }

  get volume(): number {
    return this.masterVolume;
  }

  /** Normalised playback position of the sounding lane, in [0,1]. */
  progress(): number {
    const el = this.elements?.[this.active];
    if (!el || !el.duration || !Number.isFinite(el.duration) || el.duration === 0) return 0;
    return Math.max(0, Math.min(1, el.currentTime / el.duration));
  }

  /** Seconds remaining on the sounding lane, or `null` when unknown. */
  remaining(): number | null {
    const el = this.elements?.[this.active];
    if (!el || !el.duration || !Number.isFinite(el.duration)) return null;
    return Math.max(0, el.duration - el.currentTime);
  }

  get playing(): boolean {
    const el = this.elements?.[this.active];
    return Boolean(el && !el.paused && !el.ended);
  }

  pause(): void {
    this.elements?.forEach((el) => el.pause());
  }

  async play(): Promise<void> {
    await this.resume();
    const el = this.elements?.[this.active];
    if (el?.src) await el.play().catch(() => undefined);
  }

  /**
   * Coarse spectral energy in [0,1], for the room's live intensity readout.
   * Returns `null` when no analyser exists, so the UI can show the honest
   * "no waveform" state rather than a fabricated animation.
   */
  intensity(): number | null {
    if (!this.analyserNode || !this.frequencyData) return null;
    this.analyserNode.getByteFrequencyData(this.frequencyData);
    let sum = 0;
    for (let i = 0; i < this.frequencyData.length; i++) sum += this.frequencyData[i];
    return sum / (this.frequencyData.length * 255);
  }

  /** Called when the sounding lane reaches its end, so the arc can advance. */
  onEnded(handler: () => void): () => void {
    const elements = this.elements;
    if (!elements) return () => undefined;
    const wrapped = () => handler();
    elements.forEach((el) => el.addEventListener("ended", wrapped));
    return () => elements.forEach((el) => el.removeEventListener("ended", wrapped));
  }

  destroy(): void {
    this.elements?.forEach((el) => {
      el.pause();
      el.removeAttribute("src");
    });
    this.context?.close().catch(() => undefined);
    this.context = null;
    this.elements = null;
    this.gains = null;
    this.master = null;
    this.analyserNode = null;
    this.frequencyData = null;
  }
}

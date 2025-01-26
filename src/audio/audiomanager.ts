import { Entity } from "../entity/entity.js";
import { Game } from "../core/game.js";
import { EventConnection } from "../util/gameevent.js";
import { Util } from "../util/util.js";

type AudioName = "menu" | "click" | "ambience" | "footstep" | "scanning" | "heartbeat" | "aggression" | "static";

interface AudioInfo {
  name: AudioName,
  volume: number,
  looped: boolean,
  range?: number,
  frequency?: number
}

/** Manages and loads game sounds. */
export class AudioManager {
  private readonly AUDIO_INFO: AudioInfo[] = [
    { name: "menu", volume: 1, looped: true },
    { name: "click", volume: 1, looped: false },
    { name: "ambience", volume: 0.5, looped: true },
    { name: "footstep", volume: 3.5, looped: false, frequency: 0.8 },
    { name: "scanning", volume: 1.2, looped: true },
    { name: "heartbeat", volume: 0.8, looped: false, frequency: 1.5 },
    { name: "aggression", volume: 4, looped: false, range: 100 },
    { name: "static", volume: 1.5, looped: true }
  ]

  private context: AudioContext = new AudioContext();

  private audios: Map<AudioName, AudioEffect> = new Map();

  /** Intializes and loads all game audios. */
  public async init(): Promise<void> {
    const promises: Promise<void>[] = [];

    for (let i: number = 0; i < this.AUDIO_INFO.length; i++) {
      promises[i] = this.loadAudio(this.AUDIO_INFO[i]);
    }

    await Promise.all(promises);
  }

  /**
   * 
   * @param info The audio info.
   * @returns A promise, resolving once the audio loads.
   */
  private async loadAudio(info: AudioInfo): Promise<void> {
    const path: string = `res/audio/${info.name}.mp3`;
    const audioFile: Response = await Util.loadFile(path);
    const arrayBuffer: ArrayBuffer = await audioFile.arrayBuffer();
    const buffer: AudioBuffer = await this.context.decodeAudioData(arrayBuffer);

    // Create and add the audio effect to the map
    const effect: AudioEffect = new AudioEffect(this.context, buffer, info.volume, info.looped, info.range, info.frequency);
    this.audios.set(info.name, effect);
  }

  /**
   * Gets the audio effect associated with the specified name.
   * @param name The audio name.
   * @returns The audio effect.
   */
  public get(name: AudioName): AudioEffect {
    return this.audios.get(name)!;
  }
}

/** Represents an audio effect and manages creation of emitters and emissions. */
export class AudioEffect {
  private defaultGain: GainNode;

  /**
   * Creates an audio effect from the specified parameters.
   * @param context The audio context.
   * @param buffer The audio array buffer.
   * @param defaultVolume The default audio volume.
   * @param looped Whether or not it should loop.
   * @param range The audio roll off range.
   * @param emitFrequency The emit frequency for emitters.
   */
  constructor(
    private context: AudioContext,
    private buffer: AudioBuffer,
    defaultVolume: number = 1,
    private looped: boolean = false,
    private range: number = 0,
    private emitFrequency: number = 1
  ) {
    // Create default gain node for the default volume
    this.defaultGain = this.context.createGain();
    this.defaultGain.gain.value = defaultVolume;
    this.defaultGain.connect(this.context.destination);
  }

  /**
   * Creates an audio emitter from the audio effect.
   * @returns The new audio emitter.
   */
  public createEmitter(): AudioEmitter {
    return new AudioEmitter(this, this.emitFrequency);
  }

  /**
   * Creates a new audio emission from the effect.
   * @param autoPlay Whether the emission should play by default.
   * @returns The audio emission.
   */
  public emit(autoPlay?: boolean): AudioEmission {
    // Create and connect the gain node for the emission
    const gainNode: GainNode = this.context.createGain();
    gainNode.connect(this.defaultGain);

    // Create and connect the source node for the emission
    const source: AudioBufferSourceNode = this.context.createBufferSource();
    source.loop = this.looped;
    source.buffer = this.buffer;
    source.connect(gainNode);

    return new AudioEmission(source, gainNode, this.range, autoPlay);
  }
}

/** Handles routine emission of an audio effect. */
export class AudioEmitter {
  private volumeScale: number = 1;
  private frequencyScale: number = 1;

  private _active: boolean = false;
  private timePassed: number = 0;
  private timeEnded: number;
  private updateConnection?: EventConnection;

  constructor(private audio: AudioEffect, private emitFrequency: number = 1) {}

  public get active(): boolean {
    return this._active;
  }

  /** Sets the volume scale of the emitter. */
  public set volume(scale: number) {
    this.volumeScale = Math.max(scale, 0);
  }

  /** Sets the frequency scale of the emitter. */
  public set frequency(scale: number) {
    this.frequencyScale = Math.max(scale, 0);
  }

  /** Emit the audio from the audio effect. */
  private emitAudio(): void {
    const emission: AudioEmission = this.audio.emit(true);
    emission.volume = this.volumeScale; // Set the emission's volume scale to the emitter's volume scale.
  }

  /** Starts the emission loop of the audio emitter. */
  public start(): void {
    if (this._active) return;
    this._active = true;

    // Set time passed based on the time passed since the last time it was ended
    if (this.timeEnded !== undefined) {
      this.timePassed += Game.instance.elapsedTime - this.timeEnded;

      if (this.timePassed >= this.emitFrequency) this.timePassed = 0;
    }

    if (this.timePassed === 0) this.emitAudio();

    this.updateConnection = Game.instance.lastStep.connect((deltaTime: number) => {
      this.update(deltaTime);
    });
  }

  /**
   * Handles the emission loop and emitting audio.
   * @param deltaTime The time passed since the last frame.
   */
  private update(deltaTime: number): void {
    this.timePassed += deltaTime * this.frequencyScale;

    while (this.timePassed >= this.emitFrequency) {
      this.timePassed -= this.emitFrequency;
      this.emitAudio();
    }
  }

  /** Ends the emission loop of the emitter. */
  public stop(): void {
    if (!this._active) return;
    this._active = false;

    this.timeEnded = Game.instance.elapsedTime;

    if (this.updateConnection) this.updateConnection.disconnect();
    delete this.updateConnection;
  }
}

/** Handles playing and stopping audio. */
export class AudioEmission {
  private volumeScale: number = 1;

  private _subject?: Entity;
  private updateConnection?: EventConnection;

  constructor(
    private source: AudioBufferSourceNode,
    private gainNode: GainNode,
    private range: number,
    autoPlay?: boolean
  ) {
    this.source.addEventListener("ended", () => {
      this.cleanup();

    }, { once: true });

    if (autoPlay) this.play();
  }

  /** Sets the volume of the gain node. */
  public set volume(scale: number) {
    this.volumeScale = Math.max(scale, 0);
    this.updateVolume();
  }

  /** Sets the subject for range roll off. */
  public set subject(entity: Entity | undefined) {
    this._subject = entity;

    if (!this._subject && this.updateConnection) {
      this.updateConnection.disconnect();

    } else if (this._subject && !this.updateConnection) {
      this.updateConnection = Game.instance.lastStep.connect(() => {
        this.updateVolume();
      });
    }
  }

  /** Updates the audio's volume based on the volume scale and distance from subject. */
  private updateVolume(): void {
    let volume = this.volumeScale;

    if (this._subject) {
      const distance: number = Game.instance.camera.position.subtract(this._subject!.position).magnitude;

      volume *= Math.max(1 - distance / this.range, 0);
    }

    this.gainNode.gain.value = volume;
  }

  /** Plays the audio. */
  public play(): void {
    this.source.start();
  }

  /** Stops and destroys the audio. */
  public stop(): void {
    this.source.stop();
  }

  /** Cleans up and disconnects the audio and its connections. */
  private cleanup(): void {
    this.gainNode.disconnect();
    this.source.disconnect();

    if (this.updateConnection) this.updateConnection.disconnect();
  }
}
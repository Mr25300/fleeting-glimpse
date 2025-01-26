import { Entity } from "./entity/entity.js";
import { Game } from "./game.js";
import { EventConnection } from "./gameevent.js";
import { Util } from "./util.js";

type AudioName = "menu" | "click" | "ambience" | "footstep" | "scanning" | "heartbeat" | "aggression" | "static";

interface AudioInfo {
  name: AudioName,
  volume: number,
  looped: boolean,
  range?: number,
  frequency?: number
}

export class AudioManager {
  private AUDIO_INFO: AudioInfo[] = [
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

  public async init(): Promise<void> {
    const promises: Promise<AudioEffect>[] = [];

    for (let i: number = 0; i < this.AUDIO_INFO.length; i++) {
      promises[i] = this.loadAudio(this.AUDIO_INFO[i]);
    }

    const results: AudioEffect[] = await Promise.all(promises);

    for (let i: number = 0; i < results.length; i++) {
      this.audios.set(this.AUDIO_INFO[i].name, results[i]);
    }
  }

  public start(): void {
    this.context.resume();
  }

  private async loadAudio(info: AudioInfo): Promise<AudioEffect> {
    const path: string = `res/audio/${info.name}.mp3`;
    const arrayBuffer: ArrayBuffer = await (await Util.loadFile(path)).arrayBuffer();
    const buffer: AudioBuffer = await this.context.decodeAudioData(arrayBuffer);

    return new AudioEffect(this.context, buffer, info.volume, info.looped, info.range, info.frequency);
  }

  public get(name: AudioName): AudioEffect {
    return this.audios.get(name)!;
  }
}

export class AudioEffect {
  private defaultGain: GainNode;

  private timePassed: number = 0;
  private updateConnection?: EventConnection;

  constructor(
    private context: AudioContext,
    private buffer: AudioBuffer,
    defaultVolume: number = 1,
    private looped: boolean = false,
    private range: number = 0,
    private emitFrequency: number = 1
  ) {
    this.defaultGain = this.context.createGain();
    this.defaultGain.gain.value = defaultVolume;
    this.defaultGain.connect(this.context.destination);
  }

  public createEmitter(): AudioEmitter {
    return new AudioEmitter(this, this.emitFrequency);
  }

  public emit(autoPlay?: boolean): AudioEmission {
    const gainNode: GainNode = this.context.createGain();
    gainNode.connect(this.defaultGain);

    const source: AudioBufferSourceNode = this.context.createBufferSource();
    source.loop = this.looped;
    source.buffer = this.buffer;
    source.connect(gainNode);

    return new AudioEmission(source, gainNode, this.range, autoPlay);
  }
}

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

  public set volume(scale: number) {
    this.volumeScale = Math.max(scale, 0);
  }

  public set frequency(scale: number) {
    this.frequencyScale = Math.max(scale, 0);
  }

  private emitAudio(): void {
    const emission: AudioEmission = this.audio.emit(true);
    emission.volume = this.volumeScale;
  }

  public start(): void {
    if (this._active) return;
    this._active = true;

    if (this.timeEnded !== undefined) {
      this.timePassed += Game.instance.elapsedTime - this.timeEnded;

      if (this.timePassed >= this.emitFrequency) this.timePassed = 0;
    }

    if (this.timePassed === 0) this.emitAudio();

    this.updateConnection = Game.instance.lastStep.connect((deltaTime: number) => {
      this.update(deltaTime)
    });
  }

  private update(deltaTime: number): void {
    this.timePassed += deltaTime * this.frequencyScale;

    while (this.timePassed >= this.emitFrequency) {
      this.timePassed -= this.emitFrequency;
      this.emitAudio();
    }
  }

  public stop(): void {
    if (!this._active) return;
    this._active = false;

    this.timeEnded = Game.instance.elapsedTime;

    if (this.updateConnection) this.updateConnection.disconnect();
    delete this.updateConnection;
  }
}

export class AudioEmission {
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
    });

    if (autoPlay) this.play();
  }

  public set volume(scale: number) {
    this.gainNode.gain.value = Math.max(scale, 0);
  }

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

  private updateVolume(): void {
    const distance: number = Game.instance.camera.position.subtract(this._subject!.position).magnitude;

    this.gainNode.gain.value = Math.max(1 - distance / this.range, 0);
  }

  public play(): void {
    this.source.start();
  }

  public stop(): void {
    this.source.stop();

    if (this.updateConnection) this.updateConnection.disconnect();
  }

  private cleanup(): void {
    this.gainNode.disconnect();
    this.source.disconnect();
  }
}
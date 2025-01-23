import { Entity } from "./entity.js";
import { Game } from "./game.js";
import { EventConnection } from "./gameevent.js";
import { Util } from "./util.js";

type AudioName = "menu" | "click" | "ambience" | "footstep" | "scanning" | "aggression";

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
    { name: "ambience", volume: 1, looped: true },
    { name: "footstep", volume: 1, looped: false, frequency: 0.8 },
    { name: "scanning", volume: 1, looped: true },
    { name: "aggression", volume: 1, looped: false, range: 20 }
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

  public async loadAudio(info: AudioInfo): Promise<AudioEffect> {
    const path: string = `res/audio/${info.name}.mp3`;
    const arrayBuffer: ArrayBuffer = await (await Util.loadFile(path)).arrayBuffer();
    const buffer: AudioBuffer = await this.context.decodeAudioData(arrayBuffer);

    return new AudioEffect(this.context, buffer, info.volume, info.looped, info.range, info.frequency);
  }

  public getAudio(name: AudioName): AudioEffect {
    return this.audios.get(name)!;
  }
}

export class AudioEffect {
  private defaultGain: GainNode;

  private volumeScale: number = 1;
  private frequencyScale: number = 1;

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

  public set volume(scale: number) {
    this.volumeScale = Math.max(scale, 0);
  }

  public set frequency(scale: number) {
    this.frequencyScale = Math.max(scale, 0);
  }

  public emit(autoPlay?: boolean): AudioEmission {
    const gainNode: GainNode = this.context.createGain();
    gainNode.gain.value = this.volumeScale;
    gainNode.connect(this.defaultGain);

    const source: AudioBufferSourceNode = this.context.createBufferSource();
    source.loop = this.looped;
    source.buffer = this.buffer;
    source.connect(gainNode);

    return new AudioEmission(source, gainNode, this.range, autoPlay);
  }

  public startEffect(): void {
    if (this.updateConnection) return;

    this.timePassed = 0;
    this.emit(true);

    this.updateConnection = Game.instance.postPhysicsStep.connect((deltaTime: number) => {
      this.updateEffect(deltaTime);
    })
  }

  public stopEffect(): void {
    if (!this.updateConnection) return;
      
    this.updateConnection.disconnect();
    delete this.updateConnection;
  }

  private updateEffect(deltaTime: number): void {
    this.timePassed += deltaTime * this.frequencyScale;

    while (this.timePassed > this.emitFrequency) {
      this.timePassed -= this.emitFrequency;
      this.emit(true);
    }
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
      this.updateConnection = Game.instance.postPhysicsStep.connect(() => {
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
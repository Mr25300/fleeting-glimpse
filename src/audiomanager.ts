type AudioName = "ambient" | "walking" | "scanning" | "chasing";

export class AudioManager {
  private audio: Record<AudioName, HTMLAudioElement>;

  constructor() {
    this.audio = {
      "ambient": this.loadAudio("res/audio/ambient.mp3", true, 0.25),
      "walking": this.loadAudio("res/audio/walking.mp3", true),
      "scanning": this.loadAudio("res/audio/scanning.mp3", true),
      "chasing": this.loadAudio("res/audio/chasing.mp3", true)
    }
  }

  private loadAudio(path: string, looped: boolean = false, volume: number = 1): HTMLAudioElement {
    const audio: HTMLAudioElement = new Audio(path);
    audio.loop = looped;
    audio.volume = volume;

    audio.onerror = () => {
      console.error(`Audio file ${path} failed to load.`);
    }

    return audio;
  }

  public play(name: AudioName): void {
    this.audio[name].play();
  }

  public stop(name: AudioName): void {
    this.audio[name].pause();
  }

  public isPlaying(name: AudioName): boolean {
    return this.audio[name].paused;
  }

  public clonePlay(name: AudioName): void {
    const clone: HTMLAudioElement = this.audio[name].cloneNode(true) as HTMLAudioElement;
    clone.play();

    clone.onended = () => {
      clone.remove();
    }
  }
}
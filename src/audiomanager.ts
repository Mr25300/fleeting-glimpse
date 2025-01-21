type AudioName = "ambient" | "walking" | "scanning" | "chasing";

export class AudioManager {
  private audio: Record<AudioName, HTMLAudioElement>;

  constructor() {
    const ambient = new Audio("res/audio/ambient.mp3");
    ambient.volume = 0.25;
    ambient.loop = true;

    const walking = new Audio("res/audio/walking.mp3");
    walking.loop = true;

    const scanning = new Audio("res/audio/scanning.mp3");
    scanning.loop = true;

    const chasing = new Audio("res/audio/chasing.mp3");
    chasing.loop = true;

    this.audio = {
      "ambient": ambient,
      "walking": walking,
      "scanning": scanning,
      "chasing": chasing
    }
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
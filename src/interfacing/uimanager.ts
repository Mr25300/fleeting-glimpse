import { AudioEmission } from "../audio/audiomanager.js";
import { Monster } from "../entity/monster.js";
import { Player } from "../entity/player.js";
import { Game } from "../core/game.js";

/** Handles all UI methods. */
export class UIManager {
  private readonly LOAD_TEMPLATE: HTMLTemplateElement = document.getElementById("loading-screen-template") as HTMLTemplateElement;
  private readonly MENU_TEMPLATE: HTMLTemplateElement = document.getElementById("main-menu-template") as HTMLTemplateElement;
  private readonly END_TEMPLATE: HTMLTemplateElement = document.getElementById("end-screen-template") as HTMLTemplateElement;
  private readonly GAME_INFO: HTMLDivElement = document.getElementById("game-info") as HTMLDivElement;

  /**
   * Creates a promise that resolves after the user clicks anywhere on the page.
   * @returns The created promise.
   */
  private async awaitUserClick(): Promise<void> {
    return new Promise<void>((resolve) => {
      document.addEventListener("click", () => {
        resolve();

      }, { once: true });
    });
  }

  /**
   * Creates a promise that resolves after a certain amount of time passes.
   * @param time The amount of time.
   * @returns The created promise.
   */
  private async msDelay(time: number): Promise<void> {
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve();

      }, time * 1000);
    });
  }

  /**
   * Creates a black screen cover element which transitions between two opacities.
   * @param type The transition type:
   * - True if it starts transparent and fades in
   * - False if it starts opaque and fades out
   * @param transitionTime The duration of the transition.
   * @param delayTime The time delay before the transition occurs.
   * @param lingerTime The time delay after the transition occurs.
   * @returns A promise which resolves after the transition is over.
   */
  private async screenTransition(type: boolean, transitionTime: number, delayTime?: number, lingerTime?: number): Promise<void> {
    const div: HTMLDivElement = document.createElement("div");
    div.style.opacity = type ? "0" : "1"; // Set initial opacity
    div.style.transitionDuration = `${transitionTime}s`; // Set transition time
    div.classList.add("full-screen", "screen-transition");

    if (!type) div.style.pointerEvents = "all"; // Cover pointer events if initially opaque

    document.body.appendChild(div);

    void div.offsetHeight; // Force rendering

    if (delayTime !== undefined) await this.msDelay(delayTime);

    div.style.opacity = type ? "1" : "0";
    div.style.pointerEvents = "none"; // Allow pointer events to pass through during transition

    return new Promise(async (resolve) => {
      await this.msDelay(transitionTime); // Wait for the transition

      if (type) div.style.pointerEvents = "all"; // Cover pointer events if now opaque

      if (lingerTime !== undefined) await this.msDelay(lingerTime); // Wait for linger time to pass

      resolve();
      div.remove();
    });
  }

  /**
   * Handles the loading screen while awaiting a loading promise.
   * @param loadPromise The loading promise.
   */
  public async handleLoadingScreen(loadPromise: Promise<void[]>): Promise<void> {
    const content: DocumentFragment = this.LOAD_TEMPLATE.content.cloneNode(true) as DocumentFragment;
    const screen: HTMLDivElement = content.querySelector("#loading-screen") as HTMLDivElement;
    const text: HTMLSpanElement = screen.querySelector("#loading-text") as HTMLSpanElement;

    document.body.appendChild(screen);

    let count: number = 0;

    const handleLoadLoop: () => void = () => {
      text.innerText = "Loading" + ".".repeat(count);

      count = (count + 1) % 4;
    }

    const interval: number = setInterval(handleLoadLoop, 200);
    handleLoadLoop();

    await loadPromise;

    clearInterval(interval);

    text.innerText = "Click anywhere to begin.";

    await this.awaitUserClick();
    await this.screenTransition(true, 0.5);

    screen.remove();
  }

  /**
   * Prompts the menu screen.
   * @returns A promise which resolves once the user clicks the play button.
   */
  public async menuPrompt(): Promise<void> {
    const menuContent: DocumentFragment = this.MENU_TEMPLATE.content.cloneNode(true) as DocumentFragment;
    const menu: HTMLDivElement = menuContent.querySelector("#main-menu") as HTMLDivElement;
    const button: HTMLButtonElement = menu.querySelector("#play-button") as HTMLButtonElement;

    document.body.appendChild(menu);

    const menuAudio: AudioEmission = Game.instance.audioManager.get("menu").emit(true); // Play menu audio

    this.screenTransition(false, 1);

    return new Promise((resolve) => {
      button.addEventListener("click", async () => {
        button.classList.add("clicked");

        menuAudio.stop(); // Stop menu audio
        Game.instance.audioManager.get("click").emit(true); // Play click audio

        await this.screenTransition(true, 1); // Fade to black
  
        resolve();
        menu.remove();

        this.GAME_INFO.classList.remove("hidden"); // Show game info
        this.screenTransition(false, 1); // Fade out of black
  
      }, {once: true});
    });
  }

  /** Update all bar displays based on current game state. */
  public updateGameInfo(): void {
    const player: Player = Game.instance.player;
    const monster: Monster = Game.instance.monster;

    const staminaBar: HTMLProgressElement = this.GAME_INFO.querySelector("#stamina-bar")!.querySelector("progress")!;
    const scanRangeBar: HTMLProgressElement = this.GAME_INFO.querySelector("#scan-range-bar")!.querySelector("progress")!;
    const fearBar: HTMLProgressElement = this.GAME_INFO.querySelector("#fear-bar")!.querySelector("progress")!;

    staminaBar.value = player.stamina;
    staminaBar.max = player.MAX_STAMINA;

    scanRangeBar.value = (player.scanAngle - player.MIN_SCAN_ANGLE) / (player.MAX_SCAN_ANGLE - player.MIN_SCAN_ANGLE);
    scanRangeBar.max = 1;

    fearBar.value = monster.aggression;
    fearBar.max = monster.MAX_AGGRESSION;
  }

  /**
   * Prompts the game end screen.
   * @returns A promise which resolves once the user clicks the replay button.
   */
  public async endScreenPrompt(): Promise<void> {
    const endContent: DocumentFragment = this.END_TEMPLATE.content.cloneNode(true) as DocumentFragment;
    const endScreen: HTMLDivElement = endContent.querySelector("#end-screen") as HTMLDivElement;
    const button: HTMLButtonElement = endScreen.querySelector("#replay-button") as HTMLButtonElement;

    document.body.appendChild(endScreen);

    this.GAME_INFO.classList.add("hidden"); // Hide the game info UI

    const staticAudio: AudioEmission = Game.instance.audioManager.get("static").emit(true); // Play the static audio

    await this.screenTransition(false, 1, 2); // Start black and fade in

    return new Promise((resolve) => {
      button.addEventListener("click", async () => {
        button.classList.add("clicked");

        staticAudio.stop(); // Stop static
        Game.instance.audioManager.get("click").emit(true); // Play click sound

        await this.screenTransition(true, 1); // Fade to black

        resolve();
        endScreen.remove();
  
      }, {once: true});
    });
  }
}
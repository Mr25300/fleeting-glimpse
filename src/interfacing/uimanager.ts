import { AudioEmission } from "../audio/audiomanager.js";
import { Monster } from "../entity/monster.js";
import { Player } from "../entity/player.js";
import { Game } from "../core/game.js";

export class UIManager {
  private readonly LOAD_TEMPLATE: HTMLTemplateElement = document.getElementById("loading-screen-template") as HTMLTemplateElement;
  private readonly MENU_TEMPLATE: HTMLTemplateElement = document.getElementById("main-menu-template") as HTMLTemplateElement;
  private readonly END_TEMPLATE: HTMLTemplateElement = document.getElementById("end-screen-template") as HTMLTemplateElement;
  private readonly GAME_INFO: HTMLDivElement = document.getElementById("game-info") as HTMLDivElement;

  private async awaitUserInteract(): Promise<void> {
    const promise = new Promise<void>((resolve) => {
      document.addEventListener("click", () => {
        resolve();

      }, { once: true });
    });

    return promise;
  }

  private async msDelay(time: number): Promise<void> {
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve();

      }, time * 1000);
    });
  }

  private async screenTransition(type: boolean, transitionTime: number, delayTime: number = 0): Promise<void> {
    const div: HTMLDivElement = document.createElement("div");
    div.style.opacity = type ? "0" : "1";
    div.classList.add("full-screen", "screen-transition");

    document.body.appendChild(div);

    void div.offsetHeight;

    div.style.transitionDuration = `${transitionTime}s`;
    if (!type) div.classList.add("covering");

    if (delayTime > 0) await this.msDelay(delayTime);

    div.style.opacity = type ? "1" : "0";
    if (!type) div.classList.remove("covering");

    return new Promise(async (resolve) => {
      await this.msDelay(transitionTime);

      resolve();
      div.remove();
    });
  }

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

    await this.awaitUserInteract();
    await this.screenTransition(true, 0.5);

    screen.remove();
  }

  public async menuPrompt(): Promise<void> {
    const menuContent: DocumentFragment = this.MENU_TEMPLATE.content.cloneNode(true) as DocumentFragment;
    const menu: HTMLDivElement = menuContent.querySelector("#main-menu") as HTMLDivElement;
    const button: HTMLButtonElement = menu.querySelector("#play-button") as HTMLButtonElement;

    document.body.appendChild(menu);

    const menuAudio: AudioEmission = Game.instance.audioManager.get("menu").emit(true);

    this.screenTransition(false, 1);

    return new Promise((resolve) => {
      button.addEventListener("click", async () => {
        Game.instance.controller.lockMouse();

        button.classList.add("clicked");

        menuAudio.stop();
        Game.instance.audioManager.get("click").emit(true);

        await this.screenTransition(true, 1);
  
        resolve();
        menu.remove();

        this.GAME_INFO.classList.remove("hidden");
        this.screenTransition(false, 1);
  
      }, {once: true});
    });
  }

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

  public async endScreenPrompt(): Promise<void> {
    const endContent: DocumentFragment = this.END_TEMPLATE.content.cloneNode(true) as DocumentFragment;
    const endScreen: HTMLDivElement = endContent.querySelector("#end-screen") as HTMLDivElement;
    const button: HTMLButtonElement = endScreen.querySelector("#replay-button") as HTMLButtonElement;

    document.body.appendChild(endScreen);

    this.GAME_INFO.classList.add("hidden");

    const staticAudio: AudioEmission = Game.instance.audioManager.get("static").emit(true);

    await this.screenTransition(false, 1, 2);

    return new Promise((resolve) => {
      button.addEventListener("click", async () => {
        button.classList.add("clicked");

        staticAudio.stop();
        Game.instance.audioManager.get("click").emit(true);

        await this.screenTransition(true, 1);

        resolve();
        endScreen.remove();
  
      }, {once: true});
    });
  }
}
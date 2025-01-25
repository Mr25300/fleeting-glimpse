import { AudioEmission } from "./audiomanager.js";
import { Game } from "./game.js";

export class UIManager {
  private MENU_TEMPLATE: HTMLTemplateElement = document.getElementById("main-menu-template") as HTMLTemplateElement;

  public async awaitUserInteract(): Promise<void> {
    const promise = new Promise<void>((resolve) => {
      document.addEventListener("click", () => {
        resolve();

      }, { once: true });
    });

    return promise;
  }

  private buttonPress(): void {
    Game.instance.audioManager.get("click").emit(true);
  }

  public promptMenu(): void {
    const menuContent: DocumentFragment = this.MENU_TEMPLATE.content.cloneNode(true) as DocumentFragment;
    const menu: HTMLDivElement = menuContent.querySelector("#main-menu") as HTMLDivElement;
    const button: HTMLButtonElement = menu.querySelector("#play-button") as HTMLButtonElement;
    const image: HTMLImageElement = menu.querySelector(".title-img") as HTMLImageElement;

    document.body.appendChild(menu);

    const menuAudio: AudioEmission = Game.instance.audioManager.get("menu").emit(true);

    button.addEventListener("click", () => {
      menuAudio.stop();

      button.classList.add("clicked");
      image.classList.add("hide");

      this.buttonPress();

      setTimeout(() => {
        Game.instance.start();

        menu.remove();

      }, 1000);

    }, {once: true});
  }
}
import { BVH } from "./collisions/bvh.js";
import { Camera } from "./camera.js";
import { Canvas } from "./canvas.js";
import { Controller } from "./controller.js";
import { GameModel, MeshLoader, RenderModel } from "./mesh.js";
import { Player } from "./entity/player.js";
import { AudioEmission, AudioManager } from "./audiomanager.js";
import { Vector3 } from "./vector3.js";
import { GameEvent } from "./gameevent.js";
import { UIManager } from "./uimanager.js";
import { Monster } from "./entity/monster.js";

/** Handle game loop */
export abstract class Gameloop {
  private _running: boolean = false;
  private lastTime?: number;
  private _elapsedTime: number = 0;
  private _fps: number;

  protected startLoop(): void {
    this._running = true;

    requestAnimationFrame((timestamp: number) => {
      this.loop(timestamp);
    });
  }

  /**
   * Handles the gameloop frame.
   * @param timestamp The animation frame timestamp in milliseconds.
   */
  private loop(timestamp: number): void {
    if (!this._running) return;

    // Calcualte the change in time from the current and last timestamp
    const deltaTime: number = this.lastTime !== undefined ? (timestamp - this.lastTime) / 1000 : 0;
    this.lastTime = timestamp;

    this._elapsedTime += deltaTime;
    this._fps = 1 / deltaTime;

    // Call update and render functions
    this.update(deltaTime);

    requestAnimationFrame((timestamp: number) => {
      this.loop(timestamp);
    });
  }

  public get running(): boolean {
    return this._running;
  }

  public get elapsedTime(): number {
    return this._elapsedTime;
  }

  public get fps(): number {
    return this._fps;
  }

  protected stopLoop(): void {
    this._running = false;
    
    delete this.lastTime;
    this._elapsedTime = 0;
  }

  protected abstract update(deltaTime: number): void;
}

export class Game extends Gameloop {
  private static _instance: Game;

  public readonly firstStep: GameEvent = new GameEvent();
  public readonly lastStep: GameEvent = new GameEvent();

  public readonly canvas: Canvas = new Canvas();
  public readonly camera: Camera = new Camera();
  public readonly meshLoader: MeshLoader = new MeshLoader();
  public readonly audioManager: AudioManager = new AudioManager();
  public readonly uiManager: UIManager = new UIManager();
  public readonly controller: Controller = new Controller();
  public readonly bvh: BVH = new BVH();

  private _player: Player;
  private _monster: Monster;
  
  private monsterModel: RenderModel;
  private ambienceSound: AudioEmission;

  private ended: boolean = false;

  public static get instance(): Game {
    if (!Game._instance) Game._instance = new Game();

    return Game._instance;
  }

  public get player(): Player {
    return this._player;
  }

  public get monster(): Monster {
    return this._monster;
  }

  public async init(): Promise<void> {
    const canvasMeshPromise: Promise<void> = this.canvas.init().then(() => {
      this.meshLoader.init();
    });

    const loadPromise: Promise<void[]> = Promise.all([
      canvasMeshPromise,
      this.audioManager.init(),
    ]);

    await this.uiManager.handleLoadingScreen(loadPromise);

    this.audioManager.start();

    const mapRender: RenderModel = this.meshLoader.createRenderModel("map");
    const mapModel: GameModel = this.meshLoader.createGameModel("map");

    this.monsterModel = this.meshLoader.createRenderModel("monster");

    this.bvh.init([mapModel]);

    this.canvas.registerModel(mapRender);
    this.canvas.registerModel(this.monsterModel);

    this.start();
  }

  public async start(): Promise<void> {
    await this.uiManager.menuPrompt();

    this.ended = false;
    this.canvas.endScreenActive = false;

    this._player = new Player();
    this._monster = new Monster(this.monsterModel, this._player);

    this.camera.subject = this._player;
    this.camera.subjectOffset = new Vector3(0, 1.5, 0);

    this.ambienceSound = this.audioManager.get("ambience").emit(true);

    this.startLoop();
  }

  protected update(deltaTime: number): void {
    if (!this.ended) {
      this.firstStep.fire(deltaTime);

      const [xMovement, yMovement]: [number, number] = this.controller.aimMovement;
      this.camera.rotate(xMovement, yMovement);
  
      this._player.prePhysicsBehaviour(deltaTime);
      this._monster.prePhysicsBehaviour();
  
      this._player.updatePhysics(deltaTime);
      this._monster.updatePhysics(deltaTime);
  
      this.camera.update(deltaTime);
  
      this._player.postPhysicsBehaviour();
      this._monster.postPhysicsBehaviour(deltaTime);
  
      this.lastStep.fire(deltaTime);

      this.uiManager.updateGameInfo();
    }

    this.canvas.render();
  }

  public async end(): Promise<void> {
    this.ended = true;
    this.canvas.endScreenActive = true;
    this.canvas.reset();
    this.camera.reset();

    this._player.destroy();
    this._monster.destroy();

    this.controller.unlockMouse();

    if (this.ambienceSound) this.ambienceSound.stop();

    await this.uiManager.endScreenPrompt();

    this.stopLoop();
    this.start();
  }
}

class Driver {
  constructor() {
    const game: Game = Game.instance;
    game.init();
  }
}

new Driver();
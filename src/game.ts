import { BVH, RaycastInfo } from "./bvh.js";
import { Camera } from "./camera.js";
import { Canvas } from "./canvas.js";
import { Bounds, Capsule, Ray, Triangle } from "./collisions.js";
import { Control, Controller } from "./controller.js";
import { Entity } from "./entity.js";
import { Matrix4 } from "./matrix4.js";
import { GameMesh, GameModel, MeshLoader, RenderMesh, RenderModel } from "./mesh.js";
import { Player } from "./player.js";
import { AudioEmission, AudioManager } from "./audiomanager.js";
import { Vector3 } from "./vector3.js";
import { GameEvent } from "./gameevent.js";
import { UIManager } from "./uimanager.js";
import { Monster } from "./monster.js";

/** Handle game loop */
export abstract class Gameloop {
  private _running: boolean = false;
  private lastTime: number;
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
    this.render();

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
  }

  protected abstract update(deltaTime: number): void;
  protected abstract render(): void;
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
  
  private monsterModel: RenderModel;
  private ambienceSound: AudioEmission;
  private entities: Set<Entity> = new Set();

  public static get instance(): Game {
    if (!Game._instance) Game._instance = new Game();

    return Game._instance;
  }

  public async init(): Promise<void> {
    const canvasPromise: Promise<void> = this.canvas.init();
    const interactPromise: Promise<void> = this.uiManager.awaitUserInteract();

    canvasPromise.then(() => {
      this.meshLoader.init();
    });

    interactPromise.then(() => {
      this.audioManager.start();
    });

    await Promise.all([
      canvasPromise,
      this.audioManager.init(),
    ]);

    const mapRender: RenderModel = this.meshLoader.createRenderModel("map");
    const mapModel: GameModel = this.meshLoader.createGameModel("map");

    this.monsterModel = this.meshLoader.createRenderModel("monster");

    this.bvh.init([mapModel]);

    this.canvas.registerModel(mapRender);
    this.canvas.registerModel(this.monsterModel);

    await interactPromise;

    this.uiManager.promptMenu();
  }

  public start(): void {
    const player: Player = new Player();
    const monster: Monster = new Monster(this.monsterModel, player);
    
    this.entities.add(player);
    this.entities.add(monster);

    this.camera.subject = player;
    this.camera.subjectOffset = new Vector3(0, 1.5, 0);

    this.ambienceSound = this.audioManager.get("ambience").emit(true);

    this.controller.lockMouse();

    this.startLoop();
  }

  protected update(deltaTime: number): void {
    this.firstStep.fire(deltaTime);

    const [xMovement, yMovement]: [number, number] = this.controller.aimMovement;
    this.camera.rotate(-xMovement / 200, yMovement / 200);

    for (const entity of this.entities) {
      entity.prePhysicsBehaviour(deltaTime);
    }

    for (const entity of this.entities) {
      entity.updatePhysics(deltaTime);
    }

    this.camera.update(deltaTime);

    for (const entity of this.entities) {
      entity.postPhysicsBehaviour(deltaTime);
    }

    this.lastStep.fire(deltaTime);
  }

  public end(): void {
    this.controller.unlockMouse();

    this.ambienceSound.stop();

    this.stopLoop();
  }

  protected render(): void {
    this.canvas.render();
  }
}

class Driver {
  constructor() {
    const game: Game = Game.instance;
    game.init();
  }
}

new Driver();
import { BVH } from "../collisions/bvh.js";
import { Camera } from "../rendering/camera.js";
import { Canvas } from "../rendering/canvas.js";
import { Controller } from "../interfacing/controller.js";
import { GameModel, MeshLoader, RenderModel } from "../mesh/mesh.js";
import { Player } from "../entity/player.js";
import { AudioEmission, AudioManager } from "../audio/audiomanager.js";
import { Vector3 } from "../math/vector3.js";
import { GameEvent } from "../util/gameevent.js";
import { UIManager } from "../interfacing/uimanager.js";
import { Monster } from "../entity/monster.js";
import { Gameloop } from "./gameloop.js";

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
    // Load canvas and then the meshes
    const canvasMeshPromise: Promise<void> = this.canvas.init().then(() => {
      this.meshLoader.init();
    });

    // Load canvas, meshes and audio
    const loadPromise: Promise<void[]> = Promise.all([
      canvasMeshPromise,
      this.audioManager.init(),
    ]);

    await this.uiManager.handleLoadingScreen(loadPromise); // Do loading screen animation and await user input

    const mapRender: RenderModel = this.meshLoader.createRenderModel("map"); // Create map render model
    const mapModel: GameModel = this.meshLoader.createGameModel("map"); // Create map game model

    this.monsterModel = this.meshLoader.createRenderModel("monster"); // Create monster render model

    this.bvh.init([mapModel]); // Initialize bounding volume hierarchy with map triangles

    // Register render models to the canvas for rendering
    this.canvas.registerModel(mapRender);
    this.canvas.registerModel(this.monsterModel);

    this.start();
  }

  public async start(): Promise<void> {
    await this.uiManager.menuPrompt(); // Prompt menu and wait for user to press play

    // Set ended state properties to false
    this.ended = false;
    this.canvas.endScreenActive = false;

    // Create entities
    this._player = new Player();
    this._monster = new Monster(this.monsterModel, this._player);

    // Set camera subject and offset
    this.camera.subject = this._player;
    this.camera.subjectOffset = new Vector3(0, 1.5, 0);

    this.controller.lockMouse(); // Lock the mouse

    this.ambienceSound = this.audioManager.get("ambience").emit(true); // Play ambience sound

    this.startLoop();
  }

  protected update(deltaTime: number): void {
    if (!this.ended) { // Skip if the game has ended
      this.firstStep.fire(deltaTime); // Fire first step event for timer delays

      this.camera.prePhysicsUpdate(); // Update camera rotation

      // Handle player and monster aim/move direction setting and player stamina bar
      this._player.prePhysicsBehaviour(deltaTime);
      this._monster.prePhysicsBehaviour();

      // Handle movement and collisions
      this._player.updatePhysics(deltaTime);
      this._monster.updatePhysics(deltaTime);

      // Set new camera position and transition fov
      this.camera.postPhysicsUpdate(deltaTime);

      // Handle player scanning and monster aggression/chasing
      this._player.postPhysicsBehaviour();
      this._monster.postPhysicsBehaviour(deltaTime);
  
      this.lastStep.fire(deltaTime); // Fire last step event for audio

      this.uiManager.updateGameInfo(); // Display the new game info
    }

    this.canvas.render();
  }

  public async end(): Promise<void> {
    // Set ended state properties to true and reset canvas and camera
    this.ended = true;
    this.canvas.endScreenActive = true;
    this.canvas.reset();
    this.camera.reset();

    // Destroy entities
    this._player.destroy();
    this._monster.destroy();

    this.controller.unlockMouse(); // Unlock mouse

    if (this.ambienceSound) this.ambienceSound.stop();

    await this.uiManager.endScreenPrompt(); // Prompt end screen and await replay

    this.stopLoop(); // Stop game loop
    this.start(); // Start game and menu
  }
}

class Driver {
  constructor() {
    const game: Game = Game.instance;
    game.init();
  }
}

new Driver();
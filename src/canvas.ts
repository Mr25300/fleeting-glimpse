import { Entity } from "./entity/entity.js";
import { Game } from "./game.js";
import { Matrix4 } from "./matrix4.js";
import { RenderMesh, RenderModel } from "./mesh.js";
import { ShaderProgram } from "./shaderprogram.js";
import { Vector3 } from "./vector3.js";

interface Dot {
  position: Vector3;
  normal: Vector3;
}

/** Encapsulates the game"s screen and all relevant functionality. */
export class Canvas {
  private readonly DOT_RESOLUTION: number = 7;
  private readonly MAX_DOT_COUNT: number = 1000000;

  private element: HTMLCanvasElement;
  private gl: WebGL2RenderingContext;

  private dotShader: ShaderProgram;
  private shapeShader: ShaderProgram;
  private endScreenShader: ShaderProgram;

  private currentDot: number = 0;
  private dotCount: number = 0;
  private dotVertexBuffer: WebGLBuffer;
  private dotBuffer: WebGLBuffer

  private dotQueue: Dot[] = [];

  private screenRectBuffer: WebGLBuffer;

  private height: number;
  private width: number;
  private aspectRatio: number;

  private renderModels: Map<RenderMesh, Set<RenderModel>> = new Map();

  private _endScreenActive: boolean = false;

  constructor() {
    this.element = document.getElementById("game-screen") as HTMLCanvasElement;

    // Get gl2 or gl context
    this.gl = this.element.getContext("webgl2") as WebGL2RenderingContext;
    if (!this.gl) throw new Error("Failed to get GL context.");

    // Create the shader program
    this.dotShader = new ShaderProgram(this.gl);
    this.shapeShader = new ShaderProgram(this.gl);
    this.endScreenShader = new ShaderProgram(this.gl);

    // Set webgl settings
    this.gl.enable(this.gl.DEPTH_TEST);
    // this.gl.enable(this.gl.BLEND);
    // this.gl.blendFunc(this.gl.SRC_ALPHA, this.gl.ONE_MINUS_SRC_ALPHA);

    this.updateDimensions();

    // Listen to canvas resizing to update dimensions
    new ResizeObserver(() => {
      this.updateDimensions();

    }).observe(this.element);
  }

  public set endScreenActive(active: boolean) {
    this._endScreenActive = active;
  }

  public async init(): Promise<void> {
    this.initBuffers();

    // Wait for shader to load the vertex and fragment shaders
    await Promise.all([
      this.shapeShader.initShaders("res/shaders/shapeVertex.glsl", "res/shaders/shapeFragment.glsl"),
      this.dotShader.initShaders("res/shaders/dotVertex.glsl", "res/shaders/dotFragment.glsl"),
      this.endScreenShader.initShaders("res/shaders/staticVertex.glsl", "res/shaders/staticFragment.glsl")
    ]);

    this.shapeShader.use();
    this.shapeShader.createAttrib("vertexPos");
    this.shapeShader.createUniform("meshTransform");
    this.shapeShader.createUniform("viewMatrix");
    this.shapeShader.createUniform("projectionMatrix");

    this.dotShader.use();
    this.dotShader.createAttrib("vertexPos");
    this.dotShader.createAttrib("dotPos");
    this.dotShader.createAttrib("dotNormal");
    this.dotShader.createAttrib("dotTime");
    this.dotShader.createUniform("viewMatrix");
    this.dotShader.createUniform("projectionMatrix");
    this.dotShader.createUniform("lightSource");
    this.dotShader.createUniform("time");

    this.endScreenShader.use();
    this.endScreenShader.createAttrib("vertexPos");
    this.endScreenShader.createUniform("time");

    this.endScreenShader.setAttribBuffer("vertexPos", this.screenRectBuffer, 2, 0, 0);
  }

  /**
   * Creates a webgl buffer with relevant data.
   * @param data The `Float32Array` buffer data.
   * @returns A webgl buffer.
   */
  public createBuffer(data: Float32Array | Uint16Array, index?: boolean): WebGLBuffer {
    const buffer: WebGLBuffer | null = this.gl.createBuffer();
    if (!buffer) throw new Error("Failed to create buffer.");

    const type: number = index ? this.gl.ELEMENT_ARRAY_BUFFER : this.gl.ARRAY_BUFFER;

    this.gl.bindBuffer(type, buffer); // ELEMENT_ARRAY_BUFFER for index buffer
    this.gl.bufferData(type, data, this.gl.STATIC_DRAW);

    return buffer;
  }

  public modifyBuffer(buffer: WebGLBuffer, data: Float32Array | Uint16Array, offset: number, index?: boolean): void {
    const type: number = index ? this.gl.ELEMENT_ARRAY_BUFFER : this.gl.ARRAY_BUFFER;

    this.gl.bindBuffer(type, buffer);
    this.gl.bufferSubData(type, offset * (index ? Uint16Array.BYTES_PER_ELEMENT : Float32Array.BYTES_PER_ELEMENT), data);
  }

  public clearBuffer(buffer: WebGLBuffer, size: number, index?: boolean): void {
    const type: number = index ? this.gl.ELEMENT_ARRAY_BUFFER : this.gl.ARRAY_BUFFER;

    this.gl.bindBuffer(type, buffer);
    this.gl.bufferData(type, index ? new Uint16Array(size) : new Float32Array(size), this.gl.STATIC_DRAW);
  }

  /**
   * Deletes an existing webgl buffer.
   * @param buffer The buffer to be deleted.
   */
  public deleteBuffer(buffer: WebGLBuffer): void {
    this.gl.deleteBuffer(buffer);
  }

  /** Creates the universal vertex buffer to be used by all sprites, being a square with width and height 1. */
  private initBuffers(): void {
    const dotVertexArray: Float32Array = new Float32Array(this.DOT_RESOLUTION * 3);

    for (let i = 0; i < this.DOT_RESOLUTION; i++) {
      const t: number = 2 * Math.PI * i / this.DOT_RESOLUTION;

      dotVertexArray[i * 3] = Math.sin(t) * 0.5;
      dotVertexArray[i * 3 + 1] = 0;
      dotVertexArray[i * 3 + 2] = Math.cos(t) * 0.5;
    }

    this.dotVertexBuffer = this.createBuffer(dotVertexArray);
    this.dotBuffer = this.createBuffer(new Float32Array(this.MAX_DOT_COUNT * (3 + 3 + 1))); // 3 for position, normal and 1 for time

    this.screenRectBuffer = this.createBuffer(new Float32Array([
      -1, -1,
      1, -1,
      -1, 1,
      1, 1
    ]));
  }

  public createDot(position: Vector3, normal: Vector3): void {
    this.dotQueue.push({ position, normal });
  }

  /** Updates the canvas dimensions and webgl viewport based on its element"s properties. */
  private updateDimensions(): void {
    this.width = this.element.clientWidth;
    this.height = this.element.clientHeight;

    this.element.width = this.width;
    this.element.height = this.height;
    this.aspectRatio = this.width / this.height;

    this.gl.viewport(0, 0, this.width, this.height);
  }

  public registerModel(model: RenderModel): void {
    const models: Set<RenderModel> = this.renderModels.get(model.mesh) || new Set();
    if (models.size === 0) this.renderModels.set(model.mesh, models);

    models.add(model);
  }

  public unregisterModel(model: RenderModel): void {
    const models: Set<RenderModel> | undefined = this.renderModels.get(model.mesh);
    if (!models) return;

    models.delete(model);

    if (models.size === 0) this.renderModels.delete(model.mesh);
  }

  private renderGame(): void {
    const viewMatrix: Matrix4 = Game.instance.camera.getViewMatrix();
    const projectionMatrix: Matrix4 = Game.instance.camera.getProjectionMatrix(this.aspectRatio);

    this.shapeShader.use();

    this.shapeShader.setUniformMatrix("viewMatrix", viewMatrix);
    this.shapeShader.setUniformMatrix("projectionMatrix", projectionMatrix);

    this.renderModels.forEach((models: Set<RenderModel>, mesh: RenderMesh) => {
      this.shapeShader.setAttribBuffer("vertexPos", mesh.vertexBuffer, 3, 0, 0);
      this.gl.bindBuffer(this.gl.ELEMENT_ARRAY_BUFFER, mesh.indexBuffer);

      for (const model of models) {
        this.shapeShader.setUniformMatrix("meshTransform", model.transformation);

        this.gl.drawElements(this.gl.TRIANGLES, mesh.indexCount, this.gl.UNSIGNED_SHORT, 0);
      }
    });

    if (this.dotQueue.length > 0) {
      const dotData: Float32Array = new Float32Array(this.dotQueue.length * (3 + 3 + 1));

      for (let i = 0; i < this.dotQueue.length; i++) {
        if (i >= this.MAX_DOT_COUNT) break;

        const dot: Dot = this.dotQueue[i];

        dotData[i * 7] = dot.position.x;
        dotData[i * 7 + 1] = dot.position.y;
        dotData[i * 7 + 2] = dot.position.z;

        dotData[i * 7 + 3] = dot.normal.x;
        dotData[i * 7 + 4] = dot.normal.y;
        dotData[i * 7 + 5] = dot.normal.z;

        dotData[i * 7 + 6] = Game.instance.elapsedTime;
      }

      if (this.currentDot + this.dotQueue.length > this.MAX_DOT_COUNT) this.currentDot = 0;

      this.modifyBuffer(this.dotBuffer, dotData, this.currentDot * (3 + 3 + 1));

      this.currentDot += this.dotQueue.length;
      this.dotCount = Math.min(this.dotCount + this.dotQueue.length, this.MAX_DOT_COUNT);
      this.dotQueue.length = 0;
    }

    this.dotShader.use();

    this.dotShader.setUniformMatrix("viewMatrix", viewMatrix);
    this.dotShader.setUniformMatrix("projectionMatrix", projectionMatrix);
    this.dotShader.setUniformFloat("time", Game.instance.elapsedTime);
    this.dotShader.setUniformVector("lightSource", Game.instance.camera.position);

    this.dotShader.setAttribBuffer("vertexPos", this.dotVertexBuffer, 3, 0, 0);
    this.dotShader.setAttribBuffer("dotPos", this.dotBuffer, 3, 7, 0, 1);
    this.dotShader.setAttribBuffer("dotNormal", this.dotBuffer, 3, 7, 3, 1);
    this.dotShader.setAttribBuffer("dotTime", this.dotBuffer, 1, 7, 6, 1);

    this.gl.drawArraysInstanced(this.gl.TRIANGLE_FAN, 0, this.DOT_RESOLUTION, this.dotCount);
  }

  private renderEndScreen(): void {
    this.endScreenShader.use();
    this.endScreenShader.setAttribBuffer("vertexPos", this.screenRectBuffer, 2, 0, 0);
    this.endScreenShader.setUniformFloat("time", Game.instance.elapsedTime);

    this.gl.drawArrays(this.gl.TRIANGLE_STRIP, 0, 4);
  }

  /** Draw all sprite models and collision objects to the canvas. */
  public render(): void {
    // Clear screen
    this.gl.clearColor(0, 0, 0, 1);
    this.gl.clear(this.gl.COLOR_BUFFER_BIT | this.gl.DEPTH_BUFFER_BIT | this.gl.STENCIL_BUFFER_BIT);

    if (this._endScreenActive) this.renderEndScreen();
    else this.renderGame();
  }

  public reset(): void {
    this.clearBuffer(this.dotBuffer, this.MAX_DOT_COUNT);

    this.currentDot = 0;
    this.dotCount = 0;
  }
}
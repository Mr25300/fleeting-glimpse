import { Game } from "../core/game.js";
import { Matrix4 } from "../math/matrix4.js";
import { RenderMesh, RenderModel } from "../mesh/mesh.js";
import { ShaderProgram } from "./shaderprogram.js";
import { Vector3 } from "../math/vector3.js";

interface Dot {
  position: Vector3;
  normal: Vector3;
}

/** Encapsulates the game"s screen and all relevant functionality. */
export class Canvas {
  private readonly DOT_RESOLUTION: number = 9;
  private readonly MAX_DOT_COUNT: number = 200000;
  private readonly DOT_FIELD_COUNT: number = 3 + 3 + 1; // (3 for position, 3 for normal, 1 for creation time)

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

    // Get gl2 context
    this.gl = this.element.getContext("webgl2") as WebGL2RenderingContext;
    if (!this.gl) throw new Error("Failed to get GL context.");

    // Create the shader program
    this.dotShader = new ShaderProgram(this.gl);
    this.shapeShader = new ShaderProgram(this.gl);
    this.endScreenShader = new ShaderProgram(this.gl);

    // Set webgl settings
    this.gl.enable(this.gl.DEPTH_TEST);

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

    // Wait for shader to load their vertex and fragment shaders
    await Promise.all([
      this.shapeShader.initShaders("res/shaders/shapeVertex.glsl", "res/shaders/shapeFragment.glsl"),
      this.dotShader.initShaders("res/shaders/dotVertex.glsl", "res/shaders/dotFragment.glsl"),
      this.endScreenShader.initShaders("res/shaders/staticVertex.glsl", "res/shaders/staticFragment.glsl")
    ]);

    // Create shape shader attribute and uniforms
    this.shapeShader.use();
    this.shapeShader.createAttrib("vertexPos");
    this.shapeShader.createUniform("meshTransform");
    this.shapeShader.createUniform("viewMatrix");
    this.shapeShader.createUniform("projectionMatrix");

    // Create dot shader attributes and uniforms
    this.dotShader.use();
    this.dotShader.createAttrib("vertexPos");
    this.dotShader.createAttrib("dotPos");
    this.dotShader.createAttrib("dotNormal");
    this.dotShader.createAttrib("dotTime");
    this.dotShader.createUniform("viewMatrix");
    this.dotShader.createUniform("projectionMatrix");
    this.dotShader.createUniform("lightSource");
    this.dotShader.createUniform("time");

    // Create end screen attribute and uniform
    this.endScreenShader.use();
    this.endScreenShader.createAttrib("vertexPos");
    this.endScreenShader.createUniform("time");
  }

  /**
   * Creates a webgl buffer with relevant data.
   * @param data The typed array buffer data.
   * @param index Whether or not the buffer is an element array buffer or a regular array buffer.
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

  /**
   * Modifies an existing buffer with new data.
   * @param buffer The existing buffer.
   * @param data The new data.
   * @param offset The data offset.
   * @param index Whether or not the buffer is an element array buffer or a regular array buffer.
   */
  public modifyBuffer(buffer: WebGLBuffer, data: Float32Array | Uint16Array, offset: number, index?: boolean): void {
    const type: number = index ? this.gl.ELEMENT_ARRAY_BUFFER : this.gl.ARRAY_BUFFER;

    this.gl.bindBuffer(type, buffer);
    this.gl.bufferSubData(type, offset * (index ? Uint16Array.BYTES_PER_ELEMENT : Float32Array.BYTES_PER_ELEMENT), data);
  }

  /**
   * Clears all the data from an existing buffer.
   * @param buffer The existing buffer.
   * @param size The buffer's size.
   * @param index Whether or not the buffer is an element array buffer or a regular array buffer.
   */
  public clearBuffer(buffer: WebGLBuffer, size: number, index?: boolean): void {
    const type: number = index ? this.gl.ELEMENT_ARRAY_BUFFER : this.gl.ARRAY_BUFFER;

    this.gl.bindBuffer(type, buffer);
    this.gl.bufferData(type, index ? new Uint16Array(size) : new Float32Array(size), this.gl.STATIC_DRAW);
  }

  /**
   * Deletes an existing webgl buffer.
   * @param buffer The buffer being deleted.
   */
  public deleteBuffer(buffer: WebGLBuffer): void {
    this.gl.deleteBuffer(buffer);
  }

  /** Initializes all buffers. */
  private initBuffers(): void {
    const dotVertexArray: Float32Array = new Float32Array(this.DOT_RESOLUTION * 3);

    // Create a circle with the resolution constant
    for (let i = 0; i < this.DOT_RESOLUTION; i++) {
      const t: number = 2 * Math.PI * i / this.DOT_RESOLUTION;

      dotVertexArray[i * 3] = Math.sin(t) * 0.5;
      dotVertexArray[i * 3 + 1] = 0;
      dotVertexArray[i * 3 + 2] = Math.cos(t) * 0.5;
    }

    this.dotVertexBuffer = this.createBuffer(dotVertexArray);
    this.dotBuffer = this.createBuffer(new Float32Array(this.MAX_DOT_COUNT * this.DOT_FIELD_COUNT));

    this.screenRectBuffer = this.createBuffer(new Float32Array([
      -1, -1,
      1, -1,
      -1, 1,
      1, 1
    ]));
  }

  /** Updates the canvas dimensions and webgl viewport based on its element's properties. */
  private updateDimensions(): void {
    this.width = this.element.clientWidth;
    this.height = this.element.clientHeight;

    this.element.width = this.width;
    this.element.height = this.height;
    this.aspectRatio = this.width / this.height;

    this.gl.viewport(0, 0, this.width, this.height);
  }

  /**
   * Queue a dot to be added to the buffer the next render call.
   * @param position The dot position.
   * @param normal The dot normal.
   */
  public createDot(position: Vector3, normal: Vector3): void {
    this.dotQueue.push({ position, normal });
  }

  /** Dequeues all dots and adds them to the dot buffer. */
  private emptyDotQueue(): void {
    const dotData: Float32Array = new Float32Array(this.dotQueue.length * this.DOT_FIELD_COUNT);
    let dotCount: number = 0;

    // Add all dots to the data array
    for (let i = 0; i < this.dotQueue.length; i++) {
      if (i >= this.MAX_DOT_COUNT) break;

      const dot: Dot = this.dotQueue[i];
      const start: number = i * this.DOT_FIELD_COUNT;

      dotData[start] = dot.position.x;
      dotData[start + 1] = dot.position.y;
      dotData[start + 2] = dot.position.z;

      dotData[start + 3] = dot.normal.x;
      dotData[start + 4] = dot.normal.y;
      dotData[start + 5] = dot.normal.z;

      dotData[start + 6] = Game.instance.elapsedTime;

      dotCount++;
    }

    if (this.currentDot + dotCount > this.MAX_DOT_COUNT) this.currentDot = 0; // Reset the current dot to zero if the dots will exceed buffer size

    this.modifyBuffer(this.dotBuffer, dotData, this.currentDot * this.DOT_FIELD_COUNT);

    this.currentDot += dotCount; // Add the dot count to the current dot
    this.dotCount = Math.min(this.dotCount + dotCount, this.MAX_DOT_COUNT); // Cap dot count at max
    this.dotQueue.length = 0; // Clear queue
  }

  /**
   * Adds a model to the rendering map.
   * @param model The model being registered.
   */
  public registerModel(model: RenderModel): void {
    const models: Set<RenderModel> = this.renderModels.get(model.mesh) || new Set();
    if (models.size === 0) this.renderModels.set(model.mesh, models);

    models.add(model);
  }

  /**
   * Removes a model from the rendering map.
   * @param model The model being removed.
   */
  public unregisterModel(model: RenderModel): void {
    const models: Set<RenderModel> | undefined = this.renderModels.get(model.mesh);
    if (!models) return;

    models.delete(model);

    if (models.size === 0) this.renderModels.delete(model.mesh);
  }

  /** Draws the game models and dots to the canvas. */
  private renderGame(): void {
    const viewMatrix: Matrix4 = Game.instance.camera.getViewMatrix();
    const projectionMatrix: Matrix4 = Game.instance.camera.getProjectionMatrix(this.aspectRatio);

    this.shapeShader.use();

    this.shapeShader.setUniformMatrix("viewMatrix", viewMatrix);
    this.shapeShader.setUniformMatrix("projectionMatrix", projectionMatrix);

    // Bind and draw all render models
    this.renderModels.forEach((models: Set<RenderModel>, mesh: RenderMesh) => {
      this.shapeShader.setAttribBuffer("vertexPos", mesh.vertexBuffer, 3); // Set the vertex pos attribute
      this.gl.bindBuffer(this.gl.ELEMENT_ARRAY_BUFFER, mesh.indexBuffer); // Bind the index buffer

      for (const model of models) {
        this.shapeShader.setUniformMatrix("meshTransform", model.transformation); // Set model transform

        this.gl.drawElements(this.gl.TRIANGLES, mesh.indexCount, this.gl.UNSIGNED_SHORT, 0);
      }
    });

    if (this.dotQueue.length > 0) this.emptyDotQueue();

    this.dotShader.use();

    this.dotShader.setUniformMatrix("viewMatrix", viewMatrix);
    this.dotShader.setUniformMatrix("projectionMatrix", projectionMatrix);
    this.dotShader.setUniformFloat("time", Game.instance.elapsedTime);
    this.dotShader.setUniformVector("lightSource", Game.instance.camera.position);

    this.dotShader.setAttribBuffer("vertexPos", this.dotVertexBuffer, 3);
    this.dotShader.setAttribBuffer("dotPos", this.dotBuffer, 3, this.DOT_FIELD_COUNT, 0, 1);
    this.dotShader.setAttribBuffer("dotNormal", this.dotBuffer, 3, this.DOT_FIELD_COUNT, 3, 1);
    this.dotShader.setAttribBuffer("dotTime", this.dotBuffer, 1, this.DOT_FIELD_COUNT, 6, 1);

    this.gl.drawArraysInstanced(this.gl.TRIANGLE_FAN, 0, this.DOT_RESOLUTION, this.dotCount);
  }

  /** Draws the end screen to the canvas. */
  private renderEndScreen(): void {
    this.endScreenShader.use();
    this.endScreenShader.setAttribBuffer("vertexPos", this.screenRectBuffer, 2);
    this.endScreenShader.setUniformFloat("time", Game.instance.elapsedTime);

    this.gl.drawArrays(this.gl.TRIANGLE_STRIP, 0, 4);
  }

  /** Draw everything to the canvas depending on the game state. */
  public render(): void {
    // Clear the screen
    this.gl.clearColor(0, 0, 0, 1);
    this.gl.clear(this.gl.COLOR_BUFFER_BIT | this.gl.DEPTH_BUFFER_BIT | this.gl.STENCIL_BUFFER_BIT);

    if (this._endScreenActive) this.renderEndScreen(); // Render the end screen if it is active
    else this.renderGame(); // Render the game otherwise
  }

  public reset(): void {
    this.clearBuffer(this.dotBuffer, this.MAX_DOT_COUNT * this.DOT_FIELD_COUNT); // Clear the dot buffer

    // Reset the dot counts
    this.currentDot = 0;
    this.dotCount = 0;
  }
}
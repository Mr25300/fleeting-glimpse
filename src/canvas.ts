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
  private readonly DOT_RESOLUTION: number = 10;

  private readonly MAX_DOT_COUNT: number = 10000000;

  private element: HTMLCanvasElement;
  private gl: WebGL2RenderingContext;

  private dotShader: ShaderProgram;
  private shapeShader: ShaderProgram;

  private currentDot: number = 0;
  private dotCount: number = 0;
  private dotVertexBuffer: WebGLBuffer;
  private dotPositionBuffer: WebGLBuffer;
  private dotNormalBuffer: WebGLBuffer;
  private dotTimeBuffer: WebGLBuffer;

  private dotQueue: Dot[] = [];

  private height: number;
  private width: number;
  private aspectRatio: number;

  constructor() {
    this.element = document.getElementById("game-screen") as HTMLCanvasElement;

    // Get gl2 or gl context
    this.gl = this.element.getContext("webgl2") as WebGL2RenderingContext;
    if (!this.gl) throw new Error("Failed to get GL context.");

    // Create the shader program
    this.dotShader = new ShaderProgram(this.gl);
    this.shapeShader = new ShaderProgram(this.gl);

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

  public async init(): Promise<void> {
    this.createDotVertexBuffer();

    // Wait for shader to load the vertex and fragment shaders
    await Promise.all([
      this.shapeShader.initShaders("res/shaders/shapeVertex.glsl", "res/shaders/shapeFragment.glsl"),
      this.dotShader.initShaders("res/shaders/dotVertex.glsl", "res/shaders/dotFragment.glsl")
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

  public modifyArrayBuffer(buffer: WebGLBuffer, data: Float32Array, offset: number): void {
    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, buffer);
    this.gl.bufferSubData(this.gl.ARRAY_BUFFER, offset * Float32Array.BYTES_PER_ELEMENT, data);
  }

  /**
   * Deletes an existing webgl buffer.
   * @param buffer The buffer to be deleted.
   */
  public deleteBuffer(buffer: WebGLBuffer): void {
    this.gl.deleteBuffer(buffer);
  }

  /**
   * Creates the universal vertex buffer to be used by all sprites, being a square with width and height 1.
   */
  private createDotVertexBuffer(): void {
    const dotVertexArray: Float32Array = new Float32Array(this.DOT_RESOLUTION * 3);

    for (let i = 0; i < this.DOT_RESOLUTION; i++) {
      const t: number = 2 * Math.PI * i / this.DOT_RESOLUTION;

      dotVertexArray[i * 3] = Math.sin(t) * 0.5;
      dotVertexArray[i * 3 + 1] = 0;
      dotVertexArray[i * 3 + 2] = Math.cos(t) * 0.5;
    }

    this.dotVertexBuffer = this.createBuffer(dotVertexArray);
    this.dotPositionBuffer = this.createBuffer(new Float32Array(this.MAX_DOT_COUNT * 3));
    this.dotNormalBuffer = this.createBuffer(new Float32Array(this.MAX_DOT_COUNT * 3));
    this.dotTimeBuffer = this.createBuffer(new Float32Array(this.MAX_DOT_COUNT));
  }

  public createDot(position: Vector3, normal: Vector3): void {
    this.dotQueue.push({ position, normal });
  }

  /**
   * Updates the canvas dimensions and webgl viewport based on its element"s properties.
   */
  private updateDimensions(): void {
    this.width = this.element.clientWidth;
    this.height = this.element.clientHeight;

    this.element.width = this.width;
    this.element.height = this.height;
    this.aspectRatio = this.width / this.height;

    this.gl.viewport(0, 0, this.width, this.height);
  }

  /**
   * Draw all sprite models and collision objects to the canvas.
   */
  public render(): void {
    // Clear screen
    this.gl.clearColor(1, 1, 1, 1);
    this.gl.clear(this.gl.COLOR_BUFFER_BIT | this.gl.DEPTH_BUFFER_BIT | this.gl.STENCIL_BUFFER_BIT);

    const viewMatrix: Matrix4 = Game.instance.camera.getViewMatrix();
    const projectionMatrix: Matrix4 = Game.instance.camera.getProjectionMatrix(this.aspectRatio);

    this.shapeShader.use();

    this.shapeShader.setUniformMatrix("viewMatrix", viewMatrix);
    this.shapeShader.setUniformMatrix("projectionMatrix", projectionMatrix);

    Game.instance.renderModels.forEach((models: Set<RenderModel>, mesh: RenderMesh) => {
      this.shapeShader.setAttribBuffer("vertexPos", mesh.vertexBuffer, 3, 0, 0);
      this.gl.bindBuffer(this.gl.ELEMENT_ARRAY_BUFFER, mesh.indexBuffer);

      for (const model of models) {
        this.shapeShader.setUniformMatrix("meshTransform", model.transformation);

        this.gl.drawElements(this.gl.TRIANGLES, mesh.indexCount, this.gl.UNSIGNED_SHORT, 0);
      }
    });

    // Set necessary attrib buffers and uniforms for sprite rendering
    this.dotShader.use();

    if (this.dotQueue.length > 0) {
      let dotsProcessed: number = 0;

      while (dotsProcessed < this.dotQueue.length) {
        let amountToProcess = this.dotQueue.length;

        if (this.currentDot + amountToProcess >= this.MAX_DOT_COUNT) amountToProcess = this.MAX_DOT_COUNT - this.currentDot;

        const positionData: Float32Array = new Float32Array(amountToProcess * 3);
        const normalData: Float32Array = new Float32Array(amountToProcess * 3);
        const timeData: Float32Array = new Float32Array(amountToProcess);

        for (let i = 0; i < amountToProcess; i++) {
          const dot: Dot = this.dotQueue[dotsProcessed];

          positionData[i * 3] = dot.position.x;
          positionData[i * 3 + 1] = dot.position.y;
          positionData[i * 3 + 2] = dot.position.z;

          normalData[i * 3] = dot.normal.x;
          normalData[i * 3 + 1] = dot.normal.y;
          normalData[i * 3 + 2] = dot.normal.z;

          timeData[i] = Game.instance.elapsedTime;

          dotsProcessed++;
        }

        this.modifyArrayBuffer(this.dotPositionBuffer, positionData, this.currentDot * 3);
        this.modifyArrayBuffer(this.dotNormalBuffer, normalData, this.currentDot * 3);
        this.modifyArrayBuffer(this.dotTimeBuffer, timeData, this.currentDot);

        this.currentDot = (this.currentDot + dotsProcessed) % this.MAX_DOT_COUNT;
      }

      this.dotCount += this.dotQueue.length;
      this.dotQueue.length = 0;
    }

    this.dotShader.setUniformMatrix("viewMatrix", viewMatrix);
    this.dotShader.setUniformMatrix("projectionMatrix", projectionMatrix);
    this.dotShader.setUniformVector("lightSource", Game.instance.player.position);
    this.dotShader.setUniformFloat("time", Game.instance.elapsedTime);

    this.dotShader.setAttribBuffer("vertexPos", this.dotVertexBuffer, 3, 0, 0);
    this.dotShader.setAttribBuffer("dotPos", this.dotPositionBuffer, 3, 0, 0, 1);
    this.dotShader.setAttribBuffer("dotNormal", this.dotNormalBuffer, 3, 0, 0, 1);
    this.dotShader.setAttribBuffer("dotTime", this.dotTimeBuffer, 1, 0, 0, 1);

    this.gl.drawArraysInstanced(this.gl.TRIANGLE_FAN, 0, this.DOT_RESOLUTION, this.dotCount);

    // console.log(this.dotCount);
  }
}

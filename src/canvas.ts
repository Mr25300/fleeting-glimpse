import { Game } from "./game.js";
import { Matrix4 } from "./matrix4.js";
import { ShaderProgram } from "./shaderprogram.js";
import { Vector3 } from "./vector3.js";

/** Encapsulates the game"s screen and all relevant functionality. */
export class Canvas {
  private element: HTMLCanvasElement;
  private gl: WebGL2RenderingContext;

  public readonly shader: ShaderProgram;

  /** The square vertex buffer used for all sprites. */
  private maxDotCount: number = 1000000;
  private dotCount: number = 0;
  private dotVertexBuffer: WebGLBuffer;
  private dotPositionBuffer: WebGLBuffer;
  private dotNormalBuffer: WebGLBuffer;

  private height: number;
  private width: number;
  private aspectRatio: number;

  constructor() {
    this.element = document.getElementById("game-screen") as HTMLCanvasElement;
    
    // Get gl2 or gl context
    this.gl = this.element.getContext("webgl2") as WebGL2RenderingContext;
    if (!this.gl) throw new Error("Failed to get GL context.");

    // Create the shader program
    this.shader = new ShaderProgram(this.gl);

    // Set webgl settings
    this.gl.enable(this.gl.DEPTH_TEST);
    this.gl.enable(this.gl.BLEND);
    this.gl.blendFunc(this.gl.SRC_ALPHA, this.gl.ONE_MINUS_SRC_ALPHA);

    this.updateDimensions();

    // Listen to canvas resizing to update dimensions
    new ResizeObserver(() => {
      this.updateDimensions();

    }).observe(this.element);
  }

  public async init(): Promise<void> {
    this.createDotVertexBuffer();

    // Wait for shader to load the vertex and fragment shaders
    await this.shader.initShaders("res/shaders/vertex.glsl", "res/shaders/fragment.glsl");

    this.shader.use();

    this.shader.createAttrib("vertexPos"); // Create the attrib buffer for vertices
    this.shader.createAttrib("dotPos");
    this.shader.createAttrib("dotNormal");

    // Create all necessary uniforms for the vertex shader
    this.shader.createUniform("viewMatrix");
    this.shader.createUniform("projectionMatrix");
    this.shader.createUniform("lightDirection");
  }

  /**
   * Creates a webgl buffer with relevant data.
   * @param data The `Float32Array` buffer data.
   * @returns A webgl buffer.
   */
  public createBuffer(data: Float32Array): WebGLBuffer {
    const buffer: WebGLBuffer | null = this.gl.createBuffer();
    if (!buffer) throw new Error("Failed to create buffer.");

    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, buffer); // ELEMENT_ARRAY_BUFFER for index buffer
    this.gl.bufferData(this.gl.ARRAY_BUFFER, data, this.gl.STATIC_DRAW);

    return buffer;
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
    this.dotVertexBuffer = this.createBuffer(new Float32Array([
      0, 0, -0.5,
      0.5, 0, 0,
      -0.5, 0, 0,
      0, 0, 0.5
    ]));

    this.dotPositionBuffer = this.createBuffer(new Float32Array(this.maxDotCount * 3));
    this.dotNormalBuffer = this.createBuffer(new Float32Array(this.maxDotCount * 3));
  }

  public createDot(position: Vector3, normal: Vector3): void {
    const positionData: Float32Array = new Float32Array([position.x, position.y, position.z]);
    const normalData: Float32Array = new Float32Array([normal.x, normal.y, normal.z]);

    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.dotPositionBuffer);
    this.gl.bufferSubData(this.gl.ARRAY_BUFFER, this.dotCount * 3 * Float32Array.BYTES_PER_ELEMENT, positionData);

    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.dotNormalBuffer);
    this.gl.bufferSubData(this.gl.ARRAY_BUFFER, this.dotCount * 3 * Float32Array.BYTES_PER_ELEMENT, normalData);

    this.dotCount++;
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
    this.gl.clearColor(0, 0, 0, 1);
    this.gl.clear(this.gl.COLOR_BUFFER_BIT | this.gl.DEPTH_BUFFER_BIT | this.gl.STENCIL_BUFFER_BIT);

    // DRAW BLACK TRIANGLES BEFOREHAND SO THAT POINTS BEHIND THEM WILL BE OCCLUDED
    // DRAW POINTS SLIGHTLY FORWARD IN THE NORMAL DIRECTION SO THEY DONT CLIP WITH THE BLACK TRIANGLES

    // Set necessary attrib buffers and uniforms for sprite rendering
    this.shader.use();
    this.shader.setUniformMatrix("viewMatrix", Game.instance.camera.getViewMatrix());
    this.shader.setUniformMatrix("projectionMatrix", Game.instance.camera.getProjectionMatrix(this.aspectRatio));
    this.shader.setUniformVector("lightDirection", new Vector3(0, -1, -0.5));

    this.shader.setAttribBuffer("vertexPos", this.dotVertexBuffer, 3, 0, 0);
    this.shader.setAttribBuffer("dotPos", this.dotPositionBuffer, 3, 0, 0, 1);
    this.shader.setAttribBuffer("dotNormal", this.dotNormalBuffer, 3, 0, 0, 1);

    this.gl.drawArraysInstanced(this.gl.TRIANGLE_STRIP, 0, 4, this.dotCount);

    // console.log(this.dotCount);
  }
}

import { Game } from "./game.js";
import { Matrix4 } from "./matrix4.js";
import { ShaderProgram } from "./shaderprogram.js";
import { Vector3 } from "./vector3.js";

/** Encapsulates the game"s screen and all relevant functionality. */
export class Canvas {
  private element: HTMLCanvasElement;
  private gl: WebGL2RenderingContext;

  private dotShader: ShaderProgram;
  private shapeShader: ShaderProgram;

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
    this.dotShader = new ShaderProgram(this.gl);
    this.shapeShader = new ShaderProgram(this.gl);

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
    await Promise.all([
      this.dotShader.initShaders("res/shaders/dotVertex.glsl", "res/shaders/dotFragment.glsl"),
      this.shapeShader.initShaders("res/shaders/shapeVertex.glsl", "res/shaders/shapeFragment.glsl")
    ]);

    this.dotShader.use();
    this.dotShader.createAttrib("vertexPos");
    this.dotShader.createAttrib("dotPos");
    this.dotShader.createAttrib("dotNormal");
    this.dotShader.createUniform("viewMatrix");
    this.dotShader.createUniform("projectionMatrix");
    this.dotShader.createUniform("lightDirection");
    this.dotShader.createUniform("time");

    this.shapeShader.use();
    this.shapeShader.createAttrib("vertexPos");
    this.shapeShader.createUniform("meshTransform");
    this.shapeShader.createUniform("viewMatrix");
    this.shapeShader.createUniform("projectionMatrix");
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

    const viewMatrix: Matrix4 = Game.instance.camera.getViewMatrix();
    const projectionMatrix: Matrix4 = Game.instance.camera.getProjectionMatrix(this.aspectRatio);

    // DRAW BLACK TRIANGLES BEFOREHAND SO THAT POINTS BEHIND THEM WILL BE OCCLUDED
    // DRAW POINTS SLIGHTLY FORWARD IN THE NORMAL DIRECTION SO THEY DONT CLIP WITH THE BLACK TRIANGLES
    this.shapeShader.use();

    this.shapeShader.setUniformMatrix("viewMatrix", viewMatrix);
    this.shapeShader.setUniformMatrix("projectionMatrix", projectionMatrix);

    for (const mesh of Game.instance.meshes) {
      this.shapeShader.setUniformMatrix("meshTransform", mesh.getTransformation());
      this.shapeShader.setAttribBuffer("vertexPos", mesh.vertexBuffer, 3, 0, 0);

      this.gl.bindBuffer(this.gl.ELEMENT_ARRAY_BUFFER, mesh.indexBuffer);
      this.gl.drawElements(this.gl.TRIANGLES, mesh.triangleCount * 3, this.gl.UNSIGNED_SHORT, 0);
    }

    // Set necessary attrib buffers and uniforms for sprite rendering
    this.dotShader.use();

    this.dotShader.setUniformMatrix("viewMatrix", viewMatrix);
    this.dotShader.setUniformMatrix("projectionMatrix", projectionMatrix);
    this.dotShader.setUniformVector("lightDirection", new Vector3(0, -1, 0));
    this.dotShader.setUniformFloat("time", Game.instance.elapsedTime);

    this.dotShader.setAttribBuffer("vertexPos", this.dotVertexBuffer, 3, 0, 0);
    this.dotShader.setAttribBuffer("dotPos", this.dotPositionBuffer, 3, 0, 0, 1);
    this.dotShader.setAttribBuffer("dotNormal", this.dotNormalBuffer, 3, 0, 0, 1);

    this.gl.drawArraysInstanced(this.gl.TRIANGLE_STRIP, 0, 4, this.dotCount);

    // console.log(this.dotCount);
  }
}

import { Matrix4 } from "./matrix4.js";
import { Util } from "./util.js";
import { Vector3 } from "./vector3.js";

export class ShaderProgram {
  private program: WebGLProgram;
  private vertShader: WebGLShader;
  private fragShader: WebGLShader;

  /** Map of attribute names and their associate locations */
  private attribLocations: Map<string, number> = new Map();
  /** Map of uniform names and their associated locations */
  private uniformLocations: Map<string, WebGLUniformLocation> = new Map();

  constructor(private gl: WebGL2RenderingContext) {
    // Initialize webgl program
    const program: WebGLProgram | null = gl.createProgram();
    if (program === null) throw new Error("Failed to create program.");

    this.program = program;
  }

  /**
   * Initializes and loads the program with its shaders.
   * @param vertPath The path to the program"s vertex shader.
   * @param fragPath The path to the program"s fragment shader.
   */
  public async initShaders(vertPath: string, fragPath: string) {
    // Load and await vertex and fragment shaders
    const [vertSource, fragSource] = await Promise.all([
      Util.loadFile(vertPath),
      Util.loadFile(fragPath)
    ]);

    // Create vertex and fragment shaders and link program
    this.vertShader = this.createShader(this.gl.VERTEX_SHADER, vertSource);
    this.fragShader = this.createShader(this.gl.FRAGMENT_SHADER, fragSource);

    this.gl.linkProgram(this.program);

    // Error checking
    if (!this.gl.getProgramParameter(this.program, this.gl.LINK_STATUS)) {
      console.error("Failed to link shader program: " + this.gl.getProgramInfoLog(this.program));
    }

    this.gl.validateProgram(this.program);

    if (!this.gl.getProgramParameter(this.program, this.gl.VALIDATE_STATUS)) {
      console.error("Failed to validate shader program: " + this.gl.getProgramInfoLog(this.program));
    }
  }

  /**
   * Creates a shader based on the given type and source code.
   * @param type The shader type (vertex or fragment).
   * @param source The shader source code.
   * @returns The created webgl shader.
   */
  private createShader(type: number, source: string): WebGLShader {
    // Initialize webgl shader
    const shader: WebGLShader | null = this.gl.createShader(type);
    if (shader === null) throw new Error("Failed to create shader.");

    // Source and compile shader
    this.gl.shaderSource(shader, source);
    this.gl.compileShader(shader);

    // Error checking
    if (!this.gl.getShaderParameter(shader, this.gl.COMPILE_STATUS)) {
      this.gl.deleteShader(shader);

      throw new Error(`Error compiling ${type == this.gl.VERTEX_SHADER ? "vertex" : "fragment"} shader: ` + this.gl.getShaderInfoLog(shader));
    }

    this.gl.attachShader(this.program, shader); // Attach shader to the program

    return shader;
  }

  /**
   * Initialize the attribute and its location.
   * @param name The attribute name.
   */
  public createAttrib(name: string): void {
    // Get location of attribute
    const location: number = this.gl.getAttribLocation(this.program, name);
    if (location < 0) throw new Error(`Attribute "${name}" not found.`);

    // Set attribute location
    this.attribLocations.set(name, location);
  }

  /**
   * Sets the buffer data for an attribute.
   * @param name The attribute name.
   * @param buffer The data buffer.
   * @param size The size of each vertex.
   * @param stride The byte offset between vertices.
   * @param offset The initial byte offset.
   */
  public setAttribBuffer(name: string, buffer: WebGLBuffer, size: GLint, stride: GLint, offset: GLint, divisor?: number): void {
    // Get attribute location
    const location: number | undefined = this.attribLocations.get(name);
    if (location === undefined) throw new Error(`Attrib "${name}" does not exist.`);

    // Bind buffer and set pointer
    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, buffer);

    this.gl.vertexAttribPointer(location, size, this.gl.FLOAT, false, stride, offset);
    this.gl.enableVertexAttribArray(location);

    if (divisor !== undefined) {
      this.gl.vertexAttribDivisor(location, divisor);
    }
  }

  /**
   * Initialize the uniform and its location.
   * @param name The uniform name.
   */
  public createUniform(name: string): void {
    // Get location of uniform
    const location: WebGLUniformLocation | null = this.gl.getUniformLocation(this.program, name);
    if (!location) throw new Error(`Uniform "${name}" not found.`);

    // Set location of uniform
    this.uniformLocations.set(name, location);
  }

  /**
   * Gets the cached location of a uniform.
   * @param name The uniform name.
   * @returns The location of the uniform.
   */
  public getUniformLocation(name: string): WebGLUniformLocation {
    const location: WebGLUniformLocation | undefined = this.uniformLocations.get(name);
    if (location === undefined) throw new Error(`Uniform "${name}" does not exist.`);

    return location;
  }

  /**
   * Set the value of a uniform float 3 matrix.
   * @param name The uniform name.
   * @param matrix The matrix.
   */
  public setUniformMatrix(name: string, matrix: Matrix4): void { // make it take in matrix4 class
    this.gl.uniformMatrix4fv(this.getUniformLocation(name), false, matrix.glFormat());
  }

  /**
   * Sets the uniform float 2 vector to a vector.
   * @param name The uniform name.
   * @param vector The vector value.
   */
  public setUniformVector(name: string, vector: Vector3): void {
    this.gl.uniform3fv(this.getUniformLocation(name), new Float32Array([vector.x, vector.y, vector.z]));
  }

  /**
   * Activate the program.
   */
  public use(): void {
    this.gl.useProgram(this.program);
  }

  /**
   * Destroy the program and its shaders.
   */
  public destroy(): void {
    this.gl.deleteShader(this.vertShader);
    this.gl.deleteShader(this.fragShader);
    this.gl.deleteProgram(this.program);
  }
}

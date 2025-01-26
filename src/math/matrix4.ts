import { Vector3 } from "./vector3.js";

/** Represents a 4x4 matrix and handles all relevant constructors and methods. */
export class Matrix4 {
  private _lookVector?: Vector3;
  private _upVector?: Vector3;
  private _rightVector?: Vector3;
  private _transposed?: Matrix4;
  
  private constructor(private values: Float32Array) {}

  public static readonly identity: Matrix4 = Matrix4.create(
    1, 0, 0, 0,
    0, 1, 0, 0,
    0, 0, 1, 0,
    0, 0, 0, 1
  );

  public static create(...values: number[]): Matrix4 {
    const matrixArray: Float32Array = new Float32Array(16);
    matrixArray.set(values);

    return new Matrix4(matrixArray);
  }

  /**
   * Creates a translation matrix from a given vector3 position.
   * @param position The given position.
   * @returns The translation matrix.
   */
  public static fromPosition(position: Vector3): Matrix4 {
    return Matrix4.create(
      1, 0, 0, position.x,
      0, 1, 0, position.y,
      0, 0, 1, position.z,
      0, 0, 0, 1
    );
  }

  /**
   * Creates a rotation matrix around the euler x rotation axis.
   * @param angle The angle amount to rotate by. 
   * @returns The rotation matrix.
   */
  public static fromEulerAngleX(angle: number): Matrix4 {
    const cos: number = Math.cos(angle);
    const sin: number = Math.sin(angle);

    return Matrix4.create(
      1, 0, 0, 0,
      0, cos, -sin, 0,
      0, sin, cos, 0,
      0, 0, 0, 1
    );
  }

  /**
   * Creates a rotation matrix around the euler y rotation axis.
   * @param angle The angle amount to rotate by. 
   * @returns The rotation matrix.
   */
  public static fromEurlerAngleY(angle: number): Matrix4 {
    const cos: number = Math.cos(angle);
    const sin: number = Math.sin(angle);

    return Matrix4.create(
      cos, 0, sin, 0,
      0, 1, 0, 0,
      -sin, 0, cos, 0,
      0, 0, 0, 1
    );
  }

  /**
   * Creates a rotation matrix around the euler z rotation axis.
   * @param angle The angle amount to rotate by. 
   * @returns The rotation matrix.
   */
  public static fromEulerAngleZ(angle: number): Matrix4 {
    const cos: number = Math.cos(angle);
    const sin: number = Math.sin(angle);

    return Matrix4.create(
      cos, -sin, 0, 0,
      sin, cos, 0, 0,
      0, 0, 1, 0,
      0, 0, 0, 1
    );
  }

  /**
   * Creates a rotation matrix from the specified euler angles (in YXZ order).
   * @param x The x angle (pitch).
   * @param y The y angle (yaw).
   * @param z The z angle (roll).
   * @returns The rotation matrix.
   */
  public static fromEulerAngles(x: number, y: number, z: number): Matrix4 {
    const matrixX: Matrix4 = this.fromEulerAngleX(x);
    const matrixY: Matrix4 = this.fromEurlerAngleY(y);
    const matrixZ: Matrix4 = this.fromEulerAngleZ(z);

    return matrixY.multiply(matrixX).multiply(matrixZ);
  }

  /**
   * Creates an orthonormal rotation matrix which faces the given look direction.
   * @param look The look direction.
   * @param up The specified up direction (optional).
   * @returns The rotation matrix.
   */
  public static fromLookVector(look: Vector3, up: Vector3 = Vector3.y): Matrix4 {
    look = look.unit.multiply(-1); // For a right-handed coordinate system
    up = up.unit;

    if (look.dot(up) === 1) {
      up = Math.abs(look.y) > 0.9 ? Vector3.z : Vector3.y;
    }

    const right: Vector3 = up.cross(look).unit;

    up = look.cross(right).unit;

    return Matrix4.create(
      right.x, up.x, look.x, 0,
      right.y, up.y, look.y, 0,
      right.z, up.z, look.z, 0,
      0, 0, 0, 1
    );
  }

  /**
   * Creates a matrix which rotates any inputted vector by a certain angle around a given axis.
   * @param axis The specified axis.
   * @param angle The angle to rotate around the axis.
   * @returns The axis angle matrix.
   */
  static fromAxisAngle(axis: Vector3, angle: number): Matrix4 {
    axis = axis.unit;

    const [x, y, z]: [number, number, number] = [axis.x, axis.y, axis.z];
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    const t = 1 - cos;

    return Matrix4.create(
      t * x * x + cos, t * x * y - z * sin, t * x * z + y * sin, 0,
      t * x * y + z * sin, t * y * y + cos, t * y * z - x * sin, 0,
      t * x * z - y * sin, t * y * z + x * sin, t * z * z + cos, 0,
      0, 0, 0, 1,
    );
  }

  /**
   * Creates a perspective projection matrix from the specified parameters.
   * @param aspectRatio The screen aspect ratio.
   * @param fov The field of view.
   * @param near The near clipping plane.
   * @param far The far clipping plane.
   * @returns The perspective projection matrix.
   */
  public static fromPerspective(aspectRatio: number, fov: number, near: number, far: number): Matrix4 {
    const fovScale: number = 1 / Math.tan(fov / 2 * Math.PI / 180);
    const clipFactor: number = -far / (far - near);

    return Matrix4.create(
      fovScale / aspectRatio, 0, 0, 0,
      0, fovScale, 0, 0,
      0, 0, clipFactor, clipFactor * near,
      0, 0, -1, 0
    );
  }

  /**
   * Transposes the current matrix by swapping its rows and columns (inverses the matrix if it is orthonormal).
   * @returns The transposed matrix.
   */
  public transpose(): Matrix4 {
    if (!this._transposed) {
      const transposed = new Float32Array(16);

      for (let r: number = 0; r < 4; r++) {
        for (let c: number = 0; c < 4; c++) {
          transposed[c * 4 + r] = this.values[r * 4 + c];
        }
      }

      this._transposed = new Matrix4(transposed);
      this._transposed._transposed = this;
    }

    return this._transposed;
  }

  /**
   * Combines this matrix with another.
   * @param matrix The other matrix.
   * @returns The product matrix.
   */
  public multiply(matrix: Matrix4): Matrix4 {
    const newMatrix: Float32Array = new Float32Array(16);

    for (let r: number = 0; r < 4; r++) {
      for (let c: number = 0; c < 4; c++) {
        let dotSum: number = 0;

        for (let i: number = 0; i < 4; i++) {
          dotSum += this.values[r * 4 + i] * matrix.values[c + i * 4];
        }

        newMatrix[r * 4 + c] = dotSum;
      }
    }

    return new Matrix4(newMatrix);
  }

  /**
   * Applies the matrix's transformations to the inputted vector.
   * @param vector The inputted vector.
   * @returns The outputted vector.
   */
  public apply(vector: Vector3): Vector3 {
    const vecValues: Float32Array = new Float32Array([vector.x, vector.y, vector.z, 1]);
    const newValues: Float32Array = new Float32Array(4);

    for (let r: number = 0; r < 4; r++) {
      let dotSum: number = 0;

      for (let i: number = 0; i < 4; i++) {
        dotSum += this.values[r * 4 + i] * vecValues[i];
      }

      newValues[r] = dotSum;
    }

    return new Vector3(newValues[0] / newValues[3], newValues[1] / newValues[3], newValues[2] / newValues[3]);
  }

  /** Returns the translation of the matrix in vector3 form. */
  public get position(): Vector3 {
    return new Vector3(this.values[3], this.values[7], this.values[11]);
  }

  /** Returns the matrix's isolated rotation components in matrix form. */
  public get rotation(): Matrix4 {
    return Matrix4.create(
      this.values[0], this.values[1], this.values[2], 0,
      this.values[4], this.values[5], this.values[6], 0,
      this.values[8], this.values[9], this.values[10], 0,
      0, 0, 0, 1
    );
  }

  /** Returns the look direction of the matrix. */
  public get lookVector(): Vector3 {
    if (!this._lookVector) this._lookVector = new Vector3(-this.values[2], -this.values[6], -this.values[10])

    return this._lookVector;
  }

  /** Returns the up direction of the matrix. */
  public get upVector(): Vector3 {
    if (!this._upVector) this._upVector = new Vector3(this.values[1], this.values[5], this.values[9]);

    return this._upVector;
  }

  /** Returns the right direction of the matrix. */
  public get rightVector(): Vector3 {
    if (!this._rightVector) this._rightVector = new Vector3(this.values[0], this.values[4], this.values[8]);

    return this._rightVector;
  }

  /** Formats a matrix for webgl by transposing it and returning its values. */
  public glFormat(): Float32Array {
    return this.transpose().values;
  }
}
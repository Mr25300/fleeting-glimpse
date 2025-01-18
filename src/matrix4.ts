import { Vector3 } from "./vector3.js";

export class Matrix4 {
  private constructor(private values: Float32Array) {}

  public static create(...values: number[]): Matrix4 {
    const matrixArray: Float32Array = new Float32Array(16);
    matrixArray.set(values);

    return new Matrix4(matrixArray);
  }

  public static readonly identity: Matrix4 = Matrix4.create(
    1, 0, 0, 0,
    0, 1, 0, 0,
    0, 0, 1, 0,
    0, 0, 0, 1
  );

  public static fromScale(scale: Vector3): Matrix4 {
    return Matrix4.create(
      scale.x, 0, 0, 0,
      0, scale.y, 0, 0,
      0, 0, scale.z, 0,
      0, 0, 0, 1
    );
  }

  public static fromRotationX(rotX: number): Matrix4 {
    const cos: number = Math.cos(rotX);
    const sin: number = Math.sin(rotX);

    return Matrix4.create(
      1, 0, 0, 0,
      0, cos, -sin, 0,
      0, sin, cos, 0,
      0, 0, 0, 1
    );
  }

  public static fromRotationY(rotY: number): Matrix4 {
    const cos: number = Math.cos(rotY);
    const sin: number = Math.sin(rotY);

    return Matrix4.create(
      cos, 0, sin, 0,
      0, 1, 0, 0,
      -sin, 0, cos, 0,
      0, 0, 0, 1
    );
  }

  public static fromRotationZ(rotZ: number): Matrix4 {
    const cos: number = Math.cos(rotZ);
    const sin: number = Math.sin(rotZ);

    return Matrix4.create(
      cos, -sin, 0, 0,
      sin, cos, 0, 0,
      0, 0, 1, 0,
      0, 0, 0, 1
    );
  }

  public static fromRotation(yaw: number, pitch: number, roll: number): Matrix4 {
    const matrixX: Matrix4 = this.fromRotationX(pitch);
    const matrixY: Matrix4 = this.fromRotationY(yaw);
    const matrixZ: Matrix4 = this.fromRotationZ(roll);

    return matrixY.multiply(matrixX).multiply(matrixZ);
  }

  public static fromPosition(position: Vector3): Matrix4 {
    return Matrix4.create(
      1, 0, 0, position.x,
      0, 1, 0, position.y,
      0, 0, 1, position.z,
      0, 0, 0, 1
    );
  }

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

  public static fromLookVector(look: Vector3, up: Vector3 = new Vector3(0, 1, 0)): Matrix4 {
    const right: Vector3 = up.cross(look);

    return Matrix4.create(
      right.x, up.x, look.x, 0,
      right.y, up.y, look.y, 0,
      right.z, up.z, look.z, 0,
      0, 0, 0, 1
    );
  }

  public transpose(): Matrix4 {
    const transposed = new Float32Array(16);

    for (let r: number = 0; r < 4; r++) {
      for (let c: number = 0; c < 4; c++) {
        transposed[c * 4 + r] = this.values[r * 4 + c];
      }
    }

    return new Matrix4(transposed);
  }

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

    return new Vector3(newValues[0] / newValues[3], newValues[1] / newValues[3], newValues[2]);
  }

  public translate(translation: Vector3): Matrix4 {
    return this.multiply(Matrix4.fromPosition(translation));
  }

  public rotate(yaw: number, pitch: number, roll: number): Matrix4 {
    return this.multiply(Matrix4.fromRotation(yaw, pitch, roll));
  }

  public get position(): Vector3 {
    return new Vector3(this.values[3], this.values[7], this.values[11]);
  }

  public get rotation(): Matrix4 {
    return Matrix4.create(
      this.values[0], this.values[1], this.values[2], 0,
      this.values[4], this.values[5], this.values[6], 0,
      this.values[8], this.values[9], this.values[10], 0,
      0, 0, 0, 1
    );
  }

  // public get angles(): Vector3 { // FIX THIS!!!
  //   return new Vector3(
  //     Math.atan2(this.values[9], this.values[10]),
  //     Math.asin(-this.values[8]),
  //     Math.atan2(this.values[4], this.values[0])
  //   );
  // }

  public get lookVector(): Vector3 {
    return new Vector3(-this.values[2], -this.values[6], -this.values[10]);
  }

  public get upVector(): Vector3 {
    return new Vector3(this.values[1], this.values[5], this.values[9]);
  }
  
  public get rightVector(): Vector3 {
    return new Vector3(this.values[0], this.values[4], this.values[8]);
  }

  public glFormat(): Float32Array {
    return this.transpose().values;
  }
}
/** Represents a vector in 3d space. */
export class Vector3 {
  private _magnitude?: number;
  private _unit?: Vector3;

  constructor(
    public readonly x: number = 0,
    public readonly y: number = 0,
    public readonly z: number = 0
  ) {}

  public static readonly zero: Vector3 = new Vector3();
  public static readonly x: Vector3 = new Vector3(1, 0, 0);
  public static readonly y: Vector3 = new Vector3(0, 1, 0);
  public static readonly z: Vector3 = new Vector3(0, 0, 1);

  /**
   * Adds another vector to this vector.
   * @param vector The vector being added.
   * @returns The sum of the two vectors.
   */
  public add(vector: Vector3): Vector3 {
    return new Vector3(this.x + vector.x, this.y + vector.y, this.z + vector.z);
  }

  /**
   * Subtracts another vector from this vector.
   * @param vector The vector being subtracted.
   * @returns The difference of the two vectors.
   */
  public subtract(vector: Vector3): Vector3 {
    return new Vector3(this.x - vector.x, this.y - vector.y, this.z - vector.z);
  }

  /**
   * Multiples this vector by a scalar.
   * @param vector The scalar.
   * @returns The scaled vector.
   */
  public multiply(scalar: number): Vector3 {
    return new Vector3(this.x * scalar, this.y * scalar, this.z * scalar);
  }

  /**
   * Divides another vector by a divisor.
   * @param vector The divisor.
   * @returns The divided vector.
   */
  public divide(divisor: number): Vector3 {
    return new Vector3(this.x / divisor, this.y / divisor, this.z / divisor);
  }

  /** The magnitude of the vector, derived from the pythagorean theorum. */
  public get magnitude(): number {
    if (this._magnitude === undefined) {
      this._magnitude = Math.sqrt(this.x ** 2 + this.y ** 2 + this.z ** 2);
    }

    return this._magnitude;
  }

  /** The unit vector of this vector with magnitude 1. */
  public get unit(): Vector3 {
    if (!this._unit) {
      if (this.magnitude === 0) this._unit = Vector3.zero;
      else this._unit = this.divide(this.magnitude);

      this._unit._unit = this._unit;
    }

    return this._unit;
  }

  /**
   * Calculates the dot product between this and another vector.
   * @param vector The other vector.
   * @returns The dot product.
   */
  public dot(vector: Vector3): number {
    return this.x * vector.x + this.y * vector.y + this.z * vector.z;
  }

  /**
   * Calculates the cross product between this and another vector.
   * @param vector The other vector.
   * @returns The cross product vector.
   */
  public cross(vector: Vector3): Vector3 {
    return new Vector3(
      this.y * vector.z - this.z * vector.y,
      this.z * vector.x - this.x * vector.z,
      this.x * vector.y - this.y * vector.x
    );
  }

  /** Returns a vector perfectly othogonal to this one. */
  public get perpendicular(): Vector3 {
    let perpendicular: Vector3 = this.cross(Vector3.x).unit;

    if (perpendicular.magnitude === 0) perpendicular = this.cross(Vector3.y).unit;

    return perpendicular;
  }

  public getParallelComponent(vector: Vector3): Vector3 {
    return vector.unit.multiply(vector.unit.dot(this));
  }

  public getOrthogonalComponent(vector: Vector3): Vector3 {
    return this.subtract(this.getParallelComponent(vector));
  }
}
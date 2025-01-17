export class Vector3 { // Consider general vector class which stores values in float32array
  private _magnitude?: number;
  private _unit?: Vector3;

  constructor(
    public readonly x: number = 0,
    public readonly y: number = 0,
    public readonly z: number = 0
  ) {}

  public static readonly zero: Vector3 = new Vector3();

  public add(vector: Vector3): Vector3 {
    return new Vector3(this.x + vector.x, this.y + vector.y, this.z + vector.z);
  }

  public subtract(vector: Vector3): Vector3 {
    return new Vector3(this.x - vector.x, this.y - vector.y, this.z - vector.z);
  }

  public multiply(scalar: number): Vector3 {
    return new Vector3(this.x * scalar, this.y * scalar, this.z * scalar);
  }

  public divide(divisor: number): Vector3 {
    return new Vector3(this.x / divisor, this.y / divisor, this.z / divisor);
  }

  public get magnitude(): number {
    if (this._magnitude === undefined) {
      this._magnitude = Math.sqrt(this.x ** 2 + this.y ** 2 + this.z ** 2);
    }

    return this._magnitude;
  }

  public get unit(): Vector3 {
    if (!this._unit) this._unit = this.divide(this.magnitude);

    return this._unit;
  }

  public dot(vector: Vector3): number {
    return this.x * vector.x + this.y * vector.y + this.z * vector.z;
  }

  public cross(vector: Vector3): Vector3 {
    return new Vector3(
      this.y * vector.z - this.z * vector.y,
      this.z * vector.x - this.x * vector.z,
      this.x * vector.y - this.y * vector.x
    );
  }
}
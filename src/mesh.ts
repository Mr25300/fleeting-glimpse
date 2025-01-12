import { Vector3 } from "./vector3";

export class Triangle {
  constructor(
    public readonly v0: number,
    public readonly v1: number,
    public readonly v2: number
  ) {}
}

export class Mesh {
  

  constructor(
    private vertices: Vector3[],
    private triangles: Triangle[]
  ) {
    
  }
}
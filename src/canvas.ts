import { Game } from "./game.js";
import { Matrix4 } from "./matrix4.js";
import { Ray } from "./triangle.js";
import { Vector3 } from "./vector3.js";

export class Camera {
  private Z_NEAR: number = 0.01;
  private Z_FAR: number = 10000;

  public fov: number = 70;
  public yaw: number = 0;
  public pitch: number = 0;
  public roll: number = 0;
  public position: Vector3 = new Vector3(0, 0, 2);
  public rotation: Matrix4 = Matrix4.identity;

  public getTransformationMatrix(aspectRatio: number): Matrix4 {
    const projectionMatrix: Matrix4 = Matrix4.fromPerspective(aspectRatio, this.fov, this.Z_NEAR, this.Z_FAR);

    return projectionMatrix.multiply(this.rotation.transpose().translate(this.position.multiply(-1)));
  }

  public rotate(yaw: number, pitch: number): void {
    this.yaw = (this.yaw + yaw) % (2 * Math.PI);
    this.pitch = Math.min(Math.max(this.pitch + pitch, -Math.PI / 2), Math.PI / 2);
    this.rotation = Matrix4.fromRotation(this.yaw, this.pitch, this.roll);
  }
}

export class Point {
  constructor(
    public readonly position: Vector3,
    public readonly normal: Vector3
  ) {}
}

export class Canvas {
  private element: HTMLCanvasElement;
  private context: CanvasRenderingContext2D;

  private width: number;
  private height: number;

  constructor() {
    this.element = document.getElementById("gameScreen") as HTMLCanvasElement;
    this.context = this.element.getContext("2d")!;

    this.updateDimensions();

    new ResizeObserver(() => {
      this.updateDimensions();

    }).observe(this.element);
  }

  private updateDimensions(): void {
    this.width = this.element.clientWidth;
    this.height = this.element.clientHeight;

    this.element.width = this.width;
    this.element.height = this.height;
  }

  private drawPoint(point: Vector3): void {
    const pX: number = this.width * (point.x + 1) / 2;
    const pY: number = this.height * (1 - (point.y + 1) / 2);

    const color: number = 255;//(1 - point.z / 100) * 255; // have different color depending on normal direction and store in point data

    this.context.fillStyle = `rgb(${color}, ${color}, ${color})`;
    this.context.beginPath();
    this.context.arc(pX, pY, 30 / point.z, 0, Math.PI * 2);
    this.context.fill();
  }

  public render(): void {
    const transformationMatrix = Game.instance.camera.getTransformationMatrix(this.width / this.height);

    this.context.fillStyle = "black";
    this.context.fillRect(0, 0, this.element.width, this.element.height);

    for (const point of Game.instance.points) {
      // const camToPoint: Ray = new Ray(point, Game.instance.camera.position.subtract(point).unit);
      // let somethingInTheWay: boolean = false

      // for (const triangle of Game.instance.triangles) {
      //   const t: number | undefined = camToPoint.getIntersectionPoint(triangle);

      //   if (t !== undefined && t > 0) {
      //     somethingInTheWay = true;

      //     break;
      //   }
      // }

      // if (somethingInTheWay) continue;

      const result: Vector3 = transformationMatrix.apply(point);
      if (result.z < 0) continue;

      this.drawPoint(result);
    }
  }
}
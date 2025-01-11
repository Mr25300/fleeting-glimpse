import { Ray, Triangle } from "./triangle.js";
import { Vector3 } from "./vector3.js";

const triangle = new Triangle(
  new Vector3(0, 0, -1),
  new Vector3(1, 2, 3),
  new Vector3(-1, 0, 2)
);

const ray = new Ray(
  new Vector3(1, 2, 1),
  new Vector3(-1, -1.5, 1).unit()
);

console.log(ray.getIntersectionPoint(triangle));
import { Vector3 } from "./vector3.js";

const vec1 = new Vector3(1, 0, 0);
const vec2 = new Vector3(0, 1, 0);
const vec3 = vec1.cross(vec2);

console.log(vec3);
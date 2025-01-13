import { Vector3 } from "./vector3.js";

/** Stores widely and commonly used utility functions. */
export class Util {
  /**
   * Loads a shader file from its path.
   * @param path The path to the shader file.
   * @returns A promise returning the content of the file.
   */
  public static async loadFile(path: string): Promise<string> {
    const response: Response = await fetch(path);
    
    if (!response.ok) throw new Error(`Failed to load file: ${path}`);

    return await response.text();
  }

  public static parseObj(objText: string): [Vector3[], number[]] {
    const vertices: Vector3[] = [];
    const vertexIndices: number[] = [];

    objText.split("\n").forEach(line => {
      const parts = line.trim().split(/\s+/);  // Split by whitespace

      if (parts.length === 0) return;

      if (parts[0] === "v") {
        vertices.push(new Vector3(
          parseFloat(parts[1]),
          parseFloat(parts[2]),
          parseFloat(parts[3])
        ));

      } else if (parts[0] === "f") {
        // This is a face line: f v1 v2 v3 or f v1/vt1/vn1 v2/vt2/vn2 v3/vt3/vn3 ...
        const faceVertexIndicies: number[] = [];

        for (let i = 1; i < parts.length; i++) {
          const vertexData = parts[i].split("/"); // Ignore texture and normal data for now
          const vertexIndex = parseInt(vertexData[0]) - 1; // OBJ is 1-based, so subtract 1

          faceVertexIndicies.push(vertexIndex);
        }

        // Split faces into triangles if there are more than 3 vertices
        if (faceVertexIndicies.length === 3) {
          vertexIndices.push(...faceVertexIndicies); // Directly add triangle

        } else if (faceVertexIndicies.length === 4) {
          // For quads, create two triangles
          vertexIndices.push(faceVertexIndicies[0], faceVertexIndicies[1], faceVertexIndicies[2]);
          vertexIndices.push(faceVertexIndicies[0], faceVertexIndicies[2], faceVertexIndicies[3]);

        } else {
          // For polygons with more than 4 vertices, triangulate the polygon (basic method)
          for (let i = 1; i < faceVertexIndicies.length - 1; i++) {
            vertexIndices.push(faceVertexIndicies[0], faceVertexIndicies[i], faceVertexIndicies[i + 1]);
          }
        }
      }
    });

    return [vertices, vertexIndices];
  }
}
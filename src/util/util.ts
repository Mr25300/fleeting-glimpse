/** Stores widely and commonly used utility functions. */
export class Util {
  /**
   * Loads a file from its path.
   * @param path The path to the shader file.
   * @returns A promise returning the file.
   */
  public static async loadFile(path: string): Promise<Response> {
    const response: Response = await fetch(path);
    
    if (!response.ok) throw new Error(`Failed to load file: ${path}`);

    return response;
  }

  /**
   * Clamps a number so that it falls within the specified range.
   * @param n The number.
   * @param min The minimum value.
   * @param max The maximum value.
   * @returns The clamped number.
   */
  public static clamp(n: number, min: number, max: number): number {
    return Math.max(Math.min(n, max), min);
  }
}
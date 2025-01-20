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

  public static clamp(n: number, min: number, max: number): number {
    return Math.max(Math.min(n, max), min);
  }
}
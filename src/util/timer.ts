import { Game } from "../core/game.js";
import { EventConnection } from "./gameevent.js";

/** Manages timer and delay logic for attacks and cooldowns. */
export class Timer {
  private startTime?: number;
  
  constructor(private duration: number) {}

  /**
   * Calls the passed in function after the specified delay time.
   * @param time The amount of time to delay by.
   * @param callback The function to be called.
   * @returns The connection to the update event.
   */
  public static delay(time: number, callback: (...any: any) => void): EventConnection {
    const timer: Timer = new Timer(time);
    timer.start();

    // Connect a handler to the game update event to see when the timer is no longer active
    const connection: EventConnection = Game.instance.firstStep.connect(() => {
      if (!timer.active) {
        connection.disconnect();

        callback();
      }
    });

    return connection;
  }

  /** Starts the timer. */
  public start(): void {
    this.startTime = Game.instance.elapsedTime;
  }

  /** Stops and clears the timer. */
  public stop(): void {
    delete this.startTime;
  }

  /** Returns whether or not the timer is active. */
  public get active(): boolean {
    if (this.startTime === undefined) return false;

    return Game.instance.elapsedTime - this.startTime < this.duration;
  }
}
export class MatchmakingQueue {
  private readonly queue: string[] = [];

  enqueue(connectionId: string): void {
    if (!this.queue.includes(connectionId)) this.queue.push(connectionId);
  }

  leave(connectionId: string): void {
    const i = this.queue.indexOf(connectionId);
    if (i !== -1) this.queue.splice(i, 1);
  }

  /** Returns true if the connection id is currently in the queue. */
  has(connectionId: string): boolean {
    return this.queue.includes(connectionId);
  }

  /**
   * After enqueue, if length >= 2, removes and returns min(length, 4) ids (FIFO).
   * Otherwise returns null.
   */
  tryPopBatch(): string[] | null {
    if (this.queue.length < 2) return null;
    const n = Math.min(this.queue.length, 4);
    return this.queue.splice(0, n);
  }
}

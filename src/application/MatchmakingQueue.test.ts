import { describe, expect, it } from "vitest";
import { MatchmakingQueue } from "./MatchmakingQueue.js";

describe("MatchmakingQueue", () => {
  it("does not pop when fewer than 2 players", () => {
    const q = new MatchmakingQueue();
    q.enqueue("a");
    expect(q.tryPopBatch()).toBeNull();
    expect(q.has("a")).toBe(true);
  });

  it("pops 2 when 2 join", () => {
    const q = new MatchmakingQueue();
    q.enqueue("a");
    q.enqueue("b");
    expect(q.tryPopBatch()).toEqual(["a", "b"]);
    expect(q.has("a")).toBe(false);
    expect(q.has("b")).toBe(false);
  });

  it("pops up to 4 when more than 4 are queued (FIFO)", () => {
    const q = new MatchmakingQueue();
    for (const id of ["a", "b", "c", "d", "e"]) q.enqueue(id);
    expect(q.tryPopBatch()).toEqual(["a", "b", "c", "d"]);
    expect(q.tryPopBatch()).toBeNull();
    expect(q.has("e")).toBe(true);
  });

  it("sequential joins batch 2 then 2 then 1 waiting", () => {
    const q = new MatchmakingQueue();
    q.enqueue("1");
    expect(q.tryPopBatch()).toBeNull();
    q.enqueue("2");
    expect(q.tryPopBatch()).toEqual(["1", "2"]);
    q.enqueue("3");
    expect(q.tryPopBatch()).toBeNull();
    q.enqueue("4");
    expect(q.tryPopBatch()).toEqual(["3", "4"]);
    q.enqueue("5");
    expect(q.tryPopBatch()).toBeNull();
    expect(q.has("5")).toBe(true);
  });

  it("enqueue is idempotent", () => {
    const q = new MatchmakingQueue();
    q.enqueue("a");
    q.enqueue("a");
    q.enqueue("b");
    expect(q.tryPopBatch()).toEqual(["a", "b"]);
  });

  it("leave removes from queue", () => {
    const q = new MatchmakingQueue();
    q.enqueue("a");
    q.leave("a");
    q.enqueue("b");
    expect(q.tryPopBatch()).toBeNull();
    q.enqueue("c");
    expect(q.tryPopBatch()).toEqual(["b", "c"]);
  });
});

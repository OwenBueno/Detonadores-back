import { describe, it, expect } from "vitest";
import { InMemoryRoomStore } from "./InMemoryRoomStore.js";

describe("InMemoryRoomStore", () => {
  it("list returns empty when no rooms", async () => {
    const store = new InMemoryRoomStore();
    const list = await store.list();
    expect(list).toEqual([]);
  });

  it("create returns room with unique id and creator as host", async () => {
    const store = new InMemoryRoomStore();
    const room = await store.create({
      creatorId: "c-0",
      roomName: "Test",
      maxPlayers: 4,
    });
    expect(room.id).toBeDefined();
    expect(room.name).toBe("Test");
    expect(room.maxPlayers).toBe(4);
    expect(room.status).toBe("waiting");
    expect(room.players).toHaveLength(1);
    expect(room.players[0]).toMatchObject({ id: "c-0", role: "host", ready: false });

    const list = await store.list();
    expect(list).toHaveLength(1);
    expect(list[0]?.id).toBe(room.id);
  });

  it("get returns created room", async () => {
    const store = new InMemoryRoomStore();
    const created = await store.create({ creatorId: "c-0" });
    const room = await store.get(created.id);
    expect(room).not.toBeNull();
    expect(room?.id).toBe(created.id);
    expect(room?.players).toHaveLength(1);
  });

  it("get returns null for unknown room", async () => {
    const store = new InMemoryRoomStore();
    const room = await store.get("unknown");
    expect(room).toBeNull();
  });

  it("addPlayer adds member when room is waiting and not full", async () => {
    const store = new InMemoryRoomStore();
    const created = await store.create({ creatorId: "c-0", maxPlayers: 4 });
    const added = await store.addPlayer(created.id, {
      id: "c-1",
      role: "member",
      ready: false,
    });
    expect(added).toBe(true);
    const room = await store.get(created.id);
    expect(room?.players).toHaveLength(2);
    expect(room?.players?.[1]).toMatchObject({ id: "c-1", role: "member", ready: false });
  });

  it("addPlayer returns false when room is full", async () => {
    const store = new InMemoryRoomStore();
    const created = await store.create({ creatorId: "c-0", maxPlayers: 2 });
    await store.addPlayer(created.id, { id: "c-1", role: "member" });
    const added = await store.addPlayer(created.id, { id: "c-2", role: "member" });
    expect(added).toBe(false);
    const room = await store.get(created.id);
    expect(room?.players).toHaveLength(2);
  });

  it("addPlayer returns false when room not found", async () => {
    const store = new InMemoryRoomStore();
    const added = await store.addPlayer("unknown", { id: "c-1", role: "member" });
    expect(added).toBe(false);
  });

  it("addPlayer returns false when room is not waiting", async () => {
    const store = new InMemoryRoomStore();
    const created = await store.create({ creatorId: "c-0", maxPlayers: 4 });
    const r = await store.get(created.id);
    r!.status = "starting";
    const added = await store.addPlayer(created.id, { id: "c-1", role: "member" });
    expect(added).toBe(false);
  });

  it("removePlayer removes player and deletes room when empty", async () => {
    const store = new InMemoryRoomStore();
    const created = await store.create({ creatorId: "c-0" });
    await store.removePlayer(created.id, "c-0");
    const room = await store.get(created.id);
    expect(room).toBeNull();
    const list = await store.list();
    expect(list).toHaveLength(0);
  });

  it("removePlayer leaves room when other players remain", async () => {
    const store = new InMemoryRoomStore();
    const created = await store.create({ creatorId: "c-0", maxPlayers: 4 });
    await store.addPlayer(created.id, { id: "c-1", role: "member" });
    await store.removePlayer(created.id, "c-1");
    const room = await store.get(created.id);
    expect(room).not.toBeNull();
    expect(room?.players).toHaveLength(1);
    expect(room?.players?.[0]?.id).toBe("c-0");
  });

  it("setPlayerCharacter sets character when room is waiting and character not taken", async () => {
    const store = new InMemoryRoomStore();
    const created = await store.create({ creatorId: "c-0", maxPlayers: 4 });
    const ok = await store.setPlayerCharacter(created.id, "c-0", "char_1");
    expect(ok).toBe(true);
    const room = await store.get(created.id);
    expect(room?.players[0]).toMatchObject({ id: "c-0", characterId: "char_1" });
  });

  it("setPlayerCharacter returns false when character already taken by another", async () => {
    const store = new InMemoryRoomStore();
    const created = await store.create({ creatorId: "c-0", maxPlayers: 4 });
    await store.addPlayer(created.id, { id: "c-1", role: "member" });
    await store.setPlayerCharacter(created.id, "c-0", "char_1");
    const ok = await store.setPlayerCharacter(created.id, "c-1", "char_1");
    expect(ok).toBe(false);
    const room = await store.get(created.id);
    expect(room?.players[1]?.characterId).toBeUndefined();
  });

  it("setPlayerCharacter returns false when room not found", async () => {
    const store = new InMemoryRoomStore();
    const ok = await store.setPlayerCharacter("unknown", "c-0", "char_1");
    expect(ok).toBe(false);
  });

  it("setPlayerCharacter returns false when room is not waiting", async () => {
    const store = new InMemoryRoomStore();
    const created = await store.create({ creatorId: "c-0", maxPlayers: 4 });
    const r = await store.get(created.id);
    r!.status = "starting";
    const ok = await store.setPlayerCharacter(created.id, "c-0", "char_1");
    expect(ok).toBe(false);
  });

  it("setPlayerCharacter clearing character with null works", async () => {
    const store = new InMemoryRoomStore();
    const created = await store.create({ creatorId: "c-0", maxPlayers: 4 });
    await store.setPlayerCharacter(created.id, "c-0", "char_1");
    const ok = await store.setPlayerCharacter(created.id, "c-0", null);
    expect(ok).toBe(true);
    const room = await store.get(created.id);
    expect(room?.players[0]?.characterId).toBeUndefined();
  });

  it("setPlayerCharacter same player re-selecting same character succeeds", async () => {
    const store = new InMemoryRoomStore();
    const created = await store.create({ creatorId: "c-0", maxPlayers: 4 });
    await store.setPlayerCharacter(created.id, "c-0", "char_1");
    const ok = await store.setPlayerCharacter(created.id, "c-0", "char_1");
    expect(ok).toBe(true);
    const room = await store.get(created.id);
    expect(room?.players[0]).toMatchObject({ id: "c-0", characterId: "char_1" });
  });

  it("setPlayerReady sets ready to true when room is waiting and player exists", async () => {
    const store = new InMemoryRoomStore();
    const created = await store.create({ creatorId: "c-0", maxPlayers: 4 });
    const ok = await store.setPlayerReady(created.id, "c-0", true);
    expect(ok).toBe(true);
    const room = await store.get(created.id);
    expect(room?.players[0]?.ready).toBe(true);
  });

  it("setPlayerReady sets ready to false", async () => {
    const store = new InMemoryRoomStore();
    const created = await store.create({ creatorId: "c-0", maxPlayers: 4 });
    await store.setPlayerReady(created.id, "c-0", true);
    const ok = await store.setPlayerReady(created.id, "c-0", false);
    expect(ok).toBe(true);
    const room = await store.get(created.id);
    expect(room?.players[0]?.ready).toBe(false);
  });

  it("setPlayerReady returns false when room not found", async () => {
    const store = new InMemoryRoomStore();
    const ok = await store.setPlayerReady("unknown", "c-0", true);
    expect(ok).toBe(false);
  });

  it("setPlayerReady returns false when room is not waiting", async () => {
    const store = new InMemoryRoomStore();
    const created = await store.create({ creatorId: "c-0", maxPlayers: 4 });
    const r = await store.get(created.id);
    r!.status = "starting";
    const ok = await store.setPlayerReady(created.id, "c-0", true);
    expect(ok).toBe(false);
  });

  it("setPlayerReady returns false when player not in room", async () => {
    const store = new InMemoryRoomStore();
    const created = await store.create({ creatorId: "c-0", maxPlayers: 4 });
    const ok = await store.setPlayerReady(created.id, "c-unknown", true);
    expect(ok).toBe(false);
  });

  it("setRoomStatus updates room status when room exists", async () => {
    const store = new InMemoryRoomStore();
    const created = await store.create({ creatorId: "c-0", maxPlayers: 4 });
    await store.setRoomStatus(created.id, "in_game");
    const room = await store.get(created.id);
    expect(room?.status).toBe("in_game");
  });

  it("deleteRoom removes room regardless of players", async () => {
    const store = new InMemoryRoomStore();
    const created = await store.create({ creatorId: "c-0", maxPlayers: 4 });
    await store.deleteRoom(created.id);
    const room = await store.get(created.id);
    expect(room).toBeNull();
  });
});

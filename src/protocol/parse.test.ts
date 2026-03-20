import { describe, it, expect } from "vitest";
import { parseClientMessage } from "./parse.js";

describe("parseClientMessage", () => {
  it("parses room:start_match with empty payload", () => {
    const msg = parseClientMessage(JSON.stringify({ type: "room:start_match", payload: {} }));
    expect(msg).not.toBeNull();
    expect(msg?.type).toBe("room:start_match");
    expect((msg as { payload: object }).payload).toEqual({});
  });

  it("parses room:start_match with extra payload fields", () => {
    const msg = parseClientMessage(
      JSON.stringify({ type: "room:start_match", payload: { foo: 1 } })
    );
    expect(msg).not.toBeNull();
    expect(msg?.type).toBe("room:start_match");
  });

  it("returns null for invalid JSON", () => {
    expect(parseClientMessage("not json")).toBeNull();
  });

  it("returns null for unknown message type", () => {
    expect(parseClientMessage(JSON.stringify({ type: "unknown", payload: {} }))).toBeNull();
  });
});

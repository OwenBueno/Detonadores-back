import { describe, it, expect } from "vitest";
import { GuestSessionService } from "./GuestSessionService.js";

describe("GuestSessionService", () => {
  it("createGuestSession returns token and guestId", () => {
    const svc = new GuestSessionService();
    const a = svc.createGuestSession();
    expect(a.token.length).toBeGreaterThan(10);
    expect(a.guestId).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
    );
  });

  it("validateToken returns guestId for minted token", () => {
    const svc = new GuestSessionService();
    const { token, guestId } = svc.createGuestSession();
    expect(svc.validateToken(token)).toEqual({ guestId });
  });

  it("validateToken rejects unknown and empty", () => {
    const svc = new GuestSessionService();
    expect(svc.validateToken(undefined)).toBeNull();
    expect(svc.validateToken("")).toBeNull();
    expect(svc.validateToken("not-a-token")).toBeNull();
  });
});

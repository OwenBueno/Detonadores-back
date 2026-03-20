import { randomBytes, randomUUID } from "node:crypto";

type SessionRecord = {
  guestId: string;
  createdAt: number;
};

export class GuestSessionService {
  private sessions = new Map<string, SessionRecord>();

  createGuestSession(): { token: string; guestId: string } {
    const token = randomBytes(32).toString("base64url");
    const guestId = randomUUID();
    this.sessions.set(token, { guestId, createdAt: Date.now() });
    return { token, guestId };
  }

  validateToken(token: string | undefined | null): { guestId: string } | null {
    if (!token || typeof token !== "string") return null;
    const row = this.sessions.get(token);
    if (!row) return null;
    return { guestId: row.guestId };
  }
}

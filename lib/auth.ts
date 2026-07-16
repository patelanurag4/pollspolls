import { createHash } from "crypto";

export const ADMIN_PASSWORD = "Gitanjali.29";
export const SESSION_COOKIE = "pollapp_session";
export const SESSION_TOKEN = createHash("sha256").update(ADMIN_PASSWORD).digest("hex");

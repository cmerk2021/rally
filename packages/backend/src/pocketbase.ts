import PocketBase from "pocketbase";
import { config } from "./config.js";

let pbInstance: PocketBase | null = null;
let lastAuth = 0;

const AUTH_REFRESH_MS = 60 * 60 * 1000;

async function authAsAdmin(pb: PocketBase): Promise<void> {
  // Try the modern superusers collection first, then fall back to legacy admins API
  try {
    await pb
      .collection("_superusers")
      .authWithPassword(
        config.pocketbaseAdminEmail,
        config.pocketbaseAdminPassword,
      );
    return;
  } catch {
    // fall through
  }
  const adminsApi = (pb as unknown as {
    admins?: { authWithPassword: (email: string, password: string) => Promise<unknown> };
  }).admins;
  if (!adminsApi) {
    throw new Error("PocketBase admin auth API not available on this SDK version");
  }
  await adminsApi.authWithPassword(
    config.pocketbaseAdminEmail,
    config.pocketbaseAdminPassword,
  );
}

export async function getPocketBase(): Promise<PocketBase> {
  if (!pbInstance) {
    pbInstance = new PocketBase(config.pocketbaseUrl);
    pbInstance.autoCancellation(false);
  }

  const now = Date.now();
  const needsAuth =
    !pbInstance.authStore.isValid || now - lastAuth > AUTH_REFRESH_MS;

  if (needsAuth) {
    await authAsAdmin(pbInstance);
    lastAuth = now;
  }

  return pbInstance;
}

/** Get a per-request PB client that's auth'd as admin but isolated. */
export async function getAdminClient(): Promise<PocketBase> {
  const pb = await getPocketBase();
  return pb;
}

/** Get a user-scoped PB client by attaching a user auth token. */
export async function getUserClient(authToken: string): Promise<PocketBase> {
  const pb = new PocketBase(config.pocketbaseUrl);
  pb.autoCancellation(false);
  pb.authStore.save(authToken, null);
  return pb;
}

export function resetPocketBase(): void {
  pbInstance = null;
  lastAuth = 0;
}

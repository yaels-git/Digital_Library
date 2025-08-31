

export const redis = {
  isOpen: false,
  async connect() {},
  async get(_key) { return null; },
  async set(_key, _val, _opts) {},
  async del(_key) {},
};

export async function initRedis() {
  console.log("⚠️ Redis not configured; using no-op cache");
}

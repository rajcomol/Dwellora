import { flushPwProjectCleanup } from "./helpers/cleanup";

export default async function globalTeardown(): Promise<void> {
  const deleted = await flushPwProjectCleanup();
  if (deleted > 0) {
    console.log(`[e2e global-teardown] removed ${deleted} PW test project(s).`);
  }
}

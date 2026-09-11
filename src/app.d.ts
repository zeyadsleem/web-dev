/// <reference path="../worker-configuration.d.ts" />
declare global {
  namespace App {
    interface Locals {
      user: { id: string; name: string } | null;
    }
    interface Platform {
      env: Env & { GITHUB_CLIENT_SECRET?: string };
      context: ExecutionContext;
    }
  }
}
export {};

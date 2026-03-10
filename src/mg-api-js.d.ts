declare module "mg-api-js" {
  export default class GeotabApi {
    constructor(
      authentication: {
        credentials: { database: string; userName: string; password?: string; sessionId?: string };
        path?: string;
      },
      options?: { rememberMe?: boolean; timeout?: number; newCredentialStore?: unknown }
    );
    call(method: string, params: Record<string, unknown>): Promise<unknown>;
    multiCall(calls: [string, Record<string, unknown>][]): Promise<unknown[]>;
    authenticate(): Promise<unknown>;
    forget(): Promise<unknown>;
    getSession(): Promise<{ credentials: Record<string, unknown>; path: string }>;
  }
}

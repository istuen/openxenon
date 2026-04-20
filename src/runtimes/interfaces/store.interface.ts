export interface XnStore {
  initialize(path: string): void;

  exec(sql: string, params?: unknown[]): void;

  query<T = unknown>(sql: string, params?: unknown[]): T[];

  transaction<T>(callback: () => T): T;

  close(): void;
}

export interface XnStoreOptions {
  path: string;
  WAL?: boolean;
}
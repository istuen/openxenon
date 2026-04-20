export interface XnSandboxSpawnOptions {
  cwd?: string;
  env?: Record<string, string>;
  timeout?: number;
}

export interface XnSandboxResult {
  exitCode: number | null;
  stdout: string;
  stderr: string;
  wasTimeout: boolean;
}

export interface XnSandbox {
  spawn(
    command: string,
    args: string[],
    options?: XnSandboxSpawnOptions
  ): Promise<XnSandboxResult>;
}
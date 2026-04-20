export interface XnTransportRequestOptions {
  timeoutMs?: number;
}

export interface XnTransport {
  serve(
    path: string,
    onMessage: (data: Buffer) => Buffer | Promise<Buffer>
  ): void;

  request(
    path: string,
    payload: Buffer,
    options?: XnTransportRequestOptions
  ): Promise<Buffer>;

  destroy(): void;
}
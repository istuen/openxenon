export type XnRadarEvent = 'create' | 'modify' | 'delete';

export interface XnRadarWatchOptions {
  debounceMs?: number;
  recursive?: boolean;
}

export interface XnRadar {
  watch(
    path: string,
    callback: (event: XnRadarEvent, filename?: string) => void,
    options?: XnRadarWatchOptions
  ): () => void;
}
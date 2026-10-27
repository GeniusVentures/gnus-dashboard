export type Listener = (payload: unknown) => void;

export interface RequestArgs {
  method: string;
  params?: Record<string, unknown>;
}

export interface Transport {
  request(args: RequestArgs): Promise<unknown>;
  on(event: string, listener: Listener): void;
  removeListener(event: string, listener: Listener): void;
  close(): void;
}

/** The window.gnus surface the wallet injects (contract section 1). */
export interface InjectedProvider {
  isGeniusWallet?: boolean;
  version?: string;
  request(args: RequestArgs): Promise<unknown>;
  on(event: string, listener: Listener): void;
  removeListener(event: string, listener: Listener): void;
}

/** The part of window this layer touches. Tests pass an EventTarget with a gnus property. */
export interface WindowLike {
  gnus?: InjectedProvider;
  addEventListener(type: string, listener: () => void): void;
  removeEventListener(type: string, listener: () => void): void;
}

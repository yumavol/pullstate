interface IBatchState {
    uiBatchFunction: ((updates: () => void) => void);
}
export declare function setupBatch({ uiBatchFunction }: IBatchState): void;
export declare function batch(runUpdates: () => void): void;
export {};

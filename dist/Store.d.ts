import { Draft, Patch, PatchListener } from "immer";
import { DeepKeyOfArray } from "./useStoreStateOpt-types";
export declare type TPullstateUpdateListener = () => void;
export interface IStoreInternalOptions<S extends any> {
    ssr: boolean;
    reactionCreators?: TReactionCreator<S>[];
}
export declare type TUpdateFunction<S> = (draft: Draft<S>, original: S) => void;
declare type TReactionFunction<S extends any, T> = (watched: T, draft: Draft<S>, original: S, previousWatched: T) => void;
declare type TRunReactionFunction = (forceRun?: boolean) => string[];
declare type TReactionCreator<S extends any> = (store: Store<S>) => TRunReactionFunction;
interface ICreateReactionOptions {
    runNow?: boolean;
    runNowWithSideEffects?: boolean;
}
export declare type TStoreActionUpdate<S extends any> = (updater: TUpdateFunction<S> | TUpdateFunction<S>[], patchesCallback?: (patches: Patch[], inversePatches: Patch[]) => void) => void;
export declare type TStoreAction<S extends any> = (update: TStoreActionUpdate<S>) => void;
export declare class Store<S extends any = any> {
    private updateListeners;
    private currentState;
    private readonly initialState;
    private readonly createInitialState;
    private internalOrdId;
    private batchState;
    private ssr;
    private reactions;
    private clientSubscriptions;
    private reactionCreators;
    private optimizedUpdateListeners;
    private optimizedUpdateListenerPaths;
    private optimizedListenerPropertyMap;
    _optListenerCount: number;
    _patchListeners: PatchListener[];
    constructor(initialState: S | (() => S));
    _setInternalOptions({ ssr, reactionCreators }: IStoreInternalOptions<S>): void;
    _getReactionCreators(): TReactionCreator<S>[];
    _instantiateReactions(): void;
    _getInitialState(): S;
    _updateStateWithoutReaction(nextState: S): void;
    _updateState(nextState: S, updateKeyedPaths?: string[]): void;
    _addUpdateListener(listener: TPullstateUpdateListener): void;
    _addUpdateListenerOpt(listener: TPullstateUpdateListener, ordKey: string, paths: DeepKeyOfArray<S>[]): void;
    _removeUpdateListener(listener: TPullstateUpdateListener): void;
    _removeUpdateListenerOpt(ordKey: string): void;
    listenToPatches(patchListener: PatchListener): () => void;
    subscribe<T>(watch: (state: S) => T, listener: (watched: T, allState: S, previousWatched: T) => void): () => void;
    createReaction<T>(watch: (state: S) => T, reaction: TReactionFunction<S, T>, { runNow, runNowWithSideEffects }?: ICreateReactionOptions): () => void;
    getRawState(): S;
    useState(): S;
    useState<SS = any>(getSubState: (state: S) => SS, deps?: ReadonlyArray<any>): SS;
    useLocalCopyInitial(deps?: ReadonlyArray<any>): Store<S>;
    useLocalCopySnapshot(deps?: ReadonlyArray<any>): Store<S>;
    flushBatch(ignoreError?: boolean): void;
    update(updater: TUpdateFunction<S> | TUpdateFunction<S>[], patchesCallback?: (patches: Patch[], inversePatches: Patch[]) => void): void;
    replace(newState: S): void;
    applyPatches(patches: Patch[]): void;
}
export declare function applyPatchesToStore<S extends any = any>(store: Store<S>, patches: Patch[]): void;
export declare function update<S extends any = any>(store: Store<S>, updater: TUpdateFunction<S> | TUpdateFunction<S>[], patchesCallback?: (patches: Patch[], inversePatches: Patch[]) => void): void;
export {};

import React from "react";
import { Store, TUpdateFunction } from "./Store";
import { IAsyncActionRunOptions, ICreateAsyncActionOptions, IOCreateAsyncActionOutput, IPullstateAsyncActionOrdState, IPullstateAsyncCache, IPullstateAsyncResultState, TPullstateAsyncAction, TPullstateAsyncRunResponse } from "./async-types";
export interface IPullstateAllStores {
    [storeName: string]: Store<any>;
}
export declare const PullstateContext: React.Context<PullstateInstance<any> | null>;
export declare const PullstateProvider: <T extends IPullstateAllStores>({ instance, children }: {
    instance: PullstateInstance<T>;
    children?: any;
}) => JSX.Element;
export declare const clientStores: {
    internalClientStores: true;
    stores: IPullstateAllStores;
    loaded: boolean;
};
export declare type TMultiStoreAction<P extends PullstateSingleton<S>, S extends IPullstateAllStores = P extends PullstateSingleton<infer ST> ? ST : any> = (update: TMultiStoreUpdateMap<S>) => void;
interface IPullstateSingletonOptions {
    asyncActions?: {
        defaultCachingSeconds?: number;
    };
}
export declare class PullstateSingleton<S extends IPullstateAllStores = IPullstateAllStores> {
    options: IPullstateSingletonOptions;
    constructor(allStores: S, options?: IPullstateSingletonOptions);
    instantiate({ hydrateSnapshot, ssr, customContext }?: {
        hydrateSnapshot?: IPullstateSnapshot;
        ssr?: boolean;
        customContext?: any;
    }): PullstateInstance<S>;
    useStores(): S;
    useInstance(): PullstateInstance<S>;
    createAsyncActionDirect<A extends any = any, R extends any = any, N extends any = any>(action: (args: A) => Promise<R>, options?: ICreateAsyncActionOptions<A, R, string, N, S>): IOCreateAsyncActionOutput<A, R, string, N, S>;
    createAsyncAction<A = any, R = any, T extends string = string, N extends any = any>(action: TPullstateAsyncAction<A, R, T, N, S>, options?: ICreateAsyncActionOptions<A, R, T, N, S>): IOCreateAsyncActionOutput<A, R, T, N, S>;
}
declare type TMultiStoreUpdateMap<S extends IPullstateAllStores> = {
    [K in keyof S]: (updater: TUpdateFunction<S[K] extends Store<infer T> ? T : any>) => void;
};
interface IPullstateSnapshot {
    allState: {
        [storeName: string]: any;
    };
    asyncResults: IPullstateAsyncResultState;
    asyncActionOrd: IPullstateAsyncActionOrdState;
}
export interface IPullstateInstanceConsumable<T extends IPullstateAllStores = IPullstateAllStores> {
    stores: T;
    hasAsyncStateToResolve(): boolean;
    resolveAsyncState(): Promise<void>;
    getPullstateSnapshot(): IPullstateSnapshot;
    hydrateFromSnapshot(snapshot: IPullstateSnapshot): void;
    runAsyncAction<A, R, X extends string, N>(asyncAction: IOCreateAsyncActionOutput<A, R, X, N, T>, args?: A, runOptions?: Pick<IAsyncActionRunOptions<A, R, X, N, T>, "ignoreShortCircuit" | "respectCache">): TPullstateAsyncRunResponse<R, X, N>;
}
declare class PullstateInstance<T extends IPullstateAllStores = IPullstateAllStores> implements IPullstateInstanceConsumable<T> {
    private _ssr;
    private _customContext;
    private readonly _stores;
    _asyncCache: IPullstateAsyncCache;
    constructor(allStores: T, ssr: boolean, customContext: any);
    private getAllUnresolvedAsyncActions;
    instantiateReactions(): void;
    getPullstateSnapshot(): IPullstateSnapshot;
    resolveAsyncState(): Promise<void>;
    hasAsyncStateToResolve(): boolean;
    get stores(): T;
    get customContext(): any;
    runAsyncAction<A, R, X extends string, N>(asyncAction: IOCreateAsyncActionOutput<A, R, X, N, T>, args?: A, runOptions?: Pick<IAsyncActionRunOptions<A, R, X, N, T>, "ignoreShortCircuit" | "respectCache">): TPullstateAsyncRunResponse<R, X, N>;
    hydrateFromSnapshot(snapshot: IPullstateSnapshot): void;
}
export declare function createPullstateCore<T extends IPullstateAllStores = IPullstateAllStores>(allStores?: T, options?: IPullstateSingletonOptions): PullstateSingleton<T>;
export declare function useStores<T extends IPullstateAllStores = {}>(): T;
export declare function useInstance<T extends IPullstateAllStores = IPullstateAllStores>(): PullstateInstance<T>;
export {};

import { IPullstateAllStores } from "./PullstateCore";
import { EAsyncEndTags, IAsyncActionResultNegative, IAsyncActionResultPositive, ICreateAsyncActionOptions, IOCreateAsyncActionOutput, IPullstateAsyncCache, TPullstateAsyncAction } from "./async-types";
export declare const clientAsyncCache: IPullstateAsyncCache;
export declare function keyFromObject(json: any): string;
export declare function successResult<R, T extends string = string>(payload?: R, tags?: (EAsyncEndTags | T)[], message?: string): IAsyncActionResultPositive<R, T>;
export declare function errorResult<T extends string = string, N = unknown>(tags?: (EAsyncEndTags | T)[], message?: string, errorPayload?: N): IAsyncActionResultNegative<T, N>;
export declare class PullstateAsyncError extends Error {
    tags: string[];
    constructor(message: string, tags: string[]);
}
export declare function createAsyncActionDirect<A extends any = any, R extends any = any, N extends any = any, S extends IPullstateAllStores = IPullstateAllStores>(action: (args: A, stores: S, customContext: any) => Promise<R>, options?: ICreateAsyncActionOptions<A, R, string, N, S>): IOCreateAsyncActionOutput<A, R, string, N, S>;
export declare function createAsyncAction<A = any, R = any, T extends string = string, N extends any = any, S extends IPullstateAllStores = IPullstateAllStores>(action: TPullstateAsyncAction<A, R, T, N, S>, { forceContext, shortCircuitHook, cacheBreakHook, postActionHook, subsetKey, actionId }?: ICreateAsyncActionOptions<A, R, T, N, S>): IOCreateAsyncActionOutput<A, R, T, N, S>;

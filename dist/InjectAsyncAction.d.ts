import React from "react";
import { IAsyncActionBeckonOptions, IAsyncActionWatchOptions, IOCreateAsyncActionOutput, TPullstateAsyncBeckonResponse, TPullstateAsyncWatchResponse } from "./async-types";
import { IPullstateAllStores } from "./PullstateCore";
export declare enum EAsyncActionInjectType {
    WATCH = "watch",
    BECKON = "beckon"
}
interface IPropsInjectAsyncActionBase<A, R, T extends string, N> {
    action: IOCreateAsyncActionOutput<A, R, T, N>;
    args?: A;
}
export interface IPropsInjectAsyncActionBeckon<A = any, R = any, T extends string = string, N = any, S extends IPullstateAllStores = IPullstateAllStores> extends IPropsInjectAsyncActionBase<A, R, T, N> {
    type: EAsyncActionInjectType.BECKON;
    options?: IAsyncActionBeckonOptions<A, R, T, N, S>;
    children: (response: TPullstateAsyncBeckonResponse<R, T>) => React.ReactElement;
}
export interface IPropsInjectAsyncActionWatch<A = any, R = any, T extends string = string, N = any, S extends IPullstateAllStores = IPullstateAllStores> extends IPropsInjectAsyncActionBase<A, R, T, N> {
    type: EAsyncActionInjectType.WATCH;
    children: (response: TPullstateAsyncWatchResponse<R, T, N>) => React.ReactElement;
    options?: IAsyncActionWatchOptions<A, R, T, N, S>;
}
export declare type TInjectAsyncActionProps = IPropsInjectAsyncActionBeckon | IPropsInjectAsyncActionWatch;
export declare function InjectAsyncAction(props: TInjectAsyncActionProps): React.ReactElement;
export {};

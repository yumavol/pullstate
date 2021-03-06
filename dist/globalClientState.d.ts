import { Store } from "./Store";
export declare const globalClientState: {
    storeOrdinal: number;
    batching: boolean;
    flushStores: {
        [storeName: number]: Store;
    };
};

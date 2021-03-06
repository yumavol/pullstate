(function (global, factory) {
  typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports, require('react'), require('immer')) :
  typeof define === 'function' && define.amd ? define(['exports', 'react', 'immer'], factory) :
  (global = typeof globalThis !== 'undefined' ? globalThis : global || self, factory(global.pullstate = {}, global.React, global.immer));
}(this, (function (exports, React, produce) { 'use strict';

  function _interopDefaultLegacy (e) { return e && typeof e === 'object' && 'default' in e ? e : { 'default': e }; }

  var React__default = /*#__PURE__*/_interopDefaultLegacy(React);
  var produce__default = /*#__PURE__*/_interopDefaultLegacy(produce);

  var es6 = function equal(a, b) {
    if (a === b) return true;

    if (a && b && typeof a == 'object' && typeof b == 'object') {
      if (a.constructor !== b.constructor) return false;

      var length, i, keys;
      if (Array.isArray(a)) {
        length = a.length;
        if (length != b.length) return false;
        for (i = length; i-- !== 0;)
          if (!equal(a[i], b[i])) return false;
        return true;
      }


      if ((a instanceof Map) && (b instanceof Map)) {
        if (a.size !== b.size) return false;
        for (i of a.entries())
          if (!b.has(i[0])) return false;
        for (i of a.entries())
          if (!equal(i[1], b.get(i[0]))) return false;
        return true;
      }

      if ((a instanceof Set) && (b instanceof Set)) {
        if (a.size !== b.size) return false;
        for (i of a.entries())
          if (!b.has(i[0])) return false;
        return true;
      }

      if (ArrayBuffer.isView(a) && ArrayBuffer.isView(b)) {
        length = a.length;
        if (length != b.length) return false;
        for (i = length; i-- !== 0;)
          if (a[i] !== b[i]) return false;
        return true;
      }


      if (a.constructor === RegExp) return a.source === b.source && a.flags === b.flags;
      if (a.valueOf !== Object.prototype.valueOf) return a.valueOf() === b.valueOf();
      if (a.toString !== Object.prototype.toString) return a.toString() === b.toString();

      keys = Object.keys(a);
      length = keys.length;
      if (length !== Object.keys(b).length) return false;

      for (i = length; i-- !== 0;)
        if (!Object.prototype.hasOwnProperty.call(b, keys[i])) return false;

      for (i = length; i-- !== 0;) {
        var key = keys[i];

        if (!equal(a[key], b[key])) return false;
      }

      return true;
    }

    // true if both NaN, false otherwise
    return a!==a && b!==b;
  };

  function useStoreState(store, getSubState, deps) {
      const updateRef = React.useRef({ state: undefined, initialized: false });
      if (!updateRef.current.initialized) {
          updateRef.current.state = getSubState ? getSubState(store.getRawState()) : store.getRawState();
          updateRef.current.initialized = true;
      }
      const [, setUpdateTrigger] = React.useState(0);
      React.useEffect(() => {
          const effectState = { shouldUpdate: true };
          function update() {
              if (effectState.shouldUpdate) {
                  const nextSubState = getSubState
                      ? getSubState(store.getRawState())
                      : store.getRawState();
                  if (!es6(updateRef.current.state, nextSubState)) {
                      if (effectState.shouldUpdate) {
                          updateRef.current.state = nextSubState;
                          setUpdateTrigger((val) => val + 1);
                      }
                  }
              }
          }
          store._addUpdateListener(update);
          update();
          return () => {
              effectState.shouldUpdate = false;
              store._removeUpdateListener(update);
          };
      }, deps !== null && deps !== void 0 ? deps : []);
      if (deps !== undefined) {
          const prevDeps = React.useRef(deps);
          if (!es6(deps, prevDeps)) {
              updateRef.current.state = getSubState(store.getRawState());
          }
      }
      return updateRef.current.state;
  }

  let updateListenerOrd = 0;
  function fastGet(obj, path) {
      return path.reduce((cur = obj, key) => {
          return cur[key];
      }, undefined);
  }
  function getSubStateFromPaths(store, paths) {
      const state = store.getRawState();
      const resp = [];
      for (const path of paths) {
          resp.push(fastGet(state, path));
      }
      return resp;
  }
  function useStoreStateOpt(store, paths) {
      const [subState, setSubState] = React.useState(() => getSubStateFromPaths(store, paths));
      const updateRef = React.useRef({
          shouldUpdate: true,
          onStoreUpdate: null,
          currentSubState: null,
          ordKey: `_${updateListenerOrd++}`,
      });
      updateRef.current.currentSubState = subState;
      if (updateRef.current.onStoreUpdate === null) {
          updateRef.current.onStoreUpdate = function onStoreUpdateOpt() {
              if (updateRef.current.shouldUpdate) {
                  setSubState(getSubStateFromPaths(store, paths));
              }
          };
          store._addUpdateListenerOpt(updateRef.current.onStoreUpdate, updateRef.current.ordKey, paths);
      }
      React.useEffect(() => () => {
          updateRef.current.shouldUpdate = false;
          store._removeUpdateListenerOpt(updateRef.current.ordKey);
      }, []);
      return subState;
  }

  function useLocalStore(initialState, deps) {
      const storeRef = React.useRef();
      if (storeRef.current == null) {
          storeRef.current = new Store(initialState);
      }
      if (deps !== undefined) {
          const prevDeps = React.useRef(deps);
          if (!es6(deps, prevDeps)) {
              storeRef.current = new Store(initialState);
          }
      }
      return storeRef.current;
  }

  const globalClientState = {
      storeOrdinal: 0,
      batching: false,
      flushStores: {}
  };

  produce.enablePatches();
  function makeSubscriptionFunction(store, watch, listener) {
      let lastWatchState = watch(store.getRawState());
      return () => {
          const currentState = store.getRawState();
          const nextWatchState = watch(currentState);
          if (!es6(nextWatchState, lastWatchState)) {
              listener(nextWatchState, currentState, lastWatchState);
              lastWatchState = nextWatchState;
          }
      };
  }
  function makeReactionFunctionCreator(watch, reaction) {
      return (store) => {
          let lastWatchState = watch(store.getRawState());
          return (forceRun = false) => {
              const currentState = store.getRawState();
              const nextWatchState = watch(currentState);
              if (forceRun || !es6(nextWatchState, lastWatchState)) {
                  if (store._optListenerCount > 0) {
                      const [nextState, patches, inversePatches] = produce.produceWithPatches(currentState, (s) => reaction(nextWatchState, s, currentState, lastWatchState));
                      store._updateStateWithoutReaction(nextState);
                      lastWatchState = nextWatchState;
                      if (patches.length > 0) {
                          store._patchListeners.forEach((listener) => listener(patches, inversePatches));
                          return Object.keys(getChangedPathsFromPatches(patches));
                      }
                  }
                  else {
                      if (store._patchListeners.length > 0) {
                          const [nextState, patches, inversePatches] = produce.produceWithPatches(currentState, (s) => reaction(nextWatchState, s, currentState, lastWatchState));
                          if (patches.length > 0) {
                              store._patchListeners.forEach((listener) => listener(patches, inversePatches));
                          }
                          store._updateStateWithoutReaction(nextState);
                      }
                      else {
                          store._updateStateWithoutReaction(produce.produce(currentState, (s) => reaction(nextWatchState, s, currentState, lastWatchState)));
                      }
                      lastWatchState = nextWatchState;
                  }
              }
              return [];
          };
      };
  }
  const optPathDivider = "~._.~";
  class Store {
      constructor(initialState) {
          this.updateListeners = [];
          this.ssr = false;
          this.reactions = [];
          this.clientSubscriptions = [];
          this.reactionCreators = [];
          this.optimizedUpdateListeners = {};
          this.optimizedUpdateListenerPaths = {};
          this.optimizedListenerPropertyMap = {};
          this._optListenerCount = 0;
          this._patchListeners = [];
          if (initialState instanceof Function) {
              const state = initialState();
              this.currentState = state;
              this.initialState = state;
              this.createInitialState = initialState;
          }
          else {
              this.currentState = initialState;
              this.initialState = initialState;
              this.createInitialState = () => initialState;
          }
          this.internalOrdId = globalClientState.storeOrdinal++;
      }
      _setInternalOptions({ ssr, reactionCreators = [] }) {
          this.ssr = ssr;
          this.reactionCreators = reactionCreators;
          this.reactions = reactionCreators.map((rc) => rc(this));
      }
      _getReactionCreators() {
          return this.reactionCreators;
      }
      _instantiateReactions() {
          this.reactions = this.reactionCreators.map((rc) => rc(this));
      }
      _getInitialState() {
          return this.createInitialState();
      }
      _updateStateWithoutReaction(nextState) {
          this.currentState = nextState;
      }
      _updateState(nextState, updateKeyedPaths = []) {
          this.currentState = nextState;
          this.batchState = undefined;
          for (const runReaction of this.reactions) {
              updateKeyedPaths.push(...runReaction());
          }
          if (!this.ssr) {
              for (const runSubscription of this.clientSubscriptions) {
                  runSubscription();
              }
              if (updateKeyedPaths.length > 0) {
                  const updateOrds = new Set();
                  for (const keyedPath of updateKeyedPaths) {
                      if (this.optimizedListenerPropertyMap[keyedPath]) {
                          for (const ord of this.optimizedListenerPropertyMap[keyedPath]) {
                              updateOrds.add(ord);
                          }
                      }
                  }
                  for (const ord of updateOrds.values()) {
                      if (this.optimizedUpdateListeners[ord]) {
                          this.optimizedUpdateListeners[ord]();
                      }
                  }
              }
              this.updateListeners.forEach((listener) => listener());
          }
      }
      _addUpdateListener(listener) {
          this.updateListeners.push(listener);
      }
      _addUpdateListenerOpt(listener, ordKey, paths) {
          this.optimizedUpdateListeners[ordKey] = listener;
          const listenerPathsKeyed = paths.map((path) => path.join(optPathDivider));
          this.optimizedUpdateListenerPaths[ordKey] = listenerPathsKeyed;
          for (const keyedPath of listenerPathsKeyed) {
              if (this.optimizedListenerPropertyMap[keyedPath] == null) {
                  this.optimizedListenerPropertyMap[keyedPath] = [ordKey];
              }
              else {
                  this.optimizedListenerPropertyMap[keyedPath].push(ordKey);
              }
          }
          this._optListenerCount++;
      }
      _removeUpdateListener(listener) {
          this.updateListeners = this.updateListeners.filter((f) => f !== listener);
      }
      _removeUpdateListenerOpt(ordKey) {
          const listenerPathsKeyed = this.optimizedUpdateListenerPaths[ordKey];
          for (const keyedPath of listenerPathsKeyed) {
              this.optimizedListenerPropertyMap[keyedPath] = this.optimizedListenerPropertyMap[keyedPath].filter((ord) => ord !== ordKey);
          }
          delete this.optimizedUpdateListenerPaths[ordKey];
          delete this.optimizedUpdateListeners[ordKey];
          this._optListenerCount--;
      }
      listenToPatches(patchListener) {
          this._patchListeners.push(patchListener);
          return () => {
              this._patchListeners = this._patchListeners.filter((f) => f !== patchListener);
          };
      }
      subscribe(watch, listener) {
          if (!this.ssr) {
              const func = makeSubscriptionFunction(this, watch, listener);
              this.clientSubscriptions.push(func);
              return () => {
                  this.clientSubscriptions = this.clientSubscriptions.filter((f) => f !== func);
              };
          }
          return () => {
              console.warn(`Pullstate: Subscriptions made on the server side are not registered - so therefor this call to unsubscribe does nothing.`);
          };
      }
      createReaction(watch, reaction, { runNow = false, runNowWithSideEffects = false } = {}) {
          const creator = makeReactionFunctionCreator(watch, reaction);
          this.reactionCreators.push(creator);
          const func = creator(this);
          this.reactions.push(func);
          if (runNow || runNowWithSideEffects) {
              func(true);
              if (runNowWithSideEffects && !this.ssr) {
                  this._updateState(this.currentState);
              }
          }
          return () => {
              this.reactions = this.reactions.filter((f) => f !== func);
          };
      }
      getRawState() {
          if (this.batchState !== undefined) {
              return this.batchState;
          }
          else {
              return this.currentState;
          }
      }
      useState(getSubState, deps) {
          return useStoreState(this, getSubState, deps);
      }
      useLocalCopyInitial(deps) {
          return useLocalStore(this.createInitialState, deps);
      }
      useLocalCopySnapshot(deps) {
          return useLocalStore(this.currentState, deps);
      }
      flushBatch(ignoreError = false) {
          if (this.batchState !== undefined) {
              if (this.batchState !== this.currentState) {
                  this._updateState(this.batchState);
              }
          }
          else if (!ignoreError) {
              console.error(`Pullstate: Trying to flush batch state which was never created or updated on`);
          }
          this.batchState = undefined;
      }
      update(updater, patchesCallback) {
          if (globalClientState.batching) {
              if (this.batchState === undefined) {
                  this.batchState = this.currentState;
                  globalClientState.flushStores[this.internalOrdId] = this;
              }
              const func = typeof updater === "function";
              const [nextState, patches, inversePatches] = runUpdates(this.batchState, updater, func);
              if (patches.length > 0 && (this._patchListeners.length > 0 || patchesCallback)) {
                  if (patchesCallback) {
                      patchesCallback(patches, inversePatches);
                  }
                  this._patchListeners.forEach((listener) => listener(patches, inversePatches));
              }
              this.batchState = nextState;
          }
          else {
              this.batchState = undefined;
              update(this, updater, patchesCallback);
          }
      }
      replace(newState) {
          this._updateState(newState);
      }
      applyPatches(patches) {
          applyPatchesToStore(this, patches);
      }
  }
  function applyPatchesToStore(store, patches) {
      const currentState = store.getRawState();
      const nextState = produce.applyPatches(currentState, patches);
      if (nextState !== currentState) {
          store._updateState(nextState, Object.keys(getChangedPathsFromPatches(patches)));
      }
  }
  function getChangedPathsFromPatches(changePatches, prev = {}) {
      for (const patch of changePatches) {
          let curKey;
          for (const p of patch.path) {
              if (curKey) {
                  curKey = `${curKey}${optPathDivider}${p}`;
              }
              else {
                  curKey = p;
              }
              prev[curKey] = 1;
          }
      }
      return prev;
  }
  function runUpdates(currentState, updater, func) {
      return func
          ? produce.produceWithPatches(currentState, (s) => updater(s, currentState))
          : updater.reduce(([nextState, patches, inversePatches], currentValue) => {
              const resp = produce.produceWithPatches(nextState, (s) => currentValue(s, nextState));
              patches.push(...resp[1]);
              inversePatches.push(...resp[2]);
              return [resp[0], patches, inversePatches];
          }, [currentState, [], []]);
  }
  function update(store, updater, patchesCallback) {
      const currentState = store.getRawState();
      const func = typeof updater === "function";
      if (store._optListenerCount > 0) {
          const [nextState, patches, inversePatches] = runUpdates(currentState, updater, func);
          if (patches.length > 0) {
              if (patchesCallback) {
                  patchesCallback(patches, inversePatches);
              }
              store._patchListeners.forEach((listener) => listener(patches, inversePatches));
              store._updateState(nextState, Object.keys(getChangedPathsFromPatches(patches)));
          }
      }
      else {
          let nextState;
          if (store._patchListeners.length > 0 || patchesCallback) {
              const [ns, patches, inversePatches] = runUpdates(currentState, updater, func);
              if (patches.length > 0) {
                  if (patchesCallback) {
                      patchesCallback(patches, inversePatches);
                  }
                  store._patchListeners.forEach((listener) => listener(patches, inversePatches));
              }
              nextState = ns;
          }
          else {
              nextState = produce.produce(currentState, (s) => func
                  ? updater(s, currentState)
                  : updater.reduce((previousValue, currentUpdater) => {
                      return produce.produce(previousValue, (s) => currentUpdater(s, previousValue));
                  }, currentState));
          }
          if (nextState !== currentState) {
              store._updateState(nextState);
          }
      }
  }

  function InjectStoreState({ store, on = s => s, children, }) {
      const state = useStoreState(store, on);
      return children(state);
  }

  (function (EAsyncEndTags) {
      EAsyncEndTags["THREW_ERROR"] = "THREW_ERROR";
      EAsyncEndTags["RETURNED_ERROR"] = "RETURNED_ERROR";
      EAsyncEndTags["UNFINISHED"] = "UNFINISHED";
      EAsyncEndTags["DORMANT"] = "DORMANT";
  })(exports.EAsyncEndTags || (exports.EAsyncEndTags = {}));
  (function (EPostActionContext) {
      EPostActionContext["WATCH_HIT_CACHE"] = "WATCH_HIT_CACHE";
      EPostActionContext["BECKON_HIT_CACHE"] = "BECKON_HIT_CACHE";
      EPostActionContext["RUN_HIT_CACHE"] = "RUN_HIT_CACHE";
      EPostActionContext["READ_HIT_CACHE"] = "READ_HIT_CACHE";
      EPostActionContext["READ_RUN"] = "READ_RUN";
      EPostActionContext["SHORT_CIRCUIT"] = "SHORT_CIRCUIT";
      EPostActionContext["DIRECT_RUN"] = "DIRECT_RUN";
      EPostActionContext["BECKON_RUN"] = "BECKON_RUN";
      EPostActionContext["CACHE_UPDATE"] = "CACHE_UPDATE";
  })(exports.EPostActionContext || (exports.EPostActionContext = {}));

  const clientAsyncCache = {
      listeners: {},
      results: {},
      actions: {},
      actionOrd: {}
  };
  let asyncCreationOrdinal = 0;
  function keyFromObject(json) {
      if (json === null) {
          return "(n)";
      }
      const typeOf = typeof json;
      if (typeOf !== "object") {
          if (typeOf === "undefined") {
              return "(u)";
          }
          else if (typeOf === "string") {
              return ":" + json + ";";
          }
          else if (typeOf === "boolean" || typeOf === "number") {
              return "(" + json + ")";
          }
      }
      let prefix = "{";
      for (const key of Object.keys(json).sort()) {
          prefix += key + keyFromObject(json[key]);
      }
      return prefix + "}";
  }
  function notifyListeners(key) {
      if (clientAsyncCache.listeners.hasOwnProperty(key)) {
          for (const watchId of Object.keys(clientAsyncCache.listeners[key])) {
              clientAsyncCache.listeners[key][watchId]();
          }
      }
  }
  function clearActionCache(key, clearPending = true, notify = true) {
      if (clearPending && clientAsyncCache.actionOrd.hasOwnProperty(key)) {
          clientAsyncCache.actionOrd[key] += 1;
      }
      delete clientAsyncCache.results[key];
      if (notify) {
          notifyListeners(key);
      }
  }
  function actionOrdUpdate(cache, key) {
      if (!cache.actionOrd.hasOwnProperty(key)) {
          cache.actionOrd[key] = 0;
      }
      else {
          cache.actionOrd[key] += 1;
      }
      return cache.actionOrd[key];
  }
  function successResult(payload = null, tags = [], message = "") {
      return {
          payload,
          tags,
          message,
          error: false,
          errorPayload: null
      };
  }
  function errorResult(tags = [], message = "", errorPayload) {
      return {
          payload: null,
          tags: [exports.EAsyncEndTags.RETURNED_ERROR, ...tags],
          message,
          error: true,
          errorPayload: errorPayload
      };
  }
  class PullstateAsyncError extends Error {
      constructor(message, tags) {
          super(message);
          this.tags = tags;
      }
  }
  let storeErrorProxy;
  try {
      storeErrorProxy = new Proxy({}, {
          get: function (obj, prop) {
              throw new Error(`Pullstate: Trying to access store (${String(prop)}) inside async actions without the correct usage or setup.
If this error occurred on the server:
* If using run(), make use of your created instance for this request: instance.runAsyncAction()
* If using read(), useWatch(), useBeckon() etc. - make sure you have properly set up your <PullstateProvider/>

If this error occurred on the client:
* Make sure you have created your "pullstateCore" object with all your stores, using createPullstateCore(), and are making use of instantiate() before rendering.`);
          }
      });
  }
  catch {
      storeErrorProxy = {};
  }
  const startedButUnfinishedResult = [
      true,
      false,
      {
          message: "",
          tags: [exports.EAsyncEndTags.UNFINISHED],
          error: true,
          payload: null,
          errorPayload: null
      },
      false,
      -1
  ];
  function createAsyncActionDirect(action, options = {}) {
      return createAsyncAction(async (args, stores, customContext) => {
          return successResult(await action(args, stores, customContext));
      }, options);
  }
  function convertCustomCacheBreakHook(cacheBreakHook) {
      if (cacheBreakHook != null) {
          if (typeof cacheBreakHook === "boolean") {
              return () => cacheBreakHook;
          }
          else if (typeof cacheBreakHook === "number") {
              return ({ timeCached, result }) => {
                  if (!result.error) {
                      return Date.now() - timeCached > cacheBreakHook;
                  }
                  return true;
              };
          }
          return cacheBreakHook;
      }
      return undefined;
  }
  function createAsyncAction(action, { forceContext = false, shortCircuitHook, cacheBreakHook, postActionHook, subsetKey, actionId } = {}) {
      const ordinal = actionId != null ? `_${actionId}` : asyncCreationOrdinal++;
      const onServer = typeof window === "undefined";
      function _createKey(args, customKey) {
          if (customKey != null) {
              return `${ordinal}-c-${customKey}`;
          }
          if (subsetKey !== undefined) {
              return `${ordinal}-${keyFromObject(subsetKey(args))}`;
          }
          return `${ordinal}-${keyFromObject(args)}`;
      }
      const deferWaitingKey = `def_wait_${_createKey({})}`;
      let cacheBreakWatcher = {};
      let watchIdOrd = 0;
      const shouldUpdate = {};
      function runPostActionHook(result, args, stores, context) {
          if (postActionHook !== undefined) {
              postActionHook({ args, result, stores, context });
          }
      }
      function getCachedResult({ args, cache, cacheBreakEnabled, context, fromListener, key, postActionEnabled, stores, customCacheBreak }) {
          const useCacheBreakHook = customCacheBreak !== null && customCacheBreak !== void 0 ? customCacheBreak : cacheBreakHook;
          if (cache.results.hasOwnProperty(key)) {
              const cacheBreakLoop = cacheBreakWatcher.hasOwnProperty(key) && cacheBreakWatcher[key] > 2;
              if (!onServer &&
                  !fromListener &&
                  cacheBreakEnabled &&
                  useCacheBreakHook != null
                  && cache.results[key][1] &&
                  useCacheBreakHook({
                      args,
                      result: cache.results[key][2],
                      stores,
                      timeCached: cache.results[key][4]
                  }) &&
                  !cacheBreakLoop) {
                  if (cacheBreakWatcher.hasOwnProperty(key)) {
                      cacheBreakWatcher[key]++;
                  }
                  else {
                      cacheBreakWatcher[key] = 1;
                  }
                  const previous = cache.results[key];
                  delete cache.results[key];
                  return { cacheBroke: true, response: undefined, previous };
              }
              else {
                  if (cacheBreakLoop) {
                      console.error(`[${key}] Pullstate detected an infinite loop caused by cacheBreakHook()
returning true too often (breaking cache as soon as your action is resolving - hence
causing beckoned actions to run the action again) in one of your AsyncActions - Pullstate prevented
further looping. Fix in your cacheBreakHook() is needed.`);
                  }
                  else {
                      cacheBreakWatcher[key] = 0;
                  }
                  if (postActionEnabled && cache.results[key][1] && !fromListener) {
                      runPostActionHook(cache.results[key][2], args, stores, context);
                  }
                  return {
                      response: cache.results[key],
                      cacheBroke: false,
                      previous: undefined
                  };
              }
          }
          return { cacheBroke: false, response: undefined, previous: undefined };
      }
      function createInternalAction(key, cache, args, stores, currentActionOrd, postActionEnabled, executionContext, customContext) {
          return () => action(args, stores, customContext)
              .then((resp) => {
              if (currentActionOrd === cache.actionOrd[key]) {
                  if (postActionEnabled) {
                      runPostActionHook(resp, args, stores, executionContext);
                  }
                  cache.results[key] = [true, true, resp, false, Date.now()];
              }
              return resp;
          })
              .catch((e) => {
              console.error(e);
              const result = {
                  payload: null,
                  errorPayload: null,
                  error: true,
                  tags: [exports.EAsyncEndTags.THREW_ERROR],
                  message: e.message
              };
              if (currentActionOrd === cache.actionOrd[key]) {
                  if (postActionEnabled) {
                      runPostActionHook(result, args, stores, executionContext);
                  }
                  cache.results[key] = [true, true, result, false, Date.now()];
              }
              return result;
          })
              .then((resp) => {
              if (currentActionOrd === cache.actionOrd[key]) {
                  delete cache.actions[key];
                  if (!onServer) {
                      notifyListeners(key);
                  }
              }
              return resp;
          });
      }
      function checkKeyAndReturnResponse({ key, cache, initiate, ssr, args, stores, fromListener = false, postActionEnabled = true, cacheBreakEnabled = true, holdingResult, customContext, customCacheBreak, holdPrevious }) {
          const cached = getCachedResult({
              key,
              cache,
              args,
              stores,
              context: initiate ? exports.EPostActionContext.BECKON_HIT_CACHE : exports.EPostActionContext.WATCH_HIT_CACHE,
              postActionEnabled,
              cacheBreakEnabled,
              fromListener,
              customCacheBreak
          });
          if (cached.response) {
              return cached.response;
          }
          if (!cache.actions.hasOwnProperty(key)) {
              const currentActionOrd = actionOrdUpdate(cache, key);
              if (initiate) {
                  if (shortCircuitHook !== undefined) {
                      const shortCircuitResponse = shortCircuitHook({ args, stores });
                      if (shortCircuitResponse !== false) {
                          runPostActionHook(shortCircuitResponse, args, stores, exports.EPostActionContext.SHORT_CIRCUIT);
                          cache.results[key] = [true, true, shortCircuitResponse, false, Date.now()];
                          return cache.results[key];
                      }
                  }
                  if (ssr || !onServer) {
                      cache.actions[key] = createInternalAction(key, cache, args, stores, currentActionOrd, postActionEnabled, exports.EPostActionContext.BECKON_RUN, customContext);
                  }
                  if (!onServer) {
                      cache.actions[key]();
                      cache.results[key] = startedButUnfinishedResult;
                  }
                  else {
                      return startedButUnfinishedResult;
                  }
              }
              else {
                  const resp = [
                      false,
                      false,
                      {
                          message: "",
                          tags: [exports.EAsyncEndTags.UNFINISHED],
                          error: true,
                          payload: null,
                          errorPayload: null
                      },
                      false,
                      -1
                  ];
                  if (!onServer) {
                      cache.results[key] = resp;
                  }
                  if (holdPrevious) {
                      if (holdingResult) {
                          const response = [...holdingResult];
                          response[3] = true;
                          return response;
                      }
                      if (cached.previous != null) {
                          const response = [...cached.previous];
                          response[3] = true;
                          return response;
                      }
                  }
                  return resp;
              }
          }
          if (holdPrevious) {
              if (holdingResult) {
                  const response = [...holdingResult];
                  response[3] = true;
                  return response;
              }
              if (cached.previous != null) {
                  const response = [...cached.previous];
                  response[3] = true;
                  return response;
              }
          }
          return startedButUnfinishedResult;
      }
      const read = (args = {}, { cacheBreakEnabled = true, postActionEnabled = true, key: customKey } = {}) => {
          const key = _createKey(args, customKey);
          const cache = onServer ? React.useContext(PullstateContext)._asyncCache : clientAsyncCache;
          let stores;
          let customContext;
          if (onServer || forceContext) {
              const pullstateContext = React.useContext(PullstateContext);
              stores = pullstateContext.stores;
              customContext = pullstateContext.customContext;
          }
          else if (clientStores.loaded) {
              stores = clientStores.stores;
          }
          else {
              stores = storeErrorProxy;
          }
          const cached = getCachedResult({
              key,
              cache,
              args,
              stores,
              context: exports.EPostActionContext.READ_HIT_CACHE,
              postActionEnabled,
              cacheBreakEnabled,
              fromListener: false
          });
          if (cached.response) {
              if (!cached.response[2].error) {
                  return cached.response[2].payload;
              }
              else {
                  throw new PullstateAsyncError(cached.response[2].message, cached.response[2].tags);
              }
          }
          if (!cache.actions.hasOwnProperty(key)) {
              if (shortCircuitHook !== undefined) {
                  const shortCircuitResponse = shortCircuitHook({ args, stores });
                  if (shortCircuitResponse !== false) {
                      runPostActionHook(shortCircuitResponse, args, stores, exports.EPostActionContext.SHORT_CIRCUIT);
                      cache.results[key] = [true, true, shortCircuitResponse, false, Date.now()];
                      if (!shortCircuitResponse.error) {
                          return shortCircuitResponse.payload;
                      }
                      else {
                          throw new PullstateAsyncError(shortCircuitResponse.message, shortCircuitResponse.tags);
                      }
                  }
              }
              const currentActionOrd = actionOrdUpdate(cache, key);
              cache.actions[key] = createInternalAction(key, cache, args, stores, currentActionOrd, postActionEnabled, exports.EPostActionContext.READ_RUN, customContext);
              if (onServer) {
                  throw new Error(`Pullstate Async Action: action.read() : Resolve all async state for Suspense actions before Server-side render ( make use of instance.runAsyncAction() )`);
              }
              throw cache.actions[key]();
          }
          if (onServer) {
              throw new Error(`Pullstate Async Action: action.read() : Resolve all async state for Suspense actions before Server-side render ( make use of instance.runAsyncAction() )`);
          }
          const watchOrd = watchIdOrd++;
          throw new Promise((resolve) => {
              cache.listeners[key][watchOrd] = () => {
                  delete cache.listeners[key][watchOrd];
                  resolve();
              };
          });
      };
      const useWatch = (args = {}, { initiate = false, ssr = true, postActionEnabled = false, cacheBreakEnabled = false, holdPrevious = false, dormant = false, key: customKey, cacheBreak: customCacheBreakIncoming } = {}) => {
          const responseRef = React.useRef();
          const prevKeyRef = React.useRef(".");
          const key = dormant ? "." : _createKey(args, customKey);
          let watchId = React.useRef(-1);
          if (watchId.current === -1) {
              watchId.current = watchIdOrd++;
          }
          if (!dormant) {
              if (!shouldUpdate.hasOwnProperty(key)) {
                  shouldUpdate[key] = {
                      [watchId.current]: true
                  };
              }
              else {
                  shouldUpdate[key][watchId.current] = true;
              }
          }
          const cache = onServer ? React.useContext(PullstateContext)._asyncCache : clientAsyncCache;
          let stores;
          let customContext;
          if (onServer || forceContext) {
              const pullstateContext = React.useContext(PullstateContext);
              stores = pullstateContext.stores;
              customContext = pullstateContext.customContext;
          }
          else if (clientStores.loaded) {
              stores = clientStores.stores;
          }
          else {
              stores = storeErrorProxy;
          }
          if (!onServer) {
              const onAsyncStateChanged = () => {
                  if (shouldUpdate[key][watchId.current] && !es6(responseRef.current, cache.results[key])) {
                      const nextResponse = checkKeyAndReturnResponse({
                          key,
                          cache,
                          initiate,
                          ssr,
                          args,
                          stores,
                          fromListener: true,
                          postActionEnabled,
                          cacheBreakEnabled,
                          holdingResult: undefined,
                          customContext,
                          holdPrevious
                      });
                      if (holdPrevious && !nextResponse[1] && responseRef.current != null && responseRef.current[1]) {
                          responseRef.current = [...responseRef.current];
                          responseRef.current[3] = true;
                      }
                      else {
                          responseRef.current = nextResponse;
                      }
                      setWatchUpdate((prev) => {
                          return prev + 1;
                      });
                  }
              };
              if (!dormant) {
                  if (!cache.listeners.hasOwnProperty(key)) {
                      cache.listeners[key] = {};
                  }
                  cache.listeners[key][watchId.current] = onAsyncStateChanged;
                  shouldUpdate[key][watchId.current] = true;
              }
              React.useEffect(() => {
                  if (!dormant) {
                      cache.listeners[key][watchId.current] = onAsyncStateChanged;
                      shouldUpdate[key][watchId.current] = true;
                  }
                  return () => {
                      if (!dormant) {
                          delete cache.listeners[key][watchId.current];
                          shouldUpdate[key][watchId.current] = false;
                      }
                  };
              }, [key]);
          }
          const [_, setWatchUpdate] = React.useState(0);
          if (dormant) {
              responseRef.current =
                  holdPrevious && responseRef.current && responseRef.current[1]
                      ? responseRef.current
                      : [
                          false,
                          false,
                          {
                              message: "",
                              tags: [exports.EAsyncEndTags.DORMANT],
                              error: true,
                              payload: null
                          },
                          false,
                          -1
                      ];
              prevKeyRef.current = ".";
          }
          else if (prevKeyRef.current !== key) {
              if (prevKeyRef.current !== null && shouldUpdate.hasOwnProperty(prevKeyRef.current)) {
                  delete cache.listeners[prevKeyRef.current][watchId.current];
                  shouldUpdate[prevKeyRef.current][watchId.current] = false;
              }
              prevKeyRef.current = key;
              responseRef.current = checkKeyAndReturnResponse({
                  key,
                  cache,
                  initiate,
                  ssr,
                  args,
                  stores,
                  fromListener: false,
                  postActionEnabled,
                  cacheBreakEnabled,
                  holdingResult: holdPrevious && responseRef.current && responseRef.current[1] ? responseRef.current : undefined,
                  customContext,
                  customCacheBreak: convertCustomCacheBreakHook(customCacheBreakIncoming),
                  holdPrevious
              });
          }
          return responseRef.current;
      };
      const useBeckon = (args = {}, { ssr = true, postActionEnabled = true, cacheBreakEnabled = true, holdPrevious = false, dormant = false, key } = {}) => {
          const result = useWatch(args, {
              initiate: true,
              ssr,
              postActionEnabled,
              cacheBreakEnabled,
              holdPrevious,
              dormant,
              key
          });
          return [result[1], result[2], result[3]];
      };
      const run = async (args = {}, inputs = {}) => {
          const { treatAsUpdate = false, ignoreShortCircuit = false, respectCache = false, key: customKey, _asyncCache = clientAsyncCache, _stores = clientStores.loaded ? clientStores.stores : storeErrorProxy, _customContext, cacheBreak: customCacheBreak } = inputs;
          const key = _createKey(args, customKey);
          if (respectCache) {
              const cached = getCachedResult({
                  key,
                  cache: _asyncCache,
                  args,
                  stores: _stores,
                  context: exports.EPostActionContext.RUN_HIT_CACHE,
                  postActionEnabled: true,
                  cacheBreakEnabled: true,
                  fromListener: false,
                  customCacheBreak: convertCustomCacheBreakHook(customCacheBreak)
              });
              if (cached.response && cached.response[0]) {
                  if (!cached.response[1]) {
                      const watchOrd = watchIdOrd++;
                      if (!_asyncCache.listeners.hasOwnProperty(key)) {
                          _asyncCache.listeners[key] = {};
                      }
                      return new Promise((resolve) => {
                          _asyncCache.listeners[key][watchOrd] = () => {
                              const [, finished, resp] = _asyncCache.results[key];
                              if (finished) {
                                  delete _asyncCache.listeners[key][watchOrd];
                                  resolve(resp);
                              }
                          };
                      });
                  }
                  return cached.response[2];
              }
          }
          if (!ignoreShortCircuit && shortCircuitHook !== undefined) {
              const shortCircuitResponse = shortCircuitHook({ args, stores: _stores });
              if (shortCircuitResponse !== false) {
                  _asyncCache.results[key] = [true, true, shortCircuitResponse, false, Date.now()];
                  runPostActionHook(shortCircuitResponse, args, _stores, exports.EPostActionContext.SHORT_CIRCUIT);
                  notifyListeners(key);
                  return shortCircuitResponse;
              }
          }
          const [, prevFinished, prevResp, prevUpdate, prevCacheTime] = _asyncCache.results[key] || [
              false,
              false,
              {
                  error: true,
                  message: "",
                  payload: null,
                  tags: [exports.EAsyncEndTags.UNFINISHED]
              },
              false,
              -1
          ];
          if (prevFinished && treatAsUpdate) {
              _asyncCache.results[key] = [true, true, prevResp, true, prevCacheTime];
          }
          else {
              _asyncCache.results[key] = [
                  true,
                  false,
                  {
                      error: true,
                      message: "",
                      payload: null,
                      tags: [exports.EAsyncEndTags.UNFINISHED]
                  },
                  false,
                  -1
              ];
          }
          let currentActionOrd = actionOrdUpdate(_asyncCache, key);
          _asyncCache.actions[key] = createInternalAction(key, _asyncCache, args, _stores, currentActionOrd, true, exports.EPostActionContext.DIRECT_RUN, _customContext);
          notifyListeners(key);
          return _asyncCache.actions[key]();
      };
      const clearCache = (args = {}, { key: customKey, notify = true } = {}) => {
          const key = _createKey(args, customKey);
          clearActionCache(key, true, notify);
      };
      const clearAllCache = ({ notify = true } = {}) => {
          for (const key of Object.keys(clientAsyncCache.actionOrd)) {
              if (key.startsWith(`${ordinal}-`)) {
                  clearActionCache(key, true, notify);
              }
          }
      };
      const clearAllUnwatchedCache = ({ notify = true } = {}) => {
          for (const key of Object.keys(shouldUpdate)) {
              if (!Object.values(shouldUpdate[key]).some((su) => su)) {
                  delete shouldUpdate[key];
                  clearActionCache(key, false, notify);
              }
          }
      };
      const setCached = (args, result, options) => {
          const { notify = true, key: customKey } = options || {};
          const key = _createKey(args, customKey);
          const cache = onServer ? React.useContext(PullstateContext)._asyncCache : clientAsyncCache;
          cache.results[key] = [true, true, result, false, Date.now()];
          if (notify) {
              notifyListeners(key);
          }
      };
      const setCachedPayload = (args, payload, options) => {
          return setCached(args, successResult(payload), options);
      };
      const updateCached = (args, updater, options) => {
          const { notify = true, resetTimeCached = true, runPostActionHook: postAction = false, key: customKey } = options || {};
          const key = _createKey(args, customKey);
          const cache = onServer ? React.useContext(PullstateContext)._asyncCache : clientAsyncCache;
          if (cache.results.hasOwnProperty(key) && !cache.results[key][2].error) {
              const currentCached = cache.results[key][2].payload;
              const newResult = {
                  payload: produce__default['default'](currentCached, (s) => updater(s, currentCached)),
                  error: false,
                  message: cache.results[key][2].message,
                  tags: cache.results[key][2].tags
              };
              if (postAction) {
                  runPostActionHook(newResult, args, clientStores.loaded ? clientStores.stores : storeErrorProxy, exports.EPostActionContext.CACHE_UPDATE);
              }
              cache.results[key] = [
                  true,
                  true,
                  newResult,
                  cache.results[key][3],
                  resetTimeCached ? Date.now() : cache.results[key][4]
              ];
              if (notify) {
                  notifyListeners(key);
              }
          }
      };
      const getCached = (args = {}, options) => {
          var _a;
          const { checkCacheBreak = false, key: customKey, cacheBreak: incomingCacheBreak } = options || {};
          const key = _createKey(args, customKey);
          let cacheBreakable = false;
          const cache = clientAsyncCache;
          if (cache.results.hasOwnProperty(key)) {
              const finalizedCacheBreakHook = (_a = convertCustomCacheBreakHook(incomingCacheBreak)) !== null && _a !== void 0 ? _a : cacheBreakHook;
              if (checkCacheBreak && finalizedCacheBreakHook !== undefined) {
                  const stores = onServer
                      ? React.useContext(PullstateContext).stores
                      : clientStores.loaded
                          ? clientStores.stores
                          : storeErrorProxy;
                  if (finalizedCacheBreakHook({
                      args,
                      result: cache.results[key][2],
                      stores,
                      timeCached: cache.results[key][4]
                  })) {
                      cacheBreakable = true;
                  }
              }
              const [started, finished, result, updating, timeCached] = cache.results[key];
              return {
                  started,
                  finished,
                  result: result,
                  existed: true,
                  cacheBreakable,
                  updating,
                  timeCached
              };
          }
          else {
              return {
                  started: false,
                  finished: false,
                  result: {
                      message: "",
                      tags: [exports.EAsyncEndTags.UNFINISHED],
                      error: true,
                      payload: null,
                      errorPayload: null
                  },
                  updating: false,
                  existed: false,
                  cacheBreakable,
                  timeCached: -1
              };
          }
      };
      let delayedRunActionTimeout;
      const delayedRun = (args = {}, { clearOldRun = true, delay, immediateIfCached = true, ...otherRunOptions }) => {
          if (clearOldRun) {
              clearTimeout(delayedRunActionTimeout);
          }
          if (immediateIfCached) {
              const { finished, cacheBreakable } = getCached(args, { checkCacheBreak: true });
              if (finished && !cacheBreakable) {
                  run(args, otherRunOptions);
                  return () => {
                  };
              }
          }
          let ref = { cancelled: false };
          delayedRunActionTimeout = setTimeout(() => {
              if (!ref.cancelled) {
                  run(args, otherRunOptions);
              }
          }, delay);
          return () => {
              ref.cancelled = true;
          };
      };
      const use = (args = {}, { initiate = true, ssr = true, postActionEnabled, cacheBreakEnabled, holdPrevious = false, dormant = false, key, onSuccess, cacheBreak: customCacheBreakHook } = {}) => {
          if (postActionEnabled == null) {
              postActionEnabled = initiate;
          }
          if (cacheBreakEnabled == null) {
              cacheBreakEnabled = initiate;
          }
          const raw = useWatch(args, {
              initiate,
              ssr,
              postActionEnabled,
              cacheBreakEnabled,
              holdPrevious,
              dormant,
              key,
              cacheBreak: customCacheBreakHook
          });
          const [isStarted, isFinished, result, isUpdating] = raw;
          const isSuccess = isFinished && !result.error;
          const isFailure = isFinished && result.error;
          if (onSuccess) {
              React.useEffect(() => {
                  if (isSuccess && !dormant) {
                      onSuccess(result.payload, args);
                  }
              }, [isSuccess]);
          }
          const renderPayload = (func) => {
              if (!result.error) {
                  return func(result.payload);
              }
              return React__default['default'].Fragment;
          };
          return {
              isStarted,
              isFinished,
              isUpdating,
              isSuccess,
              isFailure,
              isLoading: isStarted && (!isFinished || isUpdating),
              endTags: result.tags,
              error: result.error,
              payload: result.payload,
              errorPayload: result.errorPayload,
              renderPayload,
              message: result.message,
              raw,
              execute: (runOptions) => run(args, runOptions),
              clearCached: () => clearCache(args),
              setCached: (response, options) => {
                  setCached(args, response, options);
              },
              setCachedPayload: (payload, options) => {
                  setCachedPayload(args, payload, options);
              },
              updateCached: (updater, options) => {
                  updateCached(args, updater, options);
              }
          };
      };
      const useDefer = (inputs = {}) => {
          const [argState, setArgState] = React.useState(() => ({
              key: inputs.key ? inputs.key : deferWaitingKey,
              args: {}
          }));
          const initialResponse = use({}, {
              ...inputs,
              key: argState.key,
              initiate: false
          });
          const hasCached = (args = {}, options = {}) => {
              var _a, _b;
              const executionKey = (_a = inputs.key) !== null && _a !== void 0 ? _a : _createKey(args);
              const { checkCacheBreak = true, successOnly = false } = options;
              const cached = getCached(args, {
                  key: executionKey,
                  cacheBreak: (_b = options.cacheBreak) !== null && _b !== void 0 ? _b : inputs.cacheBreak,
                  checkCacheBreak
              });
              if (cached.existed) {
                  if (!checkCacheBreak || !cached.cacheBreakable) {
                      return !successOnly || !cached.result.error;
                  }
              }
              return false;
          };
          const unwatchExecuted = () => {
              setArgState({ key: deferWaitingKey, args: {} });
          };
          const execute = (args = {}, runOptions) => {
              var _a;
              const executionKey = (_a = inputs.key) !== null && _a !== void 0 ? _a : _createKey(args);
              if (executionKey !== argState.key) {
                  setArgState({ key: executionKey, args });
              }
              return run(args, {
                  ...runOptions,
                  key: executionKey,
                  cacheBreak: inputs.cacheBreak
              }).then(resp => {
                  if (inputs.clearOnSuccess) {
                      clearCache({}, { key: executionKey });
                  }
                  return resp;
              });
          };
          return {
              ...initialResponse,
              clearCached: () => {
                  clearCache({}, { key: argState.key });
              },
              unwatchExecuted,
              setCached: (response, options = {}) => {
                  options.key = argState.key;
                  setCached({}, response, options);
              },
              setCachedPayload: (payload, options = {}) => {
                  options.key = argState.key;
                  setCachedPayload({}, payload, options);
              },
              updateCached: (updater, options = {}) => {
                  options.key = argState.key;
                  updateCached({}, updater, options);
              },
              useDebouncedExecution: (args, delay, options = {}) => {
                  if (!onServer) {
                      const stateRef = React.useRef({ update: false });
                      const currentValue = React.useRef(undefined);
                      const executionOrd = React.useRef(-1);
                      const timeout = React.useRef(undefined);
                      React.useEffect(() => {
                          stateRef.current.update = true;
                          return () => {
                              stateRef.current.update = false;
                          };
                      }, []);
                      const hasEqualityCheck = options.equality != null;
                      if (hasEqualityCheck) {
                          if (typeof options.equality === "function") {
                              if ((currentValue.current === undefined || options.equality(currentValue.current, args))) {
                                  currentValue.current = args;
                                  executionOrd.current += 1;
                              }
                          }
                          else if (currentValue.current !== options.equality) {
                              currentValue.current = options.equality;
                              executionOrd.current += 1;
                          }
                      }
                      else if (!es6(currentValue.current, args)) {
                          currentValue.current = args;
                          executionOrd.current += 1;
                      }
                      React.useEffect(() => {
                          var _a, _b, _c;
                          clearTimeout(timeout.current);
                          const executeAction = () => {
                              var _a;
                              if (stateRef.current.update) {
                                  execute(args, (_a = options.executeOptions) !== null && _a !== void 0 ? _a : { respectCache: true });
                              }
                          };
                          if ((_b = (_a = options.validInput) === null || _a === void 0 ? void 0 : _a.call(options, args)) !== null && _b !== void 0 ? _b : true) {
                              if (hasCached(args)) {
                                  executeAction();
                              }
                              else {
                                  timeout.current = setTimeout(executeAction, delay);
                              }
                          }
                          else if (!((_c = options.watchLastValid) !== null && _c !== void 0 ? _c : false)) {
                              unwatchExecuted();
                          }
                      }, [executionOrd.current]);
                  }
              },
              hasCached,
              execute,
              args: argState.args,
              key: argState.key
          };
      };
      return {
          use,
          useDefer,
          read,
          useBeckon,
          useWatch,
          run,
          delayedRun,
          clearCache,
          clearAllCache,
          clearAllUnwatchedCache,
          getCached,
          setCached,
          setCachedPayload,
          updateCached
      };
  }

  const PullstateContext = React__default['default'].createContext(null);
  const PullstateProvider = ({ instance, children }) => {
      return React__default['default'].createElement(PullstateContext.Provider, { value: instance }, children);
  };
  let singleton = null;
  const clientStores = {
      internalClientStores: true,
      loaded: false,
      stores: {}
  };
  class PullstateSingleton {
      constructor(allStores, options = {}) {
          this.options = {};
          if (singleton !== null) {
              console.error(`Pullstate: createPullstate() - Should not be creating the core Pullstate class more than once! In order to re-use pull state, you need to call instantiate() on your already created object.`);
          }
          singleton = this;
          clientStores.stores = allStores;
          clientStores.loaded = true;
          this.options = options;
      }
      instantiate({ hydrateSnapshot, ssr = false, customContext } = {}) {
          if (!ssr) {
              const instantiated = new PullstateInstance(clientStores.stores, false, customContext);
              if (hydrateSnapshot != null) {
                  instantiated.hydrateFromSnapshot(hydrateSnapshot);
              }
              instantiated.instantiateReactions();
              return instantiated;
          }
          const newStores = {};
          for (const storeName of Object.keys(clientStores.stores)) {
              if (hydrateSnapshot == null) {
                  newStores[storeName] = new Store(clientStores.stores[storeName]._getInitialState());
              }
              else if (hydrateSnapshot.hasOwnProperty(storeName)) {
                  newStores[storeName] = new Store(hydrateSnapshot.allState[storeName]);
              }
              else {
                  newStores[storeName] = new Store(clientStores.stores[storeName]._getInitialState());
                  console.warn(`Pullstate (instantiate): store [${storeName}] didn't hydrate any state (data was non-existent on hydration object)`);
              }
              newStores[storeName]._setInternalOptions({
                  ssr,
                  reactionCreators: clientStores.stores[storeName]._getReactionCreators()
              });
          }
          return new PullstateInstance(newStores, true, customContext);
      }
      useStores() {
          return useStores();
      }
      useInstance() {
          return useInstance();
      }
      createAsyncActionDirect(action, options = {}) {
          return createAsyncActionDirect(action, options);
      }
      createAsyncAction(action, options = {}) {
          var _a;
          if (((_a = this.options.asyncActions) === null || _a === void 0 ? void 0 : _a.defaultCachingSeconds) && !options.cacheBreakHook) {
              options.cacheBreakHook = (inputs) => inputs.timeCached < Date.now() - this.options.asyncActions.defaultCachingSeconds * 1000;
          }
          return createAsyncAction(action, options);
      }
  }
  class PullstateInstance {
      constructor(allStores, ssr, customContext) {
          this._ssr = false;
          this._stores = {};
          this._asyncCache = {
              listeners: {},
              results: {},
              actions: {},
              actionOrd: {}
          };
          this._stores = allStores;
          this._ssr = ssr;
          this._customContext = customContext;
      }
      getAllUnresolvedAsyncActions() {
          return Object.keys(this._asyncCache.actions).map((key) => this._asyncCache.actions[key]());
      }
      instantiateReactions() {
          for (const storeName of Object.keys(this._stores)) {
              this._stores[storeName]._instantiateReactions();
          }
      }
      getPullstateSnapshot() {
          const allState = {};
          for (const storeName of Object.keys(this._stores)) {
              allState[storeName] = this._stores[storeName].getRawState();
          }
          return { allState, asyncResults: this._asyncCache.results, asyncActionOrd: this._asyncCache.actionOrd };
      }
      async resolveAsyncState() {
          const promises = this.getAllUnresolvedAsyncActions();
          await Promise.all(promises);
      }
      hasAsyncStateToResolve() {
          return Object.keys(this._asyncCache.actions).length > 0;
      }
      get stores() {
          return this._stores;
      }
      get customContext() {
          return this._customContext;
      }
      async runAsyncAction(asyncAction, args = {}, runOptions = {}) {
          if (this._ssr) {
              runOptions._asyncCache = this._asyncCache;
              runOptions._stores = this._stores;
              runOptions._customContext = this._customContext;
          }
          return await asyncAction.run(args, runOptions);
      }
      hydrateFromSnapshot(snapshot) {
          for (const storeName of Object.keys(this._stores)) {
              if (snapshot.allState.hasOwnProperty(storeName)) {
                  this._stores[storeName]._updateStateWithoutReaction(snapshot.allState[storeName]);
              }
              else {
                  console.warn(`${storeName} didn't hydrate any state (data was non-existent on hydration object)`);
              }
          }
          clientAsyncCache.results = snapshot.asyncResults || {};
          clientAsyncCache.actionOrd = snapshot.asyncActionOrd || {};
      }
  }
  function createPullstateCore(allStores = {}, options = {}) {
      return new PullstateSingleton(allStores, options);
  }
  function useStores() {
      return React.useContext(PullstateContext).stores;
  }
  function useInstance() {
      return React.useContext(PullstateContext);
  }

  (function (EAsyncActionInjectType) {
      EAsyncActionInjectType["WATCH"] = "watch";
      EAsyncActionInjectType["BECKON"] = "beckon";
  })(exports.EAsyncActionInjectType || (exports.EAsyncActionInjectType = {}));
  function InjectAsyncAction(props) {
      if (props.type === exports.EAsyncActionInjectType.BECKON) {
          const response = props.action.useBeckon(props.args, props.options);
          return props.children(response);
      }
      const response = props.action.useWatch(props.args, props.options);
      return props.children(response);
  }

  function InjectStoreStateOpt({ store, paths, children }) {
      const state = useStoreStateOpt(store, paths);
      return children(state);
  }

  function registerInDevtools(stores, { namespace = "" } = {}) {
      var _a;
      const devToolsExtension = typeof window !== "undefined" ? (_a = window) === null || _a === void 0 ? void 0 : _a.__REDUX_DEVTOOLS_EXTENSION__ : undefined;
      if (devToolsExtension) {
          for (const key of Object.keys(stores)) {
              const store = stores[key];
              const devTools = devToolsExtension.connect({ name: `${namespace}${key}` });
              devTools.init(store.getRawState());
              let ignoreNext = false;
              store.subscribe((s) => s, (watched) => {
                  if (ignoreNext) {
                      ignoreNext = false;
                      return;
                  }
                  devTools.send("Change", watched);
              });
              devTools.subscribe((message) => {
                  if (message.type === "DISPATCH" && message.state) {
                      ignoreNext = true;
                      const parsed = JSON.parse(message.state);
                      store.replace(parsed);
                  }
              });
          }
      }
  }

  const batchState = {};
  function setupBatch({ uiBatchFunction }) {
      batchState.uiBatchFunction = uiBatchFunction;
  }
  function batch(runUpdates) {
      if (globalClientState.batching) {
          throw new Error("Pullstate: Can't enact two batch() update functions at the same time-\n" +
              "make sure you are not running a batch() inside of a batch() by mistake.");
      }
      globalClientState.batching = true;
      try {
          runUpdates();
      }
      finally {
          if (batchState.uiBatchFunction) {
              batchState.uiBatchFunction(() => {
                  Object.values(globalClientState.flushStores).forEach(store => store.flushBatch(true));
              });
          }
          else {
              Object.values(globalClientState.flushStores).forEach(store => store.flushBatch(true));
          }
          globalClientState.flushStores = {};
          globalClientState.batching = false;
      }
  }

  exports.InjectAsyncAction = InjectAsyncAction;
  exports.InjectStoreState = InjectStoreState;
  exports.InjectStoreStateOpt = InjectStoreStateOpt;
  exports.PullstateContext = PullstateContext;
  exports.PullstateProvider = PullstateProvider;
  exports.Store = Store;
  exports.batch = batch;
  exports.createAsyncAction = createAsyncAction;
  exports.createAsyncActionDirect = createAsyncActionDirect;
  exports.createPullstateCore = createPullstateCore;
  exports.errorResult = errorResult;
  exports.registerInDevtools = registerInDevtools;
  exports.setupBatch = setupBatch;
  exports.successResult = successResult;
  exports.update = update;
  exports.useInstance = useInstance;
  exports.useLocalStore = useLocalStore;
  exports.useStoreState = useStoreState;
  exports.useStoreStateOpt = useStoreStateOpt;
  exports.useStores = useStores;

  Object.defineProperty(exports, '__esModule', { value: true });

})));

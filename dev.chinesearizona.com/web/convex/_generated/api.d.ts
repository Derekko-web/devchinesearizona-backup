/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as hermesThreads from "../hermesThreads.js";
import type * as memories from "../memories.js";
import type * as officePresence from "../officePresence.js";
import type * as scheduledItems from "../scheduledItems.js";
import type * as tasks from "../tasks.js";
import type * as teamMembers from "../teamMembers.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  hermesThreads: typeof hermesThreads;
  memories: typeof memories;
  officePresence: typeof officePresence;
  scheduledItems: typeof scheduledItems;
  tasks: typeof tasks;
  teamMembers: typeof teamMembers;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};

/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as children from "../children.js";
import type * as children_core from "../children/core.js";
import type * as children_helpers from "../children/helpers.js";
import type * as children_inviteTemplate from "../children/inviteTemplate.js";
import type * as children_sharing from "../children/sharing.js";
import type * as emails from "../emails.js";
import type * as emails_admin from "../emails/admin.js";
import type * as emails_auth from "../emails/auth.js";
import type * as emails_queue from "../emails/queue.js";
import type * as jwks from "../jwks.js";
import type * as lib_audit from "../lib/audit.js";
import type * as lib_auth from "../lib/auth.js";
import type * as observability from "../observability.js";
import type * as signLookup from "../signLookup.js";
import type * as signLookup_admin from "../signLookup/admin.js";
import type * as signLookup_auth from "../signLookup/auth.js";
import type * as signLookup_dictionaryBrowse from "../signLookup/dictionaryBrowse.js";
import type * as signLookup_dictionaryCore from "../signLookup/dictionaryCore.js";
import type * as signLookup_governance from "../signLookup/governance.js";
import type * as signLookup_helpers from "../signLookup/helpers.js";
import type * as signLookup_index from "../signLookup/index.js";
import type * as signLookup_mediaFetch from "../signLookup/mediaFetch.js";
import type * as signLookup_mediaScrape from "../signLookup/mediaScrape.js";
import type * as signLookup_search from "../signLookup/search.js";
import type * as signLookup_seed from "../signLookup/seed.js";
import type * as signLookup_seedData from "../signLookup/seedData.js";
import type * as signLookup_types from "../signLookup/types.js";
import type * as signs from "../signs.js";
import type * as signs_analytics from "../signs/analytics.js";
import type * as signs_helpers from "../signs/helpers.js";
import type * as signs_knownCrud from "../signs/knownCrud.js";
import type * as signs_management from "../signs/management.js";
import type * as users from "../users.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  children: typeof children;
  "children/core": typeof children_core;
  "children/helpers": typeof children_helpers;
  "children/inviteTemplate": typeof children_inviteTemplate;
  "children/sharing": typeof children_sharing;
  emails: typeof emails;
  "emails/admin": typeof emails_admin;
  "emails/auth": typeof emails_auth;
  "emails/queue": typeof emails_queue;
  jwks: typeof jwks;
  "lib/audit": typeof lib_audit;
  "lib/auth": typeof lib_auth;
  observability: typeof observability;
  signLookup: typeof signLookup;
  "signLookup/admin": typeof signLookup_admin;
  "signLookup/auth": typeof signLookup_auth;
  "signLookup/dictionaryBrowse": typeof signLookup_dictionaryBrowse;
  "signLookup/dictionaryCore": typeof signLookup_dictionaryCore;
  "signLookup/governance": typeof signLookup_governance;
  "signLookup/helpers": typeof signLookup_helpers;
  "signLookup/index": typeof signLookup_index;
  "signLookup/mediaFetch": typeof signLookup_mediaFetch;
  "signLookup/mediaScrape": typeof signLookup_mediaScrape;
  "signLookup/search": typeof signLookup_search;
  "signLookup/seed": typeof signLookup_seed;
  "signLookup/seedData": typeof signLookup_seedData;
  "signLookup/types": typeof signLookup_types;
  signs: typeof signs;
  "signs/analytics": typeof signs_analytics;
  "signs/helpers": typeof signs_helpers;
  "signs/knownCrud": typeof signs_knownCrud;
  "signs/management": typeof signs_management;
  users: typeof users;
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

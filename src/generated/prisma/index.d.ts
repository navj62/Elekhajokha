
/**
 * Client
**/

import * as runtime from './runtime/client.js';
import $Types = runtime.Types // general types
import $Public = runtime.Types.Public
import $Utils = runtime.Types.Utils
import $Extensions = runtime.Types.Extensions
import $Result = runtime.Types.Result

export type PrismaPromise<T> = $Public.PrismaPromise<T>


/**
 * Model User
 * 
 */
export type User = $Result.DefaultSelection<Prisma.$UserPayload>
/**
 * Model Customer
 * 
 */
export type Customer = $Result.DefaultSelection<Prisma.$CustomerPayload>
/**
 * Model Pledge
 * 
 */
export type Pledge = $Result.DefaultSelection<Prisma.$PledgePayload>
/**
 * Model PledgeItem
 * 
 */
export type PledgeItem = $Result.DefaultSelection<Prisma.$PledgeItemPayload>
/**
 * Model PledgeAudit
 * 
 */
export type PledgeAudit = $Result.DefaultSelection<Prisma.$PledgeAuditPayload>
/**
 * Model MetalPrice
 * 
 */
export type MetalPrice = $Result.DefaultSelection<Prisma.$MetalPricePayload>
/**
 * Model Transaction
 * 
 */
export type Transaction = $Result.DefaultSelection<Prisma.$TransactionPayload>
/**
 * Model ExchangeRate
 * 
 */
export type ExchangeRate = $Result.DefaultSelection<Prisma.$ExchangeRatePayload>

/**
 * Enums
 */
export namespace $Enums {
  export const TransactionType: {
  REPAYMENT_PRINCIPAL: 'REPAYMENT_PRINCIPAL',
  REPAYMENT_INTEREST: 'REPAYMENT_INTEREST',
  TOPUP: 'TOPUP'
};

export type TransactionType = (typeof TransactionType)[keyof typeof TransactionType]


export const Gender: {
  Male: 'Male',
  Female: 'Female',
  Other: 'Other'
};

export type Gender = (typeof Gender)[keyof typeof Gender]


export const AuditAction: {
  CREATED: 'CREATED',
  UPDATED: 'UPDATED',
  RELEASED: 'RELEASED',
  DELETED: 'DELETED',
  RECALCULATED: 'RECALCULATED'
};

export type AuditAction = (typeof AuditAction)[keyof typeof AuditAction]


export const SubscriptionPlan: {
  halfyearly: 'halfyearly',
  yearly: 'yearly'
};

export type SubscriptionPlan = (typeof SubscriptionPlan)[keyof typeof SubscriptionPlan]


export const SubscriptionStatus: {
  trial: 'trial',
  created: 'created',
  active: 'active',
  halted: 'halted',
  expired: 'expired'
};

export type SubscriptionStatus = (typeof SubscriptionStatus)[keyof typeof SubscriptionStatus]


export const ItemType: {
  NECKLACE: 'NECKLACE',
  CHAIN: 'CHAIN',
  RING: 'RING',
  BANGLE: 'BANGLE',
  BRACELET: 'BRACELET',
  EARRING: 'EARRING',
  ANKLET: 'ANKLET',
  PENDANT: 'PENDANT',
  COIN: 'COIN',
  BAR: 'BAR',
  OTHER: 'OTHER'
};

export type ItemType = (typeof ItemType)[keyof typeof ItemType]


export const MetalType: {
  GOLD: 'GOLD',
  SILVER: 'SILVER'
};

export type MetalType = (typeof MetalType)[keyof typeof MetalType]


export const PledgeStatus: {
  ACTIVE: 'ACTIVE',
  RELEASED: 'RELEASED',
  OVERDUE: 'OVERDUE'
};

export type PledgeStatus = (typeof PledgeStatus)[keyof typeof PledgeStatus]


export const CompoundingDuration: {
  MONTHLY: 'MONTHLY',
  HALFYEARLY: 'HALFYEARLY',
  YEARLY: 'YEARLY'
};

export type CompoundingDuration = (typeof CompoundingDuration)[keyof typeof CompoundingDuration]

}

export type TransactionType = $Enums.TransactionType

export const TransactionType: typeof $Enums.TransactionType

export type Gender = $Enums.Gender

export const Gender: typeof $Enums.Gender

export type AuditAction = $Enums.AuditAction

export const AuditAction: typeof $Enums.AuditAction

export type SubscriptionPlan = $Enums.SubscriptionPlan

export const SubscriptionPlan: typeof $Enums.SubscriptionPlan

export type SubscriptionStatus = $Enums.SubscriptionStatus

export const SubscriptionStatus: typeof $Enums.SubscriptionStatus

export type ItemType = $Enums.ItemType

export const ItemType: typeof $Enums.ItemType

export type MetalType = $Enums.MetalType

export const MetalType: typeof $Enums.MetalType

export type PledgeStatus = $Enums.PledgeStatus

export const PledgeStatus: typeof $Enums.PledgeStatus

export type CompoundingDuration = $Enums.CompoundingDuration

export const CompoundingDuration: typeof $Enums.CompoundingDuration

/**
 * ##  Prisma Client ʲˢ
 *
 * Type-safe database client for TypeScript & Node.js
 * @example
 * ```
 * const prisma = new PrismaClient({
 *   adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL })
 * })
 * // Fetch zero or more Users
 * const users = await prisma.user.findMany()
 * ```
 *
 *
 * Read more in our [docs](https://pris.ly/d/client).
 */
export class PrismaClient<
  ClientOptions extends Prisma.PrismaClientOptions = Prisma.PrismaClientOptions,
  const U = 'log' extends keyof ClientOptions ? ClientOptions['log'] extends Array<Prisma.LogLevel | Prisma.LogDefinition> ? Prisma.GetEvents<ClientOptions['log']> : never : never,
  ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs
> {
  [K: symbol]: { types: Prisma.TypeMap<ExtArgs>['other'] }

    /**
   * ##  Prisma Client ʲˢ
   *
   * Type-safe database client for TypeScript & Node.js
   * @example
   * ```
   * const prisma = new PrismaClient({
   *   adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL })
   * })
   * // Fetch zero or more Users
   * const users = await prisma.user.findMany()
   * ```
   *
   *
   * Read more in our [docs](https://pris.ly/d/client).
   */

  constructor(optionsArg ?: Prisma.Subset<ClientOptions, Prisma.PrismaClientOptions>);
  $on<V extends U>(eventType: V, callback: (event: V extends 'query' ? Prisma.QueryEvent : Prisma.LogEvent) => void): PrismaClient;

  /**
   * Connect with the database
   */
  $connect(): $Utils.JsPromise<void>;

  /**
   * Disconnect from the database
   */
  $disconnect(): $Utils.JsPromise<void>;

/**
   * Executes a prepared raw query and returns the number of affected rows.
   * @example
   * ```
   * const result = await prisma.$executeRaw`UPDATE User SET cool = ${true} WHERE email = ${'user@email.com'};`
   * ```
   *
   * Read more in our [docs](https://pris.ly/d/raw-queries).
   */
  $executeRaw<T = unknown>(query: TemplateStringsArray | Prisma.Sql, ...values: any[]): Prisma.PrismaPromise<number>;

  /**
   * Executes a raw query and returns the number of affected rows.
   * Susceptible to SQL injections, see documentation.
   * @example
   * ```
   * const result = await prisma.$executeRawUnsafe('UPDATE User SET cool = $1 WHERE email = $2 ;', true, 'user@email.com')
   * ```
   *
   * Read more in our [docs](https://pris.ly/d/raw-queries).
   */
  $executeRawUnsafe<T = unknown>(query: string, ...values: any[]): Prisma.PrismaPromise<number>;

  /**
   * Performs a prepared raw query and returns the `SELECT` data.
   * @example
   * ```
   * const result = await prisma.$queryRaw`SELECT * FROM User WHERE id = ${1} OR email = ${'user@email.com'};`
   * ```
   *
   * Read more in our [docs](https://pris.ly/d/raw-queries).
   */
  $queryRaw<T = unknown>(query: TemplateStringsArray | Prisma.Sql, ...values: any[]): Prisma.PrismaPromise<T>;

  /**
   * Performs a raw query and returns the `SELECT` data.
   * Susceptible to SQL injections, see documentation.
   * @example
   * ```
   * const result = await prisma.$queryRawUnsafe('SELECT * FROM User WHERE id = $1 OR email = $2;', 1, 'user@email.com')
   * ```
   *
   * Read more in our [docs](https://pris.ly/d/raw-queries).
   */
  $queryRawUnsafe<T = unknown>(query: string, ...values: any[]): Prisma.PrismaPromise<T>;


  /**
   * Allows the running of a sequence of read/write operations that are guaranteed to either succeed or fail as a whole.
   * @example
   * ```
   * const [george, bob, alice] = await prisma.$transaction([
   *   prisma.user.create({ data: { name: 'George' } }),
   *   prisma.user.create({ data: { name: 'Bob' } }),
   *   prisma.user.create({ data: { name: 'Alice' } }),
   * ])
   * ```
   * 
   * Read more in our [docs](https://www.prisma.io/docs/orm/prisma-client/queries/transactions).
   */
  $transaction<P extends Prisma.PrismaPromise<any>[]>(arg: [...P], options?: { isolationLevel?: Prisma.TransactionIsolationLevel }): $Utils.JsPromise<runtime.Types.Utils.UnwrapTuple<P>>

  $transaction<R>(fn: (prisma: Omit<PrismaClient, runtime.ITXClientDenyList>) => $Utils.JsPromise<R>, options?: { maxWait?: number, timeout?: number, isolationLevel?: Prisma.TransactionIsolationLevel }): $Utils.JsPromise<R>

  $extends: $Extensions.ExtendsHook<"extends", Prisma.TypeMapCb<ClientOptions>, ExtArgs, $Utils.Call<Prisma.TypeMapCb<ClientOptions>, {
    extArgs: ExtArgs
  }>>

      /**
   * `prisma.user`: Exposes CRUD operations for the **User** model.
    * Example usage:
    * ```ts
    * // Fetch zero or more Users
    * const users = await prisma.user.findMany()
    * ```
    */
  get user(): Prisma.UserDelegate<ExtArgs, ClientOptions>;

  /**
   * `prisma.customer`: Exposes CRUD operations for the **Customer** model.
    * Example usage:
    * ```ts
    * // Fetch zero or more Customers
    * const customers = await prisma.customer.findMany()
    * ```
    */
  get customer(): Prisma.CustomerDelegate<ExtArgs, ClientOptions>;

  /**
   * `prisma.pledge`: Exposes CRUD operations for the **Pledge** model.
    * Example usage:
    * ```ts
    * // Fetch zero or more Pledges
    * const pledges = await prisma.pledge.findMany()
    * ```
    */
  get pledge(): Prisma.PledgeDelegate<ExtArgs, ClientOptions>;

  /**
   * `prisma.pledgeItem`: Exposes CRUD operations for the **PledgeItem** model.
    * Example usage:
    * ```ts
    * // Fetch zero or more PledgeItems
    * const pledgeItems = await prisma.pledgeItem.findMany()
    * ```
    */
  get pledgeItem(): Prisma.PledgeItemDelegate<ExtArgs, ClientOptions>;

  /**
   * `prisma.pledgeAudit`: Exposes CRUD operations for the **PledgeAudit** model.
    * Example usage:
    * ```ts
    * // Fetch zero or more PledgeAudits
    * const pledgeAudits = await prisma.pledgeAudit.findMany()
    * ```
    */
  get pledgeAudit(): Prisma.PledgeAuditDelegate<ExtArgs, ClientOptions>;

  /**
   * `prisma.metalPrice`: Exposes CRUD operations for the **MetalPrice** model.
    * Example usage:
    * ```ts
    * // Fetch zero or more MetalPrices
    * const metalPrices = await prisma.metalPrice.findMany()
    * ```
    */
  get metalPrice(): Prisma.MetalPriceDelegate<ExtArgs, ClientOptions>;

  /**
   * `prisma.transaction`: Exposes CRUD operations for the **Transaction** model.
    * Example usage:
    * ```ts
    * // Fetch zero or more Transactions
    * const transactions = await prisma.transaction.findMany()
    * ```
    */
  get transaction(): Prisma.TransactionDelegate<ExtArgs, ClientOptions>;

  /**
   * `prisma.exchangeRate`: Exposes CRUD operations for the **ExchangeRate** model.
    * Example usage:
    * ```ts
    * // Fetch zero or more ExchangeRates
    * const exchangeRates = await prisma.exchangeRate.findMany()
    * ```
    */
  get exchangeRate(): Prisma.ExchangeRateDelegate<ExtArgs, ClientOptions>;
}

export namespace Prisma {
  export import DMMF = runtime.DMMF

  export type PrismaPromise<T> = $Public.PrismaPromise<T>

  /**
   * Validator
   */
  export import validator = runtime.Public.validator

  /**
   * Prisma Errors
   */
  export import PrismaClientKnownRequestError = runtime.PrismaClientKnownRequestError
  export import PrismaClientUnknownRequestError = runtime.PrismaClientUnknownRequestError
  export import PrismaClientRustPanicError = runtime.PrismaClientRustPanicError
  export import PrismaClientInitializationError = runtime.PrismaClientInitializationError
  export import PrismaClientValidationError = runtime.PrismaClientValidationError

  /**
   * Re-export of sql-template-tag
   */
  export import sql = runtime.sqltag
  export import empty = runtime.empty
  export import join = runtime.join
  export import raw = runtime.raw
  export import Sql = runtime.Sql



  /**
   * Decimal.js
   */
  export import Decimal = runtime.Decimal

  export type DecimalJsLike = runtime.DecimalJsLike

  /**
  * Extensions
  */
  export import Extension = $Extensions.UserArgs
  export import getExtensionContext = runtime.Extensions.getExtensionContext
  export import Args = $Public.Args
  export import Payload = $Public.Payload
  export import Result = $Public.Result
  export import Exact = $Public.Exact

  /**
   * Prisma Client JS version: 7.5.0
   * Query Engine version: 280c870be64f457428992c43c1f6d557fab6e29e
   */
  export type PrismaVersion = {
    client: string
    engine: string
  }

  export const prismaVersion: PrismaVersion

  /**
   * Utility Types
   */


  export import Bytes = runtime.Bytes
  export import JsonObject = runtime.JsonObject
  export import JsonArray = runtime.JsonArray
  export import JsonValue = runtime.JsonValue
  export import InputJsonObject = runtime.InputJsonObject
  export import InputJsonArray = runtime.InputJsonArray
  export import InputJsonValue = runtime.InputJsonValue

  /**
   * Types of the values used to represent different kinds of `null` values when working with JSON fields.
   *
   * @see https://www.prisma.io/docs/concepts/components/prisma-client/working-with-fields/working-with-json-fields#filtering-on-a-json-field
   */
  namespace NullTypes {
    /**
    * Type of `Prisma.DbNull`.
    *
    * You cannot use other instances of this class. Please use the `Prisma.DbNull` value.
    *
    * @see https://www.prisma.io/docs/concepts/components/prisma-client/working-with-fields/working-with-json-fields#filtering-on-a-json-field
    */
    class DbNull {
      private DbNull: never
      private constructor()
    }

    /**
    * Type of `Prisma.JsonNull`.
    *
    * You cannot use other instances of this class. Please use the `Prisma.JsonNull` value.
    *
    * @see https://www.prisma.io/docs/concepts/components/prisma-client/working-with-fields/working-with-json-fields#filtering-on-a-json-field
    */
    class JsonNull {
      private JsonNull: never
      private constructor()
    }

    /**
    * Type of `Prisma.AnyNull`.
    *
    * You cannot use other instances of this class. Please use the `Prisma.AnyNull` value.
    *
    * @see https://www.prisma.io/docs/concepts/components/prisma-client/working-with-fields/working-with-json-fields#filtering-on-a-json-field
    */
    class AnyNull {
      private AnyNull: never
      private constructor()
    }
  }

  /**
   * Helper for filtering JSON entries that have `null` on the database (empty on the db)
   *
   * @see https://www.prisma.io/docs/concepts/components/prisma-client/working-with-fields/working-with-json-fields#filtering-on-a-json-field
   */
  export const DbNull: NullTypes.DbNull

  /**
   * Helper for filtering JSON entries that have JSON `null` values (not empty on the db)
   *
   * @see https://www.prisma.io/docs/concepts/components/prisma-client/working-with-fields/working-with-json-fields#filtering-on-a-json-field
   */
  export const JsonNull: NullTypes.JsonNull

  /**
   * Helper for filtering JSON entries that are `Prisma.DbNull` or `Prisma.JsonNull`
   *
   * @see https://www.prisma.io/docs/concepts/components/prisma-client/working-with-fields/working-with-json-fields#filtering-on-a-json-field
   */
  export const AnyNull: NullTypes.AnyNull

  type SelectAndInclude = {
    select: any
    include: any
  }

  type SelectAndOmit = {
    select: any
    omit: any
  }

  /**
   * Get the type of the value, that the Promise holds.
   */
  export type PromiseType<T extends PromiseLike<any>> = T extends PromiseLike<infer U> ? U : T;

  /**
   * Get the return type of a function which returns a Promise.
   */
  export type PromiseReturnType<T extends (...args: any) => $Utils.JsPromise<any>> = PromiseType<ReturnType<T>>

  /**
   * From T, pick a set of properties whose keys are in the union K
   */
  type Prisma__Pick<T, K extends keyof T> = {
      [P in K]: T[P];
  };


  export type Enumerable<T> = T | Array<T>;

  export type RequiredKeys<T> = {
    [K in keyof T]-?: {} extends Prisma__Pick<T, K> ? never : K
  }[keyof T]

  export type TruthyKeys<T> = keyof {
    [K in keyof T as T[K] extends false | undefined | null ? never : K]: K
  }

  export type TrueKeys<T> = TruthyKeys<Prisma__Pick<T, RequiredKeys<T>>>

  /**
   * Subset
   * @desc From `T` pick properties that exist in `U`. Simple version of Intersection
   */
  export type Subset<T, U> = {
    [key in keyof T]: key extends keyof U ? T[key] : never;
  };

  /**
   * SelectSubset
   * @desc From `T` pick properties that exist in `U`. Simple version of Intersection.
   * Additionally, it validates, if both select and include are present. If the case, it errors.
   */
  export type SelectSubset<T, U> = {
    [key in keyof T]: key extends keyof U ? T[key] : never
  } &
    (T extends SelectAndInclude
      ? 'Please either choose `select` or `include`.'
      : T extends SelectAndOmit
        ? 'Please either choose `select` or `omit`.'
        : {})

  /**
   * Subset + Intersection
   * @desc From `T` pick properties that exist in `U` and intersect `K`
   */
  export type SubsetIntersection<T, U, K> = {
    [key in keyof T]: key extends keyof U ? T[key] : never
  } &
    K

  type Without<T, U> = { [P in Exclude<keyof T, keyof U>]?: never };

  /**
   * XOR is needed to have a real mutually exclusive union type
   * https://stackoverflow.com/questions/42123407/does-typescript-support-mutually-exclusive-types
   */
  type XOR<T, U> =
    T extends object ?
    U extends object ?
      (Without<T, U> & U) | (Without<U, T> & T)
    : U : T


  /**
   * Is T a Record?
   */
  type IsObject<T extends any> = T extends Array<any>
  ? False
  : T extends Date
  ? False
  : T extends Uint8Array
  ? False
  : T extends BigInt
  ? False
  : T extends object
  ? True
  : False


  /**
   * If it's T[], return T
   */
  export type UnEnumerate<T extends unknown> = T extends Array<infer U> ? U : T

  /**
   * From ts-toolbelt
   */

  type __Either<O extends object, K extends Key> = Omit<O, K> &
    {
      // Merge all but K
      [P in K]: Prisma__Pick<O, P & keyof O> // With K possibilities
    }[K]

  type EitherStrict<O extends object, K extends Key> = Strict<__Either<O, K>>

  type EitherLoose<O extends object, K extends Key> = ComputeRaw<__Either<O, K>>

  type _Either<
    O extends object,
    K extends Key,
    strict extends Boolean
  > = {
    1: EitherStrict<O, K>
    0: EitherLoose<O, K>
  }[strict]

  type Either<
    O extends object,
    K extends Key,
    strict extends Boolean = 1
  > = O extends unknown ? _Either<O, K, strict> : never

  export type Union = any

  type PatchUndefined<O extends object, O1 extends object> = {
    [K in keyof O]: O[K] extends undefined ? At<O1, K> : O[K]
  } & {}

  /** Helper Types for "Merge" **/
  export type IntersectOf<U extends Union> = (
    U extends unknown ? (k: U) => void : never
  ) extends (k: infer I) => void
    ? I
    : never

  export type Overwrite<O extends object, O1 extends object> = {
      [K in keyof O]: K extends keyof O1 ? O1[K] : O[K];
  } & {};

  type _Merge<U extends object> = IntersectOf<Overwrite<U, {
      [K in keyof U]-?: At<U, K>;
  }>>;

  type Key = string | number | symbol;
  type AtBasic<O extends object, K extends Key> = K extends keyof O ? O[K] : never;
  type AtStrict<O extends object, K extends Key> = O[K & keyof O];
  type AtLoose<O extends object, K extends Key> = O extends unknown ? AtStrict<O, K> : never;
  export type At<O extends object, K extends Key, strict extends Boolean = 1> = {
      1: AtStrict<O, K>;
      0: AtLoose<O, K>;
  }[strict];

  export type ComputeRaw<A extends any> = A extends Function ? A : {
    [K in keyof A]: A[K];
  } & {};

  export type OptionalFlat<O> = {
    [K in keyof O]?: O[K];
  } & {};

  type _Record<K extends keyof any, T> = {
    [P in K]: T;
  };

  // cause typescript not to expand types and preserve names
  type NoExpand<T> = T extends unknown ? T : never;

  // this type assumes the passed object is entirely optional
  type AtLeast<O extends object, K extends string> = NoExpand<
    O extends unknown
    ? | (K extends keyof O ? { [P in K]: O[P] } & O : O)
      | {[P in keyof O as P extends K ? P : never]-?: O[P]} & O
    : never>;

  type _Strict<U, _U = U> = U extends unknown ? U & OptionalFlat<_Record<Exclude<Keys<_U>, keyof U>, never>> : never;

  export type Strict<U extends object> = ComputeRaw<_Strict<U>>;
  /** End Helper Types for "Merge" **/

  export type Merge<U extends object> = ComputeRaw<_Merge<Strict<U>>>;

  /**
  A [[Boolean]]
  */
  export type Boolean = True | False

  // /**
  // 1
  // */
  export type True = 1

  /**
  0
  */
  export type False = 0

  export type Not<B extends Boolean> = {
    0: 1
    1: 0
  }[B]

  export type Extends<A1 extends any, A2 extends any> = [A1] extends [never]
    ? 0 // anything `never` is false
    : A1 extends A2
    ? 1
    : 0

  export type Has<U extends Union, U1 extends Union> = Not<
    Extends<Exclude<U1, U>, U1>
  >

  export type Or<B1 extends Boolean, B2 extends Boolean> = {
    0: {
      0: 0
      1: 1
    }
    1: {
      0: 1
      1: 1
    }
  }[B1][B2]

  export type Keys<U extends Union> = U extends unknown ? keyof U : never

  type Cast<A, B> = A extends B ? A : B;

  export const type: unique symbol;



  /**
   * Used by group by
   */

  export type GetScalarType<T, O> = O extends object ? {
    [P in keyof T]: P extends keyof O
      ? O[P]
      : never
  } : never

  type FieldPaths<
    T,
    U = Omit<T, '_avg' | '_sum' | '_count' | '_min' | '_max'>
  > = IsObject<T> extends True ? U : T

  type GetHavingFields<T> = {
    [K in keyof T]: Or<
      Or<Extends<'OR', K>, Extends<'AND', K>>,
      Extends<'NOT', K>
    > extends True
      ? // infer is only needed to not hit TS limit
        // based on the brilliant idea of Pierre-Antoine Mills
        // https://github.com/microsoft/TypeScript/issues/30188#issuecomment-478938437
        T[K] extends infer TK
        ? GetHavingFields<UnEnumerate<TK> extends object ? Merge<UnEnumerate<TK>> : never>
        : never
      : {} extends FieldPaths<T[K]>
      ? never
      : K
  }[keyof T]

  /**
   * Convert tuple to union
   */
  type _TupleToUnion<T> = T extends (infer E)[] ? E : never
  type TupleToUnion<K extends readonly any[]> = _TupleToUnion<K>
  type MaybeTupleToUnion<T> = T extends any[] ? TupleToUnion<T> : T

  /**
   * Like `Pick`, but additionally can also accept an array of keys
   */
  type PickEnumerable<T, K extends Enumerable<keyof T> | keyof T> = Prisma__Pick<T, MaybeTupleToUnion<K>>

  /**
   * Exclude all keys with underscores
   */
  type ExcludeUnderscoreKeys<T extends string> = T extends `_${string}` ? never : T


  export type FieldRef<Model, FieldType> = runtime.FieldRef<Model, FieldType>

  type FieldRefInputType<Model, FieldType> = Model extends never ? never : FieldRef<Model, FieldType>


  export const ModelName: {
    User: 'User',
    Customer: 'Customer',
    Pledge: 'Pledge',
    PledgeItem: 'PledgeItem',
    PledgeAudit: 'PledgeAudit',
    MetalPrice: 'MetalPrice',
    Transaction: 'Transaction',
    ExchangeRate: 'ExchangeRate'
  };

  export type ModelName = (typeof ModelName)[keyof typeof ModelName]



  interface TypeMapCb<ClientOptions = {}> extends $Utils.Fn<{extArgs: $Extensions.InternalArgs }, $Utils.Record<string, any>> {
    returns: Prisma.TypeMap<this['params']['extArgs'], ClientOptions extends { omit: infer OmitOptions } ? OmitOptions : {}>
  }

  export type TypeMap<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> = {
    globalOmitOptions: {
      omit: GlobalOmitOptions
    }
    meta: {
      modelProps: "user" | "customer" | "pledge" | "pledgeItem" | "pledgeAudit" | "metalPrice" | "transaction" | "exchangeRate"
      txIsolationLevel: Prisma.TransactionIsolationLevel
    }
    model: {
      User: {
        payload: Prisma.$UserPayload<ExtArgs>
        fields: Prisma.UserFieldRefs
        operations: {
          findUnique: {
            args: Prisma.UserFindUniqueArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$UserPayload> | null
          }
          findUniqueOrThrow: {
            args: Prisma.UserFindUniqueOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$UserPayload>
          }
          findFirst: {
            args: Prisma.UserFindFirstArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$UserPayload> | null
          }
          findFirstOrThrow: {
            args: Prisma.UserFindFirstOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$UserPayload>
          }
          findMany: {
            args: Prisma.UserFindManyArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$UserPayload>[]
          }
          create: {
            args: Prisma.UserCreateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$UserPayload>
          }
          createMany: {
            args: Prisma.UserCreateManyArgs<ExtArgs>
            result: BatchPayload
          }
          createManyAndReturn: {
            args: Prisma.UserCreateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$UserPayload>[]
          }
          delete: {
            args: Prisma.UserDeleteArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$UserPayload>
          }
          update: {
            args: Prisma.UserUpdateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$UserPayload>
          }
          deleteMany: {
            args: Prisma.UserDeleteManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateMany: {
            args: Prisma.UserUpdateManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateManyAndReturn: {
            args: Prisma.UserUpdateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$UserPayload>[]
          }
          upsert: {
            args: Prisma.UserUpsertArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$UserPayload>
          }
          aggregate: {
            args: Prisma.UserAggregateArgs<ExtArgs>
            result: $Utils.Optional<AggregateUser>
          }
          groupBy: {
            args: Prisma.UserGroupByArgs<ExtArgs>
            result: $Utils.Optional<UserGroupByOutputType>[]
          }
          count: {
            args: Prisma.UserCountArgs<ExtArgs>
            result: $Utils.Optional<UserCountAggregateOutputType> | number
          }
        }
      }
      Customer: {
        payload: Prisma.$CustomerPayload<ExtArgs>
        fields: Prisma.CustomerFieldRefs
        operations: {
          findUnique: {
            args: Prisma.CustomerFindUniqueArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$CustomerPayload> | null
          }
          findUniqueOrThrow: {
            args: Prisma.CustomerFindUniqueOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$CustomerPayload>
          }
          findFirst: {
            args: Prisma.CustomerFindFirstArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$CustomerPayload> | null
          }
          findFirstOrThrow: {
            args: Prisma.CustomerFindFirstOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$CustomerPayload>
          }
          findMany: {
            args: Prisma.CustomerFindManyArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$CustomerPayload>[]
          }
          create: {
            args: Prisma.CustomerCreateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$CustomerPayload>
          }
          createMany: {
            args: Prisma.CustomerCreateManyArgs<ExtArgs>
            result: BatchPayload
          }
          createManyAndReturn: {
            args: Prisma.CustomerCreateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$CustomerPayload>[]
          }
          delete: {
            args: Prisma.CustomerDeleteArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$CustomerPayload>
          }
          update: {
            args: Prisma.CustomerUpdateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$CustomerPayload>
          }
          deleteMany: {
            args: Prisma.CustomerDeleteManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateMany: {
            args: Prisma.CustomerUpdateManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateManyAndReturn: {
            args: Prisma.CustomerUpdateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$CustomerPayload>[]
          }
          upsert: {
            args: Prisma.CustomerUpsertArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$CustomerPayload>
          }
          aggregate: {
            args: Prisma.CustomerAggregateArgs<ExtArgs>
            result: $Utils.Optional<AggregateCustomer>
          }
          groupBy: {
            args: Prisma.CustomerGroupByArgs<ExtArgs>
            result: $Utils.Optional<CustomerGroupByOutputType>[]
          }
          count: {
            args: Prisma.CustomerCountArgs<ExtArgs>
            result: $Utils.Optional<CustomerCountAggregateOutputType> | number
          }
        }
      }
      Pledge: {
        payload: Prisma.$PledgePayload<ExtArgs>
        fields: Prisma.PledgeFieldRefs
        operations: {
          findUnique: {
            args: Prisma.PledgeFindUniqueArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$PledgePayload> | null
          }
          findUniqueOrThrow: {
            args: Prisma.PledgeFindUniqueOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$PledgePayload>
          }
          findFirst: {
            args: Prisma.PledgeFindFirstArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$PledgePayload> | null
          }
          findFirstOrThrow: {
            args: Prisma.PledgeFindFirstOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$PledgePayload>
          }
          findMany: {
            args: Prisma.PledgeFindManyArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$PledgePayload>[]
          }
          create: {
            args: Prisma.PledgeCreateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$PledgePayload>
          }
          createMany: {
            args: Prisma.PledgeCreateManyArgs<ExtArgs>
            result: BatchPayload
          }
          createManyAndReturn: {
            args: Prisma.PledgeCreateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$PledgePayload>[]
          }
          delete: {
            args: Prisma.PledgeDeleteArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$PledgePayload>
          }
          update: {
            args: Prisma.PledgeUpdateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$PledgePayload>
          }
          deleteMany: {
            args: Prisma.PledgeDeleteManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateMany: {
            args: Prisma.PledgeUpdateManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateManyAndReturn: {
            args: Prisma.PledgeUpdateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$PledgePayload>[]
          }
          upsert: {
            args: Prisma.PledgeUpsertArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$PledgePayload>
          }
          aggregate: {
            args: Prisma.PledgeAggregateArgs<ExtArgs>
            result: $Utils.Optional<AggregatePledge>
          }
          groupBy: {
            args: Prisma.PledgeGroupByArgs<ExtArgs>
            result: $Utils.Optional<PledgeGroupByOutputType>[]
          }
          count: {
            args: Prisma.PledgeCountArgs<ExtArgs>
            result: $Utils.Optional<PledgeCountAggregateOutputType> | number
          }
        }
      }
      PledgeItem: {
        payload: Prisma.$PledgeItemPayload<ExtArgs>
        fields: Prisma.PledgeItemFieldRefs
        operations: {
          findUnique: {
            args: Prisma.PledgeItemFindUniqueArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$PledgeItemPayload> | null
          }
          findUniqueOrThrow: {
            args: Prisma.PledgeItemFindUniqueOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$PledgeItemPayload>
          }
          findFirst: {
            args: Prisma.PledgeItemFindFirstArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$PledgeItemPayload> | null
          }
          findFirstOrThrow: {
            args: Prisma.PledgeItemFindFirstOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$PledgeItemPayload>
          }
          findMany: {
            args: Prisma.PledgeItemFindManyArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$PledgeItemPayload>[]
          }
          create: {
            args: Prisma.PledgeItemCreateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$PledgeItemPayload>
          }
          createMany: {
            args: Prisma.PledgeItemCreateManyArgs<ExtArgs>
            result: BatchPayload
          }
          createManyAndReturn: {
            args: Prisma.PledgeItemCreateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$PledgeItemPayload>[]
          }
          delete: {
            args: Prisma.PledgeItemDeleteArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$PledgeItemPayload>
          }
          update: {
            args: Prisma.PledgeItemUpdateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$PledgeItemPayload>
          }
          deleteMany: {
            args: Prisma.PledgeItemDeleteManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateMany: {
            args: Prisma.PledgeItemUpdateManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateManyAndReturn: {
            args: Prisma.PledgeItemUpdateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$PledgeItemPayload>[]
          }
          upsert: {
            args: Prisma.PledgeItemUpsertArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$PledgeItemPayload>
          }
          aggregate: {
            args: Prisma.PledgeItemAggregateArgs<ExtArgs>
            result: $Utils.Optional<AggregatePledgeItem>
          }
          groupBy: {
            args: Prisma.PledgeItemGroupByArgs<ExtArgs>
            result: $Utils.Optional<PledgeItemGroupByOutputType>[]
          }
          count: {
            args: Prisma.PledgeItemCountArgs<ExtArgs>
            result: $Utils.Optional<PledgeItemCountAggregateOutputType> | number
          }
        }
      }
      PledgeAudit: {
        payload: Prisma.$PledgeAuditPayload<ExtArgs>
        fields: Prisma.PledgeAuditFieldRefs
        operations: {
          findUnique: {
            args: Prisma.PledgeAuditFindUniqueArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$PledgeAuditPayload> | null
          }
          findUniqueOrThrow: {
            args: Prisma.PledgeAuditFindUniqueOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$PledgeAuditPayload>
          }
          findFirst: {
            args: Prisma.PledgeAuditFindFirstArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$PledgeAuditPayload> | null
          }
          findFirstOrThrow: {
            args: Prisma.PledgeAuditFindFirstOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$PledgeAuditPayload>
          }
          findMany: {
            args: Prisma.PledgeAuditFindManyArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$PledgeAuditPayload>[]
          }
          create: {
            args: Prisma.PledgeAuditCreateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$PledgeAuditPayload>
          }
          createMany: {
            args: Prisma.PledgeAuditCreateManyArgs<ExtArgs>
            result: BatchPayload
          }
          createManyAndReturn: {
            args: Prisma.PledgeAuditCreateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$PledgeAuditPayload>[]
          }
          delete: {
            args: Prisma.PledgeAuditDeleteArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$PledgeAuditPayload>
          }
          update: {
            args: Prisma.PledgeAuditUpdateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$PledgeAuditPayload>
          }
          deleteMany: {
            args: Prisma.PledgeAuditDeleteManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateMany: {
            args: Prisma.PledgeAuditUpdateManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateManyAndReturn: {
            args: Prisma.PledgeAuditUpdateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$PledgeAuditPayload>[]
          }
          upsert: {
            args: Prisma.PledgeAuditUpsertArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$PledgeAuditPayload>
          }
          aggregate: {
            args: Prisma.PledgeAuditAggregateArgs<ExtArgs>
            result: $Utils.Optional<AggregatePledgeAudit>
          }
          groupBy: {
            args: Prisma.PledgeAuditGroupByArgs<ExtArgs>
            result: $Utils.Optional<PledgeAuditGroupByOutputType>[]
          }
          count: {
            args: Prisma.PledgeAuditCountArgs<ExtArgs>
            result: $Utils.Optional<PledgeAuditCountAggregateOutputType> | number
          }
        }
      }
      MetalPrice: {
        payload: Prisma.$MetalPricePayload<ExtArgs>
        fields: Prisma.MetalPriceFieldRefs
        operations: {
          findUnique: {
            args: Prisma.MetalPriceFindUniqueArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$MetalPricePayload> | null
          }
          findUniqueOrThrow: {
            args: Prisma.MetalPriceFindUniqueOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$MetalPricePayload>
          }
          findFirst: {
            args: Prisma.MetalPriceFindFirstArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$MetalPricePayload> | null
          }
          findFirstOrThrow: {
            args: Prisma.MetalPriceFindFirstOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$MetalPricePayload>
          }
          findMany: {
            args: Prisma.MetalPriceFindManyArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$MetalPricePayload>[]
          }
          create: {
            args: Prisma.MetalPriceCreateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$MetalPricePayload>
          }
          createMany: {
            args: Prisma.MetalPriceCreateManyArgs<ExtArgs>
            result: BatchPayload
          }
          createManyAndReturn: {
            args: Prisma.MetalPriceCreateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$MetalPricePayload>[]
          }
          delete: {
            args: Prisma.MetalPriceDeleteArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$MetalPricePayload>
          }
          update: {
            args: Prisma.MetalPriceUpdateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$MetalPricePayload>
          }
          deleteMany: {
            args: Prisma.MetalPriceDeleteManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateMany: {
            args: Prisma.MetalPriceUpdateManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateManyAndReturn: {
            args: Prisma.MetalPriceUpdateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$MetalPricePayload>[]
          }
          upsert: {
            args: Prisma.MetalPriceUpsertArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$MetalPricePayload>
          }
          aggregate: {
            args: Prisma.MetalPriceAggregateArgs<ExtArgs>
            result: $Utils.Optional<AggregateMetalPrice>
          }
          groupBy: {
            args: Prisma.MetalPriceGroupByArgs<ExtArgs>
            result: $Utils.Optional<MetalPriceGroupByOutputType>[]
          }
          count: {
            args: Prisma.MetalPriceCountArgs<ExtArgs>
            result: $Utils.Optional<MetalPriceCountAggregateOutputType> | number
          }
        }
      }
      Transaction: {
        payload: Prisma.$TransactionPayload<ExtArgs>
        fields: Prisma.TransactionFieldRefs
        operations: {
          findUnique: {
            args: Prisma.TransactionFindUniqueArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$TransactionPayload> | null
          }
          findUniqueOrThrow: {
            args: Prisma.TransactionFindUniqueOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$TransactionPayload>
          }
          findFirst: {
            args: Prisma.TransactionFindFirstArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$TransactionPayload> | null
          }
          findFirstOrThrow: {
            args: Prisma.TransactionFindFirstOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$TransactionPayload>
          }
          findMany: {
            args: Prisma.TransactionFindManyArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$TransactionPayload>[]
          }
          create: {
            args: Prisma.TransactionCreateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$TransactionPayload>
          }
          createMany: {
            args: Prisma.TransactionCreateManyArgs<ExtArgs>
            result: BatchPayload
          }
          createManyAndReturn: {
            args: Prisma.TransactionCreateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$TransactionPayload>[]
          }
          delete: {
            args: Prisma.TransactionDeleteArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$TransactionPayload>
          }
          update: {
            args: Prisma.TransactionUpdateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$TransactionPayload>
          }
          deleteMany: {
            args: Prisma.TransactionDeleteManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateMany: {
            args: Prisma.TransactionUpdateManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateManyAndReturn: {
            args: Prisma.TransactionUpdateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$TransactionPayload>[]
          }
          upsert: {
            args: Prisma.TransactionUpsertArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$TransactionPayload>
          }
          aggregate: {
            args: Prisma.TransactionAggregateArgs<ExtArgs>
            result: $Utils.Optional<AggregateTransaction>
          }
          groupBy: {
            args: Prisma.TransactionGroupByArgs<ExtArgs>
            result: $Utils.Optional<TransactionGroupByOutputType>[]
          }
          count: {
            args: Prisma.TransactionCountArgs<ExtArgs>
            result: $Utils.Optional<TransactionCountAggregateOutputType> | number
          }
        }
      }
      ExchangeRate: {
        payload: Prisma.$ExchangeRatePayload<ExtArgs>
        fields: Prisma.ExchangeRateFieldRefs
        operations: {
          findUnique: {
            args: Prisma.ExchangeRateFindUniqueArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ExchangeRatePayload> | null
          }
          findUniqueOrThrow: {
            args: Prisma.ExchangeRateFindUniqueOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ExchangeRatePayload>
          }
          findFirst: {
            args: Prisma.ExchangeRateFindFirstArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ExchangeRatePayload> | null
          }
          findFirstOrThrow: {
            args: Prisma.ExchangeRateFindFirstOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ExchangeRatePayload>
          }
          findMany: {
            args: Prisma.ExchangeRateFindManyArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ExchangeRatePayload>[]
          }
          create: {
            args: Prisma.ExchangeRateCreateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ExchangeRatePayload>
          }
          createMany: {
            args: Prisma.ExchangeRateCreateManyArgs<ExtArgs>
            result: BatchPayload
          }
          createManyAndReturn: {
            args: Prisma.ExchangeRateCreateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ExchangeRatePayload>[]
          }
          delete: {
            args: Prisma.ExchangeRateDeleteArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ExchangeRatePayload>
          }
          update: {
            args: Prisma.ExchangeRateUpdateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ExchangeRatePayload>
          }
          deleteMany: {
            args: Prisma.ExchangeRateDeleteManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateMany: {
            args: Prisma.ExchangeRateUpdateManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateManyAndReturn: {
            args: Prisma.ExchangeRateUpdateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ExchangeRatePayload>[]
          }
          upsert: {
            args: Prisma.ExchangeRateUpsertArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ExchangeRatePayload>
          }
          aggregate: {
            args: Prisma.ExchangeRateAggregateArgs<ExtArgs>
            result: $Utils.Optional<AggregateExchangeRate>
          }
          groupBy: {
            args: Prisma.ExchangeRateGroupByArgs<ExtArgs>
            result: $Utils.Optional<ExchangeRateGroupByOutputType>[]
          }
          count: {
            args: Prisma.ExchangeRateCountArgs<ExtArgs>
            result: $Utils.Optional<ExchangeRateCountAggregateOutputType> | number
          }
        }
      }
    }
  } & {
    other: {
      payload: any
      operations: {
        $executeRaw: {
          args: [query: TemplateStringsArray | Prisma.Sql, ...values: any[]],
          result: any
        }
        $executeRawUnsafe: {
          args: [query: string, ...values: any[]],
          result: any
        }
        $queryRaw: {
          args: [query: TemplateStringsArray | Prisma.Sql, ...values: any[]],
          result: any
        }
        $queryRawUnsafe: {
          args: [query: string, ...values: any[]],
          result: any
        }
      }
    }
  }
  export const defineExtension: $Extensions.ExtendsHook<"define", Prisma.TypeMapCb, $Extensions.DefaultArgs>
  export type DefaultPrismaClient = PrismaClient
  export type ErrorFormat = 'pretty' | 'colorless' | 'minimal'
  export interface PrismaClientOptions {
    /**
     * @default "colorless"
     */
    errorFormat?: ErrorFormat
    /**
     * @example
     * ```
     * // Shorthand for `emit: 'stdout'`
     * log: ['query', 'info', 'warn', 'error']
     * 
     * // Emit as events only
     * log: [
     *   { emit: 'event', level: 'query' },
     *   { emit: 'event', level: 'info' },
     *   { emit: 'event', level: 'warn' }
     *   { emit: 'event', level: 'error' }
     * ]
     * 
     * / Emit as events and log to stdout
     * og: [
     *  { emit: 'stdout', level: 'query' },
     *  { emit: 'stdout', level: 'info' },
     *  { emit: 'stdout', level: 'warn' }
     *  { emit: 'stdout', level: 'error' }
     * 
     * ```
     * Read more in our [docs](https://pris.ly/d/logging).
     */
    log?: (LogLevel | LogDefinition)[]
    /**
     * The default values for transactionOptions
     * maxWait ?= 2000
     * timeout ?= 5000
     */
    transactionOptions?: {
      maxWait?: number
      timeout?: number
      isolationLevel?: Prisma.TransactionIsolationLevel
    }
    /**
     * Instance of a Driver Adapter, e.g., like one provided by `@prisma/adapter-planetscale`
     */
    adapter?: runtime.SqlDriverAdapterFactory
    /**
     * Prisma Accelerate URL allowing the client to connect through Accelerate instead of a direct database.
     */
    accelerateUrl?: string
    /**
     * Global configuration for omitting model fields by default.
     * 
     * @example
     * ```
     * const prisma = new PrismaClient({
     *   omit: {
     *     user: {
     *       password: true
     *     }
     *   }
     * })
     * ```
     */
    omit?: Prisma.GlobalOmitConfig
    /**
     * SQL commenter plugins that add metadata to SQL queries as comments.
     * Comments follow the sqlcommenter format: https://google.github.io/sqlcommenter/
     * 
     * @example
     * ```
     * const prisma = new PrismaClient({
     *   adapter,
     *   comments: [
     *     traceContext(),
     *     queryInsights(),
     *   ],
     * })
     * ```
     */
    comments?: runtime.SqlCommenterPlugin[]
  }
  export type GlobalOmitConfig = {
    user?: UserOmit
    customer?: CustomerOmit
    pledge?: PledgeOmit
    pledgeItem?: PledgeItemOmit
    pledgeAudit?: PledgeAuditOmit
    metalPrice?: MetalPriceOmit
    transaction?: TransactionOmit
    exchangeRate?: ExchangeRateOmit
  }

  /* Types for Logging */
  export type LogLevel = 'info' | 'query' | 'warn' | 'error'
  export type LogDefinition = {
    level: LogLevel
    emit: 'stdout' | 'event'
  }

  export type CheckIsLogLevel<T> = T extends LogLevel ? T : never;

  export type GetLogType<T> = CheckIsLogLevel<
    T extends LogDefinition ? T['level'] : T
  >;

  export type GetEvents<T extends any[]> = T extends Array<LogLevel | LogDefinition>
    ? GetLogType<T[number]>
    : never;

  export type QueryEvent = {
    timestamp: Date
    query: string
    params: string
    duration: number
    target: string
  }

  export type LogEvent = {
    timestamp: Date
    message: string
    target: string
  }
  /* End Types for Logging */


  export type PrismaAction =
    | 'findUnique'
    | 'findUniqueOrThrow'
    | 'findMany'
    | 'findFirst'
    | 'findFirstOrThrow'
    | 'create'
    | 'createMany'
    | 'createManyAndReturn'
    | 'update'
    | 'updateMany'
    | 'updateManyAndReturn'
    | 'upsert'
    | 'delete'
    | 'deleteMany'
    | 'executeRaw'
    | 'queryRaw'
    | 'aggregate'
    | 'count'
    | 'runCommandRaw'
    | 'findRaw'
    | 'groupBy'

  // tested in getLogLevel.test.ts
  export function getLogLevel(log: Array<LogLevel | LogDefinition>): LogLevel | undefined;

  /**
   * `PrismaClient` proxy available in interactive transactions.
   */
  export type TransactionClient = Omit<Prisma.DefaultPrismaClient, runtime.ITXClientDenyList>

  export type Datasource = {
    url?: string
  }

  /**
   * Count Types
   */


  /**
   * Count Type UserCountOutputType
   */

  export type UserCountOutputType = {
    customers: number
  }

  export type UserCountOutputTypeSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    customers?: boolean | UserCountOutputTypeCountCustomersArgs
  }

  // Custom InputTypes
  /**
   * UserCountOutputType without action
   */
  export type UserCountOutputTypeDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the UserCountOutputType
     */
    select?: UserCountOutputTypeSelect<ExtArgs> | null
  }

  /**
   * UserCountOutputType without action
   */
  export type UserCountOutputTypeCountCustomersArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: CustomerWhereInput
  }


  /**
   * Count Type CustomerCountOutputType
   */

  export type CustomerCountOutputType = {
    pledges: number
  }

  export type CustomerCountOutputTypeSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    pledges?: boolean | CustomerCountOutputTypeCountPledgesArgs
  }

  // Custom InputTypes
  /**
   * CustomerCountOutputType without action
   */
  export type CustomerCountOutputTypeDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the CustomerCountOutputType
     */
    select?: CustomerCountOutputTypeSelect<ExtArgs> | null
  }

  /**
   * CustomerCountOutputType without action
   */
  export type CustomerCountOutputTypeCountPledgesArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: PledgeWhereInput
  }


  /**
   * Count Type PledgeCountOutputType
   */

  export type PledgeCountOutputType = {
    pledgeAudits: number
    items: number
    transactions: number
  }

  export type PledgeCountOutputTypeSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    pledgeAudits?: boolean | PledgeCountOutputTypeCountPledgeAuditsArgs
    items?: boolean | PledgeCountOutputTypeCountItemsArgs
    transactions?: boolean | PledgeCountOutputTypeCountTransactionsArgs
  }

  // Custom InputTypes
  /**
   * PledgeCountOutputType without action
   */
  export type PledgeCountOutputTypeDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the PledgeCountOutputType
     */
    select?: PledgeCountOutputTypeSelect<ExtArgs> | null
  }

  /**
   * PledgeCountOutputType without action
   */
  export type PledgeCountOutputTypeCountPledgeAuditsArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: PledgeAuditWhereInput
  }

  /**
   * PledgeCountOutputType without action
   */
  export type PledgeCountOutputTypeCountItemsArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: PledgeItemWhereInput
  }

  /**
   * PledgeCountOutputType without action
   */
  export type PledgeCountOutputTypeCountTransactionsArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: TransactionWhereInput
  }


  /**
   * Models
   */

  /**
   * Model User
   */

  export type AggregateUser = {
    _count: UserCountAggregateOutputType | null
    _min: UserMinAggregateOutputType | null
    _max: UserMaxAggregateOutputType | null
  }

  export type UserMinAggregateOutputType = {
    id: string | null
    clerkUserId: string | null
    username: string | null
    email: string | null
    mobile: string | null
    firstName: string | null
    lastName: string | null
    shopName: string | null
    address: string | null
    gender: $Enums.Gender | null
    profileImageUrl: string | null
    subscriptionStatus: $Enums.SubscriptionStatus | null
    subscriptionEndDate: Date | null
    razorpaySubscriptionId: string | null
    subscriptionPlan: $Enums.SubscriptionPlan | null
    razorpayPaymentId: string | null
    subscriptionCreatedAt: Date | null
    hadTrial: boolean | null
    isActive: boolean | null
    lastLoginAt: Date | null
    deletedAt: Date | null
    createdAt: Date | null
    updatedAt: Date | null
  }

  export type UserMaxAggregateOutputType = {
    id: string | null
    clerkUserId: string | null
    username: string | null
    email: string | null
    mobile: string | null
    firstName: string | null
    lastName: string | null
    shopName: string | null
    address: string | null
    gender: $Enums.Gender | null
    profileImageUrl: string | null
    subscriptionStatus: $Enums.SubscriptionStatus | null
    subscriptionEndDate: Date | null
    razorpaySubscriptionId: string | null
    subscriptionPlan: $Enums.SubscriptionPlan | null
    razorpayPaymentId: string | null
    subscriptionCreatedAt: Date | null
    hadTrial: boolean | null
    isActive: boolean | null
    lastLoginAt: Date | null
    deletedAt: Date | null
    createdAt: Date | null
    updatedAt: Date | null
  }

  export type UserCountAggregateOutputType = {
    id: number
    clerkUserId: number
    username: number
    email: number
    mobile: number
    firstName: number
    lastName: number
    shopName: number
    address: number
    gender: number
    profileImageUrl: number
    subscriptionStatus: number
    subscriptionEndDate: number
    razorpaySubscriptionId: number
    subscriptionPlan: number
    razorpayPaymentId: number
    subscriptionCreatedAt: number
    hadTrial: number
    isActive: number
    lastLoginAt: number
    deletedAt: number
    createdAt: number
    updatedAt: number
    _all: number
  }


  export type UserMinAggregateInputType = {
    id?: true
    clerkUserId?: true
    username?: true
    email?: true
    mobile?: true
    firstName?: true
    lastName?: true
    shopName?: true
    address?: true
    gender?: true
    profileImageUrl?: true
    subscriptionStatus?: true
    subscriptionEndDate?: true
    razorpaySubscriptionId?: true
    subscriptionPlan?: true
    razorpayPaymentId?: true
    subscriptionCreatedAt?: true
    hadTrial?: true
    isActive?: true
    lastLoginAt?: true
    deletedAt?: true
    createdAt?: true
    updatedAt?: true
  }

  export type UserMaxAggregateInputType = {
    id?: true
    clerkUserId?: true
    username?: true
    email?: true
    mobile?: true
    firstName?: true
    lastName?: true
    shopName?: true
    address?: true
    gender?: true
    profileImageUrl?: true
    subscriptionStatus?: true
    subscriptionEndDate?: true
    razorpaySubscriptionId?: true
    subscriptionPlan?: true
    razorpayPaymentId?: true
    subscriptionCreatedAt?: true
    hadTrial?: true
    isActive?: true
    lastLoginAt?: true
    deletedAt?: true
    createdAt?: true
    updatedAt?: true
  }

  export type UserCountAggregateInputType = {
    id?: true
    clerkUserId?: true
    username?: true
    email?: true
    mobile?: true
    firstName?: true
    lastName?: true
    shopName?: true
    address?: true
    gender?: true
    profileImageUrl?: true
    subscriptionStatus?: true
    subscriptionEndDate?: true
    razorpaySubscriptionId?: true
    subscriptionPlan?: true
    razorpayPaymentId?: true
    subscriptionCreatedAt?: true
    hadTrial?: true
    isActive?: true
    lastLoginAt?: true
    deletedAt?: true
    createdAt?: true
    updatedAt?: true
    _all?: true
  }

  export type UserAggregateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which User to aggregate.
     */
    where?: UserWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Users to fetch.
     */
    orderBy?: UserOrderByWithRelationInput | UserOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the start position
     */
    cursor?: UserWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Users from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Users.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Count returned Users
    **/
    _count?: true | UserCountAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the minimum value
    **/
    _min?: UserMinAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the maximum value
    **/
    _max?: UserMaxAggregateInputType
  }

  export type GetUserAggregateType<T extends UserAggregateArgs> = {
        [P in keyof T & keyof AggregateUser]: P extends '_count' | 'count'
      ? T[P] extends true
        ? number
        : GetScalarType<T[P], AggregateUser[P]>
      : GetScalarType<T[P], AggregateUser[P]>
  }




  export type UserGroupByArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: UserWhereInput
    orderBy?: UserOrderByWithAggregationInput | UserOrderByWithAggregationInput[]
    by: UserScalarFieldEnum[] | UserScalarFieldEnum
    having?: UserScalarWhereWithAggregatesInput
    take?: number
    skip?: number
    _count?: UserCountAggregateInputType | true
    _min?: UserMinAggregateInputType
    _max?: UserMaxAggregateInputType
  }

  export type UserGroupByOutputType = {
    id: string
    clerkUserId: string
    username: string
    email: string | null
    mobile: string | null
    firstName: string | null
    lastName: string | null
    shopName: string | null
    address: string | null
    gender: $Enums.Gender | null
    profileImageUrl: string | null
    subscriptionStatus: $Enums.SubscriptionStatus
    subscriptionEndDate: Date | null
    razorpaySubscriptionId: string | null
    subscriptionPlan: $Enums.SubscriptionPlan | null
    razorpayPaymentId: string | null
    subscriptionCreatedAt: Date | null
    hadTrial: boolean
    isActive: boolean
    lastLoginAt: Date | null
    deletedAt: Date | null
    createdAt: Date
    updatedAt: Date
    _count: UserCountAggregateOutputType | null
    _min: UserMinAggregateOutputType | null
    _max: UserMaxAggregateOutputType | null
  }

  type GetUserGroupByPayload<T extends UserGroupByArgs> = Prisma.PrismaPromise<
    Array<
      PickEnumerable<UserGroupByOutputType, T['by']> &
        {
          [P in ((keyof T) & (keyof UserGroupByOutputType))]: P extends '_count'
            ? T[P] extends boolean
              ? number
              : GetScalarType<T[P], UserGroupByOutputType[P]>
            : GetScalarType<T[P], UserGroupByOutputType[P]>
        }
      >
    >


  export type UserSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    clerkUserId?: boolean
    username?: boolean
    email?: boolean
    mobile?: boolean
    firstName?: boolean
    lastName?: boolean
    shopName?: boolean
    address?: boolean
    gender?: boolean
    profileImageUrl?: boolean
    subscriptionStatus?: boolean
    subscriptionEndDate?: boolean
    razorpaySubscriptionId?: boolean
    subscriptionPlan?: boolean
    razorpayPaymentId?: boolean
    subscriptionCreatedAt?: boolean
    hadTrial?: boolean
    isActive?: boolean
    lastLoginAt?: boolean
    deletedAt?: boolean
    createdAt?: boolean
    updatedAt?: boolean
    customers?: boolean | User$customersArgs<ExtArgs>
    _count?: boolean | UserCountOutputTypeDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["user"]>

  export type UserSelectCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    clerkUserId?: boolean
    username?: boolean
    email?: boolean
    mobile?: boolean
    firstName?: boolean
    lastName?: boolean
    shopName?: boolean
    address?: boolean
    gender?: boolean
    profileImageUrl?: boolean
    subscriptionStatus?: boolean
    subscriptionEndDate?: boolean
    razorpaySubscriptionId?: boolean
    subscriptionPlan?: boolean
    razorpayPaymentId?: boolean
    subscriptionCreatedAt?: boolean
    hadTrial?: boolean
    isActive?: boolean
    lastLoginAt?: boolean
    deletedAt?: boolean
    createdAt?: boolean
    updatedAt?: boolean
  }, ExtArgs["result"]["user"]>

  export type UserSelectUpdateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    clerkUserId?: boolean
    username?: boolean
    email?: boolean
    mobile?: boolean
    firstName?: boolean
    lastName?: boolean
    shopName?: boolean
    address?: boolean
    gender?: boolean
    profileImageUrl?: boolean
    subscriptionStatus?: boolean
    subscriptionEndDate?: boolean
    razorpaySubscriptionId?: boolean
    subscriptionPlan?: boolean
    razorpayPaymentId?: boolean
    subscriptionCreatedAt?: boolean
    hadTrial?: boolean
    isActive?: boolean
    lastLoginAt?: boolean
    deletedAt?: boolean
    createdAt?: boolean
    updatedAt?: boolean
  }, ExtArgs["result"]["user"]>

  export type UserSelectScalar = {
    id?: boolean
    clerkUserId?: boolean
    username?: boolean
    email?: boolean
    mobile?: boolean
    firstName?: boolean
    lastName?: boolean
    shopName?: boolean
    address?: boolean
    gender?: boolean
    profileImageUrl?: boolean
    subscriptionStatus?: boolean
    subscriptionEndDate?: boolean
    razorpaySubscriptionId?: boolean
    subscriptionPlan?: boolean
    razorpayPaymentId?: boolean
    subscriptionCreatedAt?: boolean
    hadTrial?: boolean
    isActive?: boolean
    lastLoginAt?: boolean
    deletedAt?: boolean
    createdAt?: boolean
    updatedAt?: boolean
  }

  export type UserOmit<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetOmit<"id" | "clerkUserId" | "username" | "email" | "mobile" | "firstName" | "lastName" | "shopName" | "address" | "gender" | "profileImageUrl" | "subscriptionStatus" | "subscriptionEndDate" | "razorpaySubscriptionId" | "subscriptionPlan" | "razorpayPaymentId" | "subscriptionCreatedAt" | "hadTrial" | "isActive" | "lastLoginAt" | "deletedAt" | "createdAt" | "updatedAt", ExtArgs["result"]["user"]>
  export type UserInclude<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    customers?: boolean | User$customersArgs<ExtArgs>
    _count?: boolean | UserCountOutputTypeDefaultArgs<ExtArgs>
  }
  export type UserIncludeCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {}
  export type UserIncludeUpdateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {}

  export type $UserPayload<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    name: "User"
    objects: {
      customers: Prisma.$CustomerPayload<ExtArgs>[]
    }
    scalars: $Extensions.GetPayloadResult<{
      id: string
      clerkUserId: string
      username: string
      email: string | null
      mobile: string | null
      firstName: string | null
      lastName: string | null
      shopName: string | null
      address: string | null
      gender: $Enums.Gender | null
      profileImageUrl: string | null
      subscriptionStatus: $Enums.SubscriptionStatus
      subscriptionEndDate: Date | null
      razorpaySubscriptionId: string | null
      subscriptionPlan: $Enums.SubscriptionPlan | null
      razorpayPaymentId: string | null
      subscriptionCreatedAt: Date | null
      hadTrial: boolean
      isActive: boolean
      lastLoginAt: Date | null
      deletedAt: Date | null
      createdAt: Date
      updatedAt: Date
    }, ExtArgs["result"]["user"]>
    composites: {}
  }

  type UserGetPayload<S extends boolean | null | undefined | UserDefaultArgs> = $Result.GetResult<Prisma.$UserPayload, S>

  type UserCountArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> =
    Omit<UserFindManyArgs, 'select' | 'include' | 'distinct' | 'omit'> & {
      select?: UserCountAggregateInputType | true
    }

  export interface UserDelegate<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> {
    [K: symbol]: { types: Prisma.TypeMap<ExtArgs>['model']['User'], meta: { name: 'User' } }
    /**
     * Find zero or one User that matches the filter.
     * @param {UserFindUniqueArgs} args - Arguments to find a User
     * @example
     * // Get one User
     * const user = await prisma.user.findUnique({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUnique<T extends UserFindUniqueArgs>(args: SelectSubset<T, UserFindUniqueArgs<ExtArgs>>): Prisma__UserClient<$Result.GetResult<Prisma.$UserPayload<ExtArgs>, T, "findUnique", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find one User that matches the filter or throw an error with `error.code='P2025'`
     * if no matches were found.
     * @param {UserFindUniqueOrThrowArgs} args - Arguments to find a User
     * @example
     * // Get one User
     * const user = await prisma.user.findUniqueOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUniqueOrThrow<T extends UserFindUniqueOrThrowArgs>(args: SelectSubset<T, UserFindUniqueOrThrowArgs<ExtArgs>>): Prisma__UserClient<$Result.GetResult<Prisma.$UserPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first User that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {UserFindFirstArgs} args - Arguments to find a User
     * @example
     * // Get one User
     * const user = await prisma.user.findFirst({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirst<T extends UserFindFirstArgs>(args?: SelectSubset<T, UserFindFirstArgs<ExtArgs>>): Prisma__UserClient<$Result.GetResult<Prisma.$UserPayload<ExtArgs>, T, "findFirst", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first User that matches the filter or
     * throw `PrismaKnownClientError` with `P2025` code if no matches were found.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {UserFindFirstOrThrowArgs} args - Arguments to find a User
     * @example
     * // Get one User
     * const user = await prisma.user.findFirstOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirstOrThrow<T extends UserFindFirstOrThrowArgs>(args?: SelectSubset<T, UserFindFirstOrThrowArgs<ExtArgs>>): Prisma__UserClient<$Result.GetResult<Prisma.$UserPayload<ExtArgs>, T, "findFirstOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find zero or more Users that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {UserFindManyArgs} args - Arguments to filter and select certain fields only.
     * @example
     * // Get all Users
     * const users = await prisma.user.findMany()
     * 
     * // Get first 10 Users
     * const users = await prisma.user.findMany({ take: 10 })
     * 
     * // Only select the `id`
     * const userWithIdOnly = await prisma.user.findMany({ select: { id: true } })
     * 
     */
    findMany<T extends UserFindManyArgs>(args?: SelectSubset<T, UserFindManyArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$UserPayload<ExtArgs>, T, "findMany", GlobalOmitOptions>>

    /**
     * Create a User.
     * @param {UserCreateArgs} args - Arguments to create a User.
     * @example
     * // Create one User
     * const User = await prisma.user.create({
     *   data: {
     *     // ... data to create a User
     *   }
     * })
     * 
     */
    create<T extends UserCreateArgs>(args: SelectSubset<T, UserCreateArgs<ExtArgs>>): Prisma__UserClient<$Result.GetResult<Prisma.$UserPayload<ExtArgs>, T, "create", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Create many Users.
     * @param {UserCreateManyArgs} args - Arguments to create many Users.
     * @example
     * // Create many Users
     * const user = await prisma.user.createMany({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     *     
     */
    createMany<T extends UserCreateManyArgs>(args?: SelectSubset<T, UserCreateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create many Users and returns the data saved in the database.
     * @param {UserCreateManyAndReturnArgs} args - Arguments to create many Users.
     * @example
     * // Create many Users
     * const user = await prisma.user.createManyAndReturn({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Create many Users and only return the `id`
     * const userWithIdOnly = await prisma.user.createManyAndReturn({
     *   select: { id: true },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    createManyAndReturn<T extends UserCreateManyAndReturnArgs>(args?: SelectSubset<T, UserCreateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$UserPayload<ExtArgs>, T, "createManyAndReturn", GlobalOmitOptions>>

    /**
     * Delete a User.
     * @param {UserDeleteArgs} args - Arguments to delete one User.
     * @example
     * // Delete one User
     * const User = await prisma.user.delete({
     *   where: {
     *     // ... filter to delete one User
     *   }
     * })
     * 
     */
    delete<T extends UserDeleteArgs>(args: SelectSubset<T, UserDeleteArgs<ExtArgs>>): Prisma__UserClient<$Result.GetResult<Prisma.$UserPayload<ExtArgs>, T, "delete", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Update one User.
     * @param {UserUpdateArgs} args - Arguments to update one User.
     * @example
     * // Update one User
     * const user = await prisma.user.update({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    update<T extends UserUpdateArgs>(args: SelectSubset<T, UserUpdateArgs<ExtArgs>>): Prisma__UserClient<$Result.GetResult<Prisma.$UserPayload<ExtArgs>, T, "update", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Delete zero or more Users.
     * @param {UserDeleteManyArgs} args - Arguments to filter Users to delete.
     * @example
     * // Delete a few Users
     * const { count } = await prisma.user.deleteMany({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     * 
     */
    deleteMany<T extends UserDeleteManyArgs>(args?: SelectSubset<T, UserDeleteManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more Users.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {UserUpdateManyArgs} args - Arguments to update one or more rows.
     * @example
     * // Update many Users
     * const user = await prisma.user.updateMany({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    updateMany<T extends UserUpdateManyArgs>(args: SelectSubset<T, UserUpdateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more Users and returns the data updated in the database.
     * @param {UserUpdateManyAndReturnArgs} args - Arguments to update many Users.
     * @example
     * // Update many Users
     * const user = await prisma.user.updateManyAndReturn({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Update zero or more Users and only return the `id`
     * const userWithIdOnly = await prisma.user.updateManyAndReturn({
     *   select: { id: true },
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    updateManyAndReturn<T extends UserUpdateManyAndReturnArgs>(args: SelectSubset<T, UserUpdateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$UserPayload<ExtArgs>, T, "updateManyAndReturn", GlobalOmitOptions>>

    /**
     * Create or update one User.
     * @param {UserUpsertArgs} args - Arguments to update or create a User.
     * @example
     * // Update or create a User
     * const user = await prisma.user.upsert({
     *   create: {
     *     // ... data to create a User
     *   },
     *   update: {
     *     // ... in case it already exists, update
     *   },
     *   where: {
     *     // ... the filter for the User we want to update
     *   }
     * })
     */
    upsert<T extends UserUpsertArgs>(args: SelectSubset<T, UserUpsertArgs<ExtArgs>>): Prisma__UserClient<$Result.GetResult<Prisma.$UserPayload<ExtArgs>, T, "upsert", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>


    /**
     * Count the number of Users.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {UserCountArgs} args - Arguments to filter Users to count.
     * @example
     * // Count the number of Users
     * const count = await prisma.user.count({
     *   where: {
     *     // ... the filter for the Users we want to count
     *   }
     * })
    **/
    count<T extends UserCountArgs>(
      args?: Subset<T, UserCountArgs>,
    ): Prisma.PrismaPromise<
      T extends $Utils.Record<'select', any>
        ? T['select'] extends true
          ? number
          : GetScalarType<T['select'], UserCountAggregateOutputType>
        : number
    >

    /**
     * Allows you to perform aggregations operations on a User.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {UserAggregateArgs} args - Select which aggregations you would like to apply and on what fields.
     * @example
     * // Ordered by age ascending
     * // Where email contains prisma.io
     * // Limited to the 10 users
     * const aggregations = await prisma.user.aggregate({
     *   _avg: {
     *     age: true,
     *   },
     *   where: {
     *     email: {
     *       contains: "prisma.io",
     *     },
     *   },
     *   orderBy: {
     *     age: "asc",
     *   },
     *   take: 10,
     * })
    **/
    aggregate<T extends UserAggregateArgs>(args: Subset<T, UserAggregateArgs>): Prisma.PrismaPromise<GetUserAggregateType<T>>

    /**
     * Group by User.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {UserGroupByArgs} args - Group by arguments.
     * @example
     * // Group by city, order by createdAt, get count
     * const result = await prisma.user.groupBy({
     *   by: ['city', 'createdAt'],
     *   orderBy: {
     *     createdAt: true
     *   },
     *   _count: {
     *     _all: true
     *   },
     * })
     * 
    **/
    groupBy<
      T extends UserGroupByArgs,
      HasSelectOrTake extends Or<
        Extends<'skip', Keys<T>>,
        Extends<'take', Keys<T>>
      >,
      OrderByArg extends True extends HasSelectOrTake
        ? { orderBy: UserGroupByArgs['orderBy'] }
        : { orderBy?: UserGroupByArgs['orderBy'] },
      OrderFields extends ExcludeUnderscoreKeys<Keys<MaybeTupleToUnion<T['orderBy']>>>,
      ByFields extends MaybeTupleToUnion<T['by']>,
      ByValid extends Has<ByFields, OrderFields>,
      HavingFields extends GetHavingFields<T['having']>,
      HavingValid extends Has<ByFields, HavingFields>,
      ByEmpty extends T['by'] extends never[] ? True : False,
      InputErrors extends ByEmpty extends True
      ? `Error: "by" must not be empty.`
      : HavingValid extends False
      ? {
          [P in HavingFields]: P extends ByFields
            ? never
            : P extends string
            ? `Error: Field "${P}" used in "having" needs to be provided in "by".`
            : [
                Error,
                'Field ',
                P,
                ` in "having" needs to be provided in "by"`,
              ]
        }[HavingFields]
      : 'take' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "take", you also need to provide "orderBy"'
      : 'skip' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "skip", you also need to provide "orderBy"'
      : ByValid extends True
      ? {}
      : {
          [P in OrderFields]: P extends ByFields
            ? never
            : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
        }[OrderFields]
    >(args: SubsetIntersection<T, UserGroupByArgs, OrderByArg> & InputErrors): {} extends InputErrors ? GetUserGroupByPayload<T> : Prisma.PrismaPromise<InputErrors>
  /**
   * Fields of the User model
   */
  readonly fields: UserFieldRefs;
  }

  /**
   * The delegate class that acts as a "Promise-like" for User.
   * Why is this prefixed with `Prisma__`?
   * Because we want to prevent naming conflicts as mentioned in
   * https://github.com/prisma/prisma-client-js/issues/707
   */
  export interface Prisma__UserClient<T, Null = never, ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> extends Prisma.PrismaPromise<T> {
    readonly [Symbol.toStringTag]: "PrismaPromise"
    customers<T extends User$customersArgs<ExtArgs> = {}>(args?: Subset<T, User$customersArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$CustomerPayload<ExtArgs>, T, "findMany", GlobalOmitOptions> | Null>
    /**
     * Attaches callbacks for the resolution and/or rejection of the Promise.
     * @param onfulfilled The callback to execute when the Promise is resolved.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of which ever callback is executed.
     */
    then<TResult1 = T, TResult2 = never>(onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | undefined | null, onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null): $Utils.JsPromise<TResult1 | TResult2>
    /**
     * Attaches a callback for only the rejection of the Promise.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of the callback.
     */
    catch<TResult = never>(onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | undefined | null): $Utils.JsPromise<T | TResult>
    /**
     * Attaches a callback that is invoked when the Promise is settled (fulfilled or rejected). The
     * resolved value cannot be modified from the callback.
     * @param onfinally The callback to execute when the Promise is settled (fulfilled or rejected).
     * @returns A Promise for the completion of the callback.
     */
    finally(onfinally?: (() => void) | undefined | null): $Utils.JsPromise<T>
  }




  /**
   * Fields of the User model
   */
  interface UserFieldRefs {
    readonly id: FieldRef<"User", 'String'>
    readonly clerkUserId: FieldRef<"User", 'String'>
    readonly username: FieldRef<"User", 'String'>
    readonly email: FieldRef<"User", 'String'>
    readonly mobile: FieldRef<"User", 'String'>
    readonly firstName: FieldRef<"User", 'String'>
    readonly lastName: FieldRef<"User", 'String'>
    readonly shopName: FieldRef<"User", 'String'>
    readonly address: FieldRef<"User", 'String'>
    readonly gender: FieldRef<"User", 'Gender'>
    readonly profileImageUrl: FieldRef<"User", 'String'>
    readonly subscriptionStatus: FieldRef<"User", 'SubscriptionStatus'>
    readonly subscriptionEndDate: FieldRef<"User", 'DateTime'>
    readonly razorpaySubscriptionId: FieldRef<"User", 'String'>
    readonly subscriptionPlan: FieldRef<"User", 'SubscriptionPlan'>
    readonly razorpayPaymentId: FieldRef<"User", 'String'>
    readonly subscriptionCreatedAt: FieldRef<"User", 'DateTime'>
    readonly hadTrial: FieldRef<"User", 'Boolean'>
    readonly isActive: FieldRef<"User", 'Boolean'>
    readonly lastLoginAt: FieldRef<"User", 'DateTime'>
    readonly deletedAt: FieldRef<"User", 'DateTime'>
    readonly createdAt: FieldRef<"User", 'DateTime'>
    readonly updatedAt: FieldRef<"User", 'DateTime'>
  }
    

  // Custom InputTypes
  /**
   * User findUnique
   */
  export type UserFindUniqueArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the User
     */
    select?: UserSelect<ExtArgs> | null
    /**
     * Omit specific fields from the User
     */
    omit?: UserOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: UserInclude<ExtArgs> | null
    /**
     * Filter, which User to fetch.
     */
    where: UserWhereUniqueInput
  }

  /**
   * User findUniqueOrThrow
   */
  export type UserFindUniqueOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the User
     */
    select?: UserSelect<ExtArgs> | null
    /**
     * Omit specific fields from the User
     */
    omit?: UserOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: UserInclude<ExtArgs> | null
    /**
     * Filter, which User to fetch.
     */
    where: UserWhereUniqueInput
  }

  /**
   * User findFirst
   */
  export type UserFindFirstArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the User
     */
    select?: UserSelect<ExtArgs> | null
    /**
     * Omit specific fields from the User
     */
    omit?: UserOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: UserInclude<ExtArgs> | null
    /**
     * Filter, which User to fetch.
     */
    where?: UserWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Users to fetch.
     */
    orderBy?: UserOrderByWithRelationInput | UserOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for Users.
     */
    cursor?: UserWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Users from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Users.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of Users.
     */
    distinct?: UserScalarFieldEnum | UserScalarFieldEnum[]
  }

  /**
   * User findFirstOrThrow
   */
  export type UserFindFirstOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the User
     */
    select?: UserSelect<ExtArgs> | null
    /**
     * Omit specific fields from the User
     */
    omit?: UserOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: UserInclude<ExtArgs> | null
    /**
     * Filter, which User to fetch.
     */
    where?: UserWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Users to fetch.
     */
    orderBy?: UserOrderByWithRelationInput | UserOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for Users.
     */
    cursor?: UserWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Users from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Users.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of Users.
     */
    distinct?: UserScalarFieldEnum | UserScalarFieldEnum[]
  }

  /**
   * User findMany
   */
  export type UserFindManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the User
     */
    select?: UserSelect<ExtArgs> | null
    /**
     * Omit specific fields from the User
     */
    omit?: UserOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: UserInclude<ExtArgs> | null
    /**
     * Filter, which Users to fetch.
     */
    where?: UserWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Users to fetch.
     */
    orderBy?: UserOrderByWithRelationInput | UserOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for listing Users.
     */
    cursor?: UserWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Users from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Users.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of Users.
     */
    distinct?: UserScalarFieldEnum | UserScalarFieldEnum[]
  }

  /**
   * User create
   */
  export type UserCreateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the User
     */
    select?: UserSelect<ExtArgs> | null
    /**
     * Omit specific fields from the User
     */
    omit?: UserOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: UserInclude<ExtArgs> | null
    /**
     * The data needed to create a User.
     */
    data: XOR<UserCreateInput, UserUncheckedCreateInput>
  }

  /**
   * User createMany
   */
  export type UserCreateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to create many Users.
     */
    data: UserCreateManyInput | UserCreateManyInput[]
    skipDuplicates?: boolean
  }

  /**
   * User createManyAndReturn
   */
  export type UserCreateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the User
     */
    select?: UserSelectCreateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the User
     */
    omit?: UserOmit<ExtArgs> | null
    /**
     * The data used to create many Users.
     */
    data: UserCreateManyInput | UserCreateManyInput[]
    skipDuplicates?: boolean
  }

  /**
   * User update
   */
  export type UserUpdateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the User
     */
    select?: UserSelect<ExtArgs> | null
    /**
     * Omit specific fields from the User
     */
    omit?: UserOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: UserInclude<ExtArgs> | null
    /**
     * The data needed to update a User.
     */
    data: XOR<UserUpdateInput, UserUncheckedUpdateInput>
    /**
     * Choose, which User to update.
     */
    where: UserWhereUniqueInput
  }

  /**
   * User updateMany
   */
  export type UserUpdateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to update Users.
     */
    data: XOR<UserUpdateManyMutationInput, UserUncheckedUpdateManyInput>
    /**
     * Filter which Users to update
     */
    where?: UserWhereInput
    /**
     * Limit how many Users to update.
     */
    limit?: number
  }

  /**
   * User updateManyAndReturn
   */
  export type UserUpdateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the User
     */
    select?: UserSelectUpdateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the User
     */
    omit?: UserOmit<ExtArgs> | null
    /**
     * The data used to update Users.
     */
    data: XOR<UserUpdateManyMutationInput, UserUncheckedUpdateManyInput>
    /**
     * Filter which Users to update
     */
    where?: UserWhereInput
    /**
     * Limit how many Users to update.
     */
    limit?: number
  }

  /**
   * User upsert
   */
  export type UserUpsertArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the User
     */
    select?: UserSelect<ExtArgs> | null
    /**
     * Omit specific fields from the User
     */
    omit?: UserOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: UserInclude<ExtArgs> | null
    /**
     * The filter to search for the User to update in case it exists.
     */
    where: UserWhereUniqueInput
    /**
     * In case the User found by the `where` argument doesn't exist, create a new User with this data.
     */
    create: XOR<UserCreateInput, UserUncheckedCreateInput>
    /**
     * In case the User was found with the provided `where` argument, update it with this data.
     */
    update: XOR<UserUpdateInput, UserUncheckedUpdateInput>
  }

  /**
   * User delete
   */
  export type UserDeleteArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the User
     */
    select?: UserSelect<ExtArgs> | null
    /**
     * Omit specific fields from the User
     */
    omit?: UserOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: UserInclude<ExtArgs> | null
    /**
     * Filter which User to delete.
     */
    where: UserWhereUniqueInput
  }

  /**
   * User deleteMany
   */
  export type UserDeleteManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which Users to delete
     */
    where?: UserWhereInput
    /**
     * Limit how many Users to delete.
     */
    limit?: number
  }

  /**
   * User.customers
   */
  export type User$customersArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Customer
     */
    select?: CustomerSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Customer
     */
    omit?: CustomerOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: CustomerInclude<ExtArgs> | null
    where?: CustomerWhereInput
    orderBy?: CustomerOrderByWithRelationInput | CustomerOrderByWithRelationInput[]
    cursor?: CustomerWhereUniqueInput
    take?: number
    skip?: number
    distinct?: CustomerScalarFieldEnum | CustomerScalarFieldEnum[]
  }

  /**
   * User without action
   */
  export type UserDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the User
     */
    select?: UserSelect<ExtArgs> | null
    /**
     * Omit specific fields from the User
     */
    omit?: UserOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: UserInclude<ExtArgs> | null
  }


  /**
   * Model Customer
   */

  export type AggregateCustomer = {
    _count: CustomerCountAggregateOutputType | null
    _min: CustomerMinAggregateOutputType | null
    _max: CustomerMaxAggregateOutputType | null
  }

  export type CustomerMinAggregateOutputType = {
    id: string | null
    userId: string | null
    name: string | null
    region: string | null
    address: string | null
    mobile: string | null
    viewToken: string | null
    idProofImg: string | null
    customerImg: string | null
    aadharNo: string | null
    remark: string | null
    deletedAt: Date | null
    createdAt: Date | null
    updatedAt: Date | null
    gender: $Enums.Gender | null
  }

  export type CustomerMaxAggregateOutputType = {
    id: string | null
    userId: string | null
    name: string | null
    region: string | null
    address: string | null
    mobile: string | null
    viewToken: string | null
    idProofImg: string | null
    customerImg: string | null
    aadharNo: string | null
    remark: string | null
    deletedAt: Date | null
    createdAt: Date | null
    updatedAt: Date | null
    gender: $Enums.Gender | null
  }

  export type CustomerCountAggregateOutputType = {
    id: number
    userId: number
    name: number
    region: number
    address: number
    mobile: number
    viewToken: number
    idProofImg: number
    customerImg: number
    aadharNo: number
    remark: number
    deletedAt: number
    createdAt: number
    updatedAt: number
    gender: number
    _all: number
  }


  export type CustomerMinAggregateInputType = {
    id?: true
    userId?: true
    name?: true
    region?: true
    address?: true
    mobile?: true
    viewToken?: true
    idProofImg?: true
    customerImg?: true
    aadharNo?: true
    remark?: true
    deletedAt?: true
    createdAt?: true
    updatedAt?: true
    gender?: true
  }

  export type CustomerMaxAggregateInputType = {
    id?: true
    userId?: true
    name?: true
    region?: true
    address?: true
    mobile?: true
    viewToken?: true
    idProofImg?: true
    customerImg?: true
    aadharNo?: true
    remark?: true
    deletedAt?: true
    createdAt?: true
    updatedAt?: true
    gender?: true
  }

  export type CustomerCountAggregateInputType = {
    id?: true
    userId?: true
    name?: true
    region?: true
    address?: true
    mobile?: true
    viewToken?: true
    idProofImg?: true
    customerImg?: true
    aadharNo?: true
    remark?: true
    deletedAt?: true
    createdAt?: true
    updatedAt?: true
    gender?: true
    _all?: true
  }

  export type CustomerAggregateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which Customer to aggregate.
     */
    where?: CustomerWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Customers to fetch.
     */
    orderBy?: CustomerOrderByWithRelationInput | CustomerOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the start position
     */
    cursor?: CustomerWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Customers from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Customers.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Count returned Customers
    **/
    _count?: true | CustomerCountAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the minimum value
    **/
    _min?: CustomerMinAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the maximum value
    **/
    _max?: CustomerMaxAggregateInputType
  }

  export type GetCustomerAggregateType<T extends CustomerAggregateArgs> = {
        [P in keyof T & keyof AggregateCustomer]: P extends '_count' | 'count'
      ? T[P] extends true
        ? number
        : GetScalarType<T[P], AggregateCustomer[P]>
      : GetScalarType<T[P], AggregateCustomer[P]>
  }




  export type CustomerGroupByArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: CustomerWhereInput
    orderBy?: CustomerOrderByWithAggregationInput | CustomerOrderByWithAggregationInput[]
    by: CustomerScalarFieldEnum[] | CustomerScalarFieldEnum
    having?: CustomerScalarWhereWithAggregatesInput
    take?: number
    skip?: number
    _count?: CustomerCountAggregateInputType | true
    _min?: CustomerMinAggregateInputType
    _max?: CustomerMaxAggregateInputType
  }

  export type CustomerGroupByOutputType = {
    id: string
    userId: string
    name: string
    region: string
    address: string
    mobile: string | null
    viewToken: string
    idProofImg: string | null
    customerImg: string | null
    aadharNo: string | null
    remark: string | null
    deletedAt: Date | null
    createdAt: Date
    updatedAt: Date
    gender: $Enums.Gender | null
    _count: CustomerCountAggregateOutputType | null
    _min: CustomerMinAggregateOutputType | null
    _max: CustomerMaxAggregateOutputType | null
  }

  type GetCustomerGroupByPayload<T extends CustomerGroupByArgs> = Prisma.PrismaPromise<
    Array<
      PickEnumerable<CustomerGroupByOutputType, T['by']> &
        {
          [P in ((keyof T) & (keyof CustomerGroupByOutputType))]: P extends '_count'
            ? T[P] extends boolean
              ? number
              : GetScalarType<T[P], CustomerGroupByOutputType[P]>
            : GetScalarType<T[P], CustomerGroupByOutputType[P]>
        }
      >
    >


  export type CustomerSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    userId?: boolean
    name?: boolean
    region?: boolean
    address?: boolean
    mobile?: boolean
    viewToken?: boolean
    idProofImg?: boolean
    customerImg?: boolean
    aadharNo?: boolean
    remark?: boolean
    deletedAt?: boolean
    createdAt?: boolean
    updatedAt?: boolean
    gender?: boolean
    pledges?: boolean | Customer$pledgesArgs<ExtArgs>
    user?: boolean | UserDefaultArgs<ExtArgs>
    _count?: boolean | CustomerCountOutputTypeDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["customer"]>

  export type CustomerSelectCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    userId?: boolean
    name?: boolean
    region?: boolean
    address?: boolean
    mobile?: boolean
    viewToken?: boolean
    idProofImg?: boolean
    customerImg?: boolean
    aadharNo?: boolean
    remark?: boolean
    deletedAt?: boolean
    createdAt?: boolean
    updatedAt?: boolean
    gender?: boolean
    user?: boolean | UserDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["customer"]>

  export type CustomerSelectUpdateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    userId?: boolean
    name?: boolean
    region?: boolean
    address?: boolean
    mobile?: boolean
    viewToken?: boolean
    idProofImg?: boolean
    customerImg?: boolean
    aadharNo?: boolean
    remark?: boolean
    deletedAt?: boolean
    createdAt?: boolean
    updatedAt?: boolean
    gender?: boolean
    user?: boolean | UserDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["customer"]>

  export type CustomerSelectScalar = {
    id?: boolean
    userId?: boolean
    name?: boolean
    region?: boolean
    address?: boolean
    mobile?: boolean
    viewToken?: boolean
    idProofImg?: boolean
    customerImg?: boolean
    aadharNo?: boolean
    remark?: boolean
    deletedAt?: boolean
    createdAt?: boolean
    updatedAt?: boolean
    gender?: boolean
  }

  export type CustomerOmit<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetOmit<"id" | "userId" | "name" | "region" | "address" | "mobile" | "viewToken" | "idProofImg" | "customerImg" | "aadharNo" | "remark" | "deletedAt" | "createdAt" | "updatedAt" | "gender", ExtArgs["result"]["customer"]>
  export type CustomerInclude<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    pledges?: boolean | Customer$pledgesArgs<ExtArgs>
    user?: boolean | UserDefaultArgs<ExtArgs>
    _count?: boolean | CustomerCountOutputTypeDefaultArgs<ExtArgs>
  }
  export type CustomerIncludeCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    user?: boolean | UserDefaultArgs<ExtArgs>
  }
  export type CustomerIncludeUpdateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    user?: boolean | UserDefaultArgs<ExtArgs>
  }

  export type $CustomerPayload<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    name: "Customer"
    objects: {
      pledges: Prisma.$PledgePayload<ExtArgs>[]
      user: Prisma.$UserPayload<ExtArgs>
    }
    scalars: $Extensions.GetPayloadResult<{
      id: string
      userId: string
      name: string
      region: string
      address: string
      mobile: string | null
      viewToken: string
      idProofImg: string | null
      customerImg: string | null
      aadharNo: string | null
      remark: string | null
      deletedAt: Date | null
      createdAt: Date
      updatedAt: Date
      gender: $Enums.Gender | null
    }, ExtArgs["result"]["customer"]>
    composites: {}
  }

  type CustomerGetPayload<S extends boolean | null | undefined | CustomerDefaultArgs> = $Result.GetResult<Prisma.$CustomerPayload, S>

  type CustomerCountArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> =
    Omit<CustomerFindManyArgs, 'select' | 'include' | 'distinct' | 'omit'> & {
      select?: CustomerCountAggregateInputType | true
    }

  export interface CustomerDelegate<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> {
    [K: symbol]: { types: Prisma.TypeMap<ExtArgs>['model']['Customer'], meta: { name: 'Customer' } }
    /**
     * Find zero or one Customer that matches the filter.
     * @param {CustomerFindUniqueArgs} args - Arguments to find a Customer
     * @example
     * // Get one Customer
     * const customer = await prisma.customer.findUnique({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUnique<T extends CustomerFindUniqueArgs>(args: SelectSubset<T, CustomerFindUniqueArgs<ExtArgs>>): Prisma__CustomerClient<$Result.GetResult<Prisma.$CustomerPayload<ExtArgs>, T, "findUnique", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find one Customer that matches the filter or throw an error with `error.code='P2025'`
     * if no matches were found.
     * @param {CustomerFindUniqueOrThrowArgs} args - Arguments to find a Customer
     * @example
     * // Get one Customer
     * const customer = await prisma.customer.findUniqueOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUniqueOrThrow<T extends CustomerFindUniqueOrThrowArgs>(args: SelectSubset<T, CustomerFindUniqueOrThrowArgs<ExtArgs>>): Prisma__CustomerClient<$Result.GetResult<Prisma.$CustomerPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first Customer that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {CustomerFindFirstArgs} args - Arguments to find a Customer
     * @example
     * // Get one Customer
     * const customer = await prisma.customer.findFirst({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirst<T extends CustomerFindFirstArgs>(args?: SelectSubset<T, CustomerFindFirstArgs<ExtArgs>>): Prisma__CustomerClient<$Result.GetResult<Prisma.$CustomerPayload<ExtArgs>, T, "findFirst", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first Customer that matches the filter or
     * throw `PrismaKnownClientError` with `P2025` code if no matches were found.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {CustomerFindFirstOrThrowArgs} args - Arguments to find a Customer
     * @example
     * // Get one Customer
     * const customer = await prisma.customer.findFirstOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirstOrThrow<T extends CustomerFindFirstOrThrowArgs>(args?: SelectSubset<T, CustomerFindFirstOrThrowArgs<ExtArgs>>): Prisma__CustomerClient<$Result.GetResult<Prisma.$CustomerPayload<ExtArgs>, T, "findFirstOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find zero or more Customers that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {CustomerFindManyArgs} args - Arguments to filter and select certain fields only.
     * @example
     * // Get all Customers
     * const customers = await prisma.customer.findMany()
     * 
     * // Get first 10 Customers
     * const customers = await prisma.customer.findMany({ take: 10 })
     * 
     * // Only select the `id`
     * const customerWithIdOnly = await prisma.customer.findMany({ select: { id: true } })
     * 
     */
    findMany<T extends CustomerFindManyArgs>(args?: SelectSubset<T, CustomerFindManyArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$CustomerPayload<ExtArgs>, T, "findMany", GlobalOmitOptions>>

    /**
     * Create a Customer.
     * @param {CustomerCreateArgs} args - Arguments to create a Customer.
     * @example
     * // Create one Customer
     * const Customer = await prisma.customer.create({
     *   data: {
     *     // ... data to create a Customer
     *   }
     * })
     * 
     */
    create<T extends CustomerCreateArgs>(args: SelectSubset<T, CustomerCreateArgs<ExtArgs>>): Prisma__CustomerClient<$Result.GetResult<Prisma.$CustomerPayload<ExtArgs>, T, "create", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Create many Customers.
     * @param {CustomerCreateManyArgs} args - Arguments to create many Customers.
     * @example
     * // Create many Customers
     * const customer = await prisma.customer.createMany({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     *     
     */
    createMany<T extends CustomerCreateManyArgs>(args?: SelectSubset<T, CustomerCreateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create many Customers and returns the data saved in the database.
     * @param {CustomerCreateManyAndReturnArgs} args - Arguments to create many Customers.
     * @example
     * // Create many Customers
     * const customer = await prisma.customer.createManyAndReturn({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Create many Customers and only return the `id`
     * const customerWithIdOnly = await prisma.customer.createManyAndReturn({
     *   select: { id: true },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    createManyAndReturn<T extends CustomerCreateManyAndReturnArgs>(args?: SelectSubset<T, CustomerCreateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$CustomerPayload<ExtArgs>, T, "createManyAndReturn", GlobalOmitOptions>>

    /**
     * Delete a Customer.
     * @param {CustomerDeleteArgs} args - Arguments to delete one Customer.
     * @example
     * // Delete one Customer
     * const Customer = await prisma.customer.delete({
     *   where: {
     *     // ... filter to delete one Customer
     *   }
     * })
     * 
     */
    delete<T extends CustomerDeleteArgs>(args: SelectSubset<T, CustomerDeleteArgs<ExtArgs>>): Prisma__CustomerClient<$Result.GetResult<Prisma.$CustomerPayload<ExtArgs>, T, "delete", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Update one Customer.
     * @param {CustomerUpdateArgs} args - Arguments to update one Customer.
     * @example
     * // Update one Customer
     * const customer = await prisma.customer.update({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    update<T extends CustomerUpdateArgs>(args: SelectSubset<T, CustomerUpdateArgs<ExtArgs>>): Prisma__CustomerClient<$Result.GetResult<Prisma.$CustomerPayload<ExtArgs>, T, "update", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Delete zero or more Customers.
     * @param {CustomerDeleteManyArgs} args - Arguments to filter Customers to delete.
     * @example
     * // Delete a few Customers
     * const { count } = await prisma.customer.deleteMany({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     * 
     */
    deleteMany<T extends CustomerDeleteManyArgs>(args?: SelectSubset<T, CustomerDeleteManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more Customers.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {CustomerUpdateManyArgs} args - Arguments to update one or more rows.
     * @example
     * // Update many Customers
     * const customer = await prisma.customer.updateMany({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    updateMany<T extends CustomerUpdateManyArgs>(args: SelectSubset<T, CustomerUpdateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more Customers and returns the data updated in the database.
     * @param {CustomerUpdateManyAndReturnArgs} args - Arguments to update many Customers.
     * @example
     * // Update many Customers
     * const customer = await prisma.customer.updateManyAndReturn({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Update zero or more Customers and only return the `id`
     * const customerWithIdOnly = await prisma.customer.updateManyAndReturn({
     *   select: { id: true },
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    updateManyAndReturn<T extends CustomerUpdateManyAndReturnArgs>(args: SelectSubset<T, CustomerUpdateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$CustomerPayload<ExtArgs>, T, "updateManyAndReturn", GlobalOmitOptions>>

    /**
     * Create or update one Customer.
     * @param {CustomerUpsertArgs} args - Arguments to update or create a Customer.
     * @example
     * // Update or create a Customer
     * const customer = await prisma.customer.upsert({
     *   create: {
     *     // ... data to create a Customer
     *   },
     *   update: {
     *     // ... in case it already exists, update
     *   },
     *   where: {
     *     // ... the filter for the Customer we want to update
     *   }
     * })
     */
    upsert<T extends CustomerUpsertArgs>(args: SelectSubset<T, CustomerUpsertArgs<ExtArgs>>): Prisma__CustomerClient<$Result.GetResult<Prisma.$CustomerPayload<ExtArgs>, T, "upsert", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>


    /**
     * Count the number of Customers.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {CustomerCountArgs} args - Arguments to filter Customers to count.
     * @example
     * // Count the number of Customers
     * const count = await prisma.customer.count({
     *   where: {
     *     // ... the filter for the Customers we want to count
     *   }
     * })
    **/
    count<T extends CustomerCountArgs>(
      args?: Subset<T, CustomerCountArgs>,
    ): Prisma.PrismaPromise<
      T extends $Utils.Record<'select', any>
        ? T['select'] extends true
          ? number
          : GetScalarType<T['select'], CustomerCountAggregateOutputType>
        : number
    >

    /**
     * Allows you to perform aggregations operations on a Customer.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {CustomerAggregateArgs} args - Select which aggregations you would like to apply and on what fields.
     * @example
     * // Ordered by age ascending
     * // Where email contains prisma.io
     * // Limited to the 10 users
     * const aggregations = await prisma.user.aggregate({
     *   _avg: {
     *     age: true,
     *   },
     *   where: {
     *     email: {
     *       contains: "prisma.io",
     *     },
     *   },
     *   orderBy: {
     *     age: "asc",
     *   },
     *   take: 10,
     * })
    **/
    aggregate<T extends CustomerAggregateArgs>(args: Subset<T, CustomerAggregateArgs>): Prisma.PrismaPromise<GetCustomerAggregateType<T>>

    /**
     * Group by Customer.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {CustomerGroupByArgs} args - Group by arguments.
     * @example
     * // Group by city, order by createdAt, get count
     * const result = await prisma.user.groupBy({
     *   by: ['city', 'createdAt'],
     *   orderBy: {
     *     createdAt: true
     *   },
     *   _count: {
     *     _all: true
     *   },
     * })
     * 
    **/
    groupBy<
      T extends CustomerGroupByArgs,
      HasSelectOrTake extends Or<
        Extends<'skip', Keys<T>>,
        Extends<'take', Keys<T>>
      >,
      OrderByArg extends True extends HasSelectOrTake
        ? { orderBy: CustomerGroupByArgs['orderBy'] }
        : { orderBy?: CustomerGroupByArgs['orderBy'] },
      OrderFields extends ExcludeUnderscoreKeys<Keys<MaybeTupleToUnion<T['orderBy']>>>,
      ByFields extends MaybeTupleToUnion<T['by']>,
      ByValid extends Has<ByFields, OrderFields>,
      HavingFields extends GetHavingFields<T['having']>,
      HavingValid extends Has<ByFields, HavingFields>,
      ByEmpty extends T['by'] extends never[] ? True : False,
      InputErrors extends ByEmpty extends True
      ? `Error: "by" must not be empty.`
      : HavingValid extends False
      ? {
          [P in HavingFields]: P extends ByFields
            ? never
            : P extends string
            ? `Error: Field "${P}" used in "having" needs to be provided in "by".`
            : [
                Error,
                'Field ',
                P,
                ` in "having" needs to be provided in "by"`,
              ]
        }[HavingFields]
      : 'take' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "take", you also need to provide "orderBy"'
      : 'skip' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "skip", you also need to provide "orderBy"'
      : ByValid extends True
      ? {}
      : {
          [P in OrderFields]: P extends ByFields
            ? never
            : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
        }[OrderFields]
    >(args: SubsetIntersection<T, CustomerGroupByArgs, OrderByArg> & InputErrors): {} extends InputErrors ? GetCustomerGroupByPayload<T> : Prisma.PrismaPromise<InputErrors>
  /**
   * Fields of the Customer model
   */
  readonly fields: CustomerFieldRefs;
  }

  /**
   * The delegate class that acts as a "Promise-like" for Customer.
   * Why is this prefixed with `Prisma__`?
   * Because we want to prevent naming conflicts as mentioned in
   * https://github.com/prisma/prisma-client-js/issues/707
   */
  export interface Prisma__CustomerClient<T, Null = never, ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> extends Prisma.PrismaPromise<T> {
    readonly [Symbol.toStringTag]: "PrismaPromise"
    pledges<T extends Customer$pledgesArgs<ExtArgs> = {}>(args?: Subset<T, Customer$pledgesArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$PledgePayload<ExtArgs>, T, "findMany", GlobalOmitOptions> | Null>
    user<T extends UserDefaultArgs<ExtArgs> = {}>(args?: Subset<T, UserDefaultArgs<ExtArgs>>): Prisma__UserClient<$Result.GetResult<Prisma.$UserPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions> | Null, Null, ExtArgs, GlobalOmitOptions>
    /**
     * Attaches callbacks for the resolution and/or rejection of the Promise.
     * @param onfulfilled The callback to execute when the Promise is resolved.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of which ever callback is executed.
     */
    then<TResult1 = T, TResult2 = never>(onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | undefined | null, onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null): $Utils.JsPromise<TResult1 | TResult2>
    /**
     * Attaches a callback for only the rejection of the Promise.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of the callback.
     */
    catch<TResult = never>(onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | undefined | null): $Utils.JsPromise<T | TResult>
    /**
     * Attaches a callback that is invoked when the Promise is settled (fulfilled or rejected). The
     * resolved value cannot be modified from the callback.
     * @param onfinally The callback to execute when the Promise is settled (fulfilled or rejected).
     * @returns A Promise for the completion of the callback.
     */
    finally(onfinally?: (() => void) | undefined | null): $Utils.JsPromise<T>
  }




  /**
   * Fields of the Customer model
   */
  interface CustomerFieldRefs {
    readonly id: FieldRef<"Customer", 'String'>
    readonly userId: FieldRef<"Customer", 'String'>
    readonly name: FieldRef<"Customer", 'String'>
    readonly region: FieldRef<"Customer", 'String'>
    readonly address: FieldRef<"Customer", 'String'>
    readonly mobile: FieldRef<"Customer", 'String'>
    readonly viewToken: FieldRef<"Customer", 'String'>
    readonly idProofImg: FieldRef<"Customer", 'String'>
    readonly customerImg: FieldRef<"Customer", 'String'>
    readonly aadharNo: FieldRef<"Customer", 'String'>
    readonly remark: FieldRef<"Customer", 'String'>
    readonly deletedAt: FieldRef<"Customer", 'DateTime'>
    readonly createdAt: FieldRef<"Customer", 'DateTime'>
    readonly updatedAt: FieldRef<"Customer", 'DateTime'>
    readonly gender: FieldRef<"Customer", 'Gender'>
  }
    

  // Custom InputTypes
  /**
   * Customer findUnique
   */
  export type CustomerFindUniqueArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Customer
     */
    select?: CustomerSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Customer
     */
    omit?: CustomerOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: CustomerInclude<ExtArgs> | null
    /**
     * Filter, which Customer to fetch.
     */
    where: CustomerWhereUniqueInput
  }

  /**
   * Customer findUniqueOrThrow
   */
  export type CustomerFindUniqueOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Customer
     */
    select?: CustomerSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Customer
     */
    omit?: CustomerOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: CustomerInclude<ExtArgs> | null
    /**
     * Filter, which Customer to fetch.
     */
    where: CustomerWhereUniqueInput
  }

  /**
   * Customer findFirst
   */
  export type CustomerFindFirstArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Customer
     */
    select?: CustomerSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Customer
     */
    omit?: CustomerOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: CustomerInclude<ExtArgs> | null
    /**
     * Filter, which Customer to fetch.
     */
    where?: CustomerWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Customers to fetch.
     */
    orderBy?: CustomerOrderByWithRelationInput | CustomerOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for Customers.
     */
    cursor?: CustomerWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Customers from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Customers.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of Customers.
     */
    distinct?: CustomerScalarFieldEnum | CustomerScalarFieldEnum[]
  }

  /**
   * Customer findFirstOrThrow
   */
  export type CustomerFindFirstOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Customer
     */
    select?: CustomerSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Customer
     */
    omit?: CustomerOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: CustomerInclude<ExtArgs> | null
    /**
     * Filter, which Customer to fetch.
     */
    where?: CustomerWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Customers to fetch.
     */
    orderBy?: CustomerOrderByWithRelationInput | CustomerOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for Customers.
     */
    cursor?: CustomerWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Customers from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Customers.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of Customers.
     */
    distinct?: CustomerScalarFieldEnum | CustomerScalarFieldEnum[]
  }

  /**
   * Customer findMany
   */
  export type CustomerFindManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Customer
     */
    select?: CustomerSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Customer
     */
    omit?: CustomerOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: CustomerInclude<ExtArgs> | null
    /**
     * Filter, which Customers to fetch.
     */
    where?: CustomerWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Customers to fetch.
     */
    orderBy?: CustomerOrderByWithRelationInput | CustomerOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for listing Customers.
     */
    cursor?: CustomerWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Customers from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Customers.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of Customers.
     */
    distinct?: CustomerScalarFieldEnum | CustomerScalarFieldEnum[]
  }

  /**
   * Customer create
   */
  export type CustomerCreateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Customer
     */
    select?: CustomerSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Customer
     */
    omit?: CustomerOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: CustomerInclude<ExtArgs> | null
    /**
     * The data needed to create a Customer.
     */
    data: XOR<CustomerCreateInput, CustomerUncheckedCreateInput>
  }

  /**
   * Customer createMany
   */
  export type CustomerCreateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to create many Customers.
     */
    data: CustomerCreateManyInput | CustomerCreateManyInput[]
    skipDuplicates?: boolean
  }

  /**
   * Customer createManyAndReturn
   */
  export type CustomerCreateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Customer
     */
    select?: CustomerSelectCreateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the Customer
     */
    omit?: CustomerOmit<ExtArgs> | null
    /**
     * The data used to create many Customers.
     */
    data: CustomerCreateManyInput | CustomerCreateManyInput[]
    skipDuplicates?: boolean
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: CustomerIncludeCreateManyAndReturn<ExtArgs> | null
  }

  /**
   * Customer update
   */
  export type CustomerUpdateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Customer
     */
    select?: CustomerSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Customer
     */
    omit?: CustomerOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: CustomerInclude<ExtArgs> | null
    /**
     * The data needed to update a Customer.
     */
    data: XOR<CustomerUpdateInput, CustomerUncheckedUpdateInput>
    /**
     * Choose, which Customer to update.
     */
    where: CustomerWhereUniqueInput
  }

  /**
   * Customer updateMany
   */
  export type CustomerUpdateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to update Customers.
     */
    data: XOR<CustomerUpdateManyMutationInput, CustomerUncheckedUpdateManyInput>
    /**
     * Filter which Customers to update
     */
    where?: CustomerWhereInput
    /**
     * Limit how many Customers to update.
     */
    limit?: number
  }

  /**
   * Customer updateManyAndReturn
   */
  export type CustomerUpdateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Customer
     */
    select?: CustomerSelectUpdateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the Customer
     */
    omit?: CustomerOmit<ExtArgs> | null
    /**
     * The data used to update Customers.
     */
    data: XOR<CustomerUpdateManyMutationInput, CustomerUncheckedUpdateManyInput>
    /**
     * Filter which Customers to update
     */
    where?: CustomerWhereInput
    /**
     * Limit how many Customers to update.
     */
    limit?: number
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: CustomerIncludeUpdateManyAndReturn<ExtArgs> | null
  }

  /**
   * Customer upsert
   */
  export type CustomerUpsertArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Customer
     */
    select?: CustomerSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Customer
     */
    omit?: CustomerOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: CustomerInclude<ExtArgs> | null
    /**
     * The filter to search for the Customer to update in case it exists.
     */
    where: CustomerWhereUniqueInput
    /**
     * In case the Customer found by the `where` argument doesn't exist, create a new Customer with this data.
     */
    create: XOR<CustomerCreateInput, CustomerUncheckedCreateInput>
    /**
     * In case the Customer was found with the provided `where` argument, update it with this data.
     */
    update: XOR<CustomerUpdateInput, CustomerUncheckedUpdateInput>
  }

  /**
   * Customer delete
   */
  export type CustomerDeleteArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Customer
     */
    select?: CustomerSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Customer
     */
    omit?: CustomerOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: CustomerInclude<ExtArgs> | null
    /**
     * Filter which Customer to delete.
     */
    where: CustomerWhereUniqueInput
  }

  /**
   * Customer deleteMany
   */
  export type CustomerDeleteManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which Customers to delete
     */
    where?: CustomerWhereInput
    /**
     * Limit how many Customers to delete.
     */
    limit?: number
  }

  /**
   * Customer.pledges
   */
  export type Customer$pledgesArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Pledge
     */
    select?: PledgeSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Pledge
     */
    omit?: PledgeOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: PledgeInclude<ExtArgs> | null
    where?: PledgeWhereInput
    orderBy?: PledgeOrderByWithRelationInput | PledgeOrderByWithRelationInput[]
    cursor?: PledgeWhereUniqueInput
    take?: number
    skip?: number
    distinct?: PledgeScalarFieldEnum | PledgeScalarFieldEnum[]
  }

  /**
   * Customer without action
   */
  export type CustomerDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Customer
     */
    select?: CustomerSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Customer
     */
    omit?: CustomerOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: CustomerInclude<ExtArgs> | null
  }


  /**
   * Model Pledge
   */

  export type AggregatePledge = {
    _count: PledgeCountAggregateOutputType | null
    _avg: PledgeAvgAggregateOutputType | null
    _sum: PledgeSumAggregateOutputType | null
    _min: PledgeMinAggregateOutputType | null
    _max: PledgeMaxAggregateOutputType | null
  }

  export type PledgeAvgAggregateOutputType = {
    loanAmount: Decimal | null
    interestRate: Decimal | null
    durationMonths: Decimal | null
    netWeightOfGold: Decimal | null
    netWeightOfSilver: Decimal | null
    totalInterest: Decimal | null
    receivableAmount: Decimal | null
    calculationVersion: number | null
  }

  export type PledgeSumAggregateOutputType = {
    loanAmount: Decimal | null
    interestRate: Decimal | null
    durationMonths: Decimal | null
    netWeightOfGold: Decimal | null
    netWeightOfSilver: Decimal | null
    totalInterest: Decimal | null
    receivableAmount: Decimal | null
    calculationVersion: number | null
  }

  export type PledgeMinAggregateOutputType = {
    id: string | null
    customerId: string | null
    pledgeDate: Date | null
    loanAmount: Decimal | null
    interestRate: Decimal | null
    compoundingDuration: $Enums.CompoundingDuration | null
    allowCompounding: boolean | null
    itemPhoto: string | null
    remark: string | null
    durationMonths: Decimal | null
    status: $Enums.PledgeStatus | null
    releaseDate: Date | null
    netWeightOfGold: Decimal | null
    netWeightOfSilver: Decimal | null
    totalInterest: Decimal | null
    receivableAmount: Decimal | null
    calculationVersion: number | null
    createdAt: Date | null
    updatedAt: Date | null
  }

  export type PledgeMaxAggregateOutputType = {
    id: string | null
    customerId: string | null
    pledgeDate: Date | null
    loanAmount: Decimal | null
    interestRate: Decimal | null
    compoundingDuration: $Enums.CompoundingDuration | null
    allowCompounding: boolean | null
    itemPhoto: string | null
    remark: string | null
    durationMonths: Decimal | null
    status: $Enums.PledgeStatus | null
    releaseDate: Date | null
    netWeightOfGold: Decimal | null
    netWeightOfSilver: Decimal | null
    totalInterest: Decimal | null
    receivableAmount: Decimal | null
    calculationVersion: number | null
    createdAt: Date | null
    updatedAt: Date | null
  }

  export type PledgeCountAggregateOutputType = {
    id: number
    customerId: number
    pledgeDate: number
    loanAmount: number
    interestRate: number
    compoundingDuration: number
    allowCompounding: number
    itemPhoto: number
    remark: number
    durationMonths: number
    status: number
    releaseDate: number
    netWeightOfGold: number
    netWeightOfSilver: number
    totalInterest: number
    receivableAmount: number
    calculationVersion: number
    createdAt: number
    updatedAt: number
    _all: number
  }


  export type PledgeAvgAggregateInputType = {
    loanAmount?: true
    interestRate?: true
    durationMonths?: true
    netWeightOfGold?: true
    netWeightOfSilver?: true
    totalInterest?: true
    receivableAmount?: true
    calculationVersion?: true
  }

  export type PledgeSumAggregateInputType = {
    loanAmount?: true
    interestRate?: true
    durationMonths?: true
    netWeightOfGold?: true
    netWeightOfSilver?: true
    totalInterest?: true
    receivableAmount?: true
    calculationVersion?: true
  }

  export type PledgeMinAggregateInputType = {
    id?: true
    customerId?: true
    pledgeDate?: true
    loanAmount?: true
    interestRate?: true
    compoundingDuration?: true
    allowCompounding?: true
    itemPhoto?: true
    remark?: true
    durationMonths?: true
    status?: true
    releaseDate?: true
    netWeightOfGold?: true
    netWeightOfSilver?: true
    totalInterest?: true
    receivableAmount?: true
    calculationVersion?: true
    createdAt?: true
    updatedAt?: true
  }

  export type PledgeMaxAggregateInputType = {
    id?: true
    customerId?: true
    pledgeDate?: true
    loanAmount?: true
    interestRate?: true
    compoundingDuration?: true
    allowCompounding?: true
    itemPhoto?: true
    remark?: true
    durationMonths?: true
    status?: true
    releaseDate?: true
    netWeightOfGold?: true
    netWeightOfSilver?: true
    totalInterest?: true
    receivableAmount?: true
    calculationVersion?: true
    createdAt?: true
    updatedAt?: true
  }

  export type PledgeCountAggregateInputType = {
    id?: true
    customerId?: true
    pledgeDate?: true
    loanAmount?: true
    interestRate?: true
    compoundingDuration?: true
    allowCompounding?: true
    itemPhoto?: true
    remark?: true
    durationMonths?: true
    status?: true
    releaseDate?: true
    netWeightOfGold?: true
    netWeightOfSilver?: true
    totalInterest?: true
    receivableAmount?: true
    calculationVersion?: true
    createdAt?: true
    updatedAt?: true
    _all?: true
  }

  export type PledgeAggregateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which Pledge to aggregate.
     */
    where?: PledgeWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Pledges to fetch.
     */
    orderBy?: PledgeOrderByWithRelationInput | PledgeOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the start position
     */
    cursor?: PledgeWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Pledges from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Pledges.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Count returned Pledges
    **/
    _count?: true | PledgeCountAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to average
    **/
    _avg?: PledgeAvgAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to sum
    **/
    _sum?: PledgeSumAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the minimum value
    **/
    _min?: PledgeMinAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the maximum value
    **/
    _max?: PledgeMaxAggregateInputType
  }

  export type GetPledgeAggregateType<T extends PledgeAggregateArgs> = {
        [P in keyof T & keyof AggregatePledge]: P extends '_count' | 'count'
      ? T[P] extends true
        ? number
        : GetScalarType<T[P], AggregatePledge[P]>
      : GetScalarType<T[P], AggregatePledge[P]>
  }




  export type PledgeGroupByArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: PledgeWhereInput
    orderBy?: PledgeOrderByWithAggregationInput | PledgeOrderByWithAggregationInput[]
    by: PledgeScalarFieldEnum[] | PledgeScalarFieldEnum
    having?: PledgeScalarWhereWithAggregatesInput
    take?: number
    skip?: number
    _count?: PledgeCountAggregateInputType | true
    _avg?: PledgeAvgAggregateInputType
    _sum?: PledgeSumAggregateInputType
    _min?: PledgeMinAggregateInputType
    _max?: PledgeMaxAggregateInputType
  }

  export type PledgeGroupByOutputType = {
    id: string
    customerId: string
    pledgeDate: Date
    loanAmount: Decimal
    interestRate: Decimal
    compoundingDuration: $Enums.CompoundingDuration
    allowCompounding: boolean
    itemPhoto: string | null
    remark: string | null
    durationMonths: Decimal | null
    status: $Enums.PledgeStatus
    releaseDate: Date | null
    netWeightOfGold: Decimal
    netWeightOfSilver: Decimal
    totalInterest: Decimal | null
    receivableAmount: Decimal | null
    calculationVersion: number
    createdAt: Date
    updatedAt: Date
    _count: PledgeCountAggregateOutputType | null
    _avg: PledgeAvgAggregateOutputType | null
    _sum: PledgeSumAggregateOutputType | null
    _min: PledgeMinAggregateOutputType | null
    _max: PledgeMaxAggregateOutputType | null
  }

  type GetPledgeGroupByPayload<T extends PledgeGroupByArgs> = Prisma.PrismaPromise<
    Array<
      PickEnumerable<PledgeGroupByOutputType, T['by']> &
        {
          [P in ((keyof T) & (keyof PledgeGroupByOutputType))]: P extends '_count'
            ? T[P] extends boolean
              ? number
              : GetScalarType<T[P], PledgeGroupByOutputType[P]>
            : GetScalarType<T[P], PledgeGroupByOutputType[P]>
        }
      >
    >


  export type PledgeSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    customerId?: boolean
    pledgeDate?: boolean
    loanAmount?: boolean
    interestRate?: boolean
    compoundingDuration?: boolean
    allowCompounding?: boolean
    itemPhoto?: boolean
    remark?: boolean
    durationMonths?: boolean
    status?: boolean
    releaseDate?: boolean
    netWeightOfGold?: boolean
    netWeightOfSilver?: boolean
    totalInterest?: boolean
    receivableAmount?: boolean
    calculationVersion?: boolean
    createdAt?: boolean
    updatedAt?: boolean
    pledgeAudits?: boolean | Pledge$pledgeAuditsArgs<ExtArgs>
    items?: boolean | Pledge$itemsArgs<ExtArgs>
    customer?: boolean | CustomerDefaultArgs<ExtArgs>
    transactions?: boolean | Pledge$transactionsArgs<ExtArgs>
    _count?: boolean | PledgeCountOutputTypeDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["pledge"]>

  export type PledgeSelectCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    customerId?: boolean
    pledgeDate?: boolean
    loanAmount?: boolean
    interestRate?: boolean
    compoundingDuration?: boolean
    allowCompounding?: boolean
    itemPhoto?: boolean
    remark?: boolean
    durationMonths?: boolean
    status?: boolean
    releaseDate?: boolean
    netWeightOfGold?: boolean
    netWeightOfSilver?: boolean
    totalInterest?: boolean
    receivableAmount?: boolean
    calculationVersion?: boolean
    createdAt?: boolean
    updatedAt?: boolean
    customer?: boolean | CustomerDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["pledge"]>

  export type PledgeSelectUpdateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    customerId?: boolean
    pledgeDate?: boolean
    loanAmount?: boolean
    interestRate?: boolean
    compoundingDuration?: boolean
    allowCompounding?: boolean
    itemPhoto?: boolean
    remark?: boolean
    durationMonths?: boolean
    status?: boolean
    releaseDate?: boolean
    netWeightOfGold?: boolean
    netWeightOfSilver?: boolean
    totalInterest?: boolean
    receivableAmount?: boolean
    calculationVersion?: boolean
    createdAt?: boolean
    updatedAt?: boolean
    customer?: boolean | CustomerDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["pledge"]>

  export type PledgeSelectScalar = {
    id?: boolean
    customerId?: boolean
    pledgeDate?: boolean
    loanAmount?: boolean
    interestRate?: boolean
    compoundingDuration?: boolean
    allowCompounding?: boolean
    itemPhoto?: boolean
    remark?: boolean
    durationMonths?: boolean
    status?: boolean
    releaseDate?: boolean
    netWeightOfGold?: boolean
    netWeightOfSilver?: boolean
    totalInterest?: boolean
    receivableAmount?: boolean
    calculationVersion?: boolean
    createdAt?: boolean
    updatedAt?: boolean
  }

  export type PledgeOmit<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetOmit<"id" | "customerId" | "pledgeDate" | "loanAmount" | "interestRate" | "compoundingDuration" | "allowCompounding" | "itemPhoto" | "remark" | "durationMonths" | "status" | "releaseDate" | "netWeightOfGold" | "netWeightOfSilver" | "totalInterest" | "receivableAmount" | "calculationVersion" | "createdAt" | "updatedAt", ExtArgs["result"]["pledge"]>
  export type PledgeInclude<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    pledgeAudits?: boolean | Pledge$pledgeAuditsArgs<ExtArgs>
    items?: boolean | Pledge$itemsArgs<ExtArgs>
    customer?: boolean | CustomerDefaultArgs<ExtArgs>
    transactions?: boolean | Pledge$transactionsArgs<ExtArgs>
    _count?: boolean | PledgeCountOutputTypeDefaultArgs<ExtArgs>
  }
  export type PledgeIncludeCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    customer?: boolean | CustomerDefaultArgs<ExtArgs>
  }
  export type PledgeIncludeUpdateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    customer?: boolean | CustomerDefaultArgs<ExtArgs>
  }

  export type $PledgePayload<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    name: "Pledge"
    objects: {
      pledgeAudits: Prisma.$PledgeAuditPayload<ExtArgs>[]
      items: Prisma.$PledgeItemPayload<ExtArgs>[]
      customer: Prisma.$CustomerPayload<ExtArgs>
      transactions: Prisma.$TransactionPayload<ExtArgs>[]
    }
    scalars: $Extensions.GetPayloadResult<{
      id: string
      customerId: string
      pledgeDate: Date
      loanAmount: Prisma.Decimal
      interestRate: Prisma.Decimal
      compoundingDuration: $Enums.CompoundingDuration
      allowCompounding: boolean
      itemPhoto: string | null
      remark: string | null
      durationMonths: Prisma.Decimal | null
      status: $Enums.PledgeStatus
      releaseDate: Date | null
      netWeightOfGold: Prisma.Decimal
      netWeightOfSilver: Prisma.Decimal
      totalInterest: Prisma.Decimal | null
      receivableAmount: Prisma.Decimal | null
      calculationVersion: number
      createdAt: Date
      updatedAt: Date
    }, ExtArgs["result"]["pledge"]>
    composites: {}
  }

  type PledgeGetPayload<S extends boolean | null | undefined | PledgeDefaultArgs> = $Result.GetResult<Prisma.$PledgePayload, S>

  type PledgeCountArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> =
    Omit<PledgeFindManyArgs, 'select' | 'include' | 'distinct' | 'omit'> & {
      select?: PledgeCountAggregateInputType | true
    }

  export interface PledgeDelegate<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> {
    [K: symbol]: { types: Prisma.TypeMap<ExtArgs>['model']['Pledge'], meta: { name: 'Pledge' } }
    /**
     * Find zero or one Pledge that matches the filter.
     * @param {PledgeFindUniqueArgs} args - Arguments to find a Pledge
     * @example
     * // Get one Pledge
     * const pledge = await prisma.pledge.findUnique({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUnique<T extends PledgeFindUniqueArgs>(args: SelectSubset<T, PledgeFindUniqueArgs<ExtArgs>>): Prisma__PledgeClient<$Result.GetResult<Prisma.$PledgePayload<ExtArgs>, T, "findUnique", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find one Pledge that matches the filter or throw an error with `error.code='P2025'`
     * if no matches were found.
     * @param {PledgeFindUniqueOrThrowArgs} args - Arguments to find a Pledge
     * @example
     * // Get one Pledge
     * const pledge = await prisma.pledge.findUniqueOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUniqueOrThrow<T extends PledgeFindUniqueOrThrowArgs>(args: SelectSubset<T, PledgeFindUniqueOrThrowArgs<ExtArgs>>): Prisma__PledgeClient<$Result.GetResult<Prisma.$PledgePayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first Pledge that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {PledgeFindFirstArgs} args - Arguments to find a Pledge
     * @example
     * // Get one Pledge
     * const pledge = await prisma.pledge.findFirst({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirst<T extends PledgeFindFirstArgs>(args?: SelectSubset<T, PledgeFindFirstArgs<ExtArgs>>): Prisma__PledgeClient<$Result.GetResult<Prisma.$PledgePayload<ExtArgs>, T, "findFirst", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first Pledge that matches the filter or
     * throw `PrismaKnownClientError` with `P2025` code if no matches were found.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {PledgeFindFirstOrThrowArgs} args - Arguments to find a Pledge
     * @example
     * // Get one Pledge
     * const pledge = await prisma.pledge.findFirstOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirstOrThrow<T extends PledgeFindFirstOrThrowArgs>(args?: SelectSubset<T, PledgeFindFirstOrThrowArgs<ExtArgs>>): Prisma__PledgeClient<$Result.GetResult<Prisma.$PledgePayload<ExtArgs>, T, "findFirstOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find zero or more Pledges that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {PledgeFindManyArgs} args - Arguments to filter and select certain fields only.
     * @example
     * // Get all Pledges
     * const pledges = await prisma.pledge.findMany()
     * 
     * // Get first 10 Pledges
     * const pledges = await prisma.pledge.findMany({ take: 10 })
     * 
     * // Only select the `id`
     * const pledgeWithIdOnly = await prisma.pledge.findMany({ select: { id: true } })
     * 
     */
    findMany<T extends PledgeFindManyArgs>(args?: SelectSubset<T, PledgeFindManyArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$PledgePayload<ExtArgs>, T, "findMany", GlobalOmitOptions>>

    /**
     * Create a Pledge.
     * @param {PledgeCreateArgs} args - Arguments to create a Pledge.
     * @example
     * // Create one Pledge
     * const Pledge = await prisma.pledge.create({
     *   data: {
     *     // ... data to create a Pledge
     *   }
     * })
     * 
     */
    create<T extends PledgeCreateArgs>(args: SelectSubset<T, PledgeCreateArgs<ExtArgs>>): Prisma__PledgeClient<$Result.GetResult<Prisma.$PledgePayload<ExtArgs>, T, "create", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Create many Pledges.
     * @param {PledgeCreateManyArgs} args - Arguments to create many Pledges.
     * @example
     * // Create many Pledges
     * const pledge = await prisma.pledge.createMany({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     *     
     */
    createMany<T extends PledgeCreateManyArgs>(args?: SelectSubset<T, PledgeCreateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create many Pledges and returns the data saved in the database.
     * @param {PledgeCreateManyAndReturnArgs} args - Arguments to create many Pledges.
     * @example
     * // Create many Pledges
     * const pledge = await prisma.pledge.createManyAndReturn({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Create many Pledges and only return the `id`
     * const pledgeWithIdOnly = await prisma.pledge.createManyAndReturn({
     *   select: { id: true },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    createManyAndReturn<T extends PledgeCreateManyAndReturnArgs>(args?: SelectSubset<T, PledgeCreateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$PledgePayload<ExtArgs>, T, "createManyAndReturn", GlobalOmitOptions>>

    /**
     * Delete a Pledge.
     * @param {PledgeDeleteArgs} args - Arguments to delete one Pledge.
     * @example
     * // Delete one Pledge
     * const Pledge = await prisma.pledge.delete({
     *   where: {
     *     // ... filter to delete one Pledge
     *   }
     * })
     * 
     */
    delete<T extends PledgeDeleteArgs>(args: SelectSubset<T, PledgeDeleteArgs<ExtArgs>>): Prisma__PledgeClient<$Result.GetResult<Prisma.$PledgePayload<ExtArgs>, T, "delete", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Update one Pledge.
     * @param {PledgeUpdateArgs} args - Arguments to update one Pledge.
     * @example
     * // Update one Pledge
     * const pledge = await prisma.pledge.update({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    update<T extends PledgeUpdateArgs>(args: SelectSubset<T, PledgeUpdateArgs<ExtArgs>>): Prisma__PledgeClient<$Result.GetResult<Prisma.$PledgePayload<ExtArgs>, T, "update", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Delete zero or more Pledges.
     * @param {PledgeDeleteManyArgs} args - Arguments to filter Pledges to delete.
     * @example
     * // Delete a few Pledges
     * const { count } = await prisma.pledge.deleteMany({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     * 
     */
    deleteMany<T extends PledgeDeleteManyArgs>(args?: SelectSubset<T, PledgeDeleteManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more Pledges.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {PledgeUpdateManyArgs} args - Arguments to update one or more rows.
     * @example
     * // Update many Pledges
     * const pledge = await prisma.pledge.updateMany({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    updateMany<T extends PledgeUpdateManyArgs>(args: SelectSubset<T, PledgeUpdateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more Pledges and returns the data updated in the database.
     * @param {PledgeUpdateManyAndReturnArgs} args - Arguments to update many Pledges.
     * @example
     * // Update many Pledges
     * const pledge = await prisma.pledge.updateManyAndReturn({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Update zero or more Pledges and only return the `id`
     * const pledgeWithIdOnly = await prisma.pledge.updateManyAndReturn({
     *   select: { id: true },
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    updateManyAndReturn<T extends PledgeUpdateManyAndReturnArgs>(args: SelectSubset<T, PledgeUpdateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$PledgePayload<ExtArgs>, T, "updateManyAndReturn", GlobalOmitOptions>>

    /**
     * Create or update one Pledge.
     * @param {PledgeUpsertArgs} args - Arguments to update or create a Pledge.
     * @example
     * // Update or create a Pledge
     * const pledge = await prisma.pledge.upsert({
     *   create: {
     *     // ... data to create a Pledge
     *   },
     *   update: {
     *     // ... in case it already exists, update
     *   },
     *   where: {
     *     // ... the filter for the Pledge we want to update
     *   }
     * })
     */
    upsert<T extends PledgeUpsertArgs>(args: SelectSubset<T, PledgeUpsertArgs<ExtArgs>>): Prisma__PledgeClient<$Result.GetResult<Prisma.$PledgePayload<ExtArgs>, T, "upsert", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>


    /**
     * Count the number of Pledges.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {PledgeCountArgs} args - Arguments to filter Pledges to count.
     * @example
     * // Count the number of Pledges
     * const count = await prisma.pledge.count({
     *   where: {
     *     // ... the filter for the Pledges we want to count
     *   }
     * })
    **/
    count<T extends PledgeCountArgs>(
      args?: Subset<T, PledgeCountArgs>,
    ): Prisma.PrismaPromise<
      T extends $Utils.Record<'select', any>
        ? T['select'] extends true
          ? number
          : GetScalarType<T['select'], PledgeCountAggregateOutputType>
        : number
    >

    /**
     * Allows you to perform aggregations operations on a Pledge.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {PledgeAggregateArgs} args - Select which aggregations you would like to apply and on what fields.
     * @example
     * // Ordered by age ascending
     * // Where email contains prisma.io
     * // Limited to the 10 users
     * const aggregations = await prisma.user.aggregate({
     *   _avg: {
     *     age: true,
     *   },
     *   where: {
     *     email: {
     *       contains: "prisma.io",
     *     },
     *   },
     *   orderBy: {
     *     age: "asc",
     *   },
     *   take: 10,
     * })
    **/
    aggregate<T extends PledgeAggregateArgs>(args: Subset<T, PledgeAggregateArgs>): Prisma.PrismaPromise<GetPledgeAggregateType<T>>

    /**
     * Group by Pledge.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {PledgeGroupByArgs} args - Group by arguments.
     * @example
     * // Group by city, order by createdAt, get count
     * const result = await prisma.user.groupBy({
     *   by: ['city', 'createdAt'],
     *   orderBy: {
     *     createdAt: true
     *   },
     *   _count: {
     *     _all: true
     *   },
     * })
     * 
    **/
    groupBy<
      T extends PledgeGroupByArgs,
      HasSelectOrTake extends Or<
        Extends<'skip', Keys<T>>,
        Extends<'take', Keys<T>>
      >,
      OrderByArg extends True extends HasSelectOrTake
        ? { orderBy: PledgeGroupByArgs['orderBy'] }
        : { orderBy?: PledgeGroupByArgs['orderBy'] },
      OrderFields extends ExcludeUnderscoreKeys<Keys<MaybeTupleToUnion<T['orderBy']>>>,
      ByFields extends MaybeTupleToUnion<T['by']>,
      ByValid extends Has<ByFields, OrderFields>,
      HavingFields extends GetHavingFields<T['having']>,
      HavingValid extends Has<ByFields, HavingFields>,
      ByEmpty extends T['by'] extends never[] ? True : False,
      InputErrors extends ByEmpty extends True
      ? `Error: "by" must not be empty.`
      : HavingValid extends False
      ? {
          [P in HavingFields]: P extends ByFields
            ? never
            : P extends string
            ? `Error: Field "${P}" used in "having" needs to be provided in "by".`
            : [
                Error,
                'Field ',
                P,
                ` in "having" needs to be provided in "by"`,
              ]
        }[HavingFields]
      : 'take' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "take", you also need to provide "orderBy"'
      : 'skip' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "skip", you also need to provide "orderBy"'
      : ByValid extends True
      ? {}
      : {
          [P in OrderFields]: P extends ByFields
            ? never
            : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
        }[OrderFields]
    >(args: SubsetIntersection<T, PledgeGroupByArgs, OrderByArg> & InputErrors): {} extends InputErrors ? GetPledgeGroupByPayload<T> : Prisma.PrismaPromise<InputErrors>
  /**
   * Fields of the Pledge model
   */
  readonly fields: PledgeFieldRefs;
  }

  /**
   * The delegate class that acts as a "Promise-like" for Pledge.
   * Why is this prefixed with `Prisma__`?
   * Because we want to prevent naming conflicts as mentioned in
   * https://github.com/prisma/prisma-client-js/issues/707
   */
  export interface Prisma__PledgeClient<T, Null = never, ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> extends Prisma.PrismaPromise<T> {
    readonly [Symbol.toStringTag]: "PrismaPromise"
    pledgeAudits<T extends Pledge$pledgeAuditsArgs<ExtArgs> = {}>(args?: Subset<T, Pledge$pledgeAuditsArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$PledgeAuditPayload<ExtArgs>, T, "findMany", GlobalOmitOptions> | Null>
    items<T extends Pledge$itemsArgs<ExtArgs> = {}>(args?: Subset<T, Pledge$itemsArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$PledgeItemPayload<ExtArgs>, T, "findMany", GlobalOmitOptions> | Null>
    customer<T extends CustomerDefaultArgs<ExtArgs> = {}>(args?: Subset<T, CustomerDefaultArgs<ExtArgs>>): Prisma__CustomerClient<$Result.GetResult<Prisma.$CustomerPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions> | Null, Null, ExtArgs, GlobalOmitOptions>
    transactions<T extends Pledge$transactionsArgs<ExtArgs> = {}>(args?: Subset<T, Pledge$transactionsArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$TransactionPayload<ExtArgs>, T, "findMany", GlobalOmitOptions> | Null>
    /**
     * Attaches callbacks for the resolution and/or rejection of the Promise.
     * @param onfulfilled The callback to execute when the Promise is resolved.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of which ever callback is executed.
     */
    then<TResult1 = T, TResult2 = never>(onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | undefined | null, onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null): $Utils.JsPromise<TResult1 | TResult2>
    /**
     * Attaches a callback for only the rejection of the Promise.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of the callback.
     */
    catch<TResult = never>(onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | undefined | null): $Utils.JsPromise<T | TResult>
    /**
     * Attaches a callback that is invoked when the Promise is settled (fulfilled or rejected). The
     * resolved value cannot be modified from the callback.
     * @param onfinally The callback to execute when the Promise is settled (fulfilled or rejected).
     * @returns A Promise for the completion of the callback.
     */
    finally(onfinally?: (() => void) | undefined | null): $Utils.JsPromise<T>
  }




  /**
   * Fields of the Pledge model
   */
  interface PledgeFieldRefs {
    readonly id: FieldRef<"Pledge", 'String'>
    readonly customerId: FieldRef<"Pledge", 'String'>
    readonly pledgeDate: FieldRef<"Pledge", 'DateTime'>
    readonly loanAmount: FieldRef<"Pledge", 'Decimal'>
    readonly interestRate: FieldRef<"Pledge", 'Decimal'>
    readonly compoundingDuration: FieldRef<"Pledge", 'CompoundingDuration'>
    readonly allowCompounding: FieldRef<"Pledge", 'Boolean'>
    readonly itemPhoto: FieldRef<"Pledge", 'String'>
    readonly remark: FieldRef<"Pledge", 'String'>
    readonly durationMonths: FieldRef<"Pledge", 'Decimal'>
    readonly status: FieldRef<"Pledge", 'PledgeStatus'>
    readonly releaseDate: FieldRef<"Pledge", 'DateTime'>
    readonly netWeightOfGold: FieldRef<"Pledge", 'Decimal'>
    readonly netWeightOfSilver: FieldRef<"Pledge", 'Decimal'>
    readonly totalInterest: FieldRef<"Pledge", 'Decimal'>
    readonly receivableAmount: FieldRef<"Pledge", 'Decimal'>
    readonly calculationVersion: FieldRef<"Pledge", 'Int'>
    readonly createdAt: FieldRef<"Pledge", 'DateTime'>
    readonly updatedAt: FieldRef<"Pledge", 'DateTime'>
  }
    

  // Custom InputTypes
  /**
   * Pledge findUnique
   */
  export type PledgeFindUniqueArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Pledge
     */
    select?: PledgeSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Pledge
     */
    omit?: PledgeOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: PledgeInclude<ExtArgs> | null
    /**
     * Filter, which Pledge to fetch.
     */
    where: PledgeWhereUniqueInput
  }

  /**
   * Pledge findUniqueOrThrow
   */
  export type PledgeFindUniqueOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Pledge
     */
    select?: PledgeSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Pledge
     */
    omit?: PledgeOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: PledgeInclude<ExtArgs> | null
    /**
     * Filter, which Pledge to fetch.
     */
    where: PledgeWhereUniqueInput
  }

  /**
   * Pledge findFirst
   */
  export type PledgeFindFirstArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Pledge
     */
    select?: PledgeSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Pledge
     */
    omit?: PledgeOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: PledgeInclude<ExtArgs> | null
    /**
     * Filter, which Pledge to fetch.
     */
    where?: PledgeWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Pledges to fetch.
     */
    orderBy?: PledgeOrderByWithRelationInput | PledgeOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for Pledges.
     */
    cursor?: PledgeWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Pledges from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Pledges.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of Pledges.
     */
    distinct?: PledgeScalarFieldEnum | PledgeScalarFieldEnum[]
  }

  /**
   * Pledge findFirstOrThrow
   */
  export type PledgeFindFirstOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Pledge
     */
    select?: PledgeSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Pledge
     */
    omit?: PledgeOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: PledgeInclude<ExtArgs> | null
    /**
     * Filter, which Pledge to fetch.
     */
    where?: PledgeWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Pledges to fetch.
     */
    orderBy?: PledgeOrderByWithRelationInput | PledgeOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for Pledges.
     */
    cursor?: PledgeWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Pledges from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Pledges.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of Pledges.
     */
    distinct?: PledgeScalarFieldEnum | PledgeScalarFieldEnum[]
  }

  /**
   * Pledge findMany
   */
  export type PledgeFindManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Pledge
     */
    select?: PledgeSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Pledge
     */
    omit?: PledgeOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: PledgeInclude<ExtArgs> | null
    /**
     * Filter, which Pledges to fetch.
     */
    where?: PledgeWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Pledges to fetch.
     */
    orderBy?: PledgeOrderByWithRelationInput | PledgeOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for listing Pledges.
     */
    cursor?: PledgeWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Pledges from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Pledges.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of Pledges.
     */
    distinct?: PledgeScalarFieldEnum | PledgeScalarFieldEnum[]
  }

  /**
   * Pledge create
   */
  export type PledgeCreateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Pledge
     */
    select?: PledgeSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Pledge
     */
    omit?: PledgeOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: PledgeInclude<ExtArgs> | null
    /**
     * The data needed to create a Pledge.
     */
    data: XOR<PledgeCreateInput, PledgeUncheckedCreateInput>
  }

  /**
   * Pledge createMany
   */
  export type PledgeCreateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to create many Pledges.
     */
    data: PledgeCreateManyInput | PledgeCreateManyInput[]
    skipDuplicates?: boolean
  }

  /**
   * Pledge createManyAndReturn
   */
  export type PledgeCreateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Pledge
     */
    select?: PledgeSelectCreateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the Pledge
     */
    omit?: PledgeOmit<ExtArgs> | null
    /**
     * The data used to create many Pledges.
     */
    data: PledgeCreateManyInput | PledgeCreateManyInput[]
    skipDuplicates?: boolean
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: PledgeIncludeCreateManyAndReturn<ExtArgs> | null
  }

  /**
   * Pledge update
   */
  export type PledgeUpdateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Pledge
     */
    select?: PledgeSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Pledge
     */
    omit?: PledgeOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: PledgeInclude<ExtArgs> | null
    /**
     * The data needed to update a Pledge.
     */
    data: XOR<PledgeUpdateInput, PledgeUncheckedUpdateInput>
    /**
     * Choose, which Pledge to update.
     */
    where: PledgeWhereUniqueInput
  }

  /**
   * Pledge updateMany
   */
  export type PledgeUpdateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to update Pledges.
     */
    data: XOR<PledgeUpdateManyMutationInput, PledgeUncheckedUpdateManyInput>
    /**
     * Filter which Pledges to update
     */
    where?: PledgeWhereInput
    /**
     * Limit how many Pledges to update.
     */
    limit?: number
  }

  /**
   * Pledge updateManyAndReturn
   */
  export type PledgeUpdateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Pledge
     */
    select?: PledgeSelectUpdateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the Pledge
     */
    omit?: PledgeOmit<ExtArgs> | null
    /**
     * The data used to update Pledges.
     */
    data: XOR<PledgeUpdateManyMutationInput, PledgeUncheckedUpdateManyInput>
    /**
     * Filter which Pledges to update
     */
    where?: PledgeWhereInput
    /**
     * Limit how many Pledges to update.
     */
    limit?: number
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: PledgeIncludeUpdateManyAndReturn<ExtArgs> | null
  }

  /**
   * Pledge upsert
   */
  export type PledgeUpsertArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Pledge
     */
    select?: PledgeSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Pledge
     */
    omit?: PledgeOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: PledgeInclude<ExtArgs> | null
    /**
     * The filter to search for the Pledge to update in case it exists.
     */
    where: PledgeWhereUniqueInput
    /**
     * In case the Pledge found by the `where` argument doesn't exist, create a new Pledge with this data.
     */
    create: XOR<PledgeCreateInput, PledgeUncheckedCreateInput>
    /**
     * In case the Pledge was found with the provided `where` argument, update it with this data.
     */
    update: XOR<PledgeUpdateInput, PledgeUncheckedUpdateInput>
  }

  /**
   * Pledge delete
   */
  export type PledgeDeleteArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Pledge
     */
    select?: PledgeSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Pledge
     */
    omit?: PledgeOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: PledgeInclude<ExtArgs> | null
    /**
     * Filter which Pledge to delete.
     */
    where: PledgeWhereUniqueInput
  }

  /**
   * Pledge deleteMany
   */
  export type PledgeDeleteManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which Pledges to delete
     */
    where?: PledgeWhereInput
    /**
     * Limit how many Pledges to delete.
     */
    limit?: number
  }

  /**
   * Pledge.pledgeAudits
   */
  export type Pledge$pledgeAuditsArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the PledgeAudit
     */
    select?: PledgeAuditSelect<ExtArgs> | null
    /**
     * Omit specific fields from the PledgeAudit
     */
    omit?: PledgeAuditOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: PledgeAuditInclude<ExtArgs> | null
    where?: PledgeAuditWhereInput
    orderBy?: PledgeAuditOrderByWithRelationInput | PledgeAuditOrderByWithRelationInput[]
    cursor?: PledgeAuditWhereUniqueInput
    take?: number
    skip?: number
    distinct?: PledgeAuditScalarFieldEnum | PledgeAuditScalarFieldEnum[]
  }

  /**
   * Pledge.items
   */
  export type Pledge$itemsArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the PledgeItem
     */
    select?: PledgeItemSelect<ExtArgs> | null
    /**
     * Omit specific fields from the PledgeItem
     */
    omit?: PledgeItemOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: PledgeItemInclude<ExtArgs> | null
    where?: PledgeItemWhereInput
    orderBy?: PledgeItemOrderByWithRelationInput | PledgeItemOrderByWithRelationInput[]
    cursor?: PledgeItemWhereUniqueInput
    take?: number
    skip?: number
    distinct?: PledgeItemScalarFieldEnum | PledgeItemScalarFieldEnum[]
  }

  /**
   * Pledge.transactions
   */
  export type Pledge$transactionsArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Transaction
     */
    select?: TransactionSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Transaction
     */
    omit?: TransactionOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: TransactionInclude<ExtArgs> | null
    where?: TransactionWhereInput
    orderBy?: TransactionOrderByWithRelationInput | TransactionOrderByWithRelationInput[]
    cursor?: TransactionWhereUniqueInput
    take?: number
    skip?: number
    distinct?: TransactionScalarFieldEnum | TransactionScalarFieldEnum[]
  }

  /**
   * Pledge without action
   */
  export type PledgeDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Pledge
     */
    select?: PledgeSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Pledge
     */
    omit?: PledgeOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: PledgeInclude<ExtArgs> | null
  }


  /**
   * Model PledgeItem
   */

  export type AggregatePledgeItem = {
    _count: PledgeItemCountAggregateOutputType | null
    _avg: PledgeItemAvgAggregateOutputType | null
    _sum: PledgeItemSumAggregateOutputType | null
    _min: PledgeItemMinAggregateOutputType | null
    _max: PledgeItemMaxAggregateOutputType | null
  }

  export type PledgeItemAvgAggregateOutputType = {
    quantity: number | null
    grossWeight: Decimal | null
    netWeight: Decimal | null
    purity: Decimal | null
    netWeightOfMetal: Decimal | null
  }

  export type PledgeItemSumAggregateOutputType = {
    quantity: number | null
    grossWeight: Decimal | null
    netWeight: Decimal | null
    purity: Decimal | null
    netWeightOfMetal: Decimal | null
  }

  export type PledgeItemMinAggregateOutputType = {
    id: string | null
    pledgeId: string | null
    itemType: $Enums.ItemType | null
    metalType: $Enums.MetalType | null
    itemName: string | null
    quantity: number | null
    grossWeight: Decimal | null
    netWeight: Decimal | null
    purity: Decimal | null
    netWeightOfMetal: Decimal | null
  }

  export type PledgeItemMaxAggregateOutputType = {
    id: string | null
    pledgeId: string | null
    itemType: $Enums.ItemType | null
    metalType: $Enums.MetalType | null
    itemName: string | null
    quantity: number | null
    grossWeight: Decimal | null
    netWeight: Decimal | null
    purity: Decimal | null
    netWeightOfMetal: Decimal | null
  }

  export type PledgeItemCountAggregateOutputType = {
    id: number
    pledgeId: number
    itemType: number
    metalType: number
    itemName: number
    quantity: number
    grossWeight: number
    netWeight: number
    purity: number
    netWeightOfMetal: number
    _all: number
  }


  export type PledgeItemAvgAggregateInputType = {
    quantity?: true
    grossWeight?: true
    netWeight?: true
    purity?: true
    netWeightOfMetal?: true
  }

  export type PledgeItemSumAggregateInputType = {
    quantity?: true
    grossWeight?: true
    netWeight?: true
    purity?: true
    netWeightOfMetal?: true
  }

  export type PledgeItemMinAggregateInputType = {
    id?: true
    pledgeId?: true
    itemType?: true
    metalType?: true
    itemName?: true
    quantity?: true
    grossWeight?: true
    netWeight?: true
    purity?: true
    netWeightOfMetal?: true
  }

  export type PledgeItemMaxAggregateInputType = {
    id?: true
    pledgeId?: true
    itemType?: true
    metalType?: true
    itemName?: true
    quantity?: true
    grossWeight?: true
    netWeight?: true
    purity?: true
    netWeightOfMetal?: true
  }

  export type PledgeItemCountAggregateInputType = {
    id?: true
    pledgeId?: true
    itemType?: true
    metalType?: true
    itemName?: true
    quantity?: true
    grossWeight?: true
    netWeight?: true
    purity?: true
    netWeightOfMetal?: true
    _all?: true
  }

  export type PledgeItemAggregateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which PledgeItem to aggregate.
     */
    where?: PledgeItemWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of PledgeItems to fetch.
     */
    orderBy?: PledgeItemOrderByWithRelationInput | PledgeItemOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the start position
     */
    cursor?: PledgeItemWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` PledgeItems from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` PledgeItems.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Count returned PledgeItems
    **/
    _count?: true | PledgeItemCountAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to average
    **/
    _avg?: PledgeItemAvgAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to sum
    **/
    _sum?: PledgeItemSumAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the minimum value
    **/
    _min?: PledgeItemMinAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the maximum value
    **/
    _max?: PledgeItemMaxAggregateInputType
  }

  export type GetPledgeItemAggregateType<T extends PledgeItemAggregateArgs> = {
        [P in keyof T & keyof AggregatePledgeItem]: P extends '_count' | 'count'
      ? T[P] extends true
        ? number
        : GetScalarType<T[P], AggregatePledgeItem[P]>
      : GetScalarType<T[P], AggregatePledgeItem[P]>
  }




  export type PledgeItemGroupByArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: PledgeItemWhereInput
    orderBy?: PledgeItemOrderByWithAggregationInput | PledgeItemOrderByWithAggregationInput[]
    by: PledgeItemScalarFieldEnum[] | PledgeItemScalarFieldEnum
    having?: PledgeItemScalarWhereWithAggregatesInput
    take?: number
    skip?: number
    _count?: PledgeItemCountAggregateInputType | true
    _avg?: PledgeItemAvgAggregateInputType
    _sum?: PledgeItemSumAggregateInputType
    _min?: PledgeItemMinAggregateInputType
    _max?: PledgeItemMaxAggregateInputType
  }

  export type PledgeItemGroupByOutputType = {
    id: string
    pledgeId: string
    itemType: $Enums.ItemType
    metalType: $Enums.MetalType
    itemName: string | null
    quantity: number
    grossWeight: Decimal
    netWeight: Decimal
    purity: Decimal
    netWeightOfMetal: Decimal
    _count: PledgeItemCountAggregateOutputType | null
    _avg: PledgeItemAvgAggregateOutputType | null
    _sum: PledgeItemSumAggregateOutputType | null
    _min: PledgeItemMinAggregateOutputType | null
    _max: PledgeItemMaxAggregateOutputType | null
  }

  type GetPledgeItemGroupByPayload<T extends PledgeItemGroupByArgs> = Prisma.PrismaPromise<
    Array<
      PickEnumerable<PledgeItemGroupByOutputType, T['by']> &
        {
          [P in ((keyof T) & (keyof PledgeItemGroupByOutputType))]: P extends '_count'
            ? T[P] extends boolean
              ? number
              : GetScalarType<T[P], PledgeItemGroupByOutputType[P]>
            : GetScalarType<T[P], PledgeItemGroupByOutputType[P]>
        }
      >
    >


  export type PledgeItemSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    pledgeId?: boolean
    itemType?: boolean
    metalType?: boolean
    itemName?: boolean
    quantity?: boolean
    grossWeight?: boolean
    netWeight?: boolean
    purity?: boolean
    netWeightOfMetal?: boolean
    pledge?: boolean | PledgeDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["pledgeItem"]>

  export type PledgeItemSelectCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    pledgeId?: boolean
    itemType?: boolean
    metalType?: boolean
    itemName?: boolean
    quantity?: boolean
    grossWeight?: boolean
    netWeight?: boolean
    purity?: boolean
    netWeightOfMetal?: boolean
    pledge?: boolean | PledgeDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["pledgeItem"]>

  export type PledgeItemSelectUpdateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    pledgeId?: boolean
    itemType?: boolean
    metalType?: boolean
    itemName?: boolean
    quantity?: boolean
    grossWeight?: boolean
    netWeight?: boolean
    purity?: boolean
    netWeightOfMetal?: boolean
    pledge?: boolean | PledgeDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["pledgeItem"]>

  export type PledgeItemSelectScalar = {
    id?: boolean
    pledgeId?: boolean
    itemType?: boolean
    metalType?: boolean
    itemName?: boolean
    quantity?: boolean
    grossWeight?: boolean
    netWeight?: boolean
    purity?: boolean
    netWeightOfMetal?: boolean
  }

  export type PledgeItemOmit<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetOmit<"id" | "pledgeId" | "itemType" | "metalType" | "itemName" | "quantity" | "grossWeight" | "netWeight" | "purity" | "netWeightOfMetal", ExtArgs["result"]["pledgeItem"]>
  export type PledgeItemInclude<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    pledge?: boolean | PledgeDefaultArgs<ExtArgs>
  }
  export type PledgeItemIncludeCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    pledge?: boolean | PledgeDefaultArgs<ExtArgs>
  }
  export type PledgeItemIncludeUpdateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    pledge?: boolean | PledgeDefaultArgs<ExtArgs>
  }

  export type $PledgeItemPayload<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    name: "PledgeItem"
    objects: {
      pledge: Prisma.$PledgePayload<ExtArgs>
    }
    scalars: $Extensions.GetPayloadResult<{
      id: string
      pledgeId: string
      itemType: $Enums.ItemType
      metalType: $Enums.MetalType
      itemName: string | null
      quantity: number
      grossWeight: Prisma.Decimal
      netWeight: Prisma.Decimal
      purity: Prisma.Decimal
      netWeightOfMetal: Prisma.Decimal
    }, ExtArgs["result"]["pledgeItem"]>
    composites: {}
  }

  type PledgeItemGetPayload<S extends boolean | null | undefined | PledgeItemDefaultArgs> = $Result.GetResult<Prisma.$PledgeItemPayload, S>

  type PledgeItemCountArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> =
    Omit<PledgeItemFindManyArgs, 'select' | 'include' | 'distinct' | 'omit'> & {
      select?: PledgeItemCountAggregateInputType | true
    }

  export interface PledgeItemDelegate<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> {
    [K: symbol]: { types: Prisma.TypeMap<ExtArgs>['model']['PledgeItem'], meta: { name: 'PledgeItem' } }
    /**
     * Find zero or one PledgeItem that matches the filter.
     * @param {PledgeItemFindUniqueArgs} args - Arguments to find a PledgeItem
     * @example
     * // Get one PledgeItem
     * const pledgeItem = await prisma.pledgeItem.findUnique({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUnique<T extends PledgeItemFindUniqueArgs>(args: SelectSubset<T, PledgeItemFindUniqueArgs<ExtArgs>>): Prisma__PledgeItemClient<$Result.GetResult<Prisma.$PledgeItemPayload<ExtArgs>, T, "findUnique", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find one PledgeItem that matches the filter or throw an error with `error.code='P2025'`
     * if no matches were found.
     * @param {PledgeItemFindUniqueOrThrowArgs} args - Arguments to find a PledgeItem
     * @example
     * // Get one PledgeItem
     * const pledgeItem = await prisma.pledgeItem.findUniqueOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUniqueOrThrow<T extends PledgeItemFindUniqueOrThrowArgs>(args: SelectSubset<T, PledgeItemFindUniqueOrThrowArgs<ExtArgs>>): Prisma__PledgeItemClient<$Result.GetResult<Prisma.$PledgeItemPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first PledgeItem that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {PledgeItemFindFirstArgs} args - Arguments to find a PledgeItem
     * @example
     * // Get one PledgeItem
     * const pledgeItem = await prisma.pledgeItem.findFirst({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirst<T extends PledgeItemFindFirstArgs>(args?: SelectSubset<T, PledgeItemFindFirstArgs<ExtArgs>>): Prisma__PledgeItemClient<$Result.GetResult<Prisma.$PledgeItemPayload<ExtArgs>, T, "findFirst", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first PledgeItem that matches the filter or
     * throw `PrismaKnownClientError` with `P2025` code if no matches were found.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {PledgeItemFindFirstOrThrowArgs} args - Arguments to find a PledgeItem
     * @example
     * // Get one PledgeItem
     * const pledgeItem = await prisma.pledgeItem.findFirstOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirstOrThrow<T extends PledgeItemFindFirstOrThrowArgs>(args?: SelectSubset<T, PledgeItemFindFirstOrThrowArgs<ExtArgs>>): Prisma__PledgeItemClient<$Result.GetResult<Prisma.$PledgeItemPayload<ExtArgs>, T, "findFirstOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find zero or more PledgeItems that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {PledgeItemFindManyArgs} args - Arguments to filter and select certain fields only.
     * @example
     * // Get all PledgeItems
     * const pledgeItems = await prisma.pledgeItem.findMany()
     * 
     * // Get first 10 PledgeItems
     * const pledgeItems = await prisma.pledgeItem.findMany({ take: 10 })
     * 
     * // Only select the `id`
     * const pledgeItemWithIdOnly = await prisma.pledgeItem.findMany({ select: { id: true } })
     * 
     */
    findMany<T extends PledgeItemFindManyArgs>(args?: SelectSubset<T, PledgeItemFindManyArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$PledgeItemPayload<ExtArgs>, T, "findMany", GlobalOmitOptions>>

    /**
     * Create a PledgeItem.
     * @param {PledgeItemCreateArgs} args - Arguments to create a PledgeItem.
     * @example
     * // Create one PledgeItem
     * const PledgeItem = await prisma.pledgeItem.create({
     *   data: {
     *     // ... data to create a PledgeItem
     *   }
     * })
     * 
     */
    create<T extends PledgeItemCreateArgs>(args: SelectSubset<T, PledgeItemCreateArgs<ExtArgs>>): Prisma__PledgeItemClient<$Result.GetResult<Prisma.$PledgeItemPayload<ExtArgs>, T, "create", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Create many PledgeItems.
     * @param {PledgeItemCreateManyArgs} args - Arguments to create many PledgeItems.
     * @example
     * // Create many PledgeItems
     * const pledgeItem = await prisma.pledgeItem.createMany({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     *     
     */
    createMany<T extends PledgeItemCreateManyArgs>(args?: SelectSubset<T, PledgeItemCreateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create many PledgeItems and returns the data saved in the database.
     * @param {PledgeItemCreateManyAndReturnArgs} args - Arguments to create many PledgeItems.
     * @example
     * // Create many PledgeItems
     * const pledgeItem = await prisma.pledgeItem.createManyAndReturn({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Create many PledgeItems and only return the `id`
     * const pledgeItemWithIdOnly = await prisma.pledgeItem.createManyAndReturn({
     *   select: { id: true },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    createManyAndReturn<T extends PledgeItemCreateManyAndReturnArgs>(args?: SelectSubset<T, PledgeItemCreateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$PledgeItemPayload<ExtArgs>, T, "createManyAndReturn", GlobalOmitOptions>>

    /**
     * Delete a PledgeItem.
     * @param {PledgeItemDeleteArgs} args - Arguments to delete one PledgeItem.
     * @example
     * // Delete one PledgeItem
     * const PledgeItem = await prisma.pledgeItem.delete({
     *   where: {
     *     // ... filter to delete one PledgeItem
     *   }
     * })
     * 
     */
    delete<T extends PledgeItemDeleteArgs>(args: SelectSubset<T, PledgeItemDeleteArgs<ExtArgs>>): Prisma__PledgeItemClient<$Result.GetResult<Prisma.$PledgeItemPayload<ExtArgs>, T, "delete", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Update one PledgeItem.
     * @param {PledgeItemUpdateArgs} args - Arguments to update one PledgeItem.
     * @example
     * // Update one PledgeItem
     * const pledgeItem = await prisma.pledgeItem.update({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    update<T extends PledgeItemUpdateArgs>(args: SelectSubset<T, PledgeItemUpdateArgs<ExtArgs>>): Prisma__PledgeItemClient<$Result.GetResult<Prisma.$PledgeItemPayload<ExtArgs>, T, "update", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Delete zero or more PledgeItems.
     * @param {PledgeItemDeleteManyArgs} args - Arguments to filter PledgeItems to delete.
     * @example
     * // Delete a few PledgeItems
     * const { count } = await prisma.pledgeItem.deleteMany({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     * 
     */
    deleteMany<T extends PledgeItemDeleteManyArgs>(args?: SelectSubset<T, PledgeItemDeleteManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more PledgeItems.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {PledgeItemUpdateManyArgs} args - Arguments to update one or more rows.
     * @example
     * // Update many PledgeItems
     * const pledgeItem = await prisma.pledgeItem.updateMany({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    updateMany<T extends PledgeItemUpdateManyArgs>(args: SelectSubset<T, PledgeItemUpdateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more PledgeItems and returns the data updated in the database.
     * @param {PledgeItemUpdateManyAndReturnArgs} args - Arguments to update many PledgeItems.
     * @example
     * // Update many PledgeItems
     * const pledgeItem = await prisma.pledgeItem.updateManyAndReturn({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Update zero or more PledgeItems and only return the `id`
     * const pledgeItemWithIdOnly = await prisma.pledgeItem.updateManyAndReturn({
     *   select: { id: true },
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    updateManyAndReturn<T extends PledgeItemUpdateManyAndReturnArgs>(args: SelectSubset<T, PledgeItemUpdateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$PledgeItemPayload<ExtArgs>, T, "updateManyAndReturn", GlobalOmitOptions>>

    /**
     * Create or update one PledgeItem.
     * @param {PledgeItemUpsertArgs} args - Arguments to update or create a PledgeItem.
     * @example
     * // Update or create a PledgeItem
     * const pledgeItem = await prisma.pledgeItem.upsert({
     *   create: {
     *     // ... data to create a PledgeItem
     *   },
     *   update: {
     *     // ... in case it already exists, update
     *   },
     *   where: {
     *     // ... the filter for the PledgeItem we want to update
     *   }
     * })
     */
    upsert<T extends PledgeItemUpsertArgs>(args: SelectSubset<T, PledgeItemUpsertArgs<ExtArgs>>): Prisma__PledgeItemClient<$Result.GetResult<Prisma.$PledgeItemPayload<ExtArgs>, T, "upsert", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>


    /**
     * Count the number of PledgeItems.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {PledgeItemCountArgs} args - Arguments to filter PledgeItems to count.
     * @example
     * // Count the number of PledgeItems
     * const count = await prisma.pledgeItem.count({
     *   where: {
     *     // ... the filter for the PledgeItems we want to count
     *   }
     * })
    **/
    count<T extends PledgeItemCountArgs>(
      args?: Subset<T, PledgeItemCountArgs>,
    ): Prisma.PrismaPromise<
      T extends $Utils.Record<'select', any>
        ? T['select'] extends true
          ? number
          : GetScalarType<T['select'], PledgeItemCountAggregateOutputType>
        : number
    >

    /**
     * Allows you to perform aggregations operations on a PledgeItem.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {PledgeItemAggregateArgs} args - Select which aggregations you would like to apply and on what fields.
     * @example
     * // Ordered by age ascending
     * // Where email contains prisma.io
     * // Limited to the 10 users
     * const aggregations = await prisma.user.aggregate({
     *   _avg: {
     *     age: true,
     *   },
     *   where: {
     *     email: {
     *       contains: "prisma.io",
     *     },
     *   },
     *   orderBy: {
     *     age: "asc",
     *   },
     *   take: 10,
     * })
    **/
    aggregate<T extends PledgeItemAggregateArgs>(args: Subset<T, PledgeItemAggregateArgs>): Prisma.PrismaPromise<GetPledgeItemAggregateType<T>>

    /**
     * Group by PledgeItem.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {PledgeItemGroupByArgs} args - Group by arguments.
     * @example
     * // Group by city, order by createdAt, get count
     * const result = await prisma.user.groupBy({
     *   by: ['city', 'createdAt'],
     *   orderBy: {
     *     createdAt: true
     *   },
     *   _count: {
     *     _all: true
     *   },
     * })
     * 
    **/
    groupBy<
      T extends PledgeItemGroupByArgs,
      HasSelectOrTake extends Or<
        Extends<'skip', Keys<T>>,
        Extends<'take', Keys<T>>
      >,
      OrderByArg extends True extends HasSelectOrTake
        ? { orderBy: PledgeItemGroupByArgs['orderBy'] }
        : { orderBy?: PledgeItemGroupByArgs['orderBy'] },
      OrderFields extends ExcludeUnderscoreKeys<Keys<MaybeTupleToUnion<T['orderBy']>>>,
      ByFields extends MaybeTupleToUnion<T['by']>,
      ByValid extends Has<ByFields, OrderFields>,
      HavingFields extends GetHavingFields<T['having']>,
      HavingValid extends Has<ByFields, HavingFields>,
      ByEmpty extends T['by'] extends never[] ? True : False,
      InputErrors extends ByEmpty extends True
      ? `Error: "by" must not be empty.`
      : HavingValid extends False
      ? {
          [P in HavingFields]: P extends ByFields
            ? never
            : P extends string
            ? `Error: Field "${P}" used in "having" needs to be provided in "by".`
            : [
                Error,
                'Field ',
                P,
                ` in "having" needs to be provided in "by"`,
              ]
        }[HavingFields]
      : 'take' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "take", you also need to provide "orderBy"'
      : 'skip' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "skip", you also need to provide "orderBy"'
      : ByValid extends True
      ? {}
      : {
          [P in OrderFields]: P extends ByFields
            ? never
            : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
        }[OrderFields]
    >(args: SubsetIntersection<T, PledgeItemGroupByArgs, OrderByArg> & InputErrors): {} extends InputErrors ? GetPledgeItemGroupByPayload<T> : Prisma.PrismaPromise<InputErrors>
  /**
   * Fields of the PledgeItem model
   */
  readonly fields: PledgeItemFieldRefs;
  }

  /**
   * The delegate class that acts as a "Promise-like" for PledgeItem.
   * Why is this prefixed with `Prisma__`?
   * Because we want to prevent naming conflicts as mentioned in
   * https://github.com/prisma/prisma-client-js/issues/707
   */
  export interface Prisma__PledgeItemClient<T, Null = never, ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> extends Prisma.PrismaPromise<T> {
    readonly [Symbol.toStringTag]: "PrismaPromise"
    pledge<T extends PledgeDefaultArgs<ExtArgs> = {}>(args?: Subset<T, PledgeDefaultArgs<ExtArgs>>): Prisma__PledgeClient<$Result.GetResult<Prisma.$PledgePayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions> | Null, Null, ExtArgs, GlobalOmitOptions>
    /**
     * Attaches callbacks for the resolution and/or rejection of the Promise.
     * @param onfulfilled The callback to execute when the Promise is resolved.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of which ever callback is executed.
     */
    then<TResult1 = T, TResult2 = never>(onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | undefined | null, onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null): $Utils.JsPromise<TResult1 | TResult2>
    /**
     * Attaches a callback for only the rejection of the Promise.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of the callback.
     */
    catch<TResult = never>(onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | undefined | null): $Utils.JsPromise<T | TResult>
    /**
     * Attaches a callback that is invoked when the Promise is settled (fulfilled or rejected). The
     * resolved value cannot be modified from the callback.
     * @param onfinally The callback to execute when the Promise is settled (fulfilled or rejected).
     * @returns A Promise for the completion of the callback.
     */
    finally(onfinally?: (() => void) | undefined | null): $Utils.JsPromise<T>
  }




  /**
   * Fields of the PledgeItem model
   */
  interface PledgeItemFieldRefs {
    readonly id: FieldRef<"PledgeItem", 'String'>
    readonly pledgeId: FieldRef<"PledgeItem", 'String'>
    readonly itemType: FieldRef<"PledgeItem", 'ItemType'>
    readonly metalType: FieldRef<"PledgeItem", 'MetalType'>
    readonly itemName: FieldRef<"PledgeItem", 'String'>
    readonly quantity: FieldRef<"PledgeItem", 'Int'>
    readonly grossWeight: FieldRef<"PledgeItem", 'Decimal'>
    readonly netWeight: FieldRef<"PledgeItem", 'Decimal'>
    readonly purity: FieldRef<"PledgeItem", 'Decimal'>
    readonly netWeightOfMetal: FieldRef<"PledgeItem", 'Decimal'>
  }
    

  // Custom InputTypes
  /**
   * PledgeItem findUnique
   */
  export type PledgeItemFindUniqueArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the PledgeItem
     */
    select?: PledgeItemSelect<ExtArgs> | null
    /**
     * Omit specific fields from the PledgeItem
     */
    omit?: PledgeItemOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: PledgeItemInclude<ExtArgs> | null
    /**
     * Filter, which PledgeItem to fetch.
     */
    where: PledgeItemWhereUniqueInput
  }

  /**
   * PledgeItem findUniqueOrThrow
   */
  export type PledgeItemFindUniqueOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the PledgeItem
     */
    select?: PledgeItemSelect<ExtArgs> | null
    /**
     * Omit specific fields from the PledgeItem
     */
    omit?: PledgeItemOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: PledgeItemInclude<ExtArgs> | null
    /**
     * Filter, which PledgeItem to fetch.
     */
    where: PledgeItemWhereUniqueInput
  }

  /**
   * PledgeItem findFirst
   */
  export type PledgeItemFindFirstArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the PledgeItem
     */
    select?: PledgeItemSelect<ExtArgs> | null
    /**
     * Omit specific fields from the PledgeItem
     */
    omit?: PledgeItemOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: PledgeItemInclude<ExtArgs> | null
    /**
     * Filter, which PledgeItem to fetch.
     */
    where?: PledgeItemWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of PledgeItems to fetch.
     */
    orderBy?: PledgeItemOrderByWithRelationInput | PledgeItemOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for PledgeItems.
     */
    cursor?: PledgeItemWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` PledgeItems from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` PledgeItems.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of PledgeItems.
     */
    distinct?: PledgeItemScalarFieldEnum | PledgeItemScalarFieldEnum[]
  }

  /**
   * PledgeItem findFirstOrThrow
   */
  export type PledgeItemFindFirstOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the PledgeItem
     */
    select?: PledgeItemSelect<ExtArgs> | null
    /**
     * Omit specific fields from the PledgeItem
     */
    omit?: PledgeItemOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: PledgeItemInclude<ExtArgs> | null
    /**
     * Filter, which PledgeItem to fetch.
     */
    where?: PledgeItemWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of PledgeItems to fetch.
     */
    orderBy?: PledgeItemOrderByWithRelationInput | PledgeItemOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for PledgeItems.
     */
    cursor?: PledgeItemWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` PledgeItems from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` PledgeItems.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of PledgeItems.
     */
    distinct?: PledgeItemScalarFieldEnum | PledgeItemScalarFieldEnum[]
  }

  /**
   * PledgeItem findMany
   */
  export type PledgeItemFindManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the PledgeItem
     */
    select?: PledgeItemSelect<ExtArgs> | null
    /**
     * Omit specific fields from the PledgeItem
     */
    omit?: PledgeItemOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: PledgeItemInclude<ExtArgs> | null
    /**
     * Filter, which PledgeItems to fetch.
     */
    where?: PledgeItemWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of PledgeItems to fetch.
     */
    orderBy?: PledgeItemOrderByWithRelationInput | PledgeItemOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for listing PledgeItems.
     */
    cursor?: PledgeItemWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` PledgeItems from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` PledgeItems.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of PledgeItems.
     */
    distinct?: PledgeItemScalarFieldEnum | PledgeItemScalarFieldEnum[]
  }

  /**
   * PledgeItem create
   */
  export type PledgeItemCreateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the PledgeItem
     */
    select?: PledgeItemSelect<ExtArgs> | null
    /**
     * Omit specific fields from the PledgeItem
     */
    omit?: PledgeItemOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: PledgeItemInclude<ExtArgs> | null
    /**
     * The data needed to create a PledgeItem.
     */
    data: XOR<PledgeItemCreateInput, PledgeItemUncheckedCreateInput>
  }

  /**
   * PledgeItem createMany
   */
  export type PledgeItemCreateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to create many PledgeItems.
     */
    data: PledgeItemCreateManyInput | PledgeItemCreateManyInput[]
    skipDuplicates?: boolean
  }

  /**
   * PledgeItem createManyAndReturn
   */
  export type PledgeItemCreateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the PledgeItem
     */
    select?: PledgeItemSelectCreateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the PledgeItem
     */
    omit?: PledgeItemOmit<ExtArgs> | null
    /**
     * The data used to create many PledgeItems.
     */
    data: PledgeItemCreateManyInput | PledgeItemCreateManyInput[]
    skipDuplicates?: boolean
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: PledgeItemIncludeCreateManyAndReturn<ExtArgs> | null
  }

  /**
   * PledgeItem update
   */
  export type PledgeItemUpdateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the PledgeItem
     */
    select?: PledgeItemSelect<ExtArgs> | null
    /**
     * Omit specific fields from the PledgeItem
     */
    omit?: PledgeItemOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: PledgeItemInclude<ExtArgs> | null
    /**
     * The data needed to update a PledgeItem.
     */
    data: XOR<PledgeItemUpdateInput, PledgeItemUncheckedUpdateInput>
    /**
     * Choose, which PledgeItem to update.
     */
    where: PledgeItemWhereUniqueInput
  }

  /**
   * PledgeItem updateMany
   */
  export type PledgeItemUpdateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to update PledgeItems.
     */
    data: XOR<PledgeItemUpdateManyMutationInput, PledgeItemUncheckedUpdateManyInput>
    /**
     * Filter which PledgeItems to update
     */
    where?: PledgeItemWhereInput
    /**
     * Limit how many PledgeItems to update.
     */
    limit?: number
  }

  /**
   * PledgeItem updateManyAndReturn
   */
  export type PledgeItemUpdateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the PledgeItem
     */
    select?: PledgeItemSelectUpdateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the PledgeItem
     */
    omit?: PledgeItemOmit<ExtArgs> | null
    /**
     * The data used to update PledgeItems.
     */
    data: XOR<PledgeItemUpdateManyMutationInput, PledgeItemUncheckedUpdateManyInput>
    /**
     * Filter which PledgeItems to update
     */
    where?: PledgeItemWhereInput
    /**
     * Limit how many PledgeItems to update.
     */
    limit?: number
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: PledgeItemIncludeUpdateManyAndReturn<ExtArgs> | null
  }

  /**
   * PledgeItem upsert
   */
  export type PledgeItemUpsertArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the PledgeItem
     */
    select?: PledgeItemSelect<ExtArgs> | null
    /**
     * Omit specific fields from the PledgeItem
     */
    omit?: PledgeItemOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: PledgeItemInclude<ExtArgs> | null
    /**
     * The filter to search for the PledgeItem to update in case it exists.
     */
    where: PledgeItemWhereUniqueInput
    /**
     * In case the PledgeItem found by the `where` argument doesn't exist, create a new PledgeItem with this data.
     */
    create: XOR<PledgeItemCreateInput, PledgeItemUncheckedCreateInput>
    /**
     * In case the PledgeItem was found with the provided `where` argument, update it with this data.
     */
    update: XOR<PledgeItemUpdateInput, PledgeItemUncheckedUpdateInput>
  }

  /**
   * PledgeItem delete
   */
  export type PledgeItemDeleteArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the PledgeItem
     */
    select?: PledgeItemSelect<ExtArgs> | null
    /**
     * Omit specific fields from the PledgeItem
     */
    omit?: PledgeItemOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: PledgeItemInclude<ExtArgs> | null
    /**
     * Filter which PledgeItem to delete.
     */
    where: PledgeItemWhereUniqueInput
  }

  /**
   * PledgeItem deleteMany
   */
  export type PledgeItemDeleteManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which PledgeItems to delete
     */
    where?: PledgeItemWhereInput
    /**
     * Limit how many PledgeItems to delete.
     */
    limit?: number
  }

  /**
   * PledgeItem without action
   */
  export type PledgeItemDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the PledgeItem
     */
    select?: PledgeItemSelect<ExtArgs> | null
    /**
     * Omit specific fields from the PledgeItem
     */
    omit?: PledgeItemOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: PledgeItemInclude<ExtArgs> | null
  }


  /**
   * Model PledgeAudit
   */

  export type AggregatePledgeAudit = {
    _count: PledgeAuditCountAggregateOutputType | null
    _avg: PledgeAuditAvgAggregateOutputType | null
    _sum: PledgeAuditSumAggregateOutputType | null
    _min: PledgeAuditMinAggregateOutputType | null
    _max: PledgeAuditMaxAggregateOutputType | null
  }

  export type PledgeAuditAvgAggregateOutputType = {
    principal: Decimal | null
    interestRate: Decimal | null
    calculationVersion: number | null
    durationMonths: Decimal | null
    netWeightOfGold: Decimal | null
    netWeightOfSilver: Decimal | null
    goldPricePerGram: Decimal | null
    silverPricePerGram: Decimal | null
    marketValueAtRelease: Decimal | null
    ltvAtRelease: Decimal | null
    totalInterest: Decimal | null
    receivableAmount: Decimal | null
  }

  export type PledgeAuditSumAggregateOutputType = {
    principal: Decimal | null
    interestRate: Decimal | null
    calculationVersion: number | null
    durationMonths: Decimal | null
    netWeightOfGold: Decimal | null
    netWeightOfSilver: Decimal | null
    goldPricePerGram: Decimal | null
    silverPricePerGram: Decimal | null
    marketValueAtRelease: Decimal | null
    ltvAtRelease: Decimal | null
    totalInterest: Decimal | null
    receivableAmount: Decimal | null
  }

  export type PledgeAuditMinAggregateOutputType = {
    id: string | null
    pledgeId: string | null
    action: $Enums.AuditAction | null
    principal: Decimal | null
    interestRate: Decimal | null
    allowCompounding: boolean | null
    compoundingDuration: $Enums.CompoundingDuration | null
    calculationVersion: number | null
    durationMonths: Decimal | null
    netWeightOfGold: Decimal | null
    netWeightOfSilver: Decimal | null
    goldPricePerGram: Decimal | null
    silverPricePerGram: Decimal | null
    marketValueAtRelease: Decimal | null
    ltvAtRelease: Decimal | null
    totalInterest: Decimal | null
    receivableAmount: Decimal | null
    releaseDate: Date | null
    createdAt: Date | null
  }

  export type PledgeAuditMaxAggregateOutputType = {
    id: string | null
    pledgeId: string | null
    action: $Enums.AuditAction | null
    principal: Decimal | null
    interestRate: Decimal | null
    allowCompounding: boolean | null
    compoundingDuration: $Enums.CompoundingDuration | null
    calculationVersion: number | null
    durationMonths: Decimal | null
    netWeightOfGold: Decimal | null
    netWeightOfSilver: Decimal | null
    goldPricePerGram: Decimal | null
    silverPricePerGram: Decimal | null
    marketValueAtRelease: Decimal | null
    ltvAtRelease: Decimal | null
    totalInterest: Decimal | null
    receivableAmount: Decimal | null
    releaseDate: Date | null
    createdAt: Date | null
  }

  export type PledgeAuditCountAggregateOutputType = {
    id: number
    pledgeId: number
    action: number
    principal: number
    interestRate: number
    allowCompounding: number
    compoundingDuration: number
    calculationVersion: number
    durationMonths: number
    netWeightOfGold: number
    netWeightOfSilver: number
    goldPricePerGram: number
    silverPricePerGram: number
    marketValueAtRelease: number
    ltvAtRelease: number
    totalInterest: number
    receivableAmount: number
    releaseDate: number
    createdAt: number
    _all: number
  }


  export type PledgeAuditAvgAggregateInputType = {
    principal?: true
    interestRate?: true
    calculationVersion?: true
    durationMonths?: true
    netWeightOfGold?: true
    netWeightOfSilver?: true
    goldPricePerGram?: true
    silverPricePerGram?: true
    marketValueAtRelease?: true
    ltvAtRelease?: true
    totalInterest?: true
    receivableAmount?: true
  }

  export type PledgeAuditSumAggregateInputType = {
    principal?: true
    interestRate?: true
    calculationVersion?: true
    durationMonths?: true
    netWeightOfGold?: true
    netWeightOfSilver?: true
    goldPricePerGram?: true
    silverPricePerGram?: true
    marketValueAtRelease?: true
    ltvAtRelease?: true
    totalInterest?: true
    receivableAmount?: true
  }

  export type PledgeAuditMinAggregateInputType = {
    id?: true
    pledgeId?: true
    action?: true
    principal?: true
    interestRate?: true
    allowCompounding?: true
    compoundingDuration?: true
    calculationVersion?: true
    durationMonths?: true
    netWeightOfGold?: true
    netWeightOfSilver?: true
    goldPricePerGram?: true
    silverPricePerGram?: true
    marketValueAtRelease?: true
    ltvAtRelease?: true
    totalInterest?: true
    receivableAmount?: true
    releaseDate?: true
    createdAt?: true
  }

  export type PledgeAuditMaxAggregateInputType = {
    id?: true
    pledgeId?: true
    action?: true
    principal?: true
    interestRate?: true
    allowCompounding?: true
    compoundingDuration?: true
    calculationVersion?: true
    durationMonths?: true
    netWeightOfGold?: true
    netWeightOfSilver?: true
    goldPricePerGram?: true
    silverPricePerGram?: true
    marketValueAtRelease?: true
    ltvAtRelease?: true
    totalInterest?: true
    receivableAmount?: true
    releaseDate?: true
    createdAt?: true
  }

  export type PledgeAuditCountAggregateInputType = {
    id?: true
    pledgeId?: true
    action?: true
    principal?: true
    interestRate?: true
    allowCompounding?: true
    compoundingDuration?: true
    calculationVersion?: true
    durationMonths?: true
    netWeightOfGold?: true
    netWeightOfSilver?: true
    goldPricePerGram?: true
    silverPricePerGram?: true
    marketValueAtRelease?: true
    ltvAtRelease?: true
    totalInterest?: true
    receivableAmount?: true
    releaseDate?: true
    createdAt?: true
    _all?: true
  }

  export type PledgeAuditAggregateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which PledgeAudit to aggregate.
     */
    where?: PledgeAuditWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of PledgeAudits to fetch.
     */
    orderBy?: PledgeAuditOrderByWithRelationInput | PledgeAuditOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the start position
     */
    cursor?: PledgeAuditWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` PledgeAudits from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` PledgeAudits.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Count returned PledgeAudits
    **/
    _count?: true | PledgeAuditCountAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to average
    **/
    _avg?: PledgeAuditAvgAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to sum
    **/
    _sum?: PledgeAuditSumAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the minimum value
    **/
    _min?: PledgeAuditMinAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the maximum value
    **/
    _max?: PledgeAuditMaxAggregateInputType
  }

  export type GetPledgeAuditAggregateType<T extends PledgeAuditAggregateArgs> = {
        [P in keyof T & keyof AggregatePledgeAudit]: P extends '_count' | 'count'
      ? T[P] extends true
        ? number
        : GetScalarType<T[P], AggregatePledgeAudit[P]>
      : GetScalarType<T[P], AggregatePledgeAudit[P]>
  }




  export type PledgeAuditGroupByArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: PledgeAuditWhereInput
    orderBy?: PledgeAuditOrderByWithAggregationInput | PledgeAuditOrderByWithAggregationInput[]
    by: PledgeAuditScalarFieldEnum[] | PledgeAuditScalarFieldEnum
    having?: PledgeAuditScalarWhereWithAggregatesInput
    take?: number
    skip?: number
    _count?: PledgeAuditCountAggregateInputType | true
    _avg?: PledgeAuditAvgAggregateInputType
    _sum?: PledgeAuditSumAggregateInputType
    _min?: PledgeAuditMinAggregateInputType
    _max?: PledgeAuditMaxAggregateInputType
  }

  export type PledgeAuditGroupByOutputType = {
    id: string
    pledgeId: string
    action: $Enums.AuditAction
    principal: Decimal
    interestRate: Decimal
    allowCompounding: boolean
    compoundingDuration: $Enums.CompoundingDuration
    calculationVersion: number
    durationMonths: Decimal | null
    netWeightOfGold: Decimal
    netWeightOfSilver: Decimal
    goldPricePerGram: Decimal | null
    silverPricePerGram: Decimal | null
    marketValueAtRelease: Decimal | null
    ltvAtRelease: Decimal | null
    totalInterest: Decimal | null
    receivableAmount: Decimal | null
    releaseDate: Date | null
    createdAt: Date
    _count: PledgeAuditCountAggregateOutputType | null
    _avg: PledgeAuditAvgAggregateOutputType | null
    _sum: PledgeAuditSumAggregateOutputType | null
    _min: PledgeAuditMinAggregateOutputType | null
    _max: PledgeAuditMaxAggregateOutputType | null
  }

  type GetPledgeAuditGroupByPayload<T extends PledgeAuditGroupByArgs> = Prisma.PrismaPromise<
    Array<
      PickEnumerable<PledgeAuditGroupByOutputType, T['by']> &
        {
          [P in ((keyof T) & (keyof PledgeAuditGroupByOutputType))]: P extends '_count'
            ? T[P] extends boolean
              ? number
              : GetScalarType<T[P], PledgeAuditGroupByOutputType[P]>
            : GetScalarType<T[P], PledgeAuditGroupByOutputType[P]>
        }
      >
    >


  export type PledgeAuditSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    pledgeId?: boolean
    action?: boolean
    principal?: boolean
    interestRate?: boolean
    allowCompounding?: boolean
    compoundingDuration?: boolean
    calculationVersion?: boolean
    durationMonths?: boolean
    netWeightOfGold?: boolean
    netWeightOfSilver?: boolean
    goldPricePerGram?: boolean
    silverPricePerGram?: boolean
    marketValueAtRelease?: boolean
    ltvAtRelease?: boolean
    totalInterest?: boolean
    receivableAmount?: boolean
    releaseDate?: boolean
    createdAt?: boolean
    pledge?: boolean | PledgeDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["pledgeAudit"]>

  export type PledgeAuditSelectCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    pledgeId?: boolean
    action?: boolean
    principal?: boolean
    interestRate?: boolean
    allowCompounding?: boolean
    compoundingDuration?: boolean
    calculationVersion?: boolean
    durationMonths?: boolean
    netWeightOfGold?: boolean
    netWeightOfSilver?: boolean
    goldPricePerGram?: boolean
    silverPricePerGram?: boolean
    marketValueAtRelease?: boolean
    ltvAtRelease?: boolean
    totalInterest?: boolean
    receivableAmount?: boolean
    releaseDate?: boolean
    createdAt?: boolean
    pledge?: boolean | PledgeDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["pledgeAudit"]>

  export type PledgeAuditSelectUpdateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    pledgeId?: boolean
    action?: boolean
    principal?: boolean
    interestRate?: boolean
    allowCompounding?: boolean
    compoundingDuration?: boolean
    calculationVersion?: boolean
    durationMonths?: boolean
    netWeightOfGold?: boolean
    netWeightOfSilver?: boolean
    goldPricePerGram?: boolean
    silverPricePerGram?: boolean
    marketValueAtRelease?: boolean
    ltvAtRelease?: boolean
    totalInterest?: boolean
    receivableAmount?: boolean
    releaseDate?: boolean
    createdAt?: boolean
    pledge?: boolean | PledgeDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["pledgeAudit"]>

  export type PledgeAuditSelectScalar = {
    id?: boolean
    pledgeId?: boolean
    action?: boolean
    principal?: boolean
    interestRate?: boolean
    allowCompounding?: boolean
    compoundingDuration?: boolean
    calculationVersion?: boolean
    durationMonths?: boolean
    netWeightOfGold?: boolean
    netWeightOfSilver?: boolean
    goldPricePerGram?: boolean
    silverPricePerGram?: boolean
    marketValueAtRelease?: boolean
    ltvAtRelease?: boolean
    totalInterest?: boolean
    receivableAmount?: boolean
    releaseDate?: boolean
    createdAt?: boolean
  }

  export type PledgeAuditOmit<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetOmit<"id" | "pledgeId" | "action" | "principal" | "interestRate" | "allowCompounding" | "compoundingDuration" | "calculationVersion" | "durationMonths" | "netWeightOfGold" | "netWeightOfSilver" | "goldPricePerGram" | "silverPricePerGram" | "marketValueAtRelease" | "ltvAtRelease" | "totalInterest" | "receivableAmount" | "releaseDate" | "createdAt", ExtArgs["result"]["pledgeAudit"]>
  export type PledgeAuditInclude<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    pledge?: boolean | PledgeDefaultArgs<ExtArgs>
  }
  export type PledgeAuditIncludeCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    pledge?: boolean | PledgeDefaultArgs<ExtArgs>
  }
  export type PledgeAuditIncludeUpdateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    pledge?: boolean | PledgeDefaultArgs<ExtArgs>
  }

  export type $PledgeAuditPayload<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    name: "PledgeAudit"
    objects: {
      pledge: Prisma.$PledgePayload<ExtArgs>
    }
    scalars: $Extensions.GetPayloadResult<{
      id: string
      pledgeId: string
      action: $Enums.AuditAction
      principal: Prisma.Decimal
      interestRate: Prisma.Decimal
      allowCompounding: boolean
      compoundingDuration: $Enums.CompoundingDuration
      calculationVersion: number
      durationMonths: Prisma.Decimal | null
      netWeightOfGold: Prisma.Decimal
      netWeightOfSilver: Prisma.Decimal
      goldPricePerGram: Prisma.Decimal | null
      silverPricePerGram: Prisma.Decimal | null
      marketValueAtRelease: Prisma.Decimal | null
      ltvAtRelease: Prisma.Decimal | null
      totalInterest: Prisma.Decimal | null
      receivableAmount: Prisma.Decimal | null
      releaseDate: Date | null
      createdAt: Date
    }, ExtArgs["result"]["pledgeAudit"]>
    composites: {}
  }

  type PledgeAuditGetPayload<S extends boolean | null | undefined | PledgeAuditDefaultArgs> = $Result.GetResult<Prisma.$PledgeAuditPayload, S>

  type PledgeAuditCountArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> =
    Omit<PledgeAuditFindManyArgs, 'select' | 'include' | 'distinct' | 'omit'> & {
      select?: PledgeAuditCountAggregateInputType | true
    }

  export interface PledgeAuditDelegate<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> {
    [K: symbol]: { types: Prisma.TypeMap<ExtArgs>['model']['PledgeAudit'], meta: { name: 'PledgeAudit' } }
    /**
     * Find zero or one PledgeAudit that matches the filter.
     * @param {PledgeAuditFindUniqueArgs} args - Arguments to find a PledgeAudit
     * @example
     * // Get one PledgeAudit
     * const pledgeAudit = await prisma.pledgeAudit.findUnique({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUnique<T extends PledgeAuditFindUniqueArgs>(args: SelectSubset<T, PledgeAuditFindUniqueArgs<ExtArgs>>): Prisma__PledgeAuditClient<$Result.GetResult<Prisma.$PledgeAuditPayload<ExtArgs>, T, "findUnique", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find one PledgeAudit that matches the filter or throw an error with `error.code='P2025'`
     * if no matches were found.
     * @param {PledgeAuditFindUniqueOrThrowArgs} args - Arguments to find a PledgeAudit
     * @example
     * // Get one PledgeAudit
     * const pledgeAudit = await prisma.pledgeAudit.findUniqueOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUniqueOrThrow<T extends PledgeAuditFindUniqueOrThrowArgs>(args: SelectSubset<T, PledgeAuditFindUniqueOrThrowArgs<ExtArgs>>): Prisma__PledgeAuditClient<$Result.GetResult<Prisma.$PledgeAuditPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first PledgeAudit that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {PledgeAuditFindFirstArgs} args - Arguments to find a PledgeAudit
     * @example
     * // Get one PledgeAudit
     * const pledgeAudit = await prisma.pledgeAudit.findFirst({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirst<T extends PledgeAuditFindFirstArgs>(args?: SelectSubset<T, PledgeAuditFindFirstArgs<ExtArgs>>): Prisma__PledgeAuditClient<$Result.GetResult<Prisma.$PledgeAuditPayload<ExtArgs>, T, "findFirst", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first PledgeAudit that matches the filter or
     * throw `PrismaKnownClientError` with `P2025` code if no matches were found.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {PledgeAuditFindFirstOrThrowArgs} args - Arguments to find a PledgeAudit
     * @example
     * // Get one PledgeAudit
     * const pledgeAudit = await prisma.pledgeAudit.findFirstOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirstOrThrow<T extends PledgeAuditFindFirstOrThrowArgs>(args?: SelectSubset<T, PledgeAuditFindFirstOrThrowArgs<ExtArgs>>): Prisma__PledgeAuditClient<$Result.GetResult<Prisma.$PledgeAuditPayload<ExtArgs>, T, "findFirstOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find zero or more PledgeAudits that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {PledgeAuditFindManyArgs} args - Arguments to filter and select certain fields only.
     * @example
     * // Get all PledgeAudits
     * const pledgeAudits = await prisma.pledgeAudit.findMany()
     * 
     * // Get first 10 PledgeAudits
     * const pledgeAudits = await prisma.pledgeAudit.findMany({ take: 10 })
     * 
     * // Only select the `id`
     * const pledgeAuditWithIdOnly = await prisma.pledgeAudit.findMany({ select: { id: true } })
     * 
     */
    findMany<T extends PledgeAuditFindManyArgs>(args?: SelectSubset<T, PledgeAuditFindManyArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$PledgeAuditPayload<ExtArgs>, T, "findMany", GlobalOmitOptions>>

    /**
     * Create a PledgeAudit.
     * @param {PledgeAuditCreateArgs} args - Arguments to create a PledgeAudit.
     * @example
     * // Create one PledgeAudit
     * const PledgeAudit = await prisma.pledgeAudit.create({
     *   data: {
     *     // ... data to create a PledgeAudit
     *   }
     * })
     * 
     */
    create<T extends PledgeAuditCreateArgs>(args: SelectSubset<T, PledgeAuditCreateArgs<ExtArgs>>): Prisma__PledgeAuditClient<$Result.GetResult<Prisma.$PledgeAuditPayload<ExtArgs>, T, "create", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Create many PledgeAudits.
     * @param {PledgeAuditCreateManyArgs} args - Arguments to create many PledgeAudits.
     * @example
     * // Create many PledgeAudits
     * const pledgeAudit = await prisma.pledgeAudit.createMany({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     *     
     */
    createMany<T extends PledgeAuditCreateManyArgs>(args?: SelectSubset<T, PledgeAuditCreateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create many PledgeAudits and returns the data saved in the database.
     * @param {PledgeAuditCreateManyAndReturnArgs} args - Arguments to create many PledgeAudits.
     * @example
     * // Create many PledgeAudits
     * const pledgeAudit = await prisma.pledgeAudit.createManyAndReturn({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Create many PledgeAudits and only return the `id`
     * const pledgeAuditWithIdOnly = await prisma.pledgeAudit.createManyAndReturn({
     *   select: { id: true },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    createManyAndReturn<T extends PledgeAuditCreateManyAndReturnArgs>(args?: SelectSubset<T, PledgeAuditCreateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$PledgeAuditPayload<ExtArgs>, T, "createManyAndReturn", GlobalOmitOptions>>

    /**
     * Delete a PledgeAudit.
     * @param {PledgeAuditDeleteArgs} args - Arguments to delete one PledgeAudit.
     * @example
     * // Delete one PledgeAudit
     * const PledgeAudit = await prisma.pledgeAudit.delete({
     *   where: {
     *     // ... filter to delete one PledgeAudit
     *   }
     * })
     * 
     */
    delete<T extends PledgeAuditDeleteArgs>(args: SelectSubset<T, PledgeAuditDeleteArgs<ExtArgs>>): Prisma__PledgeAuditClient<$Result.GetResult<Prisma.$PledgeAuditPayload<ExtArgs>, T, "delete", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Update one PledgeAudit.
     * @param {PledgeAuditUpdateArgs} args - Arguments to update one PledgeAudit.
     * @example
     * // Update one PledgeAudit
     * const pledgeAudit = await prisma.pledgeAudit.update({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    update<T extends PledgeAuditUpdateArgs>(args: SelectSubset<T, PledgeAuditUpdateArgs<ExtArgs>>): Prisma__PledgeAuditClient<$Result.GetResult<Prisma.$PledgeAuditPayload<ExtArgs>, T, "update", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Delete zero or more PledgeAudits.
     * @param {PledgeAuditDeleteManyArgs} args - Arguments to filter PledgeAudits to delete.
     * @example
     * // Delete a few PledgeAudits
     * const { count } = await prisma.pledgeAudit.deleteMany({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     * 
     */
    deleteMany<T extends PledgeAuditDeleteManyArgs>(args?: SelectSubset<T, PledgeAuditDeleteManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more PledgeAudits.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {PledgeAuditUpdateManyArgs} args - Arguments to update one or more rows.
     * @example
     * // Update many PledgeAudits
     * const pledgeAudit = await prisma.pledgeAudit.updateMany({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    updateMany<T extends PledgeAuditUpdateManyArgs>(args: SelectSubset<T, PledgeAuditUpdateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more PledgeAudits and returns the data updated in the database.
     * @param {PledgeAuditUpdateManyAndReturnArgs} args - Arguments to update many PledgeAudits.
     * @example
     * // Update many PledgeAudits
     * const pledgeAudit = await prisma.pledgeAudit.updateManyAndReturn({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Update zero or more PledgeAudits and only return the `id`
     * const pledgeAuditWithIdOnly = await prisma.pledgeAudit.updateManyAndReturn({
     *   select: { id: true },
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    updateManyAndReturn<T extends PledgeAuditUpdateManyAndReturnArgs>(args: SelectSubset<T, PledgeAuditUpdateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$PledgeAuditPayload<ExtArgs>, T, "updateManyAndReturn", GlobalOmitOptions>>

    /**
     * Create or update one PledgeAudit.
     * @param {PledgeAuditUpsertArgs} args - Arguments to update or create a PledgeAudit.
     * @example
     * // Update or create a PledgeAudit
     * const pledgeAudit = await prisma.pledgeAudit.upsert({
     *   create: {
     *     // ... data to create a PledgeAudit
     *   },
     *   update: {
     *     // ... in case it already exists, update
     *   },
     *   where: {
     *     // ... the filter for the PledgeAudit we want to update
     *   }
     * })
     */
    upsert<T extends PledgeAuditUpsertArgs>(args: SelectSubset<T, PledgeAuditUpsertArgs<ExtArgs>>): Prisma__PledgeAuditClient<$Result.GetResult<Prisma.$PledgeAuditPayload<ExtArgs>, T, "upsert", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>


    /**
     * Count the number of PledgeAudits.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {PledgeAuditCountArgs} args - Arguments to filter PledgeAudits to count.
     * @example
     * // Count the number of PledgeAudits
     * const count = await prisma.pledgeAudit.count({
     *   where: {
     *     // ... the filter for the PledgeAudits we want to count
     *   }
     * })
    **/
    count<T extends PledgeAuditCountArgs>(
      args?: Subset<T, PledgeAuditCountArgs>,
    ): Prisma.PrismaPromise<
      T extends $Utils.Record<'select', any>
        ? T['select'] extends true
          ? number
          : GetScalarType<T['select'], PledgeAuditCountAggregateOutputType>
        : number
    >

    /**
     * Allows you to perform aggregations operations on a PledgeAudit.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {PledgeAuditAggregateArgs} args - Select which aggregations you would like to apply and on what fields.
     * @example
     * // Ordered by age ascending
     * // Where email contains prisma.io
     * // Limited to the 10 users
     * const aggregations = await prisma.user.aggregate({
     *   _avg: {
     *     age: true,
     *   },
     *   where: {
     *     email: {
     *       contains: "prisma.io",
     *     },
     *   },
     *   orderBy: {
     *     age: "asc",
     *   },
     *   take: 10,
     * })
    **/
    aggregate<T extends PledgeAuditAggregateArgs>(args: Subset<T, PledgeAuditAggregateArgs>): Prisma.PrismaPromise<GetPledgeAuditAggregateType<T>>

    /**
     * Group by PledgeAudit.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {PledgeAuditGroupByArgs} args - Group by arguments.
     * @example
     * // Group by city, order by createdAt, get count
     * const result = await prisma.user.groupBy({
     *   by: ['city', 'createdAt'],
     *   orderBy: {
     *     createdAt: true
     *   },
     *   _count: {
     *     _all: true
     *   },
     * })
     * 
    **/
    groupBy<
      T extends PledgeAuditGroupByArgs,
      HasSelectOrTake extends Or<
        Extends<'skip', Keys<T>>,
        Extends<'take', Keys<T>>
      >,
      OrderByArg extends True extends HasSelectOrTake
        ? { orderBy: PledgeAuditGroupByArgs['orderBy'] }
        : { orderBy?: PledgeAuditGroupByArgs['orderBy'] },
      OrderFields extends ExcludeUnderscoreKeys<Keys<MaybeTupleToUnion<T['orderBy']>>>,
      ByFields extends MaybeTupleToUnion<T['by']>,
      ByValid extends Has<ByFields, OrderFields>,
      HavingFields extends GetHavingFields<T['having']>,
      HavingValid extends Has<ByFields, HavingFields>,
      ByEmpty extends T['by'] extends never[] ? True : False,
      InputErrors extends ByEmpty extends True
      ? `Error: "by" must not be empty.`
      : HavingValid extends False
      ? {
          [P in HavingFields]: P extends ByFields
            ? never
            : P extends string
            ? `Error: Field "${P}" used in "having" needs to be provided in "by".`
            : [
                Error,
                'Field ',
                P,
                ` in "having" needs to be provided in "by"`,
              ]
        }[HavingFields]
      : 'take' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "take", you also need to provide "orderBy"'
      : 'skip' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "skip", you also need to provide "orderBy"'
      : ByValid extends True
      ? {}
      : {
          [P in OrderFields]: P extends ByFields
            ? never
            : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
        }[OrderFields]
    >(args: SubsetIntersection<T, PledgeAuditGroupByArgs, OrderByArg> & InputErrors): {} extends InputErrors ? GetPledgeAuditGroupByPayload<T> : Prisma.PrismaPromise<InputErrors>
  /**
   * Fields of the PledgeAudit model
   */
  readonly fields: PledgeAuditFieldRefs;
  }

  /**
   * The delegate class that acts as a "Promise-like" for PledgeAudit.
   * Why is this prefixed with `Prisma__`?
   * Because we want to prevent naming conflicts as mentioned in
   * https://github.com/prisma/prisma-client-js/issues/707
   */
  export interface Prisma__PledgeAuditClient<T, Null = never, ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> extends Prisma.PrismaPromise<T> {
    readonly [Symbol.toStringTag]: "PrismaPromise"
    pledge<T extends PledgeDefaultArgs<ExtArgs> = {}>(args?: Subset<T, PledgeDefaultArgs<ExtArgs>>): Prisma__PledgeClient<$Result.GetResult<Prisma.$PledgePayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions> | Null, Null, ExtArgs, GlobalOmitOptions>
    /**
     * Attaches callbacks for the resolution and/or rejection of the Promise.
     * @param onfulfilled The callback to execute when the Promise is resolved.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of which ever callback is executed.
     */
    then<TResult1 = T, TResult2 = never>(onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | undefined | null, onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null): $Utils.JsPromise<TResult1 | TResult2>
    /**
     * Attaches a callback for only the rejection of the Promise.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of the callback.
     */
    catch<TResult = never>(onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | undefined | null): $Utils.JsPromise<T | TResult>
    /**
     * Attaches a callback that is invoked when the Promise is settled (fulfilled or rejected). The
     * resolved value cannot be modified from the callback.
     * @param onfinally The callback to execute when the Promise is settled (fulfilled or rejected).
     * @returns A Promise for the completion of the callback.
     */
    finally(onfinally?: (() => void) | undefined | null): $Utils.JsPromise<T>
  }




  /**
   * Fields of the PledgeAudit model
   */
  interface PledgeAuditFieldRefs {
    readonly id: FieldRef<"PledgeAudit", 'String'>
    readonly pledgeId: FieldRef<"PledgeAudit", 'String'>
    readonly action: FieldRef<"PledgeAudit", 'AuditAction'>
    readonly principal: FieldRef<"PledgeAudit", 'Decimal'>
    readonly interestRate: FieldRef<"PledgeAudit", 'Decimal'>
    readonly allowCompounding: FieldRef<"PledgeAudit", 'Boolean'>
    readonly compoundingDuration: FieldRef<"PledgeAudit", 'CompoundingDuration'>
    readonly calculationVersion: FieldRef<"PledgeAudit", 'Int'>
    readonly durationMonths: FieldRef<"PledgeAudit", 'Decimal'>
    readonly netWeightOfGold: FieldRef<"PledgeAudit", 'Decimal'>
    readonly netWeightOfSilver: FieldRef<"PledgeAudit", 'Decimal'>
    readonly goldPricePerGram: FieldRef<"PledgeAudit", 'Decimal'>
    readonly silverPricePerGram: FieldRef<"PledgeAudit", 'Decimal'>
    readonly marketValueAtRelease: FieldRef<"PledgeAudit", 'Decimal'>
    readonly ltvAtRelease: FieldRef<"PledgeAudit", 'Decimal'>
    readonly totalInterest: FieldRef<"PledgeAudit", 'Decimal'>
    readonly receivableAmount: FieldRef<"PledgeAudit", 'Decimal'>
    readonly releaseDate: FieldRef<"PledgeAudit", 'DateTime'>
    readonly createdAt: FieldRef<"PledgeAudit", 'DateTime'>
  }
    

  // Custom InputTypes
  /**
   * PledgeAudit findUnique
   */
  export type PledgeAuditFindUniqueArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the PledgeAudit
     */
    select?: PledgeAuditSelect<ExtArgs> | null
    /**
     * Omit specific fields from the PledgeAudit
     */
    omit?: PledgeAuditOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: PledgeAuditInclude<ExtArgs> | null
    /**
     * Filter, which PledgeAudit to fetch.
     */
    where: PledgeAuditWhereUniqueInput
  }

  /**
   * PledgeAudit findUniqueOrThrow
   */
  export type PledgeAuditFindUniqueOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the PledgeAudit
     */
    select?: PledgeAuditSelect<ExtArgs> | null
    /**
     * Omit specific fields from the PledgeAudit
     */
    omit?: PledgeAuditOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: PledgeAuditInclude<ExtArgs> | null
    /**
     * Filter, which PledgeAudit to fetch.
     */
    where: PledgeAuditWhereUniqueInput
  }

  /**
   * PledgeAudit findFirst
   */
  export type PledgeAuditFindFirstArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the PledgeAudit
     */
    select?: PledgeAuditSelect<ExtArgs> | null
    /**
     * Omit specific fields from the PledgeAudit
     */
    omit?: PledgeAuditOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: PledgeAuditInclude<ExtArgs> | null
    /**
     * Filter, which PledgeAudit to fetch.
     */
    where?: PledgeAuditWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of PledgeAudits to fetch.
     */
    orderBy?: PledgeAuditOrderByWithRelationInput | PledgeAuditOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for PledgeAudits.
     */
    cursor?: PledgeAuditWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` PledgeAudits from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` PledgeAudits.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of PledgeAudits.
     */
    distinct?: PledgeAuditScalarFieldEnum | PledgeAuditScalarFieldEnum[]
  }

  /**
   * PledgeAudit findFirstOrThrow
   */
  export type PledgeAuditFindFirstOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the PledgeAudit
     */
    select?: PledgeAuditSelect<ExtArgs> | null
    /**
     * Omit specific fields from the PledgeAudit
     */
    omit?: PledgeAuditOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: PledgeAuditInclude<ExtArgs> | null
    /**
     * Filter, which PledgeAudit to fetch.
     */
    where?: PledgeAuditWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of PledgeAudits to fetch.
     */
    orderBy?: PledgeAuditOrderByWithRelationInput | PledgeAuditOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for PledgeAudits.
     */
    cursor?: PledgeAuditWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` PledgeAudits from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` PledgeAudits.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of PledgeAudits.
     */
    distinct?: PledgeAuditScalarFieldEnum | PledgeAuditScalarFieldEnum[]
  }

  /**
   * PledgeAudit findMany
   */
  export type PledgeAuditFindManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the PledgeAudit
     */
    select?: PledgeAuditSelect<ExtArgs> | null
    /**
     * Omit specific fields from the PledgeAudit
     */
    omit?: PledgeAuditOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: PledgeAuditInclude<ExtArgs> | null
    /**
     * Filter, which PledgeAudits to fetch.
     */
    where?: PledgeAuditWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of PledgeAudits to fetch.
     */
    orderBy?: PledgeAuditOrderByWithRelationInput | PledgeAuditOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for listing PledgeAudits.
     */
    cursor?: PledgeAuditWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` PledgeAudits from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` PledgeAudits.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of PledgeAudits.
     */
    distinct?: PledgeAuditScalarFieldEnum | PledgeAuditScalarFieldEnum[]
  }

  /**
   * PledgeAudit create
   */
  export type PledgeAuditCreateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the PledgeAudit
     */
    select?: PledgeAuditSelect<ExtArgs> | null
    /**
     * Omit specific fields from the PledgeAudit
     */
    omit?: PledgeAuditOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: PledgeAuditInclude<ExtArgs> | null
    /**
     * The data needed to create a PledgeAudit.
     */
    data: XOR<PledgeAuditCreateInput, PledgeAuditUncheckedCreateInput>
  }

  /**
   * PledgeAudit createMany
   */
  export type PledgeAuditCreateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to create many PledgeAudits.
     */
    data: PledgeAuditCreateManyInput | PledgeAuditCreateManyInput[]
    skipDuplicates?: boolean
  }

  /**
   * PledgeAudit createManyAndReturn
   */
  export type PledgeAuditCreateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the PledgeAudit
     */
    select?: PledgeAuditSelectCreateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the PledgeAudit
     */
    omit?: PledgeAuditOmit<ExtArgs> | null
    /**
     * The data used to create many PledgeAudits.
     */
    data: PledgeAuditCreateManyInput | PledgeAuditCreateManyInput[]
    skipDuplicates?: boolean
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: PledgeAuditIncludeCreateManyAndReturn<ExtArgs> | null
  }

  /**
   * PledgeAudit update
   */
  export type PledgeAuditUpdateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the PledgeAudit
     */
    select?: PledgeAuditSelect<ExtArgs> | null
    /**
     * Omit specific fields from the PledgeAudit
     */
    omit?: PledgeAuditOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: PledgeAuditInclude<ExtArgs> | null
    /**
     * The data needed to update a PledgeAudit.
     */
    data: XOR<PledgeAuditUpdateInput, PledgeAuditUncheckedUpdateInput>
    /**
     * Choose, which PledgeAudit to update.
     */
    where: PledgeAuditWhereUniqueInput
  }

  /**
   * PledgeAudit updateMany
   */
  export type PledgeAuditUpdateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to update PledgeAudits.
     */
    data: XOR<PledgeAuditUpdateManyMutationInput, PledgeAuditUncheckedUpdateManyInput>
    /**
     * Filter which PledgeAudits to update
     */
    where?: PledgeAuditWhereInput
    /**
     * Limit how many PledgeAudits to update.
     */
    limit?: number
  }

  /**
   * PledgeAudit updateManyAndReturn
   */
  export type PledgeAuditUpdateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the PledgeAudit
     */
    select?: PledgeAuditSelectUpdateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the PledgeAudit
     */
    omit?: PledgeAuditOmit<ExtArgs> | null
    /**
     * The data used to update PledgeAudits.
     */
    data: XOR<PledgeAuditUpdateManyMutationInput, PledgeAuditUncheckedUpdateManyInput>
    /**
     * Filter which PledgeAudits to update
     */
    where?: PledgeAuditWhereInput
    /**
     * Limit how many PledgeAudits to update.
     */
    limit?: number
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: PledgeAuditIncludeUpdateManyAndReturn<ExtArgs> | null
  }

  /**
   * PledgeAudit upsert
   */
  export type PledgeAuditUpsertArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the PledgeAudit
     */
    select?: PledgeAuditSelect<ExtArgs> | null
    /**
     * Omit specific fields from the PledgeAudit
     */
    omit?: PledgeAuditOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: PledgeAuditInclude<ExtArgs> | null
    /**
     * The filter to search for the PledgeAudit to update in case it exists.
     */
    where: PledgeAuditWhereUniqueInput
    /**
     * In case the PledgeAudit found by the `where` argument doesn't exist, create a new PledgeAudit with this data.
     */
    create: XOR<PledgeAuditCreateInput, PledgeAuditUncheckedCreateInput>
    /**
     * In case the PledgeAudit was found with the provided `where` argument, update it with this data.
     */
    update: XOR<PledgeAuditUpdateInput, PledgeAuditUncheckedUpdateInput>
  }

  /**
   * PledgeAudit delete
   */
  export type PledgeAuditDeleteArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the PledgeAudit
     */
    select?: PledgeAuditSelect<ExtArgs> | null
    /**
     * Omit specific fields from the PledgeAudit
     */
    omit?: PledgeAuditOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: PledgeAuditInclude<ExtArgs> | null
    /**
     * Filter which PledgeAudit to delete.
     */
    where: PledgeAuditWhereUniqueInput
  }

  /**
   * PledgeAudit deleteMany
   */
  export type PledgeAuditDeleteManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which PledgeAudits to delete
     */
    where?: PledgeAuditWhereInput
    /**
     * Limit how many PledgeAudits to delete.
     */
    limit?: number
  }

  /**
   * PledgeAudit without action
   */
  export type PledgeAuditDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the PledgeAudit
     */
    select?: PledgeAuditSelect<ExtArgs> | null
    /**
     * Omit specific fields from the PledgeAudit
     */
    omit?: PledgeAuditOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: PledgeAuditInclude<ExtArgs> | null
  }


  /**
   * Model MetalPrice
   */

  export type AggregateMetalPrice = {
    _count: MetalPriceCountAggregateOutputType | null
    _avg: MetalPriceAvgAggregateOutputType | null
    _sum: MetalPriceSumAggregateOutputType | null
    _min: MetalPriceMinAggregateOutputType | null
    _max: MetalPriceMaxAggregateOutputType | null
  }

  export type MetalPriceAvgAggregateOutputType = {
    usdPerOunce: Decimal | null
    inrPerGram: Decimal | null
  }

  export type MetalPriceSumAggregateOutputType = {
    usdPerOunce: Decimal | null
    inrPerGram: Decimal | null
  }

  export type MetalPriceMinAggregateOutputType = {
    id: string | null
    metal: $Enums.MetalType | null
    usdPerOunce: Decimal | null
    inrPerGram: Decimal | null
    createdAt: Date | null
    updatedAt: Date | null
  }

  export type MetalPriceMaxAggregateOutputType = {
    id: string | null
    metal: $Enums.MetalType | null
    usdPerOunce: Decimal | null
    inrPerGram: Decimal | null
    createdAt: Date | null
    updatedAt: Date | null
  }

  export type MetalPriceCountAggregateOutputType = {
    id: number
    metal: number
    usdPerOunce: number
    inrPerGram: number
    createdAt: number
    updatedAt: number
    _all: number
  }


  export type MetalPriceAvgAggregateInputType = {
    usdPerOunce?: true
    inrPerGram?: true
  }

  export type MetalPriceSumAggregateInputType = {
    usdPerOunce?: true
    inrPerGram?: true
  }

  export type MetalPriceMinAggregateInputType = {
    id?: true
    metal?: true
    usdPerOunce?: true
    inrPerGram?: true
    createdAt?: true
    updatedAt?: true
  }

  export type MetalPriceMaxAggregateInputType = {
    id?: true
    metal?: true
    usdPerOunce?: true
    inrPerGram?: true
    createdAt?: true
    updatedAt?: true
  }

  export type MetalPriceCountAggregateInputType = {
    id?: true
    metal?: true
    usdPerOunce?: true
    inrPerGram?: true
    createdAt?: true
    updatedAt?: true
    _all?: true
  }

  export type MetalPriceAggregateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which MetalPrice to aggregate.
     */
    where?: MetalPriceWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of MetalPrices to fetch.
     */
    orderBy?: MetalPriceOrderByWithRelationInput | MetalPriceOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the start position
     */
    cursor?: MetalPriceWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` MetalPrices from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` MetalPrices.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Count returned MetalPrices
    **/
    _count?: true | MetalPriceCountAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to average
    **/
    _avg?: MetalPriceAvgAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to sum
    **/
    _sum?: MetalPriceSumAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the minimum value
    **/
    _min?: MetalPriceMinAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the maximum value
    **/
    _max?: MetalPriceMaxAggregateInputType
  }

  export type GetMetalPriceAggregateType<T extends MetalPriceAggregateArgs> = {
        [P in keyof T & keyof AggregateMetalPrice]: P extends '_count' | 'count'
      ? T[P] extends true
        ? number
        : GetScalarType<T[P], AggregateMetalPrice[P]>
      : GetScalarType<T[P], AggregateMetalPrice[P]>
  }




  export type MetalPriceGroupByArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: MetalPriceWhereInput
    orderBy?: MetalPriceOrderByWithAggregationInput | MetalPriceOrderByWithAggregationInput[]
    by: MetalPriceScalarFieldEnum[] | MetalPriceScalarFieldEnum
    having?: MetalPriceScalarWhereWithAggregatesInput
    take?: number
    skip?: number
    _count?: MetalPriceCountAggregateInputType | true
    _avg?: MetalPriceAvgAggregateInputType
    _sum?: MetalPriceSumAggregateInputType
    _min?: MetalPriceMinAggregateInputType
    _max?: MetalPriceMaxAggregateInputType
  }

  export type MetalPriceGroupByOutputType = {
    id: string
    metal: $Enums.MetalType
    usdPerOunce: Decimal
    inrPerGram: Decimal
    createdAt: Date
    updatedAt: Date
    _count: MetalPriceCountAggregateOutputType | null
    _avg: MetalPriceAvgAggregateOutputType | null
    _sum: MetalPriceSumAggregateOutputType | null
    _min: MetalPriceMinAggregateOutputType | null
    _max: MetalPriceMaxAggregateOutputType | null
  }

  type GetMetalPriceGroupByPayload<T extends MetalPriceGroupByArgs> = Prisma.PrismaPromise<
    Array<
      PickEnumerable<MetalPriceGroupByOutputType, T['by']> &
        {
          [P in ((keyof T) & (keyof MetalPriceGroupByOutputType))]: P extends '_count'
            ? T[P] extends boolean
              ? number
              : GetScalarType<T[P], MetalPriceGroupByOutputType[P]>
            : GetScalarType<T[P], MetalPriceGroupByOutputType[P]>
        }
      >
    >


  export type MetalPriceSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    metal?: boolean
    usdPerOunce?: boolean
    inrPerGram?: boolean
    createdAt?: boolean
    updatedAt?: boolean
  }, ExtArgs["result"]["metalPrice"]>

  export type MetalPriceSelectCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    metal?: boolean
    usdPerOunce?: boolean
    inrPerGram?: boolean
    createdAt?: boolean
    updatedAt?: boolean
  }, ExtArgs["result"]["metalPrice"]>

  export type MetalPriceSelectUpdateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    metal?: boolean
    usdPerOunce?: boolean
    inrPerGram?: boolean
    createdAt?: boolean
    updatedAt?: boolean
  }, ExtArgs["result"]["metalPrice"]>

  export type MetalPriceSelectScalar = {
    id?: boolean
    metal?: boolean
    usdPerOunce?: boolean
    inrPerGram?: boolean
    createdAt?: boolean
    updatedAt?: boolean
  }

  export type MetalPriceOmit<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetOmit<"id" | "metal" | "usdPerOunce" | "inrPerGram" | "createdAt" | "updatedAt", ExtArgs["result"]["metalPrice"]>

  export type $MetalPricePayload<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    name: "MetalPrice"
    objects: {}
    scalars: $Extensions.GetPayloadResult<{
      id: string
      metal: $Enums.MetalType
      usdPerOunce: Prisma.Decimal
      inrPerGram: Prisma.Decimal
      createdAt: Date
      updatedAt: Date
    }, ExtArgs["result"]["metalPrice"]>
    composites: {}
  }

  type MetalPriceGetPayload<S extends boolean | null | undefined | MetalPriceDefaultArgs> = $Result.GetResult<Prisma.$MetalPricePayload, S>

  type MetalPriceCountArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> =
    Omit<MetalPriceFindManyArgs, 'select' | 'include' | 'distinct' | 'omit'> & {
      select?: MetalPriceCountAggregateInputType | true
    }

  export interface MetalPriceDelegate<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> {
    [K: symbol]: { types: Prisma.TypeMap<ExtArgs>['model']['MetalPrice'], meta: { name: 'MetalPrice' } }
    /**
     * Find zero or one MetalPrice that matches the filter.
     * @param {MetalPriceFindUniqueArgs} args - Arguments to find a MetalPrice
     * @example
     * // Get one MetalPrice
     * const metalPrice = await prisma.metalPrice.findUnique({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUnique<T extends MetalPriceFindUniqueArgs>(args: SelectSubset<T, MetalPriceFindUniqueArgs<ExtArgs>>): Prisma__MetalPriceClient<$Result.GetResult<Prisma.$MetalPricePayload<ExtArgs>, T, "findUnique", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find one MetalPrice that matches the filter or throw an error with `error.code='P2025'`
     * if no matches were found.
     * @param {MetalPriceFindUniqueOrThrowArgs} args - Arguments to find a MetalPrice
     * @example
     * // Get one MetalPrice
     * const metalPrice = await prisma.metalPrice.findUniqueOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUniqueOrThrow<T extends MetalPriceFindUniqueOrThrowArgs>(args: SelectSubset<T, MetalPriceFindUniqueOrThrowArgs<ExtArgs>>): Prisma__MetalPriceClient<$Result.GetResult<Prisma.$MetalPricePayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first MetalPrice that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {MetalPriceFindFirstArgs} args - Arguments to find a MetalPrice
     * @example
     * // Get one MetalPrice
     * const metalPrice = await prisma.metalPrice.findFirst({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirst<T extends MetalPriceFindFirstArgs>(args?: SelectSubset<T, MetalPriceFindFirstArgs<ExtArgs>>): Prisma__MetalPriceClient<$Result.GetResult<Prisma.$MetalPricePayload<ExtArgs>, T, "findFirst", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first MetalPrice that matches the filter or
     * throw `PrismaKnownClientError` with `P2025` code if no matches were found.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {MetalPriceFindFirstOrThrowArgs} args - Arguments to find a MetalPrice
     * @example
     * // Get one MetalPrice
     * const metalPrice = await prisma.metalPrice.findFirstOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirstOrThrow<T extends MetalPriceFindFirstOrThrowArgs>(args?: SelectSubset<T, MetalPriceFindFirstOrThrowArgs<ExtArgs>>): Prisma__MetalPriceClient<$Result.GetResult<Prisma.$MetalPricePayload<ExtArgs>, T, "findFirstOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find zero or more MetalPrices that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {MetalPriceFindManyArgs} args - Arguments to filter and select certain fields only.
     * @example
     * // Get all MetalPrices
     * const metalPrices = await prisma.metalPrice.findMany()
     * 
     * // Get first 10 MetalPrices
     * const metalPrices = await prisma.metalPrice.findMany({ take: 10 })
     * 
     * // Only select the `id`
     * const metalPriceWithIdOnly = await prisma.metalPrice.findMany({ select: { id: true } })
     * 
     */
    findMany<T extends MetalPriceFindManyArgs>(args?: SelectSubset<T, MetalPriceFindManyArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$MetalPricePayload<ExtArgs>, T, "findMany", GlobalOmitOptions>>

    /**
     * Create a MetalPrice.
     * @param {MetalPriceCreateArgs} args - Arguments to create a MetalPrice.
     * @example
     * // Create one MetalPrice
     * const MetalPrice = await prisma.metalPrice.create({
     *   data: {
     *     // ... data to create a MetalPrice
     *   }
     * })
     * 
     */
    create<T extends MetalPriceCreateArgs>(args: SelectSubset<T, MetalPriceCreateArgs<ExtArgs>>): Prisma__MetalPriceClient<$Result.GetResult<Prisma.$MetalPricePayload<ExtArgs>, T, "create", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Create many MetalPrices.
     * @param {MetalPriceCreateManyArgs} args - Arguments to create many MetalPrices.
     * @example
     * // Create many MetalPrices
     * const metalPrice = await prisma.metalPrice.createMany({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     *     
     */
    createMany<T extends MetalPriceCreateManyArgs>(args?: SelectSubset<T, MetalPriceCreateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create many MetalPrices and returns the data saved in the database.
     * @param {MetalPriceCreateManyAndReturnArgs} args - Arguments to create many MetalPrices.
     * @example
     * // Create many MetalPrices
     * const metalPrice = await prisma.metalPrice.createManyAndReturn({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Create many MetalPrices and only return the `id`
     * const metalPriceWithIdOnly = await prisma.metalPrice.createManyAndReturn({
     *   select: { id: true },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    createManyAndReturn<T extends MetalPriceCreateManyAndReturnArgs>(args?: SelectSubset<T, MetalPriceCreateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$MetalPricePayload<ExtArgs>, T, "createManyAndReturn", GlobalOmitOptions>>

    /**
     * Delete a MetalPrice.
     * @param {MetalPriceDeleteArgs} args - Arguments to delete one MetalPrice.
     * @example
     * // Delete one MetalPrice
     * const MetalPrice = await prisma.metalPrice.delete({
     *   where: {
     *     // ... filter to delete one MetalPrice
     *   }
     * })
     * 
     */
    delete<T extends MetalPriceDeleteArgs>(args: SelectSubset<T, MetalPriceDeleteArgs<ExtArgs>>): Prisma__MetalPriceClient<$Result.GetResult<Prisma.$MetalPricePayload<ExtArgs>, T, "delete", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Update one MetalPrice.
     * @param {MetalPriceUpdateArgs} args - Arguments to update one MetalPrice.
     * @example
     * // Update one MetalPrice
     * const metalPrice = await prisma.metalPrice.update({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    update<T extends MetalPriceUpdateArgs>(args: SelectSubset<T, MetalPriceUpdateArgs<ExtArgs>>): Prisma__MetalPriceClient<$Result.GetResult<Prisma.$MetalPricePayload<ExtArgs>, T, "update", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Delete zero or more MetalPrices.
     * @param {MetalPriceDeleteManyArgs} args - Arguments to filter MetalPrices to delete.
     * @example
     * // Delete a few MetalPrices
     * const { count } = await prisma.metalPrice.deleteMany({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     * 
     */
    deleteMany<T extends MetalPriceDeleteManyArgs>(args?: SelectSubset<T, MetalPriceDeleteManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more MetalPrices.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {MetalPriceUpdateManyArgs} args - Arguments to update one or more rows.
     * @example
     * // Update many MetalPrices
     * const metalPrice = await prisma.metalPrice.updateMany({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    updateMany<T extends MetalPriceUpdateManyArgs>(args: SelectSubset<T, MetalPriceUpdateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more MetalPrices and returns the data updated in the database.
     * @param {MetalPriceUpdateManyAndReturnArgs} args - Arguments to update many MetalPrices.
     * @example
     * // Update many MetalPrices
     * const metalPrice = await prisma.metalPrice.updateManyAndReturn({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Update zero or more MetalPrices and only return the `id`
     * const metalPriceWithIdOnly = await prisma.metalPrice.updateManyAndReturn({
     *   select: { id: true },
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    updateManyAndReturn<T extends MetalPriceUpdateManyAndReturnArgs>(args: SelectSubset<T, MetalPriceUpdateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$MetalPricePayload<ExtArgs>, T, "updateManyAndReturn", GlobalOmitOptions>>

    /**
     * Create or update one MetalPrice.
     * @param {MetalPriceUpsertArgs} args - Arguments to update or create a MetalPrice.
     * @example
     * // Update or create a MetalPrice
     * const metalPrice = await prisma.metalPrice.upsert({
     *   create: {
     *     // ... data to create a MetalPrice
     *   },
     *   update: {
     *     // ... in case it already exists, update
     *   },
     *   where: {
     *     // ... the filter for the MetalPrice we want to update
     *   }
     * })
     */
    upsert<T extends MetalPriceUpsertArgs>(args: SelectSubset<T, MetalPriceUpsertArgs<ExtArgs>>): Prisma__MetalPriceClient<$Result.GetResult<Prisma.$MetalPricePayload<ExtArgs>, T, "upsert", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>


    /**
     * Count the number of MetalPrices.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {MetalPriceCountArgs} args - Arguments to filter MetalPrices to count.
     * @example
     * // Count the number of MetalPrices
     * const count = await prisma.metalPrice.count({
     *   where: {
     *     // ... the filter for the MetalPrices we want to count
     *   }
     * })
    **/
    count<T extends MetalPriceCountArgs>(
      args?: Subset<T, MetalPriceCountArgs>,
    ): Prisma.PrismaPromise<
      T extends $Utils.Record<'select', any>
        ? T['select'] extends true
          ? number
          : GetScalarType<T['select'], MetalPriceCountAggregateOutputType>
        : number
    >

    /**
     * Allows you to perform aggregations operations on a MetalPrice.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {MetalPriceAggregateArgs} args - Select which aggregations you would like to apply and on what fields.
     * @example
     * // Ordered by age ascending
     * // Where email contains prisma.io
     * // Limited to the 10 users
     * const aggregations = await prisma.user.aggregate({
     *   _avg: {
     *     age: true,
     *   },
     *   where: {
     *     email: {
     *       contains: "prisma.io",
     *     },
     *   },
     *   orderBy: {
     *     age: "asc",
     *   },
     *   take: 10,
     * })
    **/
    aggregate<T extends MetalPriceAggregateArgs>(args: Subset<T, MetalPriceAggregateArgs>): Prisma.PrismaPromise<GetMetalPriceAggregateType<T>>

    /**
     * Group by MetalPrice.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {MetalPriceGroupByArgs} args - Group by arguments.
     * @example
     * // Group by city, order by createdAt, get count
     * const result = await prisma.user.groupBy({
     *   by: ['city', 'createdAt'],
     *   orderBy: {
     *     createdAt: true
     *   },
     *   _count: {
     *     _all: true
     *   },
     * })
     * 
    **/
    groupBy<
      T extends MetalPriceGroupByArgs,
      HasSelectOrTake extends Or<
        Extends<'skip', Keys<T>>,
        Extends<'take', Keys<T>>
      >,
      OrderByArg extends True extends HasSelectOrTake
        ? { orderBy: MetalPriceGroupByArgs['orderBy'] }
        : { orderBy?: MetalPriceGroupByArgs['orderBy'] },
      OrderFields extends ExcludeUnderscoreKeys<Keys<MaybeTupleToUnion<T['orderBy']>>>,
      ByFields extends MaybeTupleToUnion<T['by']>,
      ByValid extends Has<ByFields, OrderFields>,
      HavingFields extends GetHavingFields<T['having']>,
      HavingValid extends Has<ByFields, HavingFields>,
      ByEmpty extends T['by'] extends never[] ? True : False,
      InputErrors extends ByEmpty extends True
      ? `Error: "by" must not be empty.`
      : HavingValid extends False
      ? {
          [P in HavingFields]: P extends ByFields
            ? never
            : P extends string
            ? `Error: Field "${P}" used in "having" needs to be provided in "by".`
            : [
                Error,
                'Field ',
                P,
                ` in "having" needs to be provided in "by"`,
              ]
        }[HavingFields]
      : 'take' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "take", you also need to provide "orderBy"'
      : 'skip' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "skip", you also need to provide "orderBy"'
      : ByValid extends True
      ? {}
      : {
          [P in OrderFields]: P extends ByFields
            ? never
            : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
        }[OrderFields]
    >(args: SubsetIntersection<T, MetalPriceGroupByArgs, OrderByArg> & InputErrors): {} extends InputErrors ? GetMetalPriceGroupByPayload<T> : Prisma.PrismaPromise<InputErrors>
  /**
   * Fields of the MetalPrice model
   */
  readonly fields: MetalPriceFieldRefs;
  }

  /**
   * The delegate class that acts as a "Promise-like" for MetalPrice.
   * Why is this prefixed with `Prisma__`?
   * Because we want to prevent naming conflicts as mentioned in
   * https://github.com/prisma/prisma-client-js/issues/707
   */
  export interface Prisma__MetalPriceClient<T, Null = never, ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> extends Prisma.PrismaPromise<T> {
    readonly [Symbol.toStringTag]: "PrismaPromise"
    /**
     * Attaches callbacks for the resolution and/or rejection of the Promise.
     * @param onfulfilled The callback to execute when the Promise is resolved.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of which ever callback is executed.
     */
    then<TResult1 = T, TResult2 = never>(onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | undefined | null, onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null): $Utils.JsPromise<TResult1 | TResult2>
    /**
     * Attaches a callback for only the rejection of the Promise.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of the callback.
     */
    catch<TResult = never>(onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | undefined | null): $Utils.JsPromise<T | TResult>
    /**
     * Attaches a callback that is invoked when the Promise is settled (fulfilled or rejected). The
     * resolved value cannot be modified from the callback.
     * @param onfinally The callback to execute when the Promise is settled (fulfilled or rejected).
     * @returns A Promise for the completion of the callback.
     */
    finally(onfinally?: (() => void) | undefined | null): $Utils.JsPromise<T>
  }




  /**
   * Fields of the MetalPrice model
   */
  interface MetalPriceFieldRefs {
    readonly id: FieldRef<"MetalPrice", 'String'>
    readonly metal: FieldRef<"MetalPrice", 'MetalType'>
    readonly usdPerOunce: FieldRef<"MetalPrice", 'Decimal'>
    readonly inrPerGram: FieldRef<"MetalPrice", 'Decimal'>
    readonly createdAt: FieldRef<"MetalPrice", 'DateTime'>
    readonly updatedAt: FieldRef<"MetalPrice", 'DateTime'>
  }
    

  // Custom InputTypes
  /**
   * MetalPrice findUnique
   */
  export type MetalPriceFindUniqueArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the MetalPrice
     */
    select?: MetalPriceSelect<ExtArgs> | null
    /**
     * Omit specific fields from the MetalPrice
     */
    omit?: MetalPriceOmit<ExtArgs> | null
    /**
     * Filter, which MetalPrice to fetch.
     */
    where: MetalPriceWhereUniqueInput
  }

  /**
   * MetalPrice findUniqueOrThrow
   */
  export type MetalPriceFindUniqueOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the MetalPrice
     */
    select?: MetalPriceSelect<ExtArgs> | null
    /**
     * Omit specific fields from the MetalPrice
     */
    omit?: MetalPriceOmit<ExtArgs> | null
    /**
     * Filter, which MetalPrice to fetch.
     */
    where: MetalPriceWhereUniqueInput
  }

  /**
   * MetalPrice findFirst
   */
  export type MetalPriceFindFirstArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the MetalPrice
     */
    select?: MetalPriceSelect<ExtArgs> | null
    /**
     * Omit specific fields from the MetalPrice
     */
    omit?: MetalPriceOmit<ExtArgs> | null
    /**
     * Filter, which MetalPrice to fetch.
     */
    where?: MetalPriceWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of MetalPrices to fetch.
     */
    orderBy?: MetalPriceOrderByWithRelationInput | MetalPriceOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for MetalPrices.
     */
    cursor?: MetalPriceWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` MetalPrices from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` MetalPrices.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of MetalPrices.
     */
    distinct?: MetalPriceScalarFieldEnum | MetalPriceScalarFieldEnum[]
  }

  /**
   * MetalPrice findFirstOrThrow
   */
  export type MetalPriceFindFirstOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the MetalPrice
     */
    select?: MetalPriceSelect<ExtArgs> | null
    /**
     * Omit specific fields from the MetalPrice
     */
    omit?: MetalPriceOmit<ExtArgs> | null
    /**
     * Filter, which MetalPrice to fetch.
     */
    where?: MetalPriceWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of MetalPrices to fetch.
     */
    orderBy?: MetalPriceOrderByWithRelationInput | MetalPriceOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for MetalPrices.
     */
    cursor?: MetalPriceWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` MetalPrices from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` MetalPrices.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of MetalPrices.
     */
    distinct?: MetalPriceScalarFieldEnum | MetalPriceScalarFieldEnum[]
  }

  /**
   * MetalPrice findMany
   */
  export type MetalPriceFindManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the MetalPrice
     */
    select?: MetalPriceSelect<ExtArgs> | null
    /**
     * Omit specific fields from the MetalPrice
     */
    omit?: MetalPriceOmit<ExtArgs> | null
    /**
     * Filter, which MetalPrices to fetch.
     */
    where?: MetalPriceWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of MetalPrices to fetch.
     */
    orderBy?: MetalPriceOrderByWithRelationInput | MetalPriceOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for listing MetalPrices.
     */
    cursor?: MetalPriceWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` MetalPrices from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` MetalPrices.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of MetalPrices.
     */
    distinct?: MetalPriceScalarFieldEnum | MetalPriceScalarFieldEnum[]
  }

  /**
   * MetalPrice create
   */
  export type MetalPriceCreateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the MetalPrice
     */
    select?: MetalPriceSelect<ExtArgs> | null
    /**
     * Omit specific fields from the MetalPrice
     */
    omit?: MetalPriceOmit<ExtArgs> | null
    /**
     * The data needed to create a MetalPrice.
     */
    data: XOR<MetalPriceCreateInput, MetalPriceUncheckedCreateInput>
  }

  /**
   * MetalPrice createMany
   */
  export type MetalPriceCreateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to create many MetalPrices.
     */
    data: MetalPriceCreateManyInput | MetalPriceCreateManyInput[]
    skipDuplicates?: boolean
  }

  /**
   * MetalPrice createManyAndReturn
   */
  export type MetalPriceCreateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the MetalPrice
     */
    select?: MetalPriceSelectCreateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the MetalPrice
     */
    omit?: MetalPriceOmit<ExtArgs> | null
    /**
     * The data used to create many MetalPrices.
     */
    data: MetalPriceCreateManyInput | MetalPriceCreateManyInput[]
    skipDuplicates?: boolean
  }

  /**
   * MetalPrice update
   */
  export type MetalPriceUpdateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the MetalPrice
     */
    select?: MetalPriceSelect<ExtArgs> | null
    /**
     * Omit specific fields from the MetalPrice
     */
    omit?: MetalPriceOmit<ExtArgs> | null
    /**
     * The data needed to update a MetalPrice.
     */
    data: XOR<MetalPriceUpdateInput, MetalPriceUncheckedUpdateInput>
    /**
     * Choose, which MetalPrice to update.
     */
    where: MetalPriceWhereUniqueInput
  }

  /**
   * MetalPrice updateMany
   */
  export type MetalPriceUpdateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to update MetalPrices.
     */
    data: XOR<MetalPriceUpdateManyMutationInput, MetalPriceUncheckedUpdateManyInput>
    /**
     * Filter which MetalPrices to update
     */
    where?: MetalPriceWhereInput
    /**
     * Limit how many MetalPrices to update.
     */
    limit?: number
  }

  /**
   * MetalPrice updateManyAndReturn
   */
  export type MetalPriceUpdateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the MetalPrice
     */
    select?: MetalPriceSelectUpdateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the MetalPrice
     */
    omit?: MetalPriceOmit<ExtArgs> | null
    /**
     * The data used to update MetalPrices.
     */
    data: XOR<MetalPriceUpdateManyMutationInput, MetalPriceUncheckedUpdateManyInput>
    /**
     * Filter which MetalPrices to update
     */
    where?: MetalPriceWhereInput
    /**
     * Limit how many MetalPrices to update.
     */
    limit?: number
  }

  /**
   * MetalPrice upsert
   */
  export type MetalPriceUpsertArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the MetalPrice
     */
    select?: MetalPriceSelect<ExtArgs> | null
    /**
     * Omit specific fields from the MetalPrice
     */
    omit?: MetalPriceOmit<ExtArgs> | null
    /**
     * The filter to search for the MetalPrice to update in case it exists.
     */
    where: MetalPriceWhereUniqueInput
    /**
     * In case the MetalPrice found by the `where` argument doesn't exist, create a new MetalPrice with this data.
     */
    create: XOR<MetalPriceCreateInput, MetalPriceUncheckedCreateInput>
    /**
     * In case the MetalPrice was found with the provided `where` argument, update it with this data.
     */
    update: XOR<MetalPriceUpdateInput, MetalPriceUncheckedUpdateInput>
  }

  /**
   * MetalPrice delete
   */
  export type MetalPriceDeleteArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the MetalPrice
     */
    select?: MetalPriceSelect<ExtArgs> | null
    /**
     * Omit specific fields from the MetalPrice
     */
    omit?: MetalPriceOmit<ExtArgs> | null
    /**
     * Filter which MetalPrice to delete.
     */
    where: MetalPriceWhereUniqueInput
  }

  /**
   * MetalPrice deleteMany
   */
  export type MetalPriceDeleteManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which MetalPrices to delete
     */
    where?: MetalPriceWhereInput
    /**
     * Limit how many MetalPrices to delete.
     */
    limit?: number
  }

  /**
   * MetalPrice without action
   */
  export type MetalPriceDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the MetalPrice
     */
    select?: MetalPriceSelect<ExtArgs> | null
    /**
     * Omit specific fields from the MetalPrice
     */
    omit?: MetalPriceOmit<ExtArgs> | null
  }


  /**
   * Model Transaction
   */

  export type AggregateTransaction = {
    _count: TransactionCountAggregateOutputType | null
    _avg: TransactionAvgAggregateOutputType | null
    _sum: TransactionSumAggregateOutputType | null
    _min: TransactionMinAggregateOutputType | null
    _max: TransactionMaxAggregateOutputType | null
  }

  export type TransactionAvgAggregateOutputType = {
    amount: Decimal | null
  }

  export type TransactionSumAggregateOutputType = {
    amount: Decimal | null
  }

  export type TransactionMinAggregateOutputType = {
    id: string | null
    pledgeId: string | null
    amount: Decimal | null
    type: $Enums.TransactionType | null
    note: string | null
    createdAt: Date | null
  }

  export type TransactionMaxAggregateOutputType = {
    id: string | null
    pledgeId: string | null
    amount: Decimal | null
    type: $Enums.TransactionType | null
    note: string | null
    createdAt: Date | null
  }

  export type TransactionCountAggregateOutputType = {
    id: number
    pledgeId: number
    amount: number
    type: number
    note: number
    createdAt: number
    _all: number
  }


  export type TransactionAvgAggregateInputType = {
    amount?: true
  }

  export type TransactionSumAggregateInputType = {
    amount?: true
  }

  export type TransactionMinAggregateInputType = {
    id?: true
    pledgeId?: true
    amount?: true
    type?: true
    note?: true
    createdAt?: true
  }

  export type TransactionMaxAggregateInputType = {
    id?: true
    pledgeId?: true
    amount?: true
    type?: true
    note?: true
    createdAt?: true
  }

  export type TransactionCountAggregateInputType = {
    id?: true
    pledgeId?: true
    amount?: true
    type?: true
    note?: true
    createdAt?: true
    _all?: true
  }

  export type TransactionAggregateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which Transaction to aggregate.
     */
    where?: TransactionWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Transactions to fetch.
     */
    orderBy?: TransactionOrderByWithRelationInput | TransactionOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the start position
     */
    cursor?: TransactionWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Transactions from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Transactions.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Count returned Transactions
    **/
    _count?: true | TransactionCountAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to average
    **/
    _avg?: TransactionAvgAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to sum
    **/
    _sum?: TransactionSumAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the minimum value
    **/
    _min?: TransactionMinAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the maximum value
    **/
    _max?: TransactionMaxAggregateInputType
  }

  export type GetTransactionAggregateType<T extends TransactionAggregateArgs> = {
        [P in keyof T & keyof AggregateTransaction]: P extends '_count' | 'count'
      ? T[P] extends true
        ? number
        : GetScalarType<T[P], AggregateTransaction[P]>
      : GetScalarType<T[P], AggregateTransaction[P]>
  }




  export type TransactionGroupByArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: TransactionWhereInput
    orderBy?: TransactionOrderByWithAggregationInput | TransactionOrderByWithAggregationInput[]
    by: TransactionScalarFieldEnum[] | TransactionScalarFieldEnum
    having?: TransactionScalarWhereWithAggregatesInput
    take?: number
    skip?: number
    _count?: TransactionCountAggregateInputType | true
    _avg?: TransactionAvgAggregateInputType
    _sum?: TransactionSumAggregateInputType
    _min?: TransactionMinAggregateInputType
    _max?: TransactionMaxAggregateInputType
  }

  export type TransactionGroupByOutputType = {
    id: string
    pledgeId: string
    amount: Decimal
    type: $Enums.TransactionType
    note: string | null
    createdAt: Date
    _count: TransactionCountAggregateOutputType | null
    _avg: TransactionAvgAggregateOutputType | null
    _sum: TransactionSumAggregateOutputType | null
    _min: TransactionMinAggregateOutputType | null
    _max: TransactionMaxAggregateOutputType | null
  }

  type GetTransactionGroupByPayload<T extends TransactionGroupByArgs> = Prisma.PrismaPromise<
    Array<
      PickEnumerable<TransactionGroupByOutputType, T['by']> &
        {
          [P in ((keyof T) & (keyof TransactionGroupByOutputType))]: P extends '_count'
            ? T[P] extends boolean
              ? number
              : GetScalarType<T[P], TransactionGroupByOutputType[P]>
            : GetScalarType<T[P], TransactionGroupByOutputType[P]>
        }
      >
    >


  export type TransactionSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    pledgeId?: boolean
    amount?: boolean
    type?: boolean
    note?: boolean
    createdAt?: boolean
    pledge?: boolean | PledgeDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["transaction"]>

  export type TransactionSelectCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    pledgeId?: boolean
    amount?: boolean
    type?: boolean
    note?: boolean
    createdAt?: boolean
    pledge?: boolean | PledgeDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["transaction"]>

  export type TransactionSelectUpdateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    pledgeId?: boolean
    amount?: boolean
    type?: boolean
    note?: boolean
    createdAt?: boolean
    pledge?: boolean | PledgeDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["transaction"]>

  export type TransactionSelectScalar = {
    id?: boolean
    pledgeId?: boolean
    amount?: boolean
    type?: boolean
    note?: boolean
    createdAt?: boolean
  }

  export type TransactionOmit<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetOmit<"id" | "pledgeId" | "amount" | "type" | "note" | "createdAt", ExtArgs["result"]["transaction"]>
  export type TransactionInclude<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    pledge?: boolean | PledgeDefaultArgs<ExtArgs>
  }
  export type TransactionIncludeCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    pledge?: boolean | PledgeDefaultArgs<ExtArgs>
  }
  export type TransactionIncludeUpdateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    pledge?: boolean | PledgeDefaultArgs<ExtArgs>
  }

  export type $TransactionPayload<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    name: "Transaction"
    objects: {
      pledge: Prisma.$PledgePayload<ExtArgs>
    }
    scalars: $Extensions.GetPayloadResult<{
      id: string
      pledgeId: string
      amount: Prisma.Decimal
      type: $Enums.TransactionType
      note: string | null
      createdAt: Date
    }, ExtArgs["result"]["transaction"]>
    composites: {}
  }

  type TransactionGetPayload<S extends boolean | null | undefined | TransactionDefaultArgs> = $Result.GetResult<Prisma.$TransactionPayload, S>

  type TransactionCountArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> =
    Omit<TransactionFindManyArgs, 'select' | 'include' | 'distinct' | 'omit'> & {
      select?: TransactionCountAggregateInputType | true
    }

  export interface TransactionDelegate<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> {
    [K: symbol]: { types: Prisma.TypeMap<ExtArgs>['model']['Transaction'], meta: { name: 'Transaction' } }
    /**
     * Find zero or one Transaction that matches the filter.
     * @param {TransactionFindUniqueArgs} args - Arguments to find a Transaction
     * @example
     * // Get one Transaction
     * const transaction = await prisma.transaction.findUnique({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUnique<T extends TransactionFindUniqueArgs>(args: SelectSubset<T, TransactionFindUniqueArgs<ExtArgs>>): Prisma__TransactionClient<$Result.GetResult<Prisma.$TransactionPayload<ExtArgs>, T, "findUnique", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find one Transaction that matches the filter or throw an error with `error.code='P2025'`
     * if no matches were found.
     * @param {TransactionFindUniqueOrThrowArgs} args - Arguments to find a Transaction
     * @example
     * // Get one Transaction
     * const transaction = await prisma.transaction.findUniqueOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUniqueOrThrow<T extends TransactionFindUniqueOrThrowArgs>(args: SelectSubset<T, TransactionFindUniqueOrThrowArgs<ExtArgs>>): Prisma__TransactionClient<$Result.GetResult<Prisma.$TransactionPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first Transaction that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {TransactionFindFirstArgs} args - Arguments to find a Transaction
     * @example
     * // Get one Transaction
     * const transaction = await prisma.transaction.findFirst({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirst<T extends TransactionFindFirstArgs>(args?: SelectSubset<T, TransactionFindFirstArgs<ExtArgs>>): Prisma__TransactionClient<$Result.GetResult<Prisma.$TransactionPayload<ExtArgs>, T, "findFirst", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first Transaction that matches the filter or
     * throw `PrismaKnownClientError` with `P2025` code if no matches were found.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {TransactionFindFirstOrThrowArgs} args - Arguments to find a Transaction
     * @example
     * // Get one Transaction
     * const transaction = await prisma.transaction.findFirstOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirstOrThrow<T extends TransactionFindFirstOrThrowArgs>(args?: SelectSubset<T, TransactionFindFirstOrThrowArgs<ExtArgs>>): Prisma__TransactionClient<$Result.GetResult<Prisma.$TransactionPayload<ExtArgs>, T, "findFirstOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find zero or more Transactions that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {TransactionFindManyArgs} args - Arguments to filter and select certain fields only.
     * @example
     * // Get all Transactions
     * const transactions = await prisma.transaction.findMany()
     * 
     * // Get first 10 Transactions
     * const transactions = await prisma.transaction.findMany({ take: 10 })
     * 
     * // Only select the `id`
     * const transactionWithIdOnly = await prisma.transaction.findMany({ select: { id: true } })
     * 
     */
    findMany<T extends TransactionFindManyArgs>(args?: SelectSubset<T, TransactionFindManyArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$TransactionPayload<ExtArgs>, T, "findMany", GlobalOmitOptions>>

    /**
     * Create a Transaction.
     * @param {TransactionCreateArgs} args - Arguments to create a Transaction.
     * @example
     * // Create one Transaction
     * const Transaction = await prisma.transaction.create({
     *   data: {
     *     // ... data to create a Transaction
     *   }
     * })
     * 
     */
    create<T extends TransactionCreateArgs>(args: SelectSubset<T, TransactionCreateArgs<ExtArgs>>): Prisma__TransactionClient<$Result.GetResult<Prisma.$TransactionPayload<ExtArgs>, T, "create", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Create many Transactions.
     * @param {TransactionCreateManyArgs} args - Arguments to create many Transactions.
     * @example
     * // Create many Transactions
     * const transaction = await prisma.transaction.createMany({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     *     
     */
    createMany<T extends TransactionCreateManyArgs>(args?: SelectSubset<T, TransactionCreateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create many Transactions and returns the data saved in the database.
     * @param {TransactionCreateManyAndReturnArgs} args - Arguments to create many Transactions.
     * @example
     * // Create many Transactions
     * const transaction = await prisma.transaction.createManyAndReturn({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Create many Transactions and only return the `id`
     * const transactionWithIdOnly = await prisma.transaction.createManyAndReturn({
     *   select: { id: true },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    createManyAndReturn<T extends TransactionCreateManyAndReturnArgs>(args?: SelectSubset<T, TransactionCreateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$TransactionPayload<ExtArgs>, T, "createManyAndReturn", GlobalOmitOptions>>

    /**
     * Delete a Transaction.
     * @param {TransactionDeleteArgs} args - Arguments to delete one Transaction.
     * @example
     * // Delete one Transaction
     * const Transaction = await prisma.transaction.delete({
     *   where: {
     *     // ... filter to delete one Transaction
     *   }
     * })
     * 
     */
    delete<T extends TransactionDeleteArgs>(args: SelectSubset<T, TransactionDeleteArgs<ExtArgs>>): Prisma__TransactionClient<$Result.GetResult<Prisma.$TransactionPayload<ExtArgs>, T, "delete", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Update one Transaction.
     * @param {TransactionUpdateArgs} args - Arguments to update one Transaction.
     * @example
     * // Update one Transaction
     * const transaction = await prisma.transaction.update({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    update<T extends TransactionUpdateArgs>(args: SelectSubset<T, TransactionUpdateArgs<ExtArgs>>): Prisma__TransactionClient<$Result.GetResult<Prisma.$TransactionPayload<ExtArgs>, T, "update", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Delete zero or more Transactions.
     * @param {TransactionDeleteManyArgs} args - Arguments to filter Transactions to delete.
     * @example
     * // Delete a few Transactions
     * const { count } = await prisma.transaction.deleteMany({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     * 
     */
    deleteMany<T extends TransactionDeleteManyArgs>(args?: SelectSubset<T, TransactionDeleteManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more Transactions.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {TransactionUpdateManyArgs} args - Arguments to update one or more rows.
     * @example
     * // Update many Transactions
     * const transaction = await prisma.transaction.updateMany({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    updateMany<T extends TransactionUpdateManyArgs>(args: SelectSubset<T, TransactionUpdateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more Transactions and returns the data updated in the database.
     * @param {TransactionUpdateManyAndReturnArgs} args - Arguments to update many Transactions.
     * @example
     * // Update many Transactions
     * const transaction = await prisma.transaction.updateManyAndReturn({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Update zero or more Transactions and only return the `id`
     * const transactionWithIdOnly = await prisma.transaction.updateManyAndReturn({
     *   select: { id: true },
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    updateManyAndReturn<T extends TransactionUpdateManyAndReturnArgs>(args: SelectSubset<T, TransactionUpdateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$TransactionPayload<ExtArgs>, T, "updateManyAndReturn", GlobalOmitOptions>>

    /**
     * Create or update one Transaction.
     * @param {TransactionUpsertArgs} args - Arguments to update or create a Transaction.
     * @example
     * // Update or create a Transaction
     * const transaction = await prisma.transaction.upsert({
     *   create: {
     *     // ... data to create a Transaction
     *   },
     *   update: {
     *     // ... in case it already exists, update
     *   },
     *   where: {
     *     // ... the filter for the Transaction we want to update
     *   }
     * })
     */
    upsert<T extends TransactionUpsertArgs>(args: SelectSubset<T, TransactionUpsertArgs<ExtArgs>>): Prisma__TransactionClient<$Result.GetResult<Prisma.$TransactionPayload<ExtArgs>, T, "upsert", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>


    /**
     * Count the number of Transactions.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {TransactionCountArgs} args - Arguments to filter Transactions to count.
     * @example
     * // Count the number of Transactions
     * const count = await prisma.transaction.count({
     *   where: {
     *     // ... the filter for the Transactions we want to count
     *   }
     * })
    **/
    count<T extends TransactionCountArgs>(
      args?: Subset<T, TransactionCountArgs>,
    ): Prisma.PrismaPromise<
      T extends $Utils.Record<'select', any>
        ? T['select'] extends true
          ? number
          : GetScalarType<T['select'], TransactionCountAggregateOutputType>
        : number
    >

    /**
     * Allows you to perform aggregations operations on a Transaction.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {TransactionAggregateArgs} args - Select which aggregations you would like to apply and on what fields.
     * @example
     * // Ordered by age ascending
     * // Where email contains prisma.io
     * // Limited to the 10 users
     * const aggregations = await prisma.user.aggregate({
     *   _avg: {
     *     age: true,
     *   },
     *   where: {
     *     email: {
     *       contains: "prisma.io",
     *     },
     *   },
     *   orderBy: {
     *     age: "asc",
     *   },
     *   take: 10,
     * })
    **/
    aggregate<T extends TransactionAggregateArgs>(args: Subset<T, TransactionAggregateArgs>): Prisma.PrismaPromise<GetTransactionAggregateType<T>>

    /**
     * Group by Transaction.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {TransactionGroupByArgs} args - Group by arguments.
     * @example
     * // Group by city, order by createdAt, get count
     * const result = await prisma.user.groupBy({
     *   by: ['city', 'createdAt'],
     *   orderBy: {
     *     createdAt: true
     *   },
     *   _count: {
     *     _all: true
     *   },
     * })
     * 
    **/
    groupBy<
      T extends TransactionGroupByArgs,
      HasSelectOrTake extends Or<
        Extends<'skip', Keys<T>>,
        Extends<'take', Keys<T>>
      >,
      OrderByArg extends True extends HasSelectOrTake
        ? { orderBy: TransactionGroupByArgs['orderBy'] }
        : { orderBy?: TransactionGroupByArgs['orderBy'] },
      OrderFields extends ExcludeUnderscoreKeys<Keys<MaybeTupleToUnion<T['orderBy']>>>,
      ByFields extends MaybeTupleToUnion<T['by']>,
      ByValid extends Has<ByFields, OrderFields>,
      HavingFields extends GetHavingFields<T['having']>,
      HavingValid extends Has<ByFields, HavingFields>,
      ByEmpty extends T['by'] extends never[] ? True : False,
      InputErrors extends ByEmpty extends True
      ? `Error: "by" must not be empty.`
      : HavingValid extends False
      ? {
          [P in HavingFields]: P extends ByFields
            ? never
            : P extends string
            ? `Error: Field "${P}" used in "having" needs to be provided in "by".`
            : [
                Error,
                'Field ',
                P,
                ` in "having" needs to be provided in "by"`,
              ]
        }[HavingFields]
      : 'take' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "take", you also need to provide "orderBy"'
      : 'skip' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "skip", you also need to provide "orderBy"'
      : ByValid extends True
      ? {}
      : {
          [P in OrderFields]: P extends ByFields
            ? never
            : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
        }[OrderFields]
    >(args: SubsetIntersection<T, TransactionGroupByArgs, OrderByArg> & InputErrors): {} extends InputErrors ? GetTransactionGroupByPayload<T> : Prisma.PrismaPromise<InputErrors>
  /**
   * Fields of the Transaction model
   */
  readonly fields: TransactionFieldRefs;
  }

  /**
   * The delegate class that acts as a "Promise-like" for Transaction.
   * Why is this prefixed with `Prisma__`?
   * Because we want to prevent naming conflicts as mentioned in
   * https://github.com/prisma/prisma-client-js/issues/707
   */
  export interface Prisma__TransactionClient<T, Null = never, ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> extends Prisma.PrismaPromise<T> {
    readonly [Symbol.toStringTag]: "PrismaPromise"
    pledge<T extends PledgeDefaultArgs<ExtArgs> = {}>(args?: Subset<T, PledgeDefaultArgs<ExtArgs>>): Prisma__PledgeClient<$Result.GetResult<Prisma.$PledgePayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions> | Null, Null, ExtArgs, GlobalOmitOptions>
    /**
     * Attaches callbacks for the resolution and/or rejection of the Promise.
     * @param onfulfilled The callback to execute when the Promise is resolved.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of which ever callback is executed.
     */
    then<TResult1 = T, TResult2 = never>(onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | undefined | null, onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null): $Utils.JsPromise<TResult1 | TResult2>
    /**
     * Attaches a callback for only the rejection of the Promise.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of the callback.
     */
    catch<TResult = never>(onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | undefined | null): $Utils.JsPromise<T | TResult>
    /**
     * Attaches a callback that is invoked when the Promise is settled (fulfilled or rejected). The
     * resolved value cannot be modified from the callback.
     * @param onfinally The callback to execute when the Promise is settled (fulfilled or rejected).
     * @returns A Promise for the completion of the callback.
     */
    finally(onfinally?: (() => void) | undefined | null): $Utils.JsPromise<T>
  }




  /**
   * Fields of the Transaction model
   */
  interface TransactionFieldRefs {
    readonly id: FieldRef<"Transaction", 'String'>
    readonly pledgeId: FieldRef<"Transaction", 'String'>
    readonly amount: FieldRef<"Transaction", 'Decimal'>
    readonly type: FieldRef<"Transaction", 'TransactionType'>
    readonly note: FieldRef<"Transaction", 'String'>
    readonly createdAt: FieldRef<"Transaction", 'DateTime'>
  }
    

  // Custom InputTypes
  /**
   * Transaction findUnique
   */
  export type TransactionFindUniqueArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Transaction
     */
    select?: TransactionSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Transaction
     */
    omit?: TransactionOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: TransactionInclude<ExtArgs> | null
    /**
     * Filter, which Transaction to fetch.
     */
    where: TransactionWhereUniqueInput
  }

  /**
   * Transaction findUniqueOrThrow
   */
  export type TransactionFindUniqueOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Transaction
     */
    select?: TransactionSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Transaction
     */
    omit?: TransactionOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: TransactionInclude<ExtArgs> | null
    /**
     * Filter, which Transaction to fetch.
     */
    where: TransactionWhereUniqueInput
  }

  /**
   * Transaction findFirst
   */
  export type TransactionFindFirstArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Transaction
     */
    select?: TransactionSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Transaction
     */
    omit?: TransactionOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: TransactionInclude<ExtArgs> | null
    /**
     * Filter, which Transaction to fetch.
     */
    where?: TransactionWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Transactions to fetch.
     */
    orderBy?: TransactionOrderByWithRelationInput | TransactionOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for Transactions.
     */
    cursor?: TransactionWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Transactions from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Transactions.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of Transactions.
     */
    distinct?: TransactionScalarFieldEnum | TransactionScalarFieldEnum[]
  }

  /**
   * Transaction findFirstOrThrow
   */
  export type TransactionFindFirstOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Transaction
     */
    select?: TransactionSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Transaction
     */
    omit?: TransactionOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: TransactionInclude<ExtArgs> | null
    /**
     * Filter, which Transaction to fetch.
     */
    where?: TransactionWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Transactions to fetch.
     */
    orderBy?: TransactionOrderByWithRelationInput | TransactionOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for Transactions.
     */
    cursor?: TransactionWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Transactions from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Transactions.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of Transactions.
     */
    distinct?: TransactionScalarFieldEnum | TransactionScalarFieldEnum[]
  }

  /**
   * Transaction findMany
   */
  export type TransactionFindManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Transaction
     */
    select?: TransactionSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Transaction
     */
    omit?: TransactionOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: TransactionInclude<ExtArgs> | null
    /**
     * Filter, which Transactions to fetch.
     */
    where?: TransactionWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Transactions to fetch.
     */
    orderBy?: TransactionOrderByWithRelationInput | TransactionOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for listing Transactions.
     */
    cursor?: TransactionWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Transactions from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Transactions.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of Transactions.
     */
    distinct?: TransactionScalarFieldEnum | TransactionScalarFieldEnum[]
  }

  /**
   * Transaction create
   */
  export type TransactionCreateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Transaction
     */
    select?: TransactionSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Transaction
     */
    omit?: TransactionOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: TransactionInclude<ExtArgs> | null
    /**
     * The data needed to create a Transaction.
     */
    data: XOR<TransactionCreateInput, TransactionUncheckedCreateInput>
  }

  /**
   * Transaction createMany
   */
  export type TransactionCreateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to create many Transactions.
     */
    data: TransactionCreateManyInput | TransactionCreateManyInput[]
    skipDuplicates?: boolean
  }

  /**
   * Transaction createManyAndReturn
   */
  export type TransactionCreateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Transaction
     */
    select?: TransactionSelectCreateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the Transaction
     */
    omit?: TransactionOmit<ExtArgs> | null
    /**
     * The data used to create many Transactions.
     */
    data: TransactionCreateManyInput | TransactionCreateManyInput[]
    skipDuplicates?: boolean
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: TransactionIncludeCreateManyAndReturn<ExtArgs> | null
  }

  /**
   * Transaction update
   */
  export type TransactionUpdateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Transaction
     */
    select?: TransactionSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Transaction
     */
    omit?: TransactionOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: TransactionInclude<ExtArgs> | null
    /**
     * The data needed to update a Transaction.
     */
    data: XOR<TransactionUpdateInput, TransactionUncheckedUpdateInput>
    /**
     * Choose, which Transaction to update.
     */
    where: TransactionWhereUniqueInput
  }

  /**
   * Transaction updateMany
   */
  export type TransactionUpdateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to update Transactions.
     */
    data: XOR<TransactionUpdateManyMutationInput, TransactionUncheckedUpdateManyInput>
    /**
     * Filter which Transactions to update
     */
    where?: TransactionWhereInput
    /**
     * Limit how many Transactions to update.
     */
    limit?: number
  }

  /**
   * Transaction updateManyAndReturn
   */
  export type TransactionUpdateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Transaction
     */
    select?: TransactionSelectUpdateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the Transaction
     */
    omit?: TransactionOmit<ExtArgs> | null
    /**
     * The data used to update Transactions.
     */
    data: XOR<TransactionUpdateManyMutationInput, TransactionUncheckedUpdateManyInput>
    /**
     * Filter which Transactions to update
     */
    where?: TransactionWhereInput
    /**
     * Limit how many Transactions to update.
     */
    limit?: number
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: TransactionIncludeUpdateManyAndReturn<ExtArgs> | null
  }

  /**
   * Transaction upsert
   */
  export type TransactionUpsertArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Transaction
     */
    select?: TransactionSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Transaction
     */
    omit?: TransactionOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: TransactionInclude<ExtArgs> | null
    /**
     * The filter to search for the Transaction to update in case it exists.
     */
    where: TransactionWhereUniqueInput
    /**
     * In case the Transaction found by the `where` argument doesn't exist, create a new Transaction with this data.
     */
    create: XOR<TransactionCreateInput, TransactionUncheckedCreateInput>
    /**
     * In case the Transaction was found with the provided `where` argument, update it with this data.
     */
    update: XOR<TransactionUpdateInput, TransactionUncheckedUpdateInput>
  }

  /**
   * Transaction delete
   */
  export type TransactionDeleteArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Transaction
     */
    select?: TransactionSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Transaction
     */
    omit?: TransactionOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: TransactionInclude<ExtArgs> | null
    /**
     * Filter which Transaction to delete.
     */
    where: TransactionWhereUniqueInput
  }

  /**
   * Transaction deleteMany
   */
  export type TransactionDeleteManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which Transactions to delete
     */
    where?: TransactionWhereInput
    /**
     * Limit how many Transactions to delete.
     */
    limit?: number
  }

  /**
   * Transaction without action
   */
  export type TransactionDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Transaction
     */
    select?: TransactionSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Transaction
     */
    omit?: TransactionOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: TransactionInclude<ExtArgs> | null
  }


  /**
   * Model ExchangeRate
   */

  export type AggregateExchangeRate = {
    _count: ExchangeRateCountAggregateOutputType | null
    _avg: ExchangeRateAvgAggregateOutputType | null
    _sum: ExchangeRateSumAggregateOutputType | null
    _min: ExchangeRateMinAggregateOutputType | null
    _max: ExchangeRateMaxAggregateOutputType | null
  }

  export type ExchangeRateAvgAggregateOutputType = {
    rate: number | null
  }

  export type ExchangeRateSumAggregateOutputType = {
    rate: number | null
  }

  export type ExchangeRateMinAggregateOutputType = {
    id: string | null
    from: string | null
    to: string | null
    rate: number | null
    createdAt: Date | null
  }

  export type ExchangeRateMaxAggregateOutputType = {
    id: string | null
    from: string | null
    to: string | null
    rate: number | null
    createdAt: Date | null
  }

  export type ExchangeRateCountAggregateOutputType = {
    id: number
    from: number
    to: number
    rate: number
    createdAt: number
    _all: number
  }


  export type ExchangeRateAvgAggregateInputType = {
    rate?: true
  }

  export type ExchangeRateSumAggregateInputType = {
    rate?: true
  }

  export type ExchangeRateMinAggregateInputType = {
    id?: true
    from?: true
    to?: true
    rate?: true
    createdAt?: true
  }

  export type ExchangeRateMaxAggregateInputType = {
    id?: true
    from?: true
    to?: true
    rate?: true
    createdAt?: true
  }

  export type ExchangeRateCountAggregateInputType = {
    id?: true
    from?: true
    to?: true
    rate?: true
    createdAt?: true
    _all?: true
  }

  export type ExchangeRateAggregateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which ExchangeRate to aggregate.
     */
    where?: ExchangeRateWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of ExchangeRates to fetch.
     */
    orderBy?: ExchangeRateOrderByWithRelationInput | ExchangeRateOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the start position
     */
    cursor?: ExchangeRateWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` ExchangeRates from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` ExchangeRates.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Count returned ExchangeRates
    **/
    _count?: true | ExchangeRateCountAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to average
    **/
    _avg?: ExchangeRateAvgAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to sum
    **/
    _sum?: ExchangeRateSumAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the minimum value
    **/
    _min?: ExchangeRateMinAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the maximum value
    **/
    _max?: ExchangeRateMaxAggregateInputType
  }

  export type GetExchangeRateAggregateType<T extends ExchangeRateAggregateArgs> = {
        [P in keyof T & keyof AggregateExchangeRate]: P extends '_count' | 'count'
      ? T[P] extends true
        ? number
        : GetScalarType<T[P], AggregateExchangeRate[P]>
      : GetScalarType<T[P], AggregateExchangeRate[P]>
  }




  export type ExchangeRateGroupByArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: ExchangeRateWhereInput
    orderBy?: ExchangeRateOrderByWithAggregationInput | ExchangeRateOrderByWithAggregationInput[]
    by: ExchangeRateScalarFieldEnum[] | ExchangeRateScalarFieldEnum
    having?: ExchangeRateScalarWhereWithAggregatesInput
    take?: number
    skip?: number
    _count?: ExchangeRateCountAggregateInputType | true
    _avg?: ExchangeRateAvgAggregateInputType
    _sum?: ExchangeRateSumAggregateInputType
    _min?: ExchangeRateMinAggregateInputType
    _max?: ExchangeRateMaxAggregateInputType
  }

  export type ExchangeRateGroupByOutputType = {
    id: string
    from: string
    to: string
    rate: number
    createdAt: Date
    _count: ExchangeRateCountAggregateOutputType | null
    _avg: ExchangeRateAvgAggregateOutputType | null
    _sum: ExchangeRateSumAggregateOutputType | null
    _min: ExchangeRateMinAggregateOutputType | null
    _max: ExchangeRateMaxAggregateOutputType | null
  }

  type GetExchangeRateGroupByPayload<T extends ExchangeRateGroupByArgs> = Prisma.PrismaPromise<
    Array<
      PickEnumerable<ExchangeRateGroupByOutputType, T['by']> &
        {
          [P in ((keyof T) & (keyof ExchangeRateGroupByOutputType))]: P extends '_count'
            ? T[P] extends boolean
              ? number
              : GetScalarType<T[P], ExchangeRateGroupByOutputType[P]>
            : GetScalarType<T[P], ExchangeRateGroupByOutputType[P]>
        }
      >
    >


  export type ExchangeRateSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    from?: boolean
    to?: boolean
    rate?: boolean
    createdAt?: boolean
  }, ExtArgs["result"]["exchangeRate"]>

  export type ExchangeRateSelectCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    from?: boolean
    to?: boolean
    rate?: boolean
    createdAt?: boolean
  }, ExtArgs["result"]["exchangeRate"]>

  export type ExchangeRateSelectUpdateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    from?: boolean
    to?: boolean
    rate?: boolean
    createdAt?: boolean
  }, ExtArgs["result"]["exchangeRate"]>

  export type ExchangeRateSelectScalar = {
    id?: boolean
    from?: boolean
    to?: boolean
    rate?: boolean
    createdAt?: boolean
  }

  export type ExchangeRateOmit<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetOmit<"id" | "from" | "to" | "rate" | "createdAt", ExtArgs["result"]["exchangeRate"]>

  export type $ExchangeRatePayload<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    name: "ExchangeRate"
    objects: {}
    scalars: $Extensions.GetPayloadResult<{
      id: string
      from: string
      to: string
      rate: number
      createdAt: Date
    }, ExtArgs["result"]["exchangeRate"]>
    composites: {}
  }

  type ExchangeRateGetPayload<S extends boolean | null | undefined | ExchangeRateDefaultArgs> = $Result.GetResult<Prisma.$ExchangeRatePayload, S>

  type ExchangeRateCountArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> =
    Omit<ExchangeRateFindManyArgs, 'select' | 'include' | 'distinct' | 'omit'> & {
      select?: ExchangeRateCountAggregateInputType | true
    }

  export interface ExchangeRateDelegate<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> {
    [K: symbol]: { types: Prisma.TypeMap<ExtArgs>['model']['ExchangeRate'], meta: { name: 'ExchangeRate' } }
    /**
     * Find zero or one ExchangeRate that matches the filter.
     * @param {ExchangeRateFindUniqueArgs} args - Arguments to find a ExchangeRate
     * @example
     * // Get one ExchangeRate
     * const exchangeRate = await prisma.exchangeRate.findUnique({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUnique<T extends ExchangeRateFindUniqueArgs>(args: SelectSubset<T, ExchangeRateFindUniqueArgs<ExtArgs>>): Prisma__ExchangeRateClient<$Result.GetResult<Prisma.$ExchangeRatePayload<ExtArgs>, T, "findUnique", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find one ExchangeRate that matches the filter or throw an error with `error.code='P2025'`
     * if no matches were found.
     * @param {ExchangeRateFindUniqueOrThrowArgs} args - Arguments to find a ExchangeRate
     * @example
     * // Get one ExchangeRate
     * const exchangeRate = await prisma.exchangeRate.findUniqueOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUniqueOrThrow<T extends ExchangeRateFindUniqueOrThrowArgs>(args: SelectSubset<T, ExchangeRateFindUniqueOrThrowArgs<ExtArgs>>): Prisma__ExchangeRateClient<$Result.GetResult<Prisma.$ExchangeRatePayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first ExchangeRate that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {ExchangeRateFindFirstArgs} args - Arguments to find a ExchangeRate
     * @example
     * // Get one ExchangeRate
     * const exchangeRate = await prisma.exchangeRate.findFirst({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirst<T extends ExchangeRateFindFirstArgs>(args?: SelectSubset<T, ExchangeRateFindFirstArgs<ExtArgs>>): Prisma__ExchangeRateClient<$Result.GetResult<Prisma.$ExchangeRatePayload<ExtArgs>, T, "findFirst", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first ExchangeRate that matches the filter or
     * throw `PrismaKnownClientError` with `P2025` code if no matches were found.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {ExchangeRateFindFirstOrThrowArgs} args - Arguments to find a ExchangeRate
     * @example
     * // Get one ExchangeRate
     * const exchangeRate = await prisma.exchangeRate.findFirstOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirstOrThrow<T extends ExchangeRateFindFirstOrThrowArgs>(args?: SelectSubset<T, ExchangeRateFindFirstOrThrowArgs<ExtArgs>>): Prisma__ExchangeRateClient<$Result.GetResult<Prisma.$ExchangeRatePayload<ExtArgs>, T, "findFirstOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find zero or more ExchangeRates that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {ExchangeRateFindManyArgs} args - Arguments to filter and select certain fields only.
     * @example
     * // Get all ExchangeRates
     * const exchangeRates = await prisma.exchangeRate.findMany()
     * 
     * // Get first 10 ExchangeRates
     * const exchangeRates = await prisma.exchangeRate.findMany({ take: 10 })
     * 
     * // Only select the `id`
     * const exchangeRateWithIdOnly = await prisma.exchangeRate.findMany({ select: { id: true } })
     * 
     */
    findMany<T extends ExchangeRateFindManyArgs>(args?: SelectSubset<T, ExchangeRateFindManyArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$ExchangeRatePayload<ExtArgs>, T, "findMany", GlobalOmitOptions>>

    /**
     * Create a ExchangeRate.
     * @param {ExchangeRateCreateArgs} args - Arguments to create a ExchangeRate.
     * @example
     * // Create one ExchangeRate
     * const ExchangeRate = await prisma.exchangeRate.create({
     *   data: {
     *     // ... data to create a ExchangeRate
     *   }
     * })
     * 
     */
    create<T extends ExchangeRateCreateArgs>(args: SelectSubset<T, ExchangeRateCreateArgs<ExtArgs>>): Prisma__ExchangeRateClient<$Result.GetResult<Prisma.$ExchangeRatePayload<ExtArgs>, T, "create", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Create many ExchangeRates.
     * @param {ExchangeRateCreateManyArgs} args - Arguments to create many ExchangeRates.
     * @example
     * // Create many ExchangeRates
     * const exchangeRate = await prisma.exchangeRate.createMany({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     *     
     */
    createMany<T extends ExchangeRateCreateManyArgs>(args?: SelectSubset<T, ExchangeRateCreateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create many ExchangeRates and returns the data saved in the database.
     * @param {ExchangeRateCreateManyAndReturnArgs} args - Arguments to create many ExchangeRates.
     * @example
     * // Create many ExchangeRates
     * const exchangeRate = await prisma.exchangeRate.createManyAndReturn({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Create many ExchangeRates and only return the `id`
     * const exchangeRateWithIdOnly = await prisma.exchangeRate.createManyAndReturn({
     *   select: { id: true },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    createManyAndReturn<T extends ExchangeRateCreateManyAndReturnArgs>(args?: SelectSubset<T, ExchangeRateCreateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$ExchangeRatePayload<ExtArgs>, T, "createManyAndReturn", GlobalOmitOptions>>

    /**
     * Delete a ExchangeRate.
     * @param {ExchangeRateDeleteArgs} args - Arguments to delete one ExchangeRate.
     * @example
     * // Delete one ExchangeRate
     * const ExchangeRate = await prisma.exchangeRate.delete({
     *   where: {
     *     // ... filter to delete one ExchangeRate
     *   }
     * })
     * 
     */
    delete<T extends ExchangeRateDeleteArgs>(args: SelectSubset<T, ExchangeRateDeleteArgs<ExtArgs>>): Prisma__ExchangeRateClient<$Result.GetResult<Prisma.$ExchangeRatePayload<ExtArgs>, T, "delete", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Update one ExchangeRate.
     * @param {ExchangeRateUpdateArgs} args - Arguments to update one ExchangeRate.
     * @example
     * // Update one ExchangeRate
     * const exchangeRate = await prisma.exchangeRate.update({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    update<T extends ExchangeRateUpdateArgs>(args: SelectSubset<T, ExchangeRateUpdateArgs<ExtArgs>>): Prisma__ExchangeRateClient<$Result.GetResult<Prisma.$ExchangeRatePayload<ExtArgs>, T, "update", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Delete zero or more ExchangeRates.
     * @param {ExchangeRateDeleteManyArgs} args - Arguments to filter ExchangeRates to delete.
     * @example
     * // Delete a few ExchangeRates
     * const { count } = await prisma.exchangeRate.deleteMany({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     * 
     */
    deleteMany<T extends ExchangeRateDeleteManyArgs>(args?: SelectSubset<T, ExchangeRateDeleteManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more ExchangeRates.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {ExchangeRateUpdateManyArgs} args - Arguments to update one or more rows.
     * @example
     * // Update many ExchangeRates
     * const exchangeRate = await prisma.exchangeRate.updateMany({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    updateMany<T extends ExchangeRateUpdateManyArgs>(args: SelectSubset<T, ExchangeRateUpdateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more ExchangeRates and returns the data updated in the database.
     * @param {ExchangeRateUpdateManyAndReturnArgs} args - Arguments to update many ExchangeRates.
     * @example
     * // Update many ExchangeRates
     * const exchangeRate = await prisma.exchangeRate.updateManyAndReturn({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Update zero or more ExchangeRates and only return the `id`
     * const exchangeRateWithIdOnly = await prisma.exchangeRate.updateManyAndReturn({
     *   select: { id: true },
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    updateManyAndReturn<T extends ExchangeRateUpdateManyAndReturnArgs>(args: SelectSubset<T, ExchangeRateUpdateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$ExchangeRatePayload<ExtArgs>, T, "updateManyAndReturn", GlobalOmitOptions>>

    /**
     * Create or update one ExchangeRate.
     * @param {ExchangeRateUpsertArgs} args - Arguments to update or create a ExchangeRate.
     * @example
     * // Update or create a ExchangeRate
     * const exchangeRate = await prisma.exchangeRate.upsert({
     *   create: {
     *     // ... data to create a ExchangeRate
     *   },
     *   update: {
     *     // ... in case it already exists, update
     *   },
     *   where: {
     *     // ... the filter for the ExchangeRate we want to update
     *   }
     * })
     */
    upsert<T extends ExchangeRateUpsertArgs>(args: SelectSubset<T, ExchangeRateUpsertArgs<ExtArgs>>): Prisma__ExchangeRateClient<$Result.GetResult<Prisma.$ExchangeRatePayload<ExtArgs>, T, "upsert", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>


    /**
     * Count the number of ExchangeRates.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {ExchangeRateCountArgs} args - Arguments to filter ExchangeRates to count.
     * @example
     * // Count the number of ExchangeRates
     * const count = await prisma.exchangeRate.count({
     *   where: {
     *     // ... the filter for the ExchangeRates we want to count
     *   }
     * })
    **/
    count<T extends ExchangeRateCountArgs>(
      args?: Subset<T, ExchangeRateCountArgs>,
    ): Prisma.PrismaPromise<
      T extends $Utils.Record<'select', any>
        ? T['select'] extends true
          ? number
          : GetScalarType<T['select'], ExchangeRateCountAggregateOutputType>
        : number
    >

    /**
     * Allows you to perform aggregations operations on a ExchangeRate.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {ExchangeRateAggregateArgs} args - Select which aggregations you would like to apply and on what fields.
     * @example
     * // Ordered by age ascending
     * // Where email contains prisma.io
     * // Limited to the 10 users
     * const aggregations = await prisma.user.aggregate({
     *   _avg: {
     *     age: true,
     *   },
     *   where: {
     *     email: {
     *       contains: "prisma.io",
     *     },
     *   },
     *   orderBy: {
     *     age: "asc",
     *   },
     *   take: 10,
     * })
    **/
    aggregate<T extends ExchangeRateAggregateArgs>(args: Subset<T, ExchangeRateAggregateArgs>): Prisma.PrismaPromise<GetExchangeRateAggregateType<T>>

    /**
     * Group by ExchangeRate.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {ExchangeRateGroupByArgs} args - Group by arguments.
     * @example
     * // Group by city, order by createdAt, get count
     * const result = await prisma.user.groupBy({
     *   by: ['city', 'createdAt'],
     *   orderBy: {
     *     createdAt: true
     *   },
     *   _count: {
     *     _all: true
     *   },
     * })
     * 
    **/
    groupBy<
      T extends ExchangeRateGroupByArgs,
      HasSelectOrTake extends Or<
        Extends<'skip', Keys<T>>,
        Extends<'take', Keys<T>>
      >,
      OrderByArg extends True extends HasSelectOrTake
        ? { orderBy: ExchangeRateGroupByArgs['orderBy'] }
        : { orderBy?: ExchangeRateGroupByArgs['orderBy'] },
      OrderFields extends ExcludeUnderscoreKeys<Keys<MaybeTupleToUnion<T['orderBy']>>>,
      ByFields extends MaybeTupleToUnion<T['by']>,
      ByValid extends Has<ByFields, OrderFields>,
      HavingFields extends GetHavingFields<T['having']>,
      HavingValid extends Has<ByFields, HavingFields>,
      ByEmpty extends T['by'] extends never[] ? True : False,
      InputErrors extends ByEmpty extends True
      ? `Error: "by" must not be empty.`
      : HavingValid extends False
      ? {
          [P in HavingFields]: P extends ByFields
            ? never
            : P extends string
            ? `Error: Field "${P}" used in "having" needs to be provided in "by".`
            : [
                Error,
                'Field ',
                P,
                ` in "having" needs to be provided in "by"`,
              ]
        }[HavingFields]
      : 'take' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "take", you also need to provide "orderBy"'
      : 'skip' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "skip", you also need to provide "orderBy"'
      : ByValid extends True
      ? {}
      : {
          [P in OrderFields]: P extends ByFields
            ? never
            : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
        }[OrderFields]
    >(args: SubsetIntersection<T, ExchangeRateGroupByArgs, OrderByArg> & InputErrors): {} extends InputErrors ? GetExchangeRateGroupByPayload<T> : Prisma.PrismaPromise<InputErrors>
  /**
   * Fields of the ExchangeRate model
   */
  readonly fields: ExchangeRateFieldRefs;
  }

  /**
   * The delegate class that acts as a "Promise-like" for ExchangeRate.
   * Why is this prefixed with `Prisma__`?
   * Because we want to prevent naming conflicts as mentioned in
   * https://github.com/prisma/prisma-client-js/issues/707
   */
  export interface Prisma__ExchangeRateClient<T, Null = never, ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> extends Prisma.PrismaPromise<T> {
    readonly [Symbol.toStringTag]: "PrismaPromise"
    /**
     * Attaches callbacks for the resolution and/or rejection of the Promise.
     * @param onfulfilled The callback to execute when the Promise is resolved.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of which ever callback is executed.
     */
    then<TResult1 = T, TResult2 = never>(onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | undefined | null, onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null): $Utils.JsPromise<TResult1 | TResult2>
    /**
     * Attaches a callback for only the rejection of the Promise.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of the callback.
     */
    catch<TResult = never>(onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | undefined | null): $Utils.JsPromise<T | TResult>
    /**
     * Attaches a callback that is invoked when the Promise is settled (fulfilled or rejected). The
     * resolved value cannot be modified from the callback.
     * @param onfinally The callback to execute when the Promise is settled (fulfilled or rejected).
     * @returns A Promise for the completion of the callback.
     */
    finally(onfinally?: (() => void) | undefined | null): $Utils.JsPromise<T>
  }




  /**
   * Fields of the ExchangeRate model
   */
  interface ExchangeRateFieldRefs {
    readonly id: FieldRef<"ExchangeRate", 'String'>
    readonly from: FieldRef<"ExchangeRate", 'String'>
    readonly to: FieldRef<"ExchangeRate", 'String'>
    readonly rate: FieldRef<"ExchangeRate", 'Float'>
    readonly createdAt: FieldRef<"ExchangeRate", 'DateTime'>
  }
    

  // Custom InputTypes
  /**
   * ExchangeRate findUnique
   */
  export type ExchangeRateFindUniqueArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ExchangeRate
     */
    select?: ExchangeRateSelect<ExtArgs> | null
    /**
     * Omit specific fields from the ExchangeRate
     */
    omit?: ExchangeRateOmit<ExtArgs> | null
    /**
     * Filter, which ExchangeRate to fetch.
     */
    where: ExchangeRateWhereUniqueInput
  }

  /**
   * ExchangeRate findUniqueOrThrow
   */
  export type ExchangeRateFindUniqueOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ExchangeRate
     */
    select?: ExchangeRateSelect<ExtArgs> | null
    /**
     * Omit specific fields from the ExchangeRate
     */
    omit?: ExchangeRateOmit<ExtArgs> | null
    /**
     * Filter, which ExchangeRate to fetch.
     */
    where: ExchangeRateWhereUniqueInput
  }

  /**
   * ExchangeRate findFirst
   */
  export type ExchangeRateFindFirstArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ExchangeRate
     */
    select?: ExchangeRateSelect<ExtArgs> | null
    /**
     * Omit specific fields from the ExchangeRate
     */
    omit?: ExchangeRateOmit<ExtArgs> | null
    /**
     * Filter, which ExchangeRate to fetch.
     */
    where?: ExchangeRateWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of ExchangeRates to fetch.
     */
    orderBy?: ExchangeRateOrderByWithRelationInput | ExchangeRateOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for ExchangeRates.
     */
    cursor?: ExchangeRateWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` ExchangeRates from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` ExchangeRates.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of ExchangeRates.
     */
    distinct?: ExchangeRateScalarFieldEnum | ExchangeRateScalarFieldEnum[]
  }

  /**
   * ExchangeRate findFirstOrThrow
   */
  export type ExchangeRateFindFirstOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ExchangeRate
     */
    select?: ExchangeRateSelect<ExtArgs> | null
    /**
     * Omit specific fields from the ExchangeRate
     */
    omit?: ExchangeRateOmit<ExtArgs> | null
    /**
     * Filter, which ExchangeRate to fetch.
     */
    where?: ExchangeRateWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of ExchangeRates to fetch.
     */
    orderBy?: ExchangeRateOrderByWithRelationInput | ExchangeRateOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for ExchangeRates.
     */
    cursor?: ExchangeRateWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` ExchangeRates from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` ExchangeRates.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of ExchangeRates.
     */
    distinct?: ExchangeRateScalarFieldEnum | ExchangeRateScalarFieldEnum[]
  }

  /**
   * ExchangeRate findMany
   */
  export type ExchangeRateFindManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ExchangeRate
     */
    select?: ExchangeRateSelect<ExtArgs> | null
    /**
     * Omit specific fields from the ExchangeRate
     */
    omit?: ExchangeRateOmit<ExtArgs> | null
    /**
     * Filter, which ExchangeRates to fetch.
     */
    where?: ExchangeRateWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of ExchangeRates to fetch.
     */
    orderBy?: ExchangeRateOrderByWithRelationInput | ExchangeRateOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for listing ExchangeRates.
     */
    cursor?: ExchangeRateWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` ExchangeRates from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` ExchangeRates.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of ExchangeRates.
     */
    distinct?: ExchangeRateScalarFieldEnum | ExchangeRateScalarFieldEnum[]
  }

  /**
   * ExchangeRate create
   */
  export type ExchangeRateCreateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ExchangeRate
     */
    select?: ExchangeRateSelect<ExtArgs> | null
    /**
     * Omit specific fields from the ExchangeRate
     */
    omit?: ExchangeRateOmit<ExtArgs> | null
    /**
     * The data needed to create a ExchangeRate.
     */
    data: XOR<ExchangeRateCreateInput, ExchangeRateUncheckedCreateInput>
  }

  /**
   * ExchangeRate createMany
   */
  export type ExchangeRateCreateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to create many ExchangeRates.
     */
    data: ExchangeRateCreateManyInput | ExchangeRateCreateManyInput[]
    skipDuplicates?: boolean
  }

  /**
   * ExchangeRate createManyAndReturn
   */
  export type ExchangeRateCreateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ExchangeRate
     */
    select?: ExchangeRateSelectCreateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the ExchangeRate
     */
    omit?: ExchangeRateOmit<ExtArgs> | null
    /**
     * The data used to create many ExchangeRates.
     */
    data: ExchangeRateCreateManyInput | ExchangeRateCreateManyInput[]
    skipDuplicates?: boolean
  }

  /**
   * ExchangeRate update
   */
  export type ExchangeRateUpdateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ExchangeRate
     */
    select?: ExchangeRateSelect<ExtArgs> | null
    /**
     * Omit specific fields from the ExchangeRate
     */
    omit?: ExchangeRateOmit<ExtArgs> | null
    /**
     * The data needed to update a ExchangeRate.
     */
    data: XOR<ExchangeRateUpdateInput, ExchangeRateUncheckedUpdateInput>
    /**
     * Choose, which ExchangeRate to update.
     */
    where: ExchangeRateWhereUniqueInput
  }

  /**
   * ExchangeRate updateMany
   */
  export type ExchangeRateUpdateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to update ExchangeRates.
     */
    data: XOR<ExchangeRateUpdateManyMutationInput, ExchangeRateUncheckedUpdateManyInput>
    /**
     * Filter which ExchangeRates to update
     */
    where?: ExchangeRateWhereInput
    /**
     * Limit how many ExchangeRates to update.
     */
    limit?: number
  }

  /**
   * ExchangeRate updateManyAndReturn
   */
  export type ExchangeRateUpdateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ExchangeRate
     */
    select?: ExchangeRateSelectUpdateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the ExchangeRate
     */
    omit?: ExchangeRateOmit<ExtArgs> | null
    /**
     * The data used to update ExchangeRates.
     */
    data: XOR<ExchangeRateUpdateManyMutationInput, ExchangeRateUncheckedUpdateManyInput>
    /**
     * Filter which ExchangeRates to update
     */
    where?: ExchangeRateWhereInput
    /**
     * Limit how many ExchangeRates to update.
     */
    limit?: number
  }

  /**
   * ExchangeRate upsert
   */
  export type ExchangeRateUpsertArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ExchangeRate
     */
    select?: ExchangeRateSelect<ExtArgs> | null
    /**
     * Omit specific fields from the ExchangeRate
     */
    omit?: ExchangeRateOmit<ExtArgs> | null
    /**
     * The filter to search for the ExchangeRate to update in case it exists.
     */
    where: ExchangeRateWhereUniqueInput
    /**
     * In case the ExchangeRate found by the `where` argument doesn't exist, create a new ExchangeRate with this data.
     */
    create: XOR<ExchangeRateCreateInput, ExchangeRateUncheckedCreateInput>
    /**
     * In case the ExchangeRate was found with the provided `where` argument, update it with this data.
     */
    update: XOR<ExchangeRateUpdateInput, ExchangeRateUncheckedUpdateInput>
  }

  /**
   * ExchangeRate delete
   */
  export type ExchangeRateDeleteArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ExchangeRate
     */
    select?: ExchangeRateSelect<ExtArgs> | null
    /**
     * Omit specific fields from the ExchangeRate
     */
    omit?: ExchangeRateOmit<ExtArgs> | null
    /**
     * Filter which ExchangeRate to delete.
     */
    where: ExchangeRateWhereUniqueInput
  }

  /**
   * ExchangeRate deleteMany
   */
  export type ExchangeRateDeleteManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which ExchangeRates to delete
     */
    where?: ExchangeRateWhereInput
    /**
     * Limit how many ExchangeRates to delete.
     */
    limit?: number
  }

  /**
   * ExchangeRate without action
   */
  export type ExchangeRateDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ExchangeRate
     */
    select?: ExchangeRateSelect<ExtArgs> | null
    /**
     * Omit specific fields from the ExchangeRate
     */
    omit?: ExchangeRateOmit<ExtArgs> | null
  }


  /**
   * Enums
   */

  export const TransactionIsolationLevel: {
    ReadUncommitted: 'ReadUncommitted',
    ReadCommitted: 'ReadCommitted',
    RepeatableRead: 'RepeatableRead',
    Serializable: 'Serializable'
  };

  export type TransactionIsolationLevel = (typeof TransactionIsolationLevel)[keyof typeof TransactionIsolationLevel]


  export const UserScalarFieldEnum: {
    id: 'id',
    clerkUserId: 'clerkUserId',
    username: 'username',
    email: 'email',
    mobile: 'mobile',
    firstName: 'firstName',
    lastName: 'lastName',
    shopName: 'shopName',
    address: 'address',
    gender: 'gender',
    profileImageUrl: 'profileImageUrl',
    subscriptionStatus: 'subscriptionStatus',
    subscriptionEndDate: 'subscriptionEndDate',
    razorpaySubscriptionId: 'razorpaySubscriptionId',
    subscriptionPlan: 'subscriptionPlan',
    razorpayPaymentId: 'razorpayPaymentId',
    subscriptionCreatedAt: 'subscriptionCreatedAt',
    hadTrial: 'hadTrial',
    isActive: 'isActive',
    lastLoginAt: 'lastLoginAt',
    deletedAt: 'deletedAt',
    createdAt: 'createdAt',
    updatedAt: 'updatedAt'
  };

  export type UserScalarFieldEnum = (typeof UserScalarFieldEnum)[keyof typeof UserScalarFieldEnum]


  export const CustomerScalarFieldEnum: {
    id: 'id',
    userId: 'userId',
    name: 'name',
    region: 'region',
    address: 'address',
    mobile: 'mobile',
    viewToken: 'viewToken',
    idProofImg: 'idProofImg',
    customerImg: 'customerImg',
    aadharNo: 'aadharNo',
    remark: 'remark',
    deletedAt: 'deletedAt',
    createdAt: 'createdAt',
    updatedAt: 'updatedAt',
    gender: 'gender'
  };

  export type CustomerScalarFieldEnum = (typeof CustomerScalarFieldEnum)[keyof typeof CustomerScalarFieldEnum]


  export const PledgeScalarFieldEnum: {
    id: 'id',
    customerId: 'customerId',
    pledgeDate: 'pledgeDate',
    loanAmount: 'loanAmount',
    interestRate: 'interestRate',
    compoundingDuration: 'compoundingDuration',
    allowCompounding: 'allowCompounding',
    itemPhoto: 'itemPhoto',
    remark: 'remark',
    durationMonths: 'durationMonths',
    status: 'status',
    releaseDate: 'releaseDate',
    netWeightOfGold: 'netWeightOfGold',
    netWeightOfSilver: 'netWeightOfSilver',
    totalInterest: 'totalInterest',
    receivableAmount: 'receivableAmount',
    calculationVersion: 'calculationVersion',
    createdAt: 'createdAt',
    updatedAt: 'updatedAt'
  };

  export type PledgeScalarFieldEnum = (typeof PledgeScalarFieldEnum)[keyof typeof PledgeScalarFieldEnum]


  export const PledgeItemScalarFieldEnum: {
    id: 'id',
    pledgeId: 'pledgeId',
    itemType: 'itemType',
    metalType: 'metalType',
    itemName: 'itemName',
    quantity: 'quantity',
    grossWeight: 'grossWeight',
    netWeight: 'netWeight',
    purity: 'purity',
    netWeightOfMetal: 'netWeightOfMetal'
  };

  export type PledgeItemScalarFieldEnum = (typeof PledgeItemScalarFieldEnum)[keyof typeof PledgeItemScalarFieldEnum]


  export const PledgeAuditScalarFieldEnum: {
    id: 'id',
    pledgeId: 'pledgeId',
    action: 'action',
    principal: 'principal',
    interestRate: 'interestRate',
    allowCompounding: 'allowCompounding',
    compoundingDuration: 'compoundingDuration',
    calculationVersion: 'calculationVersion',
    durationMonths: 'durationMonths',
    netWeightOfGold: 'netWeightOfGold',
    netWeightOfSilver: 'netWeightOfSilver',
    goldPricePerGram: 'goldPricePerGram',
    silverPricePerGram: 'silverPricePerGram',
    marketValueAtRelease: 'marketValueAtRelease',
    ltvAtRelease: 'ltvAtRelease',
    totalInterest: 'totalInterest',
    receivableAmount: 'receivableAmount',
    releaseDate: 'releaseDate',
    createdAt: 'createdAt'
  };

  export type PledgeAuditScalarFieldEnum = (typeof PledgeAuditScalarFieldEnum)[keyof typeof PledgeAuditScalarFieldEnum]


  export const MetalPriceScalarFieldEnum: {
    id: 'id',
    metal: 'metal',
    usdPerOunce: 'usdPerOunce',
    inrPerGram: 'inrPerGram',
    createdAt: 'createdAt',
    updatedAt: 'updatedAt'
  };

  export type MetalPriceScalarFieldEnum = (typeof MetalPriceScalarFieldEnum)[keyof typeof MetalPriceScalarFieldEnum]


  export const TransactionScalarFieldEnum: {
    id: 'id',
    pledgeId: 'pledgeId',
    amount: 'amount',
    type: 'type',
    note: 'note',
    createdAt: 'createdAt'
  };

  export type TransactionScalarFieldEnum = (typeof TransactionScalarFieldEnum)[keyof typeof TransactionScalarFieldEnum]


  export const ExchangeRateScalarFieldEnum: {
    id: 'id',
    from: 'from',
    to: 'to',
    rate: 'rate',
    createdAt: 'createdAt'
  };

  export type ExchangeRateScalarFieldEnum = (typeof ExchangeRateScalarFieldEnum)[keyof typeof ExchangeRateScalarFieldEnum]


  export const SortOrder: {
    asc: 'asc',
    desc: 'desc'
  };

  export type SortOrder = (typeof SortOrder)[keyof typeof SortOrder]


  export const QueryMode: {
    default: 'default',
    insensitive: 'insensitive'
  };

  export type QueryMode = (typeof QueryMode)[keyof typeof QueryMode]


  export const NullsOrder: {
    first: 'first',
    last: 'last'
  };

  export type NullsOrder = (typeof NullsOrder)[keyof typeof NullsOrder]


  /**
   * Field references
   */


  /**
   * Reference to a field of type 'String'
   */
  export type StringFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'String'>
    


  /**
   * Reference to a field of type 'String[]'
   */
  export type ListStringFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'String[]'>
    


  /**
   * Reference to a field of type 'Gender'
   */
  export type EnumGenderFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'Gender'>
    


  /**
   * Reference to a field of type 'Gender[]'
   */
  export type ListEnumGenderFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'Gender[]'>
    


  /**
   * Reference to a field of type 'SubscriptionStatus'
   */
  export type EnumSubscriptionStatusFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'SubscriptionStatus'>
    


  /**
   * Reference to a field of type 'SubscriptionStatus[]'
   */
  export type ListEnumSubscriptionStatusFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'SubscriptionStatus[]'>
    


  /**
   * Reference to a field of type 'DateTime'
   */
  export type DateTimeFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'DateTime'>
    


  /**
   * Reference to a field of type 'DateTime[]'
   */
  export type ListDateTimeFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'DateTime[]'>
    


  /**
   * Reference to a field of type 'SubscriptionPlan'
   */
  export type EnumSubscriptionPlanFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'SubscriptionPlan'>
    


  /**
   * Reference to a field of type 'SubscriptionPlan[]'
   */
  export type ListEnumSubscriptionPlanFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'SubscriptionPlan[]'>
    


  /**
   * Reference to a field of type 'Boolean'
   */
  export type BooleanFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'Boolean'>
    


  /**
   * Reference to a field of type 'Decimal'
   */
  export type DecimalFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'Decimal'>
    


  /**
   * Reference to a field of type 'Decimal[]'
   */
  export type ListDecimalFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'Decimal[]'>
    


  /**
   * Reference to a field of type 'CompoundingDuration'
   */
  export type EnumCompoundingDurationFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'CompoundingDuration'>
    


  /**
   * Reference to a field of type 'CompoundingDuration[]'
   */
  export type ListEnumCompoundingDurationFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'CompoundingDuration[]'>
    


  /**
   * Reference to a field of type 'PledgeStatus'
   */
  export type EnumPledgeStatusFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'PledgeStatus'>
    


  /**
   * Reference to a field of type 'PledgeStatus[]'
   */
  export type ListEnumPledgeStatusFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'PledgeStatus[]'>
    


  /**
   * Reference to a field of type 'Int'
   */
  export type IntFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'Int'>
    


  /**
   * Reference to a field of type 'Int[]'
   */
  export type ListIntFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'Int[]'>
    


  /**
   * Reference to a field of type 'ItemType'
   */
  export type EnumItemTypeFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'ItemType'>
    


  /**
   * Reference to a field of type 'ItemType[]'
   */
  export type ListEnumItemTypeFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'ItemType[]'>
    


  /**
   * Reference to a field of type 'MetalType'
   */
  export type EnumMetalTypeFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'MetalType'>
    


  /**
   * Reference to a field of type 'MetalType[]'
   */
  export type ListEnumMetalTypeFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'MetalType[]'>
    


  /**
   * Reference to a field of type 'AuditAction'
   */
  export type EnumAuditActionFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'AuditAction'>
    


  /**
   * Reference to a field of type 'AuditAction[]'
   */
  export type ListEnumAuditActionFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'AuditAction[]'>
    


  /**
   * Reference to a field of type 'TransactionType'
   */
  export type EnumTransactionTypeFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'TransactionType'>
    


  /**
   * Reference to a field of type 'TransactionType[]'
   */
  export type ListEnumTransactionTypeFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'TransactionType[]'>
    


  /**
   * Reference to a field of type 'Float'
   */
  export type FloatFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'Float'>
    


  /**
   * Reference to a field of type 'Float[]'
   */
  export type ListFloatFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'Float[]'>
    
  /**
   * Deep Input Types
   */


  export type UserWhereInput = {
    AND?: UserWhereInput | UserWhereInput[]
    OR?: UserWhereInput[]
    NOT?: UserWhereInput | UserWhereInput[]
    id?: StringFilter<"User"> | string
    clerkUserId?: StringFilter<"User"> | string
    username?: StringFilter<"User"> | string
    email?: StringNullableFilter<"User"> | string | null
    mobile?: StringNullableFilter<"User"> | string | null
    firstName?: StringNullableFilter<"User"> | string | null
    lastName?: StringNullableFilter<"User"> | string | null
    shopName?: StringNullableFilter<"User"> | string | null
    address?: StringNullableFilter<"User"> | string | null
    gender?: EnumGenderNullableFilter<"User"> | $Enums.Gender | null
    profileImageUrl?: StringNullableFilter<"User"> | string | null
    subscriptionStatus?: EnumSubscriptionStatusFilter<"User"> | $Enums.SubscriptionStatus
    subscriptionEndDate?: DateTimeNullableFilter<"User"> | Date | string | null
    razorpaySubscriptionId?: StringNullableFilter<"User"> | string | null
    subscriptionPlan?: EnumSubscriptionPlanNullableFilter<"User"> | $Enums.SubscriptionPlan | null
    razorpayPaymentId?: StringNullableFilter<"User"> | string | null
    subscriptionCreatedAt?: DateTimeNullableFilter<"User"> | Date | string | null
    hadTrial?: BoolFilter<"User"> | boolean
    isActive?: BoolFilter<"User"> | boolean
    lastLoginAt?: DateTimeNullableFilter<"User"> | Date | string | null
    deletedAt?: DateTimeNullableFilter<"User"> | Date | string | null
    createdAt?: DateTimeFilter<"User"> | Date | string
    updatedAt?: DateTimeFilter<"User"> | Date | string
    customers?: CustomerListRelationFilter
  }

  export type UserOrderByWithRelationInput = {
    id?: SortOrder
    clerkUserId?: SortOrder
    username?: SortOrder
    email?: SortOrderInput | SortOrder
    mobile?: SortOrderInput | SortOrder
    firstName?: SortOrderInput | SortOrder
    lastName?: SortOrderInput | SortOrder
    shopName?: SortOrderInput | SortOrder
    address?: SortOrderInput | SortOrder
    gender?: SortOrderInput | SortOrder
    profileImageUrl?: SortOrderInput | SortOrder
    subscriptionStatus?: SortOrder
    subscriptionEndDate?: SortOrderInput | SortOrder
    razorpaySubscriptionId?: SortOrderInput | SortOrder
    subscriptionPlan?: SortOrderInput | SortOrder
    razorpayPaymentId?: SortOrderInput | SortOrder
    subscriptionCreatedAt?: SortOrderInput | SortOrder
    hadTrial?: SortOrder
    isActive?: SortOrder
    lastLoginAt?: SortOrderInput | SortOrder
    deletedAt?: SortOrderInput | SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
    customers?: CustomerOrderByRelationAggregateInput
  }

  export type UserWhereUniqueInput = Prisma.AtLeast<{
    id?: string
    clerkUserId?: string
    username?: string
    email?: string
    mobile?: string
    razorpaySubscriptionId?: string
    AND?: UserWhereInput | UserWhereInput[]
    OR?: UserWhereInput[]
    NOT?: UserWhereInput | UserWhereInput[]
    firstName?: StringNullableFilter<"User"> | string | null
    lastName?: StringNullableFilter<"User"> | string | null
    shopName?: StringNullableFilter<"User"> | string | null
    address?: StringNullableFilter<"User"> | string | null
    gender?: EnumGenderNullableFilter<"User"> | $Enums.Gender | null
    profileImageUrl?: StringNullableFilter<"User"> | string | null
    subscriptionStatus?: EnumSubscriptionStatusFilter<"User"> | $Enums.SubscriptionStatus
    subscriptionEndDate?: DateTimeNullableFilter<"User"> | Date | string | null
    subscriptionPlan?: EnumSubscriptionPlanNullableFilter<"User"> | $Enums.SubscriptionPlan | null
    razorpayPaymentId?: StringNullableFilter<"User"> | string | null
    subscriptionCreatedAt?: DateTimeNullableFilter<"User"> | Date | string | null
    hadTrial?: BoolFilter<"User"> | boolean
    isActive?: BoolFilter<"User"> | boolean
    lastLoginAt?: DateTimeNullableFilter<"User"> | Date | string | null
    deletedAt?: DateTimeNullableFilter<"User"> | Date | string | null
    createdAt?: DateTimeFilter<"User"> | Date | string
    updatedAt?: DateTimeFilter<"User"> | Date | string
    customers?: CustomerListRelationFilter
  }, "id" | "clerkUserId" | "username" | "email" | "mobile" | "razorpaySubscriptionId">

  export type UserOrderByWithAggregationInput = {
    id?: SortOrder
    clerkUserId?: SortOrder
    username?: SortOrder
    email?: SortOrderInput | SortOrder
    mobile?: SortOrderInput | SortOrder
    firstName?: SortOrderInput | SortOrder
    lastName?: SortOrderInput | SortOrder
    shopName?: SortOrderInput | SortOrder
    address?: SortOrderInput | SortOrder
    gender?: SortOrderInput | SortOrder
    profileImageUrl?: SortOrderInput | SortOrder
    subscriptionStatus?: SortOrder
    subscriptionEndDate?: SortOrderInput | SortOrder
    razorpaySubscriptionId?: SortOrderInput | SortOrder
    subscriptionPlan?: SortOrderInput | SortOrder
    razorpayPaymentId?: SortOrderInput | SortOrder
    subscriptionCreatedAt?: SortOrderInput | SortOrder
    hadTrial?: SortOrder
    isActive?: SortOrder
    lastLoginAt?: SortOrderInput | SortOrder
    deletedAt?: SortOrderInput | SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
    _count?: UserCountOrderByAggregateInput
    _max?: UserMaxOrderByAggregateInput
    _min?: UserMinOrderByAggregateInput
  }

  export type UserScalarWhereWithAggregatesInput = {
    AND?: UserScalarWhereWithAggregatesInput | UserScalarWhereWithAggregatesInput[]
    OR?: UserScalarWhereWithAggregatesInput[]
    NOT?: UserScalarWhereWithAggregatesInput | UserScalarWhereWithAggregatesInput[]
    id?: StringWithAggregatesFilter<"User"> | string
    clerkUserId?: StringWithAggregatesFilter<"User"> | string
    username?: StringWithAggregatesFilter<"User"> | string
    email?: StringNullableWithAggregatesFilter<"User"> | string | null
    mobile?: StringNullableWithAggregatesFilter<"User"> | string | null
    firstName?: StringNullableWithAggregatesFilter<"User"> | string | null
    lastName?: StringNullableWithAggregatesFilter<"User"> | string | null
    shopName?: StringNullableWithAggregatesFilter<"User"> | string | null
    address?: StringNullableWithAggregatesFilter<"User"> | string | null
    gender?: EnumGenderNullableWithAggregatesFilter<"User"> | $Enums.Gender | null
    profileImageUrl?: StringNullableWithAggregatesFilter<"User"> | string | null
    subscriptionStatus?: EnumSubscriptionStatusWithAggregatesFilter<"User"> | $Enums.SubscriptionStatus
    subscriptionEndDate?: DateTimeNullableWithAggregatesFilter<"User"> | Date | string | null
    razorpaySubscriptionId?: StringNullableWithAggregatesFilter<"User"> | string | null
    subscriptionPlan?: EnumSubscriptionPlanNullableWithAggregatesFilter<"User"> | $Enums.SubscriptionPlan | null
    razorpayPaymentId?: StringNullableWithAggregatesFilter<"User"> | string | null
    subscriptionCreatedAt?: DateTimeNullableWithAggregatesFilter<"User"> | Date | string | null
    hadTrial?: BoolWithAggregatesFilter<"User"> | boolean
    isActive?: BoolWithAggregatesFilter<"User"> | boolean
    lastLoginAt?: DateTimeNullableWithAggregatesFilter<"User"> | Date | string | null
    deletedAt?: DateTimeNullableWithAggregatesFilter<"User"> | Date | string | null
    createdAt?: DateTimeWithAggregatesFilter<"User"> | Date | string
    updatedAt?: DateTimeWithAggregatesFilter<"User"> | Date | string
  }

  export type CustomerWhereInput = {
    AND?: CustomerWhereInput | CustomerWhereInput[]
    OR?: CustomerWhereInput[]
    NOT?: CustomerWhereInput | CustomerWhereInput[]
    id?: StringFilter<"Customer"> | string
    userId?: StringFilter<"Customer"> | string
    name?: StringFilter<"Customer"> | string
    region?: StringFilter<"Customer"> | string
    address?: StringFilter<"Customer"> | string
    mobile?: StringNullableFilter<"Customer"> | string | null
    viewToken?: StringFilter<"Customer"> | string
    idProofImg?: StringNullableFilter<"Customer"> | string | null
    customerImg?: StringNullableFilter<"Customer"> | string | null
    aadharNo?: StringNullableFilter<"Customer"> | string | null
    remark?: StringNullableFilter<"Customer"> | string | null
    deletedAt?: DateTimeNullableFilter<"Customer"> | Date | string | null
    createdAt?: DateTimeFilter<"Customer"> | Date | string
    updatedAt?: DateTimeFilter<"Customer"> | Date | string
    gender?: EnumGenderNullableFilter<"Customer"> | $Enums.Gender | null
    pledges?: PledgeListRelationFilter
    user?: XOR<UserScalarRelationFilter, UserWhereInput>
  }

  export type CustomerOrderByWithRelationInput = {
    id?: SortOrder
    userId?: SortOrder
    name?: SortOrder
    region?: SortOrder
    address?: SortOrder
    mobile?: SortOrderInput | SortOrder
    viewToken?: SortOrder
    idProofImg?: SortOrderInput | SortOrder
    customerImg?: SortOrderInput | SortOrder
    aadharNo?: SortOrderInput | SortOrder
    remark?: SortOrderInput | SortOrder
    deletedAt?: SortOrderInput | SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
    gender?: SortOrderInput | SortOrder
    pledges?: PledgeOrderByRelationAggregateInput
    user?: UserOrderByWithRelationInput
  }

  export type CustomerWhereUniqueInput = Prisma.AtLeast<{
    id?: string
    viewToken?: string
    AND?: CustomerWhereInput | CustomerWhereInput[]
    OR?: CustomerWhereInput[]
    NOT?: CustomerWhereInput | CustomerWhereInput[]
    userId?: StringFilter<"Customer"> | string
    name?: StringFilter<"Customer"> | string
    region?: StringFilter<"Customer"> | string
    address?: StringFilter<"Customer"> | string
    mobile?: StringNullableFilter<"Customer"> | string | null
    idProofImg?: StringNullableFilter<"Customer"> | string | null
    customerImg?: StringNullableFilter<"Customer"> | string | null
    aadharNo?: StringNullableFilter<"Customer"> | string | null
    remark?: StringNullableFilter<"Customer"> | string | null
    deletedAt?: DateTimeNullableFilter<"Customer"> | Date | string | null
    createdAt?: DateTimeFilter<"Customer"> | Date | string
    updatedAt?: DateTimeFilter<"Customer"> | Date | string
    gender?: EnumGenderNullableFilter<"Customer"> | $Enums.Gender | null
    pledges?: PledgeListRelationFilter
    user?: XOR<UserScalarRelationFilter, UserWhereInput>
  }, "id" | "viewToken">

  export type CustomerOrderByWithAggregationInput = {
    id?: SortOrder
    userId?: SortOrder
    name?: SortOrder
    region?: SortOrder
    address?: SortOrder
    mobile?: SortOrderInput | SortOrder
    viewToken?: SortOrder
    idProofImg?: SortOrderInput | SortOrder
    customerImg?: SortOrderInput | SortOrder
    aadharNo?: SortOrderInput | SortOrder
    remark?: SortOrderInput | SortOrder
    deletedAt?: SortOrderInput | SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
    gender?: SortOrderInput | SortOrder
    _count?: CustomerCountOrderByAggregateInput
    _max?: CustomerMaxOrderByAggregateInput
    _min?: CustomerMinOrderByAggregateInput
  }

  export type CustomerScalarWhereWithAggregatesInput = {
    AND?: CustomerScalarWhereWithAggregatesInput | CustomerScalarWhereWithAggregatesInput[]
    OR?: CustomerScalarWhereWithAggregatesInput[]
    NOT?: CustomerScalarWhereWithAggregatesInput | CustomerScalarWhereWithAggregatesInput[]
    id?: StringWithAggregatesFilter<"Customer"> | string
    userId?: StringWithAggregatesFilter<"Customer"> | string
    name?: StringWithAggregatesFilter<"Customer"> | string
    region?: StringWithAggregatesFilter<"Customer"> | string
    address?: StringWithAggregatesFilter<"Customer"> | string
    mobile?: StringNullableWithAggregatesFilter<"Customer"> | string | null
    viewToken?: StringWithAggregatesFilter<"Customer"> | string
    idProofImg?: StringNullableWithAggregatesFilter<"Customer"> | string | null
    customerImg?: StringNullableWithAggregatesFilter<"Customer"> | string | null
    aadharNo?: StringNullableWithAggregatesFilter<"Customer"> | string | null
    remark?: StringNullableWithAggregatesFilter<"Customer"> | string | null
    deletedAt?: DateTimeNullableWithAggregatesFilter<"Customer"> | Date | string | null
    createdAt?: DateTimeWithAggregatesFilter<"Customer"> | Date | string
    updatedAt?: DateTimeWithAggregatesFilter<"Customer"> | Date | string
    gender?: EnumGenderNullableWithAggregatesFilter<"Customer"> | $Enums.Gender | null
  }

  export type PledgeWhereInput = {
    AND?: PledgeWhereInput | PledgeWhereInput[]
    OR?: PledgeWhereInput[]
    NOT?: PledgeWhereInput | PledgeWhereInput[]
    id?: StringFilter<"Pledge"> | string
    customerId?: StringFilter<"Pledge"> | string
    pledgeDate?: DateTimeFilter<"Pledge"> | Date | string
    loanAmount?: DecimalFilter<"Pledge"> | Decimal | DecimalJsLike | number | string
    interestRate?: DecimalFilter<"Pledge"> | Decimal | DecimalJsLike | number | string
    compoundingDuration?: EnumCompoundingDurationFilter<"Pledge"> | $Enums.CompoundingDuration
    allowCompounding?: BoolFilter<"Pledge"> | boolean
    itemPhoto?: StringNullableFilter<"Pledge"> | string | null
    remark?: StringNullableFilter<"Pledge"> | string | null
    durationMonths?: DecimalNullableFilter<"Pledge"> | Decimal | DecimalJsLike | number | string | null
    status?: EnumPledgeStatusFilter<"Pledge"> | $Enums.PledgeStatus
    releaseDate?: DateTimeNullableFilter<"Pledge"> | Date | string | null
    netWeightOfGold?: DecimalFilter<"Pledge"> | Decimal | DecimalJsLike | number | string
    netWeightOfSilver?: DecimalFilter<"Pledge"> | Decimal | DecimalJsLike | number | string
    totalInterest?: DecimalNullableFilter<"Pledge"> | Decimal | DecimalJsLike | number | string | null
    receivableAmount?: DecimalNullableFilter<"Pledge"> | Decimal | DecimalJsLike | number | string | null
    calculationVersion?: IntFilter<"Pledge"> | number
    createdAt?: DateTimeFilter<"Pledge"> | Date | string
    updatedAt?: DateTimeFilter<"Pledge"> | Date | string
    pledgeAudits?: PledgeAuditListRelationFilter
    items?: PledgeItemListRelationFilter
    customer?: XOR<CustomerScalarRelationFilter, CustomerWhereInput>
    transactions?: TransactionListRelationFilter
  }

  export type PledgeOrderByWithRelationInput = {
    id?: SortOrder
    customerId?: SortOrder
    pledgeDate?: SortOrder
    loanAmount?: SortOrder
    interestRate?: SortOrder
    compoundingDuration?: SortOrder
    allowCompounding?: SortOrder
    itemPhoto?: SortOrderInput | SortOrder
    remark?: SortOrderInput | SortOrder
    durationMonths?: SortOrderInput | SortOrder
    status?: SortOrder
    releaseDate?: SortOrderInput | SortOrder
    netWeightOfGold?: SortOrder
    netWeightOfSilver?: SortOrder
    totalInterest?: SortOrderInput | SortOrder
    receivableAmount?: SortOrderInput | SortOrder
    calculationVersion?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
    pledgeAudits?: PledgeAuditOrderByRelationAggregateInput
    items?: PledgeItemOrderByRelationAggregateInput
    customer?: CustomerOrderByWithRelationInput
    transactions?: TransactionOrderByRelationAggregateInput
  }

  export type PledgeWhereUniqueInput = Prisma.AtLeast<{
    id?: string
    AND?: PledgeWhereInput | PledgeWhereInput[]
    OR?: PledgeWhereInput[]
    NOT?: PledgeWhereInput | PledgeWhereInput[]
    customerId?: StringFilter<"Pledge"> | string
    pledgeDate?: DateTimeFilter<"Pledge"> | Date | string
    loanAmount?: DecimalFilter<"Pledge"> | Decimal | DecimalJsLike | number | string
    interestRate?: DecimalFilter<"Pledge"> | Decimal | DecimalJsLike | number | string
    compoundingDuration?: EnumCompoundingDurationFilter<"Pledge"> | $Enums.CompoundingDuration
    allowCompounding?: BoolFilter<"Pledge"> | boolean
    itemPhoto?: StringNullableFilter<"Pledge"> | string | null
    remark?: StringNullableFilter<"Pledge"> | string | null
    durationMonths?: DecimalNullableFilter<"Pledge"> | Decimal | DecimalJsLike | number | string | null
    status?: EnumPledgeStatusFilter<"Pledge"> | $Enums.PledgeStatus
    releaseDate?: DateTimeNullableFilter<"Pledge"> | Date | string | null
    netWeightOfGold?: DecimalFilter<"Pledge"> | Decimal | DecimalJsLike | number | string
    netWeightOfSilver?: DecimalFilter<"Pledge"> | Decimal | DecimalJsLike | number | string
    totalInterest?: DecimalNullableFilter<"Pledge"> | Decimal | DecimalJsLike | number | string | null
    receivableAmount?: DecimalNullableFilter<"Pledge"> | Decimal | DecimalJsLike | number | string | null
    calculationVersion?: IntFilter<"Pledge"> | number
    createdAt?: DateTimeFilter<"Pledge"> | Date | string
    updatedAt?: DateTimeFilter<"Pledge"> | Date | string
    pledgeAudits?: PledgeAuditListRelationFilter
    items?: PledgeItemListRelationFilter
    customer?: XOR<CustomerScalarRelationFilter, CustomerWhereInput>
    transactions?: TransactionListRelationFilter
  }, "id">

  export type PledgeOrderByWithAggregationInput = {
    id?: SortOrder
    customerId?: SortOrder
    pledgeDate?: SortOrder
    loanAmount?: SortOrder
    interestRate?: SortOrder
    compoundingDuration?: SortOrder
    allowCompounding?: SortOrder
    itemPhoto?: SortOrderInput | SortOrder
    remark?: SortOrderInput | SortOrder
    durationMonths?: SortOrderInput | SortOrder
    status?: SortOrder
    releaseDate?: SortOrderInput | SortOrder
    netWeightOfGold?: SortOrder
    netWeightOfSilver?: SortOrder
    totalInterest?: SortOrderInput | SortOrder
    receivableAmount?: SortOrderInput | SortOrder
    calculationVersion?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
    _count?: PledgeCountOrderByAggregateInput
    _avg?: PledgeAvgOrderByAggregateInput
    _max?: PledgeMaxOrderByAggregateInput
    _min?: PledgeMinOrderByAggregateInput
    _sum?: PledgeSumOrderByAggregateInput
  }

  export type PledgeScalarWhereWithAggregatesInput = {
    AND?: PledgeScalarWhereWithAggregatesInput | PledgeScalarWhereWithAggregatesInput[]
    OR?: PledgeScalarWhereWithAggregatesInput[]
    NOT?: PledgeScalarWhereWithAggregatesInput | PledgeScalarWhereWithAggregatesInput[]
    id?: StringWithAggregatesFilter<"Pledge"> | string
    customerId?: StringWithAggregatesFilter<"Pledge"> | string
    pledgeDate?: DateTimeWithAggregatesFilter<"Pledge"> | Date | string
    loanAmount?: DecimalWithAggregatesFilter<"Pledge"> | Decimal | DecimalJsLike | number | string
    interestRate?: DecimalWithAggregatesFilter<"Pledge"> | Decimal | DecimalJsLike | number | string
    compoundingDuration?: EnumCompoundingDurationWithAggregatesFilter<"Pledge"> | $Enums.CompoundingDuration
    allowCompounding?: BoolWithAggregatesFilter<"Pledge"> | boolean
    itemPhoto?: StringNullableWithAggregatesFilter<"Pledge"> | string | null
    remark?: StringNullableWithAggregatesFilter<"Pledge"> | string | null
    durationMonths?: DecimalNullableWithAggregatesFilter<"Pledge"> | Decimal | DecimalJsLike | number | string | null
    status?: EnumPledgeStatusWithAggregatesFilter<"Pledge"> | $Enums.PledgeStatus
    releaseDate?: DateTimeNullableWithAggregatesFilter<"Pledge"> | Date | string | null
    netWeightOfGold?: DecimalWithAggregatesFilter<"Pledge"> | Decimal | DecimalJsLike | number | string
    netWeightOfSilver?: DecimalWithAggregatesFilter<"Pledge"> | Decimal | DecimalJsLike | number | string
    totalInterest?: DecimalNullableWithAggregatesFilter<"Pledge"> | Decimal | DecimalJsLike | number | string | null
    receivableAmount?: DecimalNullableWithAggregatesFilter<"Pledge"> | Decimal | DecimalJsLike | number | string | null
    calculationVersion?: IntWithAggregatesFilter<"Pledge"> | number
    createdAt?: DateTimeWithAggregatesFilter<"Pledge"> | Date | string
    updatedAt?: DateTimeWithAggregatesFilter<"Pledge"> | Date | string
  }

  export type PledgeItemWhereInput = {
    AND?: PledgeItemWhereInput | PledgeItemWhereInput[]
    OR?: PledgeItemWhereInput[]
    NOT?: PledgeItemWhereInput | PledgeItemWhereInput[]
    id?: StringFilter<"PledgeItem"> | string
    pledgeId?: StringFilter<"PledgeItem"> | string
    itemType?: EnumItemTypeFilter<"PledgeItem"> | $Enums.ItemType
    metalType?: EnumMetalTypeFilter<"PledgeItem"> | $Enums.MetalType
    itemName?: StringNullableFilter<"PledgeItem"> | string | null
    quantity?: IntFilter<"PledgeItem"> | number
    grossWeight?: DecimalFilter<"PledgeItem"> | Decimal | DecimalJsLike | number | string
    netWeight?: DecimalFilter<"PledgeItem"> | Decimal | DecimalJsLike | number | string
    purity?: DecimalFilter<"PledgeItem"> | Decimal | DecimalJsLike | number | string
    netWeightOfMetal?: DecimalFilter<"PledgeItem"> | Decimal | DecimalJsLike | number | string
    pledge?: XOR<PledgeScalarRelationFilter, PledgeWhereInput>
  }

  export type PledgeItemOrderByWithRelationInput = {
    id?: SortOrder
    pledgeId?: SortOrder
    itemType?: SortOrder
    metalType?: SortOrder
    itemName?: SortOrderInput | SortOrder
    quantity?: SortOrder
    grossWeight?: SortOrder
    netWeight?: SortOrder
    purity?: SortOrder
    netWeightOfMetal?: SortOrder
    pledge?: PledgeOrderByWithRelationInput
  }

  export type PledgeItemWhereUniqueInput = Prisma.AtLeast<{
    id?: string
    AND?: PledgeItemWhereInput | PledgeItemWhereInput[]
    OR?: PledgeItemWhereInput[]
    NOT?: PledgeItemWhereInput | PledgeItemWhereInput[]
    pledgeId?: StringFilter<"PledgeItem"> | string
    itemType?: EnumItemTypeFilter<"PledgeItem"> | $Enums.ItemType
    metalType?: EnumMetalTypeFilter<"PledgeItem"> | $Enums.MetalType
    itemName?: StringNullableFilter<"PledgeItem"> | string | null
    quantity?: IntFilter<"PledgeItem"> | number
    grossWeight?: DecimalFilter<"PledgeItem"> | Decimal | DecimalJsLike | number | string
    netWeight?: DecimalFilter<"PledgeItem"> | Decimal | DecimalJsLike | number | string
    purity?: DecimalFilter<"PledgeItem"> | Decimal | DecimalJsLike | number | string
    netWeightOfMetal?: DecimalFilter<"PledgeItem"> | Decimal | DecimalJsLike | number | string
    pledge?: XOR<PledgeScalarRelationFilter, PledgeWhereInput>
  }, "id">

  export type PledgeItemOrderByWithAggregationInput = {
    id?: SortOrder
    pledgeId?: SortOrder
    itemType?: SortOrder
    metalType?: SortOrder
    itemName?: SortOrderInput | SortOrder
    quantity?: SortOrder
    grossWeight?: SortOrder
    netWeight?: SortOrder
    purity?: SortOrder
    netWeightOfMetal?: SortOrder
    _count?: PledgeItemCountOrderByAggregateInput
    _avg?: PledgeItemAvgOrderByAggregateInput
    _max?: PledgeItemMaxOrderByAggregateInput
    _min?: PledgeItemMinOrderByAggregateInput
    _sum?: PledgeItemSumOrderByAggregateInput
  }

  export type PledgeItemScalarWhereWithAggregatesInput = {
    AND?: PledgeItemScalarWhereWithAggregatesInput | PledgeItemScalarWhereWithAggregatesInput[]
    OR?: PledgeItemScalarWhereWithAggregatesInput[]
    NOT?: PledgeItemScalarWhereWithAggregatesInput | PledgeItemScalarWhereWithAggregatesInput[]
    id?: StringWithAggregatesFilter<"PledgeItem"> | string
    pledgeId?: StringWithAggregatesFilter<"PledgeItem"> | string
    itemType?: EnumItemTypeWithAggregatesFilter<"PledgeItem"> | $Enums.ItemType
    metalType?: EnumMetalTypeWithAggregatesFilter<"PledgeItem"> | $Enums.MetalType
    itemName?: StringNullableWithAggregatesFilter<"PledgeItem"> | string | null
    quantity?: IntWithAggregatesFilter<"PledgeItem"> | number
    grossWeight?: DecimalWithAggregatesFilter<"PledgeItem"> | Decimal | DecimalJsLike | number | string
    netWeight?: DecimalWithAggregatesFilter<"PledgeItem"> | Decimal | DecimalJsLike | number | string
    purity?: DecimalWithAggregatesFilter<"PledgeItem"> | Decimal | DecimalJsLike | number | string
    netWeightOfMetal?: DecimalWithAggregatesFilter<"PledgeItem"> | Decimal | DecimalJsLike | number | string
  }

  export type PledgeAuditWhereInput = {
    AND?: PledgeAuditWhereInput | PledgeAuditWhereInput[]
    OR?: PledgeAuditWhereInput[]
    NOT?: PledgeAuditWhereInput | PledgeAuditWhereInput[]
    id?: StringFilter<"PledgeAudit"> | string
    pledgeId?: StringFilter<"PledgeAudit"> | string
    action?: EnumAuditActionFilter<"PledgeAudit"> | $Enums.AuditAction
    principal?: DecimalFilter<"PledgeAudit"> | Decimal | DecimalJsLike | number | string
    interestRate?: DecimalFilter<"PledgeAudit"> | Decimal | DecimalJsLike | number | string
    allowCompounding?: BoolFilter<"PledgeAudit"> | boolean
    compoundingDuration?: EnumCompoundingDurationFilter<"PledgeAudit"> | $Enums.CompoundingDuration
    calculationVersion?: IntFilter<"PledgeAudit"> | number
    durationMonths?: DecimalNullableFilter<"PledgeAudit"> | Decimal | DecimalJsLike | number | string | null
    netWeightOfGold?: DecimalFilter<"PledgeAudit"> | Decimal | DecimalJsLike | number | string
    netWeightOfSilver?: DecimalFilter<"PledgeAudit"> | Decimal | DecimalJsLike | number | string
    goldPricePerGram?: DecimalNullableFilter<"PledgeAudit"> | Decimal | DecimalJsLike | number | string | null
    silverPricePerGram?: DecimalNullableFilter<"PledgeAudit"> | Decimal | DecimalJsLike | number | string | null
    marketValueAtRelease?: DecimalNullableFilter<"PledgeAudit"> | Decimal | DecimalJsLike | number | string | null
    ltvAtRelease?: DecimalNullableFilter<"PledgeAudit"> | Decimal | DecimalJsLike | number | string | null
    totalInterest?: DecimalNullableFilter<"PledgeAudit"> | Decimal | DecimalJsLike | number | string | null
    receivableAmount?: DecimalNullableFilter<"PledgeAudit"> | Decimal | DecimalJsLike | number | string | null
    releaseDate?: DateTimeNullableFilter<"PledgeAudit"> | Date | string | null
    createdAt?: DateTimeFilter<"PledgeAudit"> | Date | string
    pledge?: XOR<PledgeScalarRelationFilter, PledgeWhereInput>
  }

  export type PledgeAuditOrderByWithRelationInput = {
    id?: SortOrder
    pledgeId?: SortOrder
    action?: SortOrder
    principal?: SortOrder
    interestRate?: SortOrder
    allowCompounding?: SortOrder
    compoundingDuration?: SortOrder
    calculationVersion?: SortOrder
    durationMonths?: SortOrderInput | SortOrder
    netWeightOfGold?: SortOrder
    netWeightOfSilver?: SortOrder
    goldPricePerGram?: SortOrderInput | SortOrder
    silverPricePerGram?: SortOrderInput | SortOrder
    marketValueAtRelease?: SortOrderInput | SortOrder
    ltvAtRelease?: SortOrderInput | SortOrder
    totalInterest?: SortOrderInput | SortOrder
    receivableAmount?: SortOrderInput | SortOrder
    releaseDate?: SortOrderInput | SortOrder
    createdAt?: SortOrder
    pledge?: PledgeOrderByWithRelationInput
  }

  export type PledgeAuditWhereUniqueInput = Prisma.AtLeast<{
    id?: string
    AND?: PledgeAuditWhereInput | PledgeAuditWhereInput[]
    OR?: PledgeAuditWhereInput[]
    NOT?: PledgeAuditWhereInput | PledgeAuditWhereInput[]
    pledgeId?: StringFilter<"PledgeAudit"> | string
    action?: EnumAuditActionFilter<"PledgeAudit"> | $Enums.AuditAction
    principal?: DecimalFilter<"PledgeAudit"> | Decimal | DecimalJsLike | number | string
    interestRate?: DecimalFilter<"PledgeAudit"> | Decimal | DecimalJsLike | number | string
    allowCompounding?: BoolFilter<"PledgeAudit"> | boolean
    compoundingDuration?: EnumCompoundingDurationFilter<"PledgeAudit"> | $Enums.CompoundingDuration
    calculationVersion?: IntFilter<"PledgeAudit"> | number
    durationMonths?: DecimalNullableFilter<"PledgeAudit"> | Decimal | DecimalJsLike | number | string | null
    netWeightOfGold?: DecimalFilter<"PledgeAudit"> | Decimal | DecimalJsLike | number | string
    netWeightOfSilver?: DecimalFilter<"PledgeAudit"> | Decimal | DecimalJsLike | number | string
    goldPricePerGram?: DecimalNullableFilter<"PledgeAudit"> | Decimal | DecimalJsLike | number | string | null
    silverPricePerGram?: DecimalNullableFilter<"PledgeAudit"> | Decimal | DecimalJsLike | number | string | null
    marketValueAtRelease?: DecimalNullableFilter<"PledgeAudit"> | Decimal | DecimalJsLike | number | string | null
    ltvAtRelease?: DecimalNullableFilter<"PledgeAudit"> | Decimal | DecimalJsLike | number | string | null
    totalInterest?: DecimalNullableFilter<"PledgeAudit"> | Decimal | DecimalJsLike | number | string | null
    receivableAmount?: DecimalNullableFilter<"PledgeAudit"> | Decimal | DecimalJsLike | number | string | null
    releaseDate?: DateTimeNullableFilter<"PledgeAudit"> | Date | string | null
    createdAt?: DateTimeFilter<"PledgeAudit"> | Date | string
    pledge?: XOR<PledgeScalarRelationFilter, PledgeWhereInput>
  }, "id">

  export type PledgeAuditOrderByWithAggregationInput = {
    id?: SortOrder
    pledgeId?: SortOrder
    action?: SortOrder
    principal?: SortOrder
    interestRate?: SortOrder
    allowCompounding?: SortOrder
    compoundingDuration?: SortOrder
    calculationVersion?: SortOrder
    durationMonths?: SortOrderInput | SortOrder
    netWeightOfGold?: SortOrder
    netWeightOfSilver?: SortOrder
    goldPricePerGram?: SortOrderInput | SortOrder
    silverPricePerGram?: SortOrderInput | SortOrder
    marketValueAtRelease?: SortOrderInput | SortOrder
    ltvAtRelease?: SortOrderInput | SortOrder
    totalInterest?: SortOrderInput | SortOrder
    receivableAmount?: SortOrderInput | SortOrder
    releaseDate?: SortOrderInput | SortOrder
    createdAt?: SortOrder
    _count?: PledgeAuditCountOrderByAggregateInput
    _avg?: PledgeAuditAvgOrderByAggregateInput
    _max?: PledgeAuditMaxOrderByAggregateInput
    _min?: PledgeAuditMinOrderByAggregateInput
    _sum?: PledgeAuditSumOrderByAggregateInput
  }

  export type PledgeAuditScalarWhereWithAggregatesInput = {
    AND?: PledgeAuditScalarWhereWithAggregatesInput | PledgeAuditScalarWhereWithAggregatesInput[]
    OR?: PledgeAuditScalarWhereWithAggregatesInput[]
    NOT?: PledgeAuditScalarWhereWithAggregatesInput | PledgeAuditScalarWhereWithAggregatesInput[]
    id?: StringWithAggregatesFilter<"PledgeAudit"> | string
    pledgeId?: StringWithAggregatesFilter<"PledgeAudit"> | string
    action?: EnumAuditActionWithAggregatesFilter<"PledgeAudit"> | $Enums.AuditAction
    principal?: DecimalWithAggregatesFilter<"PledgeAudit"> | Decimal | DecimalJsLike | number | string
    interestRate?: DecimalWithAggregatesFilter<"PledgeAudit"> | Decimal | DecimalJsLike | number | string
    allowCompounding?: BoolWithAggregatesFilter<"PledgeAudit"> | boolean
    compoundingDuration?: EnumCompoundingDurationWithAggregatesFilter<"PledgeAudit"> | $Enums.CompoundingDuration
    calculationVersion?: IntWithAggregatesFilter<"PledgeAudit"> | number
    durationMonths?: DecimalNullableWithAggregatesFilter<"PledgeAudit"> | Decimal | DecimalJsLike | number | string | null
    netWeightOfGold?: DecimalWithAggregatesFilter<"PledgeAudit"> | Decimal | DecimalJsLike | number | string
    netWeightOfSilver?: DecimalWithAggregatesFilter<"PledgeAudit"> | Decimal | DecimalJsLike | number | string
    goldPricePerGram?: DecimalNullableWithAggregatesFilter<"PledgeAudit"> | Decimal | DecimalJsLike | number | string | null
    silverPricePerGram?: DecimalNullableWithAggregatesFilter<"PledgeAudit"> | Decimal | DecimalJsLike | number | string | null
    marketValueAtRelease?: DecimalNullableWithAggregatesFilter<"PledgeAudit"> | Decimal | DecimalJsLike | number | string | null
    ltvAtRelease?: DecimalNullableWithAggregatesFilter<"PledgeAudit"> | Decimal | DecimalJsLike | number | string | null
    totalInterest?: DecimalNullableWithAggregatesFilter<"PledgeAudit"> | Decimal | DecimalJsLike | number | string | null
    receivableAmount?: DecimalNullableWithAggregatesFilter<"PledgeAudit"> | Decimal | DecimalJsLike | number | string | null
    releaseDate?: DateTimeNullableWithAggregatesFilter<"PledgeAudit"> | Date | string | null
    createdAt?: DateTimeWithAggregatesFilter<"PledgeAudit"> | Date | string
  }

  export type MetalPriceWhereInput = {
    AND?: MetalPriceWhereInput | MetalPriceWhereInput[]
    OR?: MetalPriceWhereInput[]
    NOT?: MetalPriceWhereInput | MetalPriceWhereInput[]
    id?: StringFilter<"MetalPrice"> | string
    metal?: EnumMetalTypeFilter<"MetalPrice"> | $Enums.MetalType
    usdPerOunce?: DecimalFilter<"MetalPrice"> | Decimal | DecimalJsLike | number | string
    inrPerGram?: DecimalFilter<"MetalPrice"> | Decimal | DecimalJsLike | number | string
    createdAt?: DateTimeFilter<"MetalPrice"> | Date | string
    updatedAt?: DateTimeFilter<"MetalPrice"> | Date | string
  }

  export type MetalPriceOrderByWithRelationInput = {
    id?: SortOrder
    metal?: SortOrder
    usdPerOunce?: SortOrder
    inrPerGram?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
  }

  export type MetalPriceWhereUniqueInput = Prisma.AtLeast<{
    id?: string
    AND?: MetalPriceWhereInput | MetalPriceWhereInput[]
    OR?: MetalPriceWhereInput[]
    NOT?: MetalPriceWhereInput | MetalPriceWhereInput[]
    metal?: EnumMetalTypeFilter<"MetalPrice"> | $Enums.MetalType
    usdPerOunce?: DecimalFilter<"MetalPrice"> | Decimal | DecimalJsLike | number | string
    inrPerGram?: DecimalFilter<"MetalPrice"> | Decimal | DecimalJsLike | number | string
    createdAt?: DateTimeFilter<"MetalPrice"> | Date | string
    updatedAt?: DateTimeFilter<"MetalPrice"> | Date | string
  }, "id">

  export type MetalPriceOrderByWithAggregationInput = {
    id?: SortOrder
    metal?: SortOrder
    usdPerOunce?: SortOrder
    inrPerGram?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
    _count?: MetalPriceCountOrderByAggregateInput
    _avg?: MetalPriceAvgOrderByAggregateInput
    _max?: MetalPriceMaxOrderByAggregateInput
    _min?: MetalPriceMinOrderByAggregateInput
    _sum?: MetalPriceSumOrderByAggregateInput
  }

  export type MetalPriceScalarWhereWithAggregatesInput = {
    AND?: MetalPriceScalarWhereWithAggregatesInput | MetalPriceScalarWhereWithAggregatesInput[]
    OR?: MetalPriceScalarWhereWithAggregatesInput[]
    NOT?: MetalPriceScalarWhereWithAggregatesInput | MetalPriceScalarWhereWithAggregatesInput[]
    id?: StringWithAggregatesFilter<"MetalPrice"> | string
    metal?: EnumMetalTypeWithAggregatesFilter<"MetalPrice"> | $Enums.MetalType
    usdPerOunce?: DecimalWithAggregatesFilter<"MetalPrice"> | Decimal | DecimalJsLike | number | string
    inrPerGram?: DecimalWithAggregatesFilter<"MetalPrice"> | Decimal | DecimalJsLike | number | string
    createdAt?: DateTimeWithAggregatesFilter<"MetalPrice"> | Date | string
    updatedAt?: DateTimeWithAggregatesFilter<"MetalPrice"> | Date | string
  }

  export type TransactionWhereInput = {
    AND?: TransactionWhereInput | TransactionWhereInput[]
    OR?: TransactionWhereInput[]
    NOT?: TransactionWhereInput | TransactionWhereInput[]
    id?: StringFilter<"Transaction"> | string
    pledgeId?: StringFilter<"Transaction"> | string
    amount?: DecimalFilter<"Transaction"> | Decimal | DecimalJsLike | number | string
    type?: EnumTransactionTypeFilter<"Transaction"> | $Enums.TransactionType
    note?: StringNullableFilter<"Transaction"> | string | null
    createdAt?: DateTimeFilter<"Transaction"> | Date | string
    pledge?: XOR<PledgeScalarRelationFilter, PledgeWhereInput>
  }

  export type TransactionOrderByWithRelationInput = {
    id?: SortOrder
    pledgeId?: SortOrder
    amount?: SortOrder
    type?: SortOrder
    note?: SortOrderInput | SortOrder
    createdAt?: SortOrder
    pledge?: PledgeOrderByWithRelationInput
  }

  export type TransactionWhereUniqueInput = Prisma.AtLeast<{
    id?: string
    AND?: TransactionWhereInput | TransactionWhereInput[]
    OR?: TransactionWhereInput[]
    NOT?: TransactionWhereInput | TransactionWhereInput[]
    pledgeId?: StringFilter<"Transaction"> | string
    amount?: DecimalFilter<"Transaction"> | Decimal | DecimalJsLike | number | string
    type?: EnumTransactionTypeFilter<"Transaction"> | $Enums.TransactionType
    note?: StringNullableFilter<"Transaction"> | string | null
    createdAt?: DateTimeFilter<"Transaction"> | Date | string
    pledge?: XOR<PledgeScalarRelationFilter, PledgeWhereInput>
  }, "id">

  export type TransactionOrderByWithAggregationInput = {
    id?: SortOrder
    pledgeId?: SortOrder
    amount?: SortOrder
    type?: SortOrder
    note?: SortOrderInput | SortOrder
    createdAt?: SortOrder
    _count?: TransactionCountOrderByAggregateInput
    _avg?: TransactionAvgOrderByAggregateInput
    _max?: TransactionMaxOrderByAggregateInput
    _min?: TransactionMinOrderByAggregateInput
    _sum?: TransactionSumOrderByAggregateInput
  }

  export type TransactionScalarWhereWithAggregatesInput = {
    AND?: TransactionScalarWhereWithAggregatesInput | TransactionScalarWhereWithAggregatesInput[]
    OR?: TransactionScalarWhereWithAggregatesInput[]
    NOT?: TransactionScalarWhereWithAggregatesInput | TransactionScalarWhereWithAggregatesInput[]
    id?: StringWithAggregatesFilter<"Transaction"> | string
    pledgeId?: StringWithAggregatesFilter<"Transaction"> | string
    amount?: DecimalWithAggregatesFilter<"Transaction"> | Decimal | DecimalJsLike | number | string
    type?: EnumTransactionTypeWithAggregatesFilter<"Transaction"> | $Enums.TransactionType
    note?: StringNullableWithAggregatesFilter<"Transaction"> | string | null
    createdAt?: DateTimeWithAggregatesFilter<"Transaction"> | Date | string
  }

  export type ExchangeRateWhereInput = {
    AND?: ExchangeRateWhereInput | ExchangeRateWhereInput[]
    OR?: ExchangeRateWhereInput[]
    NOT?: ExchangeRateWhereInput | ExchangeRateWhereInput[]
    id?: StringFilter<"ExchangeRate"> | string
    from?: StringFilter<"ExchangeRate"> | string
    to?: StringFilter<"ExchangeRate"> | string
    rate?: FloatFilter<"ExchangeRate"> | number
    createdAt?: DateTimeFilter<"ExchangeRate"> | Date | string
  }

  export type ExchangeRateOrderByWithRelationInput = {
    id?: SortOrder
    from?: SortOrder
    to?: SortOrder
    rate?: SortOrder
    createdAt?: SortOrder
  }

  export type ExchangeRateWhereUniqueInput = Prisma.AtLeast<{
    id?: string
    AND?: ExchangeRateWhereInput | ExchangeRateWhereInput[]
    OR?: ExchangeRateWhereInput[]
    NOT?: ExchangeRateWhereInput | ExchangeRateWhereInput[]
    from?: StringFilter<"ExchangeRate"> | string
    to?: StringFilter<"ExchangeRate"> | string
    rate?: FloatFilter<"ExchangeRate"> | number
    createdAt?: DateTimeFilter<"ExchangeRate"> | Date | string
  }, "id">

  export type ExchangeRateOrderByWithAggregationInput = {
    id?: SortOrder
    from?: SortOrder
    to?: SortOrder
    rate?: SortOrder
    createdAt?: SortOrder
    _count?: ExchangeRateCountOrderByAggregateInput
    _avg?: ExchangeRateAvgOrderByAggregateInput
    _max?: ExchangeRateMaxOrderByAggregateInput
    _min?: ExchangeRateMinOrderByAggregateInput
    _sum?: ExchangeRateSumOrderByAggregateInput
  }

  export type ExchangeRateScalarWhereWithAggregatesInput = {
    AND?: ExchangeRateScalarWhereWithAggregatesInput | ExchangeRateScalarWhereWithAggregatesInput[]
    OR?: ExchangeRateScalarWhereWithAggregatesInput[]
    NOT?: ExchangeRateScalarWhereWithAggregatesInput | ExchangeRateScalarWhereWithAggregatesInput[]
    id?: StringWithAggregatesFilter<"ExchangeRate"> | string
    from?: StringWithAggregatesFilter<"ExchangeRate"> | string
    to?: StringWithAggregatesFilter<"ExchangeRate"> | string
    rate?: FloatWithAggregatesFilter<"ExchangeRate"> | number
    createdAt?: DateTimeWithAggregatesFilter<"ExchangeRate"> | Date | string
  }

  export type UserCreateInput = {
    id?: string
    clerkUserId: string
    username: string
    email?: string | null
    mobile?: string | null
    firstName?: string | null
    lastName?: string | null
    shopName?: string | null
    address?: string | null
    gender?: $Enums.Gender | null
    profileImageUrl?: string | null
    subscriptionStatus?: $Enums.SubscriptionStatus
    subscriptionEndDate?: Date | string | null
    razorpaySubscriptionId?: string | null
    subscriptionPlan?: $Enums.SubscriptionPlan | null
    razorpayPaymentId?: string | null
    subscriptionCreatedAt?: Date | string | null
    hadTrial?: boolean
    isActive?: boolean
    lastLoginAt?: Date | string | null
    deletedAt?: Date | string | null
    createdAt?: Date | string
    updatedAt?: Date | string
    customers?: CustomerCreateNestedManyWithoutUserInput
  }

  export type UserUncheckedCreateInput = {
    id?: string
    clerkUserId: string
    username: string
    email?: string | null
    mobile?: string | null
    firstName?: string | null
    lastName?: string | null
    shopName?: string | null
    address?: string | null
    gender?: $Enums.Gender | null
    profileImageUrl?: string | null
    subscriptionStatus?: $Enums.SubscriptionStatus
    subscriptionEndDate?: Date | string | null
    razorpaySubscriptionId?: string | null
    subscriptionPlan?: $Enums.SubscriptionPlan | null
    razorpayPaymentId?: string | null
    subscriptionCreatedAt?: Date | string | null
    hadTrial?: boolean
    isActive?: boolean
    lastLoginAt?: Date | string | null
    deletedAt?: Date | string | null
    createdAt?: Date | string
    updatedAt?: Date | string
    customers?: CustomerUncheckedCreateNestedManyWithoutUserInput
  }

  export type UserUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    clerkUserId?: StringFieldUpdateOperationsInput | string
    username?: StringFieldUpdateOperationsInput | string
    email?: NullableStringFieldUpdateOperationsInput | string | null
    mobile?: NullableStringFieldUpdateOperationsInput | string | null
    firstName?: NullableStringFieldUpdateOperationsInput | string | null
    lastName?: NullableStringFieldUpdateOperationsInput | string | null
    shopName?: NullableStringFieldUpdateOperationsInput | string | null
    address?: NullableStringFieldUpdateOperationsInput | string | null
    gender?: NullableEnumGenderFieldUpdateOperationsInput | $Enums.Gender | null
    profileImageUrl?: NullableStringFieldUpdateOperationsInput | string | null
    subscriptionStatus?: EnumSubscriptionStatusFieldUpdateOperationsInput | $Enums.SubscriptionStatus
    subscriptionEndDate?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    razorpaySubscriptionId?: NullableStringFieldUpdateOperationsInput | string | null
    subscriptionPlan?: NullableEnumSubscriptionPlanFieldUpdateOperationsInput | $Enums.SubscriptionPlan | null
    razorpayPaymentId?: NullableStringFieldUpdateOperationsInput | string | null
    subscriptionCreatedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    hadTrial?: BoolFieldUpdateOperationsInput | boolean
    isActive?: BoolFieldUpdateOperationsInput | boolean
    lastLoginAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    deletedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    customers?: CustomerUpdateManyWithoutUserNestedInput
  }

  export type UserUncheckedUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    clerkUserId?: StringFieldUpdateOperationsInput | string
    username?: StringFieldUpdateOperationsInput | string
    email?: NullableStringFieldUpdateOperationsInput | string | null
    mobile?: NullableStringFieldUpdateOperationsInput | string | null
    firstName?: NullableStringFieldUpdateOperationsInput | string | null
    lastName?: NullableStringFieldUpdateOperationsInput | string | null
    shopName?: NullableStringFieldUpdateOperationsInput | string | null
    address?: NullableStringFieldUpdateOperationsInput | string | null
    gender?: NullableEnumGenderFieldUpdateOperationsInput | $Enums.Gender | null
    profileImageUrl?: NullableStringFieldUpdateOperationsInput | string | null
    subscriptionStatus?: EnumSubscriptionStatusFieldUpdateOperationsInput | $Enums.SubscriptionStatus
    subscriptionEndDate?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    razorpaySubscriptionId?: NullableStringFieldUpdateOperationsInput | string | null
    subscriptionPlan?: NullableEnumSubscriptionPlanFieldUpdateOperationsInput | $Enums.SubscriptionPlan | null
    razorpayPaymentId?: NullableStringFieldUpdateOperationsInput | string | null
    subscriptionCreatedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    hadTrial?: BoolFieldUpdateOperationsInput | boolean
    isActive?: BoolFieldUpdateOperationsInput | boolean
    lastLoginAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    deletedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    customers?: CustomerUncheckedUpdateManyWithoutUserNestedInput
  }

  export type UserCreateManyInput = {
    id?: string
    clerkUserId: string
    username: string
    email?: string | null
    mobile?: string | null
    firstName?: string | null
    lastName?: string | null
    shopName?: string | null
    address?: string | null
    gender?: $Enums.Gender | null
    profileImageUrl?: string | null
    subscriptionStatus?: $Enums.SubscriptionStatus
    subscriptionEndDate?: Date | string | null
    razorpaySubscriptionId?: string | null
    subscriptionPlan?: $Enums.SubscriptionPlan | null
    razorpayPaymentId?: string | null
    subscriptionCreatedAt?: Date | string | null
    hadTrial?: boolean
    isActive?: boolean
    lastLoginAt?: Date | string | null
    deletedAt?: Date | string | null
    createdAt?: Date | string
    updatedAt?: Date | string
  }

  export type UserUpdateManyMutationInput = {
    id?: StringFieldUpdateOperationsInput | string
    clerkUserId?: StringFieldUpdateOperationsInput | string
    username?: StringFieldUpdateOperationsInput | string
    email?: NullableStringFieldUpdateOperationsInput | string | null
    mobile?: NullableStringFieldUpdateOperationsInput | string | null
    firstName?: NullableStringFieldUpdateOperationsInput | string | null
    lastName?: NullableStringFieldUpdateOperationsInput | string | null
    shopName?: NullableStringFieldUpdateOperationsInput | string | null
    address?: NullableStringFieldUpdateOperationsInput | string | null
    gender?: NullableEnumGenderFieldUpdateOperationsInput | $Enums.Gender | null
    profileImageUrl?: NullableStringFieldUpdateOperationsInput | string | null
    subscriptionStatus?: EnumSubscriptionStatusFieldUpdateOperationsInput | $Enums.SubscriptionStatus
    subscriptionEndDate?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    razorpaySubscriptionId?: NullableStringFieldUpdateOperationsInput | string | null
    subscriptionPlan?: NullableEnumSubscriptionPlanFieldUpdateOperationsInput | $Enums.SubscriptionPlan | null
    razorpayPaymentId?: NullableStringFieldUpdateOperationsInput | string | null
    subscriptionCreatedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    hadTrial?: BoolFieldUpdateOperationsInput | boolean
    isActive?: BoolFieldUpdateOperationsInput | boolean
    lastLoginAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    deletedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type UserUncheckedUpdateManyInput = {
    id?: StringFieldUpdateOperationsInput | string
    clerkUserId?: StringFieldUpdateOperationsInput | string
    username?: StringFieldUpdateOperationsInput | string
    email?: NullableStringFieldUpdateOperationsInput | string | null
    mobile?: NullableStringFieldUpdateOperationsInput | string | null
    firstName?: NullableStringFieldUpdateOperationsInput | string | null
    lastName?: NullableStringFieldUpdateOperationsInput | string | null
    shopName?: NullableStringFieldUpdateOperationsInput | string | null
    address?: NullableStringFieldUpdateOperationsInput | string | null
    gender?: NullableEnumGenderFieldUpdateOperationsInput | $Enums.Gender | null
    profileImageUrl?: NullableStringFieldUpdateOperationsInput | string | null
    subscriptionStatus?: EnumSubscriptionStatusFieldUpdateOperationsInput | $Enums.SubscriptionStatus
    subscriptionEndDate?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    razorpaySubscriptionId?: NullableStringFieldUpdateOperationsInput | string | null
    subscriptionPlan?: NullableEnumSubscriptionPlanFieldUpdateOperationsInput | $Enums.SubscriptionPlan | null
    razorpayPaymentId?: NullableStringFieldUpdateOperationsInput | string | null
    subscriptionCreatedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    hadTrial?: BoolFieldUpdateOperationsInput | boolean
    isActive?: BoolFieldUpdateOperationsInput | boolean
    lastLoginAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    deletedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type CustomerCreateInput = {
    id?: string
    name: string
    region: string
    address: string
    mobile?: string | null
    viewToken?: string
    idProofImg?: string | null
    customerImg?: string | null
    aadharNo?: string | null
    remark?: string | null
    deletedAt?: Date | string | null
    createdAt?: Date | string
    updatedAt?: Date | string
    gender?: $Enums.Gender | null
    pledges?: PledgeCreateNestedManyWithoutCustomerInput
    user: UserCreateNestedOneWithoutCustomersInput
  }

  export type CustomerUncheckedCreateInput = {
    id?: string
    userId: string
    name: string
    region: string
    address: string
    mobile?: string | null
    viewToken?: string
    idProofImg?: string | null
    customerImg?: string | null
    aadharNo?: string | null
    remark?: string | null
    deletedAt?: Date | string | null
    createdAt?: Date | string
    updatedAt?: Date | string
    gender?: $Enums.Gender | null
    pledges?: PledgeUncheckedCreateNestedManyWithoutCustomerInput
  }

  export type CustomerUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    region?: StringFieldUpdateOperationsInput | string
    address?: StringFieldUpdateOperationsInput | string
    mobile?: NullableStringFieldUpdateOperationsInput | string | null
    viewToken?: StringFieldUpdateOperationsInput | string
    idProofImg?: NullableStringFieldUpdateOperationsInput | string | null
    customerImg?: NullableStringFieldUpdateOperationsInput | string | null
    aadharNo?: NullableStringFieldUpdateOperationsInput | string | null
    remark?: NullableStringFieldUpdateOperationsInput | string | null
    deletedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    gender?: NullableEnumGenderFieldUpdateOperationsInput | $Enums.Gender | null
    pledges?: PledgeUpdateManyWithoutCustomerNestedInput
    user?: UserUpdateOneRequiredWithoutCustomersNestedInput
  }

  export type CustomerUncheckedUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    userId?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    region?: StringFieldUpdateOperationsInput | string
    address?: StringFieldUpdateOperationsInput | string
    mobile?: NullableStringFieldUpdateOperationsInput | string | null
    viewToken?: StringFieldUpdateOperationsInput | string
    idProofImg?: NullableStringFieldUpdateOperationsInput | string | null
    customerImg?: NullableStringFieldUpdateOperationsInput | string | null
    aadharNo?: NullableStringFieldUpdateOperationsInput | string | null
    remark?: NullableStringFieldUpdateOperationsInput | string | null
    deletedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    gender?: NullableEnumGenderFieldUpdateOperationsInput | $Enums.Gender | null
    pledges?: PledgeUncheckedUpdateManyWithoutCustomerNestedInput
  }

  export type CustomerCreateManyInput = {
    id?: string
    userId: string
    name: string
    region: string
    address: string
    mobile?: string | null
    viewToken?: string
    idProofImg?: string | null
    customerImg?: string | null
    aadharNo?: string | null
    remark?: string | null
    deletedAt?: Date | string | null
    createdAt?: Date | string
    updatedAt?: Date | string
    gender?: $Enums.Gender | null
  }

  export type CustomerUpdateManyMutationInput = {
    id?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    region?: StringFieldUpdateOperationsInput | string
    address?: StringFieldUpdateOperationsInput | string
    mobile?: NullableStringFieldUpdateOperationsInput | string | null
    viewToken?: StringFieldUpdateOperationsInput | string
    idProofImg?: NullableStringFieldUpdateOperationsInput | string | null
    customerImg?: NullableStringFieldUpdateOperationsInput | string | null
    aadharNo?: NullableStringFieldUpdateOperationsInput | string | null
    remark?: NullableStringFieldUpdateOperationsInput | string | null
    deletedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    gender?: NullableEnumGenderFieldUpdateOperationsInput | $Enums.Gender | null
  }

  export type CustomerUncheckedUpdateManyInput = {
    id?: StringFieldUpdateOperationsInput | string
    userId?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    region?: StringFieldUpdateOperationsInput | string
    address?: StringFieldUpdateOperationsInput | string
    mobile?: NullableStringFieldUpdateOperationsInput | string | null
    viewToken?: StringFieldUpdateOperationsInput | string
    idProofImg?: NullableStringFieldUpdateOperationsInput | string | null
    customerImg?: NullableStringFieldUpdateOperationsInput | string | null
    aadharNo?: NullableStringFieldUpdateOperationsInput | string | null
    remark?: NullableStringFieldUpdateOperationsInput | string | null
    deletedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    gender?: NullableEnumGenderFieldUpdateOperationsInput | $Enums.Gender | null
  }

  export type PledgeCreateInput = {
    id?: string
    pledgeDate: Date | string
    loanAmount: Decimal | DecimalJsLike | number | string
    interestRate: Decimal | DecimalJsLike | number | string
    compoundingDuration: $Enums.CompoundingDuration
    allowCompounding?: boolean
    itemPhoto?: string | null
    remark?: string | null
    durationMonths?: Decimal | DecimalJsLike | number | string | null
    status: $Enums.PledgeStatus
    releaseDate?: Date | string | null
    netWeightOfGold?: Decimal | DecimalJsLike | number | string
    netWeightOfSilver?: Decimal | DecimalJsLike | number | string
    totalInterest?: Decimal | DecimalJsLike | number | string | null
    receivableAmount?: Decimal | DecimalJsLike | number | string | null
    calculationVersion?: number
    createdAt?: Date | string
    updatedAt?: Date | string
    pledgeAudits?: PledgeAuditCreateNestedManyWithoutPledgeInput
    items?: PledgeItemCreateNestedManyWithoutPledgeInput
    customer: CustomerCreateNestedOneWithoutPledgesInput
    transactions?: TransactionCreateNestedManyWithoutPledgeInput
  }

  export type PledgeUncheckedCreateInput = {
    id?: string
    customerId: string
    pledgeDate: Date | string
    loanAmount: Decimal | DecimalJsLike | number | string
    interestRate: Decimal | DecimalJsLike | number | string
    compoundingDuration: $Enums.CompoundingDuration
    allowCompounding?: boolean
    itemPhoto?: string | null
    remark?: string | null
    durationMonths?: Decimal | DecimalJsLike | number | string | null
    status: $Enums.PledgeStatus
    releaseDate?: Date | string | null
    netWeightOfGold?: Decimal | DecimalJsLike | number | string
    netWeightOfSilver?: Decimal | DecimalJsLike | number | string
    totalInterest?: Decimal | DecimalJsLike | number | string | null
    receivableAmount?: Decimal | DecimalJsLike | number | string | null
    calculationVersion?: number
    createdAt?: Date | string
    updatedAt?: Date | string
    pledgeAudits?: PledgeAuditUncheckedCreateNestedManyWithoutPledgeInput
    items?: PledgeItemUncheckedCreateNestedManyWithoutPledgeInput
    transactions?: TransactionUncheckedCreateNestedManyWithoutPledgeInput
  }

  export type PledgeUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    pledgeDate?: DateTimeFieldUpdateOperationsInput | Date | string
    loanAmount?: DecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string
    interestRate?: DecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string
    compoundingDuration?: EnumCompoundingDurationFieldUpdateOperationsInput | $Enums.CompoundingDuration
    allowCompounding?: BoolFieldUpdateOperationsInput | boolean
    itemPhoto?: NullableStringFieldUpdateOperationsInput | string | null
    remark?: NullableStringFieldUpdateOperationsInput | string | null
    durationMonths?: NullableDecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string | null
    status?: EnumPledgeStatusFieldUpdateOperationsInput | $Enums.PledgeStatus
    releaseDate?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    netWeightOfGold?: DecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string
    netWeightOfSilver?: DecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string
    totalInterest?: NullableDecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string | null
    receivableAmount?: NullableDecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string | null
    calculationVersion?: IntFieldUpdateOperationsInput | number
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    pledgeAudits?: PledgeAuditUpdateManyWithoutPledgeNestedInput
    items?: PledgeItemUpdateManyWithoutPledgeNestedInput
    customer?: CustomerUpdateOneRequiredWithoutPledgesNestedInput
    transactions?: TransactionUpdateManyWithoutPledgeNestedInput
  }

  export type PledgeUncheckedUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    customerId?: StringFieldUpdateOperationsInput | string
    pledgeDate?: DateTimeFieldUpdateOperationsInput | Date | string
    loanAmount?: DecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string
    interestRate?: DecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string
    compoundingDuration?: EnumCompoundingDurationFieldUpdateOperationsInput | $Enums.CompoundingDuration
    allowCompounding?: BoolFieldUpdateOperationsInput | boolean
    itemPhoto?: NullableStringFieldUpdateOperationsInput | string | null
    remark?: NullableStringFieldUpdateOperationsInput | string | null
    durationMonths?: NullableDecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string | null
    status?: EnumPledgeStatusFieldUpdateOperationsInput | $Enums.PledgeStatus
    releaseDate?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    netWeightOfGold?: DecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string
    netWeightOfSilver?: DecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string
    totalInterest?: NullableDecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string | null
    receivableAmount?: NullableDecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string | null
    calculationVersion?: IntFieldUpdateOperationsInput | number
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    pledgeAudits?: PledgeAuditUncheckedUpdateManyWithoutPledgeNestedInput
    items?: PledgeItemUncheckedUpdateManyWithoutPledgeNestedInput
    transactions?: TransactionUncheckedUpdateManyWithoutPledgeNestedInput
  }

  export type PledgeCreateManyInput = {
    id?: string
    customerId: string
    pledgeDate: Date | string
    loanAmount: Decimal | DecimalJsLike | number | string
    interestRate: Decimal | DecimalJsLike | number | string
    compoundingDuration: $Enums.CompoundingDuration
    allowCompounding?: boolean
    itemPhoto?: string | null
    remark?: string | null
    durationMonths?: Decimal | DecimalJsLike | number | string | null
    status: $Enums.PledgeStatus
    releaseDate?: Date | string | null
    netWeightOfGold?: Decimal | DecimalJsLike | number | string
    netWeightOfSilver?: Decimal | DecimalJsLike | number | string
    totalInterest?: Decimal | DecimalJsLike | number | string | null
    receivableAmount?: Decimal | DecimalJsLike | number | string | null
    calculationVersion?: number
    createdAt?: Date | string
    updatedAt?: Date | string
  }

  export type PledgeUpdateManyMutationInput = {
    id?: StringFieldUpdateOperationsInput | string
    pledgeDate?: DateTimeFieldUpdateOperationsInput | Date | string
    loanAmount?: DecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string
    interestRate?: DecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string
    compoundingDuration?: EnumCompoundingDurationFieldUpdateOperationsInput | $Enums.CompoundingDuration
    allowCompounding?: BoolFieldUpdateOperationsInput | boolean
    itemPhoto?: NullableStringFieldUpdateOperationsInput | string | null
    remark?: NullableStringFieldUpdateOperationsInput | string | null
    durationMonths?: NullableDecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string | null
    status?: EnumPledgeStatusFieldUpdateOperationsInput | $Enums.PledgeStatus
    releaseDate?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    netWeightOfGold?: DecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string
    netWeightOfSilver?: DecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string
    totalInterest?: NullableDecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string | null
    receivableAmount?: NullableDecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string | null
    calculationVersion?: IntFieldUpdateOperationsInput | number
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type PledgeUncheckedUpdateManyInput = {
    id?: StringFieldUpdateOperationsInput | string
    customerId?: StringFieldUpdateOperationsInput | string
    pledgeDate?: DateTimeFieldUpdateOperationsInput | Date | string
    loanAmount?: DecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string
    interestRate?: DecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string
    compoundingDuration?: EnumCompoundingDurationFieldUpdateOperationsInput | $Enums.CompoundingDuration
    allowCompounding?: BoolFieldUpdateOperationsInput | boolean
    itemPhoto?: NullableStringFieldUpdateOperationsInput | string | null
    remark?: NullableStringFieldUpdateOperationsInput | string | null
    durationMonths?: NullableDecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string | null
    status?: EnumPledgeStatusFieldUpdateOperationsInput | $Enums.PledgeStatus
    releaseDate?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    netWeightOfGold?: DecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string
    netWeightOfSilver?: DecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string
    totalInterest?: NullableDecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string | null
    receivableAmount?: NullableDecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string | null
    calculationVersion?: IntFieldUpdateOperationsInput | number
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type PledgeItemCreateInput = {
    id?: string
    itemType: $Enums.ItemType
    metalType: $Enums.MetalType
    itemName?: string | null
    quantity?: number
    grossWeight: Decimal | DecimalJsLike | number | string
    netWeight: Decimal | DecimalJsLike | number | string
    purity: Decimal | DecimalJsLike | number | string
    netWeightOfMetal: Decimal | DecimalJsLike | number | string
    pledge: PledgeCreateNestedOneWithoutItemsInput
  }

  export type PledgeItemUncheckedCreateInput = {
    id?: string
    pledgeId: string
    itemType: $Enums.ItemType
    metalType: $Enums.MetalType
    itemName?: string | null
    quantity?: number
    grossWeight: Decimal | DecimalJsLike | number | string
    netWeight: Decimal | DecimalJsLike | number | string
    purity: Decimal | DecimalJsLike | number | string
    netWeightOfMetal: Decimal | DecimalJsLike | number | string
  }

  export type PledgeItemUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    itemType?: EnumItemTypeFieldUpdateOperationsInput | $Enums.ItemType
    metalType?: EnumMetalTypeFieldUpdateOperationsInput | $Enums.MetalType
    itemName?: NullableStringFieldUpdateOperationsInput | string | null
    quantity?: IntFieldUpdateOperationsInput | number
    grossWeight?: DecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string
    netWeight?: DecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string
    purity?: DecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string
    netWeightOfMetal?: DecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string
    pledge?: PledgeUpdateOneRequiredWithoutItemsNestedInput
  }

  export type PledgeItemUncheckedUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    pledgeId?: StringFieldUpdateOperationsInput | string
    itemType?: EnumItemTypeFieldUpdateOperationsInput | $Enums.ItemType
    metalType?: EnumMetalTypeFieldUpdateOperationsInput | $Enums.MetalType
    itemName?: NullableStringFieldUpdateOperationsInput | string | null
    quantity?: IntFieldUpdateOperationsInput | number
    grossWeight?: DecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string
    netWeight?: DecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string
    purity?: DecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string
    netWeightOfMetal?: DecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string
  }

  export type PledgeItemCreateManyInput = {
    id?: string
    pledgeId: string
    itemType: $Enums.ItemType
    metalType: $Enums.MetalType
    itemName?: string | null
    quantity?: number
    grossWeight: Decimal | DecimalJsLike | number | string
    netWeight: Decimal | DecimalJsLike | number | string
    purity: Decimal | DecimalJsLike | number | string
    netWeightOfMetal: Decimal | DecimalJsLike | number | string
  }

  export type PledgeItemUpdateManyMutationInput = {
    id?: StringFieldUpdateOperationsInput | string
    itemType?: EnumItemTypeFieldUpdateOperationsInput | $Enums.ItemType
    metalType?: EnumMetalTypeFieldUpdateOperationsInput | $Enums.MetalType
    itemName?: NullableStringFieldUpdateOperationsInput | string | null
    quantity?: IntFieldUpdateOperationsInput | number
    grossWeight?: DecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string
    netWeight?: DecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string
    purity?: DecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string
    netWeightOfMetal?: DecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string
  }

  export type PledgeItemUncheckedUpdateManyInput = {
    id?: StringFieldUpdateOperationsInput | string
    pledgeId?: StringFieldUpdateOperationsInput | string
    itemType?: EnumItemTypeFieldUpdateOperationsInput | $Enums.ItemType
    metalType?: EnumMetalTypeFieldUpdateOperationsInput | $Enums.MetalType
    itemName?: NullableStringFieldUpdateOperationsInput | string | null
    quantity?: IntFieldUpdateOperationsInput | number
    grossWeight?: DecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string
    netWeight?: DecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string
    purity?: DecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string
    netWeightOfMetal?: DecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string
  }

  export type PledgeAuditCreateInput = {
    id?: string
    action: $Enums.AuditAction
    principal: Decimal | DecimalJsLike | number | string
    interestRate: Decimal | DecimalJsLike | number | string
    allowCompounding: boolean
    compoundingDuration: $Enums.CompoundingDuration
    calculationVersion: number
    durationMonths?: Decimal | DecimalJsLike | number | string | null
    netWeightOfGold: Decimal | DecimalJsLike | number | string
    netWeightOfSilver: Decimal | DecimalJsLike | number | string
    goldPricePerGram?: Decimal | DecimalJsLike | number | string | null
    silverPricePerGram?: Decimal | DecimalJsLike | number | string | null
    marketValueAtRelease?: Decimal | DecimalJsLike | number | string | null
    ltvAtRelease?: Decimal | DecimalJsLike | number | string | null
    totalInterest?: Decimal | DecimalJsLike | number | string | null
    receivableAmount?: Decimal | DecimalJsLike | number | string | null
    releaseDate?: Date | string | null
    createdAt?: Date | string
    pledge: PledgeCreateNestedOneWithoutPledgeAuditsInput
  }

  export type PledgeAuditUncheckedCreateInput = {
    id?: string
    pledgeId: string
    action: $Enums.AuditAction
    principal: Decimal | DecimalJsLike | number | string
    interestRate: Decimal | DecimalJsLike | number | string
    allowCompounding: boolean
    compoundingDuration: $Enums.CompoundingDuration
    calculationVersion: number
    durationMonths?: Decimal | DecimalJsLike | number | string | null
    netWeightOfGold: Decimal | DecimalJsLike | number | string
    netWeightOfSilver: Decimal | DecimalJsLike | number | string
    goldPricePerGram?: Decimal | DecimalJsLike | number | string | null
    silverPricePerGram?: Decimal | DecimalJsLike | number | string | null
    marketValueAtRelease?: Decimal | DecimalJsLike | number | string | null
    ltvAtRelease?: Decimal | DecimalJsLike | number | string | null
    totalInterest?: Decimal | DecimalJsLike | number | string | null
    receivableAmount?: Decimal | DecimalJsLike | number | string | null
    releaseDate?: Date | string | null
    createdAt?: Date | string
  }

  export type PledgeAuditUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    action?: EnumAuditActionFieldUpdateOperationsInput | $Enums.AuditAction
    principal?: DecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string
    interestRate?: DecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string
    allowCompounding?: BoolFieldUpdateOperationsInput | boolean
    compoundingDuration?: EnumCompoundingDurationFieldUpdateOperationsInput | $Enums.CompoundingDuration
    calculationVersion?: IntFieldUpdateOperationsInput | number
    durationMonths?: NullableDecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string | null
    netWeightOfGold?: DecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string
    netWeightOfSilver?: DecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string
    goldPricePerGram?: NullableDecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string | null
    silverPricePerGram?: NullableDecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string | null
    marketValueAtRelease?: NullableDecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string | null
    ltvAtRelease?: NullableDecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string | null
    totalInterest?: NullableDecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string | null
    receivableAmount?: NullableDecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string | null
    releaseDate?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    pledge?: PledgeUpdateOneRequiredWithoutPledgeAuditsNestedInput
  }

  export type PledgeAuditUncheckedUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    pledgeId?: StringFieldUpdateOperationsInput | string
    action?: EnumAuditActionFieldUpdateOperationsInput | $Enums.AuditAction
    principal?: DecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string
    interestRate?: DecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string
    allowCompounding?: BoolFieldUpdateOperationsInput | boolean
    compoundingDuration?: EnumCompoundingDurationFieldUpdateOperationsInput | $Enums.CompoundingDuration
    calculationVersion?: IntFieldUpdateOperationsInput | number
    durationMonths?: NullableDecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string | null
    netWeightOfGold?: DecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string
    netWeightOfSilver?: DecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string
    goldPricePerGram?: NullableDecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string | null
    silverPricePerGram?: NullableDecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string | null
    marketValueAtRelease?: NullableDecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string | null
    ltvAtRelease?: NullableDecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string | null
    totalInterest?: NullableDecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string | null
    receivableAmount?: NullableDecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string | null
    releaseDate?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type PledgeAuditCreateManyInput = {
    id?: string
    pledgeId: string
    action: $Enums.AuditAction
    principal: Decimal | DecimalJsLike | number | string
    interestRate: Decimal | DecimalJsLike | number | string
    allowCompounding: boolean
    compoundingDuration: $Enums.CompoundingDuration
    calculationVersion: number
    durationMonths?: Decimal | DecimalJsLike | number | string | null
    netWeightOfGold: Decimal | DecimalJsLike | number | string
    netWeightOfSilver: Decimal | DecimalJsLike | number | string
    goldPricePerGram?: Decimal | DecimalJsLike | number | string | null
    silverPricePerGram?: Decimal | DecimalJsLike | number | string | null
    marketValueAtRelease?: Decimal | DecimalJsLike | number | string | null
    ltvAtRelease?: Decimal | DecimalJsLike | number | string | null
    totalInterest?: Decimal | DecimalJsLike | number | string | null
    receivableAmount?: Decimal | DecimalJsLike | number | string | null
    releaseDate?: Date | string | null
    createdAt?: Date | string
  }

  export type PledgeAuditUpdateManyMutationInput = {
    id?: StringFieldUpdateOperationsInput | string
    action?: EnumAuditActionFieldUpdateOperationsInput | $Enums.AuditAction
    principal?: DecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string
    interestRate?: DecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string
    allowCompounding?: BoolFieldUpdateOperationsInput | boolean
    compoundingDuration?: EnumCompoundingDurationFieldUpdateOperationsInput | $Enums.CompoundingDuration
    calculationVersion?: IntFieldUpdateOperationsInput | number
    durationMonths?: NullableDecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string | null
    netWeightOfGold?: DecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string
    netWeightOfSilver?: DecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string
    goldPricePerGram?: NullableDecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string | null
    silverPricePerGram?: NullableDecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string | null
    marketValueAtRelease?: NullableDecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string | null
    ltvAtRelease?: NullableDecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string | null
    totalInterest?: NullableDecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string | null
    receivableAmount?: NullableDecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string | null
    releaseDate?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type PledgeAuditUncheckedUpdateManyInput = {
    id?: StringFieldUpdateOperationsInput | string
    pledgeId?: StringFieldUpdateOperationsInput | string
    action?: EnumAuditActionFieldUpdateOperationsInput | $Enums.AuditAction
    principal?: DecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string
    interestRate?: DecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string
    allowCompounding?: BoolFieldUpdateOperationsInput | boolean
    compoundingDuration?: EnumCompoundingDurationFieldUpdateOperationsInput | $Enums.CompoundingDuration
    calculationVersion?: IntFieldUpdateOperationsInput | number
    durationMonths?: NullableDecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string | null
    netWeightOfGold?: DecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string
    netWeightOfSilver?: DecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string
    goldPricePerGram?: NullableDecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string | null
    silverPricePerGram?: NullableDecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string | null
    marketValueAtRelease?: NullableDecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string | null
    ltvAtRelease?: NullableDecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string | null
    totalInterest?: NullableDecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string | null
    receivableAmount?: NullableDecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string | null
    releaseDate?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type MetalPriceCreateInput = {
    id?: string
    metal: $Enums.MetalType
    usdPerOunce: Decimal | DecimalJsLike | number | string
    inrPerGram: Decimal | DecimalJsLike | number | string
    createdAt?: Date | string
    updatedAt?: Date | string
  }

  export type MetalPriceUncheckedCreateInput = {
    id?: string
    metal: $Enums.MetalType
    usdPerOunce: Decimal | DecimalJsLike | number | string
    inrPerGram: Decimal | DecimalJsLike | number | string
    createdAt?: Date | string
    updatedAt?: Date | string
  }

  export type MetalPriceUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    metal?: EnumMetalTypeFieldUpdateOperationsInput | $Enums.MetalType
    usdPerOunce?: DecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string
    inrPerGram?: DecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type MetalPriceUncheckedUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    metal?: EnumMetalTypeFieldUpdateOperationsInput | $Enums.MetalType
    usdPerOunce?: DecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string
    inrPerGram?: DecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type MetalPriceCreateManyInput = {
    id?: string
    metal: $Enums.MetalType
    usdPerOunce: Decimal | DecimalJsLike | number | string
    inrPerGram: Decimal | DecimalJsLike | number | string
    createdAt?: Date | string
    updatedAt?: Date | string
  }

  export type MetalPriceUpdateManyMutationInput = {
    id?: StringFieldUpdateOperationsInput | string
    metal?: EnumMetalTypeFieldUpdateOperationsInput | $Enums.MetalType
    usdPerOunce?: DecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string
    inrPerGram?: DecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type MetalPriceUncheckedUpdateManyInput = {
    id?: StringFieldUpdateOperationsInput | string
    metal?: EnumMetalTypeFieldUpdateOperationsInput | $Enums.MetalType
    usdPerOunce?: DecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string
    inrPerGram?: DecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type TransactionCreateInput = {
    id?: string
    amount: Decimal | DecimalJsLike | number | string
    type: $Enums.TransactionType
    note?: string | null
    createdAt?: Date | string
    pledge: PledgeCreateNestedOneWithoutTransactionsInput
  }

  export type TransactionUncheckedCreateInput = {
    id?: string
    pledgeId: string
    amount: Decimal | DecimalJsLike | number | string
    type: $Enums.TransactionType
    note?: string | null
    createdAt?: Date | string
  }

  export type TransactionUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    amount?: DecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string
    type?: EnumTransactionTypeFieldUpdateOperationsInput | $Enums.TransactionType
    note?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    pledge?: PledgeUpdateOneRequiredWithoutTransactionsNestedInput
  }

  export type TransactionUncheckedUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    pledgeId?: StringFieldUpdateOperationsInput | string
    amount?: DecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string
    type?: EnumTransactionTypeFieldUpdateOperationsInput | $Enums.TransactionType
    note?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type TransactionCreateManyInput = {
    id?: string
    pledgeId: string
    amount: Decimal | DecimalJsLike | number | string
    type: $Enums.TransactionType
    note?: string | null
    createdAt?: Date | string
  }

  export type TransactionUpdateManyMutationInput = {
    id?: StringFieldUpdateOperationsInput | string
    amount?: DecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string
    type?: EnumTransactionTypeFieldUpdateOperationsInput | $Enums.TransactionType
    note?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type TransactionUncheckedUpdateManyInput = {
    id?: StringFieldUpdateOperationsInput | string
    pledgeId?: StringFieldUpdateOperationsInput | string
    amount?: DecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string
    type?: EnumTransactionTypeFieldUpdateOperationsInput | $Enums.TransactionType
    note?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type ExchangeRateCreateInput = {
    id?: string
    from: string
    to: string
    rate: number
    createdAt?: Date | string
  }

  export type ExchangeRateUncheckedCreateInput = {
    id?: string
    from: string
    to: string
    rate: number
    createdAt?: Date | string
  }

  export type ExchangeRateUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    from?: StringFieldUpdateOperationsInput | string
    to?: StringFieldUpdateOperationsInput | string
    rate?: FloatFieldUpdateOperationsInput | number
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type ExchangeRateUncheckedUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    from?: StringFieldUpdateOperationsInput | string
    to?: StringFieldUpdateOperationsInput | string
    rate?: FloatFieldUpdateOperationsInput | number
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type ExchangeRateCreateManyInput = {
    id?: string
    from: string
    to: string
    rate: number
    createdAt?: Date | string
  }

  export type ExchangeRateUpdateManyMutationInput = {
    id?: StringFieldUpdateOperationsInput | string
    from?: StringFieldUpdateOperationsInput | string
    to?: StringFieldUpdateOperationsInput | string
    rate?: FloatFieldUpdateOperationsInput | number
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type ExchangeRateUncheckedUpdateManyInput = {
    id?: StringFieldUpdateOperationsInput | string
    from?: StringFieldUpdateOperationsInput | string
    to?: StringFieldUpdateOperationsInput | string
    rate?: FloatFieldUpdateOperationsInput | number
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type StringFilter<$PrismaModel = never> = {
    equals?: string | StringFieldRefInput<$PrismaModel>
    in?: string[] | ListStringFieldRefInput<$PrismaModel>
    notIn?: string[] | ListStringFieldRefInput<$PrismaModel>
    lt?: string | StringFieldRefInput<$PrismaModel>
    lte?: string | StringFieldRefInput<$PrismaModel>
    gt?: string | StringFieldRefInput<$PrismaModel>
    gte?: string | StringFieldRefInput<$PrismaModel>
    contains?: string | StringFieldRefInput<$PrismaModel>
    startsWith?: string | StringFieldRefInput<$PrismaModel>
    endsWith?: string | StringFieldRefInput<$PrismaModel>
    mode?: QueryMode
    not?: NestedStringFilter<$PrismaModel> | string
  }

  export type StringNullableFilter<$PrismaModel = never> = {
    equals?: string | StringFieldRefInput<$PrismaModel> | null
    in?: string[] | ListStringFieldRefInput<$PrismaModel> | null
    notIn?: string[] | ListStringFieldRefInput<$PrismaModel> | null
    lt?: string | StringFieldRefInput<$PrismaModel>
    lte?: string | StringFieldRefInput<$PrismaModel>
    gt?: string | StringFieldRefInput<$PrismaModel>
    gte?: string | StringFieldRefInput<$PrismaModel>
    contains?: string | StringFieldRefInput<$PrismaModel>
    startsWith?: string | StringFieldRefInput<$PrismaModel>
    endsWith?: string | StringFieldRefInput<$PrismaModel>
    mode?: QueryMode
    not?: NestedStringNullableFilter<$PrismaModel> | string | null
  }

  export type EnumGenderNullableFilter<$PrismaModel = never> = {
    equals?: $Enums.Gender | EnumGenderFieldRefInput<$PrismaModel> | null
    in?: $Enums.Gender[] | ListEnumGenderFieldRefInput<$PrismaModel> | null
    notIn?: $Enums.Gender[] | ListEnumGenderFieldRefInput<$PrismaModel> | null
    not?: NestedEnumGenderNullableFilter<$PrismaModel> | $Enums.Gender | null
  }

  export type EnumSubscriptionStatusFilter<$PrismaModel = never> = {
    equals?: $Enums.SubscriptionStatus | EnumSubscriptionStatusFieldRefInput<$PrismaModel>
    in?: $Enums.SubscriptionStatus[] | ListEnumSubscriptionStatusFieldRefInput<$PrismaModel>
    notIn?: $Enums.SubscriptionStatus[] | ListEnumSubscriptionStatusFieldRefInput<$PrismaModel>
    not?: NestedEnumSubscriptionStatusFilter<$PrismaModel> | $Enums.SubscriptionStatus
  }

  export type DateTimeNullableFilter<$PrismaModel = never> = {
    equals?: Date | string | DateTimeFieldRefInput<$PrismaModel> | null
    in?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel> | null
    notIn?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel> | null
    lt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    lte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    not?: NestedDateTimeNullableFilter<$PrismaModel> | Date | string | null
  }

  export type EnumSubscriptionPlanNullableFilter<$PrismaModel = never> = {
    equals?: $Enums.SubscriptionPlan | EnumSubscriptionPlanFieldRefInput<$PrismaModel> | null
    in?: $Enums.SubscriptionPlan[] | ListEnumSubscriptionPlanFieldRefInput<$PrismaModel> | null
    notIn?: $Enums.SubscriptionPlan[] | ListEnumSubscriptionPlanFieldRefInput<$PrismaModel> | null
    not?: NestedEnumSubscriptionPlanNullableFilter<$PrismaModel> | $Enums.SubscriptionPlan | null
  }

  export type BoolFilter<$PrismaModel = never> = {
    equals?: boolean | BooleanFieldRefInput<$PrismaModel>
    not?: NestedBoolFilter<$PrismaModel> | boolean
  }

  export type DateTimeFilter<$PrismaModel = never> = {
    equals?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    in?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel>
    notIn?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel>
    lt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    lte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    not?: NestedDateTimeFilter<$PrismaModel> | Date | string
  }

  export type CustomerListRelationFilter = {
    every?: CustomerWhereInput
    some?: CustomerWhereInput
    none?: CustomerWhereInput
  }

  export type SortOrderInput = {
    sort: SortOrder
    nulls?: NullsOrder
  }

  export type CustomerOrderByRelationAggregateInput = {
    _count?: SortOrder
  }

  export type UserCountOrderByAggregateInput = {
    id?: SortOrder
    clerkUserId?: SortOrder
    username?: SortOrder
    email?: SortOrder
    mobile?: SortOrder
    firstName?: SortOrder
    lastName?: SortOrder
    shopName?: SortOrder
    address?: SortOrder
    gender?: SortOrder
    profileImageUrl?: SortOrder
    subscriptionStatus?: SortOrder
    subscriptionEndDate?: SortOrder
    razorpaySubscriptionId?: SortOrder
    subscriptionPlan?: SortOrder
    razorpayPaymentId?: SortOrder
    subscriptionCreatedAt?: SortOrder
    hadTrial?: SortOrder
    isActive?: SortOrder
    lastLoginAt?: SortOrder
    deletedAt?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
  }

  export type UserMaxOrderByAggregateInput = {
    id?: SortOrder
    clerkUserId?: SortOrder
    username?: SortOrder
    email?: SortOrder
    mobile?: SortOrder
    firstName?: SortOrder
    lastName?: SortOrder
    shopName?: SortOrder
    address?: SortOrder
    gender?: SortOrder
    profileImageUrl?: SortOrder
    subscriptionStatus?: SortOrder
    subscriptionEndDate?: SortOrder
    razorpaySubscriptionId?: SortOrder
    subscriptionPlan?: SortOrder
    razorpayPaymentId?: SortOrder
    subscriptionCreatedAt?: SortOrder
    hadTrial?: SortOrder
    isActive?: SortOrder
    lastLoginAt?: SortOrder
    deletedAt?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
  }

  export type UserMinOrderByAggregateInput = {
    id?: SortOrder
    clerkUserId?: SortOrder
    username?: SortOrder
    email?: SortOrder
    mobile?: SortOrder
    firstName?: SortOrder
    lastName?: SortOrder
    shopName?: SortOrder
    address?: SortOrder
    gender?: SortOrder
    profileImageUrl?: SortOrder
    subscriptionStatus?: SortOrder
    subscriptionEndDate?: SortOrder
    razorpaySubscriptionId?: SortOrder
    subscriptionPlan?: SortOrder
    razorpayPaymentId?: SortOrder
    subscriptionCreatedAt?: SortOrder
    hadTrial?: SortOrder
    isActive?: SortOrder
    lastLoginAt?: SortOrder
    deletedAt?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
  }

  export type StringWithAggregatesFilter<$PrismaModel = never> = {
    equals?: string | StringFieldRefInput<$PrismaModel>
    in?: string[] | ListStringFieldRefInput<$PrismaModel>
    notIn?: string[] | ListStringFieldRefInput<$PrismaModel>
    lt?: string | StringFieldRefInput<$PrismaModel>
    lte?: string | StringFieldRefInput<$PrismaModel>
    gt?: string | StringFieldRefInput<$PrismaModel>
    gte?: string | StringFieldRefInput<$PrismaModel>
    contains?: string | StringFieldRefInput<$PrismaModel>
    startsWith?: string | StringFieldRefInput<$PrismaModel>
    endsWith?: string | StringFieldRefInput<$PrismaModel>
    mode?: QueryMode
    not?: NestedStringWithAggregatesFilter<$PrismaModel> | string
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedStringFilter<$PrismaModel>
    _max?: NestedStringFilter<$PrismaModel>
  }

  export type StringNullableWithAggregatesFilter<$PrismaModel = never> = {
    equals?: string | StringFieldRefInput<$PrismaModel> | null
    in?: string[] | ListStringFieldRefInput<$PrismaModel> | null
    notIn?: string[] | ListStringFieldRefInput<$PrismaModel> | null
    lt?: string | StringFieldRefInput<$PrismaModel>
    lte?: string | StringFieldRefInput<$PrismaModel>
    gt?: string | StringFieldRefInput<$PrismaModel>
    gte?: string | StringFieldRefInput<$PrismaModel>
    contains?: string | StringFieldRefInput<$PrismaModel>
    startsWith?: string | StringFieldRefInput<$PrismaModel>
    endsWith?: string | StringFieldRefInput<$PrismaModel>
    mode?: QueryMode
    not?: NestedStringNullableWithAggregatesFilter<$PrismaModel> | string | null
    _count?: NestedIntNullableFilter<$PrismaModel>
    _min?: NestedStringNullableFilter<$PrismaModel>
    _max?: NestedStringNullableFilter<$PrismaModel>
  }

  export type EnumGenderNullableWithAggregatesFilter<$PrismaModel = never> = {
    equals?: $Enums.Gender | EnumGenderFieldRefInput<$PrismaModel> | null
    in?: $Enums.Gender[] | ListEnumGenderFieldRefInput<$PrismaModel> | null
    notIn?: $Enums.Gender[] | ListEnumGenderFieldRefInput<$PrismaModel> | null
    not?: NestedEnumGenderNullableWithAggregatesFilter<$PrismaModel> | $Enums.Gender | null
    _count?: NestedIntNullableFilter<$PrismaModel>
    _min?: NestedEnumGenderNullableFilter<$PrismaModel>
    _max?: NestedEnumGenderNullableFilter<$PrismaModel>
  }

  export type EnumSubscriptionStatusWithAggregatesFilter<$PrismaModel = never> = {
    equals?: $Enums.SubscriptionStatus | EnumSubscriptionStatusFieldRefInput<$PrismaModel>
    in?: $Enums.SubscriptionStatus[] | ListEnumSubscriptionStatusFieldRefInput<$PrismaModel>
    notIn?: $Enums.SubscriptionStatus[] | ListEnumSubscriptionStatusFieldRefInput<$PrismaModel>
    not?: NestedEnumSubscriptionStatusWithAggregatesFilter<$PrismaModel> | $Enums.SubscriptionStatus
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedEnumSubscriptionStatusFilter<$PrismaModel>
    _max?: NestedEnumSubscriptionStatusFilter<$PrismaModel>
  }

  export type DateTimeNullableWithAggregatesFilter<$PrismaModel = never> = {
    equals?: Date | string | DateTimeFieldRefInput<$PrismaModel> | null
    in?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel> | null
    notIn?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel> | null
    lt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    lte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    not?: NestedDateTimeNullableWithAggregatesFilter<$PrismaModel> | Date | string | null
    _count?: NestedIntNullableFilter<$PrismaModel>
    _min?: NestedDateTimeNullableFilter<$PrismaModel>
    _max?: NestedDateTimeNullableFilter<$PrismaModel>
  }

  export type EnumSubscriptionPlanNullableWithAggregatesFilter<$PrismaModel = never> = {
    equals?: $Enums.SubscriptionPlan | EnumSubscriptionPlanFieldRefInput<$PrismaModel> | null
    in?: $Enums.SubscriptionPlan[] | ListEnumSubscriptionPlanFieldRefInput<$PrismaModel> | null
    notIn?: $Enums.SubscriptionPlan[] | ListEnumSubscriptionPlanFieldRefInput<$PrismaModel> | null
    not?: NestedEnumSubscriptionPlanNullableWithAggregatesFilter<$PrismaModel> | $Enums.SubscriptionPlan | null
    _count?: NestedIntNullableFilter<$PrismaModel>
    _min?: NestedEnumSubscriptionPlanNullableFilter<$PrismaModel>
    _max?: NestedEnumSubscriptionPlanNullableFilter<$PrismaModel>
  }

  export type BoolWithAggregatesFilter<$PrismaModel = never> = {
    equals?: boolean | BooleanFieldRefInput<$PrismaModel>
    not?: NestedBoolWithAggregatesFilter<$PrismaModel> | boolean
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedBoolFilter<$PrismaModel>
    _max?: NestedBoolFilter<$PrismaModel>
  }

  export type DateTimeWithAggregatesFilter<$PrismaModel = never> = {
    equals?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    in?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel>
    notIn?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel>
    lt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    lte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    not?: NestedDateTimeWithAggregatesFilter<$PrismaModel> | Date | string
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedDateTimeFilter<$PrismaModel>
    _max?: NestedDateTimeFilter<$PrismaModel>
  }

  export type PledgeListRelationFilter = {
    every?: PledgeWhereInput
    some?: PledgeWhereInput
    none?: PledgeWhereInput
  }

  export type UserScalarRelationFilter = {
    is?: UserWhereInput
    isNot?: UserWhereInput
  }

  export type PledgeOrderByRelationAggregateInput = {
    _count?: SortOrder
  }

  export type CustomerCountOrderByAggregateInput = {
    id?: SortOrder
    userId?: SortOrder
    name?: SortOrder
    region?: SortOrder
    address?: SortOrder
    mobile?: SortOrder
    viewToken?: SortOrder
    idProofImg?: SortOrder
    customerImg?: SortOrder
    aadharNo?: SortOrder
    remark?: SortOrder
    deletedAt?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
    gender?: SortOrder
  }

  export type CustomerMaxOrderByAggregateInput = {
    id?: SortOrder
    userId?: SortOrder
    name?: SortOrder
    region?: SortOrder
    address?: SortOrder
    mobile?: SortOrder
    viewToken?: SortOrder
    idProofImg?: SortOrder
    customerImg?: SortOrder
    aadharNo?: SortOrder
    remark?: SortOrder
    deletedAt?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
    gender?: SortOrder
  }

  export type CustomerMinOrderByAggregateInput = {
    id?: SortOrder
    userId?: SortOrder
    name?: SortOrder
    region?: SortOrder
    address?: SortOrder
    mobile?: SortOrder
    viewToken?: SortOrder
    idProofImg?: SortOrder
    customerImg?: SortOrder
    aadharNo?: SortOrder
    remark?: SortOrder
    deletedAt?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
    gender?: SortOrder
  }

  export type DecimalFilter<$PrismaModel = never> = {
    equals?: Decimal | DecimalJsLike | number | string | DecimalFieldRefInput<$PrismaModel>
    in?: Decimal[] | DecimalJsLike[] | number[] | string[] | ListDecimalFieldRefInput<$PrismaModel>
    notIn?: Decimal[] | DecimalJsLike[] | number[] | string[] | ListDecimalFieldRefInput<$PrismaModel>
    lt?: Decimal | DecimalJsLike | number | string | DecimalFieldRefInput<$PrismaModel>
    lte?: Decimal | DecimalJsLike | number | string | DecimalFieldRefInput<$PrismaModel>
    gt?: Decimal | DecimalJsLike | number | string | DecimalFieldRefInput<$PrismaModel>
    gte?: Decimal | DecimalJsLike | number | string | DecimalFieldRefInput<$PrismaModel>
    not?: NestedDecimalFilter<$PrismaModel> | Decimal | DecimalJsLike | number | string
  }

  export type EnumCompoundingDurationFilter<$PrismaModel = never> = {
    equals?: $Enums.CompoundingDuration | EnumCompoundingDurationFieldRefInput<$PrismaModel>
    in?: $Enums.CompoundingDuration[] | ListEnumCompoundingDurationFieldRefInput<$PrismaModel>
    notIn?: $Enums.CompoundingDuration[] | ListEnumCompoundingDurationFieldRefInput<$PrismaModel>
    not?: NestedEnumCompoundingDurationFilter<$PrismaModel> | $Enums.CompoundingDuration
  }

  export type DecimalNullableFilter<$PrismaModel = never> = {
    equals?: Decimal | DecimalJsLike | number | string | DecimalFieldRefInput<$PrismaModel> | null
    in?: Decimal[] | DecimalJsLike[] | number[] | string[] | ListDecimalFieldRefInput<$PrismaModel> | null
    notIn?: Decimal[] | DecimalJsLike[] | number[] | string[] | ListDecimalFieldRefInput<$PrismaModel> | null
    lt?: Decimal | DecimalJsLike | number | string | DecimalFieldRefInput<$PrismaModel>
    lte?: Decimal | DecimalJsLike | number | string | DecimalFieldRefInput<$PrismaModel>
    gt?: Decimal | DecimalJsLike | number | string | DecimalFieldRefInput<$PrismaModel>
    gte?: Decimal | DecimalJsLike | number | string | DecimalFieldRefInput<$PrismaModel>
    not?: NestedDecimalNullableFilter<$PrismaModel> | Decimal | DecimalJsLike | number | string | null
  }

  export type EnumPledgeStatusFilter<$PrismaModel = never> = {
    equals?: $Enums.PledgeStatus | EnumPledgeStatusFieldRefInput<$PrismaModel>
    in?: $Enums.PledgeStatus[] | ListEnumPledgeStatusFieldRefInput<$PrismaModel>
    notIn?: $Enums.PledgeStatus[] | ListEnumPledgeStatusFieldRefInput<$PrismaModel>
    not?: NestedEnumPledgeStatusFilter<$PrismaModel> | $Enums.PledgeStatus
  }

  export type IntFilter<$PrismaModel = never> = {
    equals?: number | IntFieldRefInput<$PrismaModel>
    in?: number[] | ListIntFieldRefInput<$PrismaModel>
    notIn?: number[] | ListIntFieldRefInput<$PrismaModel>
    lt?: number | IntFieldRefInput<$PrismaModel>
    lte?: number | IntFieldRefInput<$PrismaModel>
    gt?: number | IntFieldRefInput<$PrismaModel>
    gte?: number | IntFieldRefInput<$PrismaModel>
    not?: NestedIntFilter<$PrismaModel> | number
  }

  export type PledgeAuditListRelationFilter = {
    every?: PledgeAuditWhereInput
    some?: PledgeAuditWhereInput
    none?: PledgeAuditWhereInput
  }

  export type PledgeItemListRelationFilter = {
    every?: PledgeItemWhereInput
    some?: PledgeItemWhereInput
    none?: PledgeItemWhereInput
  }

  export type CustomerScalarRelationFilter = {
    is?: CustomerWhereInput
    isNot?: CustomerWhereInput
  }

  export type TransactionListRelationFilter = {
    every?: TransactionWhereInput
    some?: TransactionWhereInput
    none?: TransactionWhereInput
  }

  export type PledgeAuditOrderByRelationAggregateInput = {
    _count?: SortOrder
  }

  export type PledgeItemOrderByRelationAggregateInput = {
    _count?: SortOrder
  }

  export type TransactionOrderByRelationAggregateInput = {
    _count?: SortOrder
  }

  export type PledgeCountOrderByAggregateInput = {
    id?: SortOrder
    customerId?: SortOrder
    pledgeDate?: SortOrder
    loanAmount?: SortOrder
    interestRate?: SortOrder
    compoundingDuration?: SortOrder
    allowCompounding?: SortOrder
    itemPhoto?: SortOrder
    remark?: SortOrder
    durationMonths?: SortOrder
    status?: SortOrder
    releaseDate?: SortOrder
    netWeightOfGold?: SortOrder
    netWeightOfSilver?: SortOrder
    totalInterest?: SortOrder
    receivableAmount?: SortOrder
    calculationVersion?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
  }

  export type PledgeAvgOrderByAggregateInput = {
    loanAmount?: SortOrder
    interestRate?: SortOrder
    durationMonths?: SortOrder
    netWeightOfGold?: SortOrder
    netWeightOfSilver?: SortOrder
    totalInterest?: SortOrder
    receivableAmount?: SortOrder
    calculationVersion?: SortOrder
  }

  export type PledgeMaxOrderByAggregateInput = {
    id?: SortOrder
    customerId?: SortOrder
    pledgeDate?: SortOrder
    loanAmount?: SortOrder
    interestRate?: SortOrder
    compoundingDuration?: SortOrder
    allowCompounding?: SortOrder
    itemPhoto?: SortOrder
    remark?: SortOrder
    durationMonths?: SortOrder
    status?: SortOrder
    releaseDate?: SortOrder
    netWeightOfGold?: SortOrder
    netWeightOfSilver?: SortOrder
    totalInterest?: SortOrder
    receivableAmount?: SortOrder
    calculationVersion?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
  }

  export type PledgeMinOrderByAggregateInput = {
    id?: SortOrder
    customerId?: SortOrder
    pledgeDate?: SortOrder
    loanAmount?: SortOrder
    interestRate?: SortOrder
    compoundingDuration?: SortOrder
    allowCompounding?: SortOrder
    itemPhoto?: SortOrder
    remark?: SortOrder
    durationMonths?: SortOrder
    status?: SortOrder
    releaseDate?: SortOrder
    netWeightOfGold?: SortOrder
    netWeightOfSilver?: SortOrder
    totalInterest?: SortOrder
    receivableAmount?: SortOrder
    calculationVersion?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
  }

  export type PledgeSumOrderByAggregateInput = {
    loanAmount?: SortOrder
    interestRate?: SortOrder
    durationMonths?: SortOrder
    netWeightOfGold?: SortOrder
    netWeightOfSilver?: SortOrder
    totalInterest?: SortOrder
    receivableAmount?: SortOrder
    calculationVersion?: SortOrder
  }

  export type DecimalWithAggregatesFilter<$PrismaModel = never> = {
    equals?: Decimal | DecimalJsLike | number | string | DecimalFieldRefInput<$PrismaModel>
    in?: Decimal[] | DecimalJsLike[] | number[] | string[] | ListDecimalFieldRefInput<$PrismaModel>
    notIn?: Decimal[] | DecimalJsLike[] | number[] | string[] | ListDecimalFieldRefInput<$PrismaModel>
    lt?: Decimal | DecimalJsLike | number | string | DecimalFieldRefInput<$PrismaModel>
    lte?: Decimal | DecimalJsLike | number | string | DecimalFieldRefInput<$PrismaModel>
    gt?: Decimal | DecimalJsLike | number | string | DecimalFieldRefInput<$PrismaModel>
    gte?: Decimal | DecimalJsLike | number | string | DecimalFieldRefInput<$PrismaModel>
    not?: NestedDecimalWithAggregatesFilter<$PrismaModel> | Decimal | DecimalJsLike | number | string
    _count?: NestedIntFilter<$PrismaModel>
    _avg?: NestedDecimalFilter<$PrismaModel>
    _sum?: NestedDecimalFilter<$PrismaModel>
    _min?: NestedDecimalFilter<$PrismaModel>
    _max?: NestedDecimalFilter<$PrismaModel>
  }

  export type EnumCompoundingDurationWithAggregatesFilter<$PrismaModel = never> = {
    equals?: $Enums.CompoundingDuration | EnumCompoundingDurationFieldRefInput<$PrismaModel>
    in?: $Enums.CompoundingDuration[] | ListEnumCompoundingDurationFieldRefInput<$PrismaModel>
    notIn?: $Enums.CompoundingDuration[] | ListEnumCompoundingDurationFieldRefInput<$PrismaModel>
    not?: NestedEnumCompoundingDurationWithAggregatesFilter<$PrismaModel> | $Enums.CompoundingDuration
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedEnumCompoundingDurationFilter<$PrismaModel>
    _max?: NestedEnumCompoundingDurationFilter<$PrismaModel>
  }

  export type DecimalNullableWithAggregatesFilter<$PrismaModel = never> = {
    equals?: Decimal | DecimalJsLike | number | string | DecimalFieldRefInput<$PrismaModel> | null
    in?: Decimal[] | DecimalJsLike[] | number[] | string[] | ListDecimalFieldRefInput<$PrismaModel> | null
    notIn?: Decimal[] | DecimalJsLike[] | number[] | string[] | ListDecimalFieldRefInput<$PrismaModel> | null
    lt?: Decimal | DecimalJsLike | number | string | DecimalFieldRefInput<$PrismaModel>
    lte?: Decimal | DecimalJsLike | number | string | DecimalFieldRefInput<$PrismaModel>
    gt?: Decimal | DecimalJsLike | number | string | DecimalFieldRefInput<$PrismaModel>
    gte?: Decimal | DecimalJsLike | number | string | DecimalFieldRefInput<$PrismaModel>
    not?: NestedDecimalNullableWithAggregatesFilter<$PrismaModel> | Decimal | DecimalJsLike | number | string | null
    _count?: NestedIntNullableFilter<$PrismaModel>
    _avg?: NestedDecimalNullableFilter<$PrismaModel>
    _sum?: NestedDecimalNullableFilter<$PrismaModel>
    _min?: NestedDecimalNullableFilter<$PrismaModel>
    _max?: NestedDecimalNullableFilter<$PrismaModel>
  }

  export type EnumPledgeStatusWithAggregatesFilter<$PrismaModel = never> = {
    equals?: $Enums.PledgeStatus | EnumPledgeStatusFieldRefInput<$PrismaModel>
    in?: $Enums.PledgeStatus[] | ListEnumPledgeStatusFieldRefInput<$PrismaModel>
    notIn?: $Enums.PledgeStatus[] | ListEnumPledgeStatusFieldRefInput<$PrismaModel>
    not?: NestedEnumPledgeStatusWithAggregatesFilter<$PrismaModel> | $Enums.PledgeStatus
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedEnumPledgeStatusFilter<$PrismaModel>
    _max?: NestedEnumPledgeStatusFilter<$PrismaModel>
  }

  export type IntWithAggregatesFilter<$PrismaModel = never> = {
    equals?: number | IntFieldRefInput<$PrismaModel>
    in?: number[] | ListIntFieldRefInput<$PrismaModel>
    notIn?: number[] | ListIntFieldRefInput<$PrismaModel>
    lt?: number | IntFieldRefInput<$PrismaModel>
    lte?: number | IntFieldRefInput<$PrismaModel>
    gt?: number | IntFieldRefInput<$PrismaModel>
    gte?: number | IntFieldRefInput<$PrismaModel>
    not?: NestedIntWithAggregatesFilter<$PrismaModel> | number
    _count?: NestedIntFilter<$PrismaModel>
    _avg?: NestedFloatFilter<$PrismaModel>
    _sum?: NestedIntFilter<$PrismaModel>
    _min?: NestedIntFilter<$PrismaModel>
    _max?: NestedIntFilter<$PrismaModel>
  }

  export type EnumItemTypeFilter<$PrismaModel = never> = {
    equals?: $Enums.ItemType | EnumItemTypeFieldRefInput<$PrismaModel>
    in?: $Enums.ItemType[] | ListEnumItemTypeFieldRefInput<$PrismaModel>
    notIn?: $Enums.ItemType[] | ListEnumItemTypeFieldRefInput<$PrismaModel>
    not?: NestedEnumItemTypeFilter<$PrismaModel> | $Enums.ItemType
  }

  export type EnumMetalTypeFilter<$PrismaModel = never> = {
    equals?: $Enums.MetalType | EnumMetalTypeFieldRefInput<$PrismaModel>
    in?: $Enums.MetalType[] | ListEnumMetalTypeFieldRefInput<$PrismaModel>
    notIn?: $Enums.MetalType[] | ListEnumMetalTypeFieldRefInput<$PrismaModel>
    not?: NestedEnumMetalTypeFilter<$PrismaModel> | $Enums.MetalType
  }

  export type PledgeScalarRelationFilter = {
    is?: PledgeWhereInput
    isNot?: PledgeWhereInput
  }

  export type PledgeItemCountOrderByAggregateInput = {
    id?: SortOrder
    pledgeId?: SortOrder
    itemType?: SortOrder
    metalType?: SortOrder
    itemName?: SortOrder
    quantity?: SortOrder
    grossWeight?: SortOrder
    netWeight?: SortOrder
    purity?: SortOrder
    netWeightOfMetal?: SortOrder
  }

  export type PledgeItemAvgOrderByAggregateInput = {
    quantity?: SortOrder
    grossWeight?: SortOrder
    netWeight?: SortOrder
    purity?: SortOrder
    netWeightOfMetal?: SortOrder
  }

  export type PledgeItemMaxOrderByAggregateInput = {
    id?: SortOrder
    pledgeId?: SortOrder
    itemType?: SortOrder
    metalType?: SortOrder
    itemName?: SortOrder
    quantity?: SortOrder
    grossWeight?: SortOrder
    netWeight?: SortOrder
    purity?: SortOrder
    netWeightOfMetal?: SortOrder
  }

  export type PledgeItemMinOrderByAggregateInput = {
    id?: SortOrder
    pledgeId?: SortOrder
    itemType?: SortOrder
    metalType?: SortOrder
    itemName?: SortOrder
    quantity?: SortOrder
    grossWeight?: SortOrder
    netWeight?: SortOrder
    purity?: SortOrder
    netWeightOfMetal?: SortOrder
  }

  export type PledgeItemSumOrderByAggregateInput = {
    quantity?: SortOrder
    grossWeight?: SortOrder
    netWeight?: SortOrder
    purity?: SortOrder
    netWeightOfMetal?: SortOrder
  }

  export type EnumItemTypeWithAggregatesFilter<$PrismaModel = never> = {
    equals?: $Enums.ItemType | EnumItemTypeFieldRefInput<$PrismaModel>
    in?: $Enums.ItemType[] | ListEnumItemTypeFieldRefInput<$PrismaModel>
    notIn?: $Enums.ItemType[] | ListEnumItemTypeFieldRefInput<$PrismaModel>
    not?: NestedEnumItemTypeWithAggregatesFilter<$PrismaModel> | $Enums.ItemType
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedEnumItemTypeFilter<$PrismaModel>
    _max?: NestedEnumItemTypeFilter<$PrismaModel>
  }

  export type EnumMetalTypeWithAggregatesFilter<$PrismaModel = never> = {
    equals?: $Enums.MetalType | EnumMetalTypeFieldRefInput<$PrismaModel>
    in?: $Enums.MetalType[] | ListEnumMetalTypeFieldRefInput<$PrismaModel>
    notIn?: $Enums.MetalType[] | ListEnumMetalTypeFieldRefInput<$PrismaModel>
    not?: NestedEnumMetalTypeWithAggregatesFilter<$PrismaModel> | $Enums.MetalType
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedEnumMetalTypeFilter<$PrismaModel>
    _max?: NestedEnumMetalTypeFilter<$PrismaModel>
  }

  export type EnumAuditActionFilter<$PrismaModel = never> = {
    equals?: $Enums.AuditAction | EnumAuditActionFieldRefInput<$PrismaModel>
    in?: $Enums.AuditAction[] | ListEnumAuditActionFieldRefInput<$PrismaModel>
    notIn?: $Enums.AuditAction[] | ListEnumAuditActionFieldRefInput<$PrismaModel>
    not?: NestedEnumAuditActionFilter<$PrismaModel> | $Enums.AuditAction
  }

  export type PledgeAuditCountOrderByAggregateInput = {
    id?: SortOrder
    pledgeId?: SortOrder
    action?: SortOrder
    principal?: SortOrder
    interestRate?: SortOrder
    allowCompounding?: SortOrder
    compoundingDuration?: SortOrder
    calculationVersion?: SortOrder
    durationMonths?: SortOrder
    netWeightOfGold?: SortOrder
    netWeightOfSilver?: SortOrder
    goldPricePerGram?: SortOrder
    silverPricePerGram?: SortOrder
    marketValueAtRelease?: SortOrder
    ltvAtRelease?: SortOrder
    totalInterest?: SortOrder
    receivableAmount?: SortOrder
    releaseDate?: SortOrder
    createdAt?: SortOrder
  }

  export type PledgeAuditAvgOrderByAggregateInput = {
    principal?: SortOrder
    interestRate?: SortOrder
    calculationVersion?: SortOrder
    durationMonths?: SortOrder
    netWeightOfGold?: SortOrder
    netWeightOfSilver?: SortOrder
    goldPricePerGram?: SortOrder
    silverPricePerGram?: SortOrder
    marketValueAtRelease?: SortOrder
    ltvAtRelease?: SortOrder
    totalInterest?: SortOrder
    receivableAmount?: SortOrder
  }

  export type PledgeAuditMaxOrderByAggregateInput = {
    id?: SortOrder
    pledgeId?: SortOrder
    action?: SortOrder
    principal?: SortOrder
    interestRate?: SortOrder
    allowCompounding?: SortOrder
    compoundingDuration?: SortOrder
    calculationVersion?: SortOrder
    durationMonths?: SortOrder
    netWeightOfGold?: SortOrder
    netWeightOfSilver?: SortOrder
    goldPricePerGram?: SortOrder
    silverPricePerGram?: SortOrder
    marketValueAtRelease?: SortOrder
    ltvAtRelease?: SortOrder
    totalInterest?: SortOrder
    receivableAmount?: SortOrder
    releaseDate?: SortOrder
    createdAt?: SortOrder
  }

  export type PledgeAuditMinOrderByAggregateInput = {
    id?: SortOrder
    pledgeId?: SortOrder
    action?: SortOrder
    principal?: SortOrder
    interestRate?: SortOrder
    allowCompounding?: SortOrder
    compoundingDuration?: SortOrder
    calculationVersion?: SortOrder
    durationMonths?: SortOrder
    netWeightOfGold?: SortOrder
    netWeightOfSilver?: SortOrder
    goldPricePerGram?: SortOrder
    silverPricePerGram?: SortOrder
    marketValueAtRelease?: SortOrder
    ltvAtRelease?: SortOrder
    totalInterest?: SortOrder
    receivableAmount?: SortOrder
    releaseDate?: SortOrder
    createdAt?: SortOrder
  }

  export type PledgeAuditSumOrderByAggregateInput = {
    principal?: SortOrder
    interestRate?: SortOrder
    calculationVersion?: SortOrder
    durationMonths?: SortOrder
    netWeightOfGold?: SortOrder
    netWeightOfSilver?: SortOrder
    goldPricePerGram?: SortOrder
    silverPricePerGram?: SortOrder
    marketValueAtRelease?: SortOrder
    ltvAtRelease?: SortOrder
    totalInterest?: SortOrder
    receivableAmount?: SortOrder
  }

  export type EnumAuditActionWithAggregatesFilter<$PrismaModel = never> = {
    equals?: $Enums.AuditAction | EnumAuditActionFieldRefInput<$PrismaModel>
    in?: $Enums.AuditAction[] | ListEnumAuditActionFieldRefInput<$PrismaModel>
    notIn?: $Enums.AuditAction[] | ListEnumAuditActionFieldRefInput<$PrismaModel>
    not?: NestedEnumAuditActionWithAggregatesFilter<$PrismaModel> | $Enums.AuditAction
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedEnumAuditActionFilter<$PrismaModel>
    _max?: NestedEnumAuditActionFilter<$PrismaModel>
  }

  export type MetalPriceCountOrderByAggregateInput = {
    id?: SortOrder
    metal?: SortOrder
    usdPerOunce?: SortOrder
    inrPerGram?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
  }

  export type MetalPriceAvgOrderByAggregateInput = {
    usdPerOunce?: SortOrder
    inrPerGram?: SortOrder
  }

  export type MetalPriceMaxOrderByAggregateInput = {
    id?: SortOrder
    metal?: SortOrder
    usdPerOunce?: SortOrder
    inrPerGram?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
  }

  export type MetalPriceMinOrderByAggregateInput = {
    id?: SortOrder
    metal?: SortOrder
    usdPerOunce?: SortOrder
    inrPerGram?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
  }

  export type MetalPriceSumOrderByAggregateInput = {
    usdPerOunce?: SortOrder
    inrPerGram?: SortOrder
  }

  export type EnumTransactionTypeFilter<$PrismaModel = never> = {
    equals?: $Enums.TransactionType | EnumTransactionTypeFieldRefInput<$PrismaModel>
    in?: $Enums.TransactionType[] | ListEnumTransactionTypeFieldRefInput<$PrismaModel>
    notIn?: $Enums.TransactionType[] | ListEnumTransactionTypeFieldRefInput<$PrismaModel>
    not?: NestedEnumTransactionTypeFilter<$PrismaModel> | $Enums.TransactionType
  }

  export type TransactionCountOrderByAggregateInput = {
    id?: SortOrder
    pledgeId?: SortOrder
    amount?: SortOrder
    type?: SortOrder
    note?: SortOrder
    createdAt?: SortOrder
  }

  export type TransactionAvgOrderByAggregateInput = {
    amount?: SortOrder
  }

  export type TransactionMaxOrderByAggregateInput = {
    id?: SortOrder
    pledgeId?: SortOrder
    amount?: SortOrder
    type?: SortOrder
    note?: SortOrder
    createdAt?: SortOrder
  }

  export type TransactionMinOrderByAggregateInput = {
    id?: SortOrder
    pledgeId?: SortOrder
    amount?: SortOrder
    type?: SortOrder
    note?: SortOrder
    createdAt?: SortOrder
  }

  export type TransactionSumOrderByAggregateInput = {
    amount?: SortOrder
  }

  export type EnumTransactionTypeWithAggregatesFilter<$PrismaModel = never> = {
    equals?: $Enums.TransactionType | EnumTransactionTypeFieldRefInput<$PrismaModel>
    in?: $Enums.TransactionType[] | ListEnumTransactionTypeFieldRefInput<$PrismaModel>
    notIn?: $Enums.TransactionType[] | ListEnumTransactionTypeFieldRefInput<$PrismaModel>
    not?: NestedEnumTransactionTypeWithAggregatesFilter<$PrismaModel> | $Enums.TransactionType
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedEnumTransactionTypeFilter<$PrismaModel>
    _max?: NestedEnumTransactionTypeFilter<$PrismaModel>
  }

  export type FloatFilter<$PrismaModel = never> = {
    equals?: number | FloatFieldRefInput<$PrismaModel>
    in?: number[] | ListFloatFieldRefInput<$PrismaModel>
    notIn?: number[] | ListFloatFieldRefInput<$PrismaModel>
    lt?: number | FloatFieldRefInput<$PrismaModel>
    lte?: number | FloatFieldRefInput<$PrismaModel>
    gt?: number | FloatFieldRefInput<$PrismaModel>
    gte?: number | FloatFieldRefInput<$PrismaModel>
    not?: NestedFloatFilter<$PrismaModel> | number
  }

  export type ExchangeRateCountOrderByAggregateInput = {
    id?: SortOrder
    from?: SortOrder
    to?: SortOrder
    rate?: SortOrder
    createdAt?: SortOrder
  }

  export type ExchangeRateAvgOrderByAggregateInput = {
    rate?: SortOrder
  }

  export type ExchangeRateMaxOrderByAggregateInput = {
    id?: SortOrder
    from?: SortOrder
    to?: SortOrder
    rate?: SortOrder
    createdAt?: SortOrder
  }

  export type ExchangeRateMinOrderByAggregateInput = {
    id?: SortOrder
    from?: SortOrder
    to?: SortOrder
    rate?: SortOrder
    createdAt?: SortOrder
  }

  export type ExchangeRateSumOrderByAggregateInput = {
    rate?: SortOrder
  }

  export type FloatWithAggregatesFilter<$PrismaModel = never> = {
    equals?: number | FloatFieldRefInput<$PrismaModel>
    in?: number[] | ListFloatFieldRefInput<$PrismaModel>
    notIn?: number[] | ListFloatFieldRefInput<$PrismaModel>
    lt?: number | FloatFieldRefInput<$PrismaModel>
    lte?: number | FloatFieldRefInput<$PrismaModel>
    gt?: number | FloatFieldRefInput<$PrismaModel>
    gte?: number | FloatFieldRefInput<$PrismaModel>
    not?: NestedFloatWithAggregatesFilter<$PrismaModel> | number
    _count?: NestedIntFilter<$PrismaModel>
    _avg?: NestedFloatFilter<$PrismaModel>
    _sum?: NestedFloatFilter<$PrismaModel>
    _min?: NestedFloatFilter<$PrismaModel>
    _max?: NestedFloatFilter<$PrismaModel>
  }

  export type CustomerCreateNestedManyWithoutUserInput = {
    create?: XOR<CustomerCreateWithoutUserInput, CustomerUncheckedCreateWithoutUserInput> | CustomerCreateWithoutUserInput[] | CustomerUncheckedCreateWithoutUserInput[]
    connectOrCreate?: CustomerCreateOrConnectWithoutUserInput | CustomerCreateOrConnectWithoutUserInput[]
    createMany?: CustomerCreateManyUserInputEnvelope
    connect?: CustomerWhereUniqueInput | CustomerWhereUniqueInput[]
  }

  export type CustomerUncheckedCreateNestedManyWithoutUserInput = {
    create?: XOR<CustomerCreateWithoutUserInput, CustomerUncheckedCreateWithoutUserInput> | CustomerCreateWithoutUserInput[] | CustomerUncheckedCreateWithoutUserInput[]
    connectOrCreate?: CustomerCreateOrConnectWithoutUserInput | CustomerCreateOrConnectWithoutUserInput[]
    createMany?: CustomerCreateManyUserInputEnvelope
    connect?: CustomerWhereUniqueInput | CustomerWhereUniqueInput[]
  }

  export type StringFieldUpdateOperationsInput = {
    set?: string
  }

  export type NullableStringFieldUpdateOperationsInput = {
    set?: string | null
  }

  export type NullableEnumGenderFieldUpdateOperationsInput = {
    set?: $Enums.Gender | null
  }

  export type EnumSubscriptionStatusFieldUpdateOperationsInput = {
    set?: $Enums.SubscriptionStatus
  }

  export type NullableDateTimeFieldUpdateOperationsInput = {
    set?: Date | string | null
  }

  export type NullableEnumSubscriptionPlanFieldUpdateOperationsInput = {
    set?: $Enums.SubscriptionPlan | null
  }

  export type BoolFieldUpdateOperationsInput = {
    set?: boolean
  }

  export type DateTimeFieldUpdateOperationsInput = {
    set?: Date | string
  }

  export type CustomerUpdateManyWithoutUserNestedInput = {
    create?: XOR<CustomerCreateWithoutUserInput, CustomerUncheckedCreateWithoutUserInput> | CustomerCreateWithoutUserInput[] | CustomerUncheckedCreateWithoutUserInput[]
    connectOrCreate?: CustomerCreateOrConnectWithoutUserInput | CustomerCreateOrConnectWithoutUserInput[]
    upsert?: CustomerUpsertWithWhereUniqueWithoutUserInput | CustomerUpsertWithWhereUniqueWithoutUserInput[]
    createMany?: CustomerCreateManyUserInputEnvelope
    set?: CustomerWhereUniqueInput | CustomerWhereUniqueInput[]
    disconnect?: CustomerWhereUniqueInput | CustomerWhereUniqueInput[]
    delete?: CustomerWhereUniqueInput | CustomerWhereUniqueInput[]
    connect?: CustomerWhereUniqueInput | CustomerWhereUniqueInput[]
    update?: CustomerUpdateWithWhereUniqueWithoutUserInput | CustomerUpdateWithWhereUniqueWithoutUserInput[]
    updateMany?: CustomerUpdateManyWithWhereWithoutUserInput | CustomerUpdateManyWithWhereWithoutUserInput[]
    deleteMany?: CustomerScalarWhereInput | CustomerScalarWhereInput[]
  }

  export type CustomerUncheckedUpdateManyWithoutUserNestedInput = {
    create?: XOR<CustomerCreateWithoutUserInput, CustomerUncheckedCreateWithoutUserInput> | CustomerCreateWithoutUserInput[] | CustomerUncheckedCreateWithoutUserInput[]
    connectOrCreate?: CustomerCreateOrConnectWithoutUserInput | CustomerCreateOrConnectWithoutUserInput[]
    upsert?: CustomerUpsertWithWhereUniqueWithoutUserInput | CustomerUpsertWithWhereUniqueWithoutUserInput[]
    createMany?: CustomerCreateManyUserInputEnvelope
    set?: CustomerWhereUniqueInput | CustomerWhereUniqueInput[]
    disconnect?: CustomerWhereUniqueInput | CustomerWhereUniqueInput[]
    delete?: CustomerWhereUniqueInput | CustomerWhereUniqueInput[]
    connect?: CustomerWhereUniqueInput | CustomerWhereUniqueInput[]
    update?: CustomerUpdateWithWhereUniqueWithoutUserInput | CustomerUpdateWithWhereUniqueWithoutUserInput[]
    updateMany?: CustomerUpdateManyWithWhereWithoutUserInput | CustomerUpdateManyWithWhereWithoutUserInput[]
    deleteMany?: CustomerScalarWhereInput | CustomerScalarWhereInput[]
  }

  export type PledgeCreateNestedManyWithoutCustomerInput = {
    create?: XOR<PledgeCreateWithoutCustomerInput, PledgeUncheckedCreateWithoutCustomerInput> | PledgeCreateWithoutCustomerInput[] | PledgeUncheckedCreateWithoutCustomerInput[]
    connectOrCreate?: PledgeCreateOrConnectWithoutCustomerInput | PledgeCreateOrConnectWithoutCustomerInput[]
    createMany?: PledgeCreateManyCustomerInputEnvelope
    connect?: PledgeWhereUniqueInput | PledgeWhereUniqueInput[]
  }

  export type UserCreateNestedOneWithoutCustomersInput = {
    create?: XOR<UserCreateWithoutCustomersInput, UserUncheckedCreateWithoutCustomersInput>
    connectOrCreate?: UserCreateOrConnectWithoutCustomersInput
    connect?: UserWhereUniqueInput
  }

  export type PledgeUncheckedCreateNestedManyWithoutCustomerInput = {
    create?: XOR<PledgeCreateWithoutCustomerInput, PledgeUncheckedCreateWithoutCustomerInput> | PledgeCreateWithoutCustomerInput[] | PledgeUncheckedCreateWithoutCustomerInput[]
    connectOrCreate?: PledgeCreateOrConnectWithoutCustomerInput | PledgeCreateOrConnectWithoutCustomerInput[]
    createMany?: PledgeCreateManyCustomerInputEnvelope
    connect?: PledgeWhereUniqueInput | PledgeWhereUniqueInput[]
  }

  export type PledgeUpdateManyWithoutCustomerNestedInput = {
    create?: XOR<PledgeCreateWithoutCustomerInput, PledgeUncheckedCreateWithoutCustomerInput> | PledgeCreateWithoutCustomerInput[] | PledgeUncheckedCreateWithoutCustomerInput[]
    connectOrCreate?: PledgeCreateOrConnectWithoutCustomerInput | PledgeCreateOrConnectWithoutCustomerInput[]
    upsert?: PledgeUpsertWithWhereUniqueWithoutCustomerInput | PledgeUpsertWithWhereUniqueWithoutCustomerInput[]
    createMany?: PledgeCreateManyCustomerInputEnvelope
    set?: PledgeWhereUniqueInput | PledgeWhereUniqueInput[]
    disconnect?: PledgeWhereUniqueInput | PledgeWhereUniqueInput[]
    delete?: PledgeWhereUniqueInput | PledgeWhereUniqueInput[]
    connect?: PledgeWhereUniqueInput | PledgeWhereUniqueInput[]
    update?: PledgeUpdateWithWhereUniqueWithoutCustomerInput | PledgeUpdateWithWhereUniqueWithoutCustomerInput[]
    updateMany?: PledgeUpdateManyWithWhereWithoutCustomerInput | PledgeUpdateManyWithWhereWithoutCustomerInput[]
    deleteMany?: PledgeScalarWhereInput | PledgeScalarWhereInput[]
  }

  export type UserUpdateOneRequiredWithoutCustomersNestedInput = {
    create?: XOR<UserCreateWithoutCustomersInput, UserUncheckedCreateWithoutCustomersInput>
    connectOrCreate?: UserCreateOrConnectWithoutCustomersInput
    upsert?: UserUpsertWithoutCustomersInput
    connect?: UserWhereUniqueInput
    update?: XOR<XOR<UserUpdateToOneWithWhereWithoutCustomersInput, UserUpdateWithoutCustomersInput>, UserUncheckedUpdateWithoutCustomersInput>
  }

  export type PledgeUncheckedUpdateManyWithoutCustomerNestedInput = {
    create?: XOR<PledgeCreateWithoutCustomerInput, PledgeUncheckedCreateWithoutCustomerInput> | PledgeCreateWithoutCustomerInput[] | PledgeUncheckedCreateWithoutCustomerInput[]
    connectOrCreate?: PledgeCreateOrConnectWithoutCustomerInput | PledgeCreateOrConnectWithoutCustomerInput[]
    upsert?: PledgeUpsertWithWhereUniqueWithoutCustomerInput | PledgeUpsertWithWhereUniqueWithoutCustomerInput[]
    createMany?: PledgeCreateManyCustomerInputEnvelope
    set?: PledgeWhereUniqueInput | PledgeWhereUniqueInput[]
    disconnect?: PledgeWhereUniqueInput | PledgeWhereUniqueInput[]
    delete?: PledgeWhereUniqueInput | PledgeWhereUniqueInput[]
    connect?: PledgeWhereUniqueInput | PledgeWhereUniqueInput[]
    update?: PledgeUpdateWithWhereUniqueWithoutCustomerInput | PledgeUpdateWithWhereUniqueWithoutCustomerInput[]
    updateMany?: PledgeUpdateManyWithWhereWithoutCustomerInput | PledgeUpdateManyWithWhereWithoutCustomerInput[]
    deleteMany?: PledgeScalarWhereInput | PledgeScalarWhereInput[]
  }

  export type PledgeAuditCreateNestedManyWithoutPledgeInput = {
    create?: XOR<PledgeAuditCreateWithoutPledgeInput, PledgeAuditUncheckedCreateWithoutPledgeInput> | PledgeAuditCreateWithoutPledgeInput[] | PledgeAuditUncheckedCreateWithoutPledgeInput[]
    connectOrCreate?: PledgeAuditCreateOrConnectWithoutPledgeInput | PledgeAuditCreateOrConnectWithoutPledgeInput[]
    createMany?: PledgeAuditCreateManyPledgeInputEnvelope
    connect?: PledgeAuditWhereUniqueInput | PledgeAuditWhereUniqueInput[]
  }

  export type PledgeItemCreateNestedManyWithoutPledgeInput = {
    create?: XOR<PledgeItemCreateWithoutPledgeInput, PledgeItemUncheckedCreateWithoutPledgeInput> | PledgeItemCreateWithoutPledgeInput[] | PledgeItemUncheckedCreateWithoutPledgeInput[]
    connectOrCreate?: PledgeItemCreateOrConnectWithoutPledgeInput | PledgeItemCreateOrConnectWithoutPledgeInput[]
    createMany?: PledgeItemCreateManyPledgeInputEnvelope
    connect?: PledgeItemWhereUniqueInput | PledgeItemWhereUniqueInput[]
  }

  export type CustomerCreateNestedOneWithoutPledgesInput = {
    create?: XOR<CustomerCreateWithoutPledgesInput, CustomerUncheckedCreateWithoutPledgesInput>
    connectOrCreate?: CustomerCreateOrConnectWithoutPledgesInput
    connect?: CustomerWhereUniqueInput
  }

  export type TransactionCreateNestedManyWithoutPledgeInput = {
    create?: XOR<TransactionCreateWithoutPledgeInput, TransactionUncheckedCreateWithoutPledgeInput> | TransactionCreateWithoutPledgeInput[] | TransactionUncheckedCreateWithoutPledgeInput[]
    connectOrCreate?: TransactionCreateOrConnectWithoutPledgeInput | TransactionCreateOrConnectWithoutPledgeInput[]
    createMany?: TransactionCreateManyPledgeInputEnvelope
    connect?: TransactionWhereUniqueInput | TransactionWhereUniqueInput[]
  }

  export type PledgeAuditUncheckedCreateNestedManyWithoutPledgeInput = {
    create?: XOR<PledgeAuditCreateWithoutPledgeInput, PledgeAuditUncheckedCreateWithoutPledgeInput> | PledgeAuditCreateWithoutPledgeInput[] | PledgeAuditUncheckedCreateWithoutPledgeInput[]
    connectOrCreate?: PledgeAuditCreateOrConnectWithoutPledgeInput | PledgeAuditCreateOrConnectWithoutPledgeInput[]
    createMany?: PledgeAuditCreateManyPledgeInputEnvelope
    connect?: PledgeAuditWhereUniqueInput | PledgeAuditWhereUniqueInput[]
  }

  export type PledgeItemUncheckedCreateNestedManyWithoutPledgeInput = {
    create?: XOR<PledgeItemCreateWithoutPledgeInput, PledgeItemUncheckedCreateWithoutPledgeInput> | PledgeItemCreateWithoutPledgeInput[] | PledgeItemUncheckedCreateWithoutPledgeInput[]
    connectOrCreate?: PledgeItemCreateOrConnectWithoutPledgeInput | PledgeItemCreateOrConnectWithoutPledgeInput[]
    createMany?: PledgeItemCreateManyPledgeInputEnvelope
    connect?: PledgeItemWhereUniqueInput | PledgeItemWhereUniqueInput[]
  }

  export type TransactionUncheckedCreateNestedManyWithoutPledgeInput = {
    create?: XOR<TransactionCreateWithoutPledgeInput, TransactionUncheckedCreateWithoutPledgeInput> | TransactionCreateWithoutPledgeInput[] | TransactionUncheckedCreateWithoutPledgeInput[]
    connectOrCreate?: TransactionCreateOrConnectWithoutPledgeInput | TransactionCreateOrConnectWithoutPledgeInput[]
    createMany?: TransactionCreateManyPledgeInputEnvelope
    connect?: TransactionWhereUniqueInput | TransactionWhereUniqueInput[]
  }

  export type DecimalFieldUpdateOperationsInput = {
    set?: Decimal | DecimalJsLike | number | string
    increment?: Decimal | DecimalJsLike | number | string
    decrement?: Decimal | DecimalJsLike | number | string
    multiply?: Decimal | DecimalJsLike | number | string
    divide?: Decimal | DecimalJsLike | number | string
  }

  export type EnumCompoundingDurationFieldUpdateOperationsInput = {
    set?: $Enums.CompoundingDuration
  }

  export type NullableDecimalFieldUpdateOperationsInput = {
    set?: Decimal | DecimalJsLike | number | string | null
    increment?: Decimal | DecimalJsLike | number | string
    decrement?: Decimal | DecimalJsLike | number | string
    multiply?: Decimal | DecimalJsLike | number | string
    divide?: Decimal | DecimalJsLike | number | string
  }

  export type EnumPledgeStatusFieldUpdateOperationsInput = {
    set?: $Enums.PledgeStatus
  }

  export type IntFieldUpdateOperationsInput = {
    set?: number
    increment?: number
    decrement?: number
    multiply?: number
    divide?: number
  }

  export type PledgeAuditUpdateManyWithoutPledgeNestedInput = {
    create?: XOR<PledgeAuditCreateWithoutPledgeInput, PledgeAuditUncheckedCreateWithoutPledgeInput> | PledgeAuditCreateWithoutPledgeInput[] | PledgeAuditUncheckedCreateWithoutPledgeInput[]
    connectOrCreate?: PledgeAuditCreateOrConnectWithoutPledgeInput | PledgeAuditCreateOrConnectWithoutPledgeInput[]
    upsert?: PledgeAuditUpsertWithWhereUniqueWithoutPledgeInput | PledgeAuditUpsertWithWhereUniqueWithoutPledgeInput[]
    createMany?: PledgeAuditCreateManyPledgeInputEnvelope
    set?: PledgeAuditWhereUniqueInput | PledgeAuditWhereUniqueInput[]
    disconnect?: PledgeAuditWhereUniqueInput | PledgeAuditWhereUniqueInput[]
    delete?: PledgeAuditWhereUniqueInput | PledgeAuditWhereUniqueInput[]
    connect?: PledgeAuditWhereUniqueInput | PledgeAuditWhereUniqueInput[]
    update?: PledgeAuditUpdateWithWhereUniqueWithoutPledgeInput | PledgeAuditUpdateWithWhereUniqueWithoutPledgeInput[]
    updateMany?: PledgeAuditUpdateManyWithWhereWithoutPledgeInput | PledgeAuditUpdateManyWithWhereWithoutPledgeInput[]
    deleteMany?: PledgeAuditScalarWhereInput | PledgeAuditScalarWhereInput[]
  }

  export type PledgeItemUpdateManyWithoutPledgeNestedInput = {
    create?: XOR<PledgeItemCreateWithoutPledgeInput, PledgeItemUncheckedCreateWithoutPledgeInput> | PledgeItemCreateWithoutPledgeInput[] | PledgeItemUncheckedCreateWithoutPledgeInput[]
    connectOrCreate?: PledgeItemCreateOrConnectWithoutPledgeInput | PledgeItemCreateOrConnectWithoutPledgeInput[]
    upsert?: PledgeItemUpsertWithWhereUniqueWithoutPledgeInput | PledgeItemUpsertWithWhereUniqueWithoutPledgeInput[]
    createMany?: PledgeItemCreateManyPledgeInputEnvelope
    set?: PledgeItemWhereUniqueInput | PledgeItemWhereUniqueInput[]
    disconnect?: PledgeItemWhereUniqueInput | PledgeItemWhereUniqueInput[]
    delete?: PledgeItemWhereUniqueInput | PledgeItemWhereUniqueInput[]
    connect?: PledgeItemWhereUniqueInput | PledgeItemWhereUniqueInput[]
    update?: PledgeItemUpdateWithWhereUniqueWithoutPledgeInput | PledgeItemUpdateWithWhereUniqueWithoutPledgeInput[]
    updateMany?: PledgeItemUpdateManyWithWhereWithoutPledgeInput | PledgeItemUpdateManyWithWhereWithoutPledgeInput[]
    deleteMany?: PledgeItemScalarWhereInput | PledgeItemScalarWhereInput[]
  }

  export type CustomerUpdateOneRequiredWithoutPledgesNestedInput = {
    create?: XOR<CustomerCreateWithoutPledgesInput, CustomerUncheckedCreateWithoutPledgesInput>
    connectOrCreate?: CustomerCreateOrConnectWithoutPledgesInput
    upsert?: CustomerUpsertWithoutPledgesInput
    connect?: CustomerWhereUniqueInput
    update?: XOR<XOR<CustomerUpdateToOneWithWhereWithoutPledgesInput, CustomerUpdateWithoutPledgesInput>, CustomerUncheckedUpdateWithoutPledgesInput>
  }

  export type TransactionUpdateManyWithoutPledgeNestedInput = {
    create?: XOR<TransactionCreateWithoutPledgeInput, TransactionUncheckedCreateWithoutPledgeInput> | TransactionCreateWithoutPledgeInput[] | TransactionUncheckedCreateWithoutPledgeInput[]
    connectOrCreate?: TransactionCreateOrConnectWithoutPledgeInput | TransactionCreateOrConnectWithoutPledgeInput[]
    upsert?: TransactionUpsertWithWhereUniqueWithoutPledgeInput | TransactionUpsertWithWhereUniqueWithoutPledgeInput[]
    createMany?: TransactionCreateManyPledgeInputEnvelope
    set?: TransactionWhereUniqueInput | TransactionWhereUniqueInput[]
    disconnect?: TransactionWhereUniqueInput | TransactionWhereUniqueInput[]
    delete?: TransactionWhereUniqueInput | TransactionWhereUniqueInput[]
    connect?: TransactionWhereUniqueInput | TransactionWhereUniqueInput[]
    update?: TransactionUpdateWithWhereUniqueWithoutPledgeInput | TransactionUpdateWithWhereUniqueWithoutPledgeInput[]
    updateMany?: TransactionUpdateManyWithWhereWithoutPledgeInput | TransactionUpdateManyWithWhereWithoutPledgeInput[]
    deleteMany?: TransactionScalarWhereInput | TransactionScalarWhereInput[]
  }

  export type PledgeAuditUncheckedUpdateManyWithoutPledgeNestedInput = {
    create?: XOR<PledgeAuditCreateWithoutPledgeInput, PledgeAuditUncheckedCreateWithoutPledgeInput> | PledgeAuditCreateWithoutPledgeInput[] | PledgeAuditUncheckedCreateWithoutPledgeInput[]
    connectOrCreate?: PledgeAuditCreateOrConnectWithoutPledgeInput | PledgeAuditCreateOrConnectWithoutPledgeInput[]
    upsert?: PledgeAuditUpsertWithWhereUniqueWithoutPledgeInput | PledgeAuditUpsertWithWhereUniqueWithoutPledgeInput[]
    createMany?: PledgeAuditCreateManyPledgeInputEnvelope
    set?: PledgeAuditWhereUniqueInput | PledgeAuditWhereUniqueInput[]
    disconnect?: PledgeAuditWhereUniqueInput | PledgeAuditWhereUniqueInput[]
    delete?: PledgeAuditWhereUniqueInput | PledgeAuditWhereUniqueInput[]
    connect?: PledgeAuditWhereUniqueInput | PledgeAuditWhereUniqueInput[]
    update?: PledgeAuditUpdateWithWhereUniqueWithoutPledgeInput | PledgeAuditUpdateWithWhereUniqueWithoutPledgeInput[]
    updateMany?: PledgeAuditUpdateManyWithWhereWithoutPledgeInput | PledgeAuditUpdateManyWithWhereWithoutPledgeInput[]
    deleteMany?: PledgeAuditScalarWhereInput | PledgeAuditScalarWhereInput[]
  }

  export type PledgeItemUncheckedUpdateManyWithoutPledgeNestedInput = {
    create?: XOR<PledgeItemCreateWithoutPledgeInput, PledgeItemUncheckedCreateWithoutPledgeInput> | PledgeItemCreateWithoutPledgeInput[] | PledgeItemUncheckedCreateWithoutPledgeInput[]
    connectOrCreate?: PledgeItemCreateOrConnectWithoutPledgeInput | PledgeItemCreateOrConnectWithoutPledgeInput[]
    upsert?: PledgeItemUpsertWithWhereUniqueWithoutPledgeInput | PledgeItemUpsertWithWhereUniqueWithoutPledgeInput[]
    createMany?: PledgeItemCreateManyPledgeInputEnvelope
    set?: PledgeItemWhereUniqueInput | PledgeItemWhereUniqueInput[]
    disconnect?: PledgeItemWhereUniqueInput | PledgeItemWhereUniqueInput[]
    delete?: PledgeItemWhereUniqueInput | PledgeItemWhereUniqueInput[]
    connect?: PledgeItemWhereUniqueInput | PledgeItemWhereUniqueInput[]
    update?: PledgeItemUpdateWithWhereUniqueWithoutPledgeInput | PledgeItemUpdateWithWhereUniqueWithoutPledgeInput[]
    updateMany?: PledgeItemUpdateManyWithWhereWithoutPledgeInput | PledgeItemUpdateManyWithWhereWithoutPledgeInput[]
    deleteMany?: PledgeItemScalarWhereInput | PledgeItemScalarWhereInput[]
  }

  export type TransactionUncheckedUpdateManyWithoutPledgeNestedInput = {
    create?: XOR<TransactionCreateWithoutPledgeInput, TransactionUncheckedCreateWithoutPledgeInput> | TransactionCreateWithoutPledgeInput[] | TransactionUncheckedCreateWithoutPledgeInput[]
    connectOrCreate?: TransactionCreateOrConnectWithoutPledgeInput | TransactionCreateOrConnectWithoutPledgeInput[]
    upsert?: TransactionUpsertWithWhereUniqueWithoutPledgeInput | TransactionUpsertWithWhereUniqueWithoutPledgeInput[]
    createMany?: TransactionCreateManyPledgeInputEnvelope
    set?: TransactionWhereUniqueInput | TransactionWhereUniqueInput[]
    disconnect?: TransactionWhereUniqueInput | TransactionWhereUniqueInput[]
    delete?: TransactionWhereUniqueInput | TransactionWhereUniqueInput[]
    connect?: TransactionWhereUniqueInput | TransactionWhereUniqueInput[]
    update?: TransactionUpdateWithWhereUniqueWithoutPledgeInput | TransactionUpdateWithWhereUniqueWithoutPledgeInput[]
    updateMany?: TransactionUpdateManyWithWhereWithoutPledgeInput | TransactionUpdateManyWithWhereWithoutPledgeInput[]
    deleteMany?: TransactionScalarWhereInput | TransactionScalarWhereInput[]
  }

  export type PledgeCreateNestedOneWithoutItemsInput = {
    create?: XOR<PledgeCreateWithoutItemsInput, PledgeUncheckedCreateWithoutItemsInput>
    connectOrCreate?: PledgeCreateOrConnectWithoutItemsInput
    connect?: PledgeWhereUniqueInput
  }

  export type EnumItemTypeFieldUpdateOperationsInput = {
    set?: $Enums.ItemType
  }

  export type EnumMetalTypeFieldUpdateOperationsInput = {
    set?: $Enums.MetalType
  }

  export type PledgeUpdateOneRequiredWithoutItemsNestedInput = {
    create?: XOR<PledgeCreateWithoutItemsInput, PledgeUncheckedCreateWithoutItemsInput>
    connectOrCreate?: PledgeCreateOrConnectWithoutItemsInput
    upsert?: PledgeUpsertWithoutItemsInput
    connect?: PledgeWhereUniqueInput
    update?: XOR<XOR<PledgeUpdateToOneWithWhereWithoutItemsInput, PledgeUpdateWithoutItemsInput>, PledgeUncheckedUpdateWithoutItemsInput>
  }

  export type PledgeCreateNestedOneWithoutPledgeAuditsInput = {
    create?: XOR<PledgeCreateWithoutPledgeAuditsInput, PledgeUncheckedCreateWithoutPledgeAuditsInput>
    connectOrCreate?: PledgeCreateOrConnectWithoutPledgeAuditsInput
    connect?: PledgeWhereUniqueInput
  }

  export type EnumAuditActionFieldUpdateOperationsInput = {
    set?: $Enums.AuditAction
  }

  export type PledgeUpdateOneRequiredWithoutPledgeAuditsNestedInput = {
    create?: XOR<PledgeCreateWithoutPledgeAuditsInput, PledgeUncheckedCreateWithoutPledgeAuditsInput>
    connectOrCreate?: PledgeCreateOrConnectWithoutPledgeAuditsInput
    upsert?: PledgeUpsertWithoutPledgeAuditsInput
    connect?: PledgeWhereUniqueInput
    update?: XOR<XOR<PledgeUpdateToOneWithWhereWithoutPledgeAuditsInput, PledgeUpdateWithoutPledgeAuditsInput>, PledgeUncheckedUpdateWithoutPledgeAuditsInput>
  }

  export type PledgeCreateNestedOneWithoutTransactionsInput = {
    create?: XOR<PledgeCreateWithoutTransactionsInput, PledgeUncheckedCreateWithoutTransactionsInput>
    connectOrCreate?: PledgeCreateOrConnectWithoutTransactionsInput
    connect?: PledgeWhereUniqueInput
  }

  export type EnumTransactionTypeFieldUpdateOperationsInput = {
    set?: $Enums.TransactionType
  }

  export type PledgeUpdateOneRequiredWithoutTransactionsNestedInput = {
    create?: XOR<PledgeCreateWithoutTransactionsInput, PledgeUncheckedCreateWithoutTransactionsInput>
    connectOrCreate?: PledgeCreateOrConnectWithoutTransactionsInput
    upsert?: PledgeUpsertWithoutTransactionsInput
    connect?: PledgeWhereUniqueInput
    update?: XOR<XOR<PledgeUpdateToOneWithWhereWithoutTransactionsInput, PledgeUpdateWithoutTransactionsInput>, PledgeUncheckedUpdateWithoutTransactionsInput>
  }

  export type FloatFieldUpdateOperationsInput = {
    set?: number
    increment?: number
    decrement?: number
    multiply?: number
    divide?: number
  }

  export type NestedStringFilter<$PrismaModel = never> = {
    equals?: string | StringFieldRefInput<$PrismaModel>
    in?: string[] | ListStringFieldRefInput<$PrismaModel>
    notIn?: string[] | ListStringFieldRefInput<$PrismaModel>
    lt?: string | StringFieldRefInput<$PrismaModel>
    lte?: string | StringFieldRefInput<$PrismaModel>
    gt?: string | StringFieldRefInput<$PrismaModel>
    gte?: string | StringFieldRefInput<$PrismaModel>
    contains?: string | StringFieldRefInput<$PrismaModel>
    startsWith?: string | StringFieldRefInput<$PrismaModel>
    endsWith?: string | StringFieldRefInput<$PrismaModel>
    not?: NestedStringFilter<$PrismaModel> | string
  }

  export type NestedStringNullableFilter<$PrismaModel = never> = {
    equals?: string | StringFieldRefInput<$PrismaModel> | null
    in?: string[] | ListStringFieldRefInput<$PrismaModel> | null
    notIn?: string[] | ListStringFieldRefInput<$PrismaModel> | null
    lt?: string | StringFieldRefInput<$PrismaModel>
    lte?: string | StringFieldRefInput<$PrismaModel>
    gt?: string | StringFieldRefInput<$PrismaModel>
    gte?: string | StringFieldRefInput<$PrismaModel>
    contains?: string | StringFieldRefInput<$PrismaModel>
    startsWith?: string | StringFieldRefInput<$PrismaModel>
    endsWith?: string | StringFieldRefInput<$PrismaModel>
    not?: NestedStringNullableFilter<$PrismaModel> | string | null
  }

  export type NestedEnumGenderNullableFilter<$PrismaModel = never> = {
    equals?: $Enums.Gender | EnumGenderFieldRefInput<$PrismaModel> | null
    in?: $Enums.Gender[] | ListEnumGenderFieldRefInput<$PrismaModel> | null
    notIn?: $Enums.Gender[] | ListEnumGenderFieldRefInput<$PrismaModel> | null
    not?: NestedEnumGenderNullableFilter<$PrismaModel> | $Enums.Gender | null
  }

  export type NestedEnumSubscriptionStatusFilter<$PrismaModel = never> = {
    equals?: $Enums.SubscriptionStatus | EnumSubscriptionStatusFieldRefInput<$PrismaModel>
    in?: $Enums.SubscriptionStatus[] | ListEnumSubscriptionStatusFieldRefInput<$PrismaModel>
    notIn?: $Enums.SubscriptionStatus[] | ListEnumSubscriptionStatusFieldRefInput<$PrismaModel>
    not?: NestedEnumSubscriptionStatusFilter<$PrismaModel> | $Enums.SubscriptionStatus
  }

  export type NestedDateTimeNullableFilter<$PrismaModel = never> = {
    equals?: Date | string | DateTimeFieldRefInput<$PrismaModel> | null
    in?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel> | null
    notIn?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel> | null
    lt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    lte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    not?: NestedDateTimeNullableFilter<$PrismaModel> | Date | string | null
  }

  export type NestedEnumSubscriptionPlanNullableFilter<$PrismaModel = never> = {
    equals?: $Enums.SubscriptionPlan | EnumSubscriptionPlanFieldRefInput<$PrismaModel> | null
    in?: $Enums.SubscriptionPlan[] | ListEnumSubscriptionPlanFieldRefInput<$PrismaModel> | null
    notIn?: $Enums.SubscriptionPlan[] | ListEnumSubscriptionPlanFieldRefInput<$PrismaModel> | null
    not?: NestedEnumSubscriptionPlanNullableFilter<$PrismaModel> | $Enums.SubscriptionPlan | null
  }

  export type NestedBoolFilter<$PrismaModel = never> = {
    equals?: boolean | BooleanFieldRefInput<$PrismaModel>
    not?: NestedBoolFilter<$PrismaModel> | boolean
  }

  export type NestedDateTimeFilter<$PrismaModel = never> = {
    equals?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    in?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel>
    notIn?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel>
    lt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    lte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    not?: NestedDateTimeFilter<$PrismaModel> | Date | string
  }

  export type NestedStringWithAggregatesFilter<$PrismaModel = never> = {
    equals?: string | StringFieldRefInput<$PrismaModel>
    in?: string[] | ListStringFieldRefInput<$PrismaModel>
    notIn?: string[] | ListStringFieldRefInput<$PrismaModel>
    lt?: string | StringFieldRefInput<$PrismaModel>
    lte?: string | StringFieldRefInput<$PrismaModel>
    gt?: string | StringFieldRefInput<$PrismaModel>
    gte?: string | StringFieldRefInput<$PrismaModel>
    contains?: string | StringFieldRefInput<$PrismaModel>
    startsWith?: string | StringFieldRefInput<$PrismaModel>
    endsWith?: string | StringFieldRefInput<$PrismaModel>
    not?: NestedStringWithAggregatesFilter<$PrismaModel> | string
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedStringFilter<$PrismaModel>
    _max?: NestedStringFilter<$PrismaModel>
  }

  export type NestedIntFilter<$PrismaModel = never> = {
    equals?: number | IntFieldRefInput<$PrismaModel>
    in?: number[] | ListIntFieldRefInput<$PrismaModel>
    notIn?: number[] | ListIntFieldRefInput<$PrismaModel>
    lt?: number | IntFieldRefInput<$PrismaModel>
    lte?: number | IntFieldRefInput<$PrismaModel>
    gt?: number | IntFieldRefInput<$PrismaModel>
    gte?: number | IntFieldRefInput<$PrismaModel>
    not?: NestedIntFilter<$PrismaModel> | number
  }

  export type NestedStringNullableWithAggregatesFilter<$PrismaModel = never> = {
    equals?: string | StringFieldRefInput<$PrismaModel> | null
    in?: string[] | ListStringFieldRefInput<$PrismaModel> | null
    notIn?: string[] | ListStringFieldRefInput<$PrismaModel> | null
    lt?: string | StringFieldRefInput<$PrismaModel>
    lte?: string | StringFieldRefInput<$PrismaModel>
    gt?: string | StringFieldRefInput<$PrismaModel>
    gte?: string | StringFieldRefInput<$PrismaModel>
    contains?: string | StringFieldRefInput<$PrismaModel>
    startsWith?: string | StringFieldRefInput<$PrismaModel>
    endsWith?: string | StringFieldRefInput<$PrismaModel>
    not?: NestedStringNullableWithAggregatesFilter<$PrismaModel> | string | null
    _count?: NestedIntNullableFilter<$PrismaModel>
    _min?: NestedStringNullableFilter<$PrismaModel>
    _max?: NestedStringNullableFilter<$PrismaModel>
  }

  export type NestedIntNullableFilter<$PrismaModel = never> = {
    equals?: number | IntFieldRefInput<$PrismaModel> | null
    in?: number[] | ListIntFieldRefInput<$PrismaModel> | null
    notIn?: number[] | ListIntFieldRefInput<$PrismaModel> | null
    lt?: number | IntFieldRefInput<$PrismaModel>
    lte?: number | IntFieldRefInput<$PrismaModel>
    gt?: number | IntFieldRefInput<$PrismaModel>
    gte?: number | IntFieldRefInput<$PrismaModel>
    not?: NestedIntNullableFilter<$PrismaModel> | number | null
  }

  export type NestedEnumGenderNullableWithAggregatesFilter<$PrismaModel = never> = {
    equals?: $Enums.Gender | EnumGenderFieldRefInput<$PrismaModel> | null
    in?: $Enums.Gender[] | ListEnumGenderFieldRefInput<$PrismaModel> | null
    notIn?: $Enums.Gender[] | ListEnumGenderFieldRefInput<$PrismaModel> | null
    not?: NestedEnumGenderNullableWithAggregatesFilter<$PrismaModel> | $Enums.Gender | null
    _count?: NestedIntNullableFilter<$PrismaModel>
    _min?: NestedEnumGenderNullableFilter<$PrismaModel>
    _max?: NestedEnumGenderNullableFilter<$PrismaModel>
  }

  export type NestedEnumSubscriptionStatusWithAggregatesFilter<$PrismaModel = never> = {
    equals?: $Enums.SubscriptionStatus | EnumSubscriptionStatusFieldRefInput<$PrismaModel>
    in?: $Enums.SubscriptionStatus[] | ListEnumSubscriptionStatusFieldRefInput<$PrismaModel>
    notIn?: $Enums.SubscriptionStatus[] | ListEnumSubscriptionStatusFieldRefInput<$PrismaModel>
    not?: NestedEnumSubscriptionStatusWithAggregatesFilter<$PrismaModel> | $Enums.SubscriptionStatus
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedEnumSubscriptionStatusFilter<$PrismaModel>
    _max?: NestedEnumSubscriptionStatusFilter<$PrismaModel>
  }

  export type NestedDateTimeNullableWithAggregatesFilter<$PrismaModel = never> = {
    equals?: Date | string | DateTimeFieldRefInput<$PrismaModel> | null
    in?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel> | null
    notIn?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel> | null
    lt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    lte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    not?: NestedDateTimeNullableWithAggregatesFilter<$PrismaModel> | Date | string | null
    _count?: NestedIntNullableFilter<$PrismaModel>
    _min?: NestedDateTimeNullableFilter<$PrismaModel>
    _max?: NestedDateTimeNullableFilter<$PrismaModel>
  }

  export type NestedEnumSubscriptionPlanNullableWithAggregatesFilter<$PrismaModel = never> = {
    equals?: $Enums.SubscriptionPlan | EnumSubscriptionPlanFieldRefInput<$PrismaModel> | null
    in?: $Enums.SubscriptionPlan[] | ListEnumSubscriptionPlanFieldRefInput<$PrismaModel> | null
    notIn?: $Enums.SubscriptionPlan[] | ListEnumSubscriptionPlanFieldRefInput<$PrismaModel> | null
    not?: NestedEnumSubscriptionPlanNullableWithAggregatesFilter<$PrismaModel> | $Enums.SubscriptionPlan | null
    _count?: NestedIntNullableFilter<$PrismaModel>
    _min?: NestedEnumSubscriptionPlanNullableFilter<$PrismaModel>
    _max?: NestedEnumSubscriptionPlanNullableFilter<$PrismaModel>
  }

  export type NestedBoolWithAggregatesFilter<$PrismaModel = never> = {
    equals?: boolean | BooleanFieldRefInput<$PrismaModel>
    not?: NestedBoolWithAggregatesFilter<$PrismaModel> | boolean
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedBoolFilter<$PrismaModel>
    _max?: NestedBoolFilter<$PrismaModel>
  }

  export type NestedDateTimeWithAggregatesFilter<$PrismaModel = never> = {
    equals?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    in?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel>
    notIn?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel>
    lt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    lte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    not?: NestedDateTimeWithAggregatesFilter<$PrismaModel> | Date | string
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedDateTimeFilter<$PrismaModel>
    _max?: NestedDateTimeFilter<$PrismaModel>
  }

  export type NestedDecimalFilter<$PrismaModel = never> = {
    equals?: Decimal | DecimalJsLike | number | string | DecimalFieldRefInput<$PrismaModel>
    in?: Decimal[] | DecimalJsLike[] | number[] | string[] | ListDecimalFieldRefInput<$PrismaModel>
    notIn?: Decimal[] | DecimalJsLike[] | number[] | string[] | ListDecimalFieldRefInput<$PrismaModel>
    lt?: Decimal | DecimalJsLike | number | string | DecimalFieldRefInput<$PrismaModel>
    lte?: Decimal | DecimalJsLike | number | string | DecimalFieldRefInput<$PrismaModel>
    gt?: Decimal | DecimalJsLike | number | string | DecimalFieldRefInput<$PrismaModel>
    gte?: Decimal | DecimalJsLike | number | string | DecimalFieldRefInput<$PrismaModel>
    not?: NestedDecimalFilter<$PrismaModel> | Decimal | DecimalJsLike | number | string
  }

  export type NestedEnumCompoundingDurationFilter<$PrismaModel = never> = {
    equals?: $Enums.CompoundingDuration | EnumCompoundingDurationFieldRefInput<$PrismaModel>
    in?: $Enums.CompoundingDuration[] | ListEnumCompoundingDurationFieldRefInput<$PrismaModel>
    notIn?: $Enums.CompoundingDuration[] | ListEnumCompoundingDurationFieldRefInput<$PrismaModel>
    not?: NestedEnumCompoundingDurationFilter<$PrismaModel> | $Enums.CompoundingDuration
  }

  export type NestedDecimalNullableFilter<$PrismaModel = never> = {
    equals?: Decimal | DecimalJsLike | number | string | DecimalFieldRefInput<$PrismaModel> | null
    in?: Decimal[] | DecimalJsLike[] | number[] | string[] | ListDecimalFieldRefInput<$PrismaModel> | null
    notIn?: Decimal[] | DecimalJsLike[] | number[] | string[] | ListDecimalFieldRefInput<$PrismaModel> | null
    lt?: Decimal | DecimalJsLike | number | string | DecimalFieldRefInput<$PrismaModel>
    lte?: Decimal | DecimalJsLike | number | string | DecimalFieldRefInput<$PrismaModel>
    gt?: Decimal | DecimalJsLike | number | string | DecimalFieldRefInput<$PrismaModel>
    gte?: Decimal | DecimalJsLike | number | string | DecimalFieldRefInput<$PrismaModel>
    not?: NestedDecimalNullableFilter<$PrismaModel> | Decimal | DecimalJsLike | number | string | null
  }

  export type NestedEnumPledgeStatusFilter<$PrismaModel = never> = {
    equals?: $Enums.PledgeStatus | EnumPledgeStatusFieldRefInput<$PrismaModel>
    in?: $Enums.PledgeStatus[] | ListEnumPledgeStatusFieldRefInput<$PrismaModel>
    notIn?: $Enums.PledgeStatus[] | ListEnumPledgeStatusFieldRefInput<$PrismaModel>
    not?: NestedEnumPledgeStatusFilter<$PrismaModel> | $Enums.PledgeStatus
  }

  export type NestedDecimalWithAggregatesFilter<$PrismaModel = never> = {
    equals?: Decimal | DecimalJsLike | number | string | DecimalFieldRefInput<$PrismaModel>
    in?: Decimal[] | DecimalJsLike[] | number[] | string[] | ListDecimalFieldRefInput<$PrismaModel>
    notIn?: Decimal[] | DecimalJsLike[] | number[] | string[] | ListDecimalFieldRefInput<$PrismaModel>
    lt?: Decimal | DecimalJsLike | number | string | DecimalFieldRefInput<$PrismaModel>
    lte?: Decimal | DecimalJsLike | number | string | DecimalFieldRefInput<$PrismaModel>
    gt?: Decimal | DecimalJsLike | number | string | DecimalFieldRefInput<$PrismaModel>
    gte?: Decimal | DecimalJsLike | number | string | DecimalFieldRefInput<$PrismaModel>
    not?: NestedDecimalWithAggregatesFilter<$PrismaModel> | Decimal | DecimalJsLike | number | string
    _count?: NestedIntFilter<$PrismaModel>
    _avg?: NestedDecimalFilter<$PrismaModel>
    _sum?: NestedDecimalFilter<$PrismaModel>
    _min?: NestedDecimalFilter<$PrismaModel>
    _max?: NestedDecimalFilter<$PrismaModel>
  }

  export type NestedEnumCompoundingDurationWithAggregatesFilter<$PrismaModel = never> = {
    equals?: $Enums.CompoundingDuration | EnumCompoundingDurationFieldRefInput<$PrismaModel>
    in?: $Enums.CompoundingDuration[] | ListEnumCompoundingDurationFieldRefInput<$PrismaModel>
    notIn?: $Enums.CompoundingDuration[] | ListEnumCompoundingDurationFieldRefInput<$PrismaModel>
    not?: NestedEnumCompoundingDurationWithAggregatesFilter<$PrismaModel> | $Enums.CompoundingDuration
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedEnumCompoundingDurationFilter<$PrismaModel>
    _max?: NestedEnumCompoundingDurationFilter<$PrismaModel>
  }

  export type NestedDecimalNullableWithAggregatesFilter<$PrismaModel = never> = {
    equals?: Decimal | DecimalJsLike | number | string | DecimalFieldRefInput<$PrismaModel> | null
    in?: Decimal[] | DecimalJsLike[] | number[] | string[] | ListDecimalFieldRefInput<$PrismaModel> | null
    notIn?: Decimal[] | DecimalJsLike[] | number[] | string[] | ListDecimalFieldRefInput<$PrismaModel> | null
    lt?: Decimal | DecimalJsLike | number | string | DecimalFieldRefInput<$PrismaModel>
    lte?: Decimal | DecimalJsLike | number | string | DecimalFieldRefInput<$PrismaModel>
    gt?: Decimal | DecimalJsLike | number | string | DecimalFieldRefInput<$PrismaModel>
    gte?: Decimal | DecimalJsLike | number | string | DecimalFieldRefInput<$PrismaModel>
    not?: NestedDecimalNullableWithAggregatesFilter<$PrismaModel> | Decimal | DecimalJsLike | number | string | null
    _count?: NestedIntNullableFilter<$PrismaModel>
    _avg?: NestedDecimalNullableFilter<$PrismaModel>
    _sum?: NestedDecimalNullableFilter<$PrismaModel>
    _min?: NestedDecimalNullableFilter<$PrismaModel>
    _max?: NestedDecimalNullableFilter<$PrismaModel>
  }

  export type NestedEnumPledgeStatusWithAggregatesFilter<$PrismaModel = never> = {
    equals?: $Enums.PledgeStatus | EnumPledgeStatusFieldRefInput<$PrismaModel>
    in?: $Enums.PledgeStatus[] | ListEnumPledgeStatusFieldRefInput<$PrismaModel>
    notIn?: $Enums.PledgeStatus[] | ListEnumPledgeStatusFieldRefInput<$PrismaModel>
    not?: NestedEnumPledgeStatusWithAggregatesFilter<$PrismaModel> | $Enums.PledgeStatus
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedEnumPledgeStatusFilter<$PrismaModel>
    _max?: NestedEnumPledgeStatusFilter<$PrismaModel>
  }

  export type NestedIntWithAggregatesFilter<$PrismaModel = never> = {
    equals?: number | IntFieldRefInput<$PrismaModel>
    in?: number[] | ListIntFieldRefInput<$PrismaModel>
    notIn?: number[] | ListIntFieldRefInput<$PrismaModel>
    lt?: number | IntFieldRefInput<$PrismaModel>
    lte?: number | IntFieldRefInput<$PrismaModel>
    gt?: number | IntFieldRefInput<$PrismaModel>
    gte?: number | IntFieldRefInput<$PrismaModel>
    not?: NestedIntWithAggregatesFilter<$PrismaModel> | number
    _count?: NestedIntFilter<$PrismaModel>
    _avg?: NestedFloatFilter<$PrismaModel>
    _sum?: NestedIntFilter<$PrismaModel>
    _min?: NestedIntFilter<$PrismaModel>
    _max?: NestedIntFilter<$PrismaModel>
  }

  export type NestedFloatFilter<$PrismaModel = never> = {
    equals?: number | FloatFieldRefInput<$PrismaModel>
    in?: number[] | ListFloatFieldRefInput<$PrismaModel>
    notIn?: number[] | ListFloatFieldRefInput<$PrismaModel>
    lt?: number | FloatFieldRefInput<$PrismaModel>
    lte?: number | FloatFieldRefInput<$PrismaModel>
    gt?: number | FloatFieldRefInput<$PrismaModel>
    gte?: number | FloatFieldRefInput<$PrismaModel>
    not?: NestedFloatFilter<$PrismaModel> | number
  }

  export type NestedEnumItemTypeFilter<$PrismaModel = never> = {
    equals?: $Enums.ItemType | EnumItemTypeFieldRefInput<$PrismaModel>
    in?: $Enums.ItemType[] | ListEnumItemTypeFieldRefInput<$PrismaModel>
    notIn?: $Enums.ItemType[] | ListEnumItemTypeFieldRefInput<$PrismaModel>
    not?: NestedEnumItemTypeFilter<$PrismaModel> | $Enums.ItemType
  }

  export type NestedEnumMetalTypeFilter<$PrismaModel = never> = {
    equals?: $Enums.MetalType | EnumMetalTypeFieldRefInput<$PrismaModel>
    in?: $Enums.MetalType[] | ListEnumMetalTypeFieldRefInput<$PrismaModel>
    notIn?: $Enums.MetalType[] | ListEnumMetalTypeFieldRefInput<$PrismaModel>
    not?: NestedEnumMetalTypeFilter<$PrismaModel> | $Enums.MetalType
  }

  export type NestedEnumItemTypeWithAggregatesFilter<$PrismaModel = never> = {
    equals?: $Enums.ItemType | EnumItemTypeFieldRefInput<$PrismaModel>
    in?: $Enums.ItemType[] | ListEnumItemTypeFieldRefInput<$PrismaModel>
    notIn?: $Enums.ItemType[] | ListEnumItemTypeFieldRefInput<$PrismaModel>
    not?: NestedEnumItemTypeWithAggregatesFilter<$PrismaModel> | $Enums.ItemType
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedEnumItemTypeFilter<$PrismaModel>
    _max?: NestedEnumItemTypeFilter<$PrismaModel>
  }

  export type NestedEnumMetalTypeWithAggregatesFilter<$PrismaModel = never> = {
    equals?: $Enums.MetalType | EnumMetalTypeFieldRefInput<$PrismaModel>
    in?: $Enums.MetalType[] | ListEnumMetalTypeFieldRefInput<$PrismaModel>
    notIn?: $Enums.MetalType[] | ListEnumMetalTypeFieldRefInput<$PrismaModel>
    not?: NestedEnumMetalTypeWithAggregatesFilter<$PrismaModel> | $Enums.MetalType
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedEnumMetalTypeFilter<$PrismaModel>
    _max?: NestedEnumMetalTypeFilter<$PrismaModel>
  }

  export type NestedEnumAuditActionFilter<$PrismaModel = never> = {
    equals?: $Enums.AuditAction | EnumAuditActionFieldRefInput<$PrismaModel>
    in?: $Enums.AuditAction[] | ListEnumAuditActionFieldRefInput<$PrismaModel>
    notIn?: $Enums.AuditAction[] | ListEnumAuditActionFieldRefInput<$PrismaModel>
    not?: NestedEnumAuditActionFilter<$PrismaModel> | $Enums.AuditAction
  }

  export type NestedEnumAuditActionWithAggregatesFilter<$PrismaModel = never> = {
    equals?: $Enums.AuditAction | EnumAuditActionFieldRefInput<$PrismaModel>
    in?: $Enums.AuditAction[] | ListEnumAuditActionFieldRefInput<$PrismaModel>
    notIn?: $Enums.AuditAction[] | ListEnumAuditActionFieldRefInput<$PrismaModel>
    not?: NestedEnumAuditActionWithAggregatesFilter<$PrismaModel> | $Enums.AuditAction
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedEnumAuditActionFilter<$PrismaModel>
    _max?: NestedEnumAuditActionFilter<$PrismaModel>
  }

  export type NestedEnumTransactionTypeFilter<$PrismaModel = never> = {
    equals?: $Enums.TransactionType | EnumTransactionTypeFieldRefInput<$PrismaModel>
    in?: $Enums.TransactionType[] | ListEnumTransactionTypeFieldRefInput<$PrismaModel>
    notIn?: $Enums.TransactionType[] | ListEnumTransactionTypeFieldRefInput<$PrismaModel>
    not?: NestedEnumTransactionTypeFilter<$PrismaModel> | $Enums.TransactionType
  }

  export type NestedEnumTransactionTypeWithAggregatesFilter<$PrismaModel = never> = {
    equals?: $Enums.TransactionType | EnumTransactionTypeFieldRefInput<$PrismaModel>
    in?: $Enums.TransactionType[] | ListEnumTransactionTypeFieldRefInput<$PrismaModel>
    notIn?: $Enums.TransactionType[] | ListEnumTransactionTypeFieldRefInput<$PrismaModel>
    not?: NestedEnumTransactionTypeWithAggregatesFilter<$PrismaModel> | $Enums.TransactionType
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedEnumTransactionTypeFilter<$PrismaModel>
    _max?: NestedEnumTransactionTypeFilter<$PrismaModel>
  }

  export type NestedFloatWithAggregatesFilter<$PrismaModel = never> = {
    equals?: number | FloatFieldRefInput<$PrismaModel>
    in?: number[] | ListFloatFieldRefInput<$PrismaModel>
    notIn?: number[] | ListFloatFieldRefInput<$PrismaModel>
    lt?: number | FloatFieldRefInput<$PrismaModel>
    lte?: number | FloatFieldRefInput<$PrismaModel>
    gt?: number | FloatFieldRefInput<$PrismaModel>
    gte?: number | FloatFieldRefInput<$PrismaModel>
    not?: NestedFloatWithAggregatesFilter<$PrismaModel> | number
    _count?: NestedIntFilter<$PrismaModel>
    _avg?: NestedFloatFilter<$PrismaModel>
    _sum?: NestedFloatFilter<$PrismaModel>
    _min?: NestedFloatFilter<$PrismaModel>
    _max?: NestedFloatFilter<$PrismaModel>
  }

  export type CustomerCreateWithoutUserInput = {
    id?: string
    name: string
    region: string
    address: string
    mobile?: string | null
    viewToken?: string
    idProofImg?: string | null
    customerImg?: string | null
    aadharNo?: string | null
    remark?: string | null
    deletedAt?: Date | string | null
    createdAt?: Date | string
    updatedAt?: Date | string
    gender?: $Enums.Gender | null
    pledges?: PledgeCreateNestedManyWithoutCustomerInput
  }

  export type CustomerUncheckedCreateWithoutUserInput = {
    id?: string
    name: string
    region: string
    address: string
    mobile?: string | null
    viewToken?: string
    idProofImg?: string | null
    customerImg?: string | null
    aadharNo?: string | null
    remark?: string | null
    deletedAt?: Date | string | null
    createdAt?: Date | string
    updatedAt?: Date | string
    gender?: $Enums.Gender | null
    pledges?: PledgeUncheckedCreateNestedManyWithoutCustomerInput
  }

  export type CustomerCreateOrConnectWithoutUserInput = {
    where: CustomerWhereUniqueInput
    create: XOR<CustomerCreateWithoutUserInput, CustomerUncheckedCreateWithoutUserInput>
  }

  export type CustomerCreateManyUserInputEnvelope = {
    data: CustomerCreateManyUserInput | CustomerCreateManyUserInput[]
    skipDuplicates?: boolean
  }

  export type CustomerUpsertWithWhereUniqueWithoutUserInput = {
    where: CustomerWhereUniqueInput
    update: XOR<CustomerUpdateWithoutUserInput, CustomerUncheckedUpdateWithoutUserInput>
    create: XOR<CustomerCreateWithoutUserInput, CustomerUncheckedCreateWithoutUserInput>
  }

  export type CustomerUpdateWithWhereUniqueWithoutUserInput = {
    where: CustomerWhereUniqueInput
    data: XOR<CustomerUpdateWithoutUserInput, CustomerUncheckedUpdateWithoutUserInput>
  }

  export type CustomerUpdateManyWithWhereWithoutUserInput = {
    where: CustomerScalarWhereInput
    data: XOR<CustomerUpdateManyMutationInput, CustomerUncheckedUpdateManyWithoutUserInput>
  }

  export type CustomerScalarWhereInput = {
    AND?: CustomerScalarWhereInput | CustomerScalarWhereInput[]
    OR?: CustomerScalarWhereInput[]
    NOT?: CustomerScalarWhereInput | CustomerScalarWhereInput[]
    id?: StringFilter<"Customer"> | string
    userId?: StringFilter<"Customer"> | string
    name?: StringFilter<"Customer"> | string
    region?: StringFilter<"Customer"> | string
    address?: StringFilter<"Customer"> | string
    mobile?: StringNullableFilter<"Customer"> | string | null
    viewToken?: StringFilter<"Customer"> | string
    idProofImg?: StringNullableFilter<"Customer"> | string | null
    customerImg?: StringNullableFilter<"Customer"> | string | null
    aadharNo?: StringNullableFilter<"Customer"> | string | null
    remark?: StringNullableFilter<"Customer"> | string | null
    deletedAt?: DateTimeNullableFilter<"Customer"> | Date | string | null
    createdAt?: DateTimeFilter<"Customer"> | Date | string
    updatedAt?: DateTimeFilter<"Customer"> | Date | string
    gender?: EnumGenderNullableFilter<"Customer"> | $Enums.Gender | null
  }

  export type PledgeCreateWithoutCustomerInput = {
    id?: string
    pledgeDate: Date | string
    loanAmount: Decimal | DecimalJsLike | number | string
    interestRate: Decimal | DecimalJsLike | number | string
    compoundingDuration: $Enums.CompoundingDuration
    allowCompounding?: boolean
    itemPhoto?: string | null
    remark?: string | null
    durationMonths?: Decimal | DecimalJsLike | number | string | null
    status: $Enums.PledgeStatus
    releaseDate?: Date | string | null
    netWeightOfGold?: Decimal | DecimalJsLike | number | string
    netWeightOfSilver?: Decimal | DecimalJsLike | number | string
    totalInterest?: Decimal | DecimalJsLike | number | string | null
    receivableAmount?: Decimal | DecimalJsLike | number | string | null
    calculationVersion?: number
    createdAt?: Date | string
    updatedAt?: Date | string
    pledgeAudits?: PledgeAuditCreateNestedManyWithoutPledgeInput
    items?: PledgeItemCreateNestedManyWithoutPledgeInput
    transactions?: TransactionCreateNestedManyWithoutPledgeInput
  }

  export type PledgeUncheckedCreateWithoutCustomerInput = {
    id?: string
    pledgeDate: Date | string
    loanAmount: Decimal | DecimalJsLike | number | string
    interestRate: Decimal | DecimalJsLike | number | string
    compoundingDuration: $Enums.CompoundingDuration
    allowCompounding?: boolean
    itemPhoto?: string | null
    remark?: string | null
    durationMonths?: Decimal | DecimalJsLike | number | string | null
    status: $Enums.PledgeStatus
    releaseDate?: Date | string | null
    netWeightOfGold?: Decimal | DecimalJsLike | number | string
    netWeightOfSilver?: Decimal | DecimalJsLike | number | string
    totalInterest?: Decimal | DecimalJsLike | number | string | null
    receivableAmount?: Decimal | DecimalJsLike | number | string | null
    calculationVersion?: number
    createdAt?: Date | string
    updatedAt?: Date | string
    pledgeAudits?: PledgeAuditUncheckedCreateNestedManyWithoutPledgeInput
    items?: PledgeItemUncheckedCreateNestedManyWithoutPledgeInput
    transactions?: TransactionUncheckedCreateNestedManyWithoutPledgeInput
  }

  export type PledgeCreateOrConnectWithoutCustomerInput = {
    where: PledgeWhereUniqueInput
    create: XOR<PledgeCreateWithoutCustomerInput, PledgeUncheckedCreateWithoutCustomerInput>
  }

  export type PledgeCreateManyCustomerInputEnvelope = {
    data: PledgeCreateManyCustomerInput | PledgeCreateManyCustomerInput[]
    skipDuplicates?: boolean
  }

  export type UserCreateWithoutCustomersInput = {
    id?: string
    clerkUserId: string
    username: string
    email?: string | null
    mobile?: string | null
    firstName?: string | null
    lastName?: string | null
    shopName?: string | null
    address?: string | null
    gender?: $Enums.Gender | null
    profileImageUrl?: string | null
    subscriptionStatus?: $Enums.SubscriptionStatus
    subscriptionEndDate?: Date | string | null
    razorpaySubscriptionId?: string | null
    subscriptionPlan?: $Enums.SubscriptionPlan | null
    razorpayPaymentId?: string | null
    subscriptionCreatedAt?: Date | string | null
    hadTrial?: boolean
    isActive?: boolean
    lastLoginAt?: Date | string | null
    deletedAt?: Date | string | null
    createdAt?: Date | string
    updatedAt?: Date | string
  }

  export type UserUncheckedCreateWithoutCustomersInput = {
    id?: string
    clerkUserId: string
    username: string
    email?: string | null
    mobile?: string | null
    firstName?: string | null
    lastName?: string | null
    shopName?: string | null
    address?: string | null
    gender?: $Enums.Gender | null
    profileImageUrl?: string | null
    subscriptionStatus?: $Enums.SubscriptionStatus
    subscriptionEndDate?: Date | string | null
    razorpaySubscriptionId?: string | null
    subscriptionPlan?: $Enums.SubscriptionPlan | null
    razorpayPaymentId?: string | null
    subscriptionCreatedAt?: Date | string | null
    hadTrial?: boolean
    isActive?: boolean
    lastLoginAt?: Date | string | null
    deletedAt?: Date | string | null
    createdAt?: Date | string
    updatedAt?: Date | string
  }

  export type UserCreateOrConnectWithoutCustomersInput = {
    where: UserWhereUniqueInput
    create: XOR<UserCreateWithoutCustomersInput, UserUncheckedCreateWithoutCustomersInput>
  }

  export type PledgeUpsertWithWhereUniqueWithoutCustomerInput = {
    where: PledgeWhereUniqueInput
    update: XOR<PledgeUpdateWithoutCustomerInput, PledgeUncheckedUpdateWithoutCustomerInput>
    create: XOR<PledgeCreateWithoutCustomerInput, PledgeUncheckedCreateWithoutCustomerInput>
  }

  export type PledgeUpdateWithWhereUniqueWithoutCustomerInput = {
    where: PledgeWhereUniqueInput
    data: XOR<PledgeUpdateWithoutCustomerInput, PledgeUncheckedUpdateWithoutCustomerInput>
  }

  export type PledgeUpdateManyWithWhereWithoutCustomerInput = {
    where: PledgeScalarWhereInput
    data: XOR<PledgeUpdateManyMutationInput, PledgeUncheckedUpdateManyWithoutCustomerInput>
  }

  export type PledgeScalarWhereInput = {
    AND?: PledgeScalarWhereInput | PledgeScalarWhereInput[]
    OR?: PledgeScalarWhereInput[]
    NOT?: PledgeScalarWhereInput | PledgeScalarWhereInput[]
    id?: StringFilter<"Pledge"> | string
    customerId?: StringFilter<"Pledge"> | string
    pledgeDate?: DateTimeFilter<"Pledge"> | Date | string
    loanAmount?: DecimalFilter<"Pledge"> | Decimal | DecimalJsLike | number | string
    interestRate?: DecimalFilter<"Pledge"> | Decimal | DecimalJsLike | number | string
    compoundingDuration?: EnumCompoundingDurationFilter<"Pledge"> | $Enums.CompoundingDuration
    allowCompounding?: BoolFilter<"Pledge"> | boolean
    itemPhoto?: StringNullableFilter<"Pledge"> | string | null
    remark?: StringNullableFilter<"Pledge"> | string | null
    durationMonths?: DecimalNullableFilter<"Pledge"> | Decimal | DecimalJsLike | number | string | null
    status?: EnumPledgeStatusFilter<"Pledge"> | $Enums.PledgeStatus
    releaseDate?: DateTimeNullableFilter<"Pledge"> | Date | string | null
    netWeightOfGold?: DecimalFilter<"Pledge"> | Decimal | DecimalJsLike | number | string
    netWeightOfSilver?: DecimalFilter<"Pledge"> | Decimal | DecimalJsLike | number | string
    totalInterest?: DecimalNullableFilter<"Pledge"> | Decimal | DecimalJsLike | number | string | null
    receivableAmount?: DecimalNullableFilter<"Pledge"> | Decimal | DecimalJsLike | number | string | null
    calculationVersion?: IntFilter<"Pledge"> | number
    createdAt?: DateTimeFilter<"Pledge"> | Date | string
    updatedAt?: DateTimeFilter<"Pledge"> | Date | string
  }

  export type UserUpsertWithoutCustomersInput = {
    update: XOR<UserUpdateWithoutCustomersInput, UserUncheckedUpdateWithoutCustomersInput>
    create: XOR<UserCreateWithoutCustomersInput, UserUncheckedCreateWithoutCustomersInput>
    where?: UserWhereInput
  }

  export type UserUpdateToOneWithWhereWithoutCustomersInput = {
    where?: UserWhereInput
    data: XOR<UserUpdateWithoutCustomersInput, UserUncheckedUpdateWithoutCustomersInput>
  }

  export type UserUpdateWithoutCustomersInput = {
    id?: StringFieldUpdateOperationsInput | string
    clerkUserId?: StringFieldUpdateOperationsInput | string
    username?: StringFieldUpdateOperationsInput | string
    email?: NullableStringFieldUpdateOperationsInput | string | null
    mobile?: NullableStringFieldUpdateOperationsInput | string | null
    firstName?: NullableStringFieldUpdateOperationsInput | string | null
    lastName?: NullableStringFieldUpdateOperationsInput | string | null
    shopName?: NullableStringFieldUpdateOperationsInput | string | null
    address?: NullableStringFieldUpdateOperationsInput | string | null
    gender?: NullableEnumGenderFieldUpdateOperationsInput | $Enums.Gender | null
    profileImageUrl?: NullableStringFieldUpdateOperationsInput | string | null
    subscriptionStatus?: EnumSubscriptionStatusFieldUpdateOperationsInput | $Enums.SubscriptionStatus
    subscriptionEndDate?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    razorpaySubscriptionId?: NullableStringFieldUpdateOperationsInput | string | null
    subscriptionPlan?: NullableEnumSubscriptionPlanFieldUpdateOperationsInput | $Enums.SubscriptionPlan | null
    razorpayPaymentId?: NullableStringFieldUpdateOperationsInput | string | null
    subscriptionCreatedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    hadTrial?: BoolFieldUpdateOperationsInput | boolean
    isActive?: BoolFieldUpdateOperationsInput | boolean
    lastLoginAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    deletedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type UserUncheckedUpdateWithoutCustomersInput = {
    id?: StringFieldUpdateOperationsInput | string
    clerkUserId?: StringFieldUpdateOperationsInput | string
    username?: StringFieldUpdateOperationsInput | string
    email?: NullableStringFieldUpdateOperationsInput | string | null
    mobile?: NullableStringFieldUpdateOperationsInput | string | null
    firstName?: NullableStringFieldUpdateOperationsInput | string | null
    lastName?: NullableStringFieldUpdateOperationsInput | string | null
    shopName?: NullableStringFieldUpdateOperationsInput | string | null
    address?: NullableStringFieldUpdateOperationsInput | string | null
    gender?: NullableEnumGenderFieldUpdateOperationsInput | $Enums.Gender | null
    profileImageUrl?: NullableStringFieldUpdateOperationsInput | string | null
    subscriptionStatus?: EnumSubscriptionStatusFieldUpdateOperationsInput | $Enums.SubscriptionStatus
    subscriptionEndDate?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    razorpaySubscriptionId?: NullableStringFieldUpdateOperationsInput | string | null
    subscriptionPlan?: NullableEnumSubscriptionPlanFieldUpdateOperationsInput | $Enums.SubscriptionPlan | null
    razorpayPaymentId?: NullableStringFieldUpdateOperationsInput | string | null
    subscriptionCreatedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    hadTrial?: BoolFieldUpdateOperationsInput | boolean
    isActive?: BoolFieldUpdateOperationsInput | boolean
    lastLoginAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    deletedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type PledgeAuditCreateWithoutPledgeInput = {
    id?: string
    action: $Enums.AuditAction
    principal: Decimal | DecimalJsLike | number | string
    interestRate: Decimal | DecimalJsLike | number | string
    allowCompounding: boolean
    compoundingDuration: $Enums.CompoundingDuration
    calculationVersion: number
    durationMonths?: Decimal | DecimalJsLike | number | string | null
    netWeightOfGold: Decimal | DecimalJsLike | number | string
    netWeightOfSilver: Decimal | DecimalJsLike | number | string
    goldPricePerGram?: Decimal | DecimalJsLike | number | string | null
    silverPricePerGram?: Decimal | DecimalJsLike | number | string | null
    marketValueAtRelease?: Decimal | DecimalJsLike | number | string | null
    ltvAtRelease?: Decimal | DecimalJsLike | number | string | null
    totalInterest?: Decimal | DecimalJsLike | number | string | null
    receivableAmount?: Decimal | DecimalJsLike | number | string | null
    releaseDate?: Date | string | null
    createdAt?: Date | string
  }

  export type PledgeAuditUncheckedCreateWithoutPledgeInput = {
    id?: string
    action: $Enums.AuditAction
    principal: Decimal | DecimalJsLike | number | string
    interestRate: Decimal | DecimalJsLike | number | string
    allowCompounding: boolean
    compoundingDuration: $Enums.CompoundingDuration
    calculationVersion: number
    durationMonths?: Decimal | DecimalJsLike | number | string | null
    netWeightOfGold: Decimal | DecimalJsLike | number | string
    netWeightOfSilver: Decimal | DecimalJsLike | number | string
    goldPricePerGram?: Decimal | DecimalJsLike | number | string | null
    silverPricePerGram?: Decimal | DecimalJsLike | number | string | null
    marketValueAtRelease?: Decimal | DecimalJsLike | number | string | null
    ltvAtRelease?: Decimal | DecimalJsLike | number | string | null
    totalInterest?: Decimal | DecimalJsLike | number | string | null
    receivableAmount?: Decimal | DecimalJsLike | number | string | null
    releaseDate?: Date | string | null
    createdAt?: Date | string
  }

  export type PledgeAuditCreateOrConnectWithoutPledgeInput = {
    where: PledgeAuditWhereUniqueInput
    create: XOR<PledgeAuditCreateWithoutPledgeInput, PledgeAuditUncheckedCreateWithoutPledgeInput>
  }

  export type PledgeAuditCreateManyPledgeInputEnvelope = {
    data: PledgeAuditCreateManyPledgeInput | PledgeAuditCreateManyPledgeInput[]
    skipDuplicates?: boolean
  }

  export type PledgeItemCreateWithoutPledgeInput = {
    id?: string
    itemType: $Enums.ItemType
    metalType: $Enums.MetalType
    itemName?: string | null
    quantity?: number
    grossWeight: Decimal | DecimalJsLike | number | string
    netWeight: Decimal | DecimalJsLike | number | string
    purity: Decimal | DecimalJsLike | number | string
    netWeightOfMetal: Decimal | DecimalJsLike | number | string
  }

  export type PledgeItemUncheckedCreateWithoutPledgeInput = {
    id?: string
    itemType: $Enums.ItemType
    metalType: $Enums.MetalType
    itemName?: string | null
    quantity?: number
    grossWeight: Decimal | DecimalJsLike | number | string
    netWeight: Decimal | DecimalJsLike | number | string
    purity: Decimal | DecimalJsLike | number | string
    netWeightOfMetal: Decimal | DecimalJsLike | number | string
  }

  export type PledgeItemCreateOrConnectWithoutPledgeInput = {
    where: PledgeItemWhereUniqueInput
    create: XOR<PledgeItemCreateWithoutPledgeInput, PledgeItemUncheckedCreateWithoutPledgeInput>
  }

  export type PledgeItemCreateManyPledgeInputEnvelope = {
    data: PledgeItemCreateManyPledgeInput | PledgeItemCreateManyPledgeInput[]
    skipDuplicates?: boolean
  }

  export type CustomerCreateWithoutPledgesInput = {
    id?: string
    name: string
    region: string
    address: string
    mobile?: string | null
    viewToken?: string
    idProofImg?: string | null
    customerImg?: string | null
    aadharNo?: string | null
    remark?: string | null
    deletedAt?: Date | string | null
    createdAt?: Date | string
    updatedAt?: Date | string
    gender?: $Enums.Gender | null
    user: UserCreateNestedOneWithoutCustomersInput
  }

  export type CustomerUncheckedCreateWithoutPledgesInput = {
    id?: string
    userId: string
    name: string
    region: string
    address: string
    mobile?: string | null
    viewToken?: string
    idProofImg?: string | null
    customerImg?: string | null
    aadharNo?: string | null
    remark?: string | null
    deletedAt?: Date | string | null
    createdAt?: Date | string
    updatedAt?: Date | string
    gender?: $Enums.Gender | null
  }

  export type CustomerCreateOrConnectWithoutPledgesInput = {
    where: CustomerWhereUniqueInput
    create: XOR<CustomerCreateWithoutPledgesInput, CustomerUncheckedCreateWithoutPledgesInput>
  }

  export type TransactionCreateWithoutPledgeInput = {
    id?: string
    amount: Decimal | DecimalJsLike | number | string
    type: $Enums.TransactionType
    note?: string | null
    createdAt?: Date | string
  }

  export type TransactionUncheckedCreateWithoutPledgeInput = {
    id?: string
    amount: Decimal | DecimalJsLike | number | string
    type: $Enums.TransactionType
    note?: string | null
    createdAt?: Date | string
  }

  export type TransactionCreateOrConnectWithoutPledgeInput = {
    where: TransactionWhereUniqueInput
    create: XOR<TransactionCreateWithoutPledgeInput, TransactionUncheckedCreateWithoutPledgeInput>
  }

  export type TransactionCreateManyPledgeInputEnvelope = {
    data: TransactionCreateManyPledgeInput | TransactionCreateManyPledgeInput[]
    skipDuplicates?: boolean
  }

  export type PledgeAuditUpsertWithWhereUniqueWithoutPledgeInput = {
    where: PledgeAuditWhereUniqueInput
    update: XOR<PledgeAuditUpdateWithoutPledgeInput, PledgeAuditUncheckedUpdateWithoutPledgeInput>
    create: XOR<PledgeAuditCreateWithoutPledgeInput, PledgeAuditUncheckedCreateWithoutPledgeInput>
  }

  export type PledgeAuditUpdateWithWhereUniqueWithoutPledgeInput = {
    where: PledgeAuditWhereUniqueInput
    data: XOR<PledgeAuditUpdateWithoutPledgeInput, PledgeAuditUncheckedUpdateWithoutPledgeInput>
  }

  export type PledgeAuditUpdateManyWithWhereWithoutPledgeInput = {
    where: PledgeAuditScalarWhereInput
    data: XOR<PledgeAuditUpdateManyMutationInput, PledgeAuditUncheckedUpdateManyWithoutPledgeInput>
  }

  export type PledgeAuditScalarWhereInput = {
    AND?: PledgeAuditScalarWhereInput | PledgeAuditScalarWhereInput[]
    OR?: PledgeAuditScalarWhereInput[]
    NOT?: PledgeAuditScalarWhereInput | PledgeAuditScalarWhereInput[]
    id?: StringFilter<"PledgeAudit"> | string
    pledgeId?: StringFilter<"PledgeAudit"> | string
    action?: EnumAuditActionFilter<"PledgeAudit"> | $Enums.AuditAction
    principal?: DecimalFilter<"PledgeAudit"> | Decimal | DecimalJsLike | number | string
    interestRate?: DecimalFilter<"PledgeAudit"> | Decimal | DecimalJsLike | number | string
    allowCompounding?: BoolFilter<"PledgeAudit"> | boolean
    compoundingDuration?: EnumCompoundingDurationFilter<"PledgeAudit"> | $Enums.CompoundingDuration
    calculationVersion?: IntFilter<"PledgeAudit"> | number
    durationMonths?: DecimalNullableFilter<"PledgeAudit"> | Decimal | DecimalJsLike | number | string | null
    netWeightOfGold?: DecimalFilter<"PledgeAudit"> | Decimal | DecimalJsLike | number | string
    netWeightOfSilver?: DecimalFilter<"PledgeAudit"> | Decimal | DecimalJsLike | number | string
    goldPricePerGram?: DecimalNullableFilter<"PledgeAudit"> | Decimal | DecimalJsLike | number | string | null
    silverPricePerGram?: DecimalNullableFilter<"PledgeAudit"> | Decimal | DecimalJsLike | number | string | null
    marketValueAtRelease?: DecimalNullableFilter<"PledgeAudit"> | Decimal | DecimalJsLike | number | string | null
    ltvAtRelease?: DecimalNullableFilter<"PledgeAudit"> | Decimal | DecimalJsLike | number | string | null
    totalInterest?: DecimalNullableFilter<"PledgeAudit"> | Decimal | DecimalJsLike | number | string | null
    receivableAmount?: DecimalNullableFilter<"PledgeAudit"> | Decimal | DecimalJsLike | number | string | null
    releaseDate?: DateTimeNullableFilter<"PledgeAudit"> | Date | string | null
    createdAt?: DateTimeFilter<"PledgeAudit"> | Date | string
  }

  export type PledgeItemUpsertWithWhereUniqueWithoutPledgeInput = {
    where: PledgeItemWhereUniqueInput
    update: XOR<PledgeItemUpdateWithoutPledgeInput, PledgeItemUncheckedUpdateWithoutPledgeInput>
    create: XOR<PledgeItemCreateWithoutPledgeInput, PledgeItemUncheckedCreateWithoutPledgeInput>
  }

  export type PledgeItemUpdateWithWhereUniqueWithoutPledgeInput = {
    where: PledgeItemWhereUniqueInput
    data: XOR<PledgeItemUpdateWithoutPledgeInput, PledgeItemUncheckedUpdateWithoutPledgeInput>
  }

  export type PledgeItemUpdateManyWithWhereWithoutPledgeInput = {
    where: PledgeItemScalarWhereInput
    data: XOR<PledgeItemUpdateManyMutationInput, PledgeItemUncheckedUpdateManyWithoutPledgeInput>
  }

  export type PledgeItemScalarWhereInput = {
    AND?: PledgeItemScalarWhereInput | PledgeItemScalarWhereInput[]
    OR?: PledgeItemScalarWhereInput[]
    NOT?: PledgeItemScalarWhereInput | PledgeItemScalarWhereInput[]
    id?: StringFilter<"PledgeItem"> | string
    pledgeId?: StringFilter<"PledgeItem"> | string
    itemType?: EnumItemTypeFilter<"PledgeItem"> | $Enums.ItemType
    metalType?: EnumMetalTypeFilter<"PledgeItem"> | $Enums.MetalType
    itemName?: StringNullableFilter<"PledgeItem"> | string | null
    quantity?: IntFilter<"PledgeItem"> | number
    grossWeight?: DecimalFilter<"PledgeItem"> | Decimal | DecimalJsLike | number | string
    netWeight?: DecimalFilter<"PledgeItem"> | Decimal | DecimalJsLike | number | string
    purity?: DecimalFilter<"PledgeItem"> | Decimal | DecimalJsLike | number | string
    netWeightOfMetal?: DecimalFilter<"PledgeItem"> | Decimal | DecimalJsLike | number | string
  }

  export type CustomerUpsertWithoutPledgesInput = {
    update: XOR<CustomerUpdateWithoutPledgesInput, CustomerUncheckedUpdateWithoutPledgesInput>
    create: XOR<CustomerCreateWithoutPledgesInput, CustomerUncheckedCreateWithoutPledgesInput>
    where?: CustomerWhereInput
  }

  export type CustomerUpdateToOneWithWhereWithoutPledgesInput = {
    where?: CustomerWhereInput
    data: XOR<CustomerUpdateWithoutPledgesInput, CustomerUncheckedUpdateWithoutPledgesInput>
  }

  export type CustomerUpdateWithoutPledgesInput = {
    id?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    region?: StringFieldUpdateOperationsInput | string
    address?: StringFieldUpdateOperationsInput | string
    mobile?: NullableStringFieldUpdateOperationsInput | string | null
    viewToken?: StringFieldUpdateOperationsInput | string
    idProofImg?: NullableStringFieldUpdateOperationsInput | string | null
    customerImg?: NullableStringFieldUpdateOperationsInput | string | null
    aadharNo?: NullableStringFieldUpdateOperationsInput | string | null
    remark?: NullableStringFieldUpdateOperationsInput | string | null
    deletedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    gender?: NullableEnumGenderFieldUpdateOperationsInput | $Enums.Gender | null
    user?: UserUpdateOneRequiredWithoutCustomersNestedInput
  }

  export type CustomerUncheckedUpdateWithoutPledgesInput = {
    id?: StringFieldUpdateOperationsInput | string
    userId?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    region?: StringFieldUpdateOperationsInput | string
    address?: StringFieldUpdateOperationsInput | string
    mobile?: NullableStringFieldUpdateOperationsInput | string | null
    viewToken?: StringFieldUpdateOperationsInput | string
    idProofImg?: NullableStringFieldUpdateOperationsInput | string | null
    customerImg?: NullableStringFieldUpdateOperationsInput | string | null
    aadharNo?: NullableStringFieldUpdateOperationsInput | string | null
    remark?: NullableStringFieldUpdateOperationsInput | string | null
    deletedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    gender?: NullableEnumGenderFieldUpdateOperationsInput | $Enums.Gender | null
  }

  export type TransactionUpsertWithWhereUniqueWithoutPledgeInput = {
    where: TransactionWhereUniqueInput
    update: XOR<TransactionUpdateWithoutPledgeInput, TransactionUncheckedUpdateWithoutPledgeInput>
    create: XOR<TransactionCreateWithoutPledgeInput, TransactionUncheckedCreateWithoutPledgeInput>
  }

  export type TransactionUpdateWithWhereUniqueWithoutPledgeInput = {
    where: TransactionWhereUniqueInput
    data: XOR<TransactionUpdateWithoutPledgeInput, TransactionUncheckedUpdateWithoutPledgeInput>
  }

  export type TransactionUpdateManyWithWhereWithoutPledgeInput = {
    where: TransactionScalarWhereInput
    data: XOR<TransactionUpdateManyMutationInput, TransactionUncheckedUpdateManyWithoutPledgeInput>
  }

  export type TransactionScalarWhereInput = {
    AND?: TransactionScalarWhereInput | TransactionScalarWhereInput[]
    OR?: TransactionScalarWhereInput[]
    NOT?: TransactionScalarWhereInput | TransactionScalarWhereInput[]
    id?: StringFilter<"Transaction"> | string
    pledgeId?: StringFilter<"Transaction"> | string
    amount?: DecimalFilter<"Transaction"> | Decimal | DecimalJsLike | number | string
    type?: EnumTransactionTypeFilter<"Transaction"> | $Enums.TransactionType
    note?: StringNullableFilter<"Transaction"> | string | null
    createdAt?: DateTimeFilter<"Transaction"> | Date | string
  }

  export type PledgeCreateWithoutItemsInput = {
    id?: string
    pledgeDate: Date | string
    loanAmount: Decimal | DecimalJsLike | number | string
    interestRate: Decimal | DecimalJsLike | number | string
    compoundingDuration: $Enums.CompoundingDuration
    allowCompounding?: boolean
    itemPhoto?: string | null
    remark?: string | null
    durationMonths?: Decimal | DecimalJsLike | number | string | null
    status: $Enums.PledgeStatus
    releaseDate?: Date | string | null
    netWeightOfGold?: Decimal | DecimalJsLike | number | string
    netWeightOfSilver?: Decimal | DecimalJsLike | number | string
    totalInterest?: Decimal | DecimalJsLike | number | string | null
    receivableAmount?: Decimal | DecimalJsLike | number | string | null
    calculationVersion?: number
    createdAt?: Date | string
    updatedAt?: Date | string
    pledgeAudits?: PledgeAuditCreateNestedManyWithoutPledgeInput
    customer: CustomerCreateNestedOneWithoutPledgesInput
    transactions?: TransactionCreateNestedManyWithoutPledgeInput
  }

  export type PledgeUncheckedCreateWithoutItemsInput = {
    id?: string
    customerId: string
    pledgeDate: Date | string
    loanAmount: Decimal | DecimalJsLike | number | string
    interestRate: Decimal | DecimalJsLike | number | string
    compoundingDuration: $Enums.CompoundingDuration
    allowCompounding?: boolean
    itemPhoto?: string | null
    remark?: string | null
    durationMonths?: Decimal | DecimalJsLike | number | string | null
    status: $Enums.PledgeStatus
    releaseDate?: Date | string | null
    netWeightOfGold?: Decimal | DecimalJsLike | number | string
    netWeightOfSilver?: Decimal | DecimalJsLike | number | string
    totalInterest?: Decimal | DecimalJsLike | number | string | null
    receivableAmount?: Decimal | DecimalJsLike | number | string | null
    calculationVersion?: number
    createdAt?: Date | string
    updatedAt?: Date | string
    pledgeAudits?: PledgeAuditUncheckedCreateNestedManyWithoutPledgeInput
    transactions?: TransactionUncheckedCreateNestedManyWithoutPledgeInput
  }

  export type PledgeCreateOrConnectWithoutItemsInput = {
    where: PledgeWhereUniqueInput
    create: XOR<PledgeCreateWithoutItemsInput, PledgeUncheckedCreateWithoutItemsInput>
  }

  export type PledgeUpsertWithoutItemsInput = {
    update: XOR<PledgeUpdateWithoutItemsInput, PledgeUncheckedUpdateWithoutItemsInput>
    create: XOR<PledgeCreateWithoutItemsInput, PledgeUncheckedCreateWithoutItemsInput>
    where?: PledgeWhereInput
  }

  export type PledgeUpdateToOneWithWhereWithoutItemsInput = {
    where?: PledgeWhereInput
    data: XOR<PledgeUpdateWithoutItemsInput, PledgeUncheckedUpdateWithoutItemsInput>
  }

  export type PledgeUpdateWithoutItemsInput = {
    id?: StringFieldUpdateOperationsInput | string
    pledgeDate?: DateTimeFieldUpdateOperationsInput | Date | string
    loanAmount?: DecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string
    interestRate?: DecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string
    compoundingDuration?: EnumCompoundingDurationFieldUpdateOperationsInput | $Enums.CompoundingDuration
    allowCompounding?: BoolFieldUpdateOperationsInput | boolean
    itemPhoto?: NullableStringFieldUpdateOperationsInput | string | null
    remark?: NullableStringFieldUpdateOperationsInput | string | null
    durationMonths?: NullableDecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string | null
    status?: EnumPledgeStatusFieldUpdateOperationsInput | $Enums.PledgeStatus
    releaseDate?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    netWeightOfGold?: DecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string
    netWeightOfSilver?: DecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string
    totalInterest?: NullableDecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string | null
    receivableAmount?: NullableDecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string | null
    calculationVersion?: IntFieldUpdateOperationsInput | number
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    pledgeAudits?: PledgeAuditUpdateManyWithoutPledgeNestedInput
    customer?: CustomerUpdateOneRequiredWithoutPledgesNestedInput
    transactions?: TransactionUpdateManyWithoutPledgeNestedInput
  }

  export type PledgeUncheckedUpdateWithoutItemsInput = {
    id?: StringFieldUpdateOperationsInput | string
    customerId?: StringFieldUpdateOperationsInput | string
    pledgeDate?: DateTimeFieldUpdateOperationsInput | Date | string
    loanAmount?: DecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string
    interestRate?: DecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string
    compoundingDuration?: EnumCompoundingDurationFieldUpdateOperationsInput | $Enums.CompoundingDuration
    allowCompounding?: BoolFieldUpdateOperationsInput | boolean
    itemPhoto?: NullableStringFieldUpdateOperationsInput | string | null
    remark?: NullableStringFieldUpdateOperationsInput | string | null
    durationMonths?: NullableDecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string | null
    status?: EnumPledgeStatusFieldUpdateOperationsInput | $Enums.PledgeStatus
    releaseDate?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    netWeightOfGold?: DecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string
    netWeightOfSilver?: DecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string
    totalInterest?: NullableDecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string | null
    receivableAmount?: NullableDecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string | null
    calculationVersion?: IntFieldUpdateOperationsInput | number
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    pledgeAudits?: PledgeAuditUncheckedUpdateManyWithoutPledgeNestedInput
    transactions?: TransactionUncheckedUpdateManyWithoutPledgeNestedInput
  }

  export type PledgeCreateWithoutPledgeAuditsInput = {
    id?: string
    pledgeDate: Date | string
    loanAmount: Decimal | DecimalJsLike | number | string
    interestRate: Decimal | DecimalJsLike | number | string
    compoundingDuration: $Enums.CompoundingDuration
    allowCompounding?: boolean
    itemPhoto?: string | null
    remark?: string | null
    durationMonths?: Decimal | DecimalJsLike | number | string | null
    status: $Enums.PledgeStatus
    releaseDate?: Date | string | null
    netWeightOfGold?: Decimal | DecimalJsLike | number | string
    netWeightOfSilver?: Decimal | DecimalJsLike | number | string
    totalInterest?: Decimal | DecimalJsLike | number | string | null
    receivableAmount?: Decimal | DecimalJsLike | number | string | null
    calculationVersion?: number
    createdAt?: Date | string
    updatedAt?: Date | string
    items?: PledgeItemCreateNestedManyWithoutPledgeInput
    customer: CustomerCreateNestedOneWithoutPledgesInput
    transactions?: TransactionCreateNestedManyWithoutPledgeInput
  }

  export type PledgeUncheckedCreateWithoutPledgeAuditsInput = {
    id?: string
    customerId: string
    pledgeDate: Date | string
    loanAmount: Decimal | DecimalJsLike | number | string
    interestRate: Decimal | DecimalJsLike | number | string
    compoundingDuration: $Enums.CompoundingDuration
    allowCompounding?: boolean
    itemPhoto?: string | null
    remark?: string | null
    durationMonths?: Decimal | DecimalJsLike | number | string | null
    status: $Enums.PledgeStatus
    releaseDate?: Date | string | null
    netWeightOfGold?: Decimal | DecimalJsLike | number | string
    netWeightOfSilver?: Decimal | DecimalJsLike | number | string
    totalInterest?: Decimal | DecimalJsLike | number | string | null
    receivableAmount?: Decimal | DecimalJsLike | number | string | null
    calculationVersion?: number
    createdAt?: Date | string
    updatedAt?: Date | string
    items?: PledgeItemUncheckedCreateNestedManyWithoutPledgeInput
    transactions?: TransactionUncheckedCreateNestedManyWithoutPledgeInput
  }

  export type PledgeCreateOrConnectWithoutPledgeAuditsInput = {
    where: PledgeWhereUniqueInput
    create: XOR<PledgeCreateWithoutPledgeAuditsInput, PledgeUncheckedCreateWithoutPledgeAuditsInput>
  }

  export type PledgeUpsertWithoutPledgeAuditsInput = {
    update: XOR<PledgeUpdateWithoutPledgeAuditsInput, PledgeUncheckedUpdateWithoutPledgeAuditsInput>
    create: XOR<PledgeCreateWithoutPledgeAuditsInput, PledgeUncheckedCreateWithoutPledgeAuditsInput>
    where?: PledgeWhereInput
  }

  export type PledgeUpdateToOneWithWhereWithoutPledgeAuditsInput = {
    where?: PledgeWhereInput
    data: XOR<PledgeUpdateWithoutPledgeAuditsInput, PledgeUncheckedUpdateWithoutPledgeAuditsInput>
  }

  export type PledgeUpdateWithoutPledgeAuditsInput = {
    id?: StringFieldUpdateOperationsInput | string
    pledgeDate?: DateTimeFieldUpdateOperationsInput | Date | string
    loanAmount?: DecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string
    interestRate?: DecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string
    compoundingDuration?: EnumCompoundingDurationFieldUpdateOperationsInput | $Enums.CompoundingDuration
    allowCompounding?: BoolFieldUpdateOperationsInput | boolean
    itemPhoto?: NullableStringFieldUpdateOperationsInput | string | null
    remark?: NullableStringFieldUpdateOperationsInput | string | null
    durationMonths?: NullableDecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string | null
    status?: EnumPledgeStatusFieldUpdateOperationsInput | $Enums.PledgeStatus
    releaseDate?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    netWeightOfGold?: DecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string
    netWeightOfSilver?: DecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string
    totalInterest?: NullableDecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string | null
    receivableAmount?: NullableDecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string | null
    calculationVersion?: IntFieldUpdateOperationsInput | number
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    items?: PledgeItemUpdateManyWithoutPledgeNestedInput
    customer?: CustomerUpdateOneRequiredWithoutPledgesNestedInput
    transactions?: TransactionUpdateManyWithoutPledgeNestedInput
  }

  export type PledgeUncheckedUpdateWithoutPledgeAuditsInput = {
    id?: StringFieldUpdateOperationsInput | string
    customerId?: StringFieldUpdateOperationsInput | string
    pledgeDate?: DateTimeFieldUpdateOperationsInput | Date | string
    loanAmount?: DecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string
    interestRate?: DecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string
    compoundingDuration?: EnumCompoundingDurationFieldUpdateOperationsInput | $Enums.CompoundingDuration
    allowCompounding?: BoolFieldUpdateOperationsInput | boolean
    itemPhoto?: NullableStringFieldUpdateOperationsInput | string | null
    remark?: NullableStringFieldUpdateOperationsInput | string | null
    durationMonths?: NullableDecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string | null
    status?: EnumPledgeStatusFieldUpdateOperationsInput | $Enums.PledgeStatus
    releaseDate?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    netWeightOfGold?: DecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string
    netWeightOfSilver?: DecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string
    totalInterest?: NullableDecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string | null
    receivableAmount?: NullableDecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string | null
    calculationVersion?: IntFieldUpdateOperationsInput | number
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    items?: PledgeItemUncheckedUpdateManyWithoutPledgeNestedInput
    transactions?: TransactionUncheckedUpdateManyWithoutPledgeNestedInput
  }

  export type PledgeCreateWithoutTransactionsInput = {
    id?: string
    pledgeDate: Date | string
    loanAmount: Decimal | DecimalJsLike | number | string
    interestRate: Decimal | DecimalJsLike | number | string
    compoundingDuration: $Enums.CompoundingDuration
    allowCompounding?: boolean
    itemPhoto?: string | null
    remark?: string | null
    durationMonths?: Decimal | DecimalJsLike | number | string | null
    status: $Enums.PledgeStatus
    releaseDate?: Date | string | null
    netWeightOfGold?: Decimal | DecimalJsLike | number | string
    netWeightOfSilver?: Decimal | DecimalJsLike | number | string
    totalInterest?: Decimal | DecimalJsLike | number | string | null
    receivableAmount?: Decimal | DecimalJsLike | number | string | null
    calculationVersion?: number
    createdAt?: Date | string
    updatedAt?: Date | string
    pledgeAudits?: PledgeAuditCreateNestedManyWithoutPledgeInput
    items?: PledgeItemCreateNestedManyWithoutPledgeInput
    customer: CustomerCreateNestedOneWithoutPledgesInput
  }

  export type PledgeUncheckedCreateWithoutTransactionsInput = {
    id?: string
    customerId: string
    pledgeDate: Date | string
    loanAmount: Decimal | DecimalJsLike | number | string
    interestRate: Decimal | DecimalJsLike | number | string
    compoundingDuration: $Enums.CompoundingDuration
    allowCompounding?: boolean
    itemPhoto?: string | null
    remark?: string | null
    durationMonths?: Decimal | DecimalJsLike | number | string | null
    status: $Enums.PledgeStatus
    releaseDate?: Date | string | null
    netWeightOfGold?: Decimal | DecimalJsLike | number | string
    netWeightOfSilver?: Decimal | DecimalJsLike | number | string
    totalInterest?: Decimal | DecimalJsLike | number | string | null
    receivableAmount?: Decimal | DecimalJsLike | number | string | null
    calculationVersion?: number
    createdAt?: Date | string
    updatedAt?: Date | string
    pledgeAudits?: PledgeAuditUncheckedCreateNestedManyWithoutPledgeInput
    items?: PledgeItemUncheckedCreateNestedManyWithoutPledgeInput
  }

  export type PledgeCreateOrConnectWithoutTransactionsInput = {
    where: PledgeWhereUniqueInput
    create: XOR<PledgeCreateWithoutTransactionsInput, PledgeUncheckedCreateWithoutTransactionsInput>
  }

  export type PledgeUpsertWithoutTransactionsInput = {
    update: XOR<PledgeUpdateWithoutTransactionsInput, PledgeUncheckedUpdateWithoutTransactionsInput>
    create: XOR<PledgeCreateWithoutTransactionsInput, PledgeUncheckedCreateWithoutTransactionsInput>
    where?: PledgeWhereInput
  }

  export type PledgeUpdateToOneWithWhereWithoutTransactionsInput = {
    where?: PledgeWhereInput
    data: XOR<PledgeUpdateWithoutTransactionsInput, PledgeUncheckedUpdateWithoutTransactionsInput>
  }

  export type PledgeUpdateWithoutTransactionsInput = {
    id?: StringFieldUpdateOperationsInput | string
    pledgeDate?: DateTimeFieldUpdateOperationsInput | Date | string
    loanAmount?: DecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string
    interestRate?: DecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string
    compoundingDuration?: EnumCompoundingDurationFieldUpdateOperationsInput | $Enums.CompoundingDuration
    allowCompounding?: BoolFieldUpdateOperationsInput | boolean
    itemPhoto?: NullableStringFieldUpdateOperationsInput | string | null
    remark?: NullableStringFieldUpdateOperationsInput | string | null
    durationMonths?: NullableDecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string | null
    status?: EnumPledgeStatusFieldUpdateOperationsInput | $Enums.PledgeStatus
    releaseDate?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    netWeightOfGold?: DecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string
    netWeightOfSilver?: DecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string
    totalInterest?: NullableDecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string | null
    receivableAmount?: NullableDecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string | null
    calculationVersion?: IntFieldUpdateOperationsInput | number
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    pledgeAudits?: PledgeAuditUpdateManyWithoutPledgeNestedInput
    items?: PledgeItemUpdateManyWithoutPledgeNestedInput
    customer?: CustomerUpdateOneRequiredWithoutPledgesNestedInput
  }

  export type PledgeUncheckedUpdateWithoutTransactionsInput = {
    id?: StringFieldUpdateOperationsInput | string
    customerId?: StringFieldUpdateOperationsInput | string
    pledgeDate?: DateTimeFieldUpdateOperationsInput | Date | string
    loanAmount?: DecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string
    interestRate?: DecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string
    compoundingDuration?: EnumCompoundingDurationFieldUpdateOperationsInput | $Enums.CompoundingDuration
    allowCompounding?: BoolFieldUpdateOperationsInput | boolean
    itemPhoto?: NullableStringFieldUpdateOperationsInput | string | null
    remark?: NullableStringFieldUpdateOperationsInput | string | null
    durationMonths?: NullableDecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string | null
    status?: EnumPledgeStatusFieldUpdateOperationsInput | $Enums.PledgeStatus
    releaseDate?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    netWeightOfGold?: DecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string
    netWeightOfSilver?: DecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string
    totalInterest?: NullableDecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string | null
    receivableAmount?: NullableDecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string | null
    calculationVersion?: IntFieldUpdateOperationsInput | number
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    pledgeAudits?: PledgeAuditUncheckedUpdateManyWithoutPledgeNestedInput
    items?: PledgeItemUncheckedUpdateManyWithoutPledgeNestedInput
  }

  export type CustomerCreateManyUserInput = {
    id?: string
    name: string
    region: string
    address: string
    mobile?: string | null
    viewToken?: string
    idProofImg?: string | null
    customerImg?: string | null
    aadharNo?: string | null
    remark?: string | null
    deletedAt?: Date | string | null
    createdAt?: Date | string
    updatedAt?: Date | string
    gender?: $Enums.Gender | null
  }

  export type CustomerUpdateWithoutUserInput = {
    id?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    region?: StringFieldUpdateOperationsInput | string
    address?: StringFieldUpdateOperationsInput | string
    mobile?: NullableStringFieldUpdateOperationsInput | string | null
    viewToken?: StringFieldUpdateOperationsInput | string
    idProofImg?: NullableStringFieldUpdateOperationsInput | string | null
    customerImg?: NullableStringFieldUpdateOperationsInput | string | null
    aadharNo?: NullableStringFieldUpdateOperationsInput | string | null
    remark?: NullableStringFieldUpdateOperationsInput | string | null
    deletedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    gender?: NullableEnumGenderFieldUpdateOperationsInput | $Enums.Gender | null
    pledges?: PledgeUpdateManyWithoutCustomerNestedInput
  }

  export type CustomerUncheckedUpdateWithoutUserInput = {
    id?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    region?: StringFieldUpdateOperationsInput | string
    address?: StringFieldUpdateOperationsInput | string
    mobile?: NullableStringFieldUpdateOperationsInput | string | null
    viewToken?: StringFieldUpdateOperationsInput | string
    idProofImg?: NullableStringFieldUpdateOperationsInput | string | null
    customerImg?: NullableStringFieldUpdateOperationsInput | string | null
    aadharNo?: NullableStringFieldUpdateOperationsInput | string | null
    remark?: NullableStringFieldUpdateOperationsInput | string | null
    deletedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    gender?: NullableEnumGenderFieldUpdateOperationsInput | $Enums.Gender | null
    pledges?: PledgeUncheckedUpdateManyWithoutCustomerNestedInput
  }

  export type CustomerUncheckedUpdateManyWithoutUserInput = {
    id?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    region?: StringFieldUpdateOperationsInput | string
    address?: StringFieldUpdateOperationsInput | string
    mobile?: NullableStringFieldUpdateOperationsInput | string | null
    viewToken?: StringFieldUpdateOperationsInput | string
    idProofImg?: NullableStringFieldUpdateOperationsInput | string | null
    customerImg?: NullableStringFieldUpdateOperationsInput | string | null
    aadharNo?: NullableStringFieldUpdateOperationsInput | string | null
    remark?: NullableStringFieldUpdateOperationsInput | string | null
    deletedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    gender?: NullableEnumGenderFieldUpdateOperationsInput | $Enums.Gender | null
  }

  export type PledgeCreateManyCustomerInput = {
    id?: string
    pledgeDate: Date | string
    loanAmount: Decimal | DecimalJsLike | number | string
    interestRate: Decimal | DecimalJsLike | number | string
    compoundingDuration: $Enums.CompoundingDuration
    allowCompounding?: boolean
    itemPhoto?: string | null
    remark?: string | null
    durationMonths?: Decimal | DecimalJsLike | number | string | null
    status: $Enums.PledgeStatus
    releaseDate?: Date | string | null
    netWeightOfGold?: Decimal | DecimalJsLike | number | string
    netWeightOfSilver?: Decimal | DecimalJsLike | number | string
    totalInterest?: Decimal | DecimalJsLike | number | string | null
    receivableAmount?: Decimal | DecimalJsLike | number | string | null
    calculationVersion?: number
    createdAt?: Date | string
    updatedAt?: Date | string
  }

  export type PledgeUpdateWithoutCustomerInput = {
    id?: StringFieldUpdateOperationsInput | string
    pledgeDate?: DateTimeFieldUpdateOperationsInput | Date | string
    loanAmount?: DecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string
    interestRate?: DecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string
    compoundingDuration?: EnumCompoundingDurationFieldUpdateOperationsInput | $Enums.CompoundingDuration
    allowCompounding?: BoolFieldUpdateOperationsInput | boolean
    itemPhoto?: NullableStringFieldUpdateOperationsInput | string | null
    remark?: NullableStringFieldUpdateOperationsInput | string | null
    durationMonths?: NullableDecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string | null
    status?: EnumPledgeStatusFieldUpdateOperationsInput | $Enums.PledgeStatus
    releaseDate?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    netWeightOfGold?: DecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string
    netWeightOfSilver?: DecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string
    totalInterest?: NullableDecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string | null
    receivableAmount?: NullableDecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string | null
    calculationVersion?: IntFieldUpdateOperationsInput | number
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    pledgeAudits?: PledgeAuditUpdateManyWithoutPledgeNestedInput
    items?: PledgeItemUpdateManyWithoutPledgeNestedInput
    transactions?: TransactionUpdateManyWithoutPledgeNestedInput
  }

  export type PledgeUncheckedUpdateWithoutCustomerInput = {
    id?: StringFieldUpdateOperationsInput | string
    pledgeDate?: DateTimeFieldUpdateOperationsInput | Date | string
    loanAmount?: DecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string
    interestRate?: DecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string
    compoundingDuration?: EnumCompoundingDurationFieldUpdateOperationsInput | $Enums.CompoundingDuration
    allowCompounding?: BoolFieldUpdateOperationsInput | boolean
    itemPhoto?: NullableStringFieldUpdateOperationsInput | string | null
    remark?: NullableStringFieldUpdateOperationsInput | string | null
    durationMonths?: NullableDecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string | null
    status?: EnumPledgeStatusFieldUpdateOperationsInput | $Enums.PledgeStatus
    releaseDate?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    netWeightOfGold?: DecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string
    netWeightOfSilver?: DecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string
    totalInterest?: NullableDecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string | null
    receivableAmount?: NullableDecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string | null
    calculationVersion?: IntFieldUpdateOperationsInput | number
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    pledgeAudits?: PledgeAuditUncheckedUpdateManyWithoutPledgeNestedInput
    items?: PledgeItemUncheckedUpdateManyWithoutPledgeNestedInput
    transactions?: TransactionUncheckedUpdateManyWithoutPledgeNestedInput
  }

  export type PledgeUncheckedUpdateManyWithoutCustomerInput = {
    id?: StringFieldUpdateOperationsInput | string
    pledgeDate?: DateTimeFieldUpdateOperationsInput | Date | string
    loanAmount?: DecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string
    interestRate?: DecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string
    compoundingDuration?: EnumCompoundingDurationFieldUpdateOperationsInput | $Enums.CompoundingDuration
    allowCompounding?: BoolFieldUpdateOperationsInput | boolean
    itemPhoto?: NullableStringFieldUpdateOperationsInput | string | null
    remark?: NullableStringFieldUpdateOperationsInput | string | null
    durationMonths?: NullableDecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string | null
    status?: EnumPledgeStatusFieldUpdateOperationsInput | $Enums.PledgeStatus
    releaseDate?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    netWeightOfGold?: DecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string
    netWeightOfSilver?: DecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string
    totalInterest?: NullableDecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string | null
    receivableAmount?: NullableDecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string | null
    calculationVersion?: IntFieldUpdateOperationsInput | number
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type PledgeAuditCreateManyPledgeInput = {
    id?: string
    action: $Enums.AuditAction
    principal: Decimal | DecimalJsLike | number | string
    interestRate: Decimal | DecimalJsLike | number | string
    allowCompounding: boolean
    compoundingDuration: $Enums.CompoundingDuration
    calculationVersion: number
    durationMonths?: Decimal | DecimalJsLike | number | string | null
    netWeightOfGold: Decimal | DecimalJsLike | number | string
    netWeightOfSilver: Decimal | DecimalJsLike | number | string
    goldPricePerGram?: Decimal | DecimalJsLike | number | string | null
    silverPricePerGram?: Decimal | DecimalJsLike | number | string | null
    marketValueAtRelease?: Decimal | DecimalJsLike | number | string | null
    ltvAtRelease?: Decimal | DecimalJsLike | number | string | null
    totalInterest?: Decimal | DecimalJsLike | number | string | null
    receivableAmount?: Decimal | DecimalJsLike | number | string | null
    releaseDate?: Date | string | null
    createdAt?: Date | string
  }

  export type PledgeItemCreateManyPledgeInput = {
    id?: string
    itemType: $Enums.ItemType
    metalType: $Enums.MetalType
    itemName?: string | null
    quantity?: number
    grossWeight: Decimal | DecimalJsLike | number | string
    netWeight: Decimal | DecimalJsLike | number | string
    purity: Decimal | DecimalJsLike | number | string
    netWeightOfMetal: Decimal | DecimalJsLike | number | string
  }

  export type TransactionCreateManyPledgeInput = {
    id?: string
    amount: Decimal | DecimalJsLike | number | string
    type: $Enums.TransactionType
    note?: string | null
    createdAt?: Date | string
  }

  export type PledgeAuditUpdateWithoutPledgeInput = {
    id?: StringFieldUpdateOperationsInput | string
    action?: EnumAuditActionFieldUpdateOperationsInput | $Enums.AuditAction
    principal?: DecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string
    interestRate?: DecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string
    allowCompounding?: BoolFieldUpdateOperationsInput | boolean
    compoundingDuration?: EnumCompoundingDurationFieldUpdateOperationsInput | $Enums.CompoundingDuration
    calculationVersion?: IntFieldUpdateOperationsInput | number
    durationMonths?: NullableDecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string | null
    netWeightOfGold?: DecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string
    netWeightOfSilver?: DecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string
    goldPricePerGram?: NullableDecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string | null
    silverPricePerGram?: NullableDecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string | null
    marketValueAtRelease?: NullableDecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string | null
    ltvAtRelease?: NullableDecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string | null
    totalInterest?: NullableDecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string | null
    receivableAmount?: NullableDecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string | null
    releaseDate?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type PledgeAuditUncheckedUpdateWithoutPledgeInput = {
    id?: StringFieldUpdateOperationsInput | string
    action?: EnumAuditActionFieldUpdateOperationsInput | $Enums.AuditAction
    principal?: DecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string
    interestRate?: DecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string
    allowCompounding?: BoolFieldUpdateOperationsInput | boolean
    compoundingDuration?: EnumCompoundingDurationFieldUpdateOperationsInput | $Enums.CompoundingDuration
    calculationVersion?: IntFieldUpdateOperationsInput | number
    durationMonths?: NullableDecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string | null
    netWeightOfGold?: DecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string
    netWeightOfSilver?: DecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string
    goldPricePerGram?: NullableDecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string | null
    silverPricePerGram?: NullableDecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string | null
    marketValueAtRelease?: NullableDecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string | null
    ltvAtRelease?: NullableDecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string | null
    totalInterest?: NullableDecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string | null
    receivableAmount?: NullableDecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string | null
    releaseDate?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type PledgeAuditUncheckedUpdateManyWithoutPledgeInput = {
    id?: StringFieldUpdateOperationsInput | string
    action?: EnumAuditActionFieldUpdateOperationsInput | $Enums.AuditAction
    principal?: DecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string
    interestRate?: DecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string
    allowCompounding?: BoolFieldUpdateOperationsInput | boolean
    compoundingDuration?: EnumCompoundingDurationFieldUpdateOperationsInput | $Enums.CompoundingDuration
    calculationVersion?: IntFieldUpdateOperationsInput | number
    durationMonths?: NullableDecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string | null
    netWeightOfGold?: DecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string
    netWeightOfSilver?: DecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string
    goldPricePerGram?: NullableDecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string | null
    silverPricePerGram?: NullableDecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string | null
    marketValueAtRelease?: NullableDecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string | null
    ltvAtRelease?: NullableDecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string | null
    totalInterest?: NullableDecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string | null
    receivableAmount?: NullableDecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string | null
    releaseDate?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type PledgeItemUpdateWithoutPledgeInput = {
    id?: StringFieldUpdateOperationsInput | string
    itemType?: EnumItemTypeFieldUpdateOperationsInput | $Enums.ItemType
    metalType?: EnumMetalTypeFieldUpdateOperationsInput | $Enums.MetalType
    itemName?: NullableStringFieldUpdateOperationsInput | string | null
    quantity?: IntFieldUpdateOperationsInput | number
    grossWeight?: DecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string
    netWeight?: DecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string
    purity?: DecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string
    netWeightOfMetal?: DecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string
  }

  export type PledgeItemUncheckedUpdateWithoutPledgeInput = {
    id?: StringFieldUpdateOperationsInput | string
    itemType?: EnumItemTypeFieldUpdateOperationsInput | $Enums.ItemType
    metalType?: EnumMetalTypeFieldUpdateOperationsInput | $Enums.MetalType
    itemName?: NullableStringFieldUpdateOperationsInput | string | null
    quantity?: IntFieldUpdateOperationsInput | number
    grossWeight?: DecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string
    netWeight?: DecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string
    purity?: DecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string
    netWeightOfMetal?: DecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string
  }

  export type PledgeItemUncheckedUpdateManyWithoutPledgeInput = {
    id?: StringFieldUpdateOperationsInput | string
    itemType?: EnumItemTypeFieldUpdateOperationsInput | $Enums.ItemType
    metalType?: EnumMetalTypeFieldUpdateOperationsInput | $Enums.MetalType
    itemName?: NullableStringFieldUpdateOperationsInput | string | null
    quantity?: IntFieldUpdateOperationsInput | number
    grossWeight?: DecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string
    netWeight?: DecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string
    purity?: DecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string
    netWeightOfMetal?: DecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string
  }

  export type TransactionUpdateWithoutPledgeInput = {
    id?: StringFieldUpdateOperationsInput | string
    amount?: DecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string
    type?: EnumTransactionTypeFieldUpdateOperationsInput | $Enums.TransactionType
    note?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type TransactionUncheckedUpdateWithoutPledgeInput = {
    id?: StringFieldUpdateOperationsInput | string
    amount?: DecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string
    type?: EnumTransactionTypeFieldUpdateOperationsInput | $Enums.TransactionType
    note?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type TransactionUncheckedUpdateManyWithoutPledgeInput = {
    id?: StringFieldUpdateOperationsInput | string
    amount?: DecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string
    type?: EnumTransactionTypeFieldUpdateOperationsInput | $Enums.TransactionType
    note?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }



  /**
   * Batch Payload for updateMany & deleteMany & createMany
   */

  export type BatchPayload = {
    count: number
  }

  /**
   * DMMF
   */
  export const dmmf: runtime.BaseDMMF
}
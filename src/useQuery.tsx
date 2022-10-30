import { request } from "graphql-request";
import { GraphQLError } from "graphql/error/GraphQLError";
import { PayloadAction, useLocalSlice } from "use-local-slice";
import { Draft } from "immer";
import { useCallback, useEffect, useLayoutEffect, useRef } from "react";
import { DocumentNode, TypedQueryDocumentNode } from "graphql";
import { API_URL } from "./Countries";

type QueryMethods = {
  refetch(): void;
};

type BaseQueryResult<Result> = {
  data?: Result;
  error?: Error | GraphQLError[];
};

type QueryResult<Result> = BaseQueryResult<Result> &
  (
    | {
        status: "pending";
      }
    | {
        status: "success";
        data: Result;
      }
    | {
        status: "error";
        error: GraphQLError[];
      }
  );

type QueryOptions<Variables> = Variables extends null
  ? { variables?: Variables | {} }
  : { variables: Variables };

type NoInfer<T> = [T][T extends any ? 0 : never];

function useStableReference<T>(value: T) {
  const lastValue = useRef(value);
  useLayoutEffect(() => {
    if (JSON.stringify(lastValue.current) !== JSON.stringify(value)) {
      lastValue.current = value;
    }
  });

  return JSON.stringify(lastValue.current) === JSON.stringify(value)
    ? lastValue.current
    : value;
}

export function useQuery<Result, Variables>(
  query: TypedQueryDocumentNode<Result, Variables>,
  options: QueryOptions<NoInfer<Variables>>
): QueryResult<Result> & QueryMethods;
export function useQuery<Result, Variables>(
  query: string,
  options: QueryOptions<Variables>
): QueryResult<Result> & QueryMethods;
export function useQuery<Result, Variables>(
  query: string | DocumentNode,
  options: QueryOptions<Variables>
): QueryResult<Result> & QueryMethods {
  const [status, dispatch] = useLocalSlice({
    initialState: { status: "pending" } as QueryResult<Result>,
    reducers: {
      onPending(state) {
        state.status = "pending";
        state.error = undefined;
      },
      onSuccess(state, action: PayloadAction<Result>) {
        state.status = "success";
        state.data = action.payload as Draft<Result>;
      },
      onError(state, action: PayloadAction<GraphQLError[]>) {
        state.status = "error";
        state.error = action.payload as Draft<GraphQLError[]>;
      },
    },
  });

  const stableQuery = useStableReference(query);
  const stableVariables = useStableReference(options.variables) as Variables;

  const abortController = useRef<AbortController | undefined>(undefined);

  const fetchData = useCallback(
    async (query: string | DocumentNode, variables: Variables | undefined) => {
      if (abortController.current) {
        abortController.current.abort();
      }
      abortController.current = new AbortController();
      let result: Result | undefined;
      try {
        if (Math.random() < 0.2)
          throw new Error(
            "This error has a 20% chance to show the error handling!"
          );
        // @ts-ignore There seems to be some internal type mismatch, I'm not going to spend a lot of time on this now
        result = await request<Result, Variables>({
          url: API_URL,
          document: query,
          variables,
          signal: abortController.current.signal,
        });
      } catch (error: any) {
        if (
          error.name !==
          "AbortError" /* another request is already running, don't propagate this error */
        ) {
          dispatch.onError(error);
        }
      }
      if (result) {
        dispatch.onSuccess(result);
      }
    },
    [dispatch]
  );

  useEffect(() => {
    fetchData(stableQuery, stableVariables);
  }, [fetchData, stableQuery, stableVariables]);

  return {
    ...status,
    refetch() {
      fetchData(stableQuery, stableVariables);
    },
  };
}

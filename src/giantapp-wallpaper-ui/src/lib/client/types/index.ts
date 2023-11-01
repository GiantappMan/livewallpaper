export type ApiResult<T> = {
  error: string | null | any;
  data: T | null;
};

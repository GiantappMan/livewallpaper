export type ApiResult<T> = {
  error: string | null | any;
  data: T | null;
};

// export interface InitProgressEvent {
//   type: "initProgress";
//   data: {
//     // ...event data
//   };
// }

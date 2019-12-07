import { put, call, apply, select } from "redux-saga/effects";

const createFetchSaga = ({
  onFetch,
  onResponse,
  onSuccess = response => response,
  onFailure = error => error,
  asyncActions,
  getIsFetching,
  getToken,
  verbose = false
}) => {
  function* handleResponse(response: Response) {
    if (!response.ok) {
      // statuscode = 400代表用户名、密码错误
      // todo: 确认一下符合http status code含义
      let error;
      if (response.status === 401) error = { error: "操作未授权" };
      else if (response.status === 500)
        error = { error: "无法连接服务器，请稍后重试", meta: "notOK" };
      else error = { error: `${response.status}: ${response.statusText}` };

      yield put(asyncActions.failure(onFailure(error)));
      return;
    }

    console.log("calling apply...");
    const respJson = yield apply(response, response.json, []);
    console.log("respJson", respJson);
    console.log("end calling apply...");
    yield put(asyncActions.success(onSuccess(respJson)));
  }

  return function* fetchSaga(action) {
    if (getIsFetching && (yield select(getIsFetching))) return;

    yield put(asyncActions.request(action.payload));

    // 是否需要try catch
    // 如果捕捉，那么网络及其它错误会捕捉到，由本级处理
    // 不捕捉，只处理response内的错误信息
    try {
      const token = getToken ? yield select(getToken) : undefined;
      const resp = yield call(onFetch, action, token);

      if (verbose) console.log("resp", resp);

      if (onResponse && typeof onResponse === "function") {
        const result = yield* onResponse(resp);

        if (result && result.error) {
          yield put(asyncActions.failure(onFailure(result)));
          return;
        }

        if (result) {
          yield put(asyncActions.success(onSuccess(result)));
          return;
        }
      }
      yield* handleResponse(resp);
    } catch (err) {
      yield put(
        asyncActions.failure(
          onFailure({
            error: "无法连接服务器，请稍后重试",
            meta: "catch"
          })
        )
      );
      // yield call(onFailure, {
      //   error: "无法连接服务器，请稍后重试",
      //   meta: "catch"
      // });
      console.log("err", err);
    }
  };
};
export default createFetchSaga;

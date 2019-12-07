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
  function* handleResponse(response: Response, respJson: { Message?: string }) {
    if (!response.ok) {
      // statuscode
      // 401: 代表用户名、密码错误
      // 500: server error
      // 400: bad request
      let msg;
      if (response.status === 401) msg = "操作未授权";
      else if (response.status === 500) msg = "无法连接服务器，请稍后重试";
      else if (response.status === 400) msg = respJson.Message || "Bad Request";
      else msg = respJson.Message;

      let error = {
        type: "http error",
        originResponse: respJson,
        status: response.status,
        statusText: response.statusText,
        msg
      };

      if (verbose) console.log("onFailure", error);
      yield put(asyncActions.failure(onFailure(error)));
      return;
    }

    if (verbose) console.log("onSuccess", respJson);
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

      if (verbose) console.log("response", resp);

      const respJson = yield apply(resp, resp.json, []);

      if (onResponse && typeof onResponse === "function") {
        const result = yield* onResponse(resp, respJson);

        if (result && result.error) {
          if (verbose) console.log("onFailure", result.error);
          yield put(asyncActions.failure(onFailure(result)));
          return;
        }

        if (result) {
          if (verbose) console.log("onSuccess", result);
          yield put(asyncActions.success(onSuccess(result)));
          return;
        }
      } else {
        yield* handleResponse(resp, respJson);
        return;
      }
    } catch (err) {
      let error = {
        type: "network error",
        msg: "无法连接服务器，请稍后重试",
        originError: err
      };

      if (verbose) console.log("error", error);
      yield put(asyncActions.failure(onFailure(error)));
    }
  };
};
export default createFetchSaga;

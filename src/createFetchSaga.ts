import { put, call, apply, select } from "redux-saga/effects";

const createFetchSaga = ({
  onFetch,
  onResponse,
  onSuccess = (response, action) => response,
  onFailure = (error, action) => error,
  onExit = (error, action) => error,
  asyncActions,
  getIsFetching,
  getError,
  getToken,
  verbose = false
}) => {
  function* handleResponse(
    response: Response,
    respJson: { Message?: string },
    action
  ) {
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

      if (verbose) console.log("onFailure", error, action);
      yield put(asyncActions.failure(onFailure(error, action)));
      return;
    }

    if (verbose) console.log("onSuccess", respJson, action);
    yield put(asyncActions.success(onSuccess(respJson, action)));
  }

  return function* fetchSaga(action) {
    if (getIsFetching && (yield select(getIsFetching)))
      return onExit(getError ? yield select(getError) : undefined, action);

    yield put(asyncActions.request(action.payload));

    // 是否需要try catch
    // 如果捕捉，那么网络及其它错误会捕捉到，由本级处理
    // 不捕捉，只处理response内的错误信息
    try {
      const token = getToken ? yield select(getToken) : undefined;
      const resp = yield call(onFetch, action, token);
      if (verbose) console.log("response", resp);

      const respJson = yield apply(resp, resp.json, []);
      if (verbose) console.log("respJson", respJson);

      if (onResponse && typeof onResponse === "function") {
        const result = yield* onResponse(resp, respJson, action);

        if (result && result.error) {
          if (verbose) console.log("onFailure", result.error, action);
          yield put(asyncActions.failure(onFailure(result, action)));
        } else {
          if (verbose) console.log("onSuccess", result, action);
          yield put(asyncActions.success(onSuccess(result, action)));
        }
      } else {
        yield* handleResponse(resp, respJson, action);
      }
    } catch (err) {
      let error = {
        type: "network error",
        msg: "无法连接服务器，请稍后重试",
        originError: err
      };

      if (verbose) console.log("error", error, action);
      yield put(asyncActions.failure(onFailure(error, action)));
    }

    return onExit(getError ? yield select(getError) : undefined, action);
  };
};
export default createFetchSaga;

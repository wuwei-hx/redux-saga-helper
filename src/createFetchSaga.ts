import { put, call, apply, select } from "redux-saga/effects";

const createFetchSaga = ({
  onFetch,
  onSuccess = function*(response) {
    yield put(asyncActions.success(response));
  },
  onFailure = function*(error) {
    yield put(asyncActions.failure(error));
  },
  asyncActions,
  getIsFetching,
  getToken
}) =>
  function* fetchSaga(action) {
    if (getIsFetching && (yield select(getIsFetching))) return;

    yield put(asyncActions.request(action.payload));

    // 是否需要try catch
    // 如果捕捉，那么网络及其它错误会捕捉到，由本级处理
    // 不捕捉，只处理response内的错误信息
    try {
      // const resp = yield* fetchCall(action);
      const token = getToken ? yield select(getToken) : undefined;
      const resp = yield call(onFetch, action, token);

      /// test code
      console.log("resp", resp);
      /// end of test

      if (!resp.ok) {
        // statuscode = 400代表用户名、密码错误
        // todo: 确认一下符合http status code含义
        let error;
        if (resp.status === 401) error = { error: "操作未授权" };
        else if (resp.status === 500)
          error = { error: "无法连接服务器，请稍后重试", meta: "notOK" };
        else error = { error: `${resp.status}: ${resp.statusText}` };

        yield call(onFailure, error);
        // yield put(asyncActions.failure(error));
        return;
      }

      console.log("calling apply...");
      const respJson = yield apply(resp, resp.json, []);
      console.log("respJson", respJson);
      console.log("end calling apply...");
      // yield put(asyncActions.success(respJson));
      yield call(onSuccess, respJson);
    } catch (err) {
      // yield put(
      //   asyncActions.failure({
      //     error: "无法连接服务器，请稍后重试",
      //     meta: "catch"
      //   })
      // );
      yield call(onFailure, {
        error: "无法连接服务器，请稍后重试",
        meta: "catch"
      });
      console.log("err", err);
    }
  };

export default createFetchSaga;

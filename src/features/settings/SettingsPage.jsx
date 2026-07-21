import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import packageInfo from "../../../package.json";
import { fetchMyFriendProfile } from "../../infrastructure/supabase/friendsGateway.js";
import { saveCurrentProfileNickname } from "../../infrastructure/supabase/omokOnlineRoomGateway.js";
import { FRIENDS_PATH } from "../friends/friendsConstants.js";
import { useAuth } from "../../shared/auth/AuthContext.jsx";
import { AUTH_LABELS, getAccountLabel, LOGIN_PATH } from "../../shared/auth/authConstants.js";
import { Button } from "../../shared/components/Button.jsx";
import { clearMomentPlayLocalData } from "../../shared/settings/localDataSettings.js";
import "./settings.css";

const FRIEND_STATUS = {
  IDLE: "idle",
  LOADING: "loading",
  READY: "ready",
  ERROR: "error",
};

export function SettingsPage() {
  const { isConfigured, refreshSession, signOut, status: authStatus, user } = useAuth();
  const [friendProfile, setFriendProfile] = useState(null);
  const [friendStatus, setFriendStatus] = useState(FRIEND_STATUS.IDLE);
  const [nicknameInput, setNicknameInput] = useState("");
  const [nicknameMessage, setNicknameMessage] = useState("");
  const [nicknameMessageType, setNicknameMessageType] = useState("status");
  const [isSavingNickname, setIsSavingNickname] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [accountMessage, setAccountMessage] = useState("");
  const [isResetConfirmOpen, setIsResetConfirmOpen] = useState(false);
  const [resetMessage, setResetMessage] = useState("");

  useEffect(() => {
    if (authStatus !== "authenticated" || !isConfigured) {
      setFriendProfile(null);
      setFriendStatus(FRIEND_STATUS.IDLE);
      setNicknameInput("");
      return undefined;
    }

    let active = true;
    setFriendStatus(FRIEND_STATUS.LOADING);

    fetchMyFriendProfile()
      .then((profile) => {
        if (!active) return;
        setFriendProfile(profile);
        setNicknameInput(profile?.nickname ?? "");
        setFriendStatus(FRIEND_STATUS.READY);
      })
      .catch(() => {
        if (!active) return;
        setFriendStatus(FRIEND_STATUS.ERROR);
      });

    return () => {
      active = false;
    };
  }, [authStatus, isConfigured]);

  async function handleNicknameSave(event) {
    event.preventDefault();
    setIsSavingNickname(true);
    setNicknameMessage("");

    try {
      const savedProfile = await saveCurrentProfileNickname(nicknameInput);
      setFriendProfile((current) => ({
        ...(current ?? {}),
        nickname: savedProfile.nickname,
      }));
      setNicknameInput(savedProfile.nickname);
      await refreshSession?.();
      setNicknameMessageType("status");
      setNicknameMessage("닉네임을 변경했어요.");
    } catch (error) {
      setNicknameMessageType("error");
      setNicknameMessage(error instanceof Error ? error.message : "닉네임을 변경하지 못했습니다.");
    } finally {
      setIsSavingNickname(false);
    }
  }

  async function handleSignOut() {
    setIsSigningOut(true);
    setAccountMessage("");

    try {
      await signOut();
    } catch {
      setAccountMessage("로그아웃하지 못했습니다. 잠시 후 다시 시도해 주세요.");
    } finally {
      setIsSigningOut(false);
    }
  }

  function handleResetLocalData() {
    setResetMessage("");

    try {
      const removedCount = clearMomentPlayLocalData();
      setResetMessage(
        removedCount > 0
          ? "이 기기의 게임 기록과 임시 플레이 데이터를 초기화했어요."
          : "초기화할 기기 내 게임 기록이 없어요.",
      );
      setIsResetConfirmOpen(false);
    } catch {
      setResetMessage("기기 내 데이터를 초기화하지 못했습니다.");
    }
  }

  const isPermanentAccount = authStatus === "authenticated";
  const accountNickname = friendProfile?.nickname ?? getAccountLabel(user);

  return (
    <section className="wrap settings-page" aria-labelledby="settings-title">
      <header className="settings-page__header">
        <p className="eyebrow">Preferences</p>
        <h1 className="page-title" id="settings-title">SETTINGS</h1>
        <p>계정과 이 기기에 저장된 플레이 데이터를 관리할 수 있어요.</p>
      </header>

      <div className="settings-grid">
        <section className="card settings-card settings-card--account" aria-labelledby="account-title">
          <div className="settings-card__heading">
            <div>
              <p className="eyebrow">Account</p>
              <h2 id="account-title">계정</h2>
              <p>친구와 온라인 게임에서 사용하는 계정 정보를 관리합니다.</p>
            </div>
          </div>

          {authStatus === "loading" ? (
            <p className="settings-muted" role="status">계정 정보를 확인하고 있어요.</p>
          ) : isPermanentAccount ? (
            <div className="account-settings">
              <div className="account-settings__profile">
                <div className="account-settings__identity">
                  <span className="settings-avatar" aria-hidden="true">{accountNickname.slice(0, 1).toUpperCase()}</span>
                  <div>
                    <strong>{accountNickname}</strong>
                    <span>{user?.email ?? "이메일 정보 없음"}</span>
                  </div>
                </div>

                <form className="nickname-settings" onSubmit={handleNicknameSave}>
                  <label className="f-label" htmlFor="account-nickname">닉네임</label>
                  <div className="nickname-settings__row">
                    <input
                      className="txt nickname-settings__input"
                      id="account-nickname"
                      type="text"
                      minLength={2}
                      maxLength={12}
                      autoComplete="nickname"
                      value={nicknameInput}
                      disabled={friendStatus !== FRIEND_STATUS.READY || isSavingNickname}
                      onChange={(event) => {
                        setNicknameInput(event.target.value);
                        setNicknameMessage("");
                      }}
                    />
                    <Button
                      className="nickname-settings__save"
                      size="small"
                      type="submit"
                      disabled={friendStatus !== FRIEND_STATUS.READY || isSavingNickname}
                    >
                      {isSavingNickname ? "저장 중…" : "저장"}
                    </Button>
                  </div>
                  <p className="nickname-settings__help">친구와 온라인 오목에서 공통으로 사용하는 이름입니다.</p>
                  {nicknameMessage ? (
                    <p
                      className={`settings-notice${nicknameMessageType === "error" ? " is-error" : ""}`}
                      role={nicknameMessageType === "error" ? "alert" : "status"}
                    >
                      {nicknameMessage}
                    </p>
                  ) : null}
                </form>
              </div>

              <div className="account-settings__meta">
                <dl className="account-details">
                  <div>
                    <dt>친구 코드</dt>
                    <dd>
                      {friendStatus === FRIEND_STATUS.LOADING ? "불러오는 중…" : null}
                      {friendStatus === FRIEND_STATUS.READY ? friendProfile?.friendCode ?? "확인할 수 없음" : null}
                      {friendStatus === FRIEND_STATUS.ERROR ? "불러오지 못함" : null}
                    </dd>
                  </div>
                  <div>
                    <dt>서버 연결</dt>
                    <dd>{isConfigured ? "연결됨" : "설정 필요"}</dd>
                  </div>
                </dl>

                <div className="settings-actions settings-actions--account">
                  <Button as={Link} size="small" to={FRIENDS_PATH} variant="secondary">친구 관리</Button>
                  <Button size="small" type="button" variant="secondary" disabled={isSigningOut} onClick={() => void handleSignOut()}>
                    {isSigningOut ? "로그아웃 중…" : AUTH_LABELS.logout}
                  </Button>
                </div>
              </div>
            </div>
          ) : (
            <div className="account-settings account-settings--guest">
              <p>로그인하면 랭킹 기록 저장, 친구 관리, 친구 오목 초대를 사용할 수 있어요.</p>
              <Button as={Link} size="small" to={LOGIN_PATH}>{AUTH_LABELS.login}</Button>
            </div>
          )}

          {accountMessage ? <p className="settings-notice is-error" role="alert">{accountMessage}</p> : null}
        </section>

        <section className="card settings-card settings-card--data" aria-labelledby="data-title">
          <div className="settings-card__heading">
            <div>
              <p className="eyebrow">Device Data</p>
              <h2 id="data-title">기기 내 플레이 데이터</h2>
              <p>이 브라우저에 저장된 게임 기록과 임시 플레이 정보만 초기화합니다.</p>
            </div>
          </div>

          <div className="data-settings">
            <div className="data-settings__copy">
              <strong>서버 데이터는 유지돼요</strong>
              <p>로그인 계정, 서버 랭킹과 친구 관계는 삭제하지 않습니다.</p>
            </div>

            {!isResetConfirmOpen ? (
              <Button size="small" type="button" variant="secondary" onClick={() => {
                setResetMessage("");
                setIsResetConfirmOpen(true);
              }}>
                게임 기록 초기화
              </Button>
            ) : (
              <div className="reset-confirm" role="group" aria-label="게임 기록 초기화 확인">
                <p>기기 내 기록을 삭제할까요?</p>
                <div className="settings-actions">
                  <Button size="small" type="button" variant="secondary" onClick={() => setIsResetConfirmOpen(false)}>취소</Button>
                  <Button size="small" type="button" onClick={handleResetLocalData}>초기화</Button>
                </div>
              </div>
            )}
          </div>

          {resetMessage ? <p className="settings-notice" role="status">{resetMessage}</p> : null}
        </section>

        <section className="card settings-card settings-card--about" aria-labelledby="about-title">
          <div className="settings-card__heading settings-card__heading--about">
            <div>
              <p className="eyebrow">About</p>
              <h2 id="about-title">Moment Play 정보</h2>
              <p>짧게 즐기는 게임과 친구 플레이를 위한 미니게임 서비스입니다.</p>
            </div>
            <span className="settings-card__badge">v{packageInfo.version}</span>
          </div>

          <div className="about-settings">
            <div><strong>기기 저장</strong><span>로컬 최고 기록과 임시 플레이 정보</span></div>
            <div><strong>서버 저장</strong><span>계정, 랭킹, 친구 관계와 온라인 오목 방</span></div>
            <div><strong>현재 단계</strong><span>친구 초대 기능을 준비 중인 출시 전 MVP</span></div>
          </div>
        </section>
      </div>
    </section>
  );
}

import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  cancelFriendRequest,
  fetchFriendOverview,
  fetchMyFriendProfile,
  findFriendByCode,
  removeFriend,
  respondToFriendRequest,
  sendFriendRequest,
} from "../../infrastructure/supabase/friendsGateway.js";
import { useAuth } from "../../shared/auth/AuthContext.jsx";
import { AUTH_LABELS, LOGIN_PATH } from "../../shared/auth/authConstants.js";
import { Button } from "../../shared/components/Button.jsx";
import { StatusPanel } from "../../shared/components/StatusPanel.jsx";
import "./friends.css";

const LOAD_STATUS = {
  IDLE: "idle",
  LOADING: "loading",
  READY: "ready",
  ERROR: "error",
};

const RELATIONSHIP_LABEL = {
  friend: "이미 친구",
  none: "새로운 친구",
  pending_incoming: "받은 요청이 있어요",
  pending_outgoing: "요청을 보냈어요",
};

function normalizeFriendCode(value) {
  return String(value ?? "")
    .replace(/[^a-fA-F0-9]/g, "")
    .slice(0, 10)
    .toUpperCase();
}

function getFriendlyErrorMessage(error, fallback = "요청을 처리하지 못했습니다. 잠시 후 다시 시도해 주세요.") {
  const message = error instanceof Error ? error.message : String(error?.message ?? "");

  if (message.includes("Invalid friend code")) return "친구 코드는 영문 A–F와 숫자로 이루어진 10자리 코드예요.";
  if (message.includes("Friend code not found")) return "일치하는 친구 코드를 찾지 못했어요.";
  if (message.includes("You cannot add yourself")) return "내 친구 코드로는 요청을 보낼 수 없어요.";
  if (message.includes("Friend request already exists")) return "이미 친구 요청을 주고받고 있어요.";
  if (message.includes("Already friends")) return "이미 친구로 연결되어 있어요.";
  if (message.includes("Permanent account required")) return "친구 기능은 로그인한 계정에서 사용할 수 있어요.";
  if (message.includes("Pending friend request not found")) return "처리할 수 있는 친구 요청을 찾지 못했어요.";
  if (message.includes("Outgoing friend request not found")) return "취소할 수 있는 보낸 요청을 찾지 못했어요.";
  if (message.includes("Friendship not found")) return "삭제할 수 있는 친구 관계를 찾지 못했어요.";

  return fallback;
}

function formatFriendDate(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("ko-KR", { month: "short", day: "numeric" }).format(date);
}

function FriendListSection({ title, description, items, emptyText, actionKey, onAction, type }) {
  return (
    <section className="card friend-section" aria-labelledby={`friend-section-${type}`}>
      <header className="friend-section__header">
        <div>
          <h2 id={`friend-section-${type}`}>{title}</h2>
          <p>{description}</p>
        </div>
        <span className="friend-section__count" aria-label={`${items.length}명`}>{items.length}</span>
      </header>

      {items.length === 0 ? (
        <p className="friend-section__empty">{emptyText}</p>
      ) : (
        <ul className="friend-list">
          {items.map((item) => {
            const isBusy = actionKey === item.friendshipId;
            return (
              <li className="friend-list__item" key={item.friendshipId}>
                <div className="friend-list__identity">
                  <span className="friend-avatar" aria-hidden="true">{item.nickname.slice(0, 1).toUpperCase()}</span>
                  <div>
                    <strong>{item.nickname}</strong>
                    <span>{item.friendCode}</span>
                  </div>
                </div>

                <div className="friend-list__meta">
                  {formatFriendDate(item.respondedAt ?? item.createdAt) ? (
                    <time dateTime={item.respondedAt ?? item.createdAt}>{formatFriendDate(item.respondedAt ?? item.createdAt)}</time>
                  ) : null}
                  <div className="friend-actions">
                    {type === "incoming" ? (
                      <>
                        <Button size="small" disabled={isBusy} onClick={() => onAction(item, "accept")}>수락</Button>
                        <Button size="small" variant="secondary" disabled={isBusy} onClick={() => onAction(item, "reject")}>거절</Button>
                      </>
                    ) : null}
                    {type === "outgoing" ? (
                      <Button size="small" variant="secondary" disabled={isBusy} onClick={() => onAction(item, "cancel")}>요청 취소</Button>
                    ) : null}
                    {type === "friends" ? (
                      <Button size="small" variant="secondary" disabled={isBusy} onClick={() => onAction(item, "remove")}>친구 삭제</Button>
                    ) : null}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

export function FriendsPage() {
  const { isConfigured, status: authStatus } = useAuth();
  const [profile, setProfile] = useState(null);
  const [overview, setOverview] = useState([]);
  const [loadStatus, setLoadStatus] = useState(LOAD_STATUS.IDLE);
  const [pageError, setPageError] = useState("");
  const [searchCode, setSearchCode] = useState("");
  const [searchResult, setSearchResult] = useState(null);
  const [searchStatus, setSearchStatus] = useState("idle");
  const [searchMessage, setSearchMessage] = useState("");
  const [actionKey, setActionKey] = useState("");
  const [copyStatus, setCopyStatus] = useState("idle");

  const loadFriends = useCallback(async () => {
    const [nextProfile, nextOverview] = await Promise.all([
      fetchMyFriendProfile(),
      fetchFriendOverview(),
    ]);
    setProfile(nextProfile);
    setOverview(nextOverview);
  }, []);

  useEffect(() => {
    if (authStatus !== "authenticated" || !isConfigured) {
      setLoadStatus(LOAD_STATUS.IDLE);
      return undefined;
    }

    let active = true;
    setLoadStatus(LOAD_STATUS.LOADING);
    setPageError("");

    loadFriends()
      .then(() => {
        if (active) setLoadStatus(LOAD_STATUS.READY);
      })
      .catch((error) => {
        if (!active) return;
        setPageError(getFriendlyErrorMessage(error, "친구 정보를 불러오지 못했습니다."));
        setLoadStatus(LOAD_STATUS.ERROR);
      });

    return () => {
      active = false;
    };
  }, [authStatus, isConfigured, loadFriends]);

  const groups = useMemo(() => ({
    friends: overview.filter((item) => item.status === "accepted"),
    incoming: overview.filter((item) => item.status === "pending" && item.direction === "incoming"),
    outgoing: overview.filter((item) => item.status === "pending" && item.direction === "outgoing"),
  }), [overview]);

  async function handleCopyCode() {
    if (!profile?.friendCode) return;
    try {
      await navigator.clipboard.writeText(profile.friendCode);
      setCopyStatus("copied");
      window.setTimeout(() => setCopyStatus("idle"), 1600);
    } catch {
      setCopyStatus("error");
    }
  }

  async function handleSearch(event) {
    event.preventDefault();
    const normalizedCode = normalizeFriendCode(searchCode);
    setSearchCode(normalizedCode);
    setSearchResult(null);
    setSearchMessage("");

    if (normalizedCode.length !== 10) {
      setSearchStatus("error");
      setSearchMessage("친구 코드 10자리를 입력해 주세요.");
      return;
    }

    setSearchStatus("loading");
    try {
      const result = await findFriendByCode(normalizedCode);
      setSearchResult(result);
      setSearchStatus("ready");
    } catch (error) {
      setSearchStatus("error");
      setSearchMessage(getFriendlyErrorMessage(error, "친구를 검색하지 못했습니다."));
    }
  }

  async function handleSendRequest() {
    if (!searchResult || searchResult.relationshipStatus !== "none") return;
    setActionKey(`search:${searchResult.friendCode}`);
    setSearchMessage("");

    try {
      await sendFriendRequest(searchResult.friendCode);
      setSearchResult((current) => current ? { ...current, relationshipStatus: "pending_outgoing" } : current);
      await loadFriends();
    } catch (error) {
      setSearchMessage(getFriendlyErrorMessage(error));
    } finally {
      setActionKey("");
    }
  }

  async function handleRelationshipAction(item, action) {
    setActionKey(item.friendshipId);
    setPageError("");

    try {
      if (action === "accept" || action === "reject") {
        await respondToFriendRequest(item.friendshipId, action);
      } else if (action === "cancel") {
        await cancelFriendRequest(item.friendshipId);
      } else if (action === "remove") {
        await removeFriend(item.friendshipId);
      }
      await loadFriends();
    } catch (error) {
      setPageError(getFriendlyErrorMessage(error));
    } finally {
      setActionKey("");
    }
  }

  if (authStatus === "loading") {
    return (
      <section className="wrap friends-page">
        <StatusPanel title="계정 정보를 확인하고 있어요" description="잠시만 기다려 주세요." />
      </section>
    );
  }

  if (!isConfigured) {
    return (
      <section className="wrap friends-page">
        <StatusPanel type="error" title="친구 서버가 연결되지 않았습니다" description="Supabase 환경 설정을 확인해 주세요." />
      </section>
    );
  }

  if (authStatus !== "authenticated") {
    return (
      <section className="wrap friends-page">
        <StatusPanel
          title="로그인하면 친구와 연결할 수 있어요"
          description="친구 코드를 검색하고 요청을 주고받으려면 로그인해 주세요. 계정이 없다면 로그인 화면에서 회원가입할 수 있어요."
          action={<Button as={Link} to={LOGIN_PATH}>{AUTH_LABELS.login}</Button>}
        />
      </section>
    );
  }

  return (
    <section className="wrap friends-page" aria-labelledby="friends-title">
      <header className="friends-page__header">
        <p className="eyebrow">Play Together</p>
        <h1 id="friends-title">친구</h1>
        <p>친구 코드를 주고받고, 함께 플레이할 사람을 안전하게 관리해 보세요.</p>
      </header>

      {loadStatus === LOAD_STATUS.LOADING ? (
        <div className="card friends-page__loading" role="status">
          <span className="friends-page__spinner" aria-hidden="true" />
          친구 정보를 불러오는 중…
        </div>
      ) : null}

      {loadStatus === LOAD_STATUS.ERROR ? (
        <StatusPanel
          type="error"
          title="친구 정보를 불러오지 못했습니다"
          description={pageError}
          action={<Button type="button" onClick={() => window.location.reload()}>다시 시도</Button>}
        />
      ) : null}

      {loadStatus === LOAD_STATUS.READY ? (
        <>
          {pageError ? <p className="friends-page__notice is-error" role="alert">{pageError}</p> : null}

          <div className="friends-overview-grid">
            <section className="card friend-code-card" aria-labelledby="my-friend-code-title">
              <div>
                <p className="eyebrow">My Friend Code</p>
                <h2 id="my-friend-code-title">내 친구 코드</h2>
                <p>이 코드를 친구에게 공유하면 나를 검색할 수 있어요.</p>
              </div>
              <div className="friend-code-card__value">
                <code>{profile?.friendCode ?? "----------"}</code>
                <Button size="small" variant="secondary" onClick={() => void handleCopyCode()}>
                  {copyStatus === "copied" ? "복사됨" : "코드 복사"}
                </Button>
              </div>
              {copyStatus === "error" ? <p className="friends-page__notice is-error">코드를 복사하지 못했어요.</p> : null}
            </section>

            <section className="card friend-search-card" aria-labelledby="friend-search-title">
              <div>
                <p className="eyebrow">Find a Friend</p>
                <h2 id="friend-search-title">친구 코드 검색</h2>
                <p>상대방의 10자리 코드를 입력해 주세요.</p>
              </div>
              <form className="friend-search-form" onSubmit={handleSearch} noValidate>
                <label className="f-label" htmlFor="friend-code-search">친구 코드</label>
                <div className="friend-search-form__row">
                  <input
                    className="txt friend-code-input"
                    id="friend-code-search"
                    inputMode="text"
                    autoComplete="off"
                    maxLength={10}
                    placeholder="예: BBBBBBBB02"
                    value={searchCode}
                    onChange={(event) => {
                      setSearchCode(normalizeFriendCode(event.target.value));
                      setSearchResult(null);
                      setSearchMessage("");
                      setSearchStatus("idle");
                    }}
                  />
                  <Button className="friend-search-submit" type="submit" disabled={searchStatus === "loading"}>
                    {searchStatus === "loading" ? "검색 중…" : "검색"}
                  </Button>
                </div>
              </form>

              {searchMessage ? <p className="friends-page__notice is-error" role="alert">{searchMessage}</p> : null}

              {searchResult ? (
                <div className="friend-search-result" role="status">
                  <div className="friend-list__identity">
                    <span className="friend-avatar" aria-hidden="true">{searchResult.nickname.slice(0, 1).toUpperCase()}</span>
                    <div>
                      <strong>{searchResult.nickname}</strong>
                      <span>{RELATIONSHIP_LABEL[searchResult.relationshipStatus] ?? "친구"}</span>
                    </div>
                  </div>
                  {searchResult.relationshipStatus === "none" ? (
                    <Button
                      size="small"
                      disabled={actionKey === `search:${searchResult.friendCode}`}
                      onClick={() => void handleSendRequest()}
                    >
                      친구 요청 보내기
                    </Button>
                  ) : (
                    <span className="friend-search-result__status">{RELATIONSHIP_LABEL[searchResult.relationshipStatus]}</span>
                  )}
                </div>
              ) : null}
            </section>
          </div>

          <div className="friend-stats" aria-label="친구 현황">
            <div className="card"><strong>{groups.friends.length}</strong><span>친구</span></div>
            <div className="card"><strong>{groups.incoming.length}</strong><span>받은 요청</span></div>
            <div className="card"><strong>{groups.outgoing.length}</strong><span>보낸 요청</span></div>
          </div>

          <div className="friend-sections-grid">
            <FriendListSection
              type="incoming"
              title="받은 요청"
              description="수락하거나 거절할 요청이에요."
              items={groups.incoming}
              emptyText="새로 받은 친구 요청이 없습니다."
              actionKey={actionKey}
              onAction={(item, action) => void handleRelationshipAction(item, action)}
            />
            <FriendListSection
              type="outgoing"
              title="보낸 요청"
              description="아직 응답을 기다리고 있어요."
              items={groups.outgoing}
              emptyText="응답을 기다리는 요청이 없습니다."
              actionKey={actionKey}
              onAction={(item, action) => void handleRelationshipAction(item, action)}
            />
            <FriendListSection
              type="friends"
              title="친구 목록"
              description="현재 연결된 친구들이에요."
              items={groups.friends}
              emptyText="아직 연결된 친구가 없습니다."
              actionKey={actionKey}
              onAction={(item, action) => void handleRelationshipAction(item, action)}
            />
          </div>
        </>
      ) : null}
    </section>
  );
}

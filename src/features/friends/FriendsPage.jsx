import { useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../shared/auth/AuthContext.jsx";
import { AUTH_LABELS, LOGIN_PATH } from "../../shared/auth/authConstants.js";
import { Button } from "../../shared/components/Button.jsx";
import { LoadingIndicator } from "../../shared/components/LoadingIndicator.jsx";
import { StatusPanel } from "../../shared/components/StatusPanel.jsx";
import { FriendOmokInviteDialog } from "./FriendOmokInviteDialog.jsx";
import { FriendOmokInviteSection } from "./FriendOmokInviteSection.jsx";
import { FRIENDS_LOAD_STATUS, getRelationshipLabel } from "./friendsPageModel.js";
import { useFriendsDashboard } from "./useFriendsDashboard.js";
import { friendsClassNames as cx } from "./friendsStyles.js";

function formatFriendDate(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("ko-KR", { month: "short", day: "numeric" }).format(date);
}

function FriendListSection({ title, description, items, emptyText, actionKey, inviteBusyId, onAction, onInvite, type }) {
  return (
    <section className={cx("card", "friend-section")} aria-labelledby={`friend-section-${type}`}>
      <header className={cx("friend-section__header")}>
        <div>
          <h2 id={`friend-section-${type}`}>{title}</h2>
          <p>{description}</p>
        </div>
        <span className={cx("friend-section__count")} aria-label={`${items.length}명`}>{items.length}</span>
      </header>

      {items.length === 0 ? (
        <p className={cx("friend-section__empty")}>{emptyText}</p>
      ) : (
        <ul className={cx("friend-list")}>
          {items.map((item) => {
            const isBusy = actionKey === item.friendshipId;
            const isInviteBusy = inviteBusyId === `create:${item.friendshipId}`;
            const displayDate = formatFriendDate(item.respondedAt ?? item.createdAt);
            return (
              <li className={cx("friend-list__item")} key={item.friendshipId}>
                <div className={cx("friend-list__identity")}>
                  <span className={cx("friend-avatar")} aria-hidden="true">{item.nickname.slice(0, 1).toUpperCase()}</span>
                  <div>
                    <strong>{item.nickname}</strong>
                    <span>{item.friendCode}</span>
                  </div>
                </div>

                <div className={cx("friend-list__meta")}>
                  {displayDate ? <time dateTime={item.respondedAt ?? item.createdAt}>{displayDate}</time> : null}
                  <div className={cx("friend-actions")}>
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
                      <>
                        <Button size="small" disabled={isBusy || isInviteBusy} onClick={() => onInvite(item)}>오목 초대</Button>
                        <Button size="small" variant="secondary" disabled={isBusy || isInviteBusy} onClick={() => onAction(item, "remove")}>친구 삭제</Button>
                      </>
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
  const navigate = useNavigate();
  const { isConfigured, status: authStatus, user } = useAuth();
  const navigateToRoom = useCallback((roomId) => {
    navigate(`/minigames/omok/room/${encodeURIComponent(roomId)}`);
  }, [navigate]);
  if (authStatus === "loading") {
    return (
      <section className={cx("wrap", "friends-page")}>
        <StatusPanel title="계정 정보를 확인하고 있어요" description="잠시만 기다려 주세요." />
      </section>
    );
  }

  if (!isConfigured) {
    return (
      <section className={cx("wrap", "friends-page")}>
        <StatusPanel title="친구 서버가 연결되지 않았습니다" description="Supabase 환경 설정을 확인해 주세요." />
      </section>
    );
  }

  if (authStatus !== "authenticated") {
    return (
      <section className={cx("wrap", "friends-page")}>
        <StatusPanel
          title="로그인하면 친구와 연결할 수 있어요"
          description="친구 코드를 검색하고 요청을 주고받으려면 로그인해 주세요. 계정이 없다면 로그인 화면에서 회원가입할 수 있어요."
          action={<Button as={Link} to={LOGIN_PATH}>{AUTH_LABELS.login}</Button>}
        />
      </section>
    );
  }

  return <AuthenticatedFriendsPage key={user.id} accountId={user.id} navigateToRoom={navigateToRoom} />;
}

function AuthenticatedFriendsPage({ accountId, navigateToRoom }) {
  const dashboard = useFriendsDashboard({ accountId, navigateToRoom });

  return (
    <>
      <section className={cx("wrap", "friends-page")} aria-labelledby="friends-title">
        <header className={cx("friends-page__header")}>
          <p className="eyebrow">Play Together</p>
          <h1 className="page-title" id="friends-title">FRIENDS</h1>
          <p>친구 코드를 주고받고, 함께 플레이할 사람을 안전하게 관리해 보세요.</p>
        </header>

        {dashboard.loadStatus === FRIENDS_LOAD_STATUS.LOADING ? (
          <div className={cx("card", "friends-page__loading")}>
            <LoadingIndicator label="친구 정보를 불러오는 중…" />
          </div>
        ) : null}

        {dashboard.loadStatus === FRIENDS_LOAD_STATUS.ERROR ? (
          <StatusPanel
            type="error"
            title="친구 정보를 불러오지 못했습니다"
            description={dashboard.pageError}
            action={<Button type="button" onClick={() => window.location.reload()}>다시 시도</Button>}
          />
        ) : null}

        {dashboard.loadStatus === FRIENDS_LOAD_STATUS.READY ? (
          <>
            {dashboard.pageError ? <p className={cx("friends-page__notice", "is-error")} role="alert">{dashboard.pageError}</p> : null}
            {dashboard.inviteError && !dashboard.inviteTarget ? <p className={cx("friends-page__notice", "is-error")} role="alert">{dashboard.inviteError}</p> : null}

            <div className={cx("friends-overview-grid")}>
              <section className={cx("card", "friend-code-card")} aria-labelledby="my-friend-code-title">
                <div>
                  <p className="eyebrow">My Friend Code</p>
                  <h2 id="my-friend-code-title">내 친구 코드</h2>
                  <p>이 코드를 친구에게 공유하면 나를 검색할 수 있어요.</p>
                </div>
                <div className={cx("friend-code-card__value")}>
                  <code>{dashboard.profile?.friendCode ?? "----------"}</code>
                  <Button size="small" variant="secondary" onClick={() => void dashboard.copyCode()}>
                    {dashboard.copyStatus === "copied" ? "복사됨" : "코드 복사"}
                  </Button>
                </div>
                {dashboard.copyStatus === "error" ? <p className={cx("friends-page__notice", "is-error")}>코드를 복사하지 못했어요.</p> : null}
              </section>

              <section className={cx("card", "friend-search-card")} aria-labelledby="friend-search-title">
                <div>
                  <p className="eyebrow">Find a Friend</p>
                  <h2 id="friend-search-title">친구 코드 검색</h2>
                  <p>상대방의 10자리 코드를 입력해 주세요.</p>
                </div>
                <form
                  className={cx("friend-search-form")}
                  onSubmit={(event) => {
                    event.preventDefault();
                    void dashboard.search();
                  }}
                  noValidate
                >
                  <label className="f-label" htmlFor="friend-code-search">친구 코드</label>
                  <div className={cx("friend-search-form__row")}>
                    <input
                      className={cx("txt", "friend-code-input")}
                      id="friend-code-search"
                      inputMode="text"
                      autoComplete="off"
                      maxLength={10}
                      placeholder="예: BBBBBBBB02"
                      value={dashboard.searchCode}
                      onChange={(event) => dashboard.updateSearchCode(event.target.value)}
                    />
                    <Button className={cx("friend-search-submit")} type="submit" disabled={dashboard.searchStatus === "loading"}>
                      {dashboard.searchStatus === "loading" ? "검색 중…" : "검색"}
                    </Button>
                  </div>
                </form>

                {dashboard.searchMessage ? <p className={cx("friends-page__notice", "is-error")} role="alert">{dashboard.searchMessage}</p> : null}

                {dashboard.searchResult ? (
                  <div className={cx("friend-search-result")} role="status">
                    <div className={cx("friend-list__identity")}>
                      <span className={cx("friend-avatar")} aria-hidden="true">{dashboard.searchResult.nickname.slice(0, 1).toUpperCase()}</span>
                      <div>
                        <strong>{dashboard.searchResult.nickname}</strong>
                        <span>{getRelationshipLabel(dashboard.searchResult.relationshipStatus)}</span>
                      </div>
                    </div>
                    {dashboard.searchResult.relationshipStatus === "none" ? (
                      <Button
                        size="small"
                        disabled={dashboard.actionKey === `search:${dashboard.searchResult.friendCode}`}
                        onClick={() => void dashboard.sendRequest()}
                      >
                        친구 요청 보내기
                      </Button>
                    ) : (
                      <span className={cx("friend-search-result__status")}>{getRelationshipLabel(dashboard.searchResult.relationshipStatus)}</span>
                    )}
                  </div>
                ) : null}
              </section>
            </div>

            <FriendOmokInviteSection
              incoming={dashboard.inviteGroups.incoming}
              outgoing={dashboard.inviteGroups.outgoing}
              busyInviteId={dashboard.busyInviteId}
              isRefreshing={dashboard.isRefreshingInvites}
              onAccept={(invite) => void dashboard.runInviteAction(invite, "accept")}
              onDecline={(invite) => void dashboard.runInviteAction(invite, "decline")}
              onCancel={(invite) => void dashboard.runInviteAction(invite, "cancel")}
              onEnterRoom={(invite) => dashboard.enterRoom(invite.roomId)}
              onRefresh={() => void dashboard.refreshInvites({ surfaceError: true }).catch(() => {})}
            />

            <div className={cx("friend-stats")} aria-label="친구 현황">
              <div className="card"><strong>{dashboard.groups.friends.length}</strong><span>친구</span></div>
              <div className="card"><strong>{dashboard.groups.incoming.length}</strong><span>받은 요청</span></div>
              <div className="card"><strong>{dashboard.groups.outgoing.length}</strong><span>보낸 요청</span></div>
            </div>

            <div className={cx("friend-sections-grid")}>
              <FriendListSection
                type="incoming"
                title="받은 요청"
                description="수락하거나 거절할 요청이에요."
                items={dashboard.groups.incoming}
                emptyText="새로 받은 친구 요청이 없습니다."
                actionKey={dashboard.actionKey}
                inviteBusyId={dashboard.busyInviteId}
                onAction={(item, action) => void dashboard.runRelationshipAction(item, action)}
              />
              <FriendListSection
                type="outgoing"
                title="보낸 요청"
                description="아직 응답을 기다리고 있어요."
                items={dashboard.groups.outgoing}
                emptyText="응답을 기다리는 요청이 없습니다."
                actionKey={dashboard.actionKey}
                inviteBusyId={dashboard.busyInviteId}
                onAction={(item, action) => void dashboard.runRelationshipAction(item, action)}
              />
              <FriendListSection
                type="friends"
                title="친구 목록"
                description="현재 연결된 친구들이에요."
                items={dashboard.groups.friends}
                emptyText="아직 연결된 친구가 없습니다."
                actionKey={dashboard.actionKey}
                inviteBusyId={dashboard.busyInviteId}
                onAction={(item, action) => void dashboard.runRelationshipAction(item, action)}
                onInvite={dashboard.openInviteDialog}
              />
            </div>
          </>
        ) : null}
      </section>

      {dashboard.inviteTarget ? (
        <FriendOmokInviteDialog
          friend={dashboard.inviteTarget}
          isSubmitting={dashboard.busyInviteId === `create:${dashboard.inviteTarget.friendshipId}`}
          errorMessage={dashboard.inviteError}
          onClose={dashboard.closeInviteDialog}
          onSubmit={(settings) => void dashboard.createInvite(settings)}
        />
      ) : null}
    </>
  );
}

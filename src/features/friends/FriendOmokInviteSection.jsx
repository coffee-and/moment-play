import { Button } from "../../shared/components/Button.jsx";
import { OMOK_MODE_LABEL } from "../minigames/games/omok/omok.constants.js";
import "./friend-omok-inbox.css";

function formatInviteDeadline(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("ko-KR", { hour: "numeric", minute: "2-digit" }).format(date);
}

function InviteList({ title, description, items, emptyText, busyInviteId, direction, onAccept, onDecline, onCancel, onEnterRoom }) {
  return (
    <section className="card friend-invite-section" aria-labelledby={`friend-invite-${direction}`}>
      <header className="friend-invite-section__header">
        <div>
          <h2 id={`friend-invite-${direction}`}>{title}</h2>
          <p>{description}</p>
        </div>
        <span className="friend-section__count" aria-label={`${items.length}개`}>{items.length}</span>
      </header>

      {items.length === 0 ? (
        <p className="friend-section__empty">{emptyText}</p>
      ) : (
        <ul className="friend-invite-list">
          {items.map((invite) => {
            const isBusy = busyInviteId === invite.inviteId;
            const deadline = formatInviteDeadline(invite.expiresAt);
            return (
              <li className="friend-invite-list__item" key={invite.inviteId}>
                <div className="friend-list__identity">
                  <span className="friend-avatar" aria-hidden="true">{invite.nickname.slice(0, 1).toUpperCase()}</span>
                  <div>
                    <strong>{invite.nickname}</strong>
                    <span>{OMOK_MODE_LABEL[invite.gameMode] ?? "Omok"}</span>
                  </div>
                </div>

                <div className="friend-invite-list__details">
                  {deadline ? <time dateTime={invite.expiresAt}>{deadline}까지</time> : null}
                  <div className="friend-actions">
                    {direction === "incoming" ? (
                      <>
                        <Button size="small" disabled={isBusy} onClick={() => onAccept(invite)}>수락하고 입장</Button>
                        <Button size="small" variant="secondary" disabled={isBusy} onClick={() => onDecline(invite)}>거절</Button>
                      </>
                    ) : (
                      <>
                        <Button size="small" onClick={() => onEnterRoom(invite)} disabled={isBusy || !invite.roomId}>대기실 입장</Button>
                        <Button size="small" variant="secondary" disabled={isBusy} onClick={() => onCancel(invite)}>초대 취소</Button>
                      </>
                    )}
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

export function FriendOmokInviteSection({
  incoming,
  outgoing,
  busyInviteId,
  isRefreshing = false,
  onAccept,
  onCancel,
  onDecline,
  onEnterRoom,
  onRefresh,
}) {
  return (
    <section className="friend-invite-dashboard" id="omok-invites" aria-labelledby="friend-invite-dashboard-title">
      <header className="friend-invite-dashboard__header">
        <div>
          <p className="eyebrow">Play Together</p>
          <h2 id="friend-invite-dashboard-title">오목 초대함</h2>
          <p>친구가 보낸 초대를 수락하거나 내가 만든 대기실로 이동할 수 있어요.</p>
        </div>
        <div className="friend-invite-dashboard__refresh">
          <span>자동 갱신</span>
          <Button size="small" type="button" variant="secondary" disabled={isRefreshing} onClick={onRefresh}>
            {isRefreshing ? "갱신 중…" : "새로고침"}
          </Button>
        </div>
      </header>
      <div className="friend-invite-dashboard__grid">
        <InviteList
          direction="incoming"
          title="받은 오목 초대"
          description="수락하면 같은 온라인 대기실로 입장합니다."
          items={incoming}
          emptyText="새로 받은 오목 초대가 없습니다."
          busyInviteId={busyInviteId}
          onAccept={onAccept}
          onDecline={onDecline}
        />
        <InviteList
          direction="outgoing"
          title="보낸 오목 초대"
          description="친구가 들어올 때까지 대기실에서 기다릴 수 있어요."
          items={outgoing}
          emptyText="응답을 기다리는 오목 초대가 없습니다."
          busyInviteId={busyInviteId}
          onCancel={onCancel}
          onEnterRoom={onEnterRoom}
        />
      </div>
    </section>
  );
}

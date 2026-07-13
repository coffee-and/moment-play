import { Link } from "react-router-dom";
import { Button } from "../../shared/components/Button.jsx";
import { RESULT_SUBMISSION_STATUS } from "./useGameResultSubmission.js";

export function ResultSubmissionStatus({ submission }) {
  if (!submission || submission.status === RESULT_SUBMISSION_STATUS.IDLE) return null;

  if (submission.status === RESULT_SUBMISSION_STATUS.UNAUTHENTICATED) {
    return (
      <div className="result-submission" role="status">
        <p>로컬 기록은 유지됩니다. 로그인하면 다음 기록부터 랭킹에 저장할 수 있어요.</p>
        <Button as={Link} to="/login" size="small">로그인</Button>
      </div>
    );
  }

  if (submission.status === RESULT_SUBMISSION_STATUS.ERROR) {
    return (
      <div className="result-submission" role="alert">
        <p>{submission.errorMessage}</p>
        <Button type="button" size="small" variant="secondary" onClick={submission.retry}>다시 저장</Button>
      </div>
    );
  }

  return (
    <p className="result-submission" role="status">
      {submission.status === RESULT_SUBMISSION_STATUS.SAVING ? "랭킹 기록 저장 중…" : "랭킹 기록이 저장되었습니다."}
    </p>
  );
}

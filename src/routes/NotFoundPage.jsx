import { Link } from "react-router-dom";
import { StatusPanel } from "../shared/components/StatusPanel.jsx";
import { Button } from "../shared/components/Button.jsx";

export function NotFoundPage() {
  return (
    <div className="wrap">
      <StatusPanel
        type="notFound"
        title="페이지를 찾을 수 없어요"
        description="요청하신 주소가 존재하지 않거나 이동되었어요."
        action={
          <Button as={Link} to="/" variant="primary">
            홈으로 돌아가기
          </Button>
        }
      />
    </div>
  );
}

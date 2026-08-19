import { bindCssModule } from "../../shared/styles/bindCssModule.js";
import inboxStyles from "./friend-omok-inbox.module.css";
import inviteStyles from "./friend-omok-invites.module.css";
import pageStyles from "./friends.module.css";

export const friendsClassNames = bindCssModule({
  ...pageStyles,
  ...inboxStyles,
  ...inviteStyles,
});

// Action map for the router. Each action exports `method` and `handler`.
import * as chat from "./actions/chat.js";
import * as lead from "./actions/lead.js";
import * as plan from "./actions/plan.js";
import * as services from "./actions/services.js";

export default { services, plan, lead, chat };

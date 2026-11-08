import { Hono } from "hono";
import { api } from "./api.js";
import { auth } from "./auth.js";

// The web dashboard's API, mounted at /api/dashboard. Sign-in is the first-party device flow, so
// there is no OAuth redirect endpoint and no Clerk session to exchange: the browser gets this app's
// own signed cookie once the user approves the code on Clerk's page
const dashboard = new Hono();

dashboard.route("/auth", auth);
dashboard.route("/", api);

export { dashboard };

import { useEffect, useState } from "react";

export const ROUTES = ["overview", "reminders", "billing", "settings"] as const;

export type Route = (typeof ROUTES)[number];

const read = (): Route => {
  const raw = window.location.hash.replace(/^#\/?/, "").split(/[/?]/)[0];
  return (ROUTES as readonly string[]).includes(raw) ? (raw as Route) : "overview";
};

export const navigate = (route: Route) => {
  window.location.hash = `#/${route}`;
};

// Hash routing keeps deep links working without server rewrites: every page is the same
// static index.html that the Hono app already serves at /dashboard/
export const useRoute = (): Route => {
  const [route, setRoute] = useState<Route>(read);

  useEffect(() => {
    const onChange = () => setRoute(read());
    window.addEventListener("hashchange", onChange);
    return () => window.removeEventListener("hashchange", onChange);
  }, []);

  return route;
};

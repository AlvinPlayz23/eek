import { useEffect, useState } from "react";
import { AppShell } from "@/components/app-shell";
import { SignIn } from "@/components/sign-in";
import { Spinner } from "@/components/ui/spinner";
import { BillingPage } from "@/pages/billing";
import { OverviewPage } from "@/pages/overview";
import { RemindersPage } from "@/pages/reminders";
import { SettingsPage } from "@/pages/settings";
import { api } from "@/lib/api";
import { navigate, useRoute } from "@/lib/route";

type Auth =
  | { status: "loading" }
  | { status: "out" }
  | { status: "in"; email: string | null };

export function App() {
  const [auth, setAuth] = useState<Auth>({ status: "loading" });
  const [newReminder, setNewReminder] = useState(false);
  const route = useRoute();

  useEffect(() => {
    let alive = true;
    api
      .me()
      .then((me) => {
        if (alive) setAuth({ status: "in", email: me.user.email });
      })
      .catch(() => {
        if (alive) setAuth({ status: "out" });
      });
    return () => {
      alive = false;
    };
  }, []);

  const signOut = async () => {
    await api.signOut().catch(() => {});
    setAuth({ status: "out" });
  };

  if (auth.status === "loading") {
    return (
      <div className="grid min-h-screen place-items-center bg-fog">
        <div className="flex items-center gap-2.5 text-graphite">
          <Spinner className="size-4 text-brand" />
          <span className="text-[11px] uppercase tracking-[0.06em]">Loading</span>
        </div>
      </div>
    );
  }

  if (auth.status === "out") {
    return (
      <SignIn
        onSignedIn={(email) => {
          setAuth({ status: "in", email });
          navigate("overview");
        }}
      />
    );
  }

  return (
    <AppShell
      route={route}
      email={auth.email}
      onSignOut={() => {
        void signOut();
      }}
    >
      {route === "overview" ? (
        <OverviewPage
          onNewReminder={() => {
            setNewReminder(true);
            navigate("reminders");
          }}
        />
      ) : null}

      {route === "reminders" ? (
        <RemindersPage
          openNew={newReminder}
          onNewHandled={() => setNewReminder(false)}
        />
      ) : null}

      {route === "billing" ? <BillingPage /> : null}

      {route === "settings" ? (
        <SettingsPage
          onSignOut={() => {
            void signOut();
          }}
          onSignedOut={() => setAuth({ status: "out" })}
        />
      ) : null}
    </AppShell>
  );
}

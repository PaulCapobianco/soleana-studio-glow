import { createFileRoute } from "@tanstack/react-router";
import { AccountAdmin } from "@/components/site/admin/AccountAdmin";

export const Route = createFileRoute("/admin/_authed/compte")({
  head: () => ({
    meta: [{ title: "Mon compte — Admin" }, { name: "robots", content: "noindex,nofollow" }],
  }),
  component: AccountAdmin,
});

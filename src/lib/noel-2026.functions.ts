import { createServerFn } from "@tanstack/react-start";
import { isNoel2026EditionOver } from "@/data/noel-2026";

// Route loaders also run on client navigation; keep the clock on the server.
export const getNoel2026EditionState = createServerFn({ method: "GET" }).handler(() => ({
  isEditionOver: isNoel2026EditionOver(new Date()),
}));

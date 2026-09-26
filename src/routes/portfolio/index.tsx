import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/portfolio/")({
  component: PortfolioIndex,
});

function PortfolioIndex() {
  return null;
}

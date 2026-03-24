import { expect, test } from "playwright/test";

test("price intelligence journey: homepage to route detail", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: /Avgeek Intelligence Lab/i })).toBeVisible();
  await expect(page.getByRole("heading", { name: /Current intelligence coverage/i })).toBeVisible();

  await page.getByRole("button", { name: "Search" }).click();
  await expect(page.getByRole("heading", { name: /Routes from/i })).toBeVisible();

  await page.getByRole("link", { name: /View Full Analysis/i }).first().click();
  await expect(page.getByText("Route intelligence brief")).toBeVisible();
});

test("airline intelligence journey: overview to carrier drilldown", async ({ page }) => {
  await page.goto("/airlines");
  await expect(page.getByRole("heading", { name: "Carrier-level route performance view" })).toBeVisible();

  await page.getByRole("link", { name: /AA · American Airlines/i }).click();
  await expect(page.getByText("Airline drilldown")).toBeVisible();
  await expect(page.getByText("Route-level drilldown with monthly trend aggregation.")).toBeVisible();
});

test("network journey: geospatial route map renders", async ({ page }) => {
  await page.goto("/network");
  await expect(page.getByRole("heading", { name: "Geospatial route map" })).toBeVisible();
  await expect(page.locator("svg")).toBeVisible();
});

test("flagship wedge route changes page is backend-dependent and truth-labeled", async ({ page }) => {
  await page.goto("/intelligence/route-changes");
  await expect(page.getByRole("heading", { name: "Route change intelligence" })).toBeVisible();
  await expect(page.getByText(/Backend-supported event feed/i)).toBeVisible();
});

test("competition intelligence page renders truthful heading", async ({ page }) => {
  await page.goto("/intelligence/competition");
  await expect(page.getByRole("heading", { name: "Route and airport competition metrics" })).toBeVisible();
});

import { expect, test } from "@playwright/test";

const E2E_EMAIL = process.env.E2E_TEST_EMAIL || "e2e@example.com";
const E2E_PASSWORD = process.env.E2E_TEST_PASSWORD || "e2e-password";

async function signIn(page: Parameters<typeof test>[0]["page"]) {
  await page.goto("/auth/signin");
  await expect(page.getByRole("heading", { name: "SignTracker" })).toBeVisible();

  await page.getByTestId("e2e-email").fill(E2E_EMAIL);
  await page.getByTestId("e2e-password").fill(E2E_PASSWORD);
  await page.getByTestId("e2e-sign-in").click();

  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByRole("heading", { name: "My Children" })).toBeVisible();
}

test.describe.serial("Core user flows", () => {
  test("authenticated user can do child/sign/sharing workflows", async ({ page }) => {
    await signIn(page);

    const childName = `E2E Child ${Date.now()}`;
    const inviteEmail = `invite-${Date.now()}@example.com`;

    await page.getByTestId("add-child-open").click();
    await page.getByTestId("child-name-input").fill(childName);
    await page.getByTestId("add-child-submit").click();

    const childLink = page.getByRole("link", { name: new RegExp(childName) });
    await expect(childLink).toBeVisible();
    await childLink.click();

    await expect(page).toHaveURL(/\/child\//);
    await expect(page.getByRole("heading", { name: childName })).toBeVisible();

    await page.getByTestId("child-sign-search").fill("more");

    const addExisting = page.getByTestId("child-add-existing-sign").first();
    if (await addExisting.isVisible({ timeout: 3000 }).catch(() => false)) {
      await addExisting.click();
    } else {
      await page.getByTestId("child-create-sign").click();
    }

    const signCard = page.locator("div.border.border-gray-200.rounded-xl").filter({ hasText: /More/i }).first();
    await expect(signCard).toBeVisible();

    await signCard.getByRole("button", { name: /Learning|Familiar|Mastered/ }).click();
    await page.getByRole("button", { name: "Mastered" }).first().click();
    await expect(signCard.getByRole("button", { name: /Mastered/ })).toBeVisible();

    await signCard.getByRole("button", { name: "Remove" }).click();
    await page.getByRole("button", { name: "Remove" }).last().click();
    await expect(signCard).toBeHidden();

    await page.getByTestId("child-share-tab").click();
    await page.getByTestId("share-email-input").fill(inviteEmail);
    await page.getByTestId("share-submit").click();

    await expect(page.getByText(new RegExp(`Invite sent to ${inviteEmail}`))).toBeVisible();
  });
});

import { test, expect } from "@playwright/test";

test.describe("SEO robots + sitemap", () => {
  test("/robots.txt geeft 200 en blokkeert /dashboard", async ({ request }) => {
    const res = await request.get("/robots.txt");
    expect(res.status()).toBe(200);

    const body = await res.text();
    expect(body).toMatch(/Disallow:\s*\/dashboard/);
    expect(body).toMatch(/Sitemap:\s*https?:\/\//);
  });

  test("/sitemap.xml geeft 200 en bevat de publieke routes", async ({ request }) => {
    const res = await request.get("/sitemap.xml");
    expect(res.status()).toBe(200);

    const body = await res.text();
    expect(body).toContain("<urlset");
    expect(body).toContain("/privacy");
  });
});

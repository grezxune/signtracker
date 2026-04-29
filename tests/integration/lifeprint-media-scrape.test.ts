import { describe, expect, test } from "bun:test";
import { extractMediaFromLifeprintHtml } from "../../convex/signLookup/mediaScrape";

describe("Lifeprint media extraction", () => {
  test("prefers animated Lifeprint GIFs from relative image attrs", () => {
    const html = `
      <img src="../../images-layout/aslu-share.jpg" />
      <img border="0" src="../../gifs/d/dad-fast.gif" width="480" />
      <img src="../../images-signs/dad.gif" />
      <img src="../../signjpegs/d/dad-01.jpg" />
    `;

    const result = extractMediaFromLifeprintHtml(
      html,
      "https://www.lifeprint.com/asl101/pages-signs/d/dad.htm",
    );

    expect(result).toMatchObject({
      type: "gif",
      url: "https://www.lifeprint.com/asl101/gifs/d/dad-fast.gif",
    });
    expect(result.variants?.map((variant) => variant.url)).toContain(
      "https://www.lifeprint.com/asl101/images-signs/dad.gif",
    );
  });

  test("finds multiple GIF variations and keeps the primary sign first", () => {
    const html = `
      <img src="../../gifs/e/eat.gif" />
      <img src="../../images-signs/eat-01.jpg" />
      <img src="../../gifs/e/eat-food.gif" />
    `;

    const result = extractMediaFromLifeprintHtml(
      html,
      "https://www.lifeprint.com/asl101/pages-signs/e/eat.htm",
    );

    expect(result.type).toBe("gif");
    expect(result.url).toBe("https://www.lifeprint.com/asl101/gifs/e/eat.gif");
    expect(result.variants).toHaveLength(3);
    expect(result.variants?.some((variant) => variant.url.endsWith("/gifs/e/eat-food.gif"))).toBe(true);
  });

  test("falls back to static sign images when no GIF or direct video exists", () => {
    const html = `<img data-src="../../signjpegs/p/pig.ht18.jpg" />`;

    const result = extractMediaFromLifeprintHtml(
      html,
      "https://www.lifeprint.com/asl101/pages-signs/p/pig.htm",
    );

    expect(result).toMatchObject({
      type: "image",
      url: "https://www.lifeprint.com/asl101/signjpegs/p/pig.ht18.jpg",
    });
  });
});

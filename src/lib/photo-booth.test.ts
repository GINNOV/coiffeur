import { describe, expect, it } from "vitest";
import { frameSourceRect, isPhotoId, shotIndex } from "@/lib/photo-booth";

describe("photo ids", () => {
  it("accepts a client id and rejects a path", () => {
    expect(isPhotoId("clh0abc123")).toBe(true);
    expect(isPhotoId("1731330000000-ab12cd34")).toBe(true);
    expect(isPhotoId("../etc")).toBe(false);
    expect(isPhotoId("a/b")).toBe(false);
    expect(isPhotoId("")).toBe(false);
    expect(isPhotoId(".")).toBe(false);
    expect(isPhotoId("..")).toBe(false);
  });

  it("reads only shot numbers 1 to 4", () => {
    expect(shotIndex("1")).toBe(1);
    expect(shotIndex("4")).toBe(4);
    expect(shotIndex("0")).toBeNull();
    expect(shotIndex("5")).toBeNull();
    expect(shotIndex("1.jpg")).toBeNull();
  });
});

describe("frame crop", () => {
  it("copies a frame that already matches the camera pixels", () => {
    expect(
      frameSourceRect({
        videoWidth: 200,
        videoHeight: 200,
        elementWidth: 200,
        elementHeight: 200,
        frameX: 10,
        frameY: 20,
        frameWidth: 80,
        frameHeight: 100,
        mirrored: false,
      }),
    ).toEqual({ sx: 10, sy: 20, sw: 80, sh: 100 });
  });

  it("flips a mirrored preview back onto the camera sensor", () => {
    expect(
      frameSourceRect({
        videoWidth: 200,
        videoHeight: 200,
        elementWidth: 200,
        elementHeight: 200,
        frameX: 10,
        frameY: 20,
        frameWidth: 40,
        frameHeight: 50,
        mirrored: true,
      }),
    ).toEqual({ sx: 150, sy: 20, sw: 40, sh: 50 });
  });

  it("crops the cover-fit overflow and drops a frame with no pixels", () => {
    const cropped = frameSourceRect({
      videoWidth: 100,
      videoHeight: 100,
      elementWidth: 200,
      elementHeight: 100,
      frameX: 0,
      frameY: 0,
      frameWidth: 40,
      frameHeight: 40,
      mirrored: false,
    });
    expect(cropped?.sx).toBe(0);
    expect(cropped && cropped.sw).toBeGreaterThan(8);

    expect(
      frameSourceRect({
        videoWidth: 100,
        videoHeight: 100,
        elementWidth: 100,
        elementHeight: 100,
        frameX: 0,
        frameY: 0,
        frameWidth: 4,
        frameHeight: 4,
        mirrored: false,
      }),
    ).toBeNull();
  });
});

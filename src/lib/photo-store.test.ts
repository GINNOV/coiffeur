import { mkdtemp, readdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { isJpeg, listReferenceStrips, readShot, saveStrip } from "@/lib/photo-store";

const jpeg = Buffer.from([0xff, 0xd8, 0xff, 0xd9]);
const previous = process.env.PHOTO_DIR;

afterEach(() => {
  if (previous === undefined) delete process.env.PHOTO_DIR;
  else process.env.PHOTO_DIR = previous;
});

describe("photo store", () => {
  it("writes four jpegs on this computer and reads them back", async () => {
    process.env.PHOTO_DIR = await mkdtemp(path.join(tmpdir(), "coiffeur-photos-"));
    const id = await saveStrip("client1", [jpeg, jpeg, jpeg, jpeg]);
    expect(id).toMatch(/^[0-9]+-[0-9a-f]+$/);

    const strips = await listReferenceStrips("client1");
    expect(strips).toHaveLength(1);
    expect(strips[0]?.shots).toEqual([
      `/api/clienti/client1/foto/${id}/1`,
      `/api/clienti/client1/foto/${id}/2`,
      `/api/clienti/client1/foto/${id}/3`,
      `/api/clienti/client1/foto/${id}/4`,
    ]);
    expect(await readShot("client1", id ?? "", 2)).toEqual(jpeg);
  });

  it("keeps the newest strip first", async () => {
    process.env.PHOTO_DIR = await mkdtemp(path.join(tmpdir(), "coiffeur-photos-"));
    const older = await saveStrip("client1", [jpeg, jpeg, jpeg, jpeg]);
    await new Promise((resolve) => setTimeout(resolve, 20));
    const newer = await saveStrip("client1", [jpeg, jpeg, jpeg, jpeg]);
    const strips = await listReferenceStrips("client1");
    expect(strips.map((strip) => strip.id)).toEqual([newer, older]);
  });

  it("refuses a short strip, a non-jpeg, and a client id that leaves the folder", async () => {
    const root = await mkdtemp(path.join(tmpdir(), "coiffeur-photos-"));
    process.env.PHOTO_DIR = root;
    expect(await saveStrip("client1", [jpeg, jpeg, jpeg])).toBeNull();
    expect(await saveStrip("client1", [jpeg, jpeg, jpeg, Buffer.from("nope")])).toBeNull();
    expect(await saveStrip("../client1", [jpeg, jpeg, jpeg, jpeg])).toBeNull();
    expect(await readdir(root)).toEqual([]);
    expect(isJpeg(Buffer.from("nope"))).toBe(false);
    expect(await readShot("client1", "missing", 1)).toBeNull();
  });
});

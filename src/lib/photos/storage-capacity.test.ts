import { describe, expect, it } from "vitest";
import { calculateStorageCapacity } from "@/lib/photos/storage-capacity";

describe("calculateStorageCapacity", () => {
  it("reports an empty bucket as zero used and accepts a 100 MB first upload", () => {
    const result = calculateStorageCapacity({
      usedBytes: 0,
      photoBucketBytes: 0,
      photoBucketObjectCount: 0,
      limitBytes: 2_000_000_000,
      averagePhotoBytes: null,
      additionalBytes: 100_000_000,
      criticalUploadMode: "warn",
    });
    expect(result.usagePercent).toBe(0);
    expect(result.projectedPercent).toBe(5);
    expect(result.canUpload).toBe(true);
  });

  it("counts an existing 100 MB in project-wide usage", () => {
    const result = calculateStorageCapacity({
      usedBytes: 100_000_000,
      photoBucketBytes: 70_000_000,
      photoBucketObjectCount: 8,
      limitBytes: 2_000_000_000,
      averagePhotoBytes: 10_000_000,
      criticalUploadMode: "warn",
    });
    expect(result.usagePercent).toBe(5);
    expect(result.photoBucketBytes).toBe(70_000_000);
  });

  it.each([69, 70, 84, 85, 94, 95])("allows an in-limit upload at %i%% in warn mode", (percent) => {
    const result = calculateStorageCapacity({
      usedBytes: percent,
      photoBucketBytes: percent,
      photoBucketObjectCount: 6,
      limitBytes: 100,
      averagePhotoBytes: 10,
      additionalBytes: 1,
      criticalUploadMode: "warn",
    });
    expect(result.usagePercent).toBe(percent);
    expect(result.canUpload).toBe(true);
  });

  it.each([69, 70, 84, 85, 94, 95])("does not block at %i%% in block mode when projected usage fits", (percent) => {
    const result = calculateStorageCapacity({
      usedBytes: percent,
      photoBucketBytes: percent,
      photoBucketObjectCount: 6,
      limitBytes: 100,
      averagePhotoBytes: 10,
      additionalBytes: 1,
      criticalUploadMode: "block",
    });
    expect(result.canUpload).toBe(true);
  });

  it("warns through an over-limit projection but blocks it only in block mode", () => {
    const makeResult = (criticalUploadMode: "warn" | "block") => calculateStorageCapacity({
      usedBytes: 1_900,
      photoBucketBytes: 1_850,
      photoBucketObjectCount: 12,
      limitBytes: 2_000,
      averagePhotoBytes: 10,
      additionalBytes: 101,
      criticalUploadMode,
    });
    expect(makeResult("warn").canUpload).toBe(true);
    expect(makeResult("warn").projectedPercent).toBeGreaterThan(100);
    expect(makeResult("block").canUpload).toBe(false);
  });

  it("fails closed in block mode when no capacity limit is configured", () => {
    const result = calculateStorageCapacity({
      usedBytes: 0,
      photoBucketBytes: 0,
      photoBucketObjectCount: 0,
      limitBytes: null,
      averagePhotoBytes: null,
      criticalUploadMode: "block",
    });
    expect(result.canUpload).toBe(false);
  });

  it("estimates additional photos from project-wide remaining capacity", () => {
    const result = calculateStorageCapacity({
      usedBytes: 250,
      photoBucketBytes: 200,
      photoBucketObjectCount: 12,
      limitBytes: 1_000,
      averagePhotoBytes: 100,
      criticalUploadMode: "warn",
    });
    expect(result.remainingBytes).toBe(750);
    expect(result.estimatedAdditionalPhotos).toBe(7);
  });
});

import { describe, expect, it } from "vitest";
import { calculateStorageCapacity } from "@/lib/photos/storage-capacity";

describe("calculateStorageCapacity", () => {
  it.each([70, 85, 95])("keeps an upload available at %i%% in warn mode", (percent) => {
    const result = calculateStorageCapacity({
      usedBytes: percent,
      photoBucketBytes: percent,
      photoBucketObjectCount: 6,
      limitBytes: 100,
      averagePhotoBytes: 10,
      criticalUploadMode: "warn",
    });
    expect(result.usagePercent).toBe(percent);
    expect(result.canUpload).toBe(true);
  });

  it("blocks a projected over-limit upload only in configured block mode", () => {
    const makeResult = (additionalBytes: number) => calculateStorageCapacity({
      usedBytes: 95,
      photoBucketBytes: 80,
      photoBucketObjectCount: 12,
      limitBytes: 100,
      averagePhotoBytes: 10,
      additionalBytes,
      criticalUploadMode: "block",
    });
    expect(makeResult(5).canUpload).toBe(true);
    expect(makeResult(6).canUpload).toBe(false);
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

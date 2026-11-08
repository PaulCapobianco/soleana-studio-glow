export type CriticalUploadMode = "warn" | "block";

export function calculateStorageCapacity({
  usedBytes,
  photoBucketBytes,
  photoBucketObjectCount,
  limitBytes,
  averagePhotoBytes,
  additionalBytes = 0,
  criticalUploadMode,
}: {
  usedBytes: number;
  photoBucketBytes: number;
  photoBucketObjectCount: number;
  limitBytes: number | null;
  averagePhotoBytes: number | null;
  additionalBytes?: number;
  criticalUploadMode: CriticalUploadMode;
}) {
  const usagePercent = limitBytes === null ? null : (usedBytes / limitBytes) * 100;
  const projectedPercent = limitBytes === null ? null : ((usedBytes + additionalBytes) / limitBytes) * 100;
  const wouldExceedLimit = limitBytes !== null && usedBytes + additionalBytes > limitBytes;

  return {
    usedBytes,
    photoBucketBytes,
    photoBucketObjectCount,
    limitBytes,
    remainingBytes: limitBytes === null ? null : Math.max(0, limitBytes - usedBytes),
    usagePercent,
    projectedPercent,
    averagePhotoBytes,
    estimatedAdditionalPhotos:
      limitBytes !== null && averagePhotoBytes
        ? Math.floor(Math.max(0, limitBytes - usedBytes) / averagePhotoBytes)
        : null,
    criticalUploadMode,
    canUpload: !(criticalUploadMode === "block" && (wouldExceedLimit || limitBytes === null)),
  };
}

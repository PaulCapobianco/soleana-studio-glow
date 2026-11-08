import { describe, expect, it } from "vitest";
import { retryPhotoCleanupJobs, type PhotoCleanupJob } from "@/lib/photos/storage-cleanup";

const job: PhotoCleanupJob = {
  job_id: "job-1",
  object_paths: Array.from({ length: 6 }, (_, index) => `galleries/test/file-${index}.webp`),
};

describe("retryPhotoCleanupJobs", () => {
  it("keeps the durable job when Storage is unavailable after the DB deletion", async () => {
    let savedError: string | null = null;
    const result = await retryPhotoCleanupJobs(
      [job],
      async () => "Storage unavailable",
      async (_id, error) => { savedError = error; return true; },
    );
    expect(result).toEqual({ completed: 0, pending: 1 });
    expect(savedError).toBe("Storage unavailable");
  });

  it("resumes after a partial 3-of-6 delete and tolerates already missing objects", async () => {
    const remaining = new Set(job.object_paths);
    let failedOnce = true;
    const removeBatch = async (paths: string[]) => {
      for (const path of paths.slice(0, failedOnce ? 3 : paths.length)) remaining.delete(path);
      if (failedOnce) {
        failedOnce = false;
        return "temporary Storage error after partial delete";
      }
      return null;
    };
    const savedJobs = new Set([job.job_id]);
    const finishJob = async (id: string, failure: string | null) => {
      if (!failure) savedJobs.delete(id);
      return true;
    };

    expect(await retryPhotoCleanupJobs([job], removeBatch, finishJob)).toEqual({ completed: 0, pending: 1 });
    expect(remaining.size).toBe(3);
    expect(savedJobs.has(job.job_id)).toBe(true);
    expect(await retryPhotoCleanupJobs([job], removeBatch, finishJob)).toEqual({ completed: 1, pending: 0 });
    expect(remaining.size).toBe(0);
    expect(savedJobs.size).toBe(0);
  });

  it("processes a stale duplicate job idempotently", async () => {
    const existing = new Set(job.object_paths);
    let finishCount = 0;
    const removeBatch = async (paths: string[]) => {
      for (const path of paths) existing.delete(path); // absent paths are successful no-ops
      return null;
    };
    const finishJob = async () => { finishCount += 1; return true; };
    expect(await retryPhotoCleanupJobs([job, job], removeBatch, finishJob)).toEqual({ completed: 2, pending: 0 });
    expect(existing.size).toBe(0);
    expect(finishCount).toBe(2);
  });

  it("retains the job when the database completion call fails", async () => {
    const result = await retryPhotoCleanupJobs(
      [job],
      async () => null,
      async () => false,
    );
    expect(result).toEqual({ completed: 0, pending: 1 });
  });
});

export type PhotoCleanupJob = {
  job_id: string;
  object_paths: string[];
};

export async function retryPhotoCleanupJobs(
  jobs: PhotoCleanupJob[],
  removeBatch: (paths: string[]) => Promise<string | null>,
  finishJob: (jobId: string, failure: string | null) => Promise<boolean>,
) {
  let completed = 0;
  let pending = 0;

  for (const job of jobs) {
    const paths = job.object_paths.filter((path) => typeof path === "string" && path.length > 0);
    let failure: string | null = null;
    for (let offset = 0; offset < paths.length; offset += 100) {
      try {
        failure = await removeBatch(paths.slice(offset, offset + 100));
      } catch (error) {
        failure = error instanceof Error ? error.message : "Storage removal failed";
      }
      if (failure) break;
    }

    let finished = false;
    try {
      finished = await finishJob(job.job_id, failure);
    } catch {
      finished = false;
    }
    if (failure || !finished) pending += 1;
    else completed += 1;
  }

  return { completed, pending };
}

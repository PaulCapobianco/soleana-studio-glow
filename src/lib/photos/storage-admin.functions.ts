import { createServerFn } from "@tanstack/react-start";
import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { Database } from "@/integrations/supabase/types";
import { calculateStorageCapacity } from "@/lib/photos/storage-capacity";

const PHOTOS_BUCKET = "photos";
const ORPHAN_VARIANT_PATH = /^galleries\/[a-z0-9][a-z0-9_-]*\/[a-f0-9]{12,32}\/[a-f0-9]{8}-([1-9]|[1-9][0-9]|[1-9][0-9]{2}|1[0-5][0-9]{2}|1600)\.(avif|webp)$/;

type StorageStatusRpc = {
  used_bytes: number;
  object_count: number;
  photo_bucket_bytes: number;
  photo_bucket_object_count: number;
  average_photo_bytes: number | null;
  complete_photo_count: number;
  orphan_count: number;
  orphan_bytes: number;
  orphan_paths: string[];
  missing_variant_count: number;
  pending_cleanup_count: number;
};

function parsePositiveInteger(value: string | undefined, label: string): { value: number | null; error: string | null } {
  if (value === undefined || value.trim() === "") return { value: null, error: `${label} n’est pas configurée.` };
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed <= 0) return { value: null, error: `${label} doit être un entier positif sûr.` };
  return { value: parsed, error: null };
}

function projectStatus(status: Omit<StorageStatusRpc, "orphan_paths">, additionalBytes = 0) {
  const limit = parsePositiveInteger(process.env.PHOTOS_STORAGE_LIMIT_BYTES, "PHOTOS_STORAGE_LIMIT_BYTES");
  const limitBytes = limit.value;
  const modeSetting = process.env.PHOTOS_STORAGE_CRITICAL_UPLOAD_MODE;
  const criticalUploadMode = modeSetting === "block" ? "block" : "warn";
  const modeError = modeSetting && !["warn", "block"].includes(modeSetting)
    ? "PHOTOS_STORAGE_CRITICAL_UPLOAD_MODE accepte uniquement warn ou block."
    : null;
  const configurationError = [limit.error, modeError].filter(Boolean).join(" ") || null;
  return {
    ...calculateStorageCapacity({
      usedBytes: status.used_bytes,
      photoBucketBytes: status.photo_bucket_bytes,
      photoBucketObjectCount: status.photo_bucket_object_count,
      limitBytes,
      averagePhotoBytes: status.average_photo_bytes,
      additionalBytes,
      criticalUploadMode,
    }),
    objectCount: status.object_count,
    completePhotoCount: status.complete_photo_count,
    orphanCount: status.orphan_count,
    orphanBytes: status.orphan_bytes,
    missingVariantCount: status.missing_variant_count,
    pendingCleanupCount: status.pending_cleanup_count,
    configurationError,
  };
}

async function loadStatus(supabase: SupabaseClient<Database>): Promise<StorageStatusRpc> {
  const { data, error } = await supabase.rpc("admin_photo_storage_status");
  if (error || !data || typeof data !== "object") {
    throw new Error("Lecture sécurisée de la capacité Supabase Storage impossible.");
  }
  return data as unknown as StorageStatusRpc;
}

export const getPhotoStorageCapacity = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(z.object({ additionalBytes: z.number().int().nonnegative().optional() }))
  .handler(async ({ context, data }) => {
    const status = await loadStatus(context.supabase);
    const { orphan_paths: _privatePaths, ...safeStatus } = status;
    return projectStatus(safeStatus, data.additionalBytes ?? 0);
  });

export const cleanupOrphanPhotoVariants = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const status = await loadStatus(context.supabase);
    const paths = status.orphan_paths.filter((path) => ORPHAN_VARIANT_PATH.test(path));
    let removed = 0;
    for (let offset = 0; offset < paths.length; offset += 100) {
      const { data, error } = await context.supabase.storage.from(PHOTOS_BUCKET).remove(paths.slice(offset, offset + 100));
      if (error) throw new Error("Le nettoyage des variantes orphelines est incomplet ; relancez-le après vérification.");
      removed += data?.length ?? 0;
    }
    return { removed };
  });

export const retryPhotoStorageCleanup = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: jobs, error } = await context.supabase.rpc("admin_pending_photo_cleanup_jobs");
    if (error) throw new Error("Lecture de la file de nettoyage impossible.");
    let completed = 0;
    let pending = 0;
    for (const job of jobs ?? []) {
      const paths = job.object_paths.filter((path) => typeof path === "string" && path.length > 0);
      let failure: string | null = null;
      for (let offset = 0; offset < paths.length; offset += 100) {
        const { error: removeError } = await context.supabase.storage.from(PHOTOS_BUCKET).remove(paths.slice(offset, offset + 100));
        if (removeError) {
          failure = removeError.message;
          break;
        }
      }
      const { error: finishError } = await context.supabase.rpc("admin_finish_photo_cleanup", {
        p_job_id: job.job_id,
        p_error: failure,
      });
      if (finishError) {
        pending += 1;
      } else if (failure) {
        pending += 1;
      } else {
        completed += 1;
      }
    }
    return { completed, pending };
  });

export type PhotoStorageCapacity = Awaited<ReturnType<typeof getPhotoStorageCapacity>>;

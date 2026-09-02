import cron from "node-cron";
import type { CheckBatchStatus } from "../../application/use-cases/CheckBatchStatus";
import type { IgBatchJobRepository } from "../../domain/repositories/IgBatchJobRepository";
import type { CheckIgExampleSummaryBatches } from "../../application/use-cases/CheckIgExampleSummaryBatches";
import type { CheckSynthesisBatches } from "../../application/use-cases/CheckSynthesisBatches";

export function startBatchPollingJob(
  checkBatchStatus: CheckBatchStatus,
  jobRepo: IgBatchJobRepository,
  checkExampleSummaries: CheckIgExampleSummaryBatches,
  checkSynthesisBatches: CheckSynthesisBatches,
): void {
  cron.schedule("*/5 * * * *", async () => {
    try {
      // Post generation is now two chained OpenAI batches (text, then image — see
      // CheckBatchStatus) — a job can be sitting in either phase between polls.
      const [pendingTextJobs, pendingImageJobs] = await Promise.all([
        jobRepo.findByStatus("processing"),
        jobRepo.findByStatus("generating_images"),
      ]);
      const pendingJobs = [...pendingTextJobs, ...pendingImageJobs];
      for (const job of pendingJobs) {
        await checkBatchStatus.execute(job.id).catch((err: unknown) => {
          console.error(`[batch-polling] Error al procesar job ${job.id}:`, err);
        });
      }
      await checkExampleSummaries.executeAll();
      await checkSynthesisBatches.executeAll();
      if (pendingJobs.length > 0) {
        console.log(`[batch-polling] Procesados ${pendingJobs.length} batch job(s)`);
      }
    } catch (err) {
      console.error("[batch-polling] Error al obtener jobs pendientes:", err);
    }
  });

  console.log("[batch-polling] Cron de polling iniciado (cada 5 minutos)");
}

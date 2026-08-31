import cron from "node-cron";
import type { CheckBatchStatus } from "../../application/use-cases/CheckBatchStatus";
import type { IgBatchJobRepository } from "../../domain/repositories/IgBatchJobRepository";
import type { CheckIgExampleSummaryBatches } from "../../application/use-cases/CheckIgExampleSummaryBatches";

export function startBatchPollingJob(
  checkBatchStatus: CheckBatchStatus,
  jobRepo: IgBatchJobRepository,
  checkExampleSummaries: CheckIgExampleSummaryBatches,
): void {
  cron.schedule("*/5 * * * *", async () => {
    try {
      const pendingJobs = await jobRepo.findByStatus("processing");
      for (const job of pendingJobs) {
        await checkBatchStatus.execute(job.id).catch((err: unknown) => {
          console.error(`[batch-polling] Error al procesar job ${job.id}:`, err);
        });
      }
      await checkExampleSummaries.executeAll();
      if (pendingJobs.length > 0) {
        console.log(`[batch-polling] Procesados ${pendingJobs.length} batch job(s)`);
      }
    } catch (err) {
      console.error("[batch-polling] Error al obtener jobs pendientes:", err);
    }
  });

  console.log("[batch-polling] Cron de polling iniciado (cada 5 minutos)");
}

import cron from "node-cron";
import type { CheckBatchStatus } from "../../application/use-cases/CheckBatchStatus";
import type { IgBatchJobRepository } from "../../domain/repositories/IgBatchJobRepository";
import type { CheckIgExampleSummaryBatches } from "../../application/use-cases/CheckIgExampleSummaryBatches";
import type { CheckTemplateSummaryBatches } from "../../application/use-cases/CheckTemplateSummaryBatches";
import type { CheckTemplateGenerationJob } from "../../application/use-cases/CheckTemplateGenerationJob";
import type { IgTemplateGenerationJobRepository } from "../../domain/repositories/IgTemplateGenerationJobRepository";
import type { CheckSynthesisBatches } from "../../application/use-cases/CheckSynthesisBatches";

export function startBatchPollingJob(
  checkBatchStatus: CheckBatchStatus,
  jobRepo: IgBatchJobRepository,
  checkExampleSummaries: CheckIgExampleSummaryBatches,
  checkTemplateSummaries: CheckTemplateSummaryBatches,
  checkTemplateGenerationJob: CheckTemplateGenerationJob,
  templateGenerationJobRepo: IgTemplateGenerationJobRepository,
  checkSynthesisBatches: CheckSynthesisBatches,
): void {
  cron.schedule("*/5 * * * *", async () => {
    try {
      const pendingJobs = await jobRepo.findByStatus("processing");
      for (const job of pendingJobs) {
        await checkBatchStatus.execute(job.id).catch((err: unknown) => {
          console.error(`[batch-polling] Error al procesar job ${job.id}:`, err);
        });
      }
      const pendingTemplateJobs = await templateGenerationJobRepo.findByStatus("processing");
      for (const job of pendingTemplateJobs) {
        await checkTemplateGenerationJob.execute(job.id).catch((err: unknown) => {
          console.error(`[batch-polling] Error al procesar template job ${job.id}:`, err);
        });
      }
      await checkExampleSummaries.executeAll();
      await checkTemplateSummaries.executeAll();
      await checkSynthesisBatches.executeAll();
      if (pendingJobs.length > 0 || pendingTemplateJobs.length > 0) {
        console.log(`[batch-polling] Procesados ${pendingJobs.length} batch job(s), ${pendingTemplateJobs.length} template job(s)`);
      }
    } catch (err) {
      console.error("[batch-polling] Error al obtener jobs pendientes:", err);
    }
  });

  console.log("[batch-polling] Cron de polling iniciado (cada 5 minutos)");
}

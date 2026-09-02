import type { IgTemplateGenerationJobRepository } from "../../domain/repositories/IgTemplateGenerationJobRepository";
import type { IgTemplateRepository } from "../../domain/repositories/IgTemplateRepository";
import type { IgTemplateGenerationJob } from "../../domain/entities/IgTemplateGenerationJob";
import { calculateBatchCost } from "../../infrastructure/services/CostCalculator";
import { extractHtmlVariables } from "../../infrastructure/utils/extractHtmlVariables";
import { prisma } from "../../infrastructure/db/prisma";
import { resolveOpenAIService } from "../../infrastructure/services/resolveOpenAIService";

interface TemplateResult {
  name: string;
  html: string;
}

export interface CheckTemplateGenerationJobResult {
  job: IgTemplateGenerationJob;
  generatedTemplateIds: string[];
}

export class CheckTemplateGenerationJob {
  constructor(
    private jobRepo: IgTemplateGenerationJobRepository,
    private templateRepo: IgTemplateRepository,
  ) {}

  async execute(jobId: string): Promise<CheckTemplateGenerationJobResult> {
    const job = await this.jobRepo.findById(jobId);
    if (!job) throw new Error("BATCH_JOB_NOT_FOUND");

    if (job.status === "completed" || job.status === "failed") {
      const templates = await this.templateRepo.findByGenerationJobId(jobId);
      return { job, generatedTemplateIds: templates.filter(t => t.generationStatus === "done").map(t => t.id) };
    }
    if (!job.openAiBatchId) return { job, generatedTemplateIds: [] };

    const { service: openAI, keySnapshot, model } = await resolveOpenAIService(job.brandId, job.openAiKeySnapshot);
    const { status, outputFileId, errorFileId, errorDetail, retriedBatchId } = await openAI.getBatchStatus(job.openAiBatchId);

    if (retriedBatchId) {
      const updated = await this.jobRepo.update(jobId, { openAiBatchId: retriedBatchId, openAiKeySnapshot: keySnapshot, status: "processing" });
      return { job: updated, generatedTemplateIds: [] };
    }

    if (status === "failed" || status === "expired" || status === "cancelled") {
      const stubs = await this.templateRepo.findByGenerationJobId(jobId);
      await Promise.all(stubs.map(t => this.templateRepo.update(t.id, { generationStatus: "failed", generationError: errorDetail ?? `OpenAI batch status: ${status}` })));
      const updated = await this.jobRepo.update(jobId, { status: "failed", errorMessage: errorDetail ?? `OpenAI batch status: ${status}` });
      return { job: updated, generatedTemplateIds: [] };
    }

    if (status !== "completed" || (!outputFileId && !errorFileId)) {
      const updated = await this.jobRepo.update(jobId, { status: "processing" });
      return { job: updated, generatedTemplateIds: [] };
    }

    const [outputResults, errorResults] = await Promise.all([
      outputFileId ? openAI.downloadBatchResults(outputFileId) : Promise.resolve([]),
      errorFileId  ? openAI.downloadBatchResults(errorFileId)  : Promise.resolve([]),
    ]);
    const results = [...outputResults, ...errorResults];
    const resultsByCustomId = new Map(results.map(r => [r.customId, r]));
    const stubs = await this.templateRepo.findByGenerationJobId(jobId);

    let totalInput = 0;
    let totalOutput = 0;
    const generatedTemplateIds: string[] = [];

    for (let i = 0; i < stubs.length; i++) {
      const result = resultsByCustomId.get(`template-${i}`);
      const stub = stubs[i];
      if (!result) continue;

      if (result.usage) {
        totalInput  += result.usage.promptTokens;
        totalOutput += result.usage.completionTokens;
      }

      if (result.error) {
        await this.templateRepo.update(stub.id, { generationStatus: "failed", generationError: result.error });
        continue;
      }

      let parsed: TemplateResult;
      try {
        parsed = JSON.parse(result.content) as TemplateResult;
        if (!parsed.html || !parsed.name) throw new Error("INVALID_TEMPLATE_RESULT");
      } catch {
        await this.templateRepo.update(stub.id, { generationStatus: "failed", generationError: "INVALID_TEMPLATE_RESULT" });
        continue;
      }

      const variables = extractHtmlVariables(parsed.html);
      await this.templateRepo.update(stub.id, {
        name: parsed.name,
        html: parsed.html,
        variables,
        generationStatus: "done",
        // The stub's summaryStatus defaults to "pending" from the moment it's created —
        // before this real html exists — so a summary cron sweep can (and, given a ~5min
        // cron cadence against a much longer batch window, reliably did) run against the
        // still-empty html first and save whatever OpenAI replied to that ("no HTML was
        // included...") as if it were a real summary. Reset it now that real html exists,
        // so the next sweep re-summarizes the actual design instead of leaving that stuck.
        summary: "",
        summaryStatus: "pending",
      });
      generatedTemplateIds.push(stub.id);
    }

    const estimatedCostUsd = calculateBatchCost(model, totalInput, totalOutput);

    await prisma.igCostLog.create({
      data: {
        brandId:          job.brandId,
        operation:        "template_generation",
        entityId:         jobId,
        model,
        inputTokens:      totalInput,
        outputTokens:     totalOutput,
        totalTokens:      totalInput + totalOutput,
        estimatedCostUsd,
        requestCount:     results.length,
      },
    });

    const updated = await this.jobRepo.update(jobId, {
      status: "completed",
      inputTokens: totalInput,
      outputTokens: totalOutput,
      estimatedCostUsd,
    });

    return { job: updated, generatedTemplateIds };
  }
}

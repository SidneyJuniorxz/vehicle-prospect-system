import cron from "node-cron";
import { createCollectionJob, getCollectionJobs, updateCollectionJob, createActivityLog } from "../db";
import { ScraperManagementService } from "./scraperManagementService";

export interface ScheduledJob {
  id: number;
  name: string;
  cronExpression: string;
  sources: string[];
  criteria: Record<string, any>;
  enabled: boolean;
  lastRun?: Date;
  nextRun?: Date;
  createdAt: Date;
}

/**
 * Service for managing scheduled collection jobs
 */
export class JobSchedulerService {
  private jobs: Map<number, any> = new Map();
  private scraperService = new ScraperManagementService();

  /**
   * Initialize scheduler - load and start all enabled jobs
   */
  async initialize(): Promise<void> {
    try {
      const jobs = await getCollectionJobs();

      for (const job of jobs as any[]) {
        if ((job as any).enabled) {
          this.scheduleJob(job);
        }
      }

      console.log(`[JobScheduler] Initialized with ${jobs.length} jobs`);
    } catch (error) {
      console.error("[JobScheduler] Error initializing:", error);
    }
  }

  /**
   * Schedule a new job
   */
  async createJob(
    name: string,
    cronExpression: string,
    sources: string[],
    criteria: Record<string, any>
  ): Promise<ScheduledJob> {
    // Validate cron expression
    if (!this.isValidCronExpression(cronExpression)) {
      throw new Error("Invalid cron expression");
    }

    // Create job in database
    const job = await createCollectionJob({
      name,
      cronExpression,
      sources: JSON.stringify(sources),
      criteria: JSON.stringify(criteria),
      enabled: true,
      lastRun: null,
      nextRun: this.calculateNextRun(cronExpression),
    });

    // Schedule it
    this.scheduleJob(job);

    await createActivityLog({
      action: "job_created",
      details: `Created scheduled job: ${name}`,
      userId: null,
    });

    return job;
  }

  /**
   * Schedule a job for execution
   */
  private scheduleJob(job: any): void {
    try {
      // Parse sources and criteria from JSON if needed
      const sources = typeof job.sources === "string" ? JSON.parse(job.sources) : job.sources;
      const criteria = typeof job.criteria === "string" ? JSON.parse(job.criteria) : job.criteria;

      // Create cron task
      const task = cron.schedule((job as any).cronExpression, async () => {
        await this.executeJob((job as any).id, sources, criteria);
      });

      this.jobs.set(job.id, task);
      console.log(`[JobScheduler] Scheduled job: ${job.name}`);
    } catch (error) {
      console.error(`[JobScheduler] Error scheduling job ${job.id}:`, error);
    }
  }

  /**
   * Execute a collection job
   */
  private async executeJob(
    jobId: number,
    sources: string[],
    criteria: Record<string, any>
  ): Promise<void> {
    const startTime = Date.now();

    try {
      console.log(`[JobScheduler] Executing job ${jobId}`);

      let totalAds = 0;
      let createdAds = 0;
      let updatedAds = 0;
      const errors: Array<{ source: string; error: string }> = [];

      // Execute collection for each source
      for (const source of sources) {
        try {
          const result = await this.scraperService.collectFromSource(source, criteria);
          totalAds += result.total;
          createdAds += result.created;
          updatedAds += result.updated;

          if (result.error) {
            errors.push({ source, error: result.error });
          }
        } catch (error) {
          errors.push({
            source,
            error: error instanceof Error ? error.message : "Unknown error",
          });
        }
      }

      // Update job with execution details
      const duration = Date.now() - startTime;
      const jobs = await getCollectionJobs();
      const jobData = (jobs as any[]).find((j: any) => j.id === jobId);
      await updateCollectionJob(jobId, {
        lastRun: new Date(),
        nextRun: this.calculateNextRun(jobData?.cronExpression || ""),
      });

      // Log activity
      await createActivityLog({
        action: "job_executed",
        details: `Job executed: ${totalAds} ads found, ${createdAds} created, ${updatedAds} updated in ${duration}ms`,
        userId: null,
      });

      console.log(
        `[JobScheduler] Job ${jobId} completed: ${totalAds} ads, ${createdAds} new, ${updatedAds} updated`
      );
    } catch (error) {
      console.error(`[JobScheduler] Error executing job ${jobId}:`, error);

      await createActivityLog({
        action: "job_failed",
        details: `Job execution failed: ${error instanceof Error ? error.message : "Unknown error"}`,
        userId: null,
      });
    }
  }

  /**
   * Enable a job
   */
  async enableJob(jobId: number): Promise<void> {
    const jobs = await getCollectionJobs();
    const job = jobs.find((j: any) => j.id === jobId) as any;

    if (!job) {
      throw new Error("Job not found");
    }

    await updateCollectionJob(jobId, { enabled: true });
    this.scheduleJob(job);

    await createActivityLog({
      action: "job_enabled",
      details: `Enabled job: ${job?.name || "Unknown"}`,
      userId: null,
    } as any);
  }

  /**
   * Disable a job
   */
  async disableJob(jobId: number): Promise<void> {
    const task = this.jobs.get(jobId);
    if (task) {
      task.stop();
      this.jobs.delete(jobId);
    }

    await updateCollectionJob(jobId, { enabled: false });

    const jobs = await getCollectionJobs();
    const job = jobs.find((j: any) => j.id === jobId) as any;

    await createActivityLog({
      action: "job_disabled",
      details: `Disabled job: ${job?.name || "Unknown"}`,
      userId: null,
    } as any);
  }

  /**
   * Get all jobs
   */
  async getJobs(): Promise<ScheduledJob[]> {
    return getCollectionJobs();
  }

  /**
   * Delete a job
   */
  async deleteJob(jobId: number): Promise<void> {
    await this.disableJob(jobId);

    const jobs = await getCollectionJobs();
    const job = jobs.find((j: any) => j.id === jobId) as any;

    await createActivityLog({
      action: "job_deleted",
      details: `Deleted job: ${job?.name || "Unknown"}`,
      userId: null,
    } as any);
  }

  /**
   * Validate cron expression
   */
  private isValidCronExpression(expression: string): boolean {
    try {
      cron.validate(expression);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Calculate next run time from cron expression
   */
  private calculateNextRun(cronExpression: string): Date {
    try {
      // For now, return a date 1 hour from now as a placeholder
      // In production, use a library like cron-parser for accurate calculation
      return new Date(Date.now() + 60 * 60 * 1000);
    } catch {
      return new Date();
    }
  }

  /**
   * Stop all jobs
   */
  stopAll(): void {
    this.jobs.forEach((task) => {
      task.stop();
    });
    this.jobs.clear();
    console.log("[JobScheduler] All jobs stopped");
  }
}

// Singleton instance
let schedulerInstance: JobSchedulerService | null = null;

export function getJobScheduler(): JobSchedulerService {
  if (!schedulerInstance) {
    schedulerInstance = new JobSchedulerService();
  }
  return schedulerInstance;
}

/**
 * workerPoolManager.js
 * Manages a pool of web workers for parallel processing
 * Distributes tasks across available workers and collects results
 */

/**
 * WorkerPool class manages a pool of web workers
 */
export class WorkerPool {
  constructor(workerFactory, poolSize = null) {
    // Determine pool size (default to number of CPU cores)
    this.poolSize = poolSize || navigator.hardwareConcurrency || 4;
    this.workerFactory = workerFactory;
    this.workers = [];
    this.availableWorkers = [];
    this.taskQueue = [];
    this.activeTasksCount = 0;
    this.onProgressCallback = null;
    this.totalTasks = 0;
    this.completedTasks = 0;

    console.log(`[WorkerPool] Creating pool with ${this.poolSize} workers`);

    // Create worker pool
    for (let i = 0; i < this.poolSize; i++) {
      try {
        const worker = this.workerFactory();
        worker.poolId = i;
        worker.isBusy = false;

        worker.onmessage = (e) => this.handleWorkerMessage(worker, e);
        worker.onerror = (error) => this.handleWorkerError(worker, error);

        this.workers.push(worker);
        this.availableWorkers.push(worker);

        console.log(`[WorkerPool] Worker ${i} created`);
      } catch (error) {
        console.error(`[WorkerPool] Failed to create worker ${i}:`, error);
      }
    }

    console.log(
      `[WorkerPool] Pool initialized with ${this.workers.length} workers`
    );
  }

  /**
   * Set progress callback function
   */
  setProgressCallback(callback) {
    this.onProgressCallback = callback;
  }

  /**
   * Handle messages from workers
   */
  handleWorkerMessage(worker, e) {
    const { success, result, error, wellKey } = e.data;

    // Get the task associated with this worker
    const task = worker.currentTask;

    if (!task) {
      console.error("[WorkerPool] Received message from worker with no task");
      return;
    }

    // Mark worker as available
    worker.isBusy = false;
    worker.currentTask = null;
    this.availableWorkers.push(worker);
    this.activeTasksCount--;
    this.completedTasks++;

    // Update progress
    if (this.onProgressCallback) {
      this.onProgressCallback(this.completedTasks, this.totalTasks);
    }

    // Resolve or reject the task promise
    if (success) {
      console.log(
        `[WorkerPool] Worker ${worker.poolId} completed task for ${wellKey}`
      );
      task.resolve(result);
    } else {
      console.error(
        `[WorkerPool] Worker ${worker.poolId} failed task for ${wellKey}:`,
        error
      );
      task.reject(new Error(error.message));
    }

    // Process next task in queue
    this.processNextTask();
  }

  /**
   * Handle worker errors
   */
  handleWorkerError(worker, error) {
    console.error(`[WorkerPool] Worker ${worker.poolId} error:`, error);

    const task = worker.currentTask;
    if (task) {
      task.reject(error);
      worker.currentTask = null;
    }

    worker.isBusy = false;
    this.availableWorkers.push(worker);
    this.activeTasksCount--;

    // Process next task
    this.processNextTask();
  }

  /**
   * Process next task in queue
   */
  processNextTask() {
    // If no tasks in queue or no available workers, return
    if (this.taskQueue.length === 0 || this.availableWorkers.length === 0) {
      return;
    }

    // Get next task and available worker
    const task = this.taskQueue.shift();
    const worker = this.availableWorkers.shift();

    // Assign task to worker
    worker.isBusy = true;
    worker.currentTask = task;
    this.activeTasksCount++;

    // Send task to worker
    try {
      worker.postMessage(task.data);
      console.log(
        `[WorkerPool] Assigned task to worker ${worker.poolId} (${this.activeTasksCount} active, ${this.taskQueue.length} queued)`
      );
    } catch (error) {
      console.error(
        `[WorkerPool] Failed to send task to worker ${worker.poolId}:`,
        error
      );
      task.reject(error);
      worker.isBusy = false;
      worker.currentTask = null;
      this.availableWorkers.push(worker);
      this.activeTasksCount--;
    }
  }

  /**
   * Add a task to the pool
   * Returns a promise that resolves when the task is complete
   */
  addTask(taskData) {
    return new Promise((resolve, reject) => {
      const task = {
        data: taskData,
        resolve,
        reject,
      };

      this.taskQueue.push(task);

      // Try to process task immediately if workers are available
      this.processNextTask();
    });
  }

  /**
   * Process all tasks and wait for completion
   */
  async processAll(tasks, onProgress = null) {
    this.totalTasks = tasks.length;
    this.completedTasks = 0;
    this.onProgressCallback = onProgress;

    console.log(`[WorkerPool] Processing ${this.totalTasks} tasks`);

    // Create array of promises for all tasks
    const taskPromises = tasks.map((taskData) => this.addTask(taskData));

    // Wait for all tasks to complete
    const results = await Promise.all(taskPromises);

    console.log(`[WorkerPool] All ${this.totalTasks} tasks completed`);

    return results;
  }

  /**
   * Terminate all workers and clean up
   */
  terminate() {
    console.log(`[WorkerPool] Terminating ${this.workers.length} workers`);

    this.workers.forEach((worker) => {
      worker.terminate();
    });

    this.workers = [];
    this.availableWorkers = [];
    this.taskQueue = [];
    this.activeTasksCount = 0;
    this.totalTasks = 0;
    this.completedTasks = 0;

    console.log("[WorkerPool] All workers terminated");
  }

  /**
   * Get pool status
   */
  getStatus() {
    return {
      poolSize: this.poolSize,
      totalWorkers: this.workers.length,
      availableWorkers: this.availableWorkers.length,
      busyWorkers: this.workers.filter((w) => w.isBusy).length,
      queuedTasks: this.taskQueue.length,
      activeTasks: this.activeTasksCount,
      totalTasks: this.totalTasks,
      completedTasks: this.completedTasks,
    };
  }
}

/**
 * Create and use a worker pool for a batch of tasks
 * Automatically terminates the pool when done
 *
 * @param {string} workerScript - Path to worker script
 * @param {Array} tasks - Array of task data objects
 * @param {Object} options - Configuration options
 * @returns {Promise<Array>} - Array of results
 */
export async function processBatch(workerScript, tasks, options = {}) {
  const { poolSize = null, onProgress = null } = options;

  // Create worker pool
  const pool = new WorkerPool(workerScript, poolSize);

  try {
    // Process all tasks
    const results = await pool.processAll(tasks, onProgress);

    return results;
  } finally {
    // Always terminate workers when done
    pool.terminate();
  }
}

export default WorkerPool;

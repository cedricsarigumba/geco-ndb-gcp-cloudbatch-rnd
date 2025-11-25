/**
 * TODO(developer): Uncomment and replace these variables before running the sample.
 */
const projectId = 'sys0000827-36181-sports-dev';
/**
 * The region you want to the job to run in. The regions that support Batch are listed here:
 * https://cloud.google.com/batch/docs/get-started#locations
 */
const region = 'asia-northeast1';
/**
 * The name of the job that will be created.
 * It needs to be unique for each project and region pair.
 */
const jobName = 'geco-ced-job-' + Date.now();

// Imports the Batch library
import batchLib from '@google-cloud/batch';
const batch = batchLib.protos.google.cloud.batch.v1;

// Instantiates a client
const batchClient = new batchLib.v1.BatchServiceClient();

// Define what will be done as part of the job.
const task = new batch.TaskSpec();
const runnable = new batch.Runnable();
runnable.container = new batch.Runnable.Container();
runnable.container.imageUri = 'gcr.io/google-containers/busybox';
runnable.container.entrypoint = '/bin/sh';
runnable.container.commands = [
  '-c',
  'echo Hello world! This is task ${BATCH_TASK_INDEX}. This job has a total of ${BATCH_TASK_COUNT} tasks.',
];
task.runnables = [runnable];

// We can specify what resources are requested by each task.
const resources = new batch.ComputeResource();
resources.cpuMilli = 2000; // in milliseconds per cpu-second. This means the task requires 2 whole CPUs.
resources.memoryMib = 16;
task.computeResource = resources;

task.maxRetryCount = 2;
task.maxRunDuration = {seconds: 3600};

// Tasks are grouped inside a job using TaskGroups.
const group = new batch.TaskGroup();
group.taskCount = 4;
group.taskSpec = task;

// Policies are used to define on what kind of virtual machines the tasks will run on.
// In this case, we tell the system to use "e2-standard-4" machine type.
// Read more about machine types here: https://cloud.google.com/compute/docs/machine-types
const allocationPolicy = new batch.AllocationPolicy();
const policy = new batch.AllocationPolicy.InstancePolicy();
policy.machineType = 'a3-highgpu-1g';
const instances = new batch.AllocationPolicy.InstancePolicyOrTemplate();
instances.policy = policy;
allocationPolicy.instances = [instances];

const job = new batch.Job();
job.name = jobName;
job.taskGroups = [group];
job.allocationPolicy = allocationPolicy;
job.labels = {env: 'testing', type: 'container'};
// We use Cloud Logging as it's an option available out of the box
job.logsPolicy = new batch.LogsPolicy();
job.logsPolicy.destination = batch.LogsPolicy.Destination.CLOUD_LOGGING;

// The job's parent is the project and region in which the job will run
const parent = `projects/${projectId}/locations/${region}`;

async function callCreateJob() {
  try {
    // Construct request
    const request = {
      parent,
      jobId: jobName,
      job,
    };

    // Run request. This is fire and forget.
    const response = await batchClient.createJob(request);
    console.log('Job created:', response);

    // Poll for job status until it's in progress
    const jobPath = `${parent}/jobs/${jobName}`;
    let jobStatus = null;

    while (jobStatus !== 'RUNNING') {
      const [job] = await batchClient.getJob({ name: jobPath });
      jobStatus = job.status.state;
      console.log(`Current job status: ${jobStatus}`);

      if (jobStatus === 'RUNNING') {
        console.log('Job is now in progress!');
        break;
      }

      if (jobStatus === 'FAILED') {
        console.error(`Job failed with status: ${jobStatus}`);
        if (job.status.statusEvents && job.status.statusEvents.length > 0) {
          console.error('Error details:', job.status.statusEvents);
        }
        break;
      }

      if (jobStatus === 'SUCCEEDED') {
        console.log(`Job completed with status: ${jobStatus}`);
        break;
      }

      // Wait 5 seconds before checking again
      await new Promise(resolve => setTimeout(resolve, 5000));
    }
  } catch (error) {
    console.error(error);
    console.error('Error occurred:', error.message);
    if (error.details) {
      console.error('Error details:', error.details);
    }
  }
}

await callCreateJob();

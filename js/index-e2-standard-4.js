

// Imports the Batch library
import batchLib from '@google-cloud/batch';
const batch = batchLib.protos.google.cloud.batch.v1;

const projectId = 'sys0000827-36181-sports-dev';
const region = 'asia-northeast1';
const jobName = 'geco-ced-job-' + Date.now();
const machineType = 'e2-standard-4';
const imageUri = 'asia-northeast1-docker.pkg.dev/sys0000827-36181-sports-dev/geco-container-tests/batch-quickstart@sha256:369a699adff7760a202c88293583a841365f532e7d7ca6b8ed7c5a96391fb24b';

const batchClient = new batchLib.v1.BatchServiceClient();

// Set the image url from the Container Registry
const task = new batch.TaskSpec();
const runnable = new batch.Runnable();
runnable.container = new batch.Runnable.Container();
runnable.container.imageUri = imageUri;
runnable.environment = new batch.Environment();
runnable.environment.variables = {
  asset_id: 'asset_12345',
  user_id: 'user_67890',
};
task.runnables = [runnable];

// Specify what resources are requested by each task.
const resources = new batch.ComputeResource();
resources.cpuMilli = 2000; // in milliseconds per cpu-second. This means the task requires 2 whole CPUs.
resources.memoryMib = 16;
task.computeResource = resources;

task.maxRetryCount = 3;
task.maxRunDuration = {seconds: 3600};

// Tasks are grouped inside a job using TaskGroups.
const group = new batch.TaskGroup();
group.taskCount = 1; // Required for BATCH_TASK_INDEX to be set
group.taskSpec = task;

// Policies are used to define on what kind of virtual machines the tasks will run on.
// In this case, we tell the system to use "e2-standard-4" machine type.
// Read more about machine types here: https://cloud.google.com/compute/docs/machine-types
const allocationPolicy = new batch.AllocationPolicy();
const policy = new batch.AllocationPolicy.InstancePolicy();
policy.machineType = machineType;
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
          // We can try to rerun the job or take other actions based on the error details here.
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

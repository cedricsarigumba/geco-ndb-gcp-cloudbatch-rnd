

// Imports the Batch library
import batchLib from '@google-cloud/batch';
const batch = batchLib.protos.google.cloud.batch.v1;

const projectId = 'sys0000827-36181-sports-dev';
const region = 'asia-northeast1';
const jobName = 'geco-ced-job-' + Date.now();
const machineType = 'a3-highgpu-1g';
const imageUri = 'asia-northeast1-docker.pkg.dev/sys0000827-36181-sports-dev/geco-container-tests/batch-quickstart@sha256:1da9491de0e652b381e186d407f2d158bd9973ded9fb75f56e5fce1a5d02fe48';

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

task.maxRetryCount = 3;
task.maxRunDuration = {seconds: 3600};

// Tasks are grouped inside a job using TaskGroups.
const group = new batch.TaskGroup();
group.taskCount = 1; // Required for BATCH_TASK_INDEX to be set
group.taskSpec = task;

// Policies are used to define on what kind of virtual machines the tasks will run on.
// In this case, we tell the system to use "a3-highgpu-1g" machine type with GPU support.
// Read more about machine types here: https://cloud.google.com/compute/docs/machine-types
const allocationPolicy = new batch.AllocationPolicy();
const policy = new batch.AllocationPolicy.InstancePolicy();
policy.machineType = machineType;
policy.provisioningModel = 2; // SPOT=2,FLEX_START=5 : https://docs.cloud.google.com/php/docs/reference/cloud-batch/latest/V1.AllocationPolicy.ProvisioningModel
policy.reservation = 'NO_RESERVATION';

// A3 machines have pre-attached GPUs (H100), but we need to install GPU drivers
const instances = new batch.AllocationPolicy.InstancePolicyOrTemplate();
instances.policy = policy;
instances.installGpuDrivers = true; // Enable automatic GPU driver installation

allocationPolicy.instances = [instances];

// Specify zone 2 for better A3 instance availability
const locationPolicy = new batch.AllocationPolicy.LocationPolicy();
locationPolicy.allowedLocations = [
  // `zones/asia-east1-c`,           // Changhua County, Taiwan
  // `zones/asia-northeast1-b`,      // Tokyo, Japan
  `zones/asia-southeast1-b`,      // Jurong West, Singapore
  // `zones/asia-southeast1-c`,      // Jurong West, Singapore
];
allocationPolicy.location = locationPolicy;

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
    console.log('Job created:', JSON.stringify(response));

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

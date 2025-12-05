// Imports the Batch library
import batchLib from '@google-cloud/batch';
const batch = batchLib.protos.google.cloud.batch.v1;
const imageUri = 'asia-northeast1-docker.pkg.dev/sys0000827-36181-sports-dev/geco-container-tests/batch-quickstart@sha256:4a40f76b2fa87a082ac11354aa2d8559d9b51ebc8316f626ca7b8e85c8ae6c14';
const batchClient = new batchLib.v1.BatchServiceClient();
const projectId = 'sys0000827-36181-sports-dev';
// const region = 'asia-northeast1';
const region = 'asia-southeast1';
const jobName = 'geco-ced-job-' + Date.now();
// The GPU type. You can view a list of the available GPU types
// by using the `gcloud compute accelerator-types list` command.
const gpuType = 'nvidia-h100-80gb';
const gpuCount = 1;
// Optional. When set to true, Batch fetches the drivers required for the GPU type
// that you specify in the policy field from a third-party location,
// and Batch installs them on your behalf. If you set this field to false (default),
// you need to install GPU drivers manually to use any GPUs for this job.
const installGpuDrivers = true;
// Accelerator-optimized machine types are available to Batch jobs. See the list
// of available types on: https://cloud.google.com/compute/docs/accelerator-optimized-machines
const machineType = 'a3-highgpu-1g';

// Define what will be done as part of the job.
const runnable = new batch.Runnable();
runnable.container = new batch.Runnable.Container();
runnable.container.imageUri = imageUri;
runnable.environment = new batch.Environment();
runnable.environment.variables = {
  asset_id: 'asset_12345',
  user_id: 'user_67890',
};

const task = new batch.TaskSpec({
  runnables: [runnable],
  maxRetryCount: 2,
  maxRunDuration: {seconds: 7200},
  computeResource: new batch.ComputeResource({
    // cpuMilli: 8000,  // 8 vCPUs (in millicores)
    // memoryMib: 32768, // 32GB RAM
    cpuMilli: 2000,  // 2 vCPUs (in millicores)
    memoryMib: 1024, // 1GB RAM
  }),
});

// Tasks are grouped inside a job using TaskGroups.
const group = new batch.TaskGroup({
  taskCount: 1,
  taskSpec: task,
});

// Policies are used to define on what kind of virtual machines the tasks will run on.
// In this case, we tell the system to use "g2-standard-4" machine type.
// Read more about machine types here: https://cloud.google.com/compute/docs/machine-types
const instancePolicy = new batch.AllocationPolicy.InstancePolicy({
  machineType,
  reservation: "NO_RESERVATION",
  provisioningModel: 5, // SPOT=2,FLEX_START=5
  // Accelerator describes Compute Engine accelerators to be attached to the VM
  accelerators: [
    new batch.AllocationPolicy.Accelerator({
      type: gpuType,
      count: gpuCount,
      installGpuDrivers,
    }),
  ],
});

const allocationPolicy = new batch.AllocationPolicy({
  instances: [{
    installGpuDrivers,
    policy: instancePolicy,
  }],
  location: new batch.AllocationPolicy.LocationPolicy({
    // Specify allowed zones for the job's VMs
    allowedLocations: [
      'zones/asia-southeast1-b',
      'zones/asia-southeast1-c'
    ],
  }),
});

const job = new batch.Job({
  name: jobName,
  taskGroups: [group],
  labels: {env: 'testing', type: 'script'},
  allocationPolicy,
  // We use Cloud Logging as it's an option available out of the box
  logsPolicy: new batch.LogsPolicy({
    destination: batch.LogsPolicy.Destination.CLOUD_LOGGING,
  }),
});
// The job's parent is the project and region in which the job will run
const parent = `projects/${projectId}/locations/${region}`;

async function callCreateBatchGPUJob() {
  // Construct request
  const request = {
    parent,
    jobId: jobName,
    job,
  };

  // Run request
  const [response] = await batchClient.createJob(request);
  console.log(JSON.stringify(response));
}

await callCreateBatchGPUJob();

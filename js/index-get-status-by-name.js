/**
 * Get the status of a Cloud Batch job by its name
 */
const projectId = 'sys0000827-36181-sports-dev';
const region = 'asia-northeast1';
const jobName = 'job-micn6ds1'; // Replace with your job name

// Imports the Batch library
import batchLib from '@google-cloud/batch';

// Instantiates a client
const batchClient = new batchLib.v1.BatchServiceClient();

async function getJobStatus() {
  try {
    // Construct the job path
    const jobPath = `projects/${projectId}/locations/${region}/jobs/${jobName}`;

    // Get the job details
    const [job] = await batchClient.getJob({ name: jobPath });

    // Display job status
    console.log(`Job Name: ${job.name}`);
    console.log(`Job Status: ${job.status.state}`);
    console.log(`Job UID: ${job.uid}`);

    // Display status events if available
    if (job.status.statusEvents && job.status.statusEvents.length > 0) {
      console.log('\nStatus Events:');
      job.status.statusEvents.forEach((event, index) => {
        console.log(`  ${index + 1}. ${event.type}: ${event.description}`);
      });
    }

    // Display task execution details
    if (job.status.taskGroups) {
      console.log('\nTask Groups:');
      Object.entries(job.status.taskGroups).forEach(([groupId, taskGroup]) => {
        console.log(`  Group ${groupId}:`);
        console.log(`    Total tasks: ${taskGroup.counts?.total || 0}`);
        console.log(`    Succeeded: ${taskGroup.counts?.succeeded || 0}`);
        console.log(`    Failed: ${taskGroup.counts?.failed || 0}`);
        console.log(`    Running: ${taskGroup.counts?.running || 0}`);
      });
    }

    return job;
  } catch (error) {
    console.error('Error getting job status:', error.message);
    if (error.code === 5) {
      console.error(`Job '${jobName}' not found in project '${projectId}' and region '${region}'`);
    }
    throw error;
  }
}

await getJobStatus();

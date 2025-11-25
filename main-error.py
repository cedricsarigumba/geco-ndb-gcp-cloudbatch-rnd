import logging
import google.cloud.logging
import time
import os
import sys

if __name__ == "__main__":
    # client = google.cloud.logging.Client()
    # client.setup_logging()
    logging.basicConfig(level=logging.INFO)

    # Get retry attempt from environment variable (0 for first attempt)
    retry_attempt = int(os.environ.get("BATCH_TASK_RETRY_ATTEMPT", "0"))
    task_index = os.environ.get("BATCH_TASK_INDEX")

    logging.info("Task %s starting (Retry attempt: %d)", task_index, retry_attempt)

    # Fail on first attempt to test retry mechanism
    if retry_attempt == 0:
        logging.error("Task %s failed on first attempt - triggering retry", task_index)
        sys.exit(1)

    # Succeed on retry attempts
    for i in range(10):
        logging.info("Task %s Secret %s Line %d", task_index, os.environ.get("asset_id"), i)
        time.sleep(5)

    logging.info("Task %s completed successfully", task_index)

import logging
import google.cloud.logging
import time
import os

if __name__ == "__main__":
    # client = google.cloud.logging.Client()
    # client.setup_logging()
    logging.basicConfig(level=logging.INFO)

    # Print contents of the shared file
    file_path = "/mnt/disks/share/geco-sample-file.txt"
    try:
        with open(file_path, "r") as f:
            contents = f.read()
            logging.info("Contentxs of %s:\n%s", file_path, contents)
    except FileNotFoundError:
        logging.error("File not found: %s", file_path)
    except Exception as e:
        logging.error("Error reading file %s: %s", file_path, e)

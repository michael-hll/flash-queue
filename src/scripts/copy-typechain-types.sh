#!/bin/bash

# Define source and destination paths
SOURCE_DIR="/Users/mich/Documents/dev/flashswap/flash-loans/pancake-swap/typechain-types"
DESTINATION_DIR="/Users/mich/Documents/dev/flashswap/flash-loans/flash-queue/src/typechain-types-copy"

# Display the paths
echo "Source directory: $SOURCE_DIR"
echo "Destination directory: $DESTINATION_DIR"

# Check if source directory exists
if [ ! -d "$SOURCE_DIR" ]; then
  echo "Error: Source directory does not exist!"
  exit 1
fi

# Create destination directory if it doesn't exist
if [ ! -d "$DESTINATION_DIR" ]; then
  echo "Creating destination directory..."
  mkdir -p "$DESTINATION_DIR"
fi

# Copy all files and subfolders
echo "Copying files from $SOURCE_DIR to $DESTINATION_DIR..."
cp -r "$SOURCE_DIR"/* "$DESTINATION_DIR"

# Check if copy was successful
if [ $? -eq 0 ]; then
  echo "Copy completed successfully!"
else
  echo "Error: Copy failed!"
  exit 1
fi

echo "Files in destination directory:"
ls -la "$DESTINATION_DIR"
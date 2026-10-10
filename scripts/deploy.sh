#!/bin/bash

export $(grep -v '^#' .env)
timestamp=$(date +%Y-%m-%d-%H%M%S)

if [ ! -z "$SSH_HOST" ]; then
  echo "    SSH_HOST = '$SSH_HOST'"
else
  echo "SSH_HOST not set, exiting"
  exit 1
fi

if [ ! -z "$SSH_USER" ]; then
  echo "    SSH_USER = '$SSH_USER'"
else
  echo "SSH_USER not set, exiting"
  exit 1
fi

# if [ ! -z "$SSH_IDENTITY" ]; then
#   echo "SSH_IDENTITY = '$SSH_IDENTITY'"
# else
#   echo "SSH_IDENTITY not set, exiting"
#   exit 1
# fi

if [ ! -z "$SSH_BUILD" ]; then
  echo "   SSH_BUILD = '$SSH_BUILD'"
else
  echo "SSH_BUILD not set, exiting"
  exit 1
fi

if [ ! -z "$SSH_DIR" ]; then
  echo "     SSH_DIR = '$SSH_DIR'"
else
  echo "SSH_DIR not set, exiting"
  exit 1
fi

echo ""
read -p "Do you want to deploy with the current settings? (y)/n: " response
response=${response:-y}
response=${response,,}
echo ""

case "$response" in
  y|yes)
    echo "Deploying..."
    npm run build
    rm ./$SSH_BUILD*.zip
    zip -r -q - $SSH_BUILD > $SSH_BUILD-$timestamp.zip
    # ssh -i $SSH_IDENTITY $SSH_USER@$SSH_HOST "cd $SSH_DIR; rm -R ./*; echo \"Removed old build.\""
    # scp -i $SSH_IDENTITY $SSH_BUILD-$timestamp.zip $SSH_USER@$SSH_HOST:$SSH_DIR
    # ssh -i $SSH_IDENTITY $SSH_USER@$SSH_HOST "cd $SSH_DIR; unzip -q ./$SSH_BUILD-$timestamp.zip -d ./; mv ./$SSH_BUILD/* ./"
    ssh $SSH_USER@$SSH_HOST "cd $SSH_DIR; rm -R ./*; echo \"Removed old build.\""
    scp $SSH_BUILD-$timestamp.zip $SSH_USER@$SSH_HOST:$SSH_DIR
    ssh $SSH_USER@$SSH_HOST "cd $SSH_DIR; unzip -q ./$SSH_BUILD-$timestamp.zip -d ./; mv ./$SSH_BUILD/* ./"
    echo ""
    echo "Done deploying."
    ;;
  n|no)
    echo "Aborting, please change the variables in the .env file as you need."
    exit 1
    ;;
  *)
    echo "Invalid input, please answer yes(y) or no(n)."
    exit 1
    ;;
esac
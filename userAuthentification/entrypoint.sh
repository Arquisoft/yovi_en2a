#!/bin/sh
# Decode the base64-encoded Firebase credentials and write them to a temp file.
# This lets us pass the credentials as an environment variable instead of a
# host-mounted volume, which is required for portable deployments.
if [ -n "$FIREBASE_CREDENTIALS_B64" ]; then
    echo "$FIREBASE_CREDENTIALS_B64" | base64 -d > /tmp/firebase-credentials.json
    export GOOGLE_APPLICATION_CREDENTIALS=/tmp/firebase-credentials.json
    echo "INFO: Firebase credentials written to /tmp/firebase-credentials.json"
else
    echo "WARNING: FIREBASE_CREDENTIALS_B64 is not set. Firebase will use default credentials lookup."
fi

exec "$@"

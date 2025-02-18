#!/usr/bin/env bash
# exit on error
set -o errexit
rm -rf ./node_modules

npm install
npm run build
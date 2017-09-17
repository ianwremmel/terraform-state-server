#!/usr/bin/env bash

set -e

function runTest() {
  npm start &
  PID=$!
  sleep 5
  curl -X DELETE http://localhost:3000/state

  terraform init
  terraform plan
  terraform apply

  kill $PID
  wait $PID
  unset $PID
}

trap '[ -n "${PID}" ] && kill ${PID}' EXIT
export DATABASE_URL=postgres://postgres:password@localhost:5432/postgres

cd "$(dirname "$0")"
START_DIR=$(PWD)

rm -rf ./*/.terraform
rm -rf ./*/errored.tfstate
rm -rf ./*/terraform.tfstate.backup

echo "Testing Without Locking"
cd "${START_DIR}"
cd ./without-locking
runTest
echo "Success"

echo "Testing With Locking"
cd "${START_DIR}"
cd ./with-locking
runTest
echo "Success"


# TODO test with only BASIC_AUTH_USER set
# TODO test with only BASIC_AUTH_PASSWORD set
# TODO test with BASIC_AUTH_USER and BASIC_AUTH_PASSWORD set

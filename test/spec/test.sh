#!/usr/bin/env bash

set -e
set -x

cd "$(dirname "$0")"
START_DIR=$(pwd)

function onExit() {
  set +x
  set +e
  [ -n "${PID}" ] && kill "${PID}"
}

trap onExit EXIT

function runTest() {
  set -e
  startServer

  terraform init
  terraform plan
  terraform apply

  stopServer
}

PID=
function startServer() {
  echo "Starting test server"
  set -e
  # Reminder: can't use `npm start`` becauase it returns the wrong pid
  node -r babel-register ../../.. &
  PID=$!
  echo "Started test server with PID ${PID}"
  sleep 5
  curl -X DELETE http://localhost:3000/state
}

function stopServer() {
  echo "Stopping test server with PID ${PID}"
  set -e
  kill $PID
  set +e
  wait $PID
  set -e
  unset PID

  echo "Stopped test server with PID ${PID}"

}

export DATABASE_URL=postgres://postgres:password@localhost:5432/postgres

npm run clean

echo
echo "/******************************************************************************\\"
echo "| Testing Without Locking"
echo "\\******************************************************************************/"

cd "${START_DIR}"
cd ./without-locking
runTest
echo "Success"

echo
echo "/******************************************************************************\\"
echo "| Testing With Locking"
echo "\\******************************************************************************/"

cd "${START_DIR}"
cd ./with-locking
runTest
echo "Success"

echo
echo "/******************************************************************************\\"
echo "| Testing Auth Without Locking"
echo "\\******************************************************************************/"

unset BASIC_AUTH_USER
unset BASIC_AUTH_PASSWORD
export BASIC_AUTH_USER=test
export BASIC_AUTH_PASSWORD=test
startServer

cd "${START_DIR}"
cd ./without-locking

set +e
terraform init
EXIT_CODE=$?
set -e
# We expect init to fail
if [ "${EXIT_CODE}" == "0" ]; then
  echo "Auth test failed to require credentials"
  exit 1
fi

stopServer

cd "${START_DIR}"
cd ./without-locking-auth
runTest
echo "Success"

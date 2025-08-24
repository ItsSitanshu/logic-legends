!#!/bin/bash

docker build -f api/Dockerfile ./api
docker build -f api/Dockerfile.judge ./api

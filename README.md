# core-qix-session-placement-service

**NOTE: This repository contains an example service for the [Qlik Core Assisted Prescription](https://github.com/qlik-oss/core-assisted-prescription) use case.**

## Status

[![CircleCI](https://circleci.com/gh/qlik-oss/core-qix-session-placement-service.svg?style=shield)](https://circleci.com/gh/qlik-oss/core-qix-session-placement-service)

## Overview

This service provides a session to a specific document ID or creates a session app. It uses [Mira](https://github.com/qlik-oss/mira) for discovering engines in an orchestration and based on strategy chooses a QIX Engine to open a session against.

How the service is used in the [Qlik Core Assisted Prescription](https://github.com/qlik-oss/core-assisted-prescription) use case is further described [here](https://github.com/qlik-oss/core-assisted-prescription/blob/master/docs/system-design/qix-engine-sessions.md).

## Environment Variables

The following environment variables can optionally be set:

| Name              | Default value           | Description |
| ------------------| ----------------------- | ----------- |
| LOG_LEVEL         | info                    | Minimum log level that the service outputs when logging to `stdout` |
| MIRA_HOSTNAME     | mira                    | Hostname that should be used for service discovery |
| PORT              | 9455                    | Port used by the service REST API |
| SESSION_STRATEGY  | leastload               | Strategy to use for session placement. Can be `roundrobin` or `leastload` or `weighted` |

## Session Placement Strategy

The QIX Session Service uses strategies for determining which QIX Engine to place a session on. There are currently three strategies implemented `Least-Load` and `Round Robin` and `Weighted`. The `Least-Load` strategy and what metrics that are taken into consideration is further described in the following [whitepaper](https://qlikcore.com/docs/tutorials/scalability/newspaper/).

The default strategy used is `Least-Load`, but the strategy can also be toggled with the `SESSION_STRATEGY` environment variable.

## Endpoints

The REST API is specified in the [api-doc.yml](./doc/api-doc.yml) OpenAPI document. Default port used by the service is `9455`.

### /session/session-doc

Creates a session app in an available QIX Engine and returns the session info.

### /session/doc/:docId

Opens a session towards a specific document and returns the session info. Assumes that the document is already available to any QIX Engine in the orchestration.

## Circle CI

Circle CI is configured to build a new Docker image from all pushed commits on all branches in this git repository. As part of this, the built Docker image is pushed to Docker Hub. If pushing to a feature branch (different from `master`), the Docker image is tagged with `<version>-<build-number>`, where `<version>` is fetched from [`package.json`](./package.json), and `<build-number>` is the automatically increased Circle CI build number given to each build. If pushing to `master` the image is also tagged with `latest`.

Linting of the code and some basic smoke testing is part of the job pipeline and must succeed for the docker image to be published.

## Contributing

We welcome and encourage contributions! Please read [Open Source at Qlik R&D](https://github.com/qlik-oss/open-source) for more info on how to get involved.

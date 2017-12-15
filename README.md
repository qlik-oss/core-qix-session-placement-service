# qliktive-qix-session-service

**NOTE: This repository contains an example service for the [Qliktive Assisted Prescription](https://github.com/qlik-ea/qliktive-custom-analytics) use case.**

## Status

[![CircleCI](https://circleci.com/gh/qlik-ea/qliktive-qix-session-service.svg?style=shield&circle-token=900edd7d10992c2e85734c3b696eac9ddfb6cfde)](https://circleci.com/gh/qlik-ea/qliktive-qix-session-service)

## Overview

The QIX Session Service provides a session to a specific document ID or creates a session app. It uses [Mira](https://github.com/qlik-ea/mira) for discovering engines in an orchestration and based on strategy chooses a QIX Engine to open a session against.

How the qliktive-qix-session-service is used in the [Qliktive Assisted Prescription](https://github.com/qlik-ea/qliktive-custom-analytics) use case is further described [here](https://github.com/qlik-ea/qliktive-custom-analytics/blob/master/docs/system-design/qix-engine-sessions.md).

## Environment Variables

The following environment variables can optionally be set:

| Name              | Default value           | Description |
| ------------------| ----------------------- | ----------- |
| LOG_LEVEL         | info                    | Minimum log level that the service outputs when logging to `stdout` |
| MIRA_HOSTNAME     | mira                    | Hostname that should be used for service discovery |
| PORT              | 9455                    | Port used by the qliktive-qix-session-service REST API |
| SESSION_STRATEGY  | leastload               | Strategy to use for session placement. Can be `roundrobin` or `leastload` |

## Session Placement Strategy

The QIX Session Service uses strategies for determining which QIX Engine to place a session on. There are currently two strategies implemented `Least-Load` and `Round Robin`. The default strategy used is `Least-Load`, but which strategy to use can be toggled with the `SESSION_STRATEGY` environment variable describe [here](#environment-variables). The `Least-Load` strategy and what metrics that are taken into consideration used is further described in the following [whitepaper](https://ca.qliktive.com/docs/master/tutorials/scalability/newspaper/).

## Endpoints

The REST API is specified in the [api-doc.yml](./doc/api-doc.yml) OpenAPI document. Default port used by the qliktive-qix-session-service is `9455`.

### /session/session-doc

Creates a session app in an available QIX Engine and returns the session info.

### /session/:docId

Opens a session towards a specific document and returns the session info. Assumes that the document is already available to any QIX Engine in the orchestration.

## Circle CI

Circle CI is configured to build a new Docker image from all pushed commits on all branches of qliktive-qix-session-service. As part of this, the built Docker image is pushed to Docker Hub. If pushing to a feature branch (different from `master`), the Docker image is tagged with `<version>-<build-number>`, where `<version>` is fetched from [`package.json`](./package.json), and `<build-number>` is the automatically increased Circle CI build number given to each build. If pushing to `master` the image is also tagged with `latest`.

Linting of the code and some basic smoke testing is part of the job pipeline and must succeed for the docker image to be published.

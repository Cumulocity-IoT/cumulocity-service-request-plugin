# ADR-0003: Release process with semantic-release on develop and main

- **Status**: Accepted
- **Date**: 2026-11-16
- **Issue**: [#24](https://github.com/Cumulocity-IoT/cumulocity-service-request-plugin/issues/24)
- **Spec**: [`docs/ci-cd.md`](../ci-cd.md)

## Context

The plugin has no release process. The only workflow, `e2e-daily.yml`, fails every night because
the redesign (#22) deleted both Cypress spec files. Releases are created by hand: the last one,
`v1.0.7`, dates from August 2025, while `package.json` already says `2.0.7`. Nobody has released
or tagged any 2.x version.

The companion microservice, `cumulocity-microservice-service-request-mgmt`, uses a git-flow model:

- `develop` is the default branch, and `main` holds released code.
- Every push to `develop` or `main` builds the package and deploys it to a test tenant.
- A manually triggered workflow takes a version number as input, runs `mvn release:prepare`,
  creates `release/vX` and `released/vX` branches, and opens one PR to `main` and one back to
  `develop`.

That process has no release candidates, generates no changelog, and doesn't attach build
artifacts to the GitHub release.

Issue #24 asks for release candidates built from `develop` and stable releases built from `main`.

## Options considered

### A. Copy the microservice process

Replace `mvn release:prepare` with `npm version` and keep the rest.

- Pro: both repositories follow the same process.
- Con: each release creates 4 branches and 2 PRs, and someone has to type in the version number.
- Con: there are still no release candidates and no changelog, and the workflow needs a
  personal access token to push.

### B. semantic-release on `develop` (pre-release) and `main` (stable)

- Pro: merging to `develop` publishes `vX.Y.Z-rc.N`, and merging to `main` publishes `vX.Y.Z`.
- Pro: versions, release notes, tags, and GitHub releases with the plugin zip are all created
  automatically.
- Pro: the repository already uses Conventional Commits.
- Con: PR titles must follow Conventional Commits.
- Con: the `develop` to `main` PR must be merged with a merge commit, and `main` must be merged
  back into `develop` after each stable release.

### C. Release Please

- Pro: a bot keeps a release PR open, and merging it creates the release.
- Con: it works best with a single trunk branch, and release candidates fit poorly.
  That doesn't match the `develop`/`main` split the issue asks for.

## Decision

Option B. The plugin uses the same branch model as the microservice (`develop` and `main`,
tag format `vX.Y.Z`, test tenant deployment from `develop`), and semantic-release does the
versioning and release steps. The plugin and the microservice keep independent version numbers.

## Consequences

- The version in `package.json` on a branch is no longer authoritative. The release workflow sets
  the version at build time, and Git tags are the source of truth.
- Contributors write PR titles in Conventional Commits format, and a required check enforces this.
- If the process works well here, the microservice can adopt the same release workflow later.
  That is a separate decision.

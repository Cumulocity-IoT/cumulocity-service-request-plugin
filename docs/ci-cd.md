# CI/CD and release specification

This document specifies the GitHub Actions pipelines and the release process for the Service Request
Plugin. The decision and the alternatives considered are recorded in
[ADR-0003](adr/0003-release-process.md). Implementation is tracked in
[#24](https://github.com/Cumulocity-IoT/cumulocity-service-request-plugin/issues/24).

Each requirement has a stable identifier (`CI-XXX`). Keep identifiers when you reorder requirements,
and give new requirements the next free number.

## Goals

- Every merge to `develop` produces a release candidate (`vX.Y.Z-rc.N`) as a GitHub pre-release
  with the installable plugin zip attached.
- Every merge to `main` produces a stable release (`vX.Y.Z`) as the latest GitHub release with
  the plugin zip and generated release notes attached.
- Nobody types version numbers by hand. The version follows from the commit history.
- The branch model matches the companion microservice
  (`cumulocity-microservice-service-request-mgmt`). The plugin and the microservice keep
  independent version numbers.

## Branch and merge model

| Branch | Purpose | Receives changes from | Merge method | Release produced |
|---|---|---|---|---|
| `develop` (default) | Integration | Feature and fix branches, back-merges from `main` | Squash (features), merge commit (back-merges) | `vX.Y.Z-rc.N` pre-release |
| `main` | Released code | `develop` (release PR), `hotfix/*` | Merge commit only | `vX.Y.Z` stable release |
| `feat/*`, `fix/*`, `docs/*`, `chore/*`, `ci/*` | Work branches | n/a | n/a | None |
| `hotfix/*` | Urgent fix to the current stable release | Branched from `main` | n/a | None |

- **CI-001**: `develop` shall be the default branch, so new PRs target it automatically.
- **CI-002**: PRs into `develop` from work branches shall be squash-merged. The squash commit
  message shall be the PR title (repository setting "Default commit message" for squash merging
  set to "Pull request title").
- **CI-003**: PRs into `main` shall be merged with a merge commit. Squash merges into `main` are
  not allowed, because semantic-release needs the individual commits from `develop` to compute
  the version and the release notes.
- **CI-004**: After each stable release, `main` shall be merged back into `develop`. Without the
  back-merge, the stable tag isn't reachable from `develop`, and the next release candidate would
  reuse the old version number.

## Versioning rules

Versions follow [Semantic Versioning](https://semver.org) and are derived from
[Conventional Commits](https://www.conventionalcommits.org) in the history since the last release.

| Commit type | Example PR title | Version change |
|---|---|---|
| `feat` | `feat: add attachment preview` | Minor |
| `fix`, `perf` | `fix: keep alarm link after filter change` | Patch |
| Any type with `!` or a `BREAKING CHANGE:` footer | `feat!: require microservice 2.x` | Major |
| `docs`, `chore`, `ci`, `test`, `refactor`, `style`, `build` | `ci: cache Cypress binary` | None |

- **CI-005**: Tags shall use the format `vX.Y.Z` for stable releases and `vX.Y.Z-rc.N` for
  release candidates, matching the microservice tag format.
- **CI-006**: The release workflow shall set the version in `package.json` before the build, so
  the plugin manifest (`cumulocity.config.ts` reads `version` from `package.json`) carries the
  released version. The workflow shall not commit this change. Git tags are the source of truth,
  and the version in `package.json` on a branch is informational only.
- **CI-007**: A major version bump means a change that requires users to take action, for example
  a new minimum microservice or Cumulocity version. Note the required action in the PR description
  so it appears in the release notes.

## Workflows

### `ci.yml`: pull request checks

Trigger: `pull_request` targeting `develop` or `main`.

- **CI-010**: The workflow shall check that the PR title follows Conventional Commits
  (for example with `amannn/action-semantic-pull-request`).
- **CI-011**: The workflow shall install dependencies with `npm ci` on Node.js 24 and run
  `npm run build`.
- **CI-012**: The workflow shall run unit tests (`ng test` in headless Chrome) once the project
  contains at least one `*.spec.ts` file. There are none today.
- **CI-013**: The workflow shall run the Cypress E2E suite against the built plugin, using the
  existing setup from `e2e-daily.yml` (shell apps from `Cumulocity-IoT/plugins-e2e-setup`, served
  with `c8yctrl`).
- **CI-014**: The workflow shall always run, so that required checks never wait for a workflow that
  a path filter skipped. A first job shall detect whether only documentation or assets changed
  (`**/*.md`, `docs/**`, `assets/**`). If so, the build and E2E jobs shall be skipped, which GitHub
  counts as passing. This replaces the `paths-ignore` filter added in `d55ebbf`.
- **CI-015**: On E2E failure, the workflow shall upload Cypress screenshots and videos as workflow
  artifacts.

### `release.yml`: release candidates and stable releases

Trigger: `push` to `develop` or `main`.

- **CI-020**: The workflow shall run semantic-release with the configuration below. If no commit
  since the last release requires a version change, it shall end without creating a release.
- **CI-021**: On `develop`, a release shall create tag `vX.Y.Z-rc.N` and a GitHub release marked
  as pre-release.
- **CI-022**: On `main`, a release shall create tag `vX.Y.Z` and a GitHub release marked as latest.
- **CI-023**: Each release shall attach the build output `dist/service-request-plugin.zip` under
  the name `sag-ps-iot-pkg-service-request-plugin.zip`. This is the same name as the existing
  releases, so download links that point to the latest release keep working.
- **CI-024**: Release notes shall be generated from the commits in the release, grouped by type.
- **CI-025**: The workflow shall run with `concurrency: release-${{ github.ref }}` and
  `cancel-in-progress: false`, so two merges in quick succession can't create conflicting tags.
- **CI-026**: The workflow shall use the default `GITHUB_TOKEN` with `contents: write`,
  `issues: write`, and `pull-requests: write`. No personal access token is needed, because the
  workflow creates tags and releases but doesn't push commits.
- **CI-027**: After a stable release on `main`, the workflow shall open a PR from `main` into
  `develop` titled `chore: back-merge vX.Y.Z into develop`. A PR opened with `GITHUB_TOKEN` doesn't
  trigger other workflows, so its required checks never start. This step therefore needs a GitHub
  App token (`actions/create-github-app-token`). Until an App exists, do the back-merge by hand
  (see [Runbook](#runbook)).
- **CI-028**: After a release candidate on `develop`, the workflow shall deploy the plugin zip to
  the test tenant, the same way the microservice deploys `develop` builds. This job shall run only
  if the `test` environment is configured (see [Open questions](#open-questions)).

Draft `.releaserc.json`:

```json
{
  "branches": [
    "main",
    { "name": "develop", "prerelease": "rc", "channel": "rc" }
  ],
  "tagFormat": "v${version}",
  "plugins": [
    ["@semantic-release/commit-analyzer", { "preset": "conventionalcommits" }],
    ["@semantic-release/release-notes-generator", { "preset": "conventionalcommits" }],
    ["@semantic-release/npm", { "npmPublish": false }],
    ["@semantic-release/exec", { "prepareCmd": "npm run build" }],
    ["@semantic-release/github", {
      "assets": [
        { "path": "dist/service-request-plugin.zip", "name": "sag-ps-iot-pkg-service-request-plugin.zip" }
      ]
    }]
  ]
}
```

`@semantic-release/npm` with `npmPublish: false` only updates the version in `package.json` and
`package-lock.json` in the workflow's working copy (CI-006). The package is never published to
npm (`"private": true`).

### `e2e-nightly.yml`: nightly regression run

Replaces `e2e-daily.yml`.

Trigger: `schedule` (daily, 00:00 UTC) and `workflow_dispatch`.

- **CI-030**: The workflow shall run the E2E suite against the head of `develop` and the latest
  Cumulocity shell version. Scheduled workflows run on the default branch, so CI-001 covers this.
- **CI-031**: The workflow shall drop its `pull_request` trigger, because `ci.yml` (CI-013) now
  covers pull requests.
- **CI-032**: The E2E setup (dependency install, shell app download, `c8yctrl` start, Cypress run)
  shall be shared between `ci.yml` and `e2e-nightly.yml` as a reusable workflow
  (`workflow_call`), so the two runs can't drift apart.

## Repository settings

- **CI-040**: Rulesets for `develop` and `main`:
  - Require a pull request before merging.
  - Require the status checks from `ci.yml` (PR title, build, E2E).
  - Block force pushes and deletion.
  - Allowed merge methods: squash and merge commit for `develop`, merge commit only for `main`.
- **CI-041**: Tag ruleset for `v*`: only the release workflow may create tags, and nobody may
  update or delete them.
- **CI-042**: Secrets and variables:
  - Keep the existing `C8Y_TENANT`, `C8Y_USERNAME`, `C8Y_BASEURL`, and `C8Y_CYPRESS_DEVICE_ID`
    variables and the `C8Y_PASSWORD` secret for E2E.
  - Add a `test` environment with its own credentials for CI-028.

## Bootstrap

Do these steps once, in this order:

1. Restore or rewrite the Cypress specs that #22 deleted (`cypress/e2e/service-requests.cy.ts`,
   `cypress/e2e/service-request-modal.cy.ts`), tracked in
   [#27](https://github.com/Cumulocity-IoT/cumulocity-service-request-plugin/issues/27). Until then, every E2E run fails with
   "no spec files were found", so don't make the E2E check required before this step.
2. Tag the current head of `main` as `v2.0.7`, so semantic-release starts from the version in
   `package.json` and not from `v1.0.7`. Create a matching GitHub release with the plugin zip.
3. Create `develop` from `main` and make it the default branch.
4. Merge the workflows (`ci.yml`, `release.yml`, `e2e-nightly.yml`) and `.releaserc.json`.
   Delete `e2e-daily.yml` and `replaceVersion.sh`, which is a leftover from an earlier build setup.
5. Configure the rulesets and merge settings (CI-002, CI-040, CI-041).
6. Merge the first `feat` or `fix` PR into `develop` and check that `v2.0.8-rc.1` or
   `v2.1.0-rc.1` appears as a pre-release with the zip attached.

## Runbook

**Ship a release candidate.** Merge a `feat` or `fix` PR into `develop`. The release workflow
publishes the next `-rc.N` pre-release and deploys it to the test tenant.

**Ship a stable release.**

1. Open a PR from `develop` into `main`, titled `chore: release`.
2. Merge it with a merge commit. The release workflow publishes `vX.Y.Z`.
3. Merge the back-merge PR from `main` into `develop` with a merge commit. Until CI-027 is
   automated, open it yourself:
   `gh pr create --base develop --head main --title "chore: back-merge vX.Y.Z into develop"`.

**Ship a hotfix.**

1. Branch `hotfix/<topic>` from `main`.
2. Open a PR into `main` with a `fix:` title and merge it with a merge commit. The release
   workflow publishes the patch version.
3. Back-merge `main` into `develop` as in step 3 above.

## Open questions

- **Test tenant**: which tenant receives the release candidates (CI-028), and who owns its
  credentials?
- **GitHub App**: who creates and owns the GitHub App for the automated back-merge (CI-027)?
- **Pre-release versions in Cumulocity**: does the Administration application accept a manifest
  version such as `2.1.0-rc.1` when the zip is uploaded? Verify this with the first release
  candidate. If it doesn't, keep the Git tag as `vX.Y.Z-rc.N` and write `X.Y.Z` to the manifest
  for release candidates.

## Out of scope

- Linting. The project has no lint configuration yet.
- Publishing to npm or to any external extension catalog.
- Changing the microservice's release process. ADR-0003 notes this as a possible follow-up.

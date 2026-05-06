# grafana2

Helm chart for the staging GCP Grafana deployment.

## Design

- Wraps the `grafana-community/grafana` Helm chart so the Grafana deployment stays on the current maintained chart line.
- Uses Grafana `13.0.1` through chart `12.3.0`.
- Expects the Kubernetes secret `cluster-staging-grafana` to be synced from 1Password before install.
- Reads Grafana's Postgres backing database URL from `cluster-staging-grafana` key `DB_URL`.
- Provisions dashboards as code from JSON files in `dashboards/`.
- Provisions GCP data sources as code through the Grafana sidecar:
  - Google Cloud Monitoring (`stackdriver`) for GCP infrastructure metrics and Google Managed Service for Prometheus metrics.
  - Google Cloud Logging (`googlecloud-logging-datasource`) pinned to `1.6.3`.

## Required secret

The chart does not create secrets. Sync the 1Password item named `cluster-staging-grafana` into the target namespace with at least:

```text
DB_URL=<postgres connection URL for Grafana's database>
admin-user=<initial Grafana admin user>
admin-password=<initial Grafana admin password>
```

## Install

```bash
helm repo add grafana-community https://grafana-community.github.io/helm-charts
helm repo update
helm dependency update ./grafana2
helm upgrade --install grafana2 ./grafana2 \
  --namespace observability \
  --create-namespace \
  -f ./grafana2/values-staging.yaml
```

Set `gcp.projectId` and, if using GKE Workload Identity, `grafana.serviceAccount.annotations.iam\.gke\.io/gcp-service-account` in `values-staging.yaml` before deploying.

## Adding dashboards

Add dashboard JSON files under `dashboards/`. Each file is rendered into its own ConfigMap and loaded by Grafana's dashboard sidecar.

Dashboard JSON should reference these provisioned data source UIDs:

- `gcp-cloud-monitoring`
- `gcp-cloud-logging`

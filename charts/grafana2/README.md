# grafana2

`grafana2` is a thin wrapper chart around the upstream Grafana Helm chart for the staging GCP cluster.

It is designed to:

- run Grafana OSS `13.0.1`
- use PostgreSQL for Grafana state via `DB_URL`
- consume the staging secret `cluster-staging-grafana`
- load dashboards from this chart as code
- expose Google Cloud Monitoring as the default data source for both Cloud Monitoring metrics and PromQL against Managed Service for Prometheus

## Required secret keys

The Kubernetes secret consumed by the chart must provide at least:

- `admin-user`
- `admin-password`
- `DB_URL`

If you keep the secret synced from 1Password outside this chart, set the secret name with:

- `onePassword.existingSecretName`
- `grafana.admin.existingSecret`
- `grafana.envFromSecret`

The staging overlay already points those to `cluster-staging-grafana`.

## Optional 1Password operator integration

If your cluster uses the 1Password Kubernetes Operator and you want this chart to create the sync object, enable:

```yaml
onePassword:
  createItem: true
  vault: your-vault-name
  itemName: cluster-staging-grafana
  existingSecretName: cluster-staging-grafana
```

This creates a `OnePasswordItem` that materializes a Kubernetes secret named `cluster-staging-grafana`.

## Deployment model

The default data source is `Google Cloud Monitoring` with `authenticationType: gce`.

For GKE this is intended to be used with Workload Identity on the Grafana service account:

```yaml
grafana:
  serviceAccount:
    annotations:
      iam.gke.io/gcp-service-account: grafana-staging@staging-project-id.iam.gserviceaccount.com
```

That Google service account should have, at minimum:

- `roles/monitoring.viewer`

If you enable the optional Google Cloud Logging / Trace plugins, also grant:

- logging read permissions for Cloud Logging
- trace read permissions for Cloud Trace
- `roles/browser` or Cloud Resource Manager access as needed for project listing

## Dashboards as code

All dashboard JSON files in `dashboards/*.json` are rendered into labeled ConfigMaps and picked up by the Grafana dashboard sidecar automatically.

Add a new dashboard by dropping a JSON file into:

```text
charts/grafana2/dashboards/
```

## Staging install

```bash
helm dependency update charts/grafana2
helm upgrade --install grafana2 charts/grafana2 \
  --namespace monitoring \
  --create-namespace \
  -f charts/grafana2/values-staging.yaml
```

## Optional enterprise plugin overlay

Google Cloud Monitoring is built into Grafana OSS and works without extra plugins.

The Google Cloud Logging and Google Cloud Trace plugins are marketplace plugins. For self-hosted deployments, enable them only if you have the required Grafana entitlement:

```bash
helm upgrade --install grafana2 charts/grafana2 \
  --namespace monitoring \
  --create-namespace \
  -f charts/grafana2/values-staging.yaml \
  -f charts/grafana2/values-staging-enterprise.yaml
```

## Notes

- Replace the placeholder project IDs and hostnames in the staging overlays before applying.
- The dashboards are intentionally starter dashboards. Extend them by adding more JSON files rather than editing through the UI.
- For Managed Service for Prometheus, use the Cloud Monitoring data source with PromQL queries. This avoids the separate OAuth token sync flow otherwise required by a Prometheus data source targeting `monitoring.googleapis.com`.

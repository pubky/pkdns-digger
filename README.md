# PKARR DIG

Find your piece of digital sovereignty

```bash
npm run dev
```

## PKARR relays

By default, the app uses the relay list provided by the PKARR library. To use custom relays, set `NEXT_PUBLIC_PKARR_RELAYS` to a comma-separated list:

```bash
NEXT_PUBLIC_PKARR_RELAYS=https://relay1.example,https://relay2.example npm run dev
```

The settings button in the site header can override this relay list for the current browser. Browser settings are stored in `localStorage`; resetting them restores `NEXT_PUBLIC_PKARR_RELAYS`, or the PKARR defaults when the environment variable is unset.

## Cloud Run deployment

`.github/workflows/deploy.yml` builds and deploys on pushes to `main` or manual
runs, using the shared `pubky/ci-workflows` actions.

- Cloud Run service and image: `pkdns-net`
- Region: `europe-west6`
- Registry: `europe-west6-docker.pkg.dev/infra-464608/synonym-private-repo`
- Image tag: the Git commit SHA
- Container port: `8080`

The Dockerfile builds Next.js standalone output and runs its production Node.js
server as a non-root user. Nginx is not required.

Make the GitHub Actions secrets `GRC_INFRA_READ_WRITE` (Artifact Registry push
credentials) and `CLOUDRUN_INFRA` (Cloud Run deployment credentials) available to
this repository. The deployment account must be able to deploy the service, act
as its runtime service account, and configure unauthenticated invocation.

Cloud Run ingress allows internal traffic and Cloud Load Balancing.
Unauthenticated invocation lets the load balancer's serverless NEG reach the
service. The existing load balancer must route `pkdns.net` to `pkdns-net` in
`europe-west6`. DNS, TLS, and load-balancer resources are managed separately.

To test the production container locally:

```sh
docker build -t pkdns-net .
docker run --rm -p 8080:8080 pkdns-net
```

Open `http://localhost:8080/`. To customize the default relay list, pass
`--build-arg NEXT_PUBLIC_PKARR_RELAYS=https://relay1.example,https://relay2.example`
to `docker build`. This public setting is baked into the client bundle; setting
it as a Cloud Run runtime environment variable does not change the site.

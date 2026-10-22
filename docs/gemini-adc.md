# Gemini in the Banter chat with ADC (no API key)

The Gemini banter Action (`.github/workflows/gemini-banter.yml`) can sign in to Google with
Workload Identity Federation. GitHub gives the run a short-lived token, Google trades it for
credentials for a service account, and the run calls Gemini on Vertex AI. No key is stored anywhere,
and only workflows in this repo can use it.

You need a Google Cloud project with billing turned on. Vertex AI has no free tier, but a few short
chat replies cost a fraction of a cent each.

## One-time setup (paste into Cloud Shell)

Open [Cloud Shell](https://shell.cloud.google.com), set your project ID on the first line, then paste the rest.

```sh
PROJECT_ID=your-project-id
REPO=cillian1/belfast-wheel-app

gcloud config set project "$PROJECT_ID"
gcloud services enable aiplatform.googleapis.com iamcredentials.googleapis.com sts.googleapis.com
PROJECT_NUMBER=$(gcloud projects describe "$PROJECT_ID" --format='value(projectNumber)')

# The robot account Gemini runs as, allowed to call Vertex AI and nothing else.
gcloud iam service-accounts create gemini-banter --display-name="Gemini banter"
SA="gemini-banter@$PROJECT_ID.iam.gserviceaccount.com"
gcloud projects add-iam-policy-binding "$PROJECT_ID" --member="serviceAccount:$SA" --role=roles/aiplatform.user

# Trust GitHub's tokens, but only from this repo.
gcloud iam workload-identity-pools create github --location=global --display-name="GitHub"
gcloud iam workload-identity-pools providers create-oidc belfast-wheel --location=global \
  --workload-identity-pool=github --issuer-uri="https://token.actions.githubusercontent.com" \
  --attribute-mapping="google.subject=assertion.sub,attribute.repository=assertion.repository" \
  --attribute-condition="assertion.repository=='$REPO'"
gcloud iam service-accounts add-iam-policy-binding "$SA" --role=roles/iam.workloadIdentityUser \
  --member="principalSet://iam.googleapis.com/projects/$PROJECT_NUMBER/locations/global/workloadIdentityPools/github/attribute.repository/$REPO"

# The three values for GitHub:
echo "GCP_PROJECT=$PROJECT_ID"
echo "GCP_WIF_PROVIDER=projects/$PROJECT_NUMBER/locations/global/workloadIdentityPools/github/providers/belfast-wheel"
echo "GCP_SERVICE_ACCOUNT=$SA"
```

## Then in GitHub

Add the three printed values as **variables** (not secrets, they aren't secret) under
Settings → Secrets and variables → Actions → Variables:
`GCP_PROJECT`, `GCP_WIF_PROVIDER`, `GCP_SERVICE_ACCOUNT`.

Optional: set `GEMINI_MODEL` to pick another model (default on Vertex is `gemini-3-flash-preview`; gemini-2.5-flash was retired on Vertex around Oct 22 2026).

To test, post a comment on #30; Gemini should reply within a minute or so.
If both these variables and a `GEMINI_API_KEY` secret exist, the ADC route wins.

# Chinese Arizona Platform

Maintained by **Derek Ko**.

A bilingual community directory and content platform with business discovery,
account and claim flows, moderation, shop and advertising features, and
multi-city publishing and data-import pipelines.

## Repository layout

- `dev.chinesearizona.com/web/`: the Next.js application, API routes, ingestion scripts, and tests
- `ops/`: deployment, runtime monitoring, and worker operations
- `.github/workflows/`: continuous integration and deployment workflows
- `chinesearizona.com/`, `dev.chinesearizona.com/public/`, and `html/`: site assets and supporting or legacy site files

## Development

```sh
cd dev.chinesearizona.com/web
npm ci
npm run dev
```

The application and workers require environment configuration for their
integrations. Read the [application README](dev.chinesearizona.com/web/README.md)
for verification commands, data paths, and operational details. Additional
guides are in `dev.chinesearizona.com/web/docs/`.

The repository includes third-party software and site assets. Their existing
licenses and notices remain applicable to those components.

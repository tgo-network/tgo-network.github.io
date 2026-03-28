interface EnvCheck {
  name: string;
  required: boolean;
  ok: boolean;
  description: string;
}

const profile = process.argv[2]?.trim().toLowerCase() || "runtime";
const allowedProfiles = new Set(["runtime", "internal", "storage", "production"]);

if (!allowedProfiles.has(profile)) {
  console.error(
    `Unknown profile "${profile}". Use one of: ${Array.from(allowedProfiles).join(", ")}.`
  );
  process.exitCode = 1;
} else {
  const has = (value: string | undefined) => Boolean(value && value.trim().length > 0);
  const authUrlPresent = has(process.env.BETTER_AUTH_URL) || has(process.env.PUBLIC_API_BASE_URL);

  const checksByProfile: Record<string, EnvCheck[]> = {
    runtime: [
      {
        name: "DATABASE_URL",
        required: true,
        ok: has(process.env.DATABASE_URL),
        description: "PostgreSQL connection string for API data access."
      },
      {
        name: "BETTER_AUTH_SECRET",
        required: true,
        ok: has(process.env.BETTER_AUTH_SECRET),
        description: "Required for Better Auth sessions and storage intent signing."
      },
      {
        name: "BETTER_AUTH_URL | PUBLIC_API_BASE_URL",
        required: true,
        ok: authUrlPresent,
        description: "At least one auth base URL must be configured for Better Auth."
      },
      {
        name: "CORS_ALLOWED_ORIGINS",
        required: true,
        ok: has(process.env.CORS_ALLOWED_ORIGINS),
        description: "Explicit allowed origins for public and admin browser access."
      }
    ],
    internal: [
      {
        name: "DATABASE_URL",
        required: true,
        ok: has(process.env.DATABASE_URL),
        description: "PostgreSQL connection string for API data access."
      },
      {
        name: "BETTER_AUTH_SECRET",
        required: true,
        ok: has(process.env.BETTER_AUTH_SECRET),
        description: "Required for Better Auth sessions and storage intent signing."
      },
      {
        name: "BETTER_AUTH_URL | PUBLIC_API_BASE_URL",
        required: true,
        ok: authUrlPresent,
        description: "At least one auth base URL must be configured for Better Auth."
      },
      {
        name: "CORS_ALLOWED_ORIGINS",
        required: true,
        ok: has(process.env.CORS_ALLOWED_ORIGINS),
        description: "Explicit allowed origins for public and admin browser access."
      },
      {
        name: "INTERNAL_API_TOKEN",
        required: true,
        ok: has(process.env.INTERNAL_API_TOKEN),
        description: "Protects internal automation routes such as scheduled publishing."
      }
    ],
    storage: [
      {
        name: "BETTER_AUTH_SECRET",
        required: true,
        ok: has(process.env.BETTER_AUTH_SECRET),
        description: "Required for signing upload intent tokens."
      },
      {
        name: "S3_BUCKET",
        required: true,
        ok: has(process.env.S3_BUCKET),
        description: "Target bucket name for uploaded assets."
      },
      {
        name: "S3_ACCESS_KEY_ID",
        required: true,
        ok: has(process.env.S3_ACCESS_KEY_ID),
        description: "Object storage access key."
      },
      {
        name: "S3_SECRET_ACCESS_KEY",
        required: true,
        ok: has(process.env.S3_SECRET_ACCESS_KEY),
        description: "Object storage secret access key."
      },
      {
        name: "S3_ENDPOINT",
        required: false,
        ok: has(process.env.S3_ENDPOINT),
        description: "Optional for AWS S3, required for MinIO or other custom S3-compatible endpoints."
      },
      {
        name: "S3_PUBLIC_BASE_URL",
        required: false,
        ok: has(process.env.S3_PUBLIC_BASE_URL),
        description: "Recommended when public asset URLs should use an explicit CDN or bucket domain."
      }
    ],
    production: [
      {
        name: "DATABASE_URL",
        required: true,
        ok: has(process.env.DATABASE_URL),
        description: "PostgreSQL connection string for API data access."
      },
      {
        name: "BETTER_AUTH_SECRET",
        required: true,
        ok: has(process.env.BETTER_AUTH_SECRET),
        description: "Required for Better Auth sessions and storage intent signing."
      },
      {
        name: "BETTER_AUTH_URL | PUBLIC_API_BASE_URL",
        required: true,
        ok: authUrlPresent,
        description: "At least one auth base URL must be configured for Better Auth."
      },
      {
        name: "CORS_ALLOWED_ORIGINS",
        required: true,
        ok: has(process.env.CORS_ALLOWED_ORIGINS),
        description: "Explicit allowed origins for public and admin browser access."
      },
      {
        name: "INTERNAL_API_TOKEN",
        required: true,
        ok: has(process.env.INTERNAL_API_TOKEN),
        description: "Protects internal automation routes such as scheduled publishing."
      },
      {
        name: "S3_BUCKET",
        required: false,
        ok: has(process.env.S3_BUCKET),
        description: "Recommended when admin asset uploads are enabled in production."
      },
      {
        name: "S3_ACCESS_KEY_ID",
        required: false,
        ok: has(process.env.S3_ACCESS_KEY_ID),
        description: "Recommended when admin asset uploads are enabled in production."
      },
      {
        name: "S3_SECRET_ACCESS_KEY",
        required: false,
        ok: has(process.env.S3_SECRET_ACCESS_KEY),
        description: "Recommended when admin asset uploads are enabled in production."
      }
    ]
  };

  const checks = checksByProfile[profile];
  const missingRequired = checks.filter((entry) => entry.required && !entry.ok);
  const missingOptional = checks.filter((entry) => !entry.required && !entry.ok);

  if (missingRequired.length === 0) {
    console.log(`Environment profile "${profile}" is ready.`);
  } else {
    console.error(`Environment profile "${profile}" is missing required configuration:`);

    for (const item of missingRequired) {
      console.error(`- ${item.name}: ${item.description}`);
    }

    process.exitCode = 1;
  }

  if (missingOptional.length > 0) {
    console.log("");
    console.log(`Optional configuration not present for "${profile}":`);

    for (const item of missingOptional) {
      console.log(`- ${item.name}: ${item.description}`);
    }
  }
}

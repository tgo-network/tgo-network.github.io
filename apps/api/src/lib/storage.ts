import { createHmac, randomUUID, timingSafeEqual } from "node:crypto";

import { HeadObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import type { AdminAssetType, AdminAssetUploadIntentInput, AssetVisibility } from "@tgo/shared";

import { getEnv, isStorageConfigured } from "./env.js";

export type StorageErrorCode =
  | "STORAGE_NOT_CONFIGURED"
  | "UPLOAD_INTENT_INVALID"
  | "UPLOAD_INTENT_EXPIRED"
  | "UPLOAD_NOT_FOUND"
  | "STORAGE_UNAVAILABLE";

export class StorageError extends Error {
  code: StorageErrorCode;

  constructor(code: StorageErrorCode, message: string) {
    super(message);
    this.name = "StorageError";
    this.code = code;
  }
}

export interface AssetUploadIntentState {
  version: 1;
  assetId: string;
  bucket: string;
  objectKey: string;
  originalFilename: string;
  mimeType: string;
  byteSize: number;
  assetType: AdminAssetType;
  visibility: AssetVisibility;
  uploadedByStaffId: string;
  expiresAt: string;
}

export interface SignedAssetUpload {
  assetId: string;
  objectKey: string;
  uploadUrl: string;
  uploadMethod: "PUT";
  uploadHeaders: Record<string, string>;
  intentToken: string;
  expiresAt: string;
  previewUrl: string | null;
}

export interface UploadedObjectMetadata {
  byteSize: number | null;
  mimeType: string | null;
  checksum: string | null;
}

let s3Client: S3Client | null = null;

const imageExtensionByMimeType: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp"
};

const documentExtensionByMimeType: Record<string, string> = {
  "application/pdf": "pdf",
  "text/plain": "txt"
};

const trimTrailingSlash = (value: string) => value.replace(/\/+$/, "");
const encodeKey = (value: string) => value.split("/").map(encodeURIComponent).join("/");

const sanitizeName = (filename: string) => {
  const baseName = filename.replace(/\.[^.]+$/, "").trim().toLowerCase();
  const slug = baseName.replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").replace(/-{2,}/g, "-");

  return slug || "asset";
};

const getExtension = (filename: string, mimeType: string) => {
  const byMimeType = imageExtensionByMimeType[mimeType] ?? documentExtensionByMimeType[mimeType];

  if (byMimeType) {
    return byMimeType;
  }

  const normalized = filename.trim().toLowerCase();
  const parts = normalized.split(".");
  const byFilename = parts.length > 1 ? parts.pop() ?? "" : "";

  if (byFilename.length > 0 && /^[a-z0-9]+$/.test(byFilename)) {
    return byFilename;
  }

  return "bin";
};

const getAssetDomain = (assetType: AdminAssetType) =>
  assetType === "application-attachment" ? "applications" : "content";

const getStorageProvider = () => {
  const endpoint = getEnv().s3Endpoint?.toLowerCase();

  if (!endpoint) {
    return "aws-s3";
  }

  if (endpoint.includes("minio")) {
    return "minio";
  }

  if (endpoint.includes("r2.cloudflarestorage.com")) {
    return "cloudflare-r2";
  }

  if (endpoint.includes("amazonaws.com")) {
    return "aws-s3";
  }

  return "s3-compatible";
};

const getSigningSecret = () => {
  const { betterAuthSecret } = getEnv();

  if (!betterAuthSecret) {
    throw new StorageError("STORAGE_NOT_CONFIGURED", "Storage signing requires BETTER_AUTH_SECRET.");
  }

  return betterAuthSecret;
};

const getS3Client = () => {
  if (s3Client) {
    return s3Client;
  }

  const env = getEnv();

  if (!isStorageConfigured()) {
    throw new StorageError("STORAGE_NOT_CONFIGURED", "Object storage is not configured.");
  }

  s3Client = new S3Client({
    region: env.s3Region,
    ...(env.s3Endpoint ? { endpoint: env.s3Endpoint } : {}),
    forcePathStyle: env.s3ForcePathStyle,
    credentials: {
      accessKeyId: env.s3AccessKeyId!,
      secretAccessKey: env.s3SecretAccessKey!
    }
  });

  return s3Client;
};

const buildObjectKey = (assetId: string, input: AdminAssetUploadIntentInput) => {
  const env = getEnv();
  const now = new Date();
  const yyyy = String(now.getUTCFullYear());
  const mm = String(now.getUTCMonth() + 1).padStart(2, "0");
  const extension = getExtension(input.filename, input.mimeType);
  const slug = sanitizeName(input.filename);
  const domain = getAssetDomain(input.assetType);

  return `${env.storageEnvironment}/${domain}/${input.assetType}/${yyyy}/${mm}/${assetId}-${slug}.${extension}`;
};

const signToken = (value: string) => createHmac("sha256", getSigningSecret()).update(value).digest("base64url");

const isSignatureMatch = (received: string, expected: string) => {
  const receivedBuffer = Buffer.from(received);
  const expectedBuffer = Buffer.from(expected);

  if (receivedBuffer.length !== expectedBuffer.length) {
    return false;
  }

  return timingSafeEqual(receivedBuffer, expectedBuffer);
};

const getPublicBaseUrl = () => {
  const env = getEnv();

  if (env.s3PublicBaseUrl) {
    return trimTrailingSlash(env.s3PublicBaseUrl);
  }

  if (!env.s3Endpoint) {
    return null;
  }

  const endpoint = trimTrailingSlash(env.s3Endpoint);

  if (env.s3ForcePathStyle) {
    if (!env.s3Bucket) {
      return null;
    }

    return `${endpoint}/${env.s3Bucket}`;
  }

  return endpoint;
};

const isNotFoundError = (error: unknown) => {
  if (typeof error !== "object" || error === null) {
    return false;
  }

  const candidate = error as { name?: string; $metadata?: { httpStatusCode?: number } };

  return (
    candidate.name === "NotFound" ||
    candidate.name === "NoSuchKey" ||
    candidate.$metadata?.httpStatusCode === 404
  );
};

export const getAssetPublicUrl = (objectKey: string, visibility: AssetVisibility) => {
  if (visibility !== "public") {
    return null;
  }

  const baseUrl = getPublicBaseUrl();

  return baseUrl ? `${baseUrl}/${encodeKey(objectKey)}` : null;
};

export const getConfiguredStorageProvider = () => getStorageProvider();

export const createSignedAssetUpload = async (
  input: AdminAssetUploadIntentInput,
  staffAccountId: string
): Promise<SignedAssetUpload> => {
  const env = getEnv();

  if (!isStorageConfigured()) {
    throw new StorageError("STORAGE_NOT_CONFIGURED", "Object storage is not configured.");
  }

  const assetId = randomUUID();
  const objectKey = buildObjectKey(assetId, input);
  const expiresAt = new Date(Date.now() + env.assetUploadExpiresInSeconds * 1000).toISOString();
  const state: AssetUploadIntentState = {
    version: 1,
    assetId,
    bucket: env.s3Bucket!,
    objectKey,
    originalFilename: input.filename,
    mimeType: input.mimeType,
    byteSize: input.byteSize,
    assetType: input.assetType,
    visibility: input.visibility,
    uploadedByStaffId: staffAccountId,
    expiresAt
  };
  const encodedState = Buffer.from(JSON.stringify(state)).toString("base64url");
  const signature = signToken(encodedState);
  const uploadUrl = await getSignedUrl(
    getS3Client(),
    new PutObjectCommand({
      Bucket: state.bucket,
      Key: state.objectKey,
      ContentType: state.mimeType
    }),
    {
      expiresIn: env.assetUploadExpiresInSeconds
    }
  );

  return {
    assetId,
    objectKey,
    uploadUrl,
    uploadMethod: "PUT",
    uploadHeaders: {
      "Content-Type": input.mimeType
    },
    intentToken: `${encodedState}.${signature}`,
    expiresAt,
    previewUrl: getAssetPublicUrl(objectKey, input.visibility)
  };
};

export const readAssetUploadIntent = (intentToken: string): AssetUploadIntentState => {
  const [encodedState, signature] = intentToken.split(".");

  if (!encodedState || !signature) {
    throw new StorageError("UPLOAD_INTENT_INVALID", "Upload intent token is invalid.");
  }

  const expectedSignature = signToken(encodedState);

  if (!isSignatureMatch(signature, expectedSignature)) {
    throw new StorageError("UPLOAD_INTENT_INVALID", "Upload intent token is invalid.");
  }

  const payload = JSON.parse(Buffer.from(encodedState, "base64url").toString("utf8")) as AssetUploadIntentState;

  if (payload.version !== 1) {
    throw new StorageError("UPLOAD_INTENT_INVALID", "Upload intent token version is unsupported.");
  }

  if (new Date(payload.expiresAt).getTime() <= Date.now()) {
    throw new StorageError("UPLOAD_INTENT_EXPIRED", "Upload intent has expired.");
  }

  return payload;
};

export const inspectUploadedObject = async (
  intent: AssetUploadIntentState
): Promise<UploadedObjectMetadata> => {
  try {
    const response = await getS3Client().send(
      new HeadObjectCommand({
        Bucket: intent.bucket,
        Key: intent.objectKey
      })
    );

    return {
      byteSize: response.ContentLength ?? null,
      mimeType: response.ContentType ?? null,
      checksum: response.ETag ? response.ETag.replaceAll('"', "") : null
    };
  } catch (error) {
    if (isNotFoundError(error)) {
      throw new StorageError("UPLOAD_NOT_FOUND", "Uploaded object could not be found in storage.");
    }

    throw new StorageError("STORAGE_UNAVAILABLE", "Object storage is unavailable.");
  }
};

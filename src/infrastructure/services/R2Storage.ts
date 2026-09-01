import { DeleteObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { env } from "../../config/env";

export class R2Storage {
  private client: S3Client;

  constructor() {
    if (!env.r2AccountId || !env.r2AccessKeyId || !env.r2SecretAccessKey || !env.r2BucketName || !env.r2PublicBaseUrl) {
      throw new Error("R2_NOT_CONFIGURED");
    }
    if (!/^https?:\/\//.test(env.r2PublicBaseUrl)) {
      throw new Error("CLOUDFLARE_R2_PUBLIC_BASE_URL must include a scheme (http:// or https://)");
    }
    this.client = new S3Client({
      region: "auto",
      endpoint: `https://${env.r2AccountId}.r2.cloudflarestorage.com`,
      credentials: { accessKeyId: env.r2AccessKeyId, secretAccessKey: env.r2SecretAccessKey },
    });
  }

  async put(key: string, body: Buffer, contentType: string): Promise<string> {
    await this.client.send(new PutObjectCommand({ Bucket: env.r2BucketName, Key: key, Body: body, ContentType: contentType }));
    return `${env.r2PublicBaseUrl}/${key}`;
  }

  async delete(key: string): Promise<void> {
    await this.client.send(new DeleteObjectCommand({ Bucket: env.r2BucketName, Key: key }));
  }
}

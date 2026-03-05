import { HttpAgent } from "@icp-sdk/core/agent";
import { useCallback, useState } from "react";
import { loadConfig } from "../config";
import { StorageClient } from "../utils/StorageClient";
import { useInternetIdentity } from "./useInternetIdentity";

export interface UploadedPhoto {
  hash: string;
  url: string;
  name: string;
}

export function useBlobStorage() {
  const { identity } = useInternetIdentity();
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const uploadPhoto = useCallback(
    async (file: File): Promise<UploadedPhoto | null> => {
      setIsUploading(true);
      setUploadProgress(0);
      setUploadError(null);

      try {
        const config = await loadConfig();
        const agentOptions = identity ? { identity } : {};
        const agent = await HttpAgent.create(agentOptions as any);

        const storageClient = new StorageClient(
          "photos",
          config.storage_gateway_url || "",
          config.backend_canister_id || "",
          config.project_id || "",
          agent,
        );

        const bytes = new Uint8Array(await file.arrayBuffer());
        const { hash } = await storageClient.putFile(bytes, (pct) => {
          setUploadProgress(pct);
        });

        const url = await storageClient.getDirectURL(hash);
        return { hash, url, name: file.name };
      } catch (err) {
        const message = err instanceof Error ? err.message : "Upload failed";
        setUploadError(message);
        return null;
      } finally {
        setIsUploading(false);
        setUploadProgress(0);
      }
    },
    [identity],
  );

  return {
    uploadPhoto,
    isUploading,
    uploadProgress,
    uploadError,
  };
}

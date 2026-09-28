import { AicArtworkProvider } from "@/lib/api/aic/client";
import { CmaArtworkProvider } from "@/lib/api/cma/client";
import type { ArtworkSource } from "@/lib/artwork/types";
import type { ArtworkProvider } from "./artwork-provider";

let providers: Record<ArtworkSource, ArtworkProvider> | undefined;

export function getProviders(): Record<ArtworkSource, ArtworkProvider> {
  providers ??= { aic: new AicArtworkProvider(), cma: new CmaArtworkProvider() };
  return providers;
}

export function getProvider(source: ArtworkSource): ArtworkProvider {
  return getProviders()[source];
}

export interface IgInsights {
  impressions: number;
  reach: number;
  engagement: number;
  saved: number;
}

const GRAPH_API = "https://graph.facebook.com/v25.0";

export class MetaGraphService {
  async createMediaContainer(
    igUserId: string,
    token: string,
    imageUrl: string,
    caption: string,
  ): Promise<string> {
    const params = new URLSearchParams({
      image_url:    imageUrl,
      caption,
      access_token: token,
    });
    const res = await fetch(`${GRAPH_API}/${igUserId}/media`, {
      method: "POST",
      body:   params,
    });
    const json = await res.json() as { id?: string; error?: { message: string } };
    if (!res.ok || !json.id) {
      throw new Error(`Meta API error (createContainer): ${json.error?.message ?? res.status}`);
    }
    return json.id;
  }

  async publishMedia(igUserId: string, token: string, creationId: string): Promise<string> {
    const params = new URLSearchParams({
      creation_id:  creationId,
      access_token: token,
    });
    const res = await fetch(`${GRAPH_API}/${igUserId}/media_publish`, {
      method: "POST",
      body:   params,
    });
    const json = await res.json() as { id?: string; error?: { message: string } };
    if (!res.ok || !json.id) {
      throw new Error(`Meta API error (publish): ${json.error?.message ?? res.status}`);
    }
    return json.id;
  }

  async getPostInsights(mediaId: string, token: string): Promise<IgInsights> {
    const params = new URLSearchParams({
      metric:       "impressions,reach,engagement,saved",
      period:       "lifetime",
      access_token: token,
    });
    const res = await fetch(`${GRAPH_API}/${mediaId}/insights?${params.toString()}`);
    const json = await res.json() as { data?: Array<{ name: string; values: Array<{ value: number }> }> };

    const result: IgInsights = { impressions: 0, reach: 0, engagement: 0, saved: 0 };
    for (const item of json.data ?? []) {
      const value = item.values?.[0]?.value ?? 0;
      if (item.name === "impressions") result.impressions = value;
      if (item.name === "reach")       result.reach       = value;
      if (item.name === "engagement")  result.engagement  = value;
      if (item.name === "saved")       result.saved       = value;
    }
    return result;
  }
}

export const META_CONFIG = {
  GRAPH_API_BASE_URL: 'https://graph.facebook.com',
  DEFAULT_API_VERSION: 'v20.0',
  EVENT_NAME: 'Lead',
  ACTION_SOURCE: 'website' as const,
  getEventsEndpoint: (apiVersion: string, pixelId: string): string => {
    return `https://graph.facebook.com/${apiVersion}/${pixelId}/events`;
  },
};

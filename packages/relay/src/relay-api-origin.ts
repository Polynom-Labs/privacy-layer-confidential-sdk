export function relayApiOrigin(apiBaseUrl: string): string {
  return apiBaseUrl.replace(/\/api\/?$/u, '').replace(/\/$/u, '');
}

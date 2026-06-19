/**
 * Resolves the absolute backend API path when running on a native Android mobile device (e.g. Capacitor)
 * and keeps using relative paths when running directly inside the regular web browser in dev or prod.
 */
export function getApiUrl(path: string): string {
  const devUrl = "https://ais-dev-kxtjtwokok6spjgkhhin3f-564215357131.europe-west1.run.app";
  const origin = window.location.origin;

  // On native mobile app, standard origin would be capacitor://localhost or http://localhost (without dev port)
  if (
    origin.startsWith("capacitor:") || 
    (origin.includes("localhost") && !origin.includes(":3000") && !origin.includes(":5173"))
  ) {
    return `${devUrl}${path}`;
  }
  return path;
}

export function isValidUrl(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch (error) {
    console.log("errorInValidating", error);
    return false;
  }
}

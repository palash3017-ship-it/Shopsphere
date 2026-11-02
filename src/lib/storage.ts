// Turns a public image URL back into its path inside the "product-images" bucket
// e.g. https://xyz.supabase.co/storage/v1/object/public/product-images/<uid>/<file>.jpg
export function storagePathFromUrl(url: string | null | undefined) {
  if (!url) return null;
  const marker = "/product-images/";
  const i = url.indexOf(marker);
  return i === -1 ? null : url.slice(i + marker.length);
}

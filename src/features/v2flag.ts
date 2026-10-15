// VITE_V2_PUBLIC=true switches the old public URLs to the v2 pages (owner: S3).
export const V2_PUBLIC = import.meta.env.VITE_V2_PUBLIC === 'true'
// VITE_V2_FORMAT_REDIRECTS=true sends /teams and /shuffle to their current competition and drops those nav tabs.
// Separate flag: flip it only once S4's Teams/Shuffle panels render inside the competition page.
export const V2_FORMAT_REDIRECTS = import.meta.env.VITE_V2_FORMAT_REDIRECTS === 'true'

import { createClient } from '@supabase/supabase-js';
import "dotenv/config";

const supabaseUrl = process.env.SUPABASE_URL || 'https://icslgomptvgphecfvlxy.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imljc2xnb21wdHZncGhlY2Z2bHh5Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MTcwNjE5MiwiZXhwIjoyMDc3MjgyMTkyfQ.Y-sXfYKU989jTL-qg6eHHHj3g0IBkgZWpE9w7RLMWro';

export const supabase = createClient(supabaseUrl, supabaseKey);

// Storage bucket name
export const IMAGES_BUCKET = 'easylease-storage';

// Storage folder for listings
export const LISTINGS_FOLDER = 'listings';

// Helper function to upload image
export async function uploadListingImage(file: Buffer, fileName: string, contentType: string) {
  const fullPath = `${LISTINGS_FOLDER}/${fileName}`;
  const { data, error } = await supabase.storage
    .from(IMAGES_BUCKET)
    .upload(fullPath, file, {
      contentType,
      upsert: false
    });

  if (error) throw error;
  return data;
}

// Helper function to get public URL
export function getListingImageUrl(fileName: string) {
  const fullPath = `${LISTINGS_FOLDER}/${fileName}`;
  const { data } = supabase.storage
    .from(IMAGES_BUCKET)
    .getPublicUrl(fullPath);

  return data.publicUrl;
}

// Helper function to delete image
export async function deleteListingImage(fileName: string) {
  const fullPath = `${LISTINGS_FOLDER}/${fileName}`;
  const { error } = await supabase.storage
    .from(IMAGES_BUCKET)
    .remove([fullPath]);

  if (error) throw error;
}
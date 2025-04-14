import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Generates an affiliate link for the given product URL
 * @param url Original product URL
 * @returns URL with affiliate parameters added
 */
export async function generateAffiliateLink(url: string): Promise<string> {
  try {
    // Call our API endpoint to generate the affiliate link
    const response = await fetch('/api/affiliate/link', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ url }),
    });
    
    if (!response.ok) {
      throw new Error(`Failed to generate affiliate link: ${response.status}`);
    }
    
    const data = await response.json();
    return data.affiliateLink;
  } catch (error) {
    console.error('Error generating affiliate link:', error);
    // If we can't generate an affiliate link, return the original URL
    return url;
  }
}

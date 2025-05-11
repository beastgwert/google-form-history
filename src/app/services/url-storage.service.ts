import { Injectable } from '@angular/core';

// Chrome extension API types
declare const chrome: any;

interface UrlData {
  url: string;
  timestamp: number;
  userId: string;
  metadata: {
    addedAt: string;
    userId: string;
  };
}

@Injectable({
  providedIn: 'root'
})
export class UrlStorageService {
  constructor() { }

  /**
   * Gets all stored URLs from API Gateway
   */
  async getUrls(): Promise<string[]> {
    try {
      const urlData = await this.fetchUrlsFromApiGateway();
      // Extract just the URL strings from the URL data objects
      return urlData.map(item => item.url);
    } catch (error) {
      console.error('Error getting URLs:', error);
      return [];
    }
  }
  
  /**
   * Fetches all URL data from API Gateway
   */
  private async fetchUrlsFromApiGateway(): Promise<UrlData[]> {
    try {
      // Get API endpoints from the manifest
      const manifest = chrome.runtime.getManifest();
      const retrieveUrlsEndpoint = manifest.api_endpoints.retrieve_urls;
      
      const response = await fetch(`${retrieveUrlsEndpoint}?userId=${chrome.runtime.id}`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }
      
      const data = await response.json();
      return data.urls || [];
    } catch (error) {
      console.error('Error fetching URLs from API Gateway:', error);
      return [];
    }
  }

  /**
   * Removes a URL from storage
   * 
   * Note: This is a placeholder as we're not implementing removal via API Gateway yet
   */
  async removeUrl(url: string): Promise<void> {
    console.log('removeUrl functionality not implemented for API Gateway yet');
    // The actual implementation would require a new Lambda function and API endpoint
    // for removing specific URLs from S3
  }

  /**
   * Clears all stored URLs
   * 
   * Note: This is a placeholder as we're not implementing clearing via API Gateway yet
   */
  async clearUrls(): Promise<void> {
    console.log('clearUrls functionality not implemented for API Gateway yet');
    // The actual implementation would require a new Lambda function and API endpoint
    // for clearing all URLs for a specific user from S3
  }

}

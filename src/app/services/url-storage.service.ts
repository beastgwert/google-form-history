import { Injectable } from '@angular/core';

// Chrome extension API types
declare const chrome: any;

interface UrlData {
  url: string;
  title: string;
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
   * Gets all stored URLs with titles from chrome.storage.local
   */
  async getUrls(): Promise<{url: string, title: string}[]> {
    try {
      // Get URLs from chrome.storage.local
      const result = await chrome.storage.local.get('formUrls');
      const urlData = result.formUrls || [];
      
      // Extract URL and title from the URL data objects
      return urlData.map(item => ({
        url: item.url,
        title: item.title || 'Unknown Form'
      }));
    } catch (error) {
      console.error('Error getting URLs from local storage:', error);
      return [];
    }
  }
  
  // The fetchUrlsFromApiGateway method has been removed as it's no longer needed
  // URL fetching and storage is now handled by the background script

  /**
   * Removes a URL from storage by sending a request to the delete-url endpoint
   */
  async removeUrl(url: string): Promise<void> {
    try {
      // Get API endpoints from the manifest
      const manifest = chrome.runtime.getManifest();
      const deleteUrlEndpoint = manifest.api_endpoints.delete_url;
      
      // Create payload for the delete request
      const payload = { 
        url: url,
        userId: chrome.runtime.id
      };
      
      console.log('Sending delete request to API Gateway for URL:', url);
      
      // Send delete request to API Gateway
      const response = await fetch(deleteUrlEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }
      
      // After successful API call, update local storage
      // Get current URLs from storage
      const result = await chrome.storage.local.get('formUrls');
      const urls = result.formUrls || [];
      
      // Filter out the URL to remove
      const filteredUrls = urls.filter(item => item.url !== url);
      
      // Update storage with filtered URLs
      await chrome.storage.local.set({ 'formUrls': filteredUrls });
      
      console.log('URL successfully removed from API and local storage:', url);
    } catch (error) {
      console.error('Error removing URL:', error);
    }
  }

  /**
   * Clears all stored URLs from local storage
   * 
   * Note: This only clears local storage. API Gateway clearing is not implemented yet.
   */
  async clearUrls(): Promise<void> {
    try {
      // Clear the formUrls from storage
      await chrome.storage.local.set({ 'formUrls': [] });
      console.log('All URLs cleared from local storage');
    } catch (error) {
      console.error('Error clearing URLs from local storage:', error);
    }
  }

}

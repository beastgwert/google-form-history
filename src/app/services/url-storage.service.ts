import { Injectable } from '@angular/core';
import CONFIG from '../../config.js';

// Chrome extension API types
declare const chrome: any;

@Injectable({
  providedIn: 'root'
})
export class UrlStorageService {
  private readonly STORAGE_KEY = 'google_forms_urls';
  private readonly API_ENDPOINT = CONFIG.API_ENDPOINT;

  constructor() { }

  /**
   * Adds a URL to the stored list if it doesn't already exist
   * Also uploads the URL to AWS via Lambda
   */
  async addUrl(url: string): Promise<void> {
    const urls = await this.getUrls();
    
    // Only add the URL if it's not already in the list
    if (!urls.includes(url)) {
      urls.push(url);
      await this.saveUrls(urls);
      
      // Upload to AWS via Lambda
      await this.uploadUrlToLambda(url);
    }
  }

  /**
   * Gets all stored URLs
   */
  async getUrls(): Promise<string[]> {
    return new Promise<string[]>((resolve) => {
      chrome.storage.local.get([this.STORAGE_KEY], (result) => {
        resolve(result[this.STORAGE_KEY] || []);
      });
    });
  }

  /**
   * Saves the list of URLs to storage
   */
  private async saveUrls(urls: string[]): Promise<void> {
    return new Promise<void>((resolve) => {
      chrome.storage.local.set({ [this.STORAGE_KEY]: urls }, () => {
        resolve();
      });
    });
  }

  /**
   * Removes a URL from storage
   */
  async removeUrl(url: string): Promise<void> {
    const urls = await this.getUrls();
    const updatedUrls = urls.filter(u => u !== url);
    await this.saveUrls(updatedUrls);
  }

  /**
   * Clears all stored URLs
   */
  async clearUrls(): Promise<void> {
    await this.saveUrls([]);
  }

  /**
   * Uploads a URL to AWS S3 via Lambda function
   * @param url The URL to upload
   */
  private async uploadUrlToLambda(url: string): Promise<void> {
    try {
      const response = await fetch(this.API_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ url })
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }
      
      const data = await response.json();
      console.log('Successfully uploaded URL to AWS via Lambda:', data);
    } catch (error) {
      console.error('Error uploading URL to AWS:', error);
      // You may want to implement retry logic or error handling here
    }
  }
}

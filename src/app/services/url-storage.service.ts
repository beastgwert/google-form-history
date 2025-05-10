import { Injectable } from '@angular/core';
import CONFIG from '../../config.js';

// Chrome extension API types
declare const chrome: any;

@Injectable({
  providedIn: 'root'
})
export class UrlStorageService {
  private readonly STORAGE_KEY = 'google_forms_urls';

  constructor() { }

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

}

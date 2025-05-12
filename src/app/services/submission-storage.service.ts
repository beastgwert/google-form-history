import { Injectable } from '@angular/core';

// Chrome extension API types
declare const chrome: any;

interface SubmissionData {
  formTitle: string;
  editUrl: string;
  timestamp: string;
}

@Injectable({
  providedIn: 'root'
})
export class SubmissionStorageService {
  constructor() { }

  /**
   * Gets all stored submissions from chrome.storage.local
   */
  async getSubmissions(): Promise<SubmissionData[]> {
    try {
      // Get submissions from chrome.storage.local
      const result = await chrome.storage.local.get('submissions');
      const submissions = result.submissions || [];
      
      // Sort submissions by timestamp (newest first)
      return submissions.sort((a, b) => {
        return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
      });
    } catch (error) {
      console.error('Error getting submissions from local storage:', error);
      return [];
    }
  }
}

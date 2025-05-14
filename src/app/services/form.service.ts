import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

// Chrome extension API types
declare const chrome: any;

// Helper function to extract form ID from a Google Form URL
function extractFormId(url: string): string {
  try {
    // Extract form ID from various Google Forms URL formats
    const urlObj = new URL(url);
    const pathname = urlObj.pathname;
    
    // Format: /forms/u/0/d/e/[FORM_ID]/formResponse (submitted form)
    if (pathname.includes('/forms/u/0/d/e/')) {
      const match = pathname.match(/\/forms\/u\/\d+\/d\/e\/([^/]+)/);
      if (match && match[1]) return match[1];
    }
    
    // Format: /forms/d/e/[FORM_ID]/viewform
    if (pathname.includes('/forms/d/e/')) {
      const match = pathname.match(/\/forms\/d\/e\/([^/]+)/);
      if (match && match[1]) return match[1];
    }
    
    // Format: /forms/d/[FORM_ID]/viewform
    if (pathname.includes('/forms/d/')) {
      const match = pathname.match(/\/forms\/d\/([^/]+)/);
      if (match && match[1]) return match[1];
    }
    
    // If no match found, use the whole pathname as a fallback
    return pathname.replace(/\//g, '_');
  } catch (error) {
    console.error('Error extracting form ID:', error);
    // Generate a unique ID based on the URL string if extraction fails
    return url.replace(/[^a-zA-Z0-9]/g, '_');
  }
}

export interface FormData {
  id?: string;
  formId?: string;
  url: string;
  title: string;
  timestamp: number;
}

export interface SubmissionData {
  formTitle: string;
  editUrl: string;
  timestamp: string;
  questions?: {
    text: string;
    answer: string;
    type: string;
  }[];
}

export interface SavedFormResponse {
  formId: string;
  url: string;
  title: string;
  timestamp: string;
  status: string;
  questions: {
    text: string;
    answer: string;
    type: string;
  }[];
}

@Injectable({
  providedIn: 'root'
})
export class FormService {
  private editingFormsSubject = new BehaviorSubject<FormData[]>([]);
  private submittedFormsSubject = new BehaviorSubject<FormData[]>([]);
  private savedResponsesSubject = new BehaviorSubject<SavedFormResponse[]>([]);
  
  editingForms$ = this.editingFormsSubject.asObservable();
  submittedForms$ = this.submittedFormsSubject.asObservable();
  savedResponses$ = this.savedResponsesSubject.asObservable();

  constructor() {
    // Load initial data
    this.loadForms();
  }

  /**
   * Gets all stored URLs with titles from chrome.storage.local
   * Data is sorted by date (newest first) by default
   */
  async getUrls(): Promise<FormData[]> {
    try {
      // Get URLs from chrome.storage.local
      const result = await chrome.storage.local.get('formUrls');
      const urlData = result['formUrls'] || [];
      
      // Map to FormData format
      const formData = urlData.map(item => ({
        formId: item.formId,
        url: item.url,
        title: item.title || 'Unknown Form',
        timestamp: item.timestamp || Date.now()
      }));

      // Sort by timestamp (newest first)
      const sortedFormData = formData.sort((a, b) => {
        return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
      });

      // Update the BehaviorSubject
      this.editingFormsSubject.next(sortedFormData);
      
      return sortedFormData;
    } catch (error) {
      console.error('Error getting URLs from local storage:', error);
      return [];
    }
  }

  /**
   * Gets all stored submissions from chrome.storage.local
   */
  async getSubmissions(): Promise<SubmissionData[]> {
    try {
      // Get submissions from chrome.storage.local
      const result = await chrome.storage.local.get('formSubmissions');
      const submissions = result['formSubmissions'] || [];
      
      // Sort submissions by timestamp (newest first)
      const sortedSubmissions = submissions.sort((a, b) => {
        return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
      });

      // Update the BehaviorSubject
      this.submittedFormsSubject.next(sortedSubmissions.map(sub => ({
        id: sub.editUrl,
        url: sub.editUrl,
        title: sub.formTitle || 'Unknown Form',
        timestamp: new Date(sub.timestamp).getTime()
      })));
      
      return sortedSubmissions;
    } catch (error) {
      console.error('Error getting submissions from local storage:', error);
      return [];
    }
  }
  
  /**
   * Gets all saved form responses from chrome.storage.local
   */
  async getSavedResponses(): Promise<SavedFormResponse[]> {
    try {
      // Get saved responses from chrome.storage.local
      const result = await chrome.storage.local.get('savedFormResponses');
      const savedResponses = result['savedFormResponses'] || [];
      
      // Sort by timestamp (newest first)
      const sortedResponses = savedResponses.sort((a, b) => {
        return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
      });

      // Update the BehaviorSubject
      this.savedResponsesSubject.next(sortedResponses);
      
      return sortedResponses;
    } catch (error) {
      console.error('Error getting saved responses from local storage:', error);
      return [];
    }
  }

  /**
   * Updates local storage by removing a URL
   * This is used for optimistic UI updates
   */
  private async updateLocalStorageAfterRemove(url: string): Promise<void> {
    try {
      // Extract form ID from URL
      const formId = extractFormId(url);
      console.log('Extracted form ID for removal:', formId);
      
      // Get current URLs from storage
      const result = await chrome.storage.local.get('formUrls');
      const urls = result['formUrls'] || [];
      
      // Filter out the form with matching ID
      const filteredUrls = urls.filter(item => item.formId !== formId);
      
      // Update storage with filtered URLs
      await chrome.storage.local.set({ 'formUrls': filteredUrls });
      
      // Update the BehaviorSubject
      const updatedForms = this.editingFormsSubject.value.filter(form => {
        // Check if form has formId, if not fall back to URL comparison
        if (form.formId) {
          return form.formId !== formId;
        } else {
          return form.url !== url;
        }
      });
      this.editingFormsSubject.next(updatedForms);
      
      console.log('Form removed from local storage. Form ID:', formId);
    } catch (error) {
      console.error('Error updating local storage:', error);
      throw error; // Re-throw to allow caller to handle
    }
  }

  private loadForms() {
    // Load editing forms, submitted forms, and saved responses
    this.getUrls().catch(error => console.error('Error loading editing forms:', error));
    this.getSubmissions().catch(error => console.error('Error loading submitted forms:', error));
    this.getSavedResponses().catch(error => console.error('Error loading saved responses:', error));
  }

  sortEditingFormsAlphabetically() {
    const forms = [...this.editingFormsSubject.value];
    forms.sort((a, b) => a.title.localeCompare(b.title));
    this.editingFormsSubject.next(forms);
  }

  sortSubmittedFormsAlphabetically() {
    const forms = [...this.submittedFormsSubject.value];
    forms.sort((a, b) => a.title.localeCompare(b.title));
    this.submittedFormsSubject.next(forms);
  }

  sortEditingFormsByDate() {
    const forms = [...this.editingFormsSubject.value];
    forms.sort((a, b) => {
      // Handle both number timestamps and ISO string timestamps
      const timestampA = typeof a.timestamp === 'string' ? new Date(a.timestamp).getTime() : a.timestamp;
      const timestampB = typeof b.timestamp === 'string' ? new Date(b.timestamp).getTime() : b.timestamp;
      return timestampB - timestampA; // Newest first
    });
    this.editingFormsSubject.next(forms);
  }

  sortSubmittedFormsByDate() {
    const forms = [...this.submittedFormsSubject.value];
    forms.sort((a, b) => {
      // Handle both number timestamps and ISO string timestamps
      const timestampA = typeof a.timestamp === 'string' ? new Date(a.timestamp).getTime() : a.timestamp;
      const timestampB = typeof b.timestamp === 'string' ? new Date(b.timestamp).getTime() : b.timestamp;
      return timestampB - timestampA; // Newest first
    });
    this.submittedFormsSubject.next(forms);
  }

  /**
   * Updates the badge count in the Chrome extension icon
   * This should be called whenever the number of editing forms changes
   */
  updateBadgeCount() {
    const count = this.editingFormsSubject.value.length + this.savedResponsesSubject.value.length;
    // Send a message to the background script to update the badge
    chrome.runtime.sendMessage({ 
      action: 'updateBadge', 
      count: count 
    });
  }
  
  /**
   * Sorts saved responses alphabetically by form title
   */
  sortSavedResponsesAlphabetically() {
    const responses = [...this.savedResponsesSubject.value];
    responses.sort((a, b) => a.title.localeCompare(b.title));
    this.savedResponsesSubject.next(responses);
  }
  
  /**
   * Sorts saved responses by date (newest first)
   */
  sortSavedResponsesByDate() {
    const responses = [...this.savedResponsesSubject.value];
    responses.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    this.savedResponsesSubject.next(responses);
  }
  
  /**
   * Formats a date string with MM/DD/YY format and time with single-digit hours
   * @param timestamp ISO string or any valid date string
   * @returns Formatted date and time string
   */
  formatDate(timestamp: string): string {
    try {
      const date = new Date(timestamp);
      
      // Format date to show only last two digits of year (MM/DD/YY)
      const month = date.getMonth() + 1;
      const day = date.getDate();
      const year = date.getFullYear().toString().slice(-2);
      const formattedDate = `${month}/${day}/${year}`;
      
      // Format time with single-digit hours (no leading zeros)
      const hours = date.getHours();
      const minutes = date.getMinutes().toString().padStart(2, '0');
      const ampm = hours >= 12 ? 'PM' : 'AM';
      const hours12 = hours % 12 || 12; // Convert to 12-hour format
      const timeString = `${hours12}:${minutes} ${ampm}`;
      
      return formattedDate + ' | ' + timeString;
    } catch {
      return 'Unknown Date';
    }
  }

  /**
   * Removes a URL from local storage
   * Also updates the badge count
   */
  async removeUrl(url: string): Promise<void> {
    try {
      // Update local storage
      await this.updateLocalStorageAfterRemove(url);
      
      console.log('URL successfully removed from local storage:', url);
      
      // Update the badge count after successful deletion
      this.updateBadgeCount();
    } catch (error) {
      console.error('Error removing URL:', error);
      throw error; // Re-throw to allow caller to handle
    }
  }
}

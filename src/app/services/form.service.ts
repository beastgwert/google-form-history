import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

declare const chrome: any;
export interface FormData {
  id?: string;
  formId?: string;
  url: string;
  title: string;
  description?: string;
  timestamp: number;
  questions?: {
    text: string;
    answer: string;
    type: string;
  }[];
}
export interface SubmissionData {
  formId?: string;
  formTitle: string;
  description?: string;
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
        formId: sub.formId,
        url: sub.editUrl,
        title: sub.formTitle || 'Unknown Form',
        description: sub.description || '',
        timestamp: new Date(sub.timestamp).getTime(),
        questions: sub.questions
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
   * Updates local storage by removing a form or submission
   * This is used for optimistic UI updates
   * @param formId The form ID to remove
   * @param type The type of item to remove ('editing' or 'submission')
   */
  private async updateLocalStorageAfterRemove(formId: string, type: 'editing' | 'submission'): Promise<void> {
    try {
      console.log(`Removing ${type} with form ID:`, formId);
      
      if (type === 'editing') {
        // Get current URLs from storage
        const result = await chrome.storage.local.get('formUrls');
        const urls = result['formUrls'] || [];
        
        // Filter out the form with matching ID
        const filteredUrls = urls.filter(item => item.formId !== formId);
        
        // Update storage with filtered URLs
        await chrome.storage.local.set({ 'formUrls': filteredUrls });
        
        // Update the BehaviorSubject
        const updatedForms = this.editingFormsSubject.value.filter(form => form.formId !== formId);
        this.editingFormsSubject.next(updatedForms);
        
        console.log('Form removed from local storage. Form ID:', formId);
      } else if (type === 'submission') {
        // Get current submissions from storage
        const result = await chrome.storage.local.get('formSubmissions');
        const submissions = result['formSubmissions'] || [];
        
        // Filter out the submission with matching form ID
        const filteredSubmissions = submissions.filter(item => item.formId !== formId);
        
        // Update storage with filtered submissions
        await chrome.storage.local.set({ 'formSubmissions': filteredSubmissions });
        
        // Update the BehaviorSubject
        const updatedSubmissions = this.submittedFormsSubject.value.filter(form => form.formId !== formId);
        this.submittedFormsSubject.next(updatedSubmissions);
        
        console.log('Submission removed from local storage. Form ID:', formId);
      }
    } catch (error) {
      console.error(`Error updating local storage for ${type}:`, error);
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
   * Removes a form from local storage
   * Also updates the badge count
   */
  async removeUrl(formId: string): Promise<void> {
    try {
      // Update local storage
      await this.updateLocalStorageAfterRemove(formId, 'editing');
      
      console.log('Form successfully removed from local storage. Form ID:', formId);
      
      // Update the badge count after successful deletion
      this.updateBadgeCount();
    } catch (error) {
      console.error('Error removing form:', error);
      throw error; // Re-throw to allow caller to handle
    }
  }

  /**
   * Removes a submission from local storage
   */
  async removeSubmission(formId: string): Promise<void> {
    try {
      // Update local storage
      await this.updateLocalStorageAfterRemove(formId, 'submission');
      
      console.log('Submission successfully removed from local storage. Form ID:', formId);
      
      // No need to update badge count for submissions as they don't affect the badge
    } catch (error) {
      console.error('Error removing submission:', error);
      throw error; // Re-throw to allow caller to handle
    }
  }
}

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

@Injectable({
  providedIn: 'root'
})
export class FormService {
  private editingFormsSubject = new BehaviorSubject<FormData[]>([]);
  private submittedFormsSubject = new BehaviorSubject<FormData[]>([]);
  
  editingForms$ = this.editingFormsSubject.asObservable();
  submittedForms$ = this.submittedFormsSubject.asObservable();

  constructor() {
    this.loadForms();
  }

  // Gets all stored URLs with titles from chrome.storage.local
  async getUrls(): Promise<FormData[]> {
    try {
      const result = await chrome.storage.local.get('formUrls');
      const urlData = result['formUrls'] || [];
      
      const formData = urlData.map(item => ({
        formId: item.formId,
        url: item.url,
        title: item.title || 'Unknown Form',
        timestamp: item.timestamp || Date.now()
      }));

      // Sorted by date by default
      const sortedFormData = formData.sort((a, b) => {
        return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
      });

      this.editingFormsSubject.next(sortedFormData);
      return sortedFormData;
    } catch (error) {
      console.error('Error getting URLs from local storage:', error);
      return [];
    }
  }

  // Gets all stored submissions from chrome.storage.local
  async getSubmissions(): Promise<SubmissionData[]> {
    try {
      const result = await chrome.storage.local.get('formSubmissions');
      const submissions = result['formSubmissions'] || [];
      
      const sortedSubmissions = submissions.sort((a, b) => {
        return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
      });

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
  


  // Updates local storage by removing a form or submission
  private async updateLocalStorageAfterRemove(formId: string, type: 'editing' | 'submission'): Promise<void> {
    try {
      console.log(`Removing ${type} with form ID:`, formId);
      
      if (type === 'editing') {
        const result = await chrome.storage.local.get('formUrls');
        const urls = result['formUrls'] || [];
        
        const filteredUrls = urls.filter(item => item.formId !== formId);
        await chrome.storage.local.set({ 'formUrls': filteredUrls });
        
        const updatedForms = this.editingFormsSubject.value.filter(form => form.formId !== formId);
        this.editingFormsSubject.next(updatedForms);
      } else if (type === 'submission') {
        const result = await chrome.storage.local.get('formSubmissions');
        const submissions = result['formSubmissions'] || [];
        
        const filteredSubmissions = submissions.filter(item => item.formId !== formId);
        await chrome.storage.local.set({ 'formSubmissions': filteredSubmissions });
        
        const updatedSubmissions = this.submittedFormsSubject.value.filter(form => form.formId !== formId);
        this.submittedFormsSubject.next(updatedSubmissions);
      }
    } catch (error) {
      console.error(`Error updating local storage for ${type}:`, error);
      throw error; 
    }
  }

  // Load editing forms and submitted forms
  private loadForms() {
    this.getUrls().catch(error => console.error('Error loading editing forms:', error));
    this.getSubmissions().catch(error => console.error('Error loading submitted forms:', error));
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
      const timestampA = typeof a.timestamp === 'string' ? new Date(a.timestamp).getTime() : a.timestamp;
      const timestampB = typeof b.timestamp === 'string' ? new Date(b.timestamp).getTime() : b.timestamp;
      return timestampB - timestampA; 
    });
    this.editingFormsSubject.next(forms);
  }

  sortSubmittedFormsByDate() {
    const forms = [...this.submittedFormsSubject.value];
    forms.sort((a, b) => {
      const timestampA = typeof a.timestamp === 'string' ? new Date(a.timestamp).getTime() : a.timestamp;
      const timestampB = typeof b.timestamp === 'string' ? new Date(b.timestamp).getTime() : b.timestamp;
      return timestampB - timestampA; 
    });
    this.submittedFormsSubject.next(forms);
  }


  // This should be called whenever the number of editing forms changes
  updateBadgeCount() {
    const count = this.editingFormsSubject.value.length;
    chrome.runtime.sendMessage({ 
      action: 'updateBadge', 
      count: count 
    });
  }
  

  // Formats a date string with MM/DD/YY format and time with single-digit hours
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

  // Remove a form from Editing
  async removeUrl(formId: string): Promise<void> {
    try {
      await this.updateLocalStorageAfterRemove(formId, 'editing');
      this.updateBadgeCount();
    } catch (error) {
      console.error('Error removing form:', error);
      throw error; 
    }
  }

  // Remove a form from Submitted
  async removeSubmission(formId: string): Promise<void> {
    try {
      await this.updateLocalStorageAfterRemove(formId, 'submission');
    } catch (error) {
      console.error('Error removing submission:', error);
      throw error; 
    }
  }
}

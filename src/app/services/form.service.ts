import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

export interface FormData {
  id: string;
  url: string;
  title: string;
  timestamp: number;
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
    // Load initial data
    this.loadForms();
  }

  private loadForms() {
    // This would typically load from storage or API
    // For now, we'll just use placeholder logic
    chrome.storage.local.get(['editingForms', 'submittedForms'], (result) => {
      if (result['editingForms']) {
        this.editingFormsSubject.next(result['editingForms']);
      }
      if (result['submittedForms']) {
        this.submittedFormsSubject.next(result['submittedForms']);
      }
    });
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
    forms.sort((a, b) => b.timestamp - a.timestamp); // Newest first
    this.editingFormsSubject.next(forms);
  }

  sortSubmittedFormsByDate() {
    const forms = [...this.submittedFormsSubject.value];
    forms.sort((a, b) => b.timestamp - a.timestamp); // Newest first
    this.submittedFormsSubject.next(forms);
  }
}

import { Component, OnInit, ChangeDetectorRef, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormService } from '../../services/form.service';
import { Subscription } from 'rxjs';
interface SubmissionItem {
  formId: string;
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

declare const chrome: any;
@Component({
  selector: 'app-submitted',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './submitted.component.html',
  styleUrl: './submitted.component.css'
})
export class SubmittedComponent implements OnInit, OnDestroy {
  submissions: SubmissionItem[] = [];
  private subscription: Subscription | undefined;
  isLoading: boolean = true;

  constructor(private formService: FormService, private cdr: ChangeDetectorRef) {}

  async ngOnInit() {
    this.loadSubmissions();
  }

  async loadSubmissions() {
    console.log("Loading submissions...");
    this.isLoading = true;
    await this.formService.getSubmissions();
    
    // Subscribe to the submittedForms$ observable to get updates when sorting changes
    this.subscription = this.formService.submittedForms$.subscribe(updatedForms => {
      this.submissions = updatedForms.map(form => ({
        formId: form.formId || '',
        formTitle: form.title,
        description: form.description || '',
        editUrl: form.url,
        timestamp: new Date(form.timestamp).toISOString(),
        questions: form.questions || []
      }));
      this.isLoading = false;
      this.cdr.detectChanges();
    });
  }

  getFormName(submission: SubmissionItem): string {
    return submission.formTitle;
  }
  
  // Check if title should show tooltip
  isTitleTruncated(element?: HTMLElement): boolean {
    if (element) {
      return element.offsetWidth < element.scrollWidth;
    }
    return true;
  }

  getFormattedDate(timestamp: string): string {
    return this.formService.formatDate(timestamp);
  }

  // Opens saved submissions in new tab
  viewSubmission(submission: SubmissionItem, event?: MouseEvent) {
    if (event) {
      event.stopPropagation();
    }
    
    const submissionData = {
      formTitle: submission.formTitle,
      description: submission.description || '',
      formattedDate: this.getFormattedDate(submission.timestamp),
      questions: submission.questions || []
    };
    
    // Create the URL with the data as a query parameter
    const templateUrl = chrome.runtime.getURL('templates/submission-details.html');
    const url = `${templateUrl}?data=${encodeURIComponent(JSON.stringify(submissionData))}`;

    chrome.tabs.create({url: url});
  }

  // Redirect to editing url
  editSubmission(submission: SubmissionItem, event: MouseEvent) {
    event.stopPropagation();
    if (submission.editUrl) {
      chrome.tabs.create({ url: submission.editUrl });
    }
  }
  
  // Delete submission from local storage (formSubmissions)
  async removeSubmission(formId: string, event: MouseEvent) {
    event.stopPropagation();
    
    this.formService.removeSubmission(formId).catch(error => {
      console.error('Error removing submission:', error);
      this.loadSubmissions();
    });
  }
  
  ngOnDestroy() {
    if (this.subscription) {
      this.subscription.unsubscribe();
    }
  }
}

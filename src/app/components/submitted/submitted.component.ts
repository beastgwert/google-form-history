import { Component, OnInit, ChangeDetectorRef, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormService, SubmissionData } from '../../services/form.service';
import { Subscription } from 'rxjs';

// Local interface for component use - different from FormService's SubmissionData
interface SubmissionItem {
  formId: string;
  formTitle: string;
  editUrl: string;
  timestamp: string;
  questions?: {
    text: string;
    answer: string;
    type: string;
  }[];
}

// Chrome extension API types
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

  constructor(private formService: FormService, private cdr: ChangeDetectorRef) {}

  async ngOnInit() {
    this.loadSubmissions();
  }

  async loadSubmissions() {
    console.log("Loading submissions...");
    await this.formService.getSubmissions();
    
    // Subscribe to the submittedForms$ observable to get updates when sorting changes
    this.subscription = this.formService.submittedForms$.subscribe(updatedForms => {
      this.submissions = updatedForms.map(form => ({
        formId: form.formId || '',
        formTitle: form.title,
        editUrl: form.url,
        timestamp: new Date(form.timestamp).toISOString(),
        questions: form.questions || []
      }));
      this.cdr.detectChanges();
    });
  }
  


  // Store original title to use for tooltip if needed
  getOriginalFormName(submission: SubmissionItem): string {
    // Use the title if available, otherwise extract from URL
    if (submission.formTitle && submission.formTitle !== 'Unknown Form') {
      return submission.formTitle;
    }
    
    try {
      // Fallback to extracting form name from URL
      const urlObj = new URL(submission.editUrl);
      const pathParts = urlObj.pathname.split('/');
      return pathParts[pathParts.length - 2] || 'Unknown Form';
    } catch {
      return 'Unknown Form';
    }
  }

  getFormName(submission: SubmissionItem): string {
    // Just return the original name - truncation will be handled by CSS
    return this.getOriginalFormName(submission);
  }
  
  // This will be called from the template to check if title should show tooltip
  isTitleTruncated(submission: SubmissionItem, element?: HTMLElement): boolean {
    if (element) {
      // DOM-based overflow detection
      return element.offsetWidth < element.scrollWidth;
    }
    
    // Fallback to the original name for tooltip content
    return true;
  }

  getFormattedDate(timestamp: string): string {
    return this.formService.formatDate(timestamp);
  }

  // View submission - opens the form for viewing or shows saved responses
  viewSubmission(submission: SubmissionItem, event?: MouseEvent) {
    if (event) {
      event.stopPropagation();
    }
    
    if (submission.questions && submission.questions.length > 0) {
      this.showSubmissionDetails(submission);
    } else {
      console.log(submission);
      alert('No edit link available for this submission.');
    }
  }
  
  // Edit submission - opens the form for editing
  editSubmission(submission: SubmissionItem, event: MouseEvent) {
    event.stopPropagation();
    
    // Only proceed if we have an editUrl
    if (submission.editUrl) {
      chrome.tabs.create({ url: submission.editUrl });
    }
  }
  
  async removeSubmission(formId: string, event: MouseEvent) {
    event.stopPropagation();
    
    this.formService.removeSubmission(formId).catch(error => {
      console.error('Error removing submission:', error);
      // If there's an error, reload the submissions to ensure UI is in sync
      this.loadSubmissions();
    });
  }
  
  // Method to display submission details when no edit link is available
  showSubmissionDetails(submission: SubmissionItem) {
    // For now, we'll just use an alert to show the questions and answers
    // This could be enhanced to use a modal dialog in the future
    let message = `Form: ${submission.formTitle}\n`;
    message += `Submitted: ${this.getFormattedDate(submission.timestamp)}\n\n`;
    
    if (submission.questions && submission.questions.length > 0) {
      message += 'Your Responses:\n';
      submission.questions.forEach((q, index) => {
        message += `\n${index + 1}. ${q.text}\nAnswer: ${q.answer}\n`;
      });
    } else {
      message += 'No response details available.';
    }
    
    alert(message);
  }
  
  ngOnDestroy() {
    // Unsubscribe to prevent memory leaks
    if (this.subscription) {
      this.subscription.unsubscribe();
    }
  }
}

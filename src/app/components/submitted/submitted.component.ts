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
    const submissionData = await this.formService.getSubmissions();
    
    // Convert to the format expected by the component
    this.submissions = submissionData.map(sub => ({
      formId: sub.formId || '',
      formTitle: sub.formTitle,
      editUrl: sub.editUrl,
      timestamp: sub.timestamp,
      questions: sub.questions
    }));
    
    console.log("Loaded submissions: ", this.submissions);
    // Manually trigger change detection
    this.cdr.detectChanges();
    
    // Subscribe to the submittedForms$ observable to get updates when sorting changes
    this.subscription = this.formService.submittedForms$.subscribe(updatedForms => {
      this.submissions = updatedForms.map(form => ({
        formId: form.formId || '',
        formTitle: form.title,
        editUrl: form.url,
        timestamp: new Date(form.timestamp).toISOString(),
        questions: undefined
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

  openForm(submission: SubmissionItem) {
    // If we have an editUrl, use it to open the form
    if (submission.editUrl) {
      chrome.tabs.create({ url: submission.editUrl });
    } else {
      // If we don't have an editUrl but have questions data, show it in a modal or alert
      if (submission.questions && submission.questions.length > 0) {
        this.showSubmissionDetails(submission);
      } else {
        // If we have neither, just show a message
        alert('No edit link available for this submission.');
      }
    }
  }
  
  async removeSubmission(formId: string, event: MouseEvent) {
    // Stop the click event from propagating to the parent element
    // This prevents the openForm method from being called
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

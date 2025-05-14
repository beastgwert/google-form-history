import { Component, OnInit, ChangeDetectorRef, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormService, SubmissionData } from '../../services/form.service';
import { Subscription } from 'rxjs';

// Using SubmissionData interface from FormService

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
  submissions: SubmissionData[] = [];
  private subscription: Subscription | undefined;

  constructor(private formService: FormService, private cdr: ChangeDetectorRef) {}

  async ngOnInit() {
    this.loadSubmissions();
  }

  async loadSubmissions() {
    console.log("Loading submissions...");
    this.submissions = await this.formService.getSubmissions();
    console.log("Loaded submissions: ", this.submissions);
    // Manually trigger change detection
    this.cdr.detectChanges();
    
    // Subscribe to the submittedForms$ observable to get updates when sorting changes
    this.subscription = this.formService.submittedForms$.subscribe(updatedForms => {
      this.submissions = updatedForms.map(form => ({
        formTitle: form.title,
        editUrl: form.url,
        timestamp: new Date(form.timestamp).toISOString()
      }));
      this.cdr.detectChanges();
    });
  }

  // Store original title to use for tooltip if needed
  getOriginalFormName(submission: SubmissionData): string {
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

  getFormName(submission: SubmissionData): string {
    // Just return the original name - truncation will be handled by CSS
    return this.getOriginalFormName(submission);
  }
  
  // This will be called from the template to check if title should show tooltip
  isTitleTruncated(submission: SubmissionData, element?: HTMLElement): boolean {
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

  openForm(submission: SubmissionData) {
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
  
  // Method to display submission details when no edit link is available
  showSubmissionDetails(submission: SubmissionData) {
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

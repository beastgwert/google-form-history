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

  openForm(url: string) {
    chrome.tabs.create({ url });
  }
  
  ngOnDestroy() {
    // Unsubscribe to prevent memory leaks
    if (this.subscription) {
      this.subscription.unsubscribe();
    }
  }
}

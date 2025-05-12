import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SubmissionStorageService } from '../../services/submission-storage.service';

interface SubmissionData {
  formTitle: string;
  editUrl: string;
  timestamp: string;
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
export class SubmittedComponent implements OnInit {
  submissions: SubmissionData[] = [];
  isLoading = true;

  constructor(private submissionStorageService: SubmissionStorageService, private cdr: ChangeDetectorRef) {}

  async ngOnInit() {
    this.loadSubmissions();
  }

  async loadSubmissions() {
    console.log("Loading submissions...");
    this.isLoading = true;
    this.submissions = await this.submissionStorageService.getSubmissions();
    this.isLoading = false;
    console.log("Loaded submissions: ", this.submissions);
    // Manually trigger change detection
    this.cdr.detectChanges();
  }

  getFormName(submission: SubmissionData): string {
    // Use the title if available, otherwise extract from URL
    if (submission.formTitle && submission.formTitle !== 'Unknown Form') {
      return submission.formTitle.length > 40 ? submission.formTitle.substring(0, 40) + '...' : submission.formTitle;
    }
    
    try {
      // Fallback to extracting form name from URL
      const urlObj = new URL(submission.editUrl);
      const pathParts = urlObj.pathname.split('/');
      const formId = pathParts[pathParts.length - 2] || 'Unknown Form';
      return formId.length > 20 ? formId.substring(0, 20) + '...' : formId;
    } catch {
      return 'Unknown Form';
    }
  }

  getFormattedDate(timestamp: string): string {
    try {
      const date = new Date(timestamp);
      return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
    } catch {
      return 'Unknown Date';
    }
  }

  openForm(url: string) {
    chrome.tabs.create({ url });
  }
}

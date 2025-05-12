import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { UrlStorageService } from '../../services/url-storage.service';

interface FormData {
  url: string;
  title: string;
}

// Chrome extension API types
declare const chrome: any;

@Component({
  selector: 'app-editing',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './editing.component.html',
  styleUrl: './editing.component.css'
})
export class EditingComponent implements OnInit {
  formUrls: FormData[] = [];

  constructor(private urlStorageService: UrlStorageService, private cdr: ChangeDetectorRef) {}

  async ngOnInit() {
    this.loadUrls();
  }

  async loadUrls() {
    console.log("Loading URLs...");
    this.formUrls = await this.urlStorageService.getUrls();
    console.log("Loaded URLs: ", this.formUrls);
    // Manually trigger change detection
    this.cdr.detectChanges();
  }

  async removeUrl(url: string) {
    // Optimistic UI update - remove the URL from the UI immediately
    this.formUrls = this.formUrls.filter(item => item.url !== url);
    
    // Then send the delete request to the cloud
    this.urlStorageService.removeUrl(url).catch(error => {
      console.error('Error removing URL:', error);
      // If there's an error, reload the URLs to ensure UI is in sync
      this.loadUrls();
    });
  }

  // The clearAllUrls method has been removed

  getFormName(formData: FormData): string {
    // Use the title if available, otherwise extract from URL
    if (formData.title && formData.title !== 'Unknown Form') {
      return formData.title.length > 40 ? formData.title.substring(0, 40) + '...' : formData.title;
    }
    
    try {
      // Fallback to extracting form name from URL
      const urlObj = new URL(formData.url);
      const pathParts = urlObj.pathname.split('/');
      const formId = pathParts[pathParts.length - 2] || 'Unknown Form';
      return formId.length > 20 ? formId.substring(0, 20) + '...' : formId;
    } catch {
      return 'Unknown Form';
    }
  }

  openForm(url: string) {
    chrome.tabs.create({ url });
  }
}

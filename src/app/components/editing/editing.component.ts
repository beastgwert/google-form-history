import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { UrlStorageService } from '../../services/url-storage.service';

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
  formUrls: string[] = [];
  isLoading = true;

  constructor(private urlStorageService: UrlStorageService, private cdr: ChangeDetectorRef) {}

  async ngOnInit() {
    // Get the current tab URL to check if it's a Google Form
    chrome.tabs.query({active: true, currentWindow: true}, async (tabs) => {
      const currentUrl = tabs[0]?.url || '';
      
      // If the current URL is a Google Form, add it to storage
      if (currentUrl && currentUrl.includes('docs.google.com/forms/')) {
        await this.urlStorageService.addUrl(currentUrl);
      }
      
      // Load all stored URLs
      this.loadUrls();
    });
  }

  async loadUrls() {
    console.log("Loading URLs...");
    this.isLoading = true;
    this.formUrls = await this.urlStorageService.getUrls();
    this.isLoading = false;
    console.log("Loaded URLs: ", this.formUrls);
    // Manually trigger change detection
    this.cdr.detectChanges();
  }

  async removeUrl(url: string) {
    await this.urlStorageService.removeUrl(url);
    await this.loadUrls();
  }

  async clearAllUrls() {
    await this.urlStorageService.clearUrls();
    await this.loadUrls();
  }

  getFormName(url: string): string {
    try {
      // Extract form name from URL or return a shortened URL
      const urlObj = new URL(url);
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

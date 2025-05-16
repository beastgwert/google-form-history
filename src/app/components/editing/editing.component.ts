import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormService } from '../../services/form.service';
import { Subscription } from 'rxjs';

// Local interface for component use - different from FormService's FormData
interface FormItem {
  formId: string;
  url: string;
  title: string;
  timestamp: string;
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
export class EditingComponent implements OnInit, OnDestroy {
  formUrls: FormItem[] = [];
  private subscription: Subscription | undefined;

  constructor(private formService: FormService, private cdr: ChangeDetectorRef) {}

  async ngOnInit() {
    this.loadUrls();
  }

  async loadUrls() {
    console.log("Loading URLs...");
    const forms = await this.formService.getUrls();
    
    // Subscribe to the editingForms$ observable to get updates when sorting changes
    this.subscription = this.formService.editingForms$.subscribe(updatedForms => {
      this.formUrls = updatedForms.map(item => ({
        formId: item.formId || '',
        url: item.url,
        title: item.title,
        timestamp: new Date(item.timestamp).toISOString()
      }));
      this.cdr.detectChanges();
    });
  }

  async removeUrl(formId: string) {
    this.formService.removeUrl(formId).catch(error => {
      console.error('Error removing form:', error);
      // If there's an error, reload the URLs to ensure UI is in sync
      this.loadUrls();
    });
  }

  getOriginalFormName(formData: FormItem): string {
    // Use the title if available, otherwise extract from URL
    if (formData.title && formData.title !== 'Unknown Form') {
      return formData.title;
    }
    
    try {
      // Fallback to extracting form name from URL
      const urlObj = new URL(formData.url);
      const pathParts = urlObj.pathname.split('/');
      return pathParts[pathParts.length - 2] || 'Unknown Form';
    } catch {
      return 'Unknown Form';
    }
  }

  getFormName(formData: FormItem): string {
    // Just return the original name - truncation will be handled by CSS
    return this.getOriginalFormName(formData);
  }
  
  // This will be called from the template to check if title should show tooltip
  isTitleTruncated(formData: FormItem, element?: HTMLElement): boolean {
    if (element) {
      // DOM-based overflow detection
      return element.offsetWidth < element.scrollWidth;
    }
    
    // Fallback to the original name for tooltip content
    return true;
  }

  openForm(url: string) {
    chrome.tabs.create({ url });
  }

  getFormattedDate(timestamp: string): string {
    return this.formService.formatDate(timestamp);
  }
  
  ngOnDestroy() {
    // Unsubscribe to prevent memory leaks
    if (this.subscription) {
      this.subscription.unsubscribe();
    }
  }
}

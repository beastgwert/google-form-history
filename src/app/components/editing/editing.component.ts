import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormService } from '../../services/form.service';
import { Subscription } from 'rxjs';

// Local interface for component use - different from FormService's FormData
interface FormItem {
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
    
    // Convert to the format expected by the component
    this.formUrls = forms.map(item => ({
      url: item.url,
      title: item.title,
      timestamp: new Date(item.timestamp).toISOString()
    }));
    
    console.log("Loaded URLs: ", this.formUrls);
    // Manually trigger change detection
    this.cdr.detectChanges();
    
    // Subscribe to the editingForms$ observable to get updates when sorting changes
    this.subscription = this.formService.editingForms$.subscribe(updatedForms => {
      this.formUrls = updatedForms.map(item => ({
        url: item.url,
        title: item.title,
        timestamp: new Date(item.timestamp).toISOString()
      }));
      this.cdr.detectChanges();
    });
  }

  async removeUrl(url: string) {
    // Optimistic UI update - remove the URL from the UI immediately
    this.formUrls = this.formUrls.filter(item => item.url !== url);
    
    // Then send the delete request to the cloud
    this.formService.removeUrl(url).catch(error => {
      console.error('Error removing URL:', error);
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
    const originalName = this.getOriginalFormName(formData);
    
    // Return truncated version for display
    if (originalName.length > 30) {
      return originalName.substring(0, 30) + '...';
    }
    return originalName;
  }
  
  isTitleTruncated(formData: FormItem): boolean {
    const originalName = this.getOriginalFormName(formData);
    return originalName.length > 30;
  }

  openForm(url: string) {
    chrome.tabs.create({ url });
  }

  getFormattedDate(timestamp: string): string {
    try {
      const date = new Date(timestamp);
      // Format date without seconds
      return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
    } catch {
      return 'Unknown Date';
    }
  }
  
  ngOnDestroy() {
    // Unsubscribe to prevent memory leaks
    if (this.subscription) {
      this.subscription.unsubscribe();
    }
  }
}

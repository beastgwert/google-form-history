import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormService } from '../../services/form.service';
import { Subscription } from 'rxjs';
interface FormItem {
  formId: string;
  url: string;
  title: string;
  timestamp: string;
}

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
  isLoading: boolean = true;

  constructor(private formService: FormService, private cdr: ChangeDetectorRef) {}

  async ngOnInit() {
    this.loadUrls();
  }

  async loadUrls() {
    console.log("Loading URLs...");
    this.isLoading = true;
    await this.formService.getUrls();
    
    // Subscribe to the editingForms$ observable to get updates when sorting changes
    this.subscription = this.formService.editingForms$.subscribe(updatedForms => {
      this.formUrls = updatedForms.map(item => ({
        formId: item.formId || '',
        url: item.url,
        title: item.title,
        timestamp: new Date(item.timestamp).toISOString()
      }));
      this.isLoading = false;
      this.cdr.detectChanges();
    });
  }

  async removeUrl(formId: string) {
    this.formService.removeUrl(formId).catch(error => {
      console.error('Error removing form:', error);
      this.loadUrls();
    });
  }

  getFormName(formData: FormItem): string {
    return formData.title;
  }
  
  // Check if title should show tooltip
  isTitleTruncated(element?: HTMLElement): boolean {
    if (element) {
      return element.offsetWidth < element.scrollWidth;
    }
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

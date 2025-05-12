import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { EditingComponent } from './components/editing/editing.component';
import { SubmittedComponent } from './components/submitted/submitted.component';
import { FormService } from './services/form.service';


@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, EditingComponent, SubmittedComponent],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css'
})
export class AppComponent {
  title = 'google-form-history';
  activeTab: 'editing' | 'submitted' = 'editing';
  sortMode: 'date' | 'alphabetical' = 'date';

  constructor(private formService: FormService) {}

  setActiveTab(tab: 'editing' | 'submitted') {
    this.activeTab = tab;
  }

  sortAlphabetically() {
    this.sortMode = 'alphabetical';
    if (this.activeTab === 'editing') {
      this.formService.sortEditingFormsAlphabetically();
    } else {
      this.formService.sortSubmittedFormsAlphabetically();
    }
  }

  sortByDate() {
    this.sortMode = 'date';
    if (this.activeTab === 'editing') {
      this.formService.sortEditingFormsByDate();
    } else {
      this.formService.sortSubmittedFormsByDate();
    }
  }
}

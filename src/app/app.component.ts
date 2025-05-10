import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { EditingComponent } from './components/editing/editing.component';
import { SubmittedComponent } from './components/submitted/submitted.component';


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



  setActiveTab(tab: 'editing' | 'submitted') {
    this.activeTab = tab;
  }
}

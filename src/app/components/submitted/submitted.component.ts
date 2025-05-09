import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-submitted',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './submitted.component.html',
  styleUrl: './submitted.component.css'
})
export class SubmittedComponent implements OnInit {
  // This component will handle the submitted forms logic
  // For now it's a placeholder that can be expanded later

  constructor() {}

  ngOnInit() {
    // Initialize component
  }
}

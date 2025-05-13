// Content script to add a "Save Responses" button to Google Forms

// Function to extract form data (questions and responses)
function extractFormData() {
  console.log('Extracting form data...');
  const formData = {
    questions: [],
    formId: extractFormId(window.location.href),
    url: window.location.href,
    title: document.title.replace(' - Google Forms', '').trim()
  };
  
  // Get all form items
  const formItems = document.querySelectorAll('[role="listitem"]');
  
  formItems.forEach(item => {
    // Try to get the question text
    const questionElement = item.querySelector('.freebirdFormviewerComponentsQuestionBaseTitle');
    if (!questionElement) return; // Skip if no question found
    
    const question = {
      text: questionElement.textContent.trim(),
      answer: '',
      type: ''
    };
    
    // Check for different types of inputs and extract values
    
    // Text inputs and paragraphs
    const textInputs = item.querySelectorAll('input[type="text"], textarea');
    if (textInputs.length > 0) {
      question.type = textInputs[0].tagName === 'TEXTAREA' ? 'paragraph' : 'text';
      question.answer = textInputs[0].value;
    }
    
    // Radio buttons (multiple choice)
    const radioInputs = item.querySelectorAll('input[type="radio"]');
    if (radioInputs.length > 0) {
      question.type = 'multiple_choice';
      const selectedRadio = Array.from(radioInputs).find(radio => radio.checked);
      if (selectedRadio) {
        // Find the associated label
        const radioId = selectedRadio.getAttribute('id');
        const radioLabel = document.querySelector(`label[for="${radioId}"]`);
        question.answer = radioLabel ? radioLabel.textContent.trim() : '';
      }
    }
    
    // Checkboxes
    const checkboxInputs = item.querySelectorAll('input[type="checkbox"]');
    if (checkboxInputs.length > 0) {
      question.type = 'checkboxes';
      const selectedCheckboxes = Array.from(checkboxInputs).filter(checkbox => checkbox.checked);
      if (selectedCheckboxes.length > 0) {
        question.answer = selectedCheckboxes.map(checkbox => {
          const checkboxId = checkbox.getAttribute('id');
          const checkboxLabel = document.querySelector(`label[for="${checkboxId}"]`);
          return checkboxLabel ? checkboxLabel.textContent.trim() : '';
        }).join(', ');
      }
    }
    
    // Dropdown
    const selectElements = item.querySelectorAll('select');
    if (selectElements.length > 0) {
      question.type = 'dropdown';
      question.answer = selectElements[0].options[selectElements[0].selectedIndex].text;
    }
    
    // Add the question to our form data
    formData.questions.push(question);
  });
  
  console.log('Extracted form data:', formData);
  return formData;
}

// Function to extract form ID from URL (reusing from content-script.js)
function extractFormId(url) {
  // Try to match the edit response URL format for URLs like:
  // https://docs.google.com/forms/d/e/FORM_ID/viewform
  let match = url.match(/forms\/d\/e\/([\w-]+)\//);
  
  // If that doesn't match, try the format for URLs with u/0 pattern:
  // https://docs.google.com/forms/u/0/d/e/FORM_ID/viewform
  if (!match || !match[1]) {
    match = url.match(/forms\/u\/\d+\/d\/e\/([\w-]+)\//);
  }
  
  // If that doesn't match, try the standard format:
  // https://docs.google.com/forms/d/FORM_ID/edit
  if (!match || !match[1]) {
    match = url.match(/forms\/d\/([\w-]+)/);
  }
  
  if (match && match[1]) {
    return match[1];
  }
  
  return null;
}

// Function to add the save button
function addSaveButton() {
  console.log('Looking for "Clear form" span to add save button before it...');
  
  // Find the span with "Clear form" text
  const allSpans = document.querySelectorAll('span');
  let clearFormSpan = null;
  
  for (const span of allSpans) {
    if (span.textContent === 'Clear form') {
      clearFormSpan = span;
      console.log('Found "Clear form" span:', span);
      break;
    }
  }
  
  // If we found the "Clear form" span
  if (clearFormSpan) {
    console.log('Found "Clear form" span, looking for nearest button element...');
    
    // Find the closest button element
    let currentElement = clearFormSpan;
    let buttonElement = null;
    
    // Look for an element with role="button" by traversing up the DOM, identifies the "Clear form" button
    while (currentElement && !buttonElement) {
      if (currentElement.getAttribute('role') === 'button') {
        buttonElement = currentElement;
        break;
      }
  
      if (!buttonElement) {
        currentElement = currentElement.parentNode;
      }
    }
    
    // Find the parent container to insert our button
    const parentContainer = buttonElement.parentNode;
    
    if (parentContainer) {
      console.log('Found parent container for save button');
      
      // Create our save button
      const saveButton = document.createElement('div');
      saveButton.setAttribute('role', 'button');
      saveButton.textContent = 'Save';
      saveButton.style.marginRight = '1rem';
      
      if (buttonElement.classList && buttonElement.classList.length) {
        buttonElement.classList.forEach(className => {
          saveButton.classList.add(className);
        });
      }
      
      // Insert our save button before the clear form button
      parentContainer.insertBefore(saveButton, buttonElement);
      
      // Add click event
      saveButton.addEventListener('click', function(event) {
        event.preventDefault();
        event.stopPropagation();
        
        // Extract form data
        const formData = extractFormData();
        
        // Send to background script
        chrome.runtime.sendMessage({
          action: 'saveFormResponses',
          formData: formData
        }, response => {
          console.log('Response from background script:', response);
          // Show confirmation to user
          alert('Your responses have been saved!');
        });
      });
      
      console.log('Save button added successfully');
    } else {
      console.error('Could not find parent container for the "Clear form" span');
    }
  } else {
    console.error('Could not find "Clear form" span');
  }
}

// Function to check if the submit button exists on the page
function checkForSubmitButton() {
  console.log('Checking for submit button...');
  
  // Look for any span with 'Submit' text
  const allSpans = document.querySelectorAll('span');
  console.log('Total spans found:', allSpans.length);
  
  for (const span of allSpans) {
    if (span.textContent === 'Submit') {
      console.log('Submit button found! Classes:', span.className);
      return true;
    }
  }
  
  console.log('Submit button not found');
  return false;
}

// Main initialization function - check for submit button and add save button if found
function initialize() {
  console.log('Form capture script loaded');
  
  // First check if this is a form with a submit button
  if (checkForSubmitButton()) {
    console.log('Adding save button to Google Form');
    
    // Add the save button
    addSaveButton();
  } else {
    console.log('No submit button found, not adding save button');
  }
}

// Run when the content script is loaded
initialize();

// Content script to add a "Save Responses" button to Google Forms

// Extract form data (questions and responses)
function extractFormData() {
  const formData = {
    questions: [],
    formId: extractFormId(window.location.href),
    url: window.location.href,
    title: document.title.replace(' - Google Forms', '').trim(),
    description: ''
  };
  
  // Try to get data from FB_PUBLIC_LOAD_DATA_ by parsing script tags
  let fbData = null;
  try {
    const scripts = document.querySelectorAll('script');
    let fbDataScript = null;
    
    for (const script of scripts) {
      if (script.textContent.includes('var FB_PUBLIC_LOAD_DATA_')) {
        fbDataScript = script.textContent;
        break;
      }
    }
    
    if (fbDataScript) {
      const dataMatch = fbDataScript.match(/var\s+FB_PUBLIC_LOAD_DATA_\s*=\s*(\[.*?\]);/);
      if (dataMatch && dataMatch[1]) {
        fbData = JSON.parse(dataMatch[1]);
        // console.log('Found FB_PUBLIC_LOAD_DATA_ in script tag:', fbData);
        
        // Extract form description if available
        if (Array.isArray(fbData) && fbData.length > 1 && Array.isArray(fbData[1]) && fbData[1].length > 0) {
          formData.description = fbData[1][0] || '';
          // console.log('Extracted form description:', formData.description);
        }
      }
    }
  } catch (e) {
    console.error('Error extracting FB_PUBLIC_LOAD_DATA_ from script tags:', e);
  }
  
  // Map to store question IDs and their corresponding text
  const questionMap = new Map();
  
  // If we have FB_PUBLIC_LOAD_DATA, extract question information
  if (fbData && Array.isArray(fbData) && fbData.length > 1 && Array.isArray(fbData[1])) {
    // fbData[1][1] contains the array of questions
    const questions = fbData[1][1];
    if (Array.isArray(questions)) {
      questions.forEach(q => {
        if (Array.isArray(q) && q.length >= 5 && Array.isArray(q[4]) && q[4].length > 0) {
          const questionText = q[1]; // Question text
          
          if (Array.isArray(q[4][0]) && q[4][0].length > 0) {
            const entryId = q[4][0][0]; 
            // console.log(`Found question: "${questionText}" with ID: ${entryId}`);
            questionMap.set(entryId.toString(), {
              text: questionText,
              answer: ''
            });
          }
        }
      });
    }
  }
  
  // Get all hidden input fields for responses
  const hiddenInputs = document.querySelectorAll('input[type="hidden"]');
  
  // Process individual entry inputs (entry.{id}) - these only exist on the current page
  hiddenInputs.forEach(input => {
    const name = input.getAttribute('name');
    const value = input.getAttribute('value');
    
    if (name && name.startsWith('entry.')) {
      const entryId = name.replace('entry.', '');
      
      if (questionMap.has(entryId)) {
        // console.log(`Found hidden input for question ID ${entryId} with value: ${value}`);
        const question = questionMap.get(entryId);
        question.answer = value;
      }
    }
  });
  
  // Check for partialResponse - contains responses from previous pages
  const partialResponseInput = Array.from(hiddenInputs).find(input => 
    input.getAttribute('name') === 'partialResponse'
  );
  
  if (partialResponseInput) {
    try {
      const partialResponseValue = partialResponseInput.getAttribute('value');
      
      // Format: [[[null,id,["response"],0],...],null,"formId"]
      const partialResponse = JSON.parse(partialResponseValue);
      
      // console.log('Parsed partialResponse:', partialResponse);
      
      if (Array.isArray(partialResponse) && Array.isArray(partialResponse[0])) {
        partialResponse[0].forEach(responseItem => {
          if (Array.isArray(responseItem) && responseItem.length >= 3) {
            const questionId = responseItem[1];
            const responseValues = responseItem[2];
            
            if (questionMap.has(questionId.toString())) {
              const question = questionMap.get(questionId.toString());
              if (Array.isArray(responseValues)) {
                question.answer = responseValues.join(', ');
              } else {
                question.answer = responseValues;
              }
            } else {
              console.log(`No matching question found for ID ${questionId}`);
            }
          }
        });
      }
    } catch (e) {
      console.error('Error parsing partialResponse:', e);
      console.error('Error details:', e.message);
    }
  }
  
  // Convert the question map to an array for our formData
  formData.questions = Array.from(questionMap.values());
  return formData;
}



// Extract form ID from URL 
function extractFormId(url) {
  // https://docs.google.com/forms/d/e/FORM_ID/viewform
  let match = url.match(/forms\/d\/e\/([\w-]+)\//);

  // https://docs.google.com/forms/u/0/d/e/FORM_ID/viewform
  if (!match || !match[1]) {
    match = url.match(/forms\/u\/\d+\/d\/e\/([\w-]+)\//);
  }

  // https://docs.google.com/forms/d/FORM_ID/edit
  if (!match || !match[1]) {
    match = url.match(/forms\/d\/([\w-]+)/);
  }

  if (match && match[1]) {
    return match[1];
  }
  return null;
}

function addSaveButton() {
  // Find the span with "Clear form" text
  const allSpans = document.querySelectorAll('span');
  let clearFormSpan = null;
  
  for (const span of allSpans) {
    if (span.textContent === 'Clear form') {
      clearFormSpan = span;
      break;
    }
  }
  
  // If we found the "Clear form" span
  if (clearFormSpan) {
    let currentElement = clearFormSpan;
    let buttonElement = null;
    
    // Look for corresponding div with button role
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
      const saveButton = document.createElement('div');
      saveButton.setAttribute('role', 'button');
      saveButton.textContent = 'Save';
      saveButton.style.marginRight = '1rem';
      
      if (buttonElement.classList && buttonElement.classList.length) {
        buttonElement.classList.forEach(className => {
          saveButton.classList.add(className);
        });
      }

      parentContainer.insertBefore(saveButton, buttonElement);
      saveButton.addEventListener('click', function(event) {
        event.preventDefault();
        event.stopPropagation();
        
        const formData = extractFormData();
        chrome.runtime.sendMessage({
          action: 'saveFormResponses',
          formData: formData
        }, response => {
          // console.log('Response from background script:', response);
          alert('Your responses have been saved! You can now safely submit.' );
        });
      });
    } else {
      console.error('Could not find parent container for the "Clear form" span');
    }
  } else {
    console.error('Could not find "Clear form" span');
  }
}

function checkForSubmitButton() {
  const allSpans = document.querySelectorAll('span');
  for (const span of allSpans) {
    if (span.textContent === 'Submit') {
      return true;
    }
  }
  return false;
}

function initialize() {
  if (checkForSubmitButton()) {
    addSaveButton();
  }
}

initialize();

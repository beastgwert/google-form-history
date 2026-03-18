// Content script to capture form data when user clicks Submit on Google Forms

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
  
  // Process partialResponse first - contains responses from previous pages
  // (and possibly stale values for current page questions when editing a submitted form)
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
  
  // Process individual entry inputs (entry.{id}) - these only exist on the current page
  const entryValues = new Map();
  
  hiddenInputs.forEach(input => {
    const name = input.getAttribute('name');
    const value = input.getAttribute('value');
    
    if (name && name.startsWith('entry.')) {
      const entryId = name.replace('entry.', '');
      
      if (questionMap.has(entryId)) {
        // If this entry ID already has values, add to the array, otherwise create a new array
        if (entryValues.has(entryId)) {
          entryValues.get(entryId).push(value);
        } else {
          entryValues.set(entryId, [value]);
        }
      }
    }
  });
  
  // Now set the answers in the questionMap using the collected values
  entryValues.forEach((values, entryId) => {
    if (questionMap.has(entryId)) {
      const question = questionMap.get(entryId);
      // Join multiple values with commas (for checkbox questions)
      question.answer = values.join(', ');
    }
  });
  
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

function interceptSubmitButton() {
  const allSpans = document.querySelectorAll('span');
  let submitSpan = null;

  for (const span of allSpans) {
    if (span.textContent === 'Submit') {
      submitSpan = span;
      break;
    }
  }

  if (!submitSpan) return;

  // Walk up from the span to find the element with role="button"
  let currentElement = submitSpan;
  let buttonElement = null;

  while (currentElement && !buttonElement) {
    if (currentElement.getAttribute && currentElement.getAttribute('role') === 'button') {
      buttonElement = currentElement;
      break;
    }
    currentElement = currentElement.parentNode;
  }

  if (!buttonElement) return;

  // Use capture phase so our handler runs before Google's submission handler
  buttonElement.addEventListener('click', function() {
    const formData = extractFormData();
    chrome.runtime.sendMessage({
      action: 'uploadSubmission',
      formId: formData.formId,
      formTitle: formData.title,
      description: formData.description,
      questions: formData.questions,
      editUrl: ''
    });
  }, true);
}

function initialize() {
  interceptSubmitButton();
}

initialize();

// Ran on submission page to update submission data (edit link, saved responses) 

// Function to extract form ID from a Google Forms URL
function extractFormId(url) {
  // Try to match the edit response URL format for URLs like:
  // https://docs.google.com/forms/d/e/FORM_ID/viewform
  let match = url.match(/forms\/d\/e\/(([\w-]+))\//);
  
  // If that doesn't match, try the format for URLs with u/0 pattern:
  // https://docs.google.com/forms/u/0/d/e/FORM_ID/viewform
  if (!match || !match[1]) {
    match = url.match(/forms\/u\/\d+\/d\/e\/(([\w-]+))\//);
  }
  
  // If that doesn't match, try the standard format:
  // https://docs.google.com/forms/d/FORM_ID/edit
  if (!match || !match[1]) {
    match = url.match(/forms\/d\/(([\w-]+))/);
  }
  
  if (match && match[1]) {
    return match[1];
  }
  
  return null;
}

// Get form title from the document title
function getFormTitle() {
  let formTitle = document.title;
  // Remove the "- Google Forms" suffix if present
  formTitle = formTitle.replace(/ - Google Forms$/, '');
  // If it's a submission page, it might have a different format
  formTitle = formTitle.replace(/Form submitted$/, '').trim();
  return formTitle;
}

// Main function to detect form submission and gather all relevant data
function detectFormSubmission() {
  console.log('Checking for form submission data...');
  
  // Variables to store our findings
  let editUrl = '';
  let formId = null;
  let formTitle = getFormTitle();
  let savedResponse = null;
  
  // Step 1: Try to find the "Edit your response" link
  const allLinks = document.querySelectorAll('a');
  for (const link of allLinks) {
    if (link.textContent.includes('Edit your response')) {
      console.log('Found "Edit your response" link via text search:', link.href);
      editUrl = link.href;
      formId = extractFormId(editUrl);
      break;
    }
  }
  
  // If we couldn't find an edit link, try to extract formId from current URL
  if (!formId) {
    const currentUrl = window.location.href;
    formId = extractFormId(currentUrl);
    console.log('Extracted form ID from current URL:', formId);
  }
  
  if (!formId) {
    console.error('Could not extract form ID from any URL');
    return;
  }
  
  // Step 2: Check for saved form responses
  chrome.storage.local.get('savedFormResponses', result => {
    const savedResponses = result.savedFormResponses || [];
    console.log('Found saved responses:', savedResponses.length);
    
    // Find matching form response by formId
    savedResponse = savedResponses.find(response => response.formId === formId);
    
    if (savedResponse) {
      console.log('Found matching saved response:', savedResponse);
    } else {
      console.log('No matching saved form response found for formId:', formId);
    }
    
    // Step 3: Send all available data to background script in a single message
    sendFormData({
      editUrl, 
      formId, 
      formTitle, 
      savedResponse
    }, savedResponses);
  });
}

// Send form data to background script
function sendFormData(data, allSavedResponses) {
  const { editUrl, formId, formTitle, savedResponse } = data;
  
  // Prepare message payload
  const messagePayload = {
    action: 'uploadSubmission',
    formId: formId,
    formTitle: formTitle
  };
  
  // Add editUrl if available
  if (editUrl) {
    messagePayload.editUrl = editUrl;
  } else {
    messagePayload.editUrl = ''; // Blank edit URL if not found
  }
  
  // Add questions and description from saved response if available
  if (savedResponse) {
    messagePayload.questions = savedResponse.questions || [];
    // Include description if available
    if (savedResponse.description) {
      messagePayload.description = savedResponse.description;
    }
    // Use saved title as fallback if current title is empty
    if (!formTitle && savedResponse.title) {
      messagePayload.formTitle = savedResponse.title;
    }
  }
  
  if (!editUrl && !savedResponse) {
    console.log('No edit URL or saved response found for formId:', formId);
    return;
  }
  
  console.log('Sending combined form data to background script:', messagePayload);
  
  // Send message to background script
  chrome.runtime.sendMessage(messagePayload, response => {
    console.log('Response from background script:', response);
    
    // If successful and we had a saved response, remove it from storage
    if (response && response.success && savedResponse) {
      const updatedResponses = allSavedResponses.filter(resp => resp.formId !== formId);
      chrome.storage.local.set({ 'savedFormResponses': updatedResponses }, () => {
        console.log('Successfully removed saved form response after migration');
      });
    }
  });
}

// Execute immediately when script is injected
console.log('Content script loaded and executing immediately');

// Run immediately with a small delay to ensure DOM is accessible
setTimeout(detectFormSubmission, 100);

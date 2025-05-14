// Content script to detect "Edit your response" link on Google Form submission pages

// Function to extract form ID from a Google Forms URL
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

// Main function to detect the "Edit your response" link
function detectEditResponseLink() {
  console.log('Checking for "Edit your response" link...');
  
  const allLinks = document.querySelectorAll('a');
  for (const link of allLinks) {
    if (link.textContent.includes('Edit your response')) {
      console.log('Found "Edit your response" link via text search:', link.href);
      processEditLink(link.href);
      return;
    }
  }
  
  console.log('Could not find "Edit your response" link using any method');
  
  // If no edit link is found, check if we have a saved form response for this form
  checkSavedFormResponses();
}

// Process the edit link once found
function processEditLink(href) {
  console.log('Processing edit link:', href);
  
  // Send this information to the background script
  const editUrl = href;
  const formId = extractFormId(editUrl);
  
  // Get the form title from the document title
  // Usually Google Forms have titles in the format "Form Name - Google Forms"
  let formTitle = document.title;
  // Remove the "- Google Forms" suffix if present
  formTitle = formTitle.replace(/ - Google Forms$/, '');
  // If it's a submission page, it might have a different format
  formTitle = formTitle.replace(/Form submitted$/, '').trim();
  
  console.log('Form title:', formTitle);
  
  if (formId) {
    // Get the API endpoint from the manifest
    chrome.runtime.sendMessage({
      action: 'uploadSubmission',
      editUrl: editUrl,
      formId: formId,
      formTitle: formTitle
    }, response => {
      console.log('Response from background script:', response);
    });
  } else {
    console.error('Could not extract form ID from edit URL:', editUrl);
  }
}

// Function to check for saved form responses and migrate them to submissions
async function checkSavedFormResponses() {
  console.log('Checking for saved form responses...');
  
  // Extract form ID from current URL
  const currentUrl = window.location.href;
  const formId = extractFormId(currentUrl);
  
  if (!formId) {
    console.error('Could not extract form ID from current URL:', currentUrl);
    return;
  }
  
  console.log('Extracted form ID:', formId);
  
  // Get form title from the document title
  let formTitle = document.title;
  formTitle = formTitle.replace(/ - Google Forms$/, '');
  formTitle = formTitle.replace(/Form submitted$/, '').trim();
  
  // Get saved form responses from local storage
  chrome.storage.local.get('savedFormResponses', result => {
    const savedResponses = result.savedFormResponses || [];
    console.log('Found saved responses:', savedResponses.length);
    
    // Find matching form response by formId
    const matchingResponse = savedResponses.find(response => response.formId === formId);
    
    if (matchingResponse) {
      console.log('Found matching saved response:', matchingResponse);
      
      // Use the questions directly from the saved response
      const questions = matchingResponse.questions || [];
      
      // Upload as a submission with blank editUrl and include questions
      chrome.runtime.sendMessage({
        action: 'uploadSubmission',
        editUrl: '', // Blank edit URL since we don't have one
        formId: formId,
        formTitle: formTitle || matchingResponse.title,
        questions: questions
      }, response => {
        console.log('Response from background script for submission:', response);
        
        if (response && response.success) {
          // Delete the entry from savedFormResponses
          const updatedResponses = savedResponses.filter(resp => resp.formId !== formId);
          chrome.storage.local.set({ 'savedFormResponses': updatedResponses }, () => {
            console.log('Successfully removed saved form response after migration');
          });
        }
      });
    } else {
      console.log('No matching saved form response found for formId:', formId);
    }
  });
}



// Execute immediately when script is injected
console.log('Content script loaded and executing immediately');

// Run immediately with a small delay to ensure DOM is accessible
setTimeout(detectEditResponseLink, 100);


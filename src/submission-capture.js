// Ran on submission page to update submission data (edit link, saved responses) 

// Extract form ID from a Google Forms URL
function extractFormId(url) {
  // https://docs.google.com/forms/d/e/FORM_ID/viewform
  let match = url.match(/forms\/d\/e\/(([\w-]+))\//);
  
  // https://docs.google.com/forms/u/0/d/e/FORM_ID/viewform
  if (!match || !match[1]) {
    match = url.match(/forms\/u\/\d+\/d\/e\/(([\w-]+))\//);
  }

  // https://docs.google.com/forms/d/FORM_ID/edit
  if (!match || !match[1]) {
    match = url.match(/forms\/d\/(([\w-]+))/);
  }
  
  if (match && match[1]) {
    return match[1];
  }
  return null;
}

// Send edit url (if it exists) and saved data (if it exists) to background script
function detectFormSubmission() {
  let editUrl = '';
  let formId = null;
  let formTitle = document.title;
  let savedResponse = null;
  
  // Step 1: Try to find the "Edit your response" link
  const allLinks = document.querySelectorAll('a');
  for (const link of allLinks) {
    if (link.textContent.includes('Edit your response')) {
      editUrl = link.href;
      formId = extractFormId(editUrl);
      break;
    }
  }
  
  // If we couldn't find an edit link, try to extract formId from current URL
  if (!formId) {
    const currentUrl = window.location.href;
    formId = extractFormId(currentUrl);
  }
  
  if (!formId) {
    console.error('Could not extract form ID from any URL');
    return;
  }
  
  // Step 2: Check for saved form responses
  chrome.storage.local.get('savedFormResponses', result => {
    const savedResponses = result.savedFormResponses || [];
    // console.log('Found saved responses:', savedResponses.length);
    
    savedResponse = savedResponses.find(response => response.formId === formId);
    
    // Step 3: Send all available data to background script 
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
  
  const messagePayload = {
    action: 'uploadSubmission',
    formId: formId,
    formTitle: formTitle
  };
  
  if (editUrl) {
    messagePayload.editUrl = editUrl;
  } else {
    messagePayload.editUrl = ''; // Blank edit URL if not found
  }
  
  if (savedResponse) {
    messagePayload.questions = savedResponse.questions || [];
    if (savedResponse.description) {
      messagePayload.description = savedResponse.description;
    }
    // Use saved title as fallback if current title is empty
    if (!formTitle && savedResponse.title) {
      messagePayload.formTitle = savedResponse.title;
    }
  }
  
  if (!editUrl && !savedResponse) {
    return;
  }
  
  // console.log('Sending combined form data to background script:', messagePayload);

  // Send message to background script
  chrome.runtime.sendMessage(messagePayload, response => {
    // If successful and we had a saved response, remove it from savedFormResponses
    if (response && response.success && savedResponse) {
      const updatedResponses = allSavedResponses.filter(resp => resp.formId !== formId);
      chrome.storage.local.set({ 'savedFormResponses': updatedResponses }, () => {
        console.log('Successfully removed saved form response after migration');
      });
    }
  });
}

setTimeout(detectFormSubmission, 100);

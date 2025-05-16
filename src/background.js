// Background script to capture Google Forms URLs and detect form submissions

// Function to extract form ID from a Google Forms URL
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

// Add URL to local storage (formUrls)
async function addUrl(url, title) {
  try {
    console.log("Adding URL to local storage: " + url);
    console.log("Form title: " + title);
    
    const formId = extractFormId(url);
    const storage = await chrome.storage.local.get('formUrls');
    const formUrls = storage.formUrls || [];
    
    const existingIndex = formUrls.findIndex(item => item.formId === formId);
    if (existingIndex >= 0) {
      // Update existing entry
      formUrls[existingIndex].url = url; 
      formUrls[existingIndex].title = title || 'Unknown Form';
      formUrls[existingIndex].timestamp = new Date().toISOString();
    } else {
      // Add new entry
      formUrls.push({
        formId: formId,
        url: url,
        title: title || 'Unknown Form',
        timestamp: new Date().toISOString()
      });
    }
    
    await chrome.storage.local.set({ 'formUrls': formUrls });
    updateBadge(formUrls.length);
    return true;
  } catch (error) {
    console.error("Error adding URL:", error);
    return false;
  }
}

// Delete URL from local storage (formUrls)
async function deleteUrl(url) {
  try {
    const formId = extractFormId(url);
    
    const storage = await chrome.storage.local.get('formUrls');
    let formUrls = storage.formUrls || [];
    
    formUrls = formUrls.filter(item => item.formId !== formId);

    await chrome.storage.local.set({ 'formUrls': formUrls });
    updateBadge(formUrls.length);
    return true;
  } catch (error) {
    console.error("Error deleting URL:", error);
    return false;
  }
}

// Update badge based on number of Editing entries
async function updateLocalStorage() {
  try {
    console.log('Updating badge based on current local storage');
    
    const storage = await chrome.storage.local.get('formUrls');
    const formUrls = storage.formUrls || [];

    updateBadge(formUrls.length);
    return true;
  } catch (error) {
    console.error('Error updating badge from local storage:', error);
    return false;
  }
}

function updateBadge(count) {
  if (count > 0) {
    chrome.action.setBadgeText({ text: count.toString() });
    chrome.action.setBadgeBackgroundColor({ color: '#444444' });
    chrome.action.setBadgeTextColor({ color: '#FFFFFF' });
  } else {
    chrome.action.setBadgeText({ text: '' });
  }
}

// Initialize local storage when extension is loaded
chrome.runtime.onInstalled.addListener(async () => {
  const storage = await chrome.storage.local.get(['formUrls', 'formSubmissions', 'savedFormResponses']);
  if (!storage.formUrls) {
    await chrome.storage.local.set({ 'formUrls': [] });
  }
  if (!storage.formSubmissions) {
    await chrome.storage.local.set({ 'formSubmissions': [] });
  }
  if (!storage.savedFormResponses) {
    await chrome.storage.local.set({ 'savedFormResponses': [] });
  }
  updateLocalStorage();
});

// Add submission to local storage
async function addSubmission(editUrl, formId, formTitle, questions = null, description = '') {
  try {
    console.log('Adding submission to local storage:', formId);
    
    const storage = await chrome.storage.local.get('formSubmissions');
    const formSubmissions = storage.formSubmissions || [];
    
    // Check if submission already exists
    const existingIndex = formSubmissions.findIndex(item => item.formId === formId);
    
    const submission = {
      editUrl: editUrl || '', 
      formId: formId,
      formTitle: formTitle || 'Unknown Form',
      description: description || '',
      timestamp: new Date().toISOString()
    };
    
    // Add questions data if provided
    submission.questions = questions;
    
    if (existingIndex >= 0) {
      formSubmissions[existingIndex] = {
        ...formSubmissions[existingIndex],
        ...submission
      };
    } else {
      formSubmissions.push(submission);
    }
    
    await chrome.storage.local.set({ 'formSubmissions': formSubmissions });
    // console.log('Successfully added submission to local storage. Total:', formSubmissions.length);
    return true;
  } catch (error) {
    console.error('Error adding submission to local storage:', error);
    return false;
  }
}

async function saveFormResponses(formData) {
  try {
    const storage = await chrome.storage.local.get('savedFormResponses');
    const savedResponses = storage.savedFormResponses || [];
    
    // Add timestamp to the form data
    const responseWithTimestamp = {
      ...formData,
      timestamp: new Date().toISOString(),
      status: 'saved' 
    };
    
    const existingIndex = savedResponses.findIndex(response => response.formId === formData.formId);
    if (existingIndex !== -1) {
      savedResponses[existingIndex] = responseWithTimestamp;
    } else {
      savedResponses.push(responseWithTimestamp);
    }
    
    await chrome.storage.local.set({ 'savedFormResponses': savedResponses });
    return true;
  } catch (error) {
    console.error('Error saving form responses:', error);
    return false;
  }
}

// Listen for messages from content script and popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'updateBadge') {
    updateBadge(message.count);
    sendResponse({ success: true });
    return;
  }
  if (message.action === 'uploadSubmission') {
    // console.log('Received uploadSubmission request:', message);
    addSubmission(message.editUrl, message.formId, message.formTitle, message.questions, message.description)
      .then(result => sendResponse({ success: result }))
      .catch(error => sendResponse({ success: false, error: error.message }));
    return true;
  }
  if (message.action === 'saveFormResponses') {
    // console.log('Received saveFormResponses request:', message);
    const formData = {
      ...message.formData,
      description: message.formData.description || ''
    };
    saveFormResponses(formData)
      .then(result => sendResponse({ success: result }))
      .catch(error => sendResponse({ success: false, error: error.message }));
    return true;
  }
});

// Listen for tab updates
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && tab.url) {
    if (tab.url.includes('docs.google.com/forms/')) {
      // Case 1: Form view - save the form URL
      if (tab.url.includes('viewform') && !tab.url.includes('edit')) {
        console.log("Google Form detected: " + tab.url);
        
        const formTitle = tab.title ? tab.title.replace(' - Google Forms', '') : 'Unknown Form';
        
        addUrl(tab.url, formTitle);
      }
      
      // Case 2: Form submission - delete the form URL and run submission-capture.js
      else if (tab.url.includes('formResponse') && tab.url.includes('/u/0')) {
        console.log("Google Form submission detected: " + tab.url);
        
        deleteUrl(tab.url);
        
        chrome.scripting.executeScript({
          target: { tabId: tabId },
          files: ['submission-capture.js']
        });
      }
    }
  }
});

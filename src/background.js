// Background script to capture Google Forms URLs and detect form submissions

// Function to extract form ID from a Google Form URL
function extractFormId(url) {
  try {
    // Extract form ID from various Google Forms URL formats
    const urlObj = new URL(url);
    const pathname = urlObj.pathname;
    
    // Format: /forms/u/0/d/e/[FORM_ID]/formResponse (submitted form)
    if (pathname.includes('/forms/u/0/d/e/')) {
      const match = pathname.match(/\/forms\/u\/\d+\/d\/e\/([^/]+)/);
      if (match && match[1]) return match[1];
    }
    
    // Format: /forms/d/e/[FORM_ID]/viewform
    if (pathname.includes('/forms/d/e/')) {
      const match = pathname.match(/\/forms\/d\/e\/([^/]+)/);
      if (match && match[1]) return match[1];
    }
    
    // Format: /forms/d/[FORM_ID]/viewform
    if (pathname.includes('/forms/d/')) {
      const match = pathname.match(/\/forms\/d\/([^/]+)/);
      if (match && match[1]) return match[1];
    }
    
    // If no match found, use the whole pathname as a fallback
    return pathname.replace(/\//g, '_');
  } catch (error) {
    console.error('Error extracting form ID:', error);
    // Generate a unique ID based on the URL string if extraction fails
    return url.replace(/[^a-zA-Z0-9]/g, '_');
  }
}

// Function to add URL to local storage
async function addUrl(url, title) {
  try {
    console.log("Adding URL to local storage: " + url);
    console.log("Form title: " + title);
    
    // Extract form ID from URL
    const formId = extractFormId(url);
    console.log("Extracted form ID: " + formId);
    
    // Get existing form URLs from local storage
    const storage = await chrome.storage.local.get('formUrls');
    const formUrls = storage.formUrls || [];
    
    // Check if form ID already exists
    const existingIndex = formUrls.findIndex(item => item.formId === formId);
    
    if (existingIndex >= 0) {
      // Update existing entry
      formUrls[existingIndex].url = url; // Update URL in case it changed
      formUrls[existingIndex].title = title || 'Unknown Form';
      formUrls[existingIndex].timestamp = new Date().toISOString(); // Update timestamp on changes
    } else {
      // Add new entry
      formUrls.push({
        formId: formId,
        url: url,
        title: title || 'Unknown Form',
        timestamp: new Date().toISOString()
      });
    }
    
    // Save back to local storage
    await chrome.storage.local.set({ 'formUrls': formUrls });
    
    // Update badge
    updateBadge(formUrls.length);
    
    return true;
  } catch (error) {
    console.error("Error adding URL:", error);
    return false;
  }
}

// This function has been removed as we're no longer sending URLs to API Gateway

// Function to delete URL from local storage
async function deleteUrl(url) {
  try {
    console.log("Deleting URL from local storage: " + url);
    
    // Extract form ID from URL if it's a URL, otherwise assume it's already a formId
    let formId;
    if (url.startsWith('http')) {
      formId = extractFormId(url);
      console.log("Extracted form ID for deletion: " + formId);
    } else {
      formId = url;
      console.log("Using provided form ID for deletion: " + formId);
    }
    
    // Get existing form URLs from local storage
    const storage = await chrome.storage.local.get('formUrls');
    let formUrls = storage.formUrls || [];
    
    // Filter out the form with matching ID
    formUrls = formUrls.filter(item => item.formId !== formId);
    
    // Save back to local storage
    await chrome.storage.local.set({ 'formUrls': formUrls });
    
    // Update badge
    updateBadge(formUrls.length);
    
    return true;
  } catch (error) {
    console.error("Error deleting URL:", error);
    return false;
  }
}

// This function has been removed as we're no longer sending delete requests to API Gateway

// Function to update badge based on current local storage
async function updateLocalStorage() {
  try {
    console.log('Updating badge based on current local storage');
    
    // Get existing form URLs from local storage
    const storage = await chrome.storage.local.get('formUrls');
    const formUrls = storage.formUrls || [];
    
    // Update the badge with the number of editing forms
    updateBadge(formUrls.length);
    
    return true;
  } catch (error) {
    console.error('Error updating badge from local storage:', error);
    return false;
  }
}

// Function to update the badge with the number of editing forms
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
  // Initialize empty arrays if they don't exist
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
  
  // Update badge
  updateLocalStorage();
});

// Function to add submission to local storage
async function addSubmission(editUrl, formId, formTitle, questions = null) {
  try {
    console.log('Adding submission to local storage:', formId);
    
    // Get existing form submissions from local storage
    const storage = await chrome.storage.local.get('formSubmissions');
    const formSubmissions = storage.formSubmissions || [];
    
    // Check if submission already exists
    const existingIndex = formSubmissions.findIndex(item => item.formId === formId);
    
    const submission = {
      editUrl: editUrl || '', // Support blank editUrl for submissions without edit links
      formId: formId,
      formTitle: formTitle || 'Unknown Form',
      timestamp: new Date().toISOString()
    };
    
    // Add questions data if provided
    if (questions) {
      submission.questions = questions;
    }
    
    if (existingIndex >= 0) {
      // Update existing entry
      formSubmissions[existingIndex] = {
        ...formSubmissions[existingIndex],
        ...submission
      };
    } else {
      // Add new entry
      formSubmissions.push(submission);
    }
    
    // Save back to local storage
    await chrome.storage.local.set({ 'formSubmissions': formSubmissions });
    console.log('Successfully added submission to local storage. Total:', formSubmissions.length);
    
    return true;
  } catch (error) {
    console.error('Error adding submission to local storage:', error);
    return false;
  }
}

// Function to get submissions from local storage
async function updateSubmissionsInLocalStorage() {
  try {
    console.log('Getting submissions from local storage');
    
    // This function is now just a placeholder for compatibility
    // All submission operations are handled directly in addSubmission
    
    return true;
  } catch (error) {
    console.error('Error in updateSubmissionsInLocalStorage:', error);
    return false;
  }
}

// Function to save form responses
async function saveFormResponses(formData) {
  try {
    console.log('Saving form responses:', formData);
    
    // First, get existing saved responses
    const storage = await chrome.storage.local.get('savedFormResponses');
    const savedResponses = storage.savedFormResponses || [];
    
    // Add timestamp to the form data
    const responseWithTimestamp = {
      ...formData,
      timestamp: new Date().toISOString(),
      status: 'saved' // to distinguish from submitted forms
    };
    
    // Add to the array of saved responses
    savedResponses.push(responseWithTimestamp);
    
    // Save back to storage
    await chrome.storage.local.set({ 'savedFormResponses': savedResponses });
    console.log('Successfully saved form responses. Total saved:', savedResponses.length);
    
    return true;
  } catch (error) {
    console.error('Error saving form responses:', error);
    return false;
  }
}

// Listen for messages from content script and popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  // Handle badge update requests from the popup
  if (message.action === 'updateBadge') {
    updateBadge(message.count);
    sendResponse({ success: true });
    return;
  }
  if (message.action === 'uploadSubmission') {
    console.log('Received uploadSubmission request:', message);
    addSubmission(message.editUrl, message.formId, message.formTitle, message.questions)
      .then(result => sendResponse({ success: result }))
      .catch(error => sendResponse({ success: false, error: error.message }));
    return true; // Indicates we will send a response asynchronously
  }
  if (message.action === 'saveFormResponses') {
    console.log('Received saveFormResponses request:', message);
    saveFormResponses(message.formData)
      .then(result => sendResponse({ success: result }))
      .catch(error => sendResponse({ success: false, error: error.message }));
    return true; // Indicates we will send a response asynchronously
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
      
      // Case 2: Form submission - delete the form URL and inject content script
      else if (tab.url.includes('formResponse') && tab.url.includes('/u/0')) {
        console.log("Google Form submission detected: " + tab.url);
        
        deleteUrl(tab.url);
        
        chrome.scripting.executeScript({
          target: { tabId: tabId },
          files: ['content-script.js']
        }).then(() => {
          console.log('Content script injected successfully');
        }).catch(error => {
          console.error('Error injecting content script:', error);
        });
      }
    }
  }
});

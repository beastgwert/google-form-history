// Background script to capture Google Forms URLs and detect form submissions

// Get API endpoints from the manifest
const manifest = chrome.runtime.getManifest();
const API_ENDPOINT_UPLOAD_URL = manifest.api_endpoints.upload_url;
const API_ENDPOINT_DELETE_URL = manifest.api_endpoints.delete_url;
const API_ENDPOINT_RETRIEVE_URLS = manifest.api_endpoints.retrieve_urls;
const API_ENDPOINT_UPLOAD_SUBMISSION = manifest.api_endpoints.upload_submission;
const API_ENDPOINT_RETRIEVE_SUBMISSIONS = manifest.api_endpoints.retrieve_submissions;

// Function to add URL by sending directly to API Gateway and updating local storage
async function addUrl(url, title) {
  try {
    console.log("Sending URL to API Gateway: " + url);
    console.log("Form title: " + title);
    // Send directly to API Gateway
    await sendUrlToApiGateway(url, title);
    
    // After successful API call, update local storage
    await updateLocalStorage();
    return true;
  } catch (error) {
    console.error("Error adding URL:", error);
    return false;
  }
}

// Function to send URL to API Gateway
async function sendUrlToApiGateway(url, title) {
  try {
    console.log('Sending URL to API Gateway:', url);
    
    // Create an object with the URL, title and user ID
    const payload = { 
      url: url,
      title: title || 'Unknown Form',
      userId: chrome.runtime.id
    };
    
    // Convert to JSON string
    const jsonPayload = JSON.stringify(payload);
    console.log('Sending payload:', jsonPayload);
    
    const response = await fetch(API_ENDPOINT_UPLOAD_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: jsonPayload
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }
    
    const data = await response.json();
    console.log('Successfully sent URL to API Gateway:', data);
    return true;
  } catch (error) {
    console.error('Error sending URL to API Gateway:', error);
    return false;
  }
}

// Function to delete URL by sending request to API Gateway and updating local storage
async function deleteUrl(url) {
  try {
    console.log("Sending delete request for URL: " + url);
    // Send directly to API Gateway
    await sendDeleteRequestToApiGateway(url);
    
    // After successful API call, update local storage
    // This will also update the badge
    await updateLocalStorage();
    return true;
  } catch (error) {
    console.error("Error deleting URL:", error);
    return false;
  }
}

// Function to send delete request to API Gateway
async function sendDeleteRequestToApiGateway(url) {
  try {
    console.log('Sending delete request to API Gateway for URL:', url);
    
    // Create an object with the URL and user ID
    const payload = { 
      url: url,
      userId: chrome.runtime.id
    };
    
    // Convert to JSON string
    const jsonPayload = JSON.stringify(payload);
    console.log('Sending delete payload:', jsonPayload);
    
    const response = await fetch(API_ENDPOINT_DELETE_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: jsonPayload
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }
    
    const data = await response.json();
    console.log('Successfully sent delete request to API Gateway:', data);
    return true;
  } catch (error) {
    console.error('Error sending delete request to API Gateway:', error);
    return false;
  }
}

// Function to fetch URLs from API Gateway and update local storage
async function updateLocalStorage() {
  try {
    console.log('Updating local storage with latest URLs from API Gateway');
    
    // Fetch URLs from API Gateway
    const response = await fetch(`${API_ENDPOINT_RETRIEVE_URLS}?userId=${chrome.runtime.id}`);
    
    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }
    
    const data = await response.json();
    const urls = data.urls || [];
    
    // Store URLs in chrome.storage.local
    await chrome.storage.local.set({ 'formUrls': urls });
    console.log('Successfully updated local storage with', urls.length, 'URLs');
    
    // Update the badge with the number of editing forms
    updateBadge(urls.length);
    
    return true;
  } catch (error) {
    console.error('Error updating local storage:', error);
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
chrome.runtime.onInstalled.addListener(() => {
  updateLocalStorage();
  updateSubmissionsInLocalStorage();
});

// Function to send submission URL to API Gateway
async function sendSubmissionToApiGateway(editUrl, formId, formTitle) {
  try {
    console.log('Sending submission URL to API Gateway:', editUrl);
    
    // Create an object with the edit URL, form ID, form title, and user ID
    const payload = { 
      editUrl: editUrl,
      formId: formId,
      formTitle: formTitle || 'Unknown Form',
      userId: chrome.runtime.id
    };
    
    // Convert to JSON string
    const jsonPayload = JSON.stringify(payload);
    console.log('Sending submission payload:', jsonPayload);
    
    const response = await fetch(API_ENDPOINT_UPLOAD_SUBMISSION, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: jsonPayload
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }
    
    const data = await response.json();
    console.log('Successfully sent submission URL to API Gateway:', data);
    
    // After successful submission, update submissions in local storage
    await updateSubmissionsInLocalStorage();
    
    return true;
  } catch (error) {
    console.error('Error sending submission URL to API Gateway:', error);
    return false;
  }
}

// Function to fetch submissions from API Gateway and update local storage
async function updateSubmissionsInLocalStorage() {
  try {
    console.log('Updating local storage with latest submissions from API Gateway');
    
    // Fetch submissions from API Gateway
    const response = await fetch(`${API_ENDPOINT_RETRIEVE_SUBMISSIONS}?userId=${chrome.runtime.id}`);
    
    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }
    
    const data = await response.json();
    const submissions = data.submissions || [];
    
    // Store submissions in chrome.storage.local
    await chrome.storage.local.set({ 'formSubmissions': submissions });
    console.log('Successfully updated local storage with', submissions.length, 'submissions');
    
    return true;
  } catch (error) {
    console.error('Error updating submissions in local storage:', error);
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
    sendSubmissionToApiGateway(message.editUrl, message.formId, message.formTitle)
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

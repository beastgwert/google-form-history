// Background script to capture Google Forms URLs
import CONFIG from './config.js';

// Constants
const STORAGE_KEY = 'google_forms_urls';
const API_ENDPOINT = CONFIG.API_ENDPOINT;

// Function to add URL to storage and send to API Gateway
async function addUrl(url) {
  return new Promise((resolve) => {
    chrome.storage.local.get([STORAGE_KEY], (result) => {
      const urls = result[STORAGE_KEY] || [];
      
      // Only add the URL if it's not already in the list
      if (!urls.includes(url)) {
        console.log("Adding URL to storage: " + url);
        urls.push(url);
        
        // Save to storage
        chrome.storage.local.set({ [STORAGE_KEY]: urls }, () => {
          // Send to API Gateway
          sendUrlToApiGateway(url);
          resolve(true);
        });
      } else {
        resolve(false);
      }
    });
  });
}

// Function to send URL to API Gateway
async function sendUrlToApiGateway(url) {
  try {
    console.log('Sending URL to API Gateway:', url);
    
    // Create a simple object with the URL
    const payload = { url: url };
    
    // Convert to JSON string
    const jsonPayload = JSON.stringify(payload);
    console.log('Sending payload:', jsonPayload);
    
    const response = await fetch(API_ENDPOINT, {
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

// Listen for tab updates
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  // Check if the URL is a Google Forms URL and the page has finished loading
  if (changeInfo.status === 'complete' && 
      tab.url && 
      tab.url.includes('docs.google.com/forms/')) {
    console.log("Google Form detected: " + tab.url);
    
    // Add URL to storage and send to API Gateway
    addUrl(tab.url);
  }
});

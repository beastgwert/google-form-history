// Background script to capture Google Forms URLs

// Get API endpoints from the manifest
const manifest = chrome.runtime.getManifest();
const API_ENDPOINT_UPLOAD_URL = manifest.api_endpoints.upload_url;

// Function to add URL by sending directly to API Gateway
async function addUrl(url, title) {
  try {
    console.log("Sending URL to API Gateway: " + url);
    console.log("Form title: " + title);
    // Send directly to API Gateway
    await sendUrlToApiGateway(url, title);
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

// Listen for tab updates
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  // Check if the URL is a Google Forms URL and the page has finished loading
  if (changeInfo.status === 'complete' && 
      tab.url && 
      tab.url.includes('docs.google.com/forms/') && 
      tab.url.includes('viewform')) {
    console.log("Google Form detected: " + tab.url);
    
    // Extract the form title from the tab title
    const formTitle = tab.title ? tab.title.replace(' - Google Forms', '') : 'Unknown Form';
    
    // Add URL and title to storage and send to API Gateway
    addUrl(tab.url, formTitle);
  }
});

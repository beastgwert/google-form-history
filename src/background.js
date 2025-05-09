// Background script to capture Google Forms URLs

// Listen for tab updates
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  console.log("Tab changed");
  // Check if the URL is a Google Forms URL and the page has finished loading
  if (changeInfo.status === 'complete' && 
      tab.url && 
      tab.url.includes('docs.google.com/forms/')) {
    console.log("Google Form detected: " + tab.url);
    // Store the URL in local storage
    chrome.storage.local.get(['google_forms_urls'], (result) => {
      const urls = result['google_forms_urls'] || [];
      
      // Only add the URL if it's not already in the list
      if (!urls.includes(tab.url)) {
        console.log("Adding URL: " + tab.url);
        urls.push(tab.url);
        chrome.storage.local.set({ 'google_forms_urls': urls });
      }
    });
  }
});

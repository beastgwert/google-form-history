// Ran on submission page to update submission edit URL

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

// Find the "Edit your response" link and update the submission's edit URL
function detectFormSubmission() {
  let editUrl = '';
  let formId = null;
  
  // Try to find the "Edit your response" link
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
    formId = extractFormId(window.location.href);
  }
  
  if (!formId || !editUrl) {
    return;
  }
  
  // Update the existing submission with the edit URL
  chrome.runtime.sendMessage({
    action: 'updateSubmissionEditUrl',
    formId: formId,
    editUrl: editUrl
  });
}

setTimeout(detectFormSubmission, 300);

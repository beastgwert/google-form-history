// This script will be executed in the context of the new tab
// It will parse the URL parameters and populate the HTML template

document.addEventListener('DOMContentLoaded', function() {
  // Get the URL parameters
  const urlParams = new URLSearchParams(window.location.search);
  const submissionData = JSON.parse(decodeURIComponent(urlParams.get('data')));
  
  // Populate the form title and submission date
  document.getElementById('formTitle').textContent = submissionData.formTitle;
  document.getElementById('submissionDate').textContent = 'Submitted: ' + submissionData.formattedDate;
  
  // Populate the responses
  const responsesContainer = document.getElementById('responses-container');
  
  if (submissionData.questions && submissionData.questions.length > 0) {
    submissionData.questions.forEach((q, index) => {
      const questionDiv = document.createElement('div');
      questionDiv.className = 'question';
      
      const questionText = document.createElement('div');
      questionText.className = 'question-text';
      questionText.textContent = `${index + 1}. ${q.text}`;
      
      const answer = document.createElement('div');
      answer.className = 'answer';
      answer.textContent = q.answer ? q.answer : 'N/A';
      
      questionDiv.appendChild(questionText);
      questionDiv.appendChild(answer);
      responsesContainer.appendChild(questionDiv);
    });
  } else {
    const noResponses = document.createElement('div');
    noResponses.className = 'no-responses';
    noResponses.textContent = 'No response details available.';
    responsesContainer.appendChild(noResponses);
  }
});

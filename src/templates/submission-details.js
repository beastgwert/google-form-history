document.addEventListener('DOMContentLoaded', function() {
  const urlParams = new URLSearchParams(window.location.search);
  const submissionData = JSON.parse(decodeURIComponent(urlParams.get('data')));
  
  const formTitle = submissionData.formTitle;
  document.getElementById('formTitle').textContent = formTitle;
  document.title = formTitle;
  
  const descriptionElement = document.getElementById('formDescription');
  if (submissionData.description && submissionData.description.trim() !== '') {
    descriptionElement.textContent = submissionData.description;
    descriptionElement.style.display = 'block';
  } else {
    descriptionElement.style.display = 'none';
  }
  
  document.getElementById('submissionDate').textContent = 'Submitted: ' + submissionData.formattedDate;
  
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

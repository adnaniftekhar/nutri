// Updated script.js with added console logging for debugging

document.addEventListener('DOMContentLoaded', () => {
    const video = document.getElementById('video');
    const startCameraButton = document.getElementById('start-camera');
    const captureButton = document.getElementById('capture');
    const resultDiv = document.getElementById('result');
    const tableContainer = document.getElementById('table-container');
    const narrativeContainer = document.getElementById('narrative-container');
    const saveButton = document.getElementById('save-button');
    const viewSavedButton = document.getElementById('view-saved-button');
    const hamburger = document.getElementById('hamburger');
    const menu = document.getElementById('menu');

    let capturedImageData; // Variable to store the captured image data
    let currentAnalysis = null; // Variable to store the current analysis

    // JavaScript to toggle the menu
    if (hamburger && menu) {
        hamburger.addEventListener('click', () => {
            console.log('Hamburger menu clicked');
            menu.classList.toggle('hidden');
        });
    } else {
        console.error("Essential elements not found on the page");
    }

    function isIOS() {
        return /iPhone|iPad|iPod/i.test(navigator.userAgent);
    }

    if (video) {
        async function startCamera() {
            try {
                console.log('Attempting to start camera...');
                let constraints = {
                    video: {
                        facingMode: 'environment',
                        width: { ideal: 1280 },
                        height: { ideal: 720 }
                    },
                    audio: false
                };

                const stream = await navigator.mediaDevices.getUserMedia(constraints);
                video.srcObject = stream;

                video.setAttribute('playsinline', true);
                video.muted = true;

                await video.play();
                console.log('Camera started successfully');
            } catch (error) {
                console.error('Error accessing the camera:', error);
                if (resultDiv) {
                    resultDiv.textContent = 'Unable to access the camera. Please check your permissions and ensure you are using a secure (HTTPS) connection.';
                }
            }
        }

        if (isIOS()) {
            console.log('iOS device detected, showing start camera button');
            startCameraButton.style.display = 'block';
            startCameraButton.addEventListener('click', () => {
                startCamera();
                startCameraButton.style.display = 'none';
            });
        } else {
            startCamera();
        }

        captureButton.addEventListener('click', () => {
            console.log('Capture button clicked');
            captureAndAnalyzeImage();
        });
    }

    saveButton.addEventListener('click', () => {
        if (currentAnalysis) {
            console.log('Saving entry to local storage');
            let entries = JSON.parse(localStorage.getItem('nutritionalEntries')) || [];
            entries.push(currentAnalysis);
            localStorage.setItem('nutritionalEntries', JSON.stringify(entries));
            console.log('Entry saved:', currentAnalysis);

            viewSavedButton.style.display = 'inline-block';
        } else {
            console.error('No current analysis to save');
        }
    });

    function captureAndAnalyzeImage() {
        console.log('Starting image capture and analysis');
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 180;
        const MAX_HEIGHT = 180;
        let width = video.videoWidth;
        let height = video.videoHeight;

        if (width > height) {
            if (width > MAX_WIDTH) {
                height *= MAX_WIDTH / width;
                width = MAX_WIDTH;
            }
        } else {
            if (height > MAX_HEIGHT) {
                width *= MAX_HEIGHT / height;
                height = MAX_HEIGHT;
            }
        }

        canvas.width = width;
        canvas.height = height;
        canvas.getContext('2d').drawImage(video, 0, 0, width, height);

        canvas.toBlob(async (blob) => {
            const formData = new FormData();
            formData.append('image', blob, 'captured_image.png');
            resultDiv.innerHTML = '<h2>Please wait, processing...</h2>';

            capturedImageData = canvas.toDataURL();

            try {
                console.log('Sending image to backend for analysis');
                const response = await fetch('https://nutribackend-35880e8a6669.herokuapp.com/analyze', {
                    method: 'POST',
                    body: formData
                });

                if (!response.ok) {
                    throw new Error('Error analyzing image');
                }

                const result = await response.json();
                console.log('Response from backend:', result);
                displayResult(result);
            } catch (error) {
                console.error('Error:', error);
                resultDiv.innerHTML = 'Error analyzing image. Please try again.';
            }
        }, 'image/png', 0.5);
    }

    function displayResult(result) {
        console.log('Displaying analysis result');
        if (result && result.choices && result.choices.length > 0 && result.choices[0].message && result.choices[0].message.content) {
            const content = result.choices[0].message.content;
            console.log('Parsed content from response:', content);
            const [tableHTML, additionalContent] = parseNutritionalInformation(content);
    
            // Set the content using innerHTML, with a table and additional narrative if present
            resultDiv.style.display = 'block';
            tableContainer.style.display = 'block';
            narrativeContainer.style.display = 'block';
    
            tableContainer.innerHTML = tableHTML;
            narrativeContainer.innerHTML = `<p>${additionalContent}</p>`;
    
            console.log("Content set in tableContainer and narrativeContainer");
    
            // Updating current analysis with parsed data
            currentAnalysis = {
                imageData: capturedImageData,
                tableHTML,
                narrative: additionalContent,
                dateTime: new Date().toISOString()
            };
    
            // Ensure Save Button is visible
            saveButton.style.display = 'inline-block';
        } else {
            console.error('No valid analysis information available');
            resultDiv.innerHTML = '<p>No valid analysis information available.</p>';
        }
    }
    

    function parseNutritionalInformation(messageContent) {
        console.log('Parsing nutritional information from message content');
        let tableHTML = `
            <table class="consistent-table">
                <thead>
                    <tr>
                        <th>Nutrient</th>
                        <th>Value</th>
                    </tr>
                </thead>
                <tbody>
        `;
        let additionalContent = '';

        const lines = messageContent.split('\n');
        lines.forEach(line => {
            // Remove any "*" from the line
            line = line.replace(/\*/g, '').trim();

            // Skip empty lines
            if (line === '') return;

            // Split by either ":" or "|", trimming whitespace from both ends
            let delimiter = '';
            if (line.includes('|')) {
                delimiter = '|';
            } else if (line.includes(':')) {
                delimiter = ':';
            }

            if (delimiter) {
                const parts = line.split(delimiter).map(part => part.trim());

                if (parts.length >= 2) {
                    const [name, value] = parts;
                    // Add each nutrient and value to the table
                    console.log('Parsed nutrient:', name, 'value:', value);
                    tableHTML += `
                        <tr>
                            <td>${name}</td>
                            <td>${value}</td>
                        </tr>`;
                } else {
                    // Accumulate non-table content into the additional content string
                    additionalContent += line.trim() + ' ';
                }
            } else {
                // If no delimiter is found, add the line to additional content
                console.warn('Line without recognized delimiter, adding to additional content:', line);
                additionalContent += line.trim() + ' ';
            }
        });

        tableHTML += '</tbody></table>';

        console.log('Parsed tableHTML:', tableHTML);
        console.log('Parsed additionalContent:', additionalContent.trim());

        return [
            tableHTML,
            additionalContent.trim()
        ];
    }
});

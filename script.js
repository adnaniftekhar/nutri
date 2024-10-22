document.addEventListener('DOMContentLoaded', () => {
    const video = document.getElementById('video');
    const captureButton = document.getElementById('capture');
    const resultDiv = document.getElementById('result');
    const tableContainer = document.getElementById('table-container');
    const narrativeContainer = document.getElementById('narrative-container');
    const narrativeDiv = document.getElementById('narrative');
    const editButton = document.getElementById('edit-button');
    const editSection = document.getElementById('edit-section');
    const foodInput = document.getElementById('food-input');
    const submitEditButton = document.getElementById('submit-edit');
    const hamburger = document.getElementById('hamburger');
    const menu = document.getElementById('menu');
    const googleLoginButton = document.querySelector('.google-login-button');

    // JavaScript to toggle the menu
    if (hamburger && menu) {
        hamburger.addEventListener('click', () => {
            menu.classList.toggle('hidden');
        });
    } else {
        console.error("Essential elements not found on the page");
    }

    // Google login handler
    if (googleLoginButton) {
        googleLoginButton.addEventListener('click', (event) => {
            event.preventDefault();
            console.log('Redirecting to Google login...');
            window.location.href = googleLoginButton.href;
        });
    }

    // Only run camera-related code if the video element exists
    if (video) {
        // Function to get the back camera stream with iOS-specific constraints
        async function startCamera() {
            try {
                // Define constraints to select the back camera with ideal facingMode for better compatibility
                const constraints = {
                    video: {
                        facingMode: { ideal: 'environment' }, // Use `ideal` for better iOS compatibility
                        width: { min: 640, ideal: 1280 },
                        height: { min: 480, ideal: 720 }
                    }
                };

                // Request the camera stream with updated constraints
                const stream = await navigator.mediaDevices.getUserMedia(constraints);
                video.srcObject = stream;

                // Force video to play after metadata has loaded
                video.addEventListener('loadedmetadata', () => {
                    video.play().catch(error => console.error('Error starting video playback:', error));
                });

                // Fix for iOS: Reload page if stream ends
                stream.getTracks().forEach(track => {
                    track.addEventListener('ended', () => {
                        console.log("Stream ended. Re-initializing camera...");
                        startCamera();
                    });
                });

                console.log("Camera stream started successfully.");
            } catch (error) {
                console.error('Error accessing the camera:', error);
                if (resultDiv) {
                    resultDiv.textContent = 'Unable to access the camera. Please check your permissions and ensure you are using a secure (HTTPS) connection.';
                }

                // Fallback for iOS devices if initial constraints fail
                if (error.name === 'OverconstrainedError' || error.name === 'NotFoundError') {
                    try {
                        console.log('Attempting fallback constraints for iOS compatibility...');
                        const fallbackConstraints = {
                            video: {
                                facingMode: 'user', // Switch to front camera if back camera fails
                                width: { min: 640 },
                                height: { min: 480 }
                            }
                        };
                        const stream = await navigator.mediaDevices.getUserMedia(fallbackConstraints);
                        video.srcObject = stream;

                        video.addEventListener('loadedmetadata', () => {
                            video.play().catch(fallbackError => console.error('Error starting fallback video playback:', fallbackError));
                        });
                    } catch (fallbackError) {
                        console.error('Fallback error accessing the camera:', fallbackError);
                        if (resultDiv) {
                            resultDiv.textContent = 'Unable to access the camera even with fallback settings. Please try again.';
                        }
                    }
                }
            }
        }

        // Start the camera with the back camera if available
        startCamera();

        // Capture image from the video feed
        captureButton.addEventListener('click', () => {
            captureAndAnalyzeImage();
        });
    }

    if (editButton) {
        editButton.addEventListener('click', () => {
            editSection.style.display = 'block';
            console.log('Edit section displayed');
        });
    }

    submitEditButton.addEventListener('click', async () => {
        console.log('Submit Edit button clicked');
        resultDiv.innerHTML = '<h2>Please wait, processing...</h2>';

        const foodItem = foodInput.value;
        console.log('Food item entered:', foodItem);

        try {
            const response = await fetch('https://nutribackend-35880e8a6669.herokuapp.com/edit', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ foodItem: foodItem })
            });

            if (!response.ok) {
                throw new Error('Error editing nutritional information');
            }

            const result = await response.json();
            console.log('Parsed JSON result:', result);
            updateDisplayAfterEdit(result);
        } catch (error) {
            console.error('Error editing nutritional information:', error);
            resultDiv.innerHTML = 'Error editing nutritional information. Please try again.';
        }
    });

    let capturedImageData; // Variable to store the captured image data

    function captureAndAnalyzeImage() {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 180; // Set a maximum width
        const MAX_HEIGHT = 180; // Set a maximum height
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

            // Store the captured image data
            capturedImageData = canvas.toDataURL();

            try {
                const response = await fetch('https://nutribackend-35880e8a6669.herokuapp.com/analyze', {
                    method: 'POST',
                    body: formData
                });

                if (!response.ok) {
                    throw new Error('Error analyzing image');
                }

                const result = await response.json();
                console.log('Response from backend:', result);
                displayResult(result, canvas); // Pass the canvas to displayResult
                editButton.style.display = 'block';
            } catch (error) {
                console.error('Error:', error);
                resultDiv.innerHTML = 'Error analyzing image. Please try again.';
            }
        }, 'image/png', 0.5);
    }

    function displayResult(result, canvas) {
        resultDiv.innerHTML = ''; 

        // Create an image element to display the captured image
        const imgElement = document.createElement('img');
        imgElement.src = canvas.toDataURL(); // Assuming you have access to the canvas
        imgElement.alt = 'Captured Image';
        imgElement.style.maxWidth = '100%'; // Make sure the image is responsive
        imgElement.style.height = 'auto';

        // Append the image to the resultDiv
        resultDiv.appendChild(imgElement);

        if (result && result.choices && result.choices.length > 0 && result.choices[0].message && result.choices[0].message.content) {
            const content = result.choices[0].message.content;

            const [tableContent, narrativeContent] = parseNutritionalInformation(content);

            if (tableContent) {
                tableContainer.innerHTML = `<h3>Nutritional Information:</h3>${tableContent}`;
                tableContainer.style.display = 'block';
                resultDiv.appendChild(tableContainer);
            } else {
                tableContainer.innerHTML = '<p>No nutritional information available.</p>';
                tableContainer.style.display = 'block';
                resultDiv.appendChild(tableContainer);
            }

            if (narrativeContent) {
                narrativeDiv.innerHTML = `<h3>Narrative:</h3>${narrativeContent}`;
                narrativeContainer.style.display = 'block';
                resultDiv.appendChild(narrativeContainer);
            } else {
                narrativeDiv.textContent = 'No narrative information available.';
                narrativeContainer.style.display = 'block';
                resultDiv.appendChild(narrativeContainer);
            }
        } else {
            resultDiv.innerHTML = '<p>No valid analysis information available.</p>';
        }
    }

    function updateDisplayAfterEdit(result) {
        console.log('Updating display after edit...');
        resultDiv.innerHTML = '';

        // Display the captured image
        if (capturedImageData) {
            const imgElement = document.createElement('img');
            imgElement.src = capturedImageData; // Use the stored image data
            imgElement.alt = 'Captured Image';
            imgElement.style.maxWidth = '100%'; // Make sure the image is responsive
            imgElement.style.height = 'auto';
            resultDiv.appendChild(imgElement); // Append the image to the resultDiv
        }

        if (result && result.choices && result.choices.length > 0 && result.choices[0].message && result.choices[0].message.content) {
            const content = result.choices[0].message.content;

            const [tableContent, narrativeContent] = parseNutritionalInformation(content);

            if (tableContent) {
                tableContainer.innerHTML = `<h3>Nutritional Information:</h3>${tableContent}`;
                tableContainer.style.display = 'block';
                resultDiv.appendChild(tableContainer);
            } else {
                tableContainer.innerHTML = '<p>No nutritional information available.</p>';
                tableContainer.style.display = 'block';
                resultDiv.appendChild(tableContainer);
            }

            if (narrativeContent) {
                narrativeDiv.innerHTML = `<h3>Narrative:</h3>${narrativeContent}`;
                narrativeContainer.style.display = 'block';
                resultDiv.appendChild(narrativeContainer);
            } else {
                narrativeDiv.textContent = 'No narrative information available.';
                narrativeContainer.style.display = 'block';
                resultDiv.appendChild(narrativeContainer);
            }
        } else {
            resultDiv.innerHTML = '<p>No valid analysis information available.</p>';
        }
    }

    function parseNutritionalInformation(messageContent) {
        let tableHTML = '';
        let narrativeText = '';

        const lines = messageContent.split('\n');
        tableHTML += '<table style="width: 100%; border-collapse: collapse;">';

        lines.forEach(line => {
            const [name, value] = line.includes('|') ? line.split('|') : line.split(':');
            if (name && value) {
                tableHTML += `
                    <tr>
                        <td style="border: 1px solid #ddd; padding: 8px;">${name.trim()}</td>
                        <td style="border: 1px solid #ddd; padding: 8px;">${value.trim()}</td>
                    </tr>`;
            } else {
                narrativeText += line.trim() + ' ';
            }
        });

        tableHTML += '</table>';

        return [tableHTML, narrativeText.trim()];
    }
});

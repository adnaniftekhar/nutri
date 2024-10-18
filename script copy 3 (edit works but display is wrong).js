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

// Function to get the back camera stream
async function startCamera() {
    try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const videoDevices = devices.filter(device => device.kind === 'videoinput');

        let backCameraDeviceId = null;
        videoDevices.forEach(device => {
            if (device.label.toLowerCase().includes('back')) {
                backCameraDeviceId = device.deviceId;
            }
        });

        const constraints = {
            video: {
                deviceId: backCameraDeviceId ? { exact: backCameraDeviceId } : undefined,
                facingMode: backCameraDeviceId ? undefined : { ideal: "environment" }
            }
        };

        const stream = await navigator.mediaDevices.getUserMedia(constraints);
        video.srcObject = stream;
    } catch (error) {
        console.error('Error accessing the camera:', error);
        resultDiv.textContent = 'Unable to access the camera. Please check your permissions.';
    }
}

// Start the camera with the back camera if available
startCamera();

// Capture image from the video feed
captureButton.addEventListener('click', () => {
    captureAndAnalyzeImage();
});

editButton.addEventListener('click', () => {
    editSection.style.display = 'block';
    console.log('Edit section displayed');
});

submitEditButton.addEventListener('click', async () => {
    // Show loading message during processing
    resultDiv.innerHTML = '<h2>Please wait, processing...</h2>';

    const foodItem = foodInput.value;

    try {
        const response = await fetch('http://localhost:5000/edit', {
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
        // Update display after editing
        displayResult(result);
    } catch (error) {
        console.error('Error editing nutritional information:', error);
        resultDiv.textContent = 'Error editing nutritional information. Please try again.';
    }
});

function captureAndAnalyzeImage() {
    const canvas = document.createElement('canvas');
    const MAX_WIDTH = 200; // Set a maximum width
    const MAX_HEIGHT = 200; // Set a maximum height
    let width = video.videoWidth;
    let height = video.videoHeight;

    // Calculate the new dimensions while maintaining the aspect ratio
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

    // Convert the canvas to a Blob
    canvas.toBlob(async (blob) => {
        const formData = new FormData();
        formData.append('image', blob, 'captured_image.png');

        // Show loading message
        resultDiv.innerHTML = '<h2>Please wait, processing...</h2>';

        try {
            const response = await fetch('http://127.0.0.1:5000/analyze', {
                method: 'POST',
                body: formData
            });

            if (!response.ok) {
                throw new Error('Error analyzing image');
            }

            const result = await response.json();
            console.log('Response from backend:', result);

            // Display the result
            displayResult(result);

            // Show the edit button
            editButton.style.display = 'block';
            console.log('Edit button displayed');

        } catch (error) {
            console.error('Error:', error);
            resultDiv.textContent = 'Error analyzing image. Please try again.';
        }
    }, 'image/png', 0.5);
}

function displayResult(result) {
    // Assuming result contains a table and narrative
    resultDiv.innerHTML = ''; // Clear loading message
    if (result && result.choices && result.choices[0] && result.choices[0].message && result.choices[0].message.content) {
        const content = result.choices[0].message.content;

        // Extract table and narrative from content
        const [tableContent, narrativeContent] = content.split('\n\n');

        if (tableContent) {
            tableContainer.innerHTML = `<p><strong>Nutritional Information:</strong></p>${tableContent}`;
            tableContainer.style.display = 'block';
            resultDiv.appendChild(tableContainer);
        } else {
            console.error('Result table is undefined or not properly structured');
            tableContainer.innerHTML = '<p>No nutritional information available.</p>';
            tableContainer.style.display = 'block';
            resultDiv.appendChild(tableContainer);
        }

        if (narrativeContent) {
            narrativeDiv.innerHTML = `<p><strong>Narrative:</strong></p>${narrativeContent}`;
            narrativeContainer.style.display = 'block';
            resultDiv.appendChild(narrativeContainer);
        } else {
            console.error('Result narrative is undefined or not properly structured');
            narrativeDiv.textContent = 'No narrative information available.';
            narrativeContainer.style.display = 'block';
            resultDiv.appendChild(narrativeContainer);
        }
    } else {
        console.error('Result is undefined or not properly structured');
        resultDiv.innerHTML = '<p>No valid analysis information available.</p>';
    }
}


function updateDisplayAfterEdit(result) {
    // Clear previous result and show updated information
    if (result && result.choices && result.choices[0] && result.choices[0].message && result.choices[0].message.content) {
        const content = result.choices[0].message.content;

        // Extract table and narrative from content
        const [tableContent, ...narrativeParts] = content.split('\n\n');
        const narrativeContent = narrativeParts.join('\n\n');
        
        if (tableContent) {
            tableContainer.innerHTML = parseTableContent(tableContent);
            tableContainer.style.display = 'block';
        } else {
            console.error('Result table is undefined or not properly structured');
            tableContainer.innerHTML = '<p>No nutritional information available.</p>';
            tableContainer.style.display = 'block';
        }

        if (narrativeContent) {
            narrativeDiv.textContent = narrativeContent;
            narrativeContainer.style.display = 'block';
        } else {
            console.error('Result narrative is undefined or not properly structured');
            narrativeDiv.textContent = 'No narrative information available.';
            narrativeContainer.style.display = 'block';
        }
    } else {
        console.error('Result is undefined or not properly structured');
        resultDiv.innerHTML = '<p>No valid analysis information available.</p>';
    }
}

function parseTableContent(content) {
    let tableHTML = '<table style="width: 100%; border-collapse: collapse;">';
    const lines = content.split('\n');
    lines.forEach(line => {
        const [name, value] = line.split(':');
        if (name && value) {
            tableHTML += `
                <tr>
                    <td style="border: 1px solid #ddd; padding: 8px;">${name.trim()}</td>
                    <td style="border: 1px solid #ddd; padding: 8px;">${value.trim()}</td>
                </tr>`;
        }
    });
    tableHTML += '</table>';
    return tableHTML;
}

function showEditButton() {
    editButton.style.display = 'block';
}

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

function captureAndAnalyzeImage() {
    const canvas = document.createElement('canvas');
    const MAX_WIDTH = 200; // Set a maximum width
    const MAX_HEIGHT = 200; // Set a maximum height
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
            displayResult(result);
            editButton.style.display = 'block';
        } catch (error) {
            console.error('Error:', error);
            resultDiv.innerHTML = 'Error analyzing image. Please try again.';
        }
    }, 'image/png', 0.5);
}

function displayResult(result) {
    resultDiv.innerHTML = ''; 
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
        const [name, value] = line.split(':');
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

    return [
        tableHTML,
        narrativeText.trim()
    ];
}

function showEditButton() {
    editButton.style.display = 'block';
}

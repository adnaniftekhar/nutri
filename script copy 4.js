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

            // Clear previous results
            resultDiv.innerHTML = '';

            // Display the captured image
            const imgElement = document.createElement('img');
            imgElement.src = URL.createObjectURL(blob);
            imgElement.alt = 'Captured Image';
            resultDiv.appendChild(imgElement); // Add captured image

            // Format the results in a table
            const table = document.createElement('table');
            table.style.width = '100%';
            table.style.borderCollapse = 'collapse';

            const headerRow = document.createElement('tr');
            const headers = ['Nutrient', 'Value'];
            headers.forEach(headerText => {
                const th = document.createElement('th');
                th.textContent = headerText;
                th.style.border = '1px solid #ddd';
                th.style.padding = '8px';
                th.style.textAlign = 'left';
                headerRow.appendChild(th);
            });
            table.appendChild(headerRow);

            // Add Observed Food
            const observedFoodRow = document.createElement('tr');
            const tdObservedFoodName = document.createElement('td');
            const tdObservedFoodValue = document.createElement('td');

            tdObservedFoodName.textContent = 'Observed Food';
            tdObservedFoodValue.textContent = result.choices[0].message.observed_food; // Adjust based on actual response structure

            observedFoodRow.appendChild(tdObservedFoodName);
            observedFoodRow.appendChild(tdObservedFoodValue);
            table.appendChild(observedFoodRow);

            // Add Nutritional Information
            const nutrients = result.choices[0].message.content.split('\n'); // Split by new lines

            nutrients.forEach(nutrient => {
                const [name, value] = nutrient.split(':'); // Split by colon
                if (name && value) {
                    const row = document.createElement('tr');
                    const tdName = document.createElement('td');
                    const tdValue = document.createElement('td');

                    tdName.textContent = name.trim().replace(/^\*+|\*+$/g, ''); // Remove asterisks
                    tdValue.textContent = value.trim().replace(/^\*+|\*+$/g, ''); // Remove asterisks

                    tdName.style.border = '1px solid #ddd';
                    tdValue.style.border = '1px solid #ddd';
                    tdName.style.padding = '8px';
                    tdValue.style.padding = '8px';

                    row.appendChild(tdName);
                    row.appendChild(tdValue);
                    table.appendChild(row);
                }
            });

            // Add the table to the result div
            resultDiv.appendChild(table);

            // Display the analysis message below the table
            const analysisMessage = document.createElement('p');
            analysisMessage.textContent = result.choices[0].message.content; // Adjust based on actual response structure
            resultDiv.appendChild(analysisMessage); // Add analysis message below the table

            // Show the edit button after analysis is complete
            editButton.style.display = 'block';
            console.log('Edit button displayed');

        } catch (error) {
            console.error('Error:', error);
            resultDiv.textContent = 'Error analyzing image. Please try again.';
        }
    }, 'image/png', 0.5);
});

editButton.addEventListener('click', () => {
    editSection.style.display = 'block';
    console.log('Edit section displayed');
});

submitEditButton.addEventListener('click', async () => {
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
        displayResult(result);
    } catch (error) {
        console.error('Error editing nutritional information:', error);
        resultDiv.textContent = 'Error editing nutritional information. Please try again.';
    }
});

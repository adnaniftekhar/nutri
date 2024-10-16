const video = document.getElementById('video');
const captureButton = document.getElementById('capture');
const resultDiv = document.getElementById('result');

// Access the camera
navigator.mediaDevices.getUserMedia({ video: true })
    .then((stream) => {
        video.srcObject = stream;
    })
    .catch((error) => {
        console.error('Error accessing the camera:', error);
        resultDiv.textContent = 'Unable to access the camera. Please check your permissions.';
    });

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
            const response = await fetch('http://localhost:5000/analyze', {
                method: 'POST',
                body: formData
            });

            if (!response.ok) {
                throw new Error('Error analyzing image');
            }

            const result = await response.json();
            console.log('Response from backend:', result);

            // Display the captured image
            const imgElement = document.createElement('img');
            imgElement.src = URL.createObjectURL(blob);
            imgElement.alt = 'Captured Image';
            resultDiv.innerHTML = ''; // Clear previous results
            resultDiv.appendChild(imgElement); // Add captured image

            // Display the analysis message above the table
            const analysisMessage = document.createElement('p');
            analysisMessage.textContent = result.choices[0].message.content; // Adjust based on actual response structure
            resultDiv.appendChild(analysisMessage);

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

            resultDiv.appendChild(table); // Add the table to the result div
        } catch (error) {
            console.error('Error:', error);
            resultDiv.textContent = 'Error analyzing image. Please try again.';
        }
    }, 'image/png', 0.5);
});

document.getElementById('upload-form').addEventListener('submit', async (e) => {
    e.preventDefault();

    const imageInput = document.getElementById('image-input');
    const resultDiv = document.getElementById('result');

    if (imageInput.files.length === 0) {
        resultDiv.textContent = 'Please select an image.';
        return;
    }

    const file = imageInput.files[0];
    const img = new Image();
    const reader = new FileReader();

    reader.onload = (event) => {
        img.src = event.target.result;
    };

    reader.readAsDataURL(file);

    img.onload = async () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');

        // Resize the image to a maximum width/height of 600px
        const MAX_WIDTH = 200;
        const MAX_HEIGHT = 200;
        let width = img.width;
        let height = img.height;

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
        ctx.drawImage(img, 0, 0, width, height);

        // Convert the canvas to a Blob
        canvas.toBlob(async (blob) => {
            const formData = new FormData();
            formData.append('image', blob, 'resized_image.png');

            try {
                const response = await fetch('http://localhost:5000/analyze', {
                    method: 'POST',
                    body: formData
                });

                if (!response.ok) {
                    throw new Error('Error analyzing image');
                }

                const result = await response.json();
                resultDiv.textContent = JSON.stringify(result, null, 2);
            } catch (error) {
                resultDiv.textContent = 'Error analyzing image. Please try again.';
            }
        }, 'image/png');
    };
});

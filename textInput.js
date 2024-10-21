document.addEventListener('DOMContentLoaded', () => {
    console.log("DOM fully loaded and parsed");

    // Ensure the elements exist
    const foodForm = document.getElementById("food-form");
    const foodInput = document.getElementById("food-input");
    const saveButton = document.getElementById("save-button");
    const viewSavedButton = document.getElementById("view-saved-button");
    const savedEntriesDiv = document.getElementById("saved-entries");
    const hamburgerMenu = document.getElementById('hamburger');
    const menu = document.getElementById('menu');

    if (!foodForm || !foodInput || !saveButton || !viewSavedButton || !savedEntriesDiv || !hamburgerMenu || !menu) {
        console.error("Essential elements not found on the page");
        return;
    }

    console.log("Elements found: form, input, buttons, result div, hamburger menu");

    let currentAnalysis = null;

    // Toggle the hamburger menu
    hamburgerMenu.addEventListener("click", () => {
        menu.classList.toggle('hidden');
    });

    foodForm.addEventListener("submit", async (event) => {
        event.preventDefault();

        console.log("Form submitted");

        // Create a new result div and replace the old one
        let newResultDiv = document.createElement('div');
        newResultDiv.id = "result";
        newResultDiv.classList.add("result-container");
        newResultDiv.innerText = 'Processing...';

        const oldResultDiv = document.getElementById("result");
        if (oldResultDiv) {
            oldResultDiv.parentNode.replaceChild(newResultDiv, oldResultDiv);
        } else {
            console.error("Result div not found");
        }

        try {
            const foodItem = foodInput.value;
            console.log("Food item:", foodItem);

            const response = await fetch("https://nutribackend-35880e8a6669.herokuapp.com/analyze-text", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({ foodItem })
            });

            console.log("Response received");

            if (!response.ok) {
                throw new Error('Network response was not ok');
            }

            const analysisResult = await response.json();
            console.log("Analysis result:", analysisResult);

            const content = analysisResult.choices[0]?.message?.content || 'No valid content received.';
            console.log("Content to display:", content);

            // Parse the content to generate the table
            const [tableHTML, additionalContent] = parseNutritionalInformation(content);

            // Set the content using innerHTML, with a table and additional narrative if present
            newResultDiv.innerHTML = `
                <h2>Nutritional Analysis for ${foodItem}</h2>
                <div id="table-container">
                    ${tableHTML}
                </div>
                <p>${additionalContent}</p>
            `;
            console.log("Content set in resultDiv");

            // Save current analysis to a variable for saving
            currentAnalysis = {
                foodItem,
                tableHTML,
                dateTime: new Date().toISOString()
            };

            // Display save button as analysis is ready to be saved
            saveButton.style.display = 'inline-block';
        } catch (error) {
            console.error('Error during fetch or processing:', error);
            newResultDiv.innerHTML = '<p>An error occurred while processing your request. Please try again.</p>';
        }
    });

    // Event listener for Save button
    saveButton.addEventListener("click", () => {
        if (currentAnalysis) {
            console.log("Saving entry to local storage");
            let entries = JSON.parse(localStorage.getItem("nutritionalEntries")) || [];
            entries.push(currentAnalysis);
            localStorage.setItem("nutritionalEntries", JSON.stringify(entries));
            console.log("Entry saved:", currentAnalysis);

            // Show the "View Saved Entries" button as there's something saved now
            viewSavedButton.style.display = 'inline-block';
        } else {
            console.error("No current analysis to save");
        }
    });

    // Function to parse nutritional content and create table
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
            line = line.replace(/\*/g, '');

            // Split by either ":" or "|", trimming whitespace from both ends
            const delimiter = line.includes('|') ? '|' : ':';
            const parts = line.split(delimiter);

            if (parts.length === 2) {
                const [name, value] = parts;
                // Add each nutrient and value to the table
                tableHTML += `
                    <tr>
                        <td>${name.trim()}</td>
                        <td>${value.trim()}</td>
                    </tr>`;
            } else {
                // Accumulate non-table content into the additional content string
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

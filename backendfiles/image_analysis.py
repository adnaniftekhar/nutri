import requests
import base64

def analyze_image(image_path):
    invoke_url = "https://ai.api.nvidia.com/v1/gr/meta/llama-3.2-90b-vision-instruct/chat/completions"
    stream = False

    with open(image_path, "rb") as f:
        image_b64 = base64.b64encode(f.read()).decode()

    assert len(image_b64) < 180_000, \
        "To upload larger images, use the assets API (see docs)"

    headers = {
        "Authorization": "Bearer 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",
        "Accept": "text/event-stream" if stream else "application/json"
    }

    payload = {
        "model": 'meta/llama-3.2-90b-vision-instruct',
        "messages": [
            {
                "role": "user",
                "content": f'Analyze the absolutely FULL nutritional information for the food item including calories, protein, fats, fiber and more for this food image. List ONLY the total values in a table-friendly format with columns as "Nutrient | Value" and format each entry as "Nutrient | Value", like "Calories | 400kcal". Use only "|" as a delimiter. NEVER EVER give a result in the format"| Calories | 221 kcal |". All measurements should be in g, mg, mcg, or kcal, without daily value percentages (DV) or portion sizes. Provide every nutrient component as if the food is fully consumed. Include a confidence rating (1-10) on accuracy at the end. Use common names (e.g., vitamin B1) and exclude scientific names. <img src="data:image/png;base64,{image_b64}" />'
            }
        ],
        "max_tokens": 1024,
        "temperature": 1.00,
        "top_p": 1.00,
        "stream": stream
    }

    response = requests.post(invoke_url, headers=headers, json=payload)
    result = response.json()

    # Extract confidence rating from the model's response
    confidence_rating = extract_confidence(result)  # Call the function to get the confidence
    result['confidence'] = confidence_rating  # Add confidence rating to the result

    return result

def extract_confidence(result):
    # Example logic to extract confidence from the model's response
    # This is a placeholder; adjust based on your actual response structure
    # For instance, if the model provides a confidence score in the response:
    
    # Check if the response contains a confidence score
    if 'confidence' in result:
        return result['confidence']  # Return the confidence score if available

    # If no confidence score is found, return a default value (e.g., 0)
    return 0
